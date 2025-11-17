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

    // Crear documento jsPDF
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
      console.log('🔍 Logo URL recibida:', logoUrl);
      if (logoUrl) {
        logoDataUrl = await this.toDataUrlSafe(logoUrl);
        console.log('✅ Logo convertido a DataURL:', logoDataUrl ? 'SUCCESS' : 'FAILED');
      }
    } catch (error) {
      console.warn('[AnticipoPDFService] No se pudo cargar el logo:', error);
    }

    let yPosition = margins.top;

    // ============ CABECERA ============
    if (logoDataUrl) {
      try {
        // ✅ Agregar rectángulo blanco de fondo para el logo
        doc.setFillColor(255, 255, 255);
        doc.rect(margins.left, yPosition, 30, 15, 'F');

        // ✅ Agregar logo con tamaño ajustado
        doc.addImage(logoDataUrl, 'PNG', margins.left + 1, yPosition + 1, 28, 13);
      } catch (error) {
        console.warn('[AnticipoPDFService] Error al agregar logo:', error);
      }
    }

    // Datos empresa (lado derecho)
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

    // Línea separadora
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

    // Subtítulo con rango de fechas
    if (cfg.subtitulo) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(cfg.subtitulo, margins.left, yPosition);
      yPosition += 6;
    }

    // ✅ NUEVO: Mostrar tipo de anticipo
    if (filtros && filtros.tipoAnticipo) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(cfg.colorSecundario || '#3b82f6');
      doc.text(`Tipo de Anticipo: ${filtros.tipoAnticipo}`, margins.left, yPosition);
      yPosition += 5;
    }

    // Fecha de generación SIN HORA
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

    // ============ FILTROS APLICADOS (ACTIVAR SI ES NECESARIO) ============
    // if (cfg.mostrarFiltros && filtros) {
    //   doc.setFontSize(10);
    //   doc.setFont('helvetica', 'bold');
    //   doc.setTextColor(cfg.colorSecundario || '#3b82f6');
    //   doc.text('Filtros Aplicados:', margins.left, yPosition);
    //   yPosition += 5;

    //   doc.setFontSize(9);
    //   doc.setFont('helvetica', 'normal');
    //   doc.setTextColor(80, 80, 80);

    //   const filtrosTexto = [
    //     `Período: ${filtros.fechaInicial} a ${filtros.fechaFinal}`,
    //     filtros.tipoAnticipo ? `Tipo: ${filtros.tipoAnticipo}` : 'Tipo: Todos',
    //     `Estado: ${filtros.estado}`,
    //     `Total de registros: ${filtros.totalRegistros.toLocaleString('es-EC')}`
    //   ];

    //   filtrosTexto.forEach(txt => {
    //     doc.text(`• ${txt}`, margins.left + 2, yPosition);
    //     yPosition += 4;
    //   });

    //   yPosition += 4;
    // }

    // ============ TABLA DE DATOS ============
    const headers = [
      ['N°', 'Fecha', 'Cliente', 'Concepto', 'Monto Inicial', 'Monto Utilizado', 'Saldo']
    ];

    const tableData = items.map(item => [
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
      theme: 'grid',                          // ✅ Cambiar a 'grid' para líneas visibles
      styles: {
        fontSize: 7.5,
        cellPadding: 2,                       // ✅ Más padding para mejor legibilidad
        lineColor: [200, 200, 200],           // ✅ Color de líneas gris claro
        lineWidth: 0.1                        // ✅ Grosor de líneas
      },
      headStyles: {
        fillColor: [255, 255, 255],           // Fondo blanco
        textColor: [0, 0, 0],                 // Texto negro
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center',
        lineColor: [0, 0, 0],                 // ✅ Líneas negras en header
        lineWidth: 0.3                        // ✅ Líneas más gruesas en header
      },
      bodyStyles: {
        fontSize: 8,
        textColor: 50,
        lineColor: [200, 200, 200],           // ✅ Líneas gris claro en body
        lineWidth: 0.1
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250]            // ✅ Gris más sutil para filas alternas
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


    // Obtener la posición Y después de la tabla
    const finalY = (doc as any).lastAutoTable.finalY || yPosition + 20;

    // ============ TOTALES ============
    if (cfg.mostrarTotales && totales) {
      // Verificar si hay espacio, si no, nueva página
      if (finalY > pageHeight - 40) {
        doc.addPage();
        yPosition = margins.top;
      } else {
        yPosition = finalY + 8;
      }

      // Cuadro de totales
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.rect(pageWidth - margins.right - 90, yPosition, 90, 28);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(cfg.colorPrimario || '#1f2937');
      doc.text('TOTALES', pageWidth - margins.right - 85, yPosition + 6);

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

    // Convertir a Blob
    return doc.output('blob');
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

}
