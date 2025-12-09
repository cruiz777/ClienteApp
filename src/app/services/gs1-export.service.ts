import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as moment from 'moment';
import * as ExcelJS from 'exceljs';
import { ConversionImagenService } from './base64-imagenes.service';
import { ProductoResponse } from '../interfaces/responses/producto-filter-response';

export interface GS1ExportOptions {
  data: any[];
  filename: string;
  headerInfo: any;
}
export interface GS1GtinVentaOptions {
  data: ProductoResponse[];
  filename: string;
  headerInfo: any;
}

@Injectable({ providedIn: 'root' })
export class GS1ExportService {
  constructor(private configuracionVisualService: ConversionImagenService) { }

  //EXPORTAR PDF PARA UL Y GENERAL
  async exportarPDFGS1(options: GS1ExportOptions): Promise<void> {
    const { data, filename, headerInfo } = options;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Obtener imágenes antes
    const logoBase64 = await this.configuracionVisualService.getLogoActualBase64();
    const firmaBase64 = await this.configuracionVisualService.getFirmaActualBase64();

    // Disclaimer que se repite en todas las páginas
    const disclaimer = `La Asociación Ecuatoriana de Código de Producto (ECOP) es organización miembro de GS1 en Ecuador y certifica que los códigos GTIN® que se detallan en este reporte son números estándares autorizados.
Le recordamos que publicamos a nivel nacional y global la autenticidad de los códigos GTIN® registrados en la base de datos de GS1 Ecuador. Verifique la identidad de estos códigos en nuestra herramienta
GEPIR Ecuador. Es responsabilidad del DUEÑO DE LA MARCA el manejo y control del CÓDIGO, DESCRIPCIÓN y MARCA DEL PRODUCTO. El Prefijo de Compañía GS1 no puede venderse, alquilarse, o
entregarse para uso de cualquier otra empresa. Esta política de uso se aplica a todas las claves de identificación GS1. El Prefijo de Compañía es único e inequívoco para cada empresa.`;

    // Preparar tabla
    const tableRows: any[] = [];
    let index = 1;

    data.forEach(producto => {
      const codigos14 = producto.codigos_14 || [];

      tableRows.push([
        String(index++),
        producto.codigo_producto || '',
        '',
        producto.descripcion || '',
        producto.marca || '',
        producto.contenido_neto || '',
        producto.unidad_medida || '',
        this.formatearFechaSafe(producto.fecha)
      ]);

      codigos14.forEach((c14: any) => {
        tableRows.push([
          '',
          '',
          c14.gtin_14 || '',
          c14.descripcion || '',
          '',
          '',
          '',
          this.formatearFechaSafe(c14.fecha || producto.fecha)
        ]);
      });
    });

    autoTable(doc, {
      startY: 65, // Justo después del header
      head: [[
        '#', 'GTIN-13', 'GTIN-14', 'DESCRIPCIÓN', 'MARCA', 'CONTENIDO NETO', 'UNIDAD MEDIDA', 'FECHA'
      ]],
      body: tableRows,
      styles: { fontSize: 7.5, cellPadding: 1.2 },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { cellWidth: 35 },
        2: { cellWidth: 35 },
        3: { cellWidth: 85 },
        4: { cellWidth: 35 },
        5: { cellWidth: 25 },
        6: { cellWidth: 25 },
        7: { cellWidth: 30 },
      },
      margin: { top: 65, left: 10, right: 10, bottom: 55 }, // Margen superior ajustado
      didDrawPage: (data) => {
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const pageNumber = data.pageNumber;
        const totalPages = (doc as any).internal?.getNumberOfPages?.() ?? 1;
        const rightX = pageWidth - 20;
        let y = 15;

        // Logo
        if (logoBase64) doc.addImage(logoBase64, 'PNG', 15, y, 35, 20);

        // Títulos
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('SISTEMA DE CONTROL DE CÓDIGOS', pageWidth / 2, y + 5, { align: 'center' });
        doc.setFontSize(12);
        doc.text('REPORTE DE PRODUCTOS CODIFICADOS', pageWidth / 2, y + 12, { align: 'center' });

        // Información lateral derecha
        doc.setFontSize(9);
        const info = [
          { label: 'Emisor:', value: 'GS1 Ecuador' },
          { label: 'Fecha emisión:', value: headerInfo.fechaEmision },
          { label: 'Pág:', value: `${pageNumber}` },
          { label: 'GLN:', value: headerInfo.gln },
          { label: 'RUC:', value: headerInfo.ruc },
        ];
        let rightY = y;
        info.forEach(line => {
          doc.setFont('helvetica', 'bold');
          doc.text(line.label, rightX - 40, rightY);
          doc.setFont('helvetica', 'normal');
          doc.text(line.value, rightX, rightY, { align: 'right' });
          rightY += 5;
        });

        // Código y empresa
        y += 25;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        if (headerInfo.codigoEmpresa) doc.text(headerInfo.codigoEmpresa, 15, y);
        if (headerInfo.nombreEmpresa) doc.text(headerInfo.nombreEmpresa, 40, y);

        // Disclaimer - Posicionado justo después de empresa
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);

        // Calcular las líneas del disclaimer con ancho ajustado
        const disclaimerLines = doc.splitTextToSize(disclaimer, pageWidth - 20);

        // Renderizar el disclaimer línea por línea con espaciado compacto
        disclaimerLines.forEach((line: string, index: number) => {
          doc.text(line, 10, y + (index * 3));
        });
        // El header termina aproximadamente en y + (disclaimerLines.length * 3) ≈ 65mm

        // Firma centrada - Posición fija como antes
        if (firmaBase64) {
          const firmaWidth = 45;
          const firmaX = (pageWidth - firmaWidth) / 2;
          const firmaY = pageHeight - 50; // Posición fija
          doc.addImage(firmaBase64, 'PNG', firmaX, firmaY, firmaWidth, 45);
        }

      }
    });

    // Guardar PDF
    doc.save(`${filename}_${moment().format('YYYYMMDD_HHmmss')}.pdf`);
  }

  //EXPORTAR EXCEL PARA UL Y GENERAL
  async exportarExcelGS1(options: GS1ExportOptions): Promise<void> {
    const { data, filename, headerInfo } = options;

    // Crear nuevo workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte Productos Codificados');

    // Configurar orientación de página como horizontal
    worksheet.pageSetup = {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0
    };

    let currentRow = 1;

    worksheet.mergeCells(`B${currentRow}:D${currentRow}`);   // como en tu ejemplo, centrado en varias columnas
    const titleCell = worksheet.getCell(`B${currentRow}`);
    titleCell.value = 'SISTEMA DE CONTROL DE CÓDIGOS';
    titleCell.font = {
      name: 'Calibri',
      size: 16,
      bold: true,
      color: { argb: 'FF003366' }   // azul oscuro GS1
    };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    currentRow++;

    // ======================

    // ======================
    // FILA 2: SUBTÍTULO
    // ======================
    worksheet.mergeCells(`B${currentRow}:D${currentRow}`);
    const subtitleCell = worksheet.getCell(`B${currentRow}`);
    subtitleCell.value = 'REPORTE DE PRODUCTOS CODIFICADOS';
    subtitleCell.font = {
      name: 'Calibri',
      size: 16,
      bold: true,
      color: { argb: 'FF003366' }   // mismo azul
    };
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    currentRow++;

    // ======================
    // FILA 3: VACÍA
    // ======================
    currentRow++;

    // ======================
    // FILA 4: EMPRESA Y CÓDIGO
    // ======================
    const empresaCell = worksheet.getCell(`B${currentRow}`);
    empresaCell.value = headerInfo.nombreEmpresa || 'NESTLE ECUADOR S.A.';
    empresaCell.font = {
      name: 'Calibri',
      size: 14,
      bold: true,
      color: { argb: 'FFFF6600' }   // naranja como en tu ejemplo
    };
    empresaCell.alignment = {
      horizontal: 'left',
      vertical: 'middle',
      wrapText: true
    };

    const codigoCell = worksheet.getCell(`C${currentRow}`);
    codigoCell.value = headerInfo.codigoEmpresa || '78610012';
    codigoCell.font = {
      name: 'Calibri',
      size: 14,
      bold: true,
      color: { argb: 'FF003366' }   // azul para el código
    };
    codigoCell.alignment = { horizontal: 'left', vertical: 'middle' };
    currentRow++;

    // ======================
    // FILA 5: VACÍA
    // ======================
    currentRow++;


    // FILA 6: RUC
    const rucLabelCell = worksheet.getCell(`B${currentRow}`);
    rucLabelCell.value = 'RUC:';
    rucLabelCell.font = { name: 'Calibri', size: 11, bold: true };
    rucLabelCell.alignment = { horizontal: 'left', vertical: 'middle' };

    const rucValueCell = worksheet.getCell(`C${currentRow}`);
    rucValueCell.value = headerInfo.ruc || '0990032246001';
    rucValueCell.font = { name: 'Calibri', size: 11 };
    rucValueCell.alignment = { horizontal: 'left', vertical: 'middle' };
    currentRow++;

    // FILA 7: GLN
    const glnLabelCell = worksheet.getCell(`B${currentRow}`);
    glnLabelCell.value = 'GLN:';
    glnLabelCell.font = { name: 'Calibri', size: 11, bold: true };
    glnLabelCell.alignment = { horizontal: 'left', vertical: 'middle' };

    const glnValueCell = worksheet.getCell(`C${currentRow}`);
    glnValueCell.value = headerInfo.gln || '7861001200003';
    glnValueCell.font = { name: 'Calibri', size: 11 };
    glnValueCell.alignment = { horizontal: 'left', vertical: 'middle' };
    currentRow++;

    // FILA 8: EMISOR
    const emisorLabelCell = worksheet.getCell(`B${currentRow}`);
    emisorLabelCell.value = 'Emisor:';
    emisorLabelCell.font = { name: 'Calibri', size: 11, bold: true };
    emisorLabelCell.alignment = { horizontal: 'left', vertical: 'middle' };

    const emisorValueCell = worksheet.getCell(`C${currentRow}`);
    emisorValueCell.value = 'GS1 Ecuador';
    emisorValueCell.font = { name: 'Calibri', size: 11 };
    emisorValueCell.alignment = { horizontal: 'left', vertical: 'middle' };
    currentRow++;

    // FILA 9: FECHA EMISIÓN
    const fechaLabelCell = worksheet.getCell(`B${currentRow}`);
    fechaLabelCell.value = 'Fecha emisión :';
    fechaLabelCell.font = { name: 'Calibri', size: 11, bold: true };
    fechaLabelCell.alignment = { horizontal: 'left', vertical: 'middle' };

const fechaTexto = headerInfo.fechaEmision as string; // '03/12/2025'
const [diaStr, mesStr, anioStr] = fechaTexto.split('/');
const fecha = new Date(
  parseInt(anioStr, 10),
  parseInt(mesStr, 10) - 1,
  parseInt(diaStr, 10)
);

const fechaValueCell = worksheet.getCell(`C${currentRow}`);
fechaValueCell.value = fecha;
fechaValueCell.numFmt = 'dd/mm/yyyy';

    fechaValueCell.font = { name: 'Calibri', size: 11 };
    fechaValueCell.alignment = { horizontal: 'left', vertical: 'middle' };
    currentRow++;

    // FILA 10: Vacía
    currentRow++;

    // FILA 11: DISCLAIMER - Combinado de B a H
    // FILA 11: DISCLAIMER - Combinado de B a H
    worksheet.mergeCells(`B${currentRow}:H${currentRow}`);
    const disclaimerCell = worksheet.getCell(`B${currentRow}`);

    disclaimerCell.value = {
      richText: [
        {
          text: 'GS1 Ecuador  (ECOP) certifica que los códigos GTIN que constan a continuación son auténticos y publicados en www.gs1ec.org Verified by Ecuador.\n',
          font: { name: 'Calibri', size: 10, bold: false }
        },
        {
          text: 'El dueño de la marca del producto pone el código, es su responsabilidad el manejo y control del código, incluida su descripción y marca.\n',
          font: { name: 'Calibri', size: 10, bold: false }
        },
        {
          text: 'El Prefijo Global De Compañía GS1, GCP, es ',
          font: { name: 'Calibri', size: 10, bold: true }
        },
        {
          text: 'INTRANSFERIBLE.',
          font: { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFF0000' } } // 🔴 ROJO
        }
      ]
    };

    disclaimerCell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true
    };

    disclaimerCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFF00' } // Amarillo
    };

    // altura de la fila para que quepa el texto
    worksheet.getRow(currentRow).height = 45;
    currentRow++;


    // FILA 12: Vacía
    currentRow++;

    // FILA 13: HEADERS DE LA TABLA
    const headers = [
      { col: 'B', value: 'GTIN-13' },
      { col: 'C', value: 'GTIN-14' },
      { col: 'D', value: 'DESCRIPCION' },
      { col: 'E', value: 'MARCA' },
      { col: 'F', value: 'CONTENIDO NETO' },
      { col: 'G', value: 'UNIDAD DE MEDIDA' },
      { col: 'H', value: 'FECHA' }
    ];

    headers.forEach(header => {
      const cell = worksheet.getCell(`${header.col}${currentRow}`);
      cell.value = header.value;
      cell.font = { name: 'Calibri', size: 11, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFF' } // Gris claro
      };
    });
    currentRow++;

    // DATOS DE LA TABLA
    let rowNumber = 1;
    data.forEach(producto => {
      const codigos14 = producto.codigos_14 || [];

      // Fila principal del producto
      const numeracionCell = worksheet.getCell(`A${currentRow}`);
      numeracionCell.value = rowNumber++;
      numeracionCell.font = { name: 'Calibri', size: 11, color: { argb: 'FFFF6600' } };
      numeracionCell.alignment = { horizontal: 'center', vertical: 'middle' };

      const gtin13Cell = worksheet.getCell(`B${currentRow}`);
      gtin13Cell.value = producto.codigo_producto || '';
      gtin13Cell.font = { name: 'Calibri', size: 12, color: { argb: 'FF0000FF' } ,bold: true};
      gtin13Cell.alignment = { horizontal: 'left', vertical: 'middle' };

      // Columna C (GTIN-14) vacía para fila principal

      const descripcionCell = worksheet.getCell(`D${currentRow}`);
      descripcionCell.value = producto.descripcion || '';
      descripcionCell.font = { name: 'Calibri', size: 12 };
      descripcionCell.alignment = { horizontal: 'left', vertical: 'middle' };

      const marcaCell = worksheet.getCell(`E${currentRow}`);
      marcaCell.value = producto.marca || '';
      marcaCell.font = { name: 'Calibri', size: 12 };
      marcaCell.alignment = { horizontal: 'left', vertical: 'middle' };

      const contenidoCell = worksheet.getCell(`F${currentRow}`);
      contenidoCell.value = producto.contenido_neto || '';
      contenidoCell.font = { name: 'Calibri', size: 12 };
      contenidoCell.alignment = { horizontal: 'left', vertical: 'middle' };

      const unidadCell = worksheet.getCell(`G${currentRow}`);
      unidadCell.value = producto.unidad_medida || '';
      unidadCell.font = { name: 'Calibri', size: 12 };
      unidadCell.alignment = { horizontal: 'left', vertical: 'middle' };

      const fechaCell = worksheet.getCell(`H${currentRow}`);
      fechaCell.value = this.formatearFechaSafe(producto.fecha);
      fechaCell.font = { name: 'Calibri', size: 12 };
      fechaCell.alignment = { horizontal: 'left', vertical: 'middle' };

      currentRow++;

      // Filas de códigos GTIN-14
      codigos14.forEach((c14: any) => {
        // Columna A vacía (sin numeración)
        // Columna B vacía (sin GTIN-13)

        const gtin14Cell = worksheet.getCell(`C${currentRow}`);
        gtin14Cell.value = c14.gtin_14 || '';
        gtin14Cell.font = { name: 'Calibri', size: 12, color: { argb: 'FF0000FF' } ,bold: true};
        gtin14Cell.alignment = { horizontal: 'left', vertical: 'middle' };

        const desc14Cell = worksheet.getCell(`D${currentRow}`);
        desc14Cell.value = c14.descripcion || '';
        desc14Cell.font = { name: 'Calibri', size: 12 };
        desc14Cell.alignment = { horizontal: 'left', vertical: 'middle' };

        // Columnas E, F, G vacías para GTIN-14

        const fecha14Cell = worksheet.getCell(`H${currentRow}`);
        fecha14Cell.value = this.formatearFechaSafe(c14.fecha || producto.fecha);
        fecha14Cell.font = { name: 'Calibri', size: 12 };
        fecha14Cell.alignment = { horizontal: 'left', vertical: 'middle' };

        currentRow++;
      });
    });

    // Intentar agregar logo desde base64
    try {
      const logoBase64 = await this.configuracionVisualService.getLogoActualBase64();
      if (logoBase64) {
        const base64Data = logoBase64.replace(/^data:image\/[a-z]+;base64,/, '');

        const logoId = workbook.addImage({
          base64: base64Data,
          extension: 'png',
        });

        // Posicionar el logo en la fila F (fila 6), área del encabezado
        worksheet.addImage(logoId, {
          tl: { col: 5.5, row: 2.1 }, // Columna F, fila 6 aproximadamente
          ext: { width: 170, height: 100 }
        });
      }
    } catch (error) {
      console.warn('No se pudo cargar el logo:', error);
    }

    // Configurar anchos de columnas basados en el análisis del archivo original
    worksheet.columns = [
      { width: 2.5 },   // A - Numeración (muy angosto)
      { width: 20.36 }, // B - GTIN-13  
      { width: 20.36 }, // C - GTIN-14
      { width: 40.36 }, // D - DESCRIPCIÓN (más ancho)
      { width: 20.36 }, // E - MARCA
      { width: 20.36 }, // F - CONTENIDO NETO
      { width: 20.36 }, // G - UNIDAD DE MEDIDA
      { width: 16.21 }, // H - FECHA
      { width: 11.07 }, // I - Columna extra
      { width: 11.07 }  // J - Columna extra
    ];

    // Generar y descargar el archivo
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${moment().format('YYYYMMDD_HHmmss')}.xlsx`;
    link.click();

    window.URL.revokeObjectURL(url);
  }

  //EXPORTAR PDF GTIN VENTA
  async exportarPDFGtinVenta(options: GS1GtinVentaOptions): Promise<void> {
    const { data, filename, headerInfo } = options;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Obtener imágenes antes
    const logoBase64 = await this.configuracionVisualService.getLogoActualBase64();
    const firmaBase64 = await this.configuracionVisualService.getFirmaActualBase64();

    // Disclaimer específico para GTIN Venta
    const disclaimer = `La Asociación Ecuatoriana de Código de Producto (ECOP) es organización miembro de GS1 en Ecuador y certifica que los códigos GTIN® que se detallan en este reporte son números estándares autorizados.
Le recordamos que publicamos a nivel nacional y global la autenticidad de los códigos GTIN® registrados en la base de datos de GS1 Ecuador. Verifique la identidad de estos códigos en nuestra herramienta
GEPIR Ecuador. Es responsabilidad del DUEÑO DE LA MARCA el manejo y control del CÓDIGO, DESCRIPCIÓN y MARCA DEL PRODUCTO. El Prefijo de Compañía GS1 no puede venderse, alquilarse, o
entregarse para uso de cualquier otra empresa. Esta política de uso se aplica a todas las claves de identificación GS1. El Prefijo de Compañía es único e inequívoco para cada empresa.`;

    // Preparar tabla con las columnas específicas de GTIN Venta
    const tableRows: any[] = [];
    let index = 1;

    data.forEach(producto => {
      tableRows.push([
        String(index++),
        producto.codpro || '',
        producto.despro || '',
        producto.marca || '',
        producto.contenido || '',
        producto.um || '',
        producto.gtin || '',
        this.formatearFechaSafe(producto.feccre)
      ]);
    });

    autoTable(doc, {
      startY: 65,
      head: [[
        '#', 'CÓDIGO', 'DESCRIPCIÓN', 'MARCA', 'CONTENIDO', 'UNIDAD', 'TIPO', 'FECHA'
      ]],
      body: tableRows,
      styles: { fontSize: 7.5, cellPadding: 1.2 },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },  // #
        1: { cellWidth: 35 },                    // CÓDIGO
        2: { cellWidth: 65 },                    // DESCRIPCIÓN
        3: { cellWidth: 35 },                    // MARCA
        4: { cellWidth: 25 },                    // CONTENIDO
        5: { cellWidth: 25 },                    // UNIDAD
        6: { cellWidth: 25 },                    // TIPO
        7: { cellWidth: 30 },                    // FECHA
      },
      margin: { top: 65, left: 10, right: 10, bottom: 55 },
      didDrawPage: (data) => {
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const pageNumber = data.pageNumber;
        const rightX = pageWidth - 20;
        let y = 15;

        // Logo
        if (logoBase64) {
          doc.addImage(logoBase64, 'PNG', 15, y, 35, 20);
        }

        // ======================
        //  TÍTULOS CABECERA
        // ======================
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 51, 102);   // Azul similar a #003366
        doc.setFontSize(14);
        doc.text(
          'SISTEMA DE CONTROL DE CÓDIGOS',
          pageWidth / 2,
          y + 5,
          { align: 'center' }
        );

        doc.setFontSize(12);
        doc.text(
          'REPORTE DE PRODUCTOS CODIFICADOS',
          pageWidth / 2,
          y + 12,
          { align: 'center' }
        );

        // Volver a negro para el resto del documento
        doc.setTextColor(0, 0, 0);


        // Volvemos a negro
        doc.setTextColor(0, 0, 0);


        // Información lateral derecha
        doc.setFontSize(9);
        const info = [
          { label: 'Emisor:', value: 'GS1 Ecuador' },
          { label: 'Fecha emisión:', value: headerInfo.fechaEmision },
          { label: 'Pág:', value: `${pageNumber}` },
          { label: 'GLN:', value: headerInfo.gln },
          { label: 'RUC:', value: headerInfo.ruc },
        ];
        let rightY = y;
        info.forEach(line => {
          doc.setFont('helvetica', 'bold');
          doc.text(line.label, rightX - 40, rightY);
          doc.setFont('helvetica', 'normal');
          doc.text(line.value, rightX, rightY, { align: 'right' });
          rightY += 5;
        });

        // Código y empresa
        y += 25;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        if (headerInfo.codigoEmpresa) doc.text(headerInfo.codigoEmpresa, 15, y);
        if (headerInfo.nombreEmpresa) doc.text(headerInfo.nombreEmpresa, 50, y);

        // Disclaimer
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        const disclaimerLines = doc.splitTextToSize(disclaimer, pageWidth - 20);
        disclaimerLines.forEach((line: string, index: number) => {
          doc.text(line, 10, y + (index * 3));
        });

        // Firma centrada
        if (firmaBase64) {
          const firmaWidth = 45;
          const firmaX = (pageWidth - firmaWidth) / 2;
          const firmaY = pageHeight - 50;
          doc.addImage(firmaBase64, 'PNG', firmaX, firmaY, firmaWidth, 45);
        }
      }
    });

    // Guardar PDF
    doc.save(`${filename}_${moment().format('YYYYMMDD_HHmmss')}.pdf`);
  }

  //EXPORTAR GTIN VENTA EXCEL
  async exportarExcelGtinVenta(options: GS1GtinVentaOptions): Promise<void> {
    const { data, filename, headerInfo } = options;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte GTIN Venta');

    worksheet.pageSetup = {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0
    };



    // FILA 1: TÍTULO PRINCIPAL
    let currentRow = 1;

    // ======================
    // FILA 1: TÍTULO PRINCIPAL
    // ======================
    worksheet.mergeCells(`B${currentRow}:D${currentRow}`);   // como en tu ejemplo, centrado en varias columnas
    const titleCell = worksheet.getCell(`B${currentRow}`);
    titleCell.value = 'SISTEMA DE CONTROL DE CÓDIGOS';
    titleCell.font = {
      name: 'Calibri',
      size: 16,
      bold: true,
      color: { argb: 'FF003366' }   // azul oscuro GS1
    };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    currentRow++;

    // ======================
    // FILA 2: SUBTÍTULO
    // ======================
    worksheet.mergeCells(`B${currentRow}:D${currentRow}`);
    const subtitleCell = worksheet.getCell(`B${currentRow}`);
    subtitleCell.value = 'REPORTE DE PRODUCTOS GTIN VENTA';
    subtitleCell.font = {
      name: 'Calibri',
      size: 16,
      bold: true,
      color: { argb: 'FF003366' }   // mismo azul
    };
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    currentRow++;

    // FILA 3: Vacía
    currentRow++;

    // ======================
    // FILA 4: EMPRESA Y CÓDIGO
    // ======================
    const empresaCell = worksheet.getCell(`B${currentRow}`);
    empresaCell.value = headerInfo.nombreEmpresa || '';
    empresaCell.font = {
      name: 'Calibri',
      size: 14,
      bold: true,
      color: { argb: 'FFFF6600' }   // NARANJA (como en la captura)
    };
    empresaCell.alignment = {
      horizontal: 'left',
      vertical: 'middle',
      wrapText: true
    };

    const codigoCell = worksheet.getCell(`C${currentRow}`);
    codigoCell.value = headerInfo.codigoEmpresa || '';
    codigoCell.font = {
      name: 'Calibri',
      size: 14,
      bold: true,
      color: { argb: 'FF003366' }   // azul para el código
    };
    codigoCell.alignment = { horizontal: 'left', vertical: 'middle' };
    currentRow++;

    currentRow++;

    currentRow++; // Fila vacía

    // Información de la empresa
    const empresaInfo = [
      { label: 'RUC:', value: headerInfo.ruc || '' },
      { label: 'GLN:', value: headerInfo.gln || '' },
      { label: 'Emisor:', value: 'GS1 Ecuador' },
      { label: 'Fecha emisión :', value: headerInfo.fechaEmision || '' }
    ];

    empresaInfo.forEach(info => {
      const labelCell = worksheet.getCell(`B${currentRow}`);
      labelCell.value = info.label;
      labelCell.font = { name: 'Calibri', size: 11, bold: true };

      const valueCell = worksheet.getCell(`C${currentRow}`);
      valueCell.value = info.value;
      valueCell.font = { name: 'Calibri', size: 11 };

      currentRow++;
    });

    currentRow++; // Fila vacía

    // DISCLAIMER
    // FILA 11: DISCLAIMER - Combinado de B a H
    worksheet.mergeCells(`B${currentRow}:H${currentRow}`);
    const disclaimerCell = worksheet.getCell(`B${currentRow}`);

    disclaimerCell.value = {
      richText: [
        {
          text: 'GS1 Ecuador  (ECOP) certifica que los códigos GTIN que constan a continuación son auténticos y publicados en www.gs1ec.org Verified by Ecuador.\n',
          font: { name: 'Calibri', size: 10, bold: false }
        },
        {
          text: 'El dueño de la marca del producto pone el código, es su responsabilidad el manejo y control del código, incluida su descripción y marca.\n',
          font: { name: 'Calibri', size: 10, bold: false }
        },
        {
          text: 'El Prefijo Global De Compañía GS1, GCP, es ',
          font: { name: 'Calibri', size: 10, bold: true }
        },
        {
          text: 'INTRANSFERIBLE.',
          font: { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFF0000' } } // 🔴 ROJO
        }
      ]
    };

    disclaimerCell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true
    };

    disclaimerCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFF00' } // Amarillo
    };

    // altura de la fila para que quepa el texto
    worksheet.getRow(currentRow).height = 50;
    currentRow++;

    currentRow++;

    currentRow++; // Fila vacía

    // HEADERS DE LA TABLA
    const headers = [
      { col: 'A', value: '#' },
      { col: 'B', value: 'CÓDIGO' },
      { col: 'C', value: 'DESCRIPCIÓN' },
      { col: 'D', value: 'MARCA' },
      { col: 'E', value: 'CONTENIDO' },
      { col: 'F', value: 'UNIDAD' },
      { col: 'G', value: 'TIPO' },
      { col: 'H', value: 'FECHA' }
    ];

    headers.forEach(header => {
      const cell = worksheet.getCell(`${header.col}${currentRow}`);
      cell.value = header.value;
      cell.font = { name: 'Calibri', size: 11, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFF' }  //fgColor: { argb: 'FFD3D3D3' }
      };
    });
    currentRow++;

    // DATOS DE LA TABLA
    // DATOS DE LA TABLA
    data.forEach((producto, index) => {
      const rowData = [
        index + 1,                       // A  -> #
        producto.codpro || '',           // B  -> CÓDIGO
        producto.despro || '',           // C  -> DESCRIPCIÓN
        producto.marca || '',            // D  -> MARCA
        producto.contenido || '',        // E  -> CONTENIDO
        producto.um || '',               // F  -> UNIDAD
        producto.gtin || '',             // G  -> TIPO
        this.formatearFechaSafe(producto.feccre) // H -> FECHA
      ];

      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach((col, colIndex) => {
        const cell = worksheet.getCell(`${col}${currentRow}`);
        cell.value = rowData[colIndex];

        // Tamaño y color por defecto
        let fontColor = { argb: 'FF000000' }; // negro
        let fontSize = 12;
        let isBold = false;

        if (col === 'A') {
          // Naranja + tamaño 11
          fontColor = { argb: 'FFFF6600' };
          fontSize = 11;
        } else if (col === 'B') {
          // Azul oscuro (igual que empresa)
          fontColor = { argb: 'FF0000FF' };
          fontSize = 12;
           isBold = true; 
        }

        cell.font = {
          name: 'Calibri',
          size: fontSize,
          color: fontColor,
           bold: isBold 
        };

        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      });



      currentRow++;
    });


    // Intentar agregar logo
    try {
      const logoBase64 = await this.configuracionVisualService.getLogoActualBase64();
      if (logoBase64) {
        const base64Data = logoBase64.replace(/^data:image\/[a-z]+;base64,/, '');

        const logoId = workbook.addImage({
          base64: base64Data,
          extension: 'png',
        });

        worksheet.addImage(logoId, {
          tl: { col: 5.5, row: 2.1 },
          ext: { width: 170, height: 100 }
        });
      }
    } catch (error) {
      console.warn('No se pudo cargar el logo:', error);
    }

    // Configurar anchos de columnas
    worksheet.columns = [
      { width: 8 },     // A - #
      { width: 20.36 }, // B - CÓDIGO  
      { width: 40.36 }, // C - DESCRIPCIÓN
      { width: 20.36 }, // D - MARCA
      { width: 15.36 }, // E - CONTENIDO
      { width: 15.36 }, // F - UNIDAD
      { width: 15.36 }, // G - TIPO
      { width: 16.21 }, // H - FECHA
    ];

    // Generar y descargar
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${moment().format('YYYYMMDD_HHmmss')}.xlsx`;
    link.click();

    window.URL.revokeObjectURL(url);
  }
  private formatearFechaSafe(fecha: any): string {
    if (!fecha) return '';

    let fechaMoment;

    // Intentar diferentes formatos
    if (typeof fecha === 'string' && fecha.includes('/')) {
      // Formato DD/MM/YYYY
      fechaMoment = moment(fecha, 'DD/MM/YYYY');
    } else {
      // Formato ISO o Date object
      fechaMoment = moment(fecha);
    }

    return fechaMoment.isValid() ? fechaMoment.format('DD/MM/YYYY') : '';
  }
private formatearFechaDDMMYYYY(fecha: string | Date): string {
  let d: Date;

  if (fecha instanceof Date) {
    d = fecha;
  } else {
    // fecha viene como 'dd/mm/yyyy'
    const [diaStr, mesStr, anioStr] = fecha.split('/');
    const dia = parseInt(diaStr, 10);
    const mes = parseInt(mesStr, 10) - 1; // meses 0–11 en JS
    const anio = parseInt(anioStr, 10);
    d = new Date(anio, mes, dia);
  }

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}


}