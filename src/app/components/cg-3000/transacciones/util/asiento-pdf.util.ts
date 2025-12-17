// src/app/utils/asiento-pdf.util.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AsientoImpresion } from 'src/app/interfaces/responses/asiento-impresion.model';

/**
 * Genera el PDF del asiento contable.
 * @param a              Datos del asiento
 * @param usuarioNombre  Nombre del usuario que imprime (opcional)
 */
export function generarPdfAsiento(
  a: AsientoImpresion,
  usuarioNombre?: string
): void {
  // A4 vertical en milímetros
  const doc = new jsPDF('p', 'mm', 'a4');

  const pageWidth  = doc.internal.pageSize.getWidth();   // ~210 mm
  const pageHeight = doc.internal.pageSize.getHeight();  // ~297 mm

  const marginX = 10;   // márgenes pequeños
  let   y       = 15;   // margen superior

  // ========= ENCABEZADO EMPRESA =========
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);

  const empresaNombre = a.empresaNombre ?? '';
  if (empresaNombre) {
    doc.text(empresaNombre, marginX, y);
    y += 7;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  if (a.empresaRuc) {
    doc.text(`RUC: ${a.empresaRuc}`, marginX, y);
    y += 5;
  }

  if (a.empresaDireccion) {
    doc.text(a.empresaDireccion, marginX, y);
    y += 7;
  }

  // Línea separadora
  doc.setLineWidth(0.4);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 10;

  // ========= TÍTULO DEL REPORTE =========
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  //doc.text('ASIENTO CONTABLE', pageWidth / 2, y, { align: 'center' });
  doc.text(` ${a.tipoAsientoDescripcion ?? ''}`,pageWidth / 2, y, { align: 'center' });
  y += 5;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Datos del asiento
  const fechaStr    = formatFechaCorta(a.fechatransaccion);
  const fechaIngStr = formatFechaHora(a.fechaingreso);

  //doc.text(`Tipo de asiento     : ${a.tipoAsientoDescripcion ?? ''}`, marginX, y);

  y += 5;
  doc.text(
    `Comprobante        : ${a.tipdoc ?? ''} - ${a.numdoc ?? ''}`,
    marginX,
    y
  );
  y += 5;
  doc.text(`Fecha transacción: ${fechaStr}`, marginX, y);
  y += 5;
  doc.text(`Fecha ingreso       : ${fechaIngStr}`, marginX, y);
  y += 7;

  if (a.beneficiario) {
    doc.text(`Beneficiario           : ${a.beneficiario}`, marginX, y);
    y += 5;
  }

  y += 3;

  // ========= TABLA DETALLE =========
  const body = (a.detalles || []).map(d => [
    (d.local ?? '').toString(),
    d.codCuenta ?? '',
    d.nombreCuenta ?? '',
    d.auxiliar ?? '',
    d.numeroCheque ?? '',
    d.numeroComprobante ?? '',
    formatNumero2(d.debe),
    formatNumero2(d.haber),
  ]);

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    head: [[
      'Local',
      'Codigo',
      'Cuenta Contable',
      'Auxiliar',
      'No. Ch',
      'No. Comp.',
      'Debe',
      'Haber',
    ]],
    body,
    styles: {
      fontSize: 8,
      cellPadding: 1.5,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [0, 82, 155],
      textColor: 255,
      fontStyle: 'bold',
    },
    margin: { left: marginX, right: marginX },
    tableWidth: pageWidth - marginX * 2,
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 18 },
      2: { cellWidth: 60 },
      3: { cellWidth: 20 },
      4: { cellWidth: 12 },
      5: { cellWidth: 28 },
      6: { cellWidth: 22, halign: 'right' },
      7: { cellWidth: 22, halign: 'right' },
    },
    foot: [[
      '',
      '',
      '',
      '',
      '',
      'TOTALES',
      formatNumero2(a.totalDebe),
      formatNumero2(a.totalHaber),
    ]],
    footStyles: {
      fontStyle: 'bold',
      fillColor: [230, 230, 230],
      textColor: [0, 0, 0],
      halign: 'right',
    },
    didParseCell: (data: any) => {
      if (
        data.section === 'foot' &&
        (data.column.index === 6 || data.column.index === 7)
      ) {
        data.cell.styles.textColor = [0, 0, 0];
        data.cell.styles.fontStyle = 'bold';
      }
    },
    didDrawPage: (data: any) => {
      const pageCount   = doc.getNumberOfPages();
      const currentPage = data.pageNumber;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Página ${currentPage} de ${pageCount}`,
        pageWidth - marginX,
        pageHeight - 8,
        { align: 'right' }
      );
    }
  });

  // ========= OBSERVACIÓN + FIRMAS =========
  const afterTableY = (doc as any).lastAutoTable?.finalY ?? (pageHeight - 60);
  let contenidoY = afterTableY + 10;

  // Observación
  if (a.observacion) {
    const obsLabel = 'Observación: ';
    const labelWidth = doc.getTextWidth(obsLabel);
    const maxTextWidth = pageWidth - marginX * 2 - labelWidth - 2;

    const obsLines = doc.splitTextToSize(a.observacion, maxTextWidth);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    doc.text(obsLabel, marginX, contenidoY);
    doc.text(
      obsLines as string[],
      marginX + labelWidth + 1.5,
      contenidoY
    );

    contenidoY += 4 + (obsLines.length - 1) * 4;
  }

  let firmaY = contenidoY + 12;

  if (firmaY > pageHeight - 50) {
    doc.addPage();
    contenidoY = 40;

    if (a.observacion) {
      const obsLabel = 'Observación: ';
      const labelWidth = doc.getTextWidth(obsLabel);
      const maxTextWidth = pageWidth - marginX * 2 - labelWidth - 2;
      const obsLines = doc.splitTextToSize(a.observacion, maxTextWidth);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      doc.text(obsLabel, marginX, contenidoY);
      doc.text(
        obsLines as string[],
        marginX + labelWidth + 1.5,
        contenidoY
      );

      contenidoY += 4 + (obsLines.length - 1) * 4;
    }

    firmaY = contenidoY + 12;
  }

  // Configuración de columnas para las firmas
  const usableWidth = pageWidth - marginX * 2;
  const colWidth    = usableWidth / 4;
  const lineWidth   = colWidth * 0.8;
  const halfLine    = lineWidth / 2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  const drawFirma = (colIndex: number, label1: string, label2?: string) => {
    const centerX = marginX + colWidth * (colIndex + 0.5);
    const x1 = centerX - halfLine;
    const x2 = centerX + halfLine;

    doc.setLineWidth(0.3);
    doc.line(x1, firmaY, x2, firmaY);

    doc.setFontSize(8);
    doc.text(label1, centerX, firmaY + 5, { align: 'center' });

    if (label2 && label2.trim() !== '') {
      doc.setFontSize(8);
      doc.text(label2, centerX, firmaY + 9, { align: 'center' });
    }
  };

  const usuario = (usuarioNombre || '').toString().trim().toUpperCase();
  drawFirma(0, 'CONTABILIZADO', usuario);
  drawFirma(1, 'REVISADO POR');
  drawFirma(2, 'AUTORIZADO POR');

  const reciboNombre = (a.beneficiario || a.empresaNombre || '').toString().trim();
  drawFirma(3, 'RECIBÍ CONFORME', reciboNombre);

  // Pie con usuario
  if (usuarioNombre) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Usuario: ${usuarioNombre}`,
      marginX,
      pageHeight - 10
    );
  }

  doc.output('dataurlnewwindow');
  const fileName = `Asiento_${a.tipdoc || ''}-${a.numdoc || ''}.pdf`;
  doc.save(fileName);
}

/** Helpers internos (ya no dependen de un componente) */

function formatFechaCorta(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso.toString().substring(0, 10);

  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatFechaHora(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso.toString();

  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();

  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');

  return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;
}

/*
function formatNumero2(v: number | null | undefined): string {
  const n = Number(v || 0);
  return n.toLocaleString('es-EC', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
*/
function formatNumero2(v: number | null | undefined): string {
  const n = Number(v ?? 0);
  if (isNaN(n)) {
    return '0.00';
  }

  // Formato tipo 1,704.00 – estilo “en-US”
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
