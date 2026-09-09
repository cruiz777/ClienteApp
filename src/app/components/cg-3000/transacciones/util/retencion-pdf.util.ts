// retencion-pdf.util.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RetencionesImpresionResponse } from 'src/app/interfaces/responses/retenciones-impresion-response';

export class RetencionPdfUtil {

  // ✅ nuevo parámetro opcional: logo override (base64 puro o dataUrl)
  static generarPdfRetencion(
    m: RetencionesImpresionResponse,
    logoOverrideBase64OrDataUrl?: string | null
  ): void {
    const doc = new jsPDF('p', 'mm', 'a4');
    RetencionPdfUtil.drawWatermark(doc, 'DOCUMENTO NO VÁLIDO'); ///marca de agua
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 12;

    const fmtDate = (v: any) => {
      const d = v instanceof Date ? v : new Date(v);
      if (isNaN(d.getTime())) return '';
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yy = d.getFullYear();
      return `${mm}/${dd}/${yy}`;
    };

    const safe = (s: any) => String(s ?? '').trim();

    const boxW = 80;
    const boxH = 52;
    const boxX = pageW - margin - boxW;
    const boxY = 12;

    const leftX = margin;
    const leftMaxW = (boxX - leftX) - 6;

    const topY = 12;

    // ✅ Logo: usa primero el override; si no, usa el del reporte
    const logo = String(logoOverrideBase64OrDataUrl ?? (m as any).logoBase64 ?? '').trim();
    RetencionPdfUtil.tryAddLogo(doc, logo, leftX, topY, 26, 18);

    doc.setFont('times', 'bold');
    doc.setFontSize(12);

    const empresaNombre = safe((m as any).empresaNombre) || 'EMPRESA';
    const nombreLines = doc.splitTextToSize(empresaNombre, leftMaxW) as string[];

    let y = topY + 24;
    doc.text(nombreLines as any, leftX, y);
    y += (nombreLines.length * 5);

    doc.setFont('times', 'normal');
    doc.setFontSize(9);

    const empresaLines: string[] = [
      `RUC : ${safe((m as any).empresaRuc)}`,
      `DIRECCION : ${safe((m as any).empresaDireccion)}`,
      `TELEFONO : ${safe((m as any).empresaTelefono)}`,
    ];

    if (safe((m as any).empresaContribuyenteEspecial)) {
      empresaLines.push(`Contribuyente Especial # ${safe((m as any).empresaContribuyenteEspecial)}`);
    }
    if (safe((m as any).empresaObligadoContabilidad)) {
      empresaLines.push(`Obligado a llevar contabilidad : ${safe((m as any).empresaObligadoContabilidad)}`);
    }

    //if (safe((m as any).empresaLeyenda)) {
    //  empresaLines.push(safe((m as any).empresaLeyenda));
    //}

    for (const line of empresaLines) {
      const wrapped = doc.splitTextToSize(line, leftMaxW) as string[];
      doc.text(wrapped as any, leftX, y);
      y += (wrapped.length * 4);
    }

    doc.setDrawColor(0);
    doc.rect(boxX, boxY, boxW, boxH);

    doc.line(boxX, boxY + 12, boxX + boxW, boxY + 12);
    doc.line(boxX, boxY + 28, boxX + boxW, boxY + 28);
    doc.line(boxX, boxY + 40, boxX + boxW, boxY + 40);

    doc.setFont('times', 'bold');
    doc.setFontSize(9);
    doc.text('COMPROBANTE DE RETENCION', boxX + boxW / 2, boxY + 6, { align: 'center' });
    doc.text(safe((m as any).numeroComprobanteRetencion), boxX + boxW / 2, boxY + 10.5, { align: 'center' });

    doc.text('AUTORIZACION', boxX + boxW / 2, boxY + 18, { align: 'center' });

    doc.setFont('times', 'normal');
    doc.setFontSize(7.5);
    const authLines = doc.splitTextToSize(safe((m as any).autorizacion), boxW - 6);
    doc.text(authLines as any, boxX + boxW / 2, boxY + 22, { align: 'center' });

    doc.setFont('times', 'bold');
    doc.setFontSize(9);
    doc.text('AMBIENTE', boxX + boxW / 2, boxY + 34, { align: 'center' });
    doc.text(safe((m as any).ambiente || 'PRODUCCION'), boxX + boxW / 2, boxY + 38, { align: 'center' });

    doc.text('EMISION', boxX + boxW / 2, boxY + 46, { align: 'center' });
    doc.text(safe((m as any).emision || 'NORMAL'), boxX + boxW / 2, boxY + 50, { align: 'center' });

    const clientY = Math.max(y + 6, boxY + boxH + 8);

    doc.setFont('times', 'normal');
    doc.setFontSize(9);

    doc.text('CLIENTE', leftX, clientY);
    doc.text('RUC', leftX, clientY + 5);
    doc.text('DIRECCION', leftX, clientY + 10);
    doc.text('No. Asiento', leftX, clientY + 15);

    const clienteX = leftX + 22;
    const clienteW = (pageW - margin) - clienteX - 80;

    doc.text(doc.splitTextToSize(safe((m as any).clienteNombre), clienteW) as any, clienteX, clientY);
    doc.text(doc.splitTextToSize(safe((m as any).clienteRucCi), clienteW) as any, clienteX, clientY + 5);
    doc.text(doc.splitTextToSize(safe((m as any).clienteDireccion), clienteW) as any, clienteX, clientY + 10);
    doc.text(doc.splitTextToSize(safe((m as any).noAsiento), clienteW) as any, clienteX, clientY + 15);

    const rightInfoX = pageW - margin - 70;
    doc.text('FECHA EMISION', rightInfoX, clientY);
    doc.text('TELEFONO', rightInfoX, clientY + 5);
    doc.text('EMAIL', rightInfoX, clientY + 10);

    doc.text(fmtDate((m as any).fechaEmision), pageW - margin, clientY, { align: 'right' });
    doc.text(safe((m as any).clienteTelefono), pageW - margin, clientY + 5, { align: 'right' });
    doc.text(safe((m as any).clienteEmail), pageW - margin, clientY + 10, { align: 'right' });

    const tableStartY = clientY + 22;
    const tableLeft = margin;
    const tableRight = margin;

    const body = ((m as any).detalles ?? []).map((d: any) => ([
      safe(d.comprobante || 'Factura'),
      safe(d.numero),
      fmtDate(d.fecha),
      RetencionPdfUtil.fmt2(d.baseImponible),
      safe(d.impuesto),
      safe(d.codigo),
      RetencionPdfUtil.fmt2(d.porcentaje),
      RetencionPdfUtil.fmt2(d.valor),
    ]));

    autoTable(doc, {
      startY: tableStartY,
      margin: { left: tableLeft, right: tableRight },
      theme: 'grid',
      tableWidth: 'auto',
      styles: {
        font: 'times',
        fontSize: 9,
        cellPadding: 2,
        lineWidth: 0.2,
        valign: 'middle',
      },
      headStyles: {
        fontStyle: 'bold',
        fillColor: [0, 92, 153],
        textColor: [255, 255, 255],
        halign: 'center',
        valign: 'middle',
      },
      bodyStyles: { fontStyle: 'normal' },
      head: [[
        'COMPROBANTE','NUMERO','FECHA','BASE IMPONIBLE','IMPUESTO','CODIGO','PORCENTAJE','VALOR',
      ]],
      body,
      columnStyles: {
        0: { cellWidth: 30, halign: 'left' },
        1: { cellWidth: 20, halign: 'left' },
        2: { cellWidth: 20, halign: 'left' },
        3: { cellWidth: 24, halign: 'right' },
        4: { cellWidth: 22, halign: 'left' },
        5: { cellWidth: 18, halign: 'left' },
        6: { cellWidth: 28, halign: 'right' },
        7: { cellWidth: 18, halign: 'right' },
      },

      didDrawPage: () => {
          RetencionPdfUtil.drawWatermark(doc, 'DOCUMENTO NO VÁLIDO');
      }

    });

    const lastY = (doc as any).lastAutoTable?.finalY ?? (tableStartY + 20);

    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.text('TOTAL:', pageW - tableRight - 35, lastY + 12, { align: 'right' });
    doc.text(RetencionPdfUtil.fmt2((m as any).total), pageW - tableRight, lastY + 12, { align: 'right' });

    const blobUrl = doc.output('bloburl');
    window.open(blobUrl, '_blank');
  }

  private static fmt2(v: any): string {
    const n = Number(v ?? 0);
    return isNaN(n) ? '0.00' : n.toFixed(2);
  }

  /*
  private static tryAddLogo(
    doc: jsPDF,
    base64OrDataUrl: string | null | undefined,
    x: number,
    y: number,
    w: number,
    h: number
  ): boolean {
    try {
      const s = String(base64OrDataUrl ?? '').trim();
      if (!s) return false;

      const isDataUrl = s.startsWith('data:image');
      const dataUrl = isDataUrl ? s : `data:image/png;base64,${s}`;

      // ✅ soporte jpg/jpeg si algún día llega así
      const isJpg = dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg');
      doc.addImage(dataUrl, isJpg ? 'JPEG' : 'PNG', x, y, w, h);
      return true;
    } catch {
      return false;
    }
  }
  */

  private static tryAddLogo(
  doc: jsPDF,
  base64OrDataUrl: string | null | undefined,
  x: number,
  y: number,
  w: number,
  h: number
  ): boolean {
    try {
      const s = String(base64OrDataUrl ?? '').trim();

      if (!s) {
        console.warn('[PDF] Logo vacío: no se insertó.');
        return false;
      }

      const isDataUrl = s.startsWith('data:image');
      const dataUrl = isDataUrl ? s : `data:image/png;base64,${s}`;

      let fmt: 'PNG' | 'JPEG' = 'PNG';
      if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) {
        fmt = 'JPEG';
      }

      doc.addImage(dataUrl, fmt, x, y, w, h);
      return true;
    } catch (e) {
      console.warn('[PDF] addImage falló (logo).', e);
      return false;
    }
  }

  //marca de agua
  private static drawWatermark(doc: jsPDF, text: string): void {
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // Guardar estado para no afectar el resto del documento
    (doc as any).saveGraphicsState?.();

    // Opacidad baja si está disponible (depende de versión de jsPDF)
    const anyDoc: any = doc as any;
    if (anyDoc.GState) {
      const gState = new anyDoc.GState({ opacity: 0.12 });
      anyDoc.setGState(gState);
    }

    doc.setFont('times', 'bold');
    doc.setFontSize(55);
    doc.setTextColor(160); // gris

    // Texto al centro y diagonal
    doc.text(text, pageW / 2, pageH / 2, { align: 'center', angle: 35 });

    // Restaurar estado
    (doc as any).restoreGraphicsState?.();

    // Si no existe save/restoreGraphicsState, al menos reestablecemos color para no afectar
    doc.setTextColor(0);
    doc.setFontSize(9);
  }

}
