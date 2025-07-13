import * as ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as moment from 'moment';
import { ExportOptions } from '../interfaces/export-options';
import { Injectable } from '@angular/core';

// Extendemos la interfaz ExportOptions para incluir más información específica
export interface EnhancedExportOptions extends ExportOptions {
  headerInfo: {
    codigoEmpresa: string;
    nombreEmpresa: string;
    emisor: string;
    fechaEmision: string;
    pagina: string;
    ruc: string;
    gln: string;
    // Nuevos campos específicos del formato GS1
    tipoReporte?: string;
    prefijo?: string;
    clienteCodigo?: string;
  };
  // Para agregar la nota amarilla/disclaimer
  disclaimer?: string;
  // Para la firma autorizada
  firmaUrl?: string;
  firmaTexto?: string;
}

@Injectable({ providedIn: 'root' })
export class EnhancedExportService {

  async exportarExcelGS1(options: EnhancedExportOptions): Promise<void> {
    const { data, columns, headers, filename, title, logoUrl, headerInfo, disclaimer, firmaUrl, firmaTexto } = options;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(title || 'Reporte');

    let currentRow = 1;

    // ENCABEZADO PRINCIPAL ESTILO GS1
    if (headerInfo) {
      // Logo GS1 (esquina superior derecha)
      if (logoUrl) {
        try {
          const base64 = await this.obtenerLogoBase64(logoUrl);
          const imageId = workbook.addImage({ base64, extension: 'png' });
          worksheet.addImage(imageId, {
            tl: { col: 7, row: 0 }, // Posición derecha
            ext: { width: 100, height: 60 }
          });
        } catch (error) {
          console.warn('⚠️ No se pudo cargar el logo:', error);
        }
      }

      // Título principal centrado
      worksheet.mergeCells('B1:F2');
      const mainTitleCell = worksheet.getCell('B1');
      mainTitleCell.value = 'SISTEMA DE CONTROL DE CÓDIGOS';
      mainTitleCell.font = { bold: true, size: 16 };
      mainTitleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // Subtítulo del reporte
      worksheet.mergeCells('B3:F3');
      const subTitleCell = worksheet.getCell('B3');
      subTitleCell.value = title || 'REPORTE DE PRODUCTOS CODIFICADOS';
      subTitleCell.font = { bold: true, size: 12 };
      subTitleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      currentRow = 5;

      // Información de la empresa (lado izquierdo)
      if (headerInfo.nombreEmpresa) {
        const empresaRow = worksheet.getRow(currentRow);
        empresaRow.getCell(1).value = headerInfo.nombreEmpresa;
        empresaRow.getCell(1).font = { bold: true, size: 12, color: { argb: 'FFFF0000' } }; // Rojo como en la imagen
        currentRow++;
      }

      if (headerInfo.codigoEmpresa) {
        const codigoRow = worksheet.getRow(currentRow);
        codigoRow.getCell(1).value = headerInfo.codigoEmpresa;
        codigoRow.getCell(1).font = { bold: true, size: 11 };
        currentRow++;
      }

      // Información lateral derecha en formato tabla
      const infoStartRow = 5;
      
      // RUC
      worksheet.getCell(`G${infoStartRow}`).value = 'RUC:';
      worksheet.getCell(`H${infoStartRow}`).value = headerInfo.ruc;
      worksheet.getCell(`G${infoStartRow}`).font = { bold: true };
      
      // GLN
      worksheet.getCell(`G${infoStartRow + 1}`).value = 'GLN:';
      worksheet.getCell(`H${infoStartRow + 1}`).value = headerInfo.gln;
      worksheet.getCell(`G${infoStartRow + 1}`).font = { bold: true };
      
      // Emisor
      worksheet.getCell(`G${infoStartRow + 2}`).value = 'Emisor:';
      worksheet.getCell(`H${infoStartRow + 2}`).value = headerInfo.emisor;
      worksheet.getCell(`G${infoStartRow + 2}`).font = { bold: true };
      
      // Fecha emisión
      worksheet.getCell(`G${infoStartRow + 3}`).value = 'Fecha emisión:';
      worksheet.getCell(`H${infoStartRow + 3}`).value = headerInfo.fechaEmision;
      worksheet.getCell(`G${infoStartRow + 3}`).font = { bold: true };

      // Agregar bordes a la información lateral
      for (let i = 0; i < 4; i++) {
        worksheet.getCell(`G${infoStartRow + i}`).border = this.bordeFino();
        worksheet.getCell(`H${infoStartRow + i}`).border = this.bordeFino();
      }

      currentRow = Math.max(currentRow, infoStartRow + 5);
    }

    // DISCLAIMER/NOTA AMARILLA (como en la imagen)
    if (disclaimer) {
      worksheet.mergeCells(`A${currentRow}:I${currentRow + 1}`);
      const disclaimerCell = worksheet.getCell(`A${currentRow}`);
      disclaimerCell.value = disclaimer;
      disclaimerCell.font = { size: 10, bold: true };
      disclaimerCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFF00' } // Amarillo
      };
      disclaimerCell.alignment = { 
        vertical: 'middle', 
        horizontal: 'center', 
        wrapText: true 
      };
      disclaimerCell.border = this.bordeFino();
      
      currentRow += 3;
    }

    // ENCABEZADOS DE TABLA
    const fullHeaders = ['#', ...headers];
    const headerRow = worksheet.getRow(currentRow++);
    fullHeaders.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' } // Gris claro
      };
      cell.border = this.bordeFino();
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      
      // Ajustar anchos de columna según el contenido
      if (i === 0) {
        worksheet.getColumn(i + 1).width = 8; // Columna de número
      } else {
        worksheet.getColumn(i + 1).width = 20;
      }
    });

    // DATOS DE LA TABLA
    data.forEach((item, i) => {
      const row = worksheet.getRow(currentRow++);
      
      // Número de fila
      row.getCell(1).value = i + 1;
      row.getCell(1).border = this.bordeFino();
      row.getCell(1).alignment = { horizontal: 'center' };

      // Datos de las columnas
      columns.forEach((key, j) => {
        const cell = row.getCell(j + 2);
        const value = item[key];
        cell.value = value instanceof Date
          ? moment(value).format('DD/MM/YYYY')
          : value;
        cell.border = this.bordeFino();
        
        // Alineación según el tipo de contenido
        if (typeof value === 'number') {
          cell.alignment = { horizontal: 'right' };
        } else {
          cell.alignment = { horizontal: 'left' };
        }
      });

      // Alternar colores de fila para mejor legibilidad
      if (i % 2 === 1) {
        for (let col = 1; col <= fullHeaders.length; col++) {
          row.getCell(col).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8F8F8' }
          };
        }
      }
    });

    // FIRMA AUTORIZADA (si existe)
    if (firmaUrl && firmaTexto) {
      currentRow += 3;
      
      try {
        const firmaBase64 = await this.obtenerLogoBase64(firmaUrl);
        const firmaImageId = workbook.addImage({ base64: firmaBase64, extension: 'png' });
        worksheet.addImage(firmaImageId, {
          tl: { col: 3, row: currentRow - 1 },
          ext: { width: 120, height: 60 }
        });
      } catch (error) {
        console.warn('⚠️ No se pudo cargar la firma:', error);
      }

      // Texto de la firma
      worksheet.mergeCells(`D${currentRow + 2}:F${currentRow + 2}`);
      const firmaTextCell = worksheet.getCell(`D${currentRow + 2}`);
      firmaTextCell.value = firmaTexto;
      firmaTextCell.font = { bold: true, size: 10 };
      firmaTextCell.alignment = { horizontal: 'center' };
      firmaTextCell.border = {
        top: { style: 'thin' }
      };
    }

    // Exportar archivo
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${moment().format('YYYYMMDD_HHmmss')}.xlsx`;
    link.click();
  }

  async exportarPDFGS1(options: EnhancedExportOptions): Promise<void> {
    const { data, columns, headers, filename, title, logoUrl, headerInfo, disclaimer, firmaUrl, firmaTexto } = options;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    let yPosition = 20;

    // ENCABEZADO ESTILO GS1
    if (headerInfo) {
      // Logo GS1 (esquina superior derecha)
      if (logoUrl) {
        try {
          const base64Logo = await this.obtenerLogoBase64(logoUrl);
          doc.addImage(base64Logo, 'PNG', 220, 10, 60, 30);
        } catch (error) {
          console.warn('⚠️ Error al cargar logo:', error);
        }
      }

      // Título principal centrado
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('SISTEMA DE CONTROL DE CÓDIGOS', doc.internal.pageSize.width / 2, 20, { align: 'center' });

      // Subtítulo
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(title || 'REPORTE DE PRODUCTOS CODIFICADOS', doc.internal.pageSize.width / 2, 30, { align: 'center' });

      // Información de la empresa (lado izquierdo)
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      
      if (headerInfo.nombreEmpresa) {
        doc.setTextColor(255, 0, 0); // Rojo
        doc.text(headerInfo.nombreEmpresa, 20, 50);
        doc.setTextColor(0, 0, 0); // Volver a negro
      }
      
      if (headerInfo.codigoEmpresa) {
        doc.text(headerInfo.codigoEmpresa, 20, 58);
      }

      // Información lateral derecha en formato recuadro
      const rightX = doc.internal.pageSize.width - 20;
      const boxStartY = 45;
      
      // Dibujar recuadro
      doc.rect(rightX - 80, boxStartY - 5, 80, 25);
      
      doc.setFontSize(10);
      let infoY = boxStartY;
      
      if (headerInfo.ruc) {
        doc.setFont('helvetica', 'bold');
        doc.text('RUC:', rightX - 75, infoY);
        doc.setFont('helvetica', 'normal');
        doc.text(headerInfo.ruc, rightX - 45, infoY);
        infoY += 4;
      }

      if (headerInfo.gln) {
        doc.setFont('helvetica', 'bold');
        doc.text('GLN:', rightX - 75, infoY);
        doc.setFont('helvetica', 'normal');
        doc.text(headerInfo.gln, rightX - 45, infoY);
        infoY += 4;
      }

      if (headerInfo.emisor) {
        doc.setFont('helvetica', 'bold');
        doc.text('Emisor:', rightX - 75, infoY);
        doc.setFont('helvetica', 'normal');
        doc.text(headerInfo.emisor, rightX - 45, infoY);
        infoY += 4;
      }

      if (headerInfo.fechaEmision) {
        doc.setFont('helvetica', 'bold');
        doc.text('Fecha emisión:', rightX - 75, infoY);
        doc.setFont('helvetica', 'normal');
        doc.text(headerInfo.fechaEmision, rightX - 25, infoY);
      }

      yPosition = 75;
    }

    // DISCLAIMER/NOTA AMARILLA
    if (disclaimer) {
      doc.setFillColor(255, 255, 0); // Amarillo
      doc.rect(20, yPosition, doc.internal.pageSize.width - 40, 15, 'F');
      doc.rect(20, yPosition, doc.internal.pageSize.width - 40, 15); // Borde
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      
      // Dividir el texto en líneas para que se ajuste al recuadro
      const splitText = doc.splitTextToSize(disclaimer, doc.internal.pageSize.width - 50);
      doc.text(splitText, doc.internal.pageSize.width / 2, yPosition + 8, { align: 'center' });
      
      yPosition += 20;
    }

    // TABLA DE DATOS
    const tableData = data.map((item, index) => [
      index + 1,
      ...columns.map(key => {
        const value = item[key];
        return value instanceof Date 
          ? moment(value).format('DD/MM/YYYY') 
          : String(value ?? '');
      })
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['#', ...headers]],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: 'linebreak',
        halign: 'left'
      },
      headStyles: {
        fillColor: [220, 220, 220],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 }
      },
      alternateRowStyles: {
        fillColor: [248, 248, 248]
      },
      margin: { top: 10, right: 20, bottom: 30, left: 20 },
      didDrawPage: (data: any) => {
        // Pie de página
        const pageNumber = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.text(
          `Página ${data.pageNumber} de ${pageNumber}`,
          doc.internal.pageSize.width - 30,
          doc.internal.pageSize.height - 10
        );
      }
    });

    // FIRMA AUTORIZADA
    if (firmaUrl && firmaTexto) {
      const finalY = (doc as any).lastAutoTable.finalY + 20;
      
      try {
        const firmaBase64 = await this.obtenerLogoBase64(firmaUrl);
        doc.addImage(firmaBase64, 'PNG', doc.internal.pageSize.width / 2 - 30, finalY, 60, 30);
      } catch (error) {
        console.warn('⚠️ Error al cargar firma:', error);
      }

      // Línea y texto de firma
      doc.line(doc.internal.pageSize.width / 2 - 40, finalY + 35, doc.internal.pageSize.width / 2 + 40, finalY + 35);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(firmaTexto, doc.internal.pageSize.width / 2, finalY + 40, { align: 'center' });
    }

    // Guardar archivo
    doc.save(`${filename}_${moment().format('YYYYMMDD_HHmmss')}.pdf`);
  }

  // Métodos auxiliares (mantener los existentes)
  private bordeFino(): Partial<ExcelJS.Borders> {
    const style: ExcelJS.BorderStyle = 'thin';
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
}