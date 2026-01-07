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
  let   y       = 14;   // margen superior (ligeramente menor)

  // ========= CONSTANTES DE FUENTE (MÁS PEQUEÑO) =========
  const FS_EMPRESA = 12;
  const FS_TITLE   = 12;
  const FS_META    = 8;
  const FS_TABLE   = 7;
  const FS_OBS     = 7;
  const FS_FIRMA   = 7;
  const FS_PAG     = 7;

  // Alturas de línea aproximadas para textos pequeños
  const LH_META  = 4.0;
  const LH_OBS   = 3.5;

  // ========= ENCABEZADO EMPRESA =========
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FS_EMPRESA);

  const empresaNombre = a.empresaNombre ?? '';
  if (empresaNombre) {
    doc.text(empresaNombre, marginX, y);
    y += 6;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FS_META);

  if (a.empresaRuc) {
    doc.text(`RUC: ${a.empresaRuc}`, marginX, y);
    y += 4.5;
  }

  if (a.empresaDireccion) {
    doc.text(a.empresaDireccion, marginX, y);
    y += 6;
  }

  // Línea separadora
  doc.setLineWidth(0.4);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 8;

  // ========= TÍTULO DEL REPORTE =========
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FS_TITLE);
  doc.text(` ${a.tipoAsientoDescripcion ?? ''}`, pageWidth / 2, y, { align: 'center' });
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FS_META);

  // Datos del asiento
  const fechaStr    = formatFechaCorta(a.fechatransaccion);
  const fechaIngStr = formatFechaHora(a.fechaingreso);

  y += 2;
  doc.text(
    `Comprobante        : ${a.tipdoc ?? ''} - ${a.numdoc ?? ''}`,
    marginX,
    y
  );
  y += LH_META;

  doc.text(`Fecha transacción: ${fechaStr}`, marginX, y);
  y += LH_META;

  doc.text(`Fecha ingreso       : ${fechaIngStr}`, marginX, y);
  y += 6;

  if (a.beneficiario) {
    doc.text(`Beneficiario           : ${a.beneficiario}`, marginX, y);
    y += LH_META;
  }

  y += 2;

  // ========= TABLA DETALLE =========
  // ✅ NUEVO ORDEN:
  // Local | Codigo | Cuenta Contable | Auxiliar | Nombre Auxiliar | No. Ch | No. Comp. | Debe | Haber
  const body = (a.detalles || []).map(d => [
    (d.local ?? '').toString(),
    d.codCuenta ?? '',
    d.nombreCuenta ?? '',
    d.auxiliar ?? '',
    d.nombreAuxiliar ?? '',
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
      'Nombre Auxiliar',
      'No. Ch',
      'No. Comp.',
      'Debe',
      'Haber',
    ]],
    body,

    styles: {
      fontSize: FS_TABLE,
      cellPadding: 1.0, //1.2,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [0, 82, 155],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: FS_TABLE,
      cellPadding: 1.0,//1.2,
      halign: 'center',
      valign: 'middle',
    },

    margin: { left: marginX, right: marginX },
    tableWidth: pageWidth - marginX * 2,

    // ✅ ANCHOS AJUSTADOS (suman 190mm exactos)
    columnStyles: {
      0: { cellWidth: 9,  halign: 'center' },                 // Local
      1: { cellWidth: 18, halign: 'left' },                 // Codigo
      2: { cellWidth: 45, halign: 'left' }, // Cuenta Contable (un poco menor)
      3: { cellWidth: 12, halign: 'center' }, // Auxiliar (ID) angosto
      4: { cellWidth: 37, halign: 'left' }, // Nombre Auxiliar (nuevo)
      5: { cellWidth: 10, halign: 'center' }, // No. Ch
      6: { cellWidth: 23, halign: 'left' }, // No. Comp.
      7: { cellWidth: 18, halign: 'right' }, // Debe
      8: { cellWidth: 18, halign: 'right' }, // Haber
    },

    // ✅ FOOT actualizado (ahora hay 9 columnas)
    foot: [[
      '', '', '', '', '', '', 'TOTALES',
      formatNumero2(a.totalDebe),
      formatNumero2(a.totalHaber),
    ]],
    footStyles: {
      fontStyle: 'bold',
      fillColor: [230, 230, 230],
      textColor: [0, 0, 0],
      halign: 'right',
      fontSize: FS_TABLE,
      cellPadding: 1.2,
    },

    didParseCell: (data: any) => {
      // Poner en negrita los totales numéricos en el footer (Debe/Haber)
      if (data.section === 'foot' && (data.column.index === 7 || data.column.index === 8)) {
        data.cell.styles.textColor = [0, 0, 0];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.halign = 'right';
      }
      // Alinear "TOTALES" (col 6)
      if (data.section === 'foot' && data.column.index === 6) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.halign = 'right';
      }
    },

    didDrawPage: (data: any) => {
      const pageCount   = doc.getNumberOfPages();
      const currentPage = data.pageNumber;

      doc.setFontSize(FS_PAG);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Página ${currentPage} de ${pageCount}`,
        pageWidth - marginX,
        pageHeight - 7,
        { align: 'right' }
      );
    }
  });

  // ========= OBSERVACIÓN + FIRMAS =========
  const afterTableY = (doc as any).lastAutoTable?.finalY ?? (pageHeight - 60);
  let contenidoY = afterTableY + 8;

  // Observación
  if (a.observacion) {
    const obsLabel = 'Observación: ';
    const labelWidth = doc.getTextWidth(obsLabel);
    const maxTextWidth = pageWidth - marginX * 2 - labelWidth - 2;

    const obsLines = doc.splitTextToSize(a.observacion, maxTextWidth);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FS_OBS);

    doc.text(obsLabel, marginX, contenidoY);
    doc.text(
      obsLines as string[],
      marginX + labelWidth + 1.5,
      contenidoY
    );

    contenidoY += LH_OBS + (obsLines.length - 1) * LH_OBS;
  }

  let firmaY = contenidoY + 10;

  if (firmaY > pageHeight - 50) {
    doc.addPage();
    contenidoY = 40;

    if (a.observacion) {
      const obsLabel = 'Observación: ';
      const labelWidth = doc.getTextWidth(obsLabel);
      const maxTextWidth = pageWidth - marginX * 2 - labelWidth - 2;
      const obsLines = doc.splitTextToSize(a.observacion, maxTextWidth);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(FS_OBS);

      doc.text(obsLabel, marginX, contenidoY);
      doc.text(
        obsLines as string[],
        marginX + labelWidth + 1.5,
        contenidoY
      );

      contenidoY += LH_OBS + (obsLines.length - 1) * LH_OBS;
    }

    firmaY = contenidoY + 10;
  }

  // Configuración de columnas para las firmas
  const usableWidth = pageWidth - marginX * 2;
  const colWidth    = usableWidth / 4;
  const lineWidth   = colWidth * 0.8;
  const halfLine    = lineWidth / 2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FS_FIRMA);

  const drawFirma = (colIndex: number, label1: string, label2?: string) => {
    const centerX = marginX + colWidth * (colIndex + 0.5);
    const x1 = centerX - halfLine;
    const x2 = centerX + halfLine;

    doc.setLineWidth(0.3);
    doc.line(x1, firmaY, x2, firmaY);

    doc.setFontSize(FS_FIRMA);
    doc.text(label1, centerX, firmaY + 4.5, { align: 'center' });

    if (label2 && label2.trim() !== '') {
      doc.setFontSize(FS_FIRMA);
      doc.text(label2, centerX, firmaY + 8.5, { align: 'center' });
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
    doc.setFontSize(FS_PAG);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Usuario: ${usuarioNombre}`,
      marginX,
      pageHeight - 9
    );
  }

  doc.output('dataurlnewwindow');
  const fileName = `Asiento_${a.tipdoc || ''}-${a.numdoc || ''}.pdf`;
  doc.save(fileName);
}

/** Helpers internos */

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

function formatNumero2(v: number | null | undefined): string {
  const n = Number(v ?? 0);
  if (isNaN(n)) return '0.00';

  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
