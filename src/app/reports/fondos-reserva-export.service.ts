import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSXStyle from 'xlsx-js-style';
import { FondosReservaResponse } from 'src/app/interfaces/responses/fondos-reserva-response';

export interface FondosReservaExportConfig {
  periodoDesde: string;   // '01/01/2025'
  periodoHasta: string;   // '30/06/2026'
  periodo:      string;   // '2026'
  empresa:      string;
  empleados:    FondosReservaResponse[];
}

@Injectable({ providedIn: 'root' })
export class FondosReservaExportService {

  // ─── PDF DETALLE ────────────────────────────────────────────────
  exportarPdfDetalle(config: FondosReservaExportConfig): void {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    this.agregarEncabezado(doc, config);

    const rows = config.empleados.map((e, i) => [
      i + 1,
      e.nombreEmpleado   ?? '',
      e.ocupacion        ?? '',
      e.genero === 'MASCULINO'  ? '1' : '',
      e.genero === 'FEMENINO'   ? '1' : '',
      e.dias             ?? 0,
      this.fmt(e.sueldoAcumulado),
      this.fmt(e.valorFR),
      this.fmt(e.pagadoNomina),
      this.fmt(e.descuento),
      this.fmt(e.retJudicial),
      this.fmt(e.liquidoARecibir)
    ]);

    autoTable(doc, {
      startY: 38,
      showFoot: 'lastPage' as any,
      head: [[
        { content: 'No.',                              rowSpan: 2 },
        { content: 'NOMBRES',                          rowSpan: 2 },
        { content: 'OCUPACIÓN',                        rowSpan: 2 },
        { content: 'SEXO',                             colSpan: 2 },
        { content: 'TIEMPO\nTRABAJADO\nPERIODO',       rowSpan: 2 },
        { content: 'SUELDO\nACUMULADO',                rowSpan: 2 },
        { content: 'VALOR PAGADO\nFONDO DE\nRESERVA',  rowSpan: 2 },
        { content: 'PAGADO EN\nNÓMINA',                rowSpan: 2 },
        { content: 'DESCUENTO',                        rowSpan: 2 },
        { content: 'RETENCIÓN\nJUDICIAL',              rowSpan: 2 },
        { content: 'LÍQUIDO A\nRECIBIR',               rowSpan: 2 }
      ], [
        'H', 'M'
      ]],
      body: rows,
      foot: [[
        { content: '',         colSpan: 6 },
        { content: this.fmt(config.empleados.reduce((s, e) => s + (e.sueldoAcumulado  ?? 0), 0)), styles: { fontStyle: 'bold' } },
        { content: this.fmt(config.empleados.reduce((s, e) => s + (e.valorFR          ?? 0), 0)), styles: { fontStyle: 'bold' } },
        { content: this.fmt(config.empleados.reduce((s, e) => s + (e.pagadoNomina     ?? 0), 0)), styles: { fontStyle: 'bold' } },
        { content: this.fmt(config.empleados.reduce((s, e) => s + (e.descuento        ?? 0), 0)), styles: { fontStyle: 'bold' } },
        { content: this.fmt(config.empleados.reduce((s, e) => s + (e.retJudicial      ?? 0), 0)), styles: { fontStyle: 'bold' } },
        { content: this.fmt(config.empleados.reduce((s, e) => s + (e.liquidoARecibir  ?? 0), 0)), styles: { fontStyle: 'bold' } }
      ]],
      styles:     { fontSize: 7, cellPadding: 1.5 },
      headStyles: {
        fillColor: [255, 255, 255], textColor: [0, 0, 0],
        fontStyle: 'bold', halign: 'center',
        lineWidth: 0.2, lineColor: [0, 0, 0]
      },
      footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0] },
      bodyStyles: { lineWidth: 0.1, lineColor: [180, 180, 180] },
      columnStyles: {
        0:  { halign: 'center', cellWidth: 10  },
        1:  { cellWidth: 55 },
        2:  { cellWidth: 35 },
        3:  { halign: 'center', cellWidth: 8  },
        4:  { halign: 'center', cellWidth: 8  },
        5:  { halign: 'right',  cellWidth: 16 },
        6:  { halign: 'right',  cellWidth: 22 },
        7:  { halign: 'right',  cellWidth: 22 },
        8:  { halign: 'right',  cellWidth: 20 },
        9:  { halign: 'right',  cellWidth: 20 },
        10: { halign: 'right',  cellWidth: 20 },
        11: { halign: 'right',  cellWidth: 22 }
      }
    });

    doc.save(`detalle_fondos_reserva_${config.periodo}.pdf`);
  }

  // ─── PDF RESUMEN ────────────────────────────────────────────────
  exportarPdfResumen(config: FondosReservaExportConfig): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('RESUMEN GENERAL - FONDOS DE RESERVA', 105, 20, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`PERIODO DESDE : ${config.periodoDesde}    HASTA : ${config.periodoHasta}`, 15, 30);
    doc.text(`Empresa: ${config.empresa}`, 15, 37);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setDrawColor(0);
    doc.rect(15, 42, 100, 8);
    doc.text('FONDOS DE RESERVA', 65, 47.5, { align: 'center' });

    const mujeres = config.empleados.filter(e => e.genero === 'FEMENINO');
    const hombres = config.empleados.filter(e => e.genero === 'MASCULINO');

    const totalMujeres   = mujeres.reduce((s, e) => s + (e.liquidoARecibir ?? 0), 0);
    const totalHombres   = hombres.reduce((s, e) => s + (e.liquidoARecibir ?? 0), 0);
    const totalEmpleados = mujeres.length + hombres.length;
    const totalPagado    = totalMujeres + totalHombres;

    autoTable(doc, {
      startY: 54,
      head: [['SEXO', 'No. EMPLEADOS', 'TOTAL INGRESOS', 'TOTAL PAGADO']],
      body: [
        ['MUJERES', mujeres.length, '0.00', this.fmt(totalMujeres)],
        ['HOMBRES', hombres.length, '0.00', this.fmt(totalHombres)]
      ],
      foot: [['TOTAL :', totalEmpleados, '0.00', this.fmt(totalPagado)]],
      styles:     { fontSize: 9, cellPadding: 3 },
      headStyles: {
        fillColor: [255, 255, 255], textColor: [0, 0, 0],
        fontStyle: 'bold', halign: 'center',
        lineWidth: 0.3, lineColor: [0, 0, 0]
      },
      footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
      bodyStyles: { lineWidth: 0.2, lineColor: [0, 0, 0] },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { halign: 'center', cellWidth: 40 },
        2: { halign: 'right',  cellWidth: 40 },
        3: { halign: 'right',  cellWidth: 40 }
      }
    });

    doc.save(`resumen_fondos_reserva_${config.periodo}.pdf`);
  }

  // ─── EXCEL DETALLE ───────────────────────────────────────────────
  exportarExcelDetalle(config: FondosReservaExportConfig): void {
    const wb = XLSXStyle.utils.book_new();
    const ws: any = {};

    // ─── Estilos — idénticos a décimos ───
    const sTitulo = {
      font: { bold: true, sz: 12, color: { rgb: '1F3864' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    };
    const sSubtitulo = {
      font: { bold: true, sz: 10, color: { rgb: '1F3864' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    };
    const sInfo = {
      font: { sz: 9, italic: true, color: { rgb: '444444' } },
      alignment: { horizontal: 'left' }
    };
    const sHeader = {
      font: { bold: true, sz: 9, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1F3864' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        top:    { style: 'thin', color: { rgb: 'FFFFFF' } },
        bottom: { style: 'thin', color: { rgb: 'FFFFFF' } },
        left:   { style: 'thin', color: { rgb: 'FFFFFF' } },
        right:  { style: 'thin', color: { rgb: 'FFFFFF' } }
      }
    };
    const sRowPar = {
      font: { sz: 8 },
      fill: { fgColor: { rgb: 'EEF2FF' } },
      border: {
        top:    { style: 'hair', color: { rgb: 'CCCCCC' } },
        bottom: { style: 'hair', color: { rgb: 'CCCCCC' } },
        left:   { style: 'hair', color: { rgb: 'CCCCCC' } },
        right:  { style: 'hair', color: { rgb: 'CCCCCC' } }
      }
    };
    const sRowImpar = {
      font: { sz: 8 },
      fill: { fgColor: { rgb: 'FFFFFF' } },
      border: {
        top:    { style: 'hair', color: { rgb: 'CCCCCC' } },
        bottom: { style: 'hair', color: { rgb: 'CCCCCC' } },
        left:   { style: 'hair', color: { rgb: 'CCCCCC' } },
        right:  { style: 'hair', color: { rgb: 'CCCCCC' } }
      }
    };
    const sNumPar   = { ...sRowPar,   alignment: { horizontal: 'right' }, numFmt: '#,##0.00' };
    const sNumImpar = { ...sRowImpar, alignment: { horizontal: 'right' }, numFmt: '#,##0.00' };
    const sTotal = {
      font: { bold: true, sz: 9, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '2E4057' } },
      alignment: { horizontal: 'right' },
      border: {
        top:    { style: 'medium', color: { rgb: '000000' } },
        bottom: { style: 'medium', color: { rgb: '000000' } },
        left:   { style: 'thin',   color: { rgb: '000000' } },
        right:  { style: 'thin',   color: { rgb: '000000' } }
      },
      numFmt: '#,##0.00'
    };
    const sTotalLabel = { ...sTotal, alignment: { horizontal: 'center' } };

    const cols = ['A','B','C','D','E','F','G','H','I','J','K','L'];

    // ─── Encabezado ───
    ws['A1'] = { v: 'INFORMACIÓN INDIVIDUAL SOBRE EL PAGO DE FONDOS DE RESERVA', t: 's', s: sTitulo };
    ws['A2'] = { v: config.empresa,                                                t: 's', s: sSubtitulo };
    ws['A3'] = { v: `Empresa: ${config.empresa}`,                                  t: 's', s: sInfo };
    ws['A4'] = { v: `Período: ${config.periodoDesde} — ${config.periodoHasta}`,    t: 's', s: sInfo };

    // ─── Headers ───
    const headers = [
      'No.', 'Nombres', 'Ocupación', 'H', 'M',
      'Tiempo\nTrabajado', 'Sueldo\nAcumulado', 'Valor Fondo\nde Reserva',
      'Pagado\nNómina', 'Descuento', 'Ret.\nJudicial', 'Líquido a\nRecibir'
    ];
    headers.forEach((h, i) => {
      ws[`${cols[i]}6`] = { v: h, t: 's', s: sHeader };
    });

    // ─── Datos ───
    config.empleados.forEach((e, idx) => {
      const row  = idx + 7;
      const sPar = idx % 2 === 0;
      const sR   = sPar ? sRowPar  : sRowImpar;
      const sN   = sPar ? sNumPar  : sNumImpar;

      ws[`A${row}`] = { v: idx + 1,                                       t: 'n', s: { ...sR, alignment: { horizontal: 'center' } } };
      ws[`B${row}`] = { v: e.nombreEmpleado ?? '',                         t: 's', s: sR };
      ws[`C${row}`] = { v: e.ocupacion      ?? '',                         t: 's', s: sR };
      ws[`D${row}`] = { v: e.genero === 'MASCULINO' ? 1 : '',             t: e.genero === 'MASCULINO' ? 'n' : 's', s: { ...sR, alignment: { horizontal: 'center' } } };
      ws[`E${row}`] = { v: e.genero === 'FEMENINO'  ? 1 : '',             t: e.genero === 'FEMENINO'  ? 'n' : 's', s: { ...sR, alignment: { horizontal: 'center' } } };
      ws[`F${row}`] = { v: e.dias             ?? 0,                        t: 'n', s: { ...sR, alignment: { horizontal: 'right' } } };
      ws[`G${row}`] = { v: e.sueldoAcumulado  ?? 0,                        t: 'n', s: sN };
      ws[`H${row}`] = { v: e.valorFR          ?? 0,                        t: 'n', s: sN };
      ws[`I${row}`] = { v: e.pagadoNomina     ?? 0,                        t: 'n', s: sN };
      ws[`J${row}`] = { v: e.descuento        ?? 0,                        t: 'n', s: sN };
      ws[`K${row}`] = { v: e.retJudicial      ?? 0,                        t: 'n', s: sN };
      ws[`L${row}`] = { v: e.liquidoARecibir  ?? 0,                        t: 'n', s: sN };
    });

    // ─── Totales ───
    const totalRow = config.empleados.length + 7;
    ['A','B','C','D','E'].forEach(c => {
      ws[`${c}${totalRow}`] = { v: '', t: 's', s: sTotalLabel };
    });
    ws[`F${totalRow}`] = { v: 'TOTALES', t: 's', s: sTotalLabel };
    ws[`G${totalRow}`] = { v: config.empleados.reduce((s, e) => s + (e.sueldoAcumulado ?? 0), 0), t: 'n', s: sTotal };
    ws[`H${totalRow}`] = { v: config.empleados.reduce((s, e) => s + (e.valorFR         ?? 0), 0), t: 'n', s: sTotal };
    ws[`I${totalRow}`] = { v: config.empleados.reduce((s, e) => s + (e.pagadoNomina    ?? 0), 0), t: 'n', s: sTotal };
    ws[`J${totalRow}`] = { v: config.empleados.reduce((s, e) => s + (e.descuento       ?? 0), 0), t: 'n', s: sTotal };
    ws[`K${totalRow}`] = { v: config.empleados.reduce((s, e) => s + (e.retJudicial     ?? 0), 0), t: 'n', s: sTotal };
    ws[`L${totalRow}`] = { v: config.empleados.reduce((s, e) => s + (e.liquidoARecibir ?? 0), 0), t: 'n', s: sTotal };

    // ─── Ancho columnas ───
    ws['!cols'] = [
      { wch: 6  }, { wch: 38 }, { wch: 25 },
      { wch: 5  }, { wch: 5  }, { wch: 10 },
      { wch: 16 }, { wch: 16 }, { wch: 14 },
      { wch: 14 }, { wch: 14 }, { wch: 16 }
    ];

    ws['!rows'] = [
      { hpt: 20 }, { hpt: 20 }, { hpt: 16 },
      { hpt: 16 }, { hpt: 6  }, { hpt: 30 }
    ];

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 11 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 11 } }
    ];

    ws['!ref'] = `A1:L${totalRow}`;

    XLSXStyle.utils.book_append_sheet(wb, ws, 'Detalle');
    XLSXStyle.writeFile(wb, `detalle_fondos_reserva_${config.periodo}.xlsx`);
  }

  // ─── EXCEL RESUMEN ───────────────────────────────────────────────
  exportarExcelResumen(config: FondosReservaExportConfig): void {
    const wb = XLSXStyle.utils.book_new();
    const ws: any = {};

    const mujeres      = config.empleados.filter(e => e.genero === 'FEMENINO');
    const hombres      = config.empleados.filter(e => e.genero === 'MASCULINO');
    const totalMujeres = mujeres.reduce((s, e) => s + (e.liquidoARecibir ?? 0), 0);
    const totalHombres = hombres.reduce((s, e) => s + (e.liquidoARecibir ?? 0), 0);

    // ─── Estilos — idénticos a décimos ───
    const sTitulo = {
      font: { bold: true, sz: 13, color: { rgb: '1F3864' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    };
    const sInfo = {
      font: { sz: 9, color: { rgb: '444444' } },
      alignment: { horizontal: 'left' }
    };
    const sTipoNom = {
      font: { bold: true, sz: 10, color: { rgb: '1F3864' } },
      fill: { fgColor: { rgb: 'D9E1F2' } },
      alignment: { horizontal: 'center' },
      border: {
        top:    { style: 'medium', color: { rgb: '1F3864' } },
        bottom: { style: 'medium', color: { rgb: '1F3864' } },
        left:   { style: 'medium', color: { rgb: '1F3864' } },
        right:  { style: 'medium', color: { rgb: '1F3864' } }
      }
    };
    const sHeader = {
      font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1F3864' } },
      alignment: { horizontal: 'center' },
      border: {
        top:    { style: 'thin', color: { rgb: 'FFFFFF' } },
        bottom: { style: 'thin', color: { rgb: 'FFFFFF' } },
        left:   { style: 'thin', color: { rgb: 'FFFFFF' } },
        right:  { style: 'thin', color: { rgb: 'FFFFFF' } }
      }
    };
    const sRowMuj = {
      font: { sz: 10 }, fill: { fgColor: { rgb: 'FCE4EC' } },
      alignment: { horizontal: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'CCCCCC' } }, bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
        left: { style: 'thin', color: { rgb: 'CCCCCC' } }, right: { style: 'thin', color: { rgb: 'CCCCCC' } }
      }
    };
    const sRowHom = {
      font: { sz: 10 }, fill: { fgColor: { rgb: 'E3F2FD' } },
      alignment: { horizontal: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'CCCCCC' } }, bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
        left: { style: 'thin', color: { rgb: 'CCCCCC' } }, right: { style: 'thin', color: { rgb: 'CCCCCC' } }
      }
    };
    const sTotal = {
      font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '2E4057' } },
      alignment: { horizontal: 'center' },
      border: {
        top: { style: 'medium', color: { rgb: '000000' } }, bottom: { style: 'medium', color: { rgb: '000000' } },
        left: { style: 'thin',  color: { rgb: '000000' } }, right: { style: 'thin',  color: { rgb: '000000' } }
      },
      numFmt: '#,##0.00'
    };

    ws['A1'] = { v: 'RESUMEN GENERAL - FONDOS DE RESERVA',                      t: 's', s: sTitulo };
    ws['A2'] = { v: `PERIODO DESDE: ${config.periodoDesde}  HASTA: ${config.periodoHasta}`, t: 's', s: sInfo };
    ws['A3'] = { v: `Empresa: ${config.empresa}`,                                t: 's', s: sInfo };
    ws['A4'] = { v: 'FONDOS DE RESERVA',                                         t: 's', s: sTipoNom };

    ws['A6'] = { v: 'SEXO',           t: 's', s: sHeader };
    ws['B6'] = { v: 'No. EMPLEADOS',  t: 's', s: sHeader };
    ws['C6'] = { v: 'TOTAL INGRESOS', t: 's', s: sHeader };
    ws['D6'] = { v: 'TOTAL PAGADO',   t: 's', s: sHeader };

    ws['A7'] = { v: 'MUJERES',      t: 's', s: sRowMuj };
    ws['B7'] = { v: mujeres.length, t: 'n', s: sRowMuj };
    ws['C7'] = { v: 0,              t: 'n', s: { ...sRowMuj, numFmt: '#,##0.00' } };
    ws['D7'] = { v: totalMujeres,   t: 'n', s: { ...sRowMuj, numFmt: '#,##0.00' } };

    ws['A8'] = { v: 'HOMBRES',      t: 's', s: sRowHom };
    ws['B8'] = { v: hombres.length, t: 'n', s: sRowHom };
    ws['C8'] = { v: 0,              t: 'n', s: { ...sRowHom, numFmt: '#,##0.00' } };
    ws['D8'] = { v: totalHombres,   t: 'n', s: { ...sRowHom, numFmt: '#,##0.00' } };

    ws['A9'] = { v: 'TOTAL:',                        t: 's', s: sTotal };
    ws['B9'] = { v: mujeres.length + hombres.length, t: 'n', s: sTotal };
    ws['C9'] = { v: 0,                               t: 'n', s: sTotal };
    ws['D9'] = { v: totalMujeres + totalHombres,      t: 'n', s: sTotal };

    ws['!cols']   = [{ wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
    ws['!rows']   = [{ hpt: 24 }, { hpt: 16 }, { hpt: 16 }, { hpt: 20 }, { hpt: 6 }, { hpt: 20 }];
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 3 } }
    ];
    ws['!ref'] = 'A1:D9';

    XLSXStyle.utils.book_append_sheet(wb, ws, 'Resumen');
    XLSXStyle.writeFile(wb, `resumen_fondos_reserva_${config.periodo}.xlsx`);
  }

  // ─── HELPER ─────────────────────────────────────────────────────
  private fmt(value: number): string {
    return Number(value ?? 0).toFixed(2);
  }

  private agregarEncabezado(doc: jsPDF, config: FondosReservaExportConfig): void {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('INFORMACIÓN INDIVIDUAL SOBRE EL PAGO DE FONDOS DE RESERVA', 148, 15, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Empresa: ${config.empresa}`, 15, 25);
    doc.text(`Período: ${config.periodoDesde} — ${config.periodoHasta}`, 15, 30);
  }
}