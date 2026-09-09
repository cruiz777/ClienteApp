import * as ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as moment from 'moment';
import { ExportOptions } from '../interfaces/export-options';
import { Injectable } from '@angular/core';
import { ConversionImagenService } from './base64-imagenes.service';

// Extendemos jsPDF para incluir autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export interface ExportOptionsG {
  data: any[];
  columns: string[];
  headers: string[];
  filename: string;
  title?: string;
  logoUrl?: string;
  headerInfo?: any;

  // ✅ NUEVO (opcionales)
  maxRowsPdf?: number; // ej: 3000, 5000, etc. Si no se manda, no limita.
  pdfFontSize?: number; // override manual
  pdfOverflow?: 'linebreak' | 'ellipsize' | 'hidden'; // default depende de tamaño
  pdfColumnStyles?: { [colIndex: number]: any }; // estilos de autoTable por columna
  pdfPageBreak?: 'auto' | 'avoid' | 'always'; // default auto
}


@Injectable({ providedIn: 'root' })
export class ExportService {
  constructor(
    private configuracionVisualService: ConversionImagenService
  ) {}

  async exportarExcel(options: ExportOptions): Promise<void> {
    const { data, columns, headers, filename, title, logoUrl, headerInfo } = options;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(title || 'Reporte');

    let currentRow = 1;

    // ✅ NUEVO ENCABEZADO PERSONALIZADO
    if (headerInfo) {
      // Logo
      if (logoUrl) {
        try {
          const base64 = await this.obtenerLogoBase64(logoUrl);
          const imageId = workbook.addImage({ base64, extension: 'png' });
          worksheet.addImage(imageId, {
            tl: { col: 0, row: 0 },
            ext: { width: 120, height: 50 }
          });
        } catch (error) {
          console.warn('⚠️ No se pudo cargar el logo:', error);
        }
      }

      // Título principal centrado
      worksheet.mergeCells('D1:G2');
      const mainTitleCell = worksheet.getCell('D1');
      mainTitleCell.value = 'Sistema de Control de Códigos';
      mainTitleCell.font = { bold: true, size: 16 };
      mainTitleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // Subtítulo
      worksheet.mergeCells('D3:G3');
      const subTitleCell = worksheet.getCell('D3');
      subTitleCell.value = title || 'Reporte de Productos';
      subTitleCell.font = { bold: true, size: 14 };
      subTitleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // Información de la empresa (lado izquierdo)
      currentRow = 5;
      if (headerInfo.codigoEmpresa) {
        const codigoRow = worksheet.getRow(currentRow++);
        codigoRow.getCell(1).value = headerInfo.codigoEmpresa;
        codigoRow.getCell(1).font = { bold: true, size: 12 };
      }

      if (headerInfo.nombreEmpresa) {
        const empresaRow = worksheet.getRow(currentRow++);
        empresaRow.getCell(1).value = headerInfo.nombreEmpresa;
        empresaRow.getCell(1).font = { bold: true, size: 12 };
      }

      // Información lateral derecha
      const infoRow = 5;
      if (headerInfo.emisor) {
        worksheet.getCell(`H${infoRow}`).value = 'Emisor:';
        worksheet.getCell(`I${infoRow}`).value = headerInfo.emisor;
        worksheet.getCell(`H${infoRow}`).font = { bold: true };
      }

      if (headerInfo.fechaEmision) {
        worksheet.getCell(`H${infoRow + 1}`).value = 'Fecha emisión:';
        worksheet.getCell(`I${infoRow + 1}`).value = headerInfo.fechaEmision;
        worksheet.getCell(`H${infoRow + 1}`).font = { bold: true };
      }

      if (headerInfo.pagina) {
        worksheet.getCell(`H${infoRow + 2}`).value = 'Pág:';
        worksheet.getCell(`I${infoRow + 2}`).value = headerInfo.pagina;
        worksheet.getCell(`H${infoRow + 2}`).font = { bold: true };
      }

      if (headerInfo.ruc) {
        worksheet.getCell(`H${infoRow + 3}`).value = 'RUC:';
        worksheet.getCell(`I${infoRow + 3}`).value = headerInfo.ruc;
        worksheet.getCell(`H${infoRow + 3}`).font = { bold: true };
      }

      if (headerInfo.gln) {
        worksheet.getCell(`H${infoRow + 4}`).value = 'GLN:';
        worksheet.getCell(`I${infoRow + 4}`).value = headerInfo.gln;
        worksheet.getCell(`H${infoRow + 4}`).font = { bold: true };
      }

      currentRow = 8;
    } else {
      // Encabezado original (fallback)
      if (logoUrl) {
        try {
          const base64 = await this.obtenerLogoBase64(logoUrl);
          const imageId = workbook.addImage({ base64, extension: 'png' });

          worksheet.addImage(imageId, {
            tl: { col: 0, row: 0 },
            ext: { width: 150, height: 60 }
          });

          worksheet.mergeCells('D1:H1');
          const titleCell = worksheet.getCell('D1');
          titleCell.value = title;
          titleCell.font = { bold: true, size: 14 };
          titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

          worksheet.mergeCells('D2:H2');
          const fechaCell = worksheet.getCell('D2');
          fechaCell.value = 'Exportado el: ' + moment().format('YYYY-MM-DD HH:mm:ss');
          fechaCell.font = { italic: true };
          fechaCell.alignment = { horizontal: 'center' };

          currentRow = 5;
        } catch (error) {
          console.warn('⚠️ No se pudo cargar el logo:', error);
        }
      } else {
        if (title) {
          const titleRow = worksheet.getRow(currentRow++);
          titleRow.getCell(1).value = title;
          titleRow.getCell(1).font = { bold: true, size: 14 };
        }

        const fechaRow = worksheet.getRow(currentRow++);
        fechaRow.getCell(1).value = 'Exportado el:';
        fechaRow.getCell(2).value = moment().format('YYYY-MM-DD HH:mm:ss');
        fechaRow.getCell(1).font = { italic: true };
        fechaRow.getCell(2).font = { italic: true };
      }
    }

    currentRow++;

    const fullHeaders = ['#', ...headers];
    const headerRow = worksheet.getRow(currentRow++);
    fullHeaders.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true };
      cell.border = this.bordeFino();
      worksheet.getColumn(i + 1).width = 16;
    });

    data.forEach((item, i) => {
      const row = worksheet.getRow(currentRow++);
      row.getCell(1).value = i + 1;
      row.getCell(1).border = this.bordeFino();

      columns.forEach((key, j) => {
        const cell = row.getCell(j + 2);
        const value = item[key];
        cell.value = value instanceof Date
          ? moment(value).format('DD/MM/yyyy')
          : value;
        cell.border = this.bordeFino();
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${moment().format('YYYYMMDD_HHmmss')}.xlsx`;
    link.click();
  }

  // 🚀 NUEVA IMPLEMENTACIÓN CON jsPDF + autoTable (MUY RÁPIDA)
  async exportarPDF(options: ExportOptions): Promise<void> {
    const { data, columns, headers, filename, title, logoUrl, headerInfo } = options;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    let yPosition = 20;

    // ✅ NUEVO ENCABEZADO PERSONALIZADO PARA PDF
    if (headerInfo) {
      // Logo (lado izquierdo)
      if (logoUrl) {
        try {
          const base64Logo = await this.configuracionVisualService.getLogoActualBase64();
          if (base64Logo) {
            doc.addImage(base64Logo, 'PNG', 15, 15, 45, 20);
            console.log('Logo cargado correctamente');
          } else {
            console.warn('Logo no disponible para esta empresa');
          }
        } catch (error) {
          console.warn('Error al cargar logo, continuando sin logo:', error);
        }
      }

      // Título principal centrado
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Sistema de Control de Códigos', doc.internal.pageSize.width / 2, 20, { align: 'center' });

      // Subtítulo
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(title || 'Reporte de Productos', doc.internal.pageSize.width / 2, 28, { align: 'center' });

      // Información de la empresa (lado izquierdo)
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      let leftY = 45;
      if (headerInfo.codigoEmpresa) {
        doc.text(headerInfo.codigoEmpresa, 15, leftY);
        leftY += 6;
      }
      if (headerInfo.nombreEmpresa) {
        doc.text(headerInfo.nombreEmpresa, 15, leftY);
      }

      // Información lateral derecha
      doc.setFontSize(10);
      const rightX = doc.internal.pageSize.width - 15;
      let rightY = 20;

      if (headerInfo.emisor) {
        doc.setFont('helvetica', 'bold');
        doc.text('Emisor:', rightX - 60, rightY, { align: 'left' });
        doc.setFont('helvetica', 'normal');
        doc.text(headerInfo.emisor, rightX, rightY, { align: 'right' });
        rightY += 5;
      }

      if (headerInfo.fechaEmision) {
        doc.setFont('helvetica', 'bold');
        doc.text('Fecha emisión:', rightX - 60, rightY, { align: 'left' });
        doc.setFont('helvetica', 'normal');
        doc.text(headerInfo.fechaEmision, rightX, rightY, { align: 'right' });
        rightY += 5;
      }

      if (headerInfo.pagina) {
        doc.setFont('helvetica', 'bold');
        doc.text('Pág:', rightX - 60, rightY, { align: 'left' });
        doc.setFont('helvetica', 'normal');
        doc.text(headerInfo.pagina, rightX, rightY, { align: 'right' });
        rightY += 5;
      }

      if (headerInfo.ruc) {
        doc.setFont('helvetica', 'bold');
        doc.text('RUC:', rightX - 60, rightY, { align: 'left' });
        doc.setFont('helvetica', 'normal');
        doc.text(headerInfo.ruc, rightX, rightY, { align: 'right' });
        rightY += 5;
      }

      if (headerInfo.gln) {
        doc.setFont('helvetica', 'bold');
        doc.text('GLN:', rightX - 60, rightY, { align: 'left' });
        doc.setFont('helvetica', 'normal');
        doc.text(headerInfo.gln, rightX, rightY, { align: 'right' });
      }

      yPosition = 60;
    } else {
      // Encabezado original (fallback)
      if (logoUrl) {
        try {
          const base64Logo = await this.obtenerLogoBase64(logoUrl);
          doc.addImage(base64Logo, 'PNG', 20, 10, 40, 16);
          console.log('✅ Logo cargado correctamente');
        } catch (error) {
          console.warn('⚠️ Error al cargar logo, continuando sin logo:', error);
        }
      }

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(title || 'Reporte', logoUrl ? 80 : 20, 20);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Exportado el: ${moment().format('YYYY-MM-DD HH:mm:ss')}`, logoUrl ? 80 : 20, 28);

      yPosition = 40;
    }

    // Preparar datos para autoTable
    const tableData = data.map((item, index) => [
      index + 1,
      ...columns.map(key => {
        const value = item[key];
        return value instanceof Date 
          ? moment(value).format('DD/MM/YYYY') 
          : String(value ?? '');
      })
    ]);

    // Crear tabla con autoTable
    autoTable(doc, {
      startY: yPosition,
      head: [['#', ...headers]],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
        halign: 'left'
      },
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 } // Columna de números centrada
      },
      margin: { top: 10, right: 10, bottom: 10, left: 10 },
      didDrawPage: (data: any) => {
        // Pie de página con número de página
        const pageNumber = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.text(
          `Página ${data.pageNumber} de ${pageNumber}`,
          doc.internal.pageSize.width - 30,
          doc.internal.pageSize.height - 10
        );
      }
    });

    // Guardar el archivo
    doc.save(`${filename}_${moment().format('YYYYMMDD_HHmmss')}.pdf`);
  }

  // 📄 ALTERNATIVA: Exportar PDF con paginación manual (para casos extremos)
  async exportarPDFPaginado(options: ExportOptions, registrosPorPagina: number = 50): Promise<void> {
    const { data, columns, headers, filename, title, logoUrl } = options;
    
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const totalPaginas = Math.ceil(data.length / registrosPorPagina);
    
    for (let pagina = 0; pagina < totalPaginas; pagina++) {
      if (pagina > 0) {
        doc.addPage();
      }

      const inicio = pagina * registrosPorPagina;
      const fin = Math.min(inicio + registrosPorPagina, data.length);
      const datosHoja = data.slice(inicio, fin);

      let yPosition = 20;

      // Logo y encabezado en cada página
      if (logoUrl) {
        try {
          const base64Logo = await this.obtenerLogoBase64(logoUrl);
          doc.addImage(base64Logo, 'PNG', 20, 10, 40, 16);
        } catch (error) {
          console.warn('⚠️ Error al cargar logo:', error);
        }
      }

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(title || 'Reporte', logoUrl ? 80 : 20, 20);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Exportado el: ${moment().format('YYYY-MM-DD HH:mm:ss')}`, logoUrl ? 80 : 20, 28);
      doc.text(`Página ${pagina + 1} de ${totalPaginas}`, logoUrl ? 200 : 160, 28);

      yPosition = 40;

      // Datos de esta página
      const tableData = datosHoja.map((item, index) => [
        inicio + index + 1,
        ...columns.map(key => {
          const value = item[key];
          return value instanceof Date 
            ? moment(value).format('DD/MM/YYYY') 
            : String(value ?? '');
        })
      ]);

      doc.autoTable({
        startY: yPosition,
        head: [['#', ...headers]],
        body: tableData,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 2,
          overflow: 'linebreak'
        },
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 15 }
        },
        margin: { top: 10, right: 10, bottom: 10, left: 10 }
      });
    }

    doc.save(`${filename}_${moment().format('YYYYMMDD_HHmmss')}.pdf`);
  }

  // 🔄 Método con indicador de progreso
  async exportarPDFConProgreso(
    options: ExportOptions, 
    onProgreso?: (progreso: number) => void
  ): Promise<void> {
    const { data, columns, headers, filename, title, logoUrl } = options;
    
    // Procesar en chunks para evitar bloqueo del navegador
    const CHUNK_SIZE = 500;
    const chunks = this.dividirEnChunks(data, CHUNK_SIZE);
    
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    let yPosition = 20;
    let isFirstPage = true;

    // Logo base64 una sola vez
    let base64Logo = '';
    if (logoUrl) {
      try {
        base64Logo = await this.obtenerLogoBase64(logoUrl);
      } catch (error) {
        console.warn('⚠️ Error al cargar logo:', error);
      }
    }

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Reportar progreso
      if (onProgreso) {
        onProgreso((i / chunks.length) * 100);
      }

      // Agregar página si no es la primera
      if (!isFirstPage) {
        doc.addPage();
      }

      // Encabezado
      if (base64Logo) {
        doc.addImage(base64Logo, 'PNG', 20, 10, 40, 16);
      }

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(title || 'Reporte', base64Logo ? 80 : 20, 20);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Exportado el: ${moment().format('YYYY-MM-DD HH:mm:ss')}`, base64Logo ? 80 : 20, 28);

      yPosition = 40;

      // Datos del chunk
      const tableData = chunk.map((item, index) => [
        (i * CHUNK_SIZE) + index + 1,
        ...columns.map(key => {
          const value = item[key];
          return value instanceof Date 
            ? moment(value).format('DD/MM/YYYY') 
            : String(value ?? '');
        })
      ]);

      doc.autoTable({
        startY: yPosition,
        head: isFirstPage ? [['#', ...headers]] : undefined,
        body: tableData,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 2,
          overflow: 'linebreak'
        },
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 15 }
        },
        margin: { top: 10, right: 10, bottom: 10, left: 10 }
      });

      isFirstPage = false;

      // Pausa para no bloquear el navegador
      await this.delay(10);
    }

    if (onProgreso) {
      onProgreso(100);
    }

    doc.save(`${filename}_${moment().format('YYYYMMDD_HHmmss')}.pdf`);
  }

  // Métodos auxiliares
  private dividirEnChunks<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private bordeFino(): Partial<ExcelJS.Borders> {
    const style: ExcelJS.BorderStyle = 'hair';

    return {
      top: { style },
      left: { style },
      bottom: { style },
      right: { style }
    };
  }

  private obtenerLogoBase64(url: string): Promise<string> {
    return fetch(url)
      .then(res => res.blob())
      .then(blob => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }));
  }

  //Método para poder exportar a PDF el gln con el formaato requerido
  async exportarGLNPDF(options: {
    gln: string;
    clienteActual: any;
    formData: any;
    ciudad: any;
    pais: any;
    tipoLoc: any;
    logoUrl?: string;
  }): Promise<void> {
    const { gln, clienteActual, formData, ciudad, pais, tipoLoc, logoUrl } = options;
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Variables para el layout
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    const tableWidth = pageWidth - (margin * 2);

    // === ENCABEZADO ===
    // Logo GS1 (lado izquierdo)
    if (logoUrl) {
      try {
        const base64Logo = await this.configuracionVisualService.getLogoActualBase64();
        if (base64Logo) {
          doc.addImage(base64Logo, 'PNG', margin, 15, 40, 25);
        }
      } catch (error) {
        console.warn('Error al cargar logo:', error);
      }
    }

    // Títulos principales (centro)
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Sistema de Control de Códigos', pageWidth/2, 25, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Informe Global Location Number', pageWidth/2, 32, { align: 'center' });

    // Información del emisor (lado derecho)
    const infoX = pageWidth - margin - 35;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Emisor:', infoX, 20);
    doc.setFont('helvetica', 'normal');
    doc.text('GS1 Ecuador', infoX + 25, 20);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Fecha emisión:', infoX, 26);
    doc.setFont('helvetica', 'normal');
    doc.text(moment().format('DD/MM/yyyy'), infoX + 25, 26);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Pág:', infoX, 32);
    doc.setFont('helvetica', 'normal');
    doc.text('1', infoX + 25, 32);

    // === PREPARAR DATOS ===
    const latGMS = `${formData.latiG || '00'}°${formData.latiM || '00'}'${formData.latiS || '00'}" ${formData.latiE || ''}`;
    const longGMS = `${formData.longG || '00'}°${formData.longM || '00'}'${formData.longS || '00'}" ${formData.longE || ''}`;

    // === CREAR TABLA PRINCIPAL ===
    let startY = 45; // Reducido para más espacio

    const tableData = [
      // Encabezado GLN
      [{ 
        content: 'GLOBAL LOCATION NUMBER (GLN)', 
        colSpan: 2, 
        styles: { 
          fontStyle: 'bold', 
          fillColor: [200, 200, 200], 
          halign: 'center',
          fontSize: 9
        } 
      }],
      [{ 
        content: gln || '', 
        colSpan: 2, 
        styles: { 
          halign: 'center', 
          fontStyle: 'bold', 
          fontSize: 10,
          cellPadding: 4
        } 
      }],
      
      // Información básica
      // ['LOCALIZACIÓN / LOCATION:',clienteActual?.nomcli || ''], CAMBIO POR LESCALANTE PARA EVITAR CONFUSIÓN DEL CLIENTE 24/03/2026
      ['LOCALIZACIÓN / LOCATION:', formData.localizacion || ''],
      ['RUC / IDENTIFICACIÓN NUMBER:', clienteActual?.ruc || ''],
      ['EMPRESA / COMPANY:', clienteActual?.nomcli || ''],
      ['REPRESENTANTE LEGAL / LEGAL REPRESENTATIVE:', clienteActual?.representante || ''],
      
      // Encabezado Localización
      [{ 
        content: 'LOCALIZACIÓN / LOCATION', 
        colSpan: 2, 
        styles: { 
          fontStyle: 'bold', 
          fillColor: [200, 200, 200], 
          halign: 'center',
          fontSize: 9
        } 
      }],
      
      // Detalles de localización
      // ['TIPO DE LOCALIZACIÓN/LOCATION TYPE:', 
      //   formData.localizacion 
      //     ? `${tipoLoc?.descripcion || ''} - ${formData.localizacion}` // Aumenta localizacion
      //     : tipoLoc?.descripcion || '' 
      // ],      
      ['TIPO DE LOCALIZACIÓN/LOCATION TYPE:', tipoLoc?.descripcion || ''], 
      ['LATITUD / LATITUDE:', latGMS],
      ['LONGITUD / LENGTH:', longGMS],
      ['PAÍS / COUNTRY:', pais?.nombre || ''],
      ['PROVINCIA / STATE:', ciudad?.provincia || ''],
      ['CIUDAD / CITY:', ciudad?.ciudad || ''],
      ['DIRECCIÓN / ADDRESS:', formData.direccion || ''],
      ['TELÉFONO / PHONE:', clienteActual?.telefono || ''],
      ['CÓDIGO POSTAL:', formData.glnCodigopostal || ''],
      ['EMAIL:', formData.email || ''],
      ['PÁGINA WEB / WEBSITE:', formData.web || ''],
      
      // Encabezado Certificados
      [{ 
        content: 'CERTIFICADOS/CERTIFICATES', 
        colSpan: 2, 
        styles: { 
          fontStyle: 'bold', 
          fillColor: [200, 200, 200], 
          halign: 'center',
          fontSize: 9
        } 
      }],
      
      // Certificados
      ['FDA:', formData.fda || ''],
      ['EUROPA U:', formData.europa || ''],
      ['GLOBAL GAP:', formData.glnGlobal || ''],
      ['OTRO 1:', formData.glnOtro1 || ''],
      ['OTRO 2:', formData.glnOtro2 || ''],
      
      // Encabezado Contacto
      [{ 
        content: 'CONTACTO/CONTACT', 
        colSpan: 2, 
        styles: { 
          fontStyle: 'bold', 
          fillColor: [200, 200, 200], 
          halign: 'center',
          fontSize: 9
        } 
      }],
      
      // Información de contacto
      ['NOMBRE / NAME:', formData.contacto || ''],
      ['EMAIL:', formData.email || ''],
      ['TELÉFONO / PHONE:', formData.glnCelular || '']
    ];

    // Crear la tabla con autoTable
    autoTable(doc, {
      startY: startY,
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 7, // Reducido de 9 a 7
        cellPadding: 2, // Reducido de 3 a 2
        lineWidth: 0.3,
        lineColor: [0, 0, 0],
        textColor: [0, 0, 0],
        minCellHeight: 6 // Altura mínima de celda
      },
      columnStyles: {
        0: { 
          cellWidth: tableWidth * 0.45, 
          fontStyle: 'bold',
          fillColor: [245, 245, 245]
        },
        1: { 
          cellWidth: tableWidth * 0.55,
          fillColor: [255, 255, 255]
        }
      },
      margin: { left: margin, right: margin },
      tableWidth: 'auto',
      didParseCell: function(data) {
        // Ajustar el estilo de las celdas de encabezado de sección
        if (data.cell.text && data.cell.text[0] && 
            (data.cell.text[0].includes('GLOBAL LOCATION NUMBER') ||
            data.cell.text[0].includes('LOCALIZACIÓN / LOCATION') ||
            data.cell.text[0].includes('CERTIFICADOS') ||
            data.cell.text[0].includes('CONTACTO'))) {
          data.cell.styles.fillColor = [200, 200, 200];
          data.cell.styles.fontSize = 8; // Tamaño específico para encabezados
        }
      }
    });

    // === ÁREA DE FIRMA ===
    const finalY = (doc as any).lastAutoTable.finalY + 15; // Reducido espacio
    
    try {
      const base64Firma = await this.configuracionVisualService.getFirmaActualBase64();
      if (base64Firma) {
        // Mostrar firma como imagen centrada (más pequeña)
        doc.addImage(base64Firma, 'PNG', pageWidth/2 - 20, finalY, 40, 25);
        
        // Línea debajo de la firma
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.3);
        doc.line(pageWidth/2 - 30, finalY + 25, pageWidth/2 + 30, finalY + 25);
        
        // Texto debajo
        doc.setFontSize(8); // Reducido de 9 a 8
        doc.setFont('helvetica', 'normal');
        doc.text('Firma Autorizada GS1 Ecuador', pageWidth/2, finalY + 30, { align: 'center' });
      } else {
        // Solo línea y texto si no hay firma
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.3);
        doc.line(pageWidth/2 - 30, finalY + 5, pageWidth/2 + 30, finalY + 5);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Firma Autorizada GS1 Ecuador', pageWidth/2, finalY + 11, { align: 'center' });
      }
    } catch (error) {
      console.warn('Error al cargar firma:', error);
      // Fallback: línea y texto
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.line(pageWidth/2 - 30, finalY + 5, pageWidth/2 + 30, finalY + 5);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Firma Autorizada GS1 Ecuador', pageWidth/2, finalY + 11, { align: 'center' });
    }

    // Guardar archivo
    const filename = `GLN_${gln || 'informe'}_${moment().format('YYYYMMDD_HHmmss')}.pdf`;
    doc.save(filename);
  }
  async exportarPDFG(options: ExportOptionsG): Promise<void> {
  const { data, columns, headers, filename, title, logoUrl, headerInfo } = options;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  let yPosition = 20;

  // =========================
  // 1) ENCABEZADO (sin cambios funcionales)
  // =========================
  if (headerInfo) {
    if (logoUrl) {
      try {
        const base64Logo = await this.configuracionVisualService.getLogoActualBase64();
        if (base64Logo) {
          doc.addImage(base64Logo, 'PNG', 15, 15, 45, 20);
        }
      } catch (error) {
        console.warn('Error al cargar logo, continuando sin logo:', error);
      }
    }

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Sistema de Control de Códigos', doc.internal.pageSize.width / 2, 20, { align: 'center' });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title || 'Reporte', doc.internal.pageSize.width / 2, 28, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    let leftY = 45;
    if (headerInfo.codigoEmpresa) { doc.text(headerInfo.codigoEmpresa, 15, leftY); leftY += 6; }
    if (headerInfo.nombreEmpresa) { doc.text(headerInfo.nombreEmpresa, 15, leftY); }

    doc.setFontSize(10);
    const rightX = doc.internal.pageSize.width - 15;
    let rightY = 20;

    if (headerInfo.emisor) {
      doc.setFont('helvetica', 'bold'); doc.text('Emisor:', rightX - 60, rightY, { align: 'left' });
      doc.setFont('helvetica', 'normal'); doc.text(headerInfo.emisor, rightX, rightY, { align: 'right' });
      rightY += 5;
    }

    if (headerInfo.fechaEmision) {
      doc.setFont('helvetica', 'bold'); doc.text('Fecha emisión:', rightX - 60, rightY, { align: 'left' });
      doc.setFont('helvetica', 'normal'); doc.text(headerInfo.fechaEmision, rightX, rightY, { align: 'right' });
      rightY += 5;
    }

    if (headerInfo.pagina) {
      doc.setFont('helvetica', 'bold'); doc.text('Pág:', rightX - 60, rightY, { align: 'left' });
      doc.setFont('helvetica', 'normal'); doc.text(headerInfo.pagina, rightX, rightY, { align: 'right' });
      rightY += 5;
    }

    if (headerInfo.ruc) {
      doc.setFont('helvetica', 'bold'); doc.text('RUC:', rightX - 60, rightY, { align: 'left' });
      doc.setFont('helvetica', 'normal'); doc.text(headerInfo.ruc, rightX, rightY, { align: 'right' });
      rightY += 5;
    }

    if (headerInfo.gln) {
      doc.setFont('helvetica', 'bold'); doc.text('GLN:', rightX - 60, rightY, { align: 'left' });
      doc.setFont('helvetica', 'normal'); doc.text(headerInfo.gln, rightX, rightY, { align: 'right' });
    }

    yPosition = 60;
  } else {
    if (logoUrl) {
      try {
        const base64Logo = await this.obtenerLogoBase64(logoUrl);
        doc.addImage(base64Logo, 'PNG', 20, 10, 40, 16);
      } catch (error) {
        console.warn('Error al cargar logo, continuando sin logo:', error);
      }
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title || 'Reporte', logoUrl ? 80 : 20, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Exportado el: ${moment().format('YYYY-MM-DD HH:mm:ss')}`, logoUrl ? 80 : 20, 28);

    yPosition = 40;
  }

  // =========================
  // 2) CONTROL DE VOLUMEN (sin romper compatibilidad)
  // =========================
  const total = Array.isArray(data) ? data.length : 0;

  // ✅ Si viene maxRowsPdf, limita. Si no viene, no limita.
  const maxRowsPdf = options.maxRowsPdf ?? null;
  const dataToPrint = maxRowsPdf ? data.slice(0, maxRowsPdf) : data;

  // Si se limitó, coloca aviso visible en PDF
  if (maxRowsPdf && total > maxRowsPdf) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `Aviso: el PDF se generó con ${maxRowsPdf} de ${total} registros. Para el detalle completo use Excel.`,
      15,
      yPosition - 2
    );
    yPosition += 4;
  }

  // =========================
  // 3) PREPARAR TABLA (más eficiente)
  // =========================
  const tableData = dataToPrint.map((item, index) => [
    index + 1,
    ...columns.map(key => {
      const value = item[key];
      return value instanceof Date
        ? moment(value).format('DD/MM/YYYY')
        : String(value ?? '');
    })
  ]);

  // =========================
  // 4) ESTILO DINÁMICO (PDF grande => ocultar overflow y compactar)
  // =========================
  const isHuge = total > 5000;

  const fontSize = options.pdfFontSize ?? (isHuge ? 7 : 8);
  const overflow = options.pdfOverflow ?? (isHuge ? 'hidden' : 'linebreak');

  // =========================
  // 5) COLUMN STYLES: defaults + overrides
  // =========================
  // Siempre fija la columna # (0)
  const columnStyles: any = {
    0: { halign: 'center', cellWidth: 10 },
    ...(options.pdfColumnStyles || {}) // ✅ override opcional por reporte
  };

  // =========================
  // 6) autoTable
  // =========================
  autoTable(doc, {
    startY: yPosition,
    head: [['#', ...headers]],
    body: tableData,
    theme: 'grid',
    pageBreak: options.pdfPageBreak ?? 'auto',

    styles: {
      fontSize,
      cellPadding: isHuge ? 1.2 : 2,
      overflow,             // ✅ hidden para evitar "headers verticales feos"
      halign: 'left',
      valign: 'middle'
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles,
    margin: { top: 10, right: 10, bottom: 10, left: 10 },

    didDrawPage: (hookData: any) => {
      const pageNumber = hookData.pageNumber;
      const totalPages = doc.getNumberOfPages();

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Página ${pageNumber} de ${totalPages}`,
        doc.internal.pageSize.width - 35,
        doc.internal.pageSize.height - 8
      );
    }
  });

  doc.save(`${filename}_${moment().format('YYYYMMDD_HHmmss')}.pdf`);
}

}