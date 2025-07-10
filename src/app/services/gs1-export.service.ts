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
        moment(producto.fecha).format('DD/MM/YYYY')
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
          moment(c14.fecha || producto.fecha).format('DD/MM/YYYY')
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
        doc.text('Sistema de Control de Códigos', pageWidth / 2, y + 5, { align: 'center' });
        doc.setFontSize(12);
        doc.text('Reporte de Producto con Presentaciones', pageWidth / 2, y + 12, { align: 'center' });

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
}