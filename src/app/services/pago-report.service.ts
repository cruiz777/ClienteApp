// src/app/services/pago-report.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { environment } from 'src/environments/environment';

/* ====== Tipos ====== */
export interface ApiResponse<T> {
  id: string;
  type: string;
  data: T | null;
  message: string;
  count?: number | null;
}

export interface DetallePagoResponse {
  forma_pago: string;
  secuencia: string;
  monto: number;
  descripcion_pago?: string | null;
  referencia?: string | null;
  banco?: string | null;
  numero_documento?: string | null;
}

export interface PagoResponse {
  id_pago: number;
  numero_pago: string;
  tipo: string;                 // 'A' (Abono) | 'P' (Cancelación)
  cliente_codigo: number;
  cliente_nombre: string;
  fecha: string;                // ISO (fecha de pago)
  numero_documento: string;
  total_pago: number;
  pagado?: number;

  observaciones?: string | null;
  tiene_retencion_iva: boolean;
  valor_retencion_iva?: string | null;
  tiene_retencion_fuente: boolean;
  valor_retencion_fuente?: string | null;
  caja?: string | null;

  // 👇 NUEVO: lo manda el backend
  asientoContable?: string | null;

  detalles?: DetallePagoResponse[] | null;
}

@Injectable({ providedIn: 'root' })
export class PagoReportService {
  private readonly baseUrl = environment.invoices_sic;

  constructor(private http: HttpClient) {}

  /** GET /api/Pagos/{numeroPago} */
  async fetchPago(numeroPago: string): Promise<PagoResponse[]> {
    const url = `${this.baseUrl}/Pagos/${encodeURIComponent(numeroPago)}`;
    const res = await firstValueFrom(this.http.get<ApiResponse<PagoResponse[]>>(url));
    if (!res?.data || res.type !== 'Success') {
      throw new Error(res?.message || 'No se pudo recuperar el pago');
    }
    return res.data;
  }

  /** Genera el PDF directamente desde el API */
  async generarPdfDesdeApi(
    numeroPago: string,
    opts?: { titulo?: string; logoUrl?: string; logoDataUrl?: string; esAnulado?: boolean }
  ): Promise<void> {
    const data = await this.fetchPago(numeroPago);
    await this.generarPdfIngresoCaja(data, {
      numeroPago,
      titulo: opts?.titulo,
      logoUrl: opts?.logoUrl,
      logoDataUrl: opts?.logoDataUrl,
      esAnulado: opts?.esAnulado
    });
  }

  /** Genera el PDF desde datos ya cargados */
  async generarPdfIngresoCaja(
    filas: PagoResponse[],
    opts: {
      numeroPago?: string;
      titulo?: string;
      logoUrl?: string;
      logoDataUrl?: string;
      esAnulado?: boolean;
    } = {}
  ): Promise<void> {
    if (!Array.isArray(filas) || filas.length === 0) {
      throw new Error('Sin datos para el PDF');
    }

    // ===== Cabecera =====
    const first = filas[0];
    const numeroPago = opts.numeroPago || first.numero_pago;
    const cliente = first.cliente_nombre;
    const fechaStr = this.formateaFecha(first.fecha);
    const asiento = (first.asientoContable ?? '').toString();
    const tituloEmpresa = opts.titulo ?? 'GS1';

    // ===== Conceptos =====
    const conceptos = filas
      .map(f => {
        const tipo = String(f.tipo || '').toUpperCase();
        const etiqueta = tipo === 'A' ? 'ABONO' : 'CANCELACION';
        const montoNum = this.to2(f.pagado ?? 0);
        const monto = this.moneda(montoNum, true);
        const etq = (' ' + etiqueta).padEnd(13, ' ');
        const doc = (this.normalizaDoc(f.numero_documento) + '   ').padEnd(20, ' ');
        return `${etq}${doc}${monto}`;
      })
      .join('\n');

    // ===== Formas de pago (agrupadas) =====
    const detallesAll: DetallePagoResponse[] = (filas[0]?.detalles || []).slice();
    const map = new Map<string, { desc: string; monto: number }>();

    for (const d of detallesAll) {
      const desc = (d.descripcion_pago || this.mapIdFormaPago(d.forma_pago)).trim();
      const key = `${String(d.forma_pago).trim()}|${desc.toUpperCase()}`;
      const monto = Number(d.monto || 0);
      if (map.has(key)) {
        const v = map.get(key)!;
        v.monto = this.to2(v.monto + monto);
      } else {
        map.set(key, { desc, monto: this.to2(monto) });
      }
    }

    const formas = Array.from(map.values());
    const total = this.to2(formas.reduce((a, b) => a + (b.monto || 0), 0));

    // ===== jsPDF =====
    const doc = new jsPDF({ 
      unit: 'pt', 
      format: [595, 421]  // ✅ Media página A4
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;  // ✅ Márgenes pequeños

    doc.setLineWidth(1);
    doc.rect(margin / 2, margin / 2, pageWidth - margin, (pageHeight / 2) - margin);

    // Logo
    const logoData = opts.logoDataUrl || (await this.loadLogoDataUrl(opts.logoUrl));
    let yOffset = 0;
    if (logoData) {
      const logoW = 70;   // ✅ Logo pequeño
      const logoH = 26;
      doc.addImage(logoData, 'PNG', margin, 40 - logoH / 2, logoW, logoH);
      yOffset = 4;
    }

    // Títulos
    doc.setFont('Times', 'Bold');
    doc.setFontSize(10);  // ✅ Fuente reducida
    doc.text(tituloEmpresa, pageWidth / 2, 60 + yOffset, { align: 'center' });
    doc.setFontSize(9);
    doc.text('INGRESO DE CAJA', pageWidth / 2, 74 + yOffset, { align: 'center' });

    // Barra: Número Pago / Asiento
    autoTable(doc, {
      startY: 90 + yOffset,  // ✅ Posición alta
      styles: { font: 'Times', fontSize: 8, textColor: [0, 0, 0] },  // ✅ Fuente 8
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontSize: 8 },
      bodyStyles: { textColor: [0, 0, 0] },
      margin: { left: margin, right: margin },
      head: [[
        { content: 'Número Pago', styles: { halign: 'center' } },
        { content: numeroPago, styles: { halign: 'center' } },
        { content: 'Asiento de Ingreso:', styles: { halign: 'center' } },
        { content: asiento || '', styles: { halign: 'center' } }
      ]],
      body: []
    });

    let y = (doc as any).lastAutoTable.finalY + 8;  // ✅ Espacio reducido

    // FECHA / CLIENTE / CONCEPTO
    doc.setFont('Times', 'Bold');
    doc.setFontSize(8);  // ✅ Fuente 8
    doc.text('FECHA:', margin, y);
    doc.setFont('Times', 'Normal');
    doc.text(fechaStr, margin + 50, y);  // ✅ Columna en 50
    y += 12;  // ✅ Espacio 12

    doc.setFont('Times', 'Bold');
    doc.text('CLIENTE :', margin, y);
    doc.setFont('Times', 'Normal');
    doc.text(cliente, margin + 50, y);  // ✅ Columna en 50
    y += 12;  // ✅ Espacio 12

    doc.setFont('Times', 'Bold');
    doc.text('CONCEPTO:', margin, y);
    doc.setFont('Times', 'Normal');
    const conceptoLines = doc.splitTextToSize(conceptos, pageWidth - margin * 2 - 50);  // ✅ Ancho ajustado
    doc.text(conceptoLines, margin + 50, y);  // ✅ Columna en 50
    y += 12 * (Array.isArray(conceptoLines) ? conceptoLines.length : 1) + 6;  // ✅ Espacio 12

    // FORMAS DE PAGO
    doc.setFont('Times', 'Bold');
    doc.text('FORMA DE PAGO:', margin, y);
    y += 4;  // ✅ Espacio 4

    autoTable(doc, {
      startY: y + 4,  // ✅ Espacio 4
      margin: { left: margin, right: margin },
      styles: { font: 'Times', fontSize: 8, textColor: [0, 0, 0] },  // ✅ Fuente 8
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontSize: 8 },
      head: [['Descripción', 'Monto']],
      body: formas.map(f => [f.desc, this.moneda(f.monto, true)]),
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'right' }
      }
    });

    y = (doc as any).lastAutoTable.finalY + 6;  // ✅ Espacio 6

    // Observación + Total
    const obsText = `OBSERVACION : ${first.observaciones?.toUpperCase() || 'ESTE COMPROBANTE DE NINGUNA MANERA CONSTITUYE UNA FACTURA'}`;
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      styles: { font: 'Times', fontSize: 8, textColor: [0, 0, 0] },  // ✅ Fuente 8
      body: [[
        { content: obsText, styles: { halign: 'left' } },
        { content: `TOTAL : ${this.moneda(total, true)}`, styles: { halign: 'right' } }
      ]],
      theme: 'plain'
    });

    y = (doc as any).lastAutoTable.finalY + 30;  // ✅ Espacio 30

    // Firmas
    const lineWidth = 100;  // Longitud de cada línea
    const col1 = margin + 60;
    const col2 = pageWidth - margin - lineWidth - 60;
    doc.line(col1, y, col1 + lineWidth, y);
    doc.line(col2, y, col2 + lineWidth, y);
    doc.setFont('Times', 'Normal');
    doc.setFontSize(8);
    doc.text('Elaborado por', col1 + (lineWidth / 2), y + 12, { align: 'center' });
    doc.text('Cliente', col2 + (lineWidth / 2), y + 12, { align: 'center' });
    // ===== MARCA DE AGUA "ANULADO" =====
    if (opts.esAnulado) {
      doc.saveGraphicsState();

      // Texto diagonal semi-transparente
      const gState = (doc as any).GState;
      if (gState) {
        doc.setGState(new gState({ opacity: 0.15 }));
      }

      doc.setFont('Helvetica', 'Bold');
      doc.setFontSize(80);
      doc.setTextColor(255, 0, 0);

      // Centrar y rotar -45 grados
      const centerX = pageWidth / 2;
      const centerY = pageHeight / 2;

      doc.text('ANULADO', centerX, centerY, {
        align: 'center',
        angle: 45
      });

      doc.restoreGraphicsState();
      // Restaurar color para que no afecte nada más
      doc.setTextColor(0, 0, 0);
    }
    doc.save(`IngresoCaja_${numeroPago}.pdf`);
  }
  // ===== Helpers =====
  private formateaFecha(iso: string): string {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  private to2(v: any): number {
    return Math.round(Number(v || 0) * 100) / 100;
  }

  private normalizaDoc(doc: string): string {
    if (!doc) return '';
    return doc.replace(/^(\d{3})(\d{3})(\d{9})$/, '$1-$2-$3');
  }

  private mapIdFormaPago(id: string | number): string {
    const k = String(id).trim();
    const map: Record<string, string> = {
      '1': 'EFECTIVO',
      '2': 'DEPOSITO',
      '3': 'CHEQUE',
      '4': 'TRANSFERENCIA',
      '5': 'TARJETA',
      '6': 'EFECTIVO PRODUBANCO'
    };
    return map[k] || `Forma ${k}`;
  }

  private moneda(v: any, conSimbolo = false): string {
    const n = Number(v || 0);
    const s = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: false
    }).format(n);
    return conSimbolo ? `$${s}` : s;
  }

  private async loadLogoDataUrl(url?: string): Promise<string | undefined> {
    if (!url) return undefined;
    try {
      const blob = await firstValueFrom(this.http.get(url, { responseType: 'blob' as const }));
      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(blob);
      });
    } catch {
      return undefined;
    }
  }
}
