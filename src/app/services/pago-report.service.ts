// src/app/services/pago-report.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { environment } from 'src/environments/environment';

/* ====== Tipos (ajusta si ya los tienes en otro archivo) ====== */
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
  fecha: string;                // ISO
  numero_documento: string;
  total_pago: number;
  pagado?: number;              // por si tu API lo trae
  observaciones?: string | null;
  tiene_retencion_iva: boolean;
  valor_retencion_iva?: string | null;
  tiene_retencion_fuente: boolean;
  valor_retencion_fuente?: string | null;
  caja?: string | null;
  detalles?: DetallePagoResponse[] | null;
}

@Injectable({ providedIn: 'root' })
export class PagoReportService {
  // Ej: http://localhost:5010/invoices-sic
  private readonly baseUrl = environment.invoices_sic;

  constructor(private http: HttpClient) {}

  /** Llama a GET /api/Pagos/{numeroPago} y devuelve el array de filas (pagos del lote) */
  async fetchPago(numeroPago: string): Promise<PagoResponse[]> {
    const url = `${this.baseUrl}/Pagos/${encodeURIComponent(numeroPago)}`;
    const res = await firstValueFrom(this.http.get<ApiResponse<PagoResponse[]>>(url));
    if (!res?.data || res.type !== 'Success') {
      throw new Error(res?.message || 'No se pudo recuperar el pago');
    }
    return res.data;
  }

  /** Genera el PDF desde el API y lo descarga */
  async generarPdfDesdeApi(
    numeroPago: string,
    opts?: { asiento?: string; titulo?: string; logoUrl?: string; logoDataUrl?: string }
  ): Promise<void> {
    const data = await this.fetchPago(numeroPago);
    await this.generarPdfIngresoCaja(data, {
      numeroPago,
      asiento: opts?.asiento,
      titulo: opts?.titulo,
      logoUrl: opts?.logoUrl,
      logoDataUrl: opts?.logoDataUrl
    });
  }

  /** Genera el PDF desde datos ya cargados (por si ya llamaste al endpoint) */
  async generarPdfIngresoCaja(
    filas: PagoResponse[],
    opts: {
      numeroPago?: string;
      asiento?: string;
      titulo?: string;
      logoUrl?: string;       // URL del logo (se carga como dataURL)
      logoDataUrl?: string;   // dataURL ya precargado (opcional)
    } = {}
  ): Promise<void> {
    if (!Array.isArray(filas) || filas.length === 0) {
      throw new Error('Sin datos para el PDF');
    }

    // ===== Cabecera consolidada =====
    const first = filas[0];
    const numeroPago = opts.numeroPago || first.numero_pago;
    const cliente = first.cliente_nombre;
    const fechaStr = this.formateaFecha(first.fecha);
    const asiento = opts.asiento ?? '';
    const tituloEmpresa = opts.titulo ?? 'GS1';

    // ===== Conceptos por cada documento del lote =====
    const conceptos = filas
      .map(f => {
        const tipo = String(f.tipo || '').toUpperCase();
        const etiqueta = tipo === 'A' ? 'ABONO' : (tipo === 'P' ? 'CANCELACION' : 'CANCELACION');
        // Usar monto del documento (no el total del lote)
        const montoNum = this.to2(f.pagado ?? 0);
        const monto = this.moneda(montoNum, true);
        const etq = (' ' + etiqueta).padEnd(13, ' ');
        const doc = (this.normalizaDoc(f.numero_documento) + '   ').padEnd(20, ' ');
        return `${etq}${doc}${monto}`;
      })
      .join('\n');

    // ===== Formas de pago (deduplicadas y sumadas a nivel de lote) =====
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

    // ===== jsPDF layout =====
    const doc = new jsPDF({ unit: 'pt', format: 'A4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 36;

    // Marco
    doc.setLineWidth(1);
    doc.rect(margin / 2, margin / 2, pageWidth - margin, pageHeight - margin);

    // === LOGO (arriba-izquierda) ===
    // Si se pasa logoDataUrl, se usa directo. Si no, se intenta cargar por logoUrl.
    const logoData =
      opts.logoDataUrl || (await this.loadLogoDataUrl(opts.logoUrl));
    let yOffset = 0;
    if (logoData) {
      // Ajusta tamaño/posición a tu imagen
      const logoW = 120; // pt
      const logoH = 44;  // pt
      doc.addImage(logoData, 'PNG', margin, 64 - logoH / 2, logoW, logoH);
      yOffset = 8; // pequeño espacio adicional
    }

    // Título
    doc.setFont('Times', 'Bold');
    doc.setFontSize(16);
    doc.text(tituloEmpresa, pageWidth / 2, 80 + yOffset, { align: 'center' });
    doc.setFontSize(14);
    doc.text('INGRESO DE CAJA', pageWidth / 2, 102 + yOffset, { align: 'center' });

    // ===== Barra superior: Número Pago / Asiento =====
    autoTable(doc, {
      startY: 120 + yOffset,
      styles: { font: 'Times', fontSize: 11, textColor: [0, 0, 0] },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
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

    // Ahora sí declaramos y, tomando el final de la tabla anterior
    let y = (doc as any).lastAutoTable.finalY + 12;

    // ===== Bloque FECHA / CLIENTE / CONCEPTO =====
    doc.setFont('Times', 'Bold'); doc.setFontSize(11); doc.text('FECHA:', margin, y);
    doc.setFont('Times', 'Normal'); doc.text(fechaStr, margin + 60, y); y += 16;

    doc.setFont('Times', 'Bold'); doc.text('CLIENTE :', margin, y);
    doc.setFont('Times', 'Normal'); doc.text(cliente, margin + 60, y); y += 16;

    doc.setFont('Times', 'Bold'); doc.text('CONCEPTO:  ', margin, y);
    doc.setFont('Times', 'Normal');
    const conceptoLines = doc.splitTextToSize(conceptos, pageWidth - margin * 2 - 60);
    doc.text(conceptoLines, margin + 60, y);
    y += 18 * (Array.isArray(conceptoLines) ? conceptoLines.length : 1) + 8;

    // ===== FORMAS DE PAGO (tabla) =====
    doc.setFont('Times', 'Bold'); doc.text('FORMA DE PAGO:', margin, y); y += 6;

    autoTable(doc, {
      startY: y + 6,
      margin: { left: margin, right: margin },
      styles: { font: 'Times', fontSize: 11, textColor: [0, 0, 0] },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0] },
      head: [['Descripción', 'Monto']],
      body: formas.map(f => [f.desc, this.moneda(f.monto, true)]),
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'right' }
      }
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // ===== Observación + Total =====
    const obsText = `OBSERVACION : ${first.observaciones?.toUpperCase() || 'ESTE COMPROBANTE DE NINGUNA MANERA CONSTITUYE UNA FACTURA'}`;
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      styles: { font: 'Times', fontSize: 11, textColor: [0, 0, 0] },
      body: [[
        { content: obsText, styles: { halign: 'left' } },
        { content: `TOTAL : ${this.moneda(total, true)}`, styles: { halign: 'right' } }
      ]],
      theme: 'plain'
    });

    y = (doc as any).lastAutoTable.finalY + 50;

    // ===== Firmas =====
    const col1 = margin + 40;
    const col2 = pageWidth - margin - 240;
    doc.line(col1, y, col1 + 200, y);
    doc.line(col2, y, col2 + 200, y);
    doc.setFont('Times', 'Normal');
    doc.text('Elaborado por', col1 + 100, y + 16, { align: 'center' });
    doc.text('Cliente', col2 + 100, y + 16, { align: 'center' });

    // Descargar
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
    // "001001000000163" -> "001-001-000000163"
    return doc.replace(/^(\d{3})(\d{3})(\d{9})$/, '$1-$2-$3');
  }

  private mapIdFormaPago(id: string | number): string {
    const k = String(id).trim();
    // Ajusta el catálogo según tu BD
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

  // Punto decimal con 2 decimales; sin separador de miles
  private moneda(v: any, conSimbolo = false): string {
    const n = Number(v || 0);
    const s = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: false
    }).format(n);
    return conSimbolo ? `$${s}` : s;
  }

  /** Carga un logo (URL) como dataURL; si falla, retorna undefined */
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
      return undefined; // si falla, seguimos sin logo
    }
  }
}
