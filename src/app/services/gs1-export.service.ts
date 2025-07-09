import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as moment from 'moment';
import { ConversionImagenService } from './base64-imagenes.service';

export interface GS1ExportOptions {
  data: any[];
  filename: string;
  headerInfo: any;
}

@Injectable({ providedIn: 'root' })
export class GS1ExportService {
  constructor(private configuracionVisualService: ConversionImagenService) {}

  async exportarPDFGS1(options: GS1ExportOptions): Promise<void> {
    const { data, filename, headerInfo } = options;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    let yPosition = 15;

    try {
      const logoBase64 = await this.configuracionVisualService.getLogoActualBase64();
      if (logoBase64) doc.addImage(logoBase64, 'PNG', 15, yPosition, 35, 20);
    } catch (error) {
      console.warn('⚠️ Error al cargar logo GS1:', error);
    }

    // Encabezado centrado
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Sistema de Control de Códigos', doc.internal.pageSize.width / 2, yPosition + 5, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Reporte de Producto con Presentaciones', doc.internal.pageSize.width / 2, yPosition + 12, { align: 'center' });

    // Información lateral derecha
    const rightX = doc.internal.pageSize.width - 20;
    let rightY = yPosition;
    const info = [
      { label: 'Emisor:', value: 'GS1 Ecuador' },
      { label: 'Fecha emisión:', value: headerInfo.fechaEmision },
      { label: 'Pág:', value: '1' },
      { label: 'GLN:', value: headerInfo.gln },
      { label: 'RUC:', value: headerInfo.ruc },
    ];
    doc.setFontSize(9);
    info.forEach(line => {
      doc.setFont('helvetica', 'bold');
      doc.text(line.label, rightX - 40, rightY);
      doc.setFont('helvetica', 'normal');
      doc.text(line.value, rightX, rightY, { align: 'right' });
      rightY += 5;
    });

    // Información empresa
    yPosition += 25;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    if (headerInfo.codigoEmpresa) doc.text(headerInfo.codigoEmpresa, 15, yPosition);
    if (headerInfo.nombreEmpresa) doc.text(headerInfo.nombreEmpresa, 40, yPosition);

    yPosition += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const disclaimer = `La Asociación Ecuatoriana de Código de Producto (ECOP) es organización miembro de GS1 en Ecuador y certifica que los códigos GTIN® que se detallan en este reporte son números estándares autorizados.
    Le recordamos que publicamos a nivel nacional y global la autenticidad de los códigos GTIN® registrados en la base de datos de GS1 Ecuador. Verifique la identidad de estos códigos en nuestra herramienta
    GEPIR Ecuador. Es responsabilidad del DUEÑO DE LA MARCA el manejo y control del CÓDIGO, DESCRIPCIÓN y MARCA DEL PRODUCTO. El Prefijo de Compañía GS1 no puede venderse, alquilarse, o
    entregarse para uso de cualquier otra empresa. Esta política de uso se aplica a todas las claves de identificación GS1. El Prefijo de Compañía es único e inequívoco para cada empresa.`;
    const disclaimerLines = doc.splitTextToSize(disclaimer, doc.internal.pageSize.width - 30);
    doc.text(disclaimerLines, 15, yPosition);
    yPosition += disclaimerLines.length * 3 + 4;

    // Construcción de tabla estilo anidado
    const tableRows: any[] = [];
    let index = 1;

    data.forEach(producto => {
    const codigos14 = producto.codigos_14 || [];

    // Fila principal con GTIN-13
    tableRows.push([
        String(index++),
        producto.codigo_producto || '',
        '',
        producto.descripcion || '',
        producto.marca || '',
        producto.contenido_neto || '',
        producto.unidad_medida || '',
        moment(producto.fecha).format('DD/MM/YYYY')
    ]);

    // Filas secundarias con GTIN-14
    codigos14.forEach((c14: any) => {
        tableRows.push([
        '',
        '', // columna GTIN-13 vacía
        c14.gtin_14 || '',
        c14.descripcion || '',
        '',                 // Fila en blanco de MARCA
        '',        // Fila en blanco de CONTENIDO NETO
        '',         // Fila en blanco de UNIDAD DE MEDIDA
        moment(c14.fecha || producto.fecha).format('DD/MM/YYYY')
        ]);
    });
    });



    autoTable(doc, {
    startY: yPosition,
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
        0: { halign: 'center', cellWidth: 8 },   // #
        1: { cellWidth: 28 },                    // GTIN-13
        2: { cellWidth: 28 },                    // GTIN-14
        3: { cellWidth: 70 },                    // DESCRIPCIÓN
        4: { cellWidth: 30 },                    // MARCA
        5: { cellWidth: 20 },                    // CONTENIDO
        6: { cellWidth: 20 },                    // UNIDAD
        7: { cellWidth: 25 },                    // FECHA
    },
    margin: { top: 10, left: 15, right: 15, bottom: 20 },
    });


    // Firma y pie
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      await this.agregarFirma(doc);
      doc.setFontSize(8);
      doc.text(`Página ${i} de ${totalPages}`, doc.internal.pageSize.width - 15, doc.internal.pageSize.height - 10, { align: 'right' });
    }

    doc.save(`${filename}_${moment().format('YYYYMMDD_HHmmss')}.pdf`);
  }

  private async agregarFirma(doc: jsPDF): Promise<void> {
    try {
      const firmaBase64 = await this.configuracionVisualService.getFirmaActualBase64();
      if (firmaBase64) {
        const firmaWidth = 45;
        const firmaX = (doc.internal.pageSize.width - firmaWidth) / 2;
        const firmaY = doc.internal.pageSize.height - 45;
        doc.addImage(firmaBase64, 'PNG', firmaX, firmaY, firmaWidth, 45);
      }
    } catch (error) {
      console.warn('⚠️ Error al cargar firma:', error);
    }
  }
}
