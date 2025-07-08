// gs1-export.service.ts
import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as moment from 'moment';
import { LogoService } from './logo.service';
import { FirmaService } from './firma.service';

export interface GS1ExportOptions {
  data: any[];
  columns: string[];
  headers: string[];
  filename: string;
  title: string;
  headerInfo: any;
  logoFileName?: string;
  firmaFileName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GS1ExportService {

  constructor(
    private logoService: LogoService,
    private firmaService: FirmaService
  ) {}

  /**
   * Exporta PDF con formato oficial GS1 Ecuador
   */
  async exportarPDFGS1(options: GS1ExportOptions): Promise<void> {
    const { data, columns, headers, filename, title, headerInfo, logoFileName, firmaFileName } = options;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    let yPosition = 15;

    // ==================== ENCABEZADO GS1 ====================
    
    // Logo GS1 Ecuador (esquina superior izquierda)
    if (logoFileName) {
      try {
        const logoUrl = this.logoService.getLogoUrl(logoFileName);
        const logoBase64 = await this.obtenerImagenBase64(logoUrl);
        doc.addImage(logoBase64, 'PNG', 15, 15, 50, 25); // Más ancho: 50mm en lugar de 35mm
      } catch (error) {
        console.warn('⚠️ Error al cargar logo GS1:', error);
      }
    }

    // Título principal centrado
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Sistema de Control de Códigos', doc.internal.pageSize.width / 2, 25, { align: 'center' });

    // Subtítulo
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title || 'Reporte de Producto con Presentaciones', doc.internal.pageSize.width / 2, 33, { align: 'center' });

    // Información lateral derecha
    doc.setFontSize(10);
    const rightX = doc.internal.pageSize.width - 15;
    let rightY = 20;

    if (headerInfo.emisor) {
      doc.setFont('helvetica', 'bold');
      doc.text('Emisor:', rightX - 50, rightY, { align: 'left' });
      doc.setFont('helvetica', 'normal');
      doc.text(headerInfo.emisor, rightX, rightY, { align: 'right' });
      rightY += 5;
    }

    if (headerInfo.fechaEmision) {
      doc.setFont('helvetica', 'bold');
      doc.text('Fecha emisión:', rightX - 50, rightY, { align: 'left' });
      doc.setFont('helvetica', 'normal');
      doc.text(headerInfo.fechaEmision, rightX, rightY, { align: 'right' });
      rightY += 5;
    }

    if (headerInfo.pagina) {
      doc.setFont('helvetica', 'bold');
      doc.text('Pág:', rightX - 50, rightY, { align: 'left' });
      doc.setFont('helvetica', 'normal');
      doc.text(headerInfo.pagina, rightX, rightY, { align: 'right' });
      rightY += 5;
    }

    if (headerInfo.ruc) {
      doc.setFont('helvetica', 'bold');
      doc.text('RUC:', rightX - 50, rightY, { align: 'left' });
      doc.setFont('helvetica', 'normal');
      doc.text(headerInfo.ruc, rightX, rightY, { align: 'right' });
      rightY += 5;
    }

    if (headerInfo.gln) {
      doc.setFont('helvetica', 'bold');
      doc.text('GLN:', rightX - 50, rightY, { align: 'left' });
      doc.setFont('helvetica', 'normal');
      doc.text(headerInfo.gln, rightX, rightY, { align: 'right' });
    }

    // Información de la empresa (lado izquierdo)
    yPosition = 50;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    
    if (headerInfo.codigoEmpresa) {
      doc.text(headerInfo.codigoEmpresa, 15, yPosition);
      yPosition += 6;
    }
    
    if (headerInfo.nombreEmpresa) {
      doc.text(headerInfo.nombreEmpresa, 15, yPosition);
      yPosition += 8;
    }

    // ==================== DISCLAIMER GS1 ====================
    const disclaimer = `La Asociación Ecuatoriana de Código de Producto (ECOP) es organización miembro de GS1 en Ecuador y certifica que los códigos GTIN® que se detallan en este reporte son números estándares autorizados.
Le recordamos que publicamos a nivel nacional y global la autenticidad de los códigos GTIN® registrados en la base de datos de GS1 Ecuador. Verifique la identidad de estos códigos en nuestra herramienta
GEPIR Ecuador. Es responsabilidad del DUEÑO DE LA MARCA el manejo y control del CÓDIGO, DESCRIPCIÓN y MARCA DEL PRODUCTO. El Prefijo de Compañía GS1 no puede venderse, alquilarse, o
entregarse para uso de cualquier otra empresa. Esta política de uso se aplica a todas las claves de identificación GS1. El Prefijo de Compañía es único e inequívoco para cada empresa.`;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    // Dividir el disclaimer en líneas que quepan en el ancho disponible
    const disclaimerLines = doc.splitTextToSize(disclaimer, doc.internal.pageSize.width - 30);
    doc.text(disclaimerLines, 15, yPosition);
    
    yPosition += disclaimerLines.length * 3 + 10; // Espacio después del disclaimer

    // ==================== TABLA DE DATOS ====================
    
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
        cellPadding: 1.5,
        overflow: 'linebreak',
        halign: 'left'
      },
      headStyles: {
        fillColor: [245, 245, 245],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 8
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 }, // Columna # más pequeña
        1: { cellWidth: 30 }, // GTIN-13
        2: { cellWidth: 35 }, // Descripción
        3: { cellWidth: 20 }, // Marca
        4: { cellWidth: 20 }, // Contenido Neto
        5: { cellWidth: 15 }, // Unidad Medida
        6: { cellWidth: 18 }, // Fecha
        7: { cellWidth: 30 }, // GTIN-14
        8: { cellWidth: 35 }, // Descripción 14
        9: { cellWidth: 15 }, // Presentación
        10: { cellWidth: 15 } // Unidad
      },
      margin: { top: 10, right: 15, bottom: 50, left: 15 }
    });

    // Agregar firma DESPUÉS de crear la tabla, no en didDrawPage
    await this.agregarFirmaYPie(doc, firmaFileName, 1);

    // Si hay múltiples páginas, agregar firma en todas
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      if (i > 1) {
        doc.setPage(i);
      }
      await this.agregarFirmaYPie(doc, firmaFileName, i);
    }

    // Guardar el archivo
    doc.save(`${filename}_${moment().format('YYYYMMDD_HHmmss')}.pdf`);
  }

  /**
   * Agrega firma autorizada y pie de página
   */
  private async agregarFirmaYPie(doc: jsPDF, firmaFileName: string | undefined, pageNumber: number): Promise<void> {
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;

    // Firma autorizada (centrada, parte inferior)
    if (firmaFileName) {
      try {
        const firmaUrl = this.firmaService.getFirmaUrl(firmaFileName);
        const firmaBase64 = await this.obtenerImagenBase64(firmaUrl);
        
        // Posición de la firma (centrada horizontalmente, cerca del final)
        const firmaWidth = 60;
        const firmaHeight = 25;
        const firmaX = (pageWidth - firmaWidth) / 2;
        const firmaY = pageHeight - 35;
        
        doc.addImage(firmaBase64, 'PNG', firmaX, firmaY, firmaWidth, firmaHeight);
        
        // Texto "Firma Autorizada GS1 Ecuador" debajo de la firma
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Firma Autorizada GS1 Ecuador', pageWidth / 2, firmaY + firmaHeight + 5, { align: 'center' });
        
      } catch (error) {
        console.warn('⚠️ Error al cargar firma:', error);
        // Si no se puede cargar la firma, solo mostrar el texto
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Firma Autorizada GS1 Ecuador', pageWidth / 2, pageHeight - 20, { align: 'center' });
      }
    }

    // Número de página en la esquina inferior derecha
    const totalPages = doc.getNumberOfPages();
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
  }

  /**
   * Convierte una imagen URL a base64
   */
  private obtenerImagenBase64(url: string): Promise<string> {
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