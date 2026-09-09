// src/app/reports/anticipo-pdf.service.ts
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LogoService } from '../services/logo.service';
import { EmpresaService } from '../services/empresa.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ================== Interfaces ==================
export interface AnticipoReportePDF {
  numero: string;
  fecha: string;
  nombre_cliente: string;
  concepto: string;
  monto_inicial: number;
  monto_utilizado: number;
  saldo: number;
  id_tipo_anticipo: number;
  tipo_anticipo: string;
}

export interface TotalesAnticiposPDF {
  total_monto_inicial: number;
  total_monto_utilizado: number;
  total_saldo: number;
}

export interface FiltrosAplicadosPDF {
  fechaInicial: string;
  fechaFinal: string;
  tipoAnticipo?: string;
  estado: string;
  totalRegistros: number;
}

export interface ConfiguracionAnticiposPDF {
  nombreEmpresa?: string;
  ruc?: string;
  direccion?: string;
  telefono?: string;
  email?: string;

  titulo?: string;
  subtitulo?: string;
  mostrarFechaGeneracion?: boolean;
  mostrarUsuario?: string;
  mostrarFiltros?: boolean;
  mostrarTotales?: boolean;

  colorPrimario?: string;
  colorSecundario?: string;

  orientacion?: 'portrait' | 'landscape';
  tamanioPagina?: 'a4' | 'letter';
}

// Agregar después de las interfaces existentes
export interface DesgloceAnticipoData {
  info_anticipo: {
    id_anticipo: number;
    numero_anticipo: string;
    fecha_creacion: string;
    cliente_codigo: number;
    nombre_cliente: string;
    monto_original: number;
    concepto: string;
    caja?: string;
    esta_liquidado: boolean;
    fecha_liquidacion?: string;
    monto_liquidado?: number;
    forma_pago_liquidacion?: string;
    beneficiario_liquidacion?: string;
  };
  resumen_uso: {
    monto_original: number;
    total_utilizado: number;
    saldo_disponible: number;
    cantidad_usos: number;
    usos_en_facturas: number;
    usos_en_pagos: number;
  };
  detalle_movimientos: Array<{
    fecha_uso: string;
    tipo_documento: string;
    numero_documento: string;
    monto_utilizado: number;
    observacion?: string;
  }>;
}

export interface LiquidacionReportePDF {
  num_liquidacion: number;
  id_anticipo: number;
  fecha_liquidacion: string;
  nombre_cliente: string;
  valor_liquidado: number;
  concepto: string;
  beneficiario: string;
  descripcion_forma_pago: string;
}

export interface TotalesLiquidacionesPDF {
  total_valor_liquidado: number;
  cantidad_liquidaciones: number;
}

export interface FiltrosLiquidacionesPDF {
  fechaInicial: string;
  fechaFinal: string;
  cliente?: string;
  totalRegistros: number;
}
@Injectable({ providedIn: 'root' })
export class AnticipoPDFService {

  private readonly configDefault: ConfiguracionAnticiposPDF = {
    nombreEmpresa: 'Mi Empresa',
    titulo: 'Reporte de Anticipos',
    mostrarFechaGeneracion: true,
    mostrarFiltros: true,
    mostrarTotales: true,
    colorPrimario: '#1f2937',
    colorSecundario: '#002f75',
    orientacion: 'portrait', // horizontal para más columnas
    tamanioPagina: 'a4'
  };

  constructor(
    private logoService: LogoService,
    private empresaService: EmpresaService
  ) {}

  /**
   * Obtiene configuración de la empresa desde el servicio
   */
  async obtenerConfiguracionEmpresa(idEmpresa: number): Promise<Partial<ConfiguracionAnticiposPDF>> {
    try {
      const empresa = await firstValueFrom(this.empresaService.getEmpresaById(idEmpresa));
      return {
        nombreEmpresa: empresa.empresaNombre || 'Mi Empresa',
        direccion: empresa.empresaDireccion || '',
        telefono: empresa.empresaTelefono1 || '',
        email: empresa.empresaEmail || '',
        ruc: empresa.empresaRuc || ''
      };
    } catch (error) {
      console.error('[AnticipoPDFService] Error al obtener empresa:', error);
      return {};
    }
  }

  /**
   * Genera el PDF del reporte de anticipos
   * @param items Array de anticipos
   * @param totales Totales del reporte
   * @param filtros Filtros aplicados
   * @param config Configuración personalizada
   * @returns Promise<Blob> del PDF generado
   */
  async generarPDFBlob(
    items: AnticipoReportePDF[],
    totales: TotalesAnticiposPDF,
    filtros: FiltrosAplicadosPDF,
    config?: Partial<ConfiguracionAnticiposPDF>
  ): Promise<Blob> {

    const cfg = { ...this.configDefault, ...config };

    const doc = new jsPDF({
      orientation: cfg.orientacion || 'landscape',
      unit: 'mm',
      format: cfg.tamanioPagina || 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margins = { left: 14, right: 14, top: 14, bottom: 14 };

    // Logo
    let logoDataUrl: string | null = null;
    try {
      const logoUrl = await firstValueFrom(this.logoService.logoUrl$);
      if (logoUrl) {
        logoDataUrl = await this.toDataUrlSafe(logoUrl);
      }
    } catch (error) {
      console.warn('[AnticipoPDFService] No se pudo cargar el logo:', error);
    }

    let yPosition = margins.top;

    // ============ CABECERA ============
    if (logoDataUrl) {
      try {
        doc.setFillColor(255, 255, 255);
        doc.rect(margins.left, yPosition, 30, 15, 'F');
        doc.addImage(logoDataUrl, 'PNG', margins.left + 1, yPosition + 1, 28, 13);
      } catch (error) {
        console.warn('[AnticipoPDFService] Error al agregar logo:', error);
      }
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(cfg.colorPrimario || '#1f2937');
    doc.text(cfg.nombreEmpresa || 'Mi Empresa', pageWidth - margins.right, yPosition + 5, { align: 'right' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);

    if (cfg.ruc) {
      doc.text(`RUC: ${cfg.ruc}`, pageWidth - margins.right, yPosition + 10, { align: 'right' });
    }
    if (cfg.direccion) {
      doc.text(cfg.direccion, pageWidth - margins.right, yPosition + 14, { align: 'right' });
    }
    if (cfg.telefono || cfg.email) {
      const contacto = [cfg.telefono, cfg.email].filter(Boolean).join(' · ');
      doc.text(contacto, pageWidth - margins.right, yPosition + 18, { align: 'right' });
    }

    yPosition += 25;

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margins.left, yPosition, pageWidth - margins.right, yPosition);
    yPosition += 8;

    // ============ TÍTULO ============
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(cfg.colorPrimario || '#1f2937');
    doc.text(cfg.titulo || 'Reporte de Anticipos', margins.left, yPosition);
    yPosition += 8;

    if (cfg.subtitulo) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(cfg.subtitulo, margins.left, yPosition);
      yPosition += 6;
    }

    if (cfg.mostrarFechaGeneracion) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      const fechaSinHora = new Date().toLocaleDateString('es-EC', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
      doc.text(`Generado: ${fechaSinHora}`, margins.left, yPosition);
      yPosition += 5;
    }

    yPosition += 3;

    // ✅ AGRUPAR POR TIPO DE ANTICIPO
    const itemsAgrupados = this.agruparPorTipoAnticipo(items);

    // ✅ ITERAR SOBRE CADA GRUPO
    for (const grupo of itemsAgrupados) {

      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = margins.top;
      }

      // ============ ENCABEZADO DEL GRUPO ============
      doc.setFillColor(240, 240, 240);
      doc.rect(margins.left, yPosition, pageWidth - margins.left - margins.right, 8, 'F');

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(cfg.colorSecundario || '#002f75');
      doc.text(
        `${grupo.tipoAnticipo} (${grupo.items.length} registros)`,
        margins.left + 3,
        yPosition + 5.5
      );

      yPosition += 10;

      // ============ TABLA DEL GRUPO ============
      const headers = [
        ['N°', 'Fecha', 'Cliente', 'Concepto', 'Monto Inicial', 'Monto Utilizado', 'Saldo']
      ];

      const tableData = grupo.items.map(item => [
        item.numero,
        this.formatearFechaSoloFecha(item.fecha),
        item.nombre_cliente,
        item.concepto,
        this.formatMoney(item.monto_inicial),
        this.formatMoney(item.monto_utilizado),
        this.formatMoney(item.saldo)
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: headers,
        body: tableData,
        theme: 'grid',
        styles: {
          fontSize: 7.5,
          cellPadding: 2,
          lineColor: [200, 200, 200],
          lineWidth: 0.1
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'center',
          lineColor: [0, 0, 0],
          lineWidth: 0.3
        },
        bodyStyles: {
          fontSize: 8,
          textColor: 50,
          lineColor: [200, 200, 200],
          lineWidth: 0.1
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250]
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 25 },
          1: { halign: 'center', cellWidth: 25 },
          2: { halign: 'left', cellWidth: 'auto' },
          3: { halign: 'left', cellWidth: 'auto' },
          4: { halign: 'right', cellWidth: 28 },
          5: { halign: 'right', cellWidth: 28 },
          6: { halign: 'right', cellWidth: 28 }
        },
        margin: { left: margins.left, right: margins.right },
        didDrawPage: (data) => {
          this.agregarFooter(doc, data.pageNumber, cfg);
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY || yPosition;

      // ============ SUBTOTALES DEL GRUPO ============
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 80);

      const subtotales = this.calcularSubtotales(grupo.items);

      doc.text(
        `Subtotal ${grupo.tipoAnticipo}:     Monto Inicial: ${this.formatMoney(subtotales.montoInicial)}     Monto Utilizado: ${this.formatMoney(subtotales.montoUtilizado)}     Saldo: ${this.formatMoney(subtotales.saldo)}`,
        pageWidth - margins.right,
        finalY + 6,
        { align: 'right' }
      );

      yPosition = finalY + 12;
    }

    // ============ TOTALES GENERALES ============
    if (cfg.mostrarTotales && totales) {
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = margins.top;
      }

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.rect(pageWidth - margins.right - 90, yPosition, 90, 28);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(cfg.colorPrimario || '#1f2937');
      doc.text('TOTALES GENERALES', pageWidth - margins.right - 85, yPosition + 6);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);

      const totalesData = [
        ['Total Monto Inicial:', this.formatMoney(totales.total_monto_inicial)],
        ['Total Monto Utilizado:', this.formatMoney(totales.total_monto_utilizado)],
        ['Total Saldo:', this.formatMoney(totales.total_saldo)]
      ];

      let yTotales = yPosition + 11;
      totalesData.forEach(([label, value]) => {
        doc.text(label, pageWidth - margins.right - 85, yTotales);
        doc.setFont('helvetica', 'bold');
        doc.text(value, pageWidth - margins.right - 5, yTotales, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        yTotales += 5;
      });
    }

    return doc.output('blob');
  }

  // ============DESGLOSE DE ANTICIPO ============

  /**
 * Genera el PDF del desglose de un anticipo específico
 * @param desglose Datos completos del desglose
 * @param config Configuración personalizada
 * @returns Promise<Blob> del PDF generado
 */
  async generarDesglosePDFBlob(
    desglose: DesgloceAnticipoData,
    config?: Partial<ConfiguracionAnticiposPDF>
  ): Promise<Blob> {

    const cfg = { ...this.configDefault, ...config };

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: cfg.tamanioPagina || 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margins = { left: 14, right: 14, top: 14, bottom: 14 };

    // Logo
    let logoDataUrl: string | null = null;
    try {
      const logoUrl = await firstValueFrom(this.logoService.logoUrl$);
      if (logoUrl) {
        logoDataUrl = await this.toDataUrlSafe(logoUrl);
      }
    } catch (error) {
      console.warn('[AnticipoPDFService] No se pudo cargar el logo:', error);
    }

    let yPosition = margins.top;

    // ============ CABECERA (IGUAL QUE REPORTE) ============
    if (logoDataUrl) {
      try {
        doc.setFillColor(255, 255, 255);
        doc.rect(margins.left, yPosition, 30, 15, 'F');
        doc.addImage(logoDataUrl, 'PNG', margins.left + 1, yPosition + 1, 28, 13);
      } catch (error) {
        console.warn('[AnticipoPDFService] Error al agregar logo:', error);
      }
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(cfg.colorPrimario || '#1f2937');
    doc.text(cfg.nombreEmpresa || 'Mi Empresa', pageWidth - margins.right, yPosition + 5, { align: 'right' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);

    if (cfg.ruc) {
      doc.text(`RUC: ${cfg.ruc}`, pageWidth - margins.right, yPosition + 10, { align: 'right' });
    }
    if (cfg.direccion) {
      doc.text(cfg.direccion, pageWidth - margins.right, yPosition + 14, { align: 'right' });
    }
    if (cfg.telefono || cfg.email) {
      const contacto = [cfg.telefono, cfg.email].filter(Boolean).join(' · ');
      doc.text(contacto, pageWidth - margins.right, yPosition + 18, { align: 'right' });
    }

    yPosition += 25;

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margins.left, yPosition, pageWidth - margins.right, yPosition);
    yPosition += 8;

    // ============ TÍTULO ============
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(cfg.colorPrimario || '#1f2937');
    doc.text(cfg.titulo || 'Desglose de Anticipo', margins.left, yPosition);
    yPosition += 8;

    if (cfg.subtitulo) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(cfg.subtitulo, margins.left, yPosition);
      yPosition += 6;
    }

    if (cfg.mostrarFechaGeneracion) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      const fechaSinHora = new Date().toLocaleDateString('es-EC', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
      doc.text(`Generado: ${fechaSinHora}`, margins.left, yPosition);
      yPosition += 5;
    }

    yPosition += 3;

    // ============ INFORMACIÓN DEL ANTICIPO ============
    doc.setFillColor(240, 240, 240);
    doc.rect(margins.left, yPosition, pageWidth - margins.left - margins.right, 8, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(cfg.colorSecundario || '#002f75');
    doc.text(
      'INFORMACIÓN DEL ANTICIPO',
      margins.left + 3,
      yPosition + 5.5
    );

    yPosition += 10;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);

    const infoData = [
      ['Número:', desglose.info_anticipo.numero_anticipo],
      ['Fecha Creación:', this.formatearFechaSoloFecha(desglose.info_anticipo.fecha_creacion)],
      ['Cliente:', `${desglose.info_anticipo.nombre_cliente} (${desglose.info_anticipo.cliente_codigo})`],
      ['Caja:', desglose.info_anticipo.caja || 'N/A'],
      ['Concepto:', desglose.info_anticipo.concepto || 'N/A']
    ];

    infoData.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, margins.left, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(value, margins.left + 35, yPosition);
      yPosition += 5;
    });

    yPosition += 3;

    // ============ RESUMEN FINANCIERO ============
    doc.setFillColor(240, 248, 255);
    doc.rect(margins.left, yPosition, pageWidth - margins.left - margins.right, 25, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(cfg.colorSecundario || '#002f75');
    doc.text('RESUMEN FINANCIERO', margins.left + 3, yPosition + 6);

    yPosition += 11;

    const resumenData = [
      ['Monto Original:', this.formatMoney(desglose.resumen_uso.monto_original)],
      ['Total Utilizado:', this.formatMoney(desglose.resumen_uso.total_utilizado)],
      ['Saldo Disponible:', this.formatMoney(desglose.resumen_uso.saldo_disponible)]
    ];

    doc.setFontSize(9);
    resumenData.forEach(([label, value]) => {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(label, margins.left + 3, yPosition);
      doc.setFont('helvetica', 'bold');
      doc.text(value, margins.left + 50, yPosition);
      yPosition += 5;
    });

    yPosition += 5;

    // ============ LIQUIDACIÓN (si existe) ============
    if (desglose.info_anticipo.esta_liquidado) {
      doc.setFillColor(255, 248, 240);
      doc.rect(margins.left, yPosition, pageWidth - margins.left - margins.right, 23, 'F');

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(200, 100, 0);
      doc.text('⚠ ANTICIPO LIQUIDADO', margins.left + 3, yPosition + 6);

      yPosition += 11;

      const liquidacionData = [
        ['Fecha Liquidación:', desglose.info_anticipo.fecha_liquidacion || 'N/A'],
        ['Monto Liquidado:', this.formatMoney(desglose.info_anticipo.monto_liquidado || 0)],
        ['Forma de Pago:', desglose.info_anticipo.forma_pago_liquidacion || 'N/A']
      ];

      doc.setFontSize(9);
      liquidacionData.forEach(([label, value]) => {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text(label, margins.left + 3, yPosition);
        doc.setFont('helvetica', 'bold');
        doc.text(value, margins.left + 50, yPosition);
        yPosition += 5;
      });

      yPosition += 5;
    }

    // ============ DETALLE DE MOVIMIENTOS ============
    doc.setFillColor(240, 240, 240);
    doc.rect(margins.left, yPosition, pageWidth - margins.left - margins.right, 8, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(cfg.colorSecundario || '#002f75');
    doc.text(
      `DETALLE DE MOVIMIENTOS (${desglose.resumen_uso.cantidad_usos} usos: ${desglose.resumen_uso.usos_en_facturas} facturas, ${desglose.resumen_uso.usos_en_pagos} pagos)`,
      margins.left + 3,
      yPosition + 5.5
    );

    yPosition += 10;

    if (desglose.detalle_movimientos.length === 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(150, 150, 150);
      doc.text('No se han registrado movimientos para este anticipo.', margins.left, yPosition);
    } else {
      const headers = [
        ['Fecha', 'Tipo', 'N° Documento', 'Monto', 'Observación']
      ];

      const tableData = desglose.detalle_movimientos.map(item => [
        this.formatearFechaSoloFecha(item.fecha_uso),
        item.tipo_documento,
        item.numero_documento,
        this.formatMoney(item.monto_utilizado),
        item.observacion || '-'
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: headers,
        body: tableData,
        theme: 'grid',
        styles: {
          fontSize: 7.5,
          cellPadding: 2,
          lineColor: [200, 200, 200],
          lineWidth: 0.1
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'center',
          lineColor: [0, 0, 0],
          lineWidth: 0.3
        },
        bodyStyles: {
          fontSize: 8,
          textColor: 50,
          lineColor: [200, 200, 200],
          lineWidth: 0.1
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250]
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 25 },
          1: { halign: 'center', cellWidth: 25 },
          2: { halign: 'left', cellWidth: 40 },
          3: { halign: 'right', cellWidth: 28 },
          4: { halign: 'left', cellWidth: 'auto' }
        },
        margin: { left: margins.left, right: margins.right },
        didDrawPage: (data) => {
          this.agregarFooter(doc, data.pageNumber, cfg);
        }
      });
      const finalY = (doc as any).lastAutoTable.finalY || yPosition;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(cfg.colorSecundario || '#002f75');

      doc.text(
        `Saldo Restante: ${this.formatMoney(desglose.resumen_uso.saldo_disponible)}`,
        pageWidth - margins.right,
        finalY + 8,
        { align: 'right' }
      );
    }

    return doc.output('blob');
  }
    /**
   * Genera el PDF del reporte de liquidaciones de anticipos
   * @param items Array de liquidaciones
   * @param totales Totales del reporte
   * @param filtros Filtros aplicados
   * @param config Configuración personalizada
   * @returns Promise<Blob> del PDF generado
   */
  async generarLiquidacionesPDFBlob(
    items: LiquidacionReportePDF[],
    totales: TotalesLiquidacionesPDF,
    filtros: FiltrosLiquidacionesPDF,
    config?: Partial<ConfiguracionAnticiposPDF>
  ): Promise<Blob> {

    const cfg = {
      ...this.configDefault,
      ...config,
      titulo: config?.titulo || 'Reporte de Liquidaciones de Anticipos'
    };

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: cfg.tamanioPagina || 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margins = { left: 14, right: 14, top: 14, bottom: 14 };

    // Logo (igual que antes)
    let logoDataUrl: string | null = null;
    try {
      const logoUrl = await firstValueFrom(this.logoService.logoUrl$);
      if (logoUrl) {
        logoDataUrl = await this.toDataUrlSafe(logoUrl);
      }
    } catch (error) {
      console.warn('[AnticipoPDFService] No se pudo cargar el logo:', error);
    }

    let yPosition = margins.top;

    // ============ CABECERA (igual que antes) ============
    if (logoDataUrl) {
      try {
        doc.setFillColor(255, 255, 255);
        doc.rect(margins.left, yPosition, 30, 15, 'F');
        doc.addImage(logoDataUrl, 'PNG', margins.left + 1, yPosition + 1, 28, 13);
      } catch (error) {
        console.warn('[AnticipoPDFService] Error al agregar logo:', error);
      }
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(cfg.colorPrimario || '#1f2937');
    doc.text(cfg.nombreEmpresa || 'Mi Empresa', pageWidth - margins.right, yPosition + 5, { align: 'right' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);

    if (cfg.ruc) {
      doc.text(`RUC: ${cfg.ruc}`, pageWidth - margins.right, yPosition + 10, { align: 'right' });
    }
    if (cfg.direccion) {
      doc.text(cfg.direccion, pageWidth - margins.right, yPosition + 14, { align: 'right' });
    }
    if (cfg.telefono || cfg.email) {
      const contacto = [cfg.telefono, cfg.email].filter(Boolean).join(' · ');
      doc.text(contacto, pageWidth - margins.right, yPosition + 18, { align: 'right' });
    }

    yPosition += 25;

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margins.left, yPosition, pageWidth - margins.right, yPosition);
    yPosition += 8;

    // ============ TÍTULO ============
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(cfg.colorPrimario || '#1f2937');
    doc.text(cfg.titulo || 'Reporte de Liquidaciones de Anticipos', margins.left, yPosition);
    yPosition += 8;

    if (cfg.mostrarFechaGeneracion) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      const fechaSinHora = new Date().toLocaleDateString('es-EC', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
      doc.text(`Generado: ${fechaSinHora}`, margins.left, yPosition);
      yPosition += 5;
    }

    // ============ FILTROS (OPCIONAL) ============
    if (cfg.mostrarFiltros) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Período: ${filtros.fechaInicial} - ${filtros.fechaFinal} | Total: ${filtros.totalRegistros} liquidación(es)`,
        margins.left,
        yPosition
      );
      yPosition += 8;
    }

    // ============ TABLA DE LIQUIDACIONES ============
    const headers = [
      ['N° Liquidación', 'N° Anticipo', 'Fecha', 'Cliente', 'Concepto', 'Beneficiario', 'Forma Pago', 'Valor']
    ];

    const tableData = items.map(item => [
      item.num_liquidacion.toString().padStart(6, '0'),
      item.id_anticipo.toString().padStart(6, '0'),
      this.formatearFechaSoloFecha(item.fecha_liquidacion),
      item.nombre_cliente,
      item.concepto || '-',
      item.beneficiario || '-',
      item.descripcion_forma_pago || 'N/A',
      this.formatMoney(item.valor_liquidado)
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: headers,
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        lineColor: [200, 200, 200],
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center',
        lineColor: [0, 0, 0],
        lineWidth: 0.3
      },
      bodyStyles: {
        fontSize: 8,
        textColor: 50,
        lineColor: [200, 200, 200],
        lineWidth: 0.1
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250]
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 28 },
        1: { halign: 'center', cellWidth: 28 },
        2: { halign: 'center', cellWidth: 25 },
        3: { halign: 'left', cellWidth: 'auto' },
        4: { halign: 'left', cellWidth: 'auto' },
        5: { halign: 'left', cellWidth: 'auto' },
        6: { halign: 'center', cellWidth: 30 },
        7: { halign: 'right', cellWidth: 28 }
      },
      margin: { left: margins.left, right: margins.right },
      didDrawPage: (data) => {
        this.agregarFooter(doc, data.pageNumber, cfg);
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY || yPosition;

    // ============ TOTALES ============
    if (cfg.mostrarTotales && totales) {
      if (finalY > pageHeight - 40) {
        doc.addPage();
        yPosition = margins.top;
      } else {
        yPosition = finalY + 10;
      }

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.rect(pageWidth - margins.right - 90, yPosition, 90, 20);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(cfg.colorPrimario || '#1f2937');
      doc.text('TOTALES', pageWidth - margins.right - 85, yPosition + 6);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);

      const totalesData = [
        ['Cantidad Liquidaciones:', totales.cantidad_liquidaciones.toString()],
        ['Total Liquidado:', this.formatMoney(totales.total_valor_liquidado)]
      ];

      let yTotales = yPosition + 11;
      totalesData.forEach(([label, value]) => {
        doc.text(label, pageWidth - margins.right - 85, yTotales);
        doc.setFont('helvetica', 'bold');
        doc.text(value, pageWidth - margins.right - 5, yTotales, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        yTotales += 5;
      });
    }

    return doc.output('blob');
  }

  /**
   * Descarga directa del PDF de liquidaciones
   */
  async descargarLiquidacionesPDF(
    items: LiquidacionReportePDF[],
    totales: TotalesLiquidacionesPDF,
    filtros: FiltrosLiquidacionesPDF,
    nombreArchivo: string = 'reporte-liquidaciones-anticipos.pdf',
    config?: Partial<ConfiguracionAnticiposPDF>
  ): Promise<void> {
    const blob = await this.generarLiquidacionesPDFBlob(items, totales, filtros, config);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    a.click();
    URL.revokeObjectURL(url);
  }
  /**
   * Descarga directa del PDF de desglose
   */
  async descargarDesglosePDF(
    desglose: DesgloceAnticipoData,
    nombreArchivo?: string,
    config?: Partial<ConfiguracionAnticiposPDF>
  ): Promise<void> {
    const filename = nombreArchivo ||
      `desglose-anticipo-${desglose.info_anticipo.numero_anticipo}.pdf`;

    const blob = await this.generarDesglosePDFBlob(desglose, config);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Descarga directa del PDF
   */
  async descargarPDF(
    items: AnticipoReportePDF[],
    totales: TotalesAnticiposPDF,
    filtros: FiltrosAplicadosPDF,
    nombreArchivo: string = 'reporte-anticipos.pdf',
    config?: Partial<ConfiguracionAnticiposPDF>
  ): Promise<void> {
    const blob = await this.generarPDFBlob(items, totales, filtros, config);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ============ HELPERS ============

  private agregarFooter(doc: jsPDF, pageNumber: number, cfg: ConfiguracionAnticiposPDF): void {
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);

    // Izquierda
    doc.text(
      'Documento generado automáticamente',
      14,
      pageHeight - 8
    );

    // Derecha
    doc.text(
      `Página ${pageNumber}`,
      pageWidth - 14,
      pageHeight - 8,
      { align: 'right' }
    );
  }

  private formatMoney(value: number): string {
    return `$ ${value.toLocaleString('es-EC', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  private hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : [59, 130, 246]; // default azul
  }

  private async toDataUrlSafe(url: string): Promise<string | null> {
    try {
      const res = await fetch(url, { mode: 'cors' });
      const blob = await res.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(null);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('[AnticipoPDFService] Error en toDataUrlSafe:', error);
      return null;
    }
  }
  private formatearFechaSoloFecha(fecha: string): string {
    if (!fecha) return '';

    try {
      // Extraer solo la parte de la fecha (antes de la T o espacio)
      const fechaSola = fecha.split('T')[0].split(' ')[0];
      const [year, month, day] = fechaSola.split('-');

      // Retornar en formato DD/MM/YYYY
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.warn('Error al formatear fecha:', fecha);
      return fecha;
    }
  }
  private agruparPorTipoAnticipo(items: AnticipoReportePDF[]): Array<{
    idTipoAnticipo: number;
    tipoAnticipo: string;
    items: AnticipoReportePDF[];
  }> {
    const grupos = new Map<number, AnticipoReportePDF[]>();

    items.forEach(item => {
      const id = item.id_tipo_anticipo;
      if (!grupos.has(id)) {
        grupos.set(id, []);
      }
      grupos.get(id)!.push(item);
    });

    return Array.from(grupos.entries()).map(([id, items]) => ({
      idTipoAnticipo: id,
      tipoAnticipo: items[0].tipo_anticipo,
      items
    })).sort((a, b) => a.idTipoAnticipo - b.idTipoAnticipo);
  }

  private calcularSubtotales(items: AnticipoReportePDF[]): {
    montoInicial: number;
    montoUtilizado: number;
    saldo: number;
  } {
    return items.reduce((acc, item) => ({
      montoInicial: acc.montoInicial + item.monto_inicial,
      montoUtilizado: acc.montoUtilizado + item.monto_utilizado,
      saldo: acc.saldo + item.saldo
    }), { montoInicial: 0, montoUtilizado: 0, saldo: 0 });
  }

}
