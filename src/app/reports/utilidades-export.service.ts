import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSXStyle from 'xlsx-js-style';
import { UtilidadEmpleadoResponse } from 'src/app/interfaces/responses/utilidades-response';

export interface UtilidadesExportConfig {
  periodo:   string;   // '2026'
  empresa:   string;
  empleados: UtilidadEmpleadoResponse[];
}

@Injectable({ providedIn: 'root' })
export class UtilidadesExportService {

  // ─── PDF DETALLE ────────────────────────────────────────────────
  exportarPdfDetalle(config: UtilidadesExportConfig): void {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    this.agregarEncabezado(doc, config);

    const rows = config.empleados.map((e, i) => [
      i + 1,
      e.local              ?? '',
      e.numeroAfiliacion   ?? '',
      e.cedula             ?? '',
      e.codigoSectorial    ?? '',
      e.nombre             ?? '',
      e.genero === 'MASCULINO' ? '1' : '',
      e.genero === 'FEMENINO'  ? '1' : '',
      e.conyuge ? 'Sí' : 'No',
      e.hijos              ?? 0,
      e.numeroDias         ?? 0,
      this.fmt(e.alicuotaEmpleado),
      this.fmt(e.alicuotaCarga),
      this.fmt(e.valorEmpleado),
      this.fmt(e.valorCarga),
      e.observaciones      ?? ''
    ]);

    autoTable(doc, {
      startY: 38,
      showFoot: 'lastPage' as any,
      head: [[
        { content: 'No.',               rowSpan: 2 },
        { content: 'LOCAL',             rowSpan: 2 },
        { content: 'No. AFILIACIÓN',    rowSpan: 2 },
        { content: 'CÉDULA',            rowSpan: 2 },
        { content: 'CÓD.\nSECTORIAL',  rowSpan: 2 },
        { content: 'NOMBRE',            rowSpan: 2 },
        { content: 'SEXO',              colSpan: 2 },
        { content: 'CÓNYUGE',           rowSpan: 2 },
        { content: 'HIJOS',             rowSpan: 2 },
        { content: 'Nº DÍAS',           rowSpan: 2 },
        { content: 'ALÍCUOTA\nEMPLEADO', rowSpan: 2 },
        { content: 'ALÍCUOTA\nCARGA',   rowSpan: 2 },
        { content: 'VALOR\nEMPLEADO',   rowSpan: 2 },
        { content: 'VALOR\nCARGA',      rowSpan: 2 },
        { content: 'OBSERVACIONES',     rowSpan: 2 }
      ], [
        'H', 'M'
      ]],
      body: rows,
      foot: [[
        { content: '',        colSpan: 13 },
        { content: this.fmt(config.empleados.reduce((s, e) => s + (e.valorEmpleado ?? 0), 0)), styles: { fontStyle: 'bold' } },
        { content: this.fmt(config.empleados.reduce((s, e) => s + (e.valorCarga    ?? 0), 0)), styles: { fontStyle: 'bold' } },
        { content: '' }
      ]],
      styles:     { fontSize: 6.5, cellPadding: 1.5 },
      headStyles: {
        fillColor: [255, 255, 255], textColor: [0, 0, 0],
        fontStyle: 'bold', halign: 'center',
        lineWidth: 0.2, lineColor: [0, 0, 0]
      },
      footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0] },
      bodyStyles: { lineWidth: 0.1, lineColor: [180, 180, 180] },
      columnStyles: {
        0:  { halign: 'center', cellWidth: 8   },
        1:  { cellWidth: 22 },
        2:  { halign: 'center', cellWidth: 18  },
        3:  { halign: 'center', cellWidth: 18  },
        4:  { halign: 'center', cellWidth: 16  },
        5:  { cellWidth: 38 },
        6:  { halign: 'center', cellWidth: 7   },
        7:  { halign: 'center', cellWidth: 7   },
        8:  { halign: 'center', cellWidth: 14  },
        9:  { halign: 'right',  cellWidth: 10  },
        10: { halign: 'right',  cellWidth: 12  },
        11: { halign: 'right',  cellWidth: 20  },
        12: { halign: 'right',  cellWidth: 18  },
        13: { halign: 'right',  cellWidth: 20  },
        14: { halign: 'right',  cellWidth: 18  },
        15: { cellWidth: 24 }
      }
    });

    doc.save(`detalle_utilidades_${config.periodo}.pdf`);
  }

  // ─── PDF RESUMEN ────────────────────────────────────────────────
  exportarPdfResumen(config: UtilidadesExportConfig): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('RESUMEN GENERAL - UTILIDADES', 105, 20, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${config.periodo}`, 15, 30);
    doc.text(`Empresa: ${config.empresa}`,  15, 37);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setDrawColor(0);
    doc.rect(15, 42, 100, 8);
    doc.text('UTILIDADES', 65, 47.5, { align: 'center' });

    const mujeres = config.empleados.filter(e => e.genero === 'FEMENINO');
    const hombres = config.empleados.filter(e => e.genero === 'MASCULINO');

    const totalEmplMuj = mujeres.reduce((s, e) => s + (e.valorEmpleado ?? 0), 0);
    const totalEmplHom = hombres.reduce((s, e) => s + (e.valorEmpleado ?? 0), 0);
    const totalCargMuj = mujeres.reduce((s, e) => s + (e.valorCarga    ?? 0), 0);
    const totalCargHom = hombres.reduce((s, e) => s + (e.valorCarga    ?? 0), 0);

    const totalEmpleados = mujeres.length + hombres.length;
    const totalGeneral   = totalEmplMuj + totalEmplHom + totalCargMuj + totalCargHom;

    autoTable(doc, {
      startY: 54,
      head: [['SEXO', 'No. EMPLEADOS', 'VALOR EMPLEADO (10%)', 'VALOR CARGA (5%)', 'TOTAL']],
      body: [
        ['MUJERES', mujeres.length, this.fmt(totalEmplMuj), this.fmt(totalCargMuj), this.fmt(totalEmplMuj + totalCargMuj)],
        ['HOMBRES', hombres.length, this.fmt(totalEmplHom), this.fmt(totalCargHom), this.fmt(totalEmplHom + totalCargHom)]
      ],
      foot: [['TOTAL:', totalEmpleados,
        this.fmt(totalEmplMuj + totalEmplHom),
        this.fmt(totalCargMuj + totalCargHom),
        this.fmt(totalGeneral)
      ]],
      styles:     { fontSize: 9, cellPadding: 3 },
      headStyles: {
        fillColor: [255, 255, 255], textColor: [0, 0, 0],
        fontStyle: 'bold', halign: 'center',
        lineWidth: 0.3, lineColor: [0, 0, 0]
      },
      footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
      bodyStyles: { lineWidth: 0.2, lineColor: [0, 0, 0] },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { halign: 'center', cellWidth: 30 },
        2: { halign: 'right',  cellWidth: 38 },
        3: { halign: 'right',  cellWidth: 32 },
        4: { halign: 'right',  cellWidth: 32 }
      }
    });

    doc.save(`resumen_utilidades_${config.periodo}.pdf`);
  }

  // ─── EXCEL DETALLE ───────────────────────────────────────────────
  exportarExcelDetalle(config: UtilidadesExportConfig): void {
    const wb = XLSXStyle.utils.book_new();
    const ws: any = {};

    // ─── Estilos ───
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
    const sNumPar   = { ...sRowPar,   alignment: { horizontal: 'right' }, numFmt: '#,##0.000000' };
    const sNumImpar = { ...sRowImpar, alignment: { horizontal: 'right' }, numFmt: '#,##0.000000' };
    const sValPar   = { ...sRowPar,   alignment: { horizontal: 'right' }, numFmt: '#,##0.00' };
    const sValImpar = { ...sRowImpar, alignment: { horizontal: 'right' }, numFmt: '#,##0.00' };
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

    const cols = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P'];

    // ─── Encabezado ───
    ws['A1'] = { v: 'INFORMACIÓN INDIVIDUAL SOBRE EL PAGO DE UTILIDADES', t: 's', s: sTitulo };
    ws['A2'] = { v: config.empresa,                                         t: 's', s: sSubtitulo };
    ws['A3'] = { v: `Empresa: ${config.empresa}`,                           t: 's', s: sInfo };
    ws['A4'] = { v: `Período: ${config.periodo}`,                           t: 's', s: sInfo };

    // ─── Headers ───
    const headers = [
      'No.', 'Local', 'No.\nAfiliación', 'Cédula', 'Cód.\nSectorial', 'Nombre',
      'H', 'M', 'Cónyuge', 'Hijos', 'Nº Días',
      'Alícuota\nEmpleado', 'Alícuota\nCarga',
      'Valor\nEmpleado', 'Valor\nCarga', 'Observaciones'
    ];
    headers.forEach((h, i) => {
      ws[`${cols[i]}6`] = { v: h, t: 's', s: sHeader };
    });

    // ─── Datos ───
    config.empleados.forEach((e, idx) => {
      const row  = idx + 7;
      const par  = idx % 2 === 0;
      const sR   = par ? sRowPar   : sRowImpar;
      const sN   = par ? sNumPar   : sNumImpar;  // 6 decimales para alícuotas
      const sV   = par ? sValPar   : sValImpar;  // 2 decimales para valores

      ws[`A${row}`] = { v: idx + 1,                                         t: 'n', s: { ...sR, alignment: { horizontal: 'center' } } };
      ws[`B${row}`] = { v: e.local              ?? '',                       t: 's', s: sR };
      ws[`C${row}`] = { v: e.numeroAfiliacion   ?? '',                       t: e.numeroAfiliacion != null ? 'n' : 's', s: { ...sR, alignment: { horizontal: 'center' } } };
      ws[`D${row}`] = { v: e.cedula             ?? '',                       t: 's', s: { ...sR, alignment: { horizontal: 'center' } } };
      ws[`E${row}`] = { v: e.codigoSectorial    ?? '',                       t: 's', s: { ...sR, alignment: { horizontal: 'center' } } };
      ws[`F${row}`] = { v: e.nombre             ?? '',                       t: 's', s: sR };
      ws[`G${row}`] = { v: e.genero === 'MASCULINO' ? 1 : '',               t: e.genero === 'MASCULINO' ? 'n' : 's', s: { ...sR, alignment: { horizontal: 'center' } } };
      ws[`H${row}`] = { v: e.genero === 'FEMENINO'  ? 1 : '',               t: e.genero === 'FEMENINO'  ? 'n' : 's', s: { ...sR, alignment: { horizontal: 'center' } } };
      ws[`I${row}`] = { v: e.conyuge ? 'Sí' : 'No',                         t: 's', s: { ...sR, alignment: { horizontal: 'center' } } };
      ws[`J${row}`] = { v: e.hijos              ?? 0,                        t: 'n', s: { ...sR, alignment: { horizontal: 'right' } } };
      ws[`K${row}`] = { v: e.numeroDias         ?? 0,                        t: 'n', s: { ...sR, alignment: { horizontal: 'right' } } };
      ws[`L${row}`] = { v: e.alicuotaEmpleado   ?? 0,                        t: 'n', s: sN };
      ws[`M${row}`] = { v: e.alicuotaCarga      ?? 0,                        t: 'n', s: sN };
      ws[`N${row}`] = { v: e.valorEmpleado      ?? 0,                        t: 'n', s: sV };
      ws[`O${row}`] = { v: e.valorCarga         ?? 0,                        t: 'n', s: sV };
      ws[`P${row}`] = { v: e.observaciones      ?? '',                        t: 's', s: sR };
    });

    // ─── Totales ───
    const totalRow = config.empleados.length + 7;
    ['A','B','C','D','E','F','G','H','I','J','K','L','M'].forEach(c => {
      ws[`${c}${totalRow}`] = { v: '', t: 's', s: sTotalLabel };
    });
    ws[`K${totalRow}`] = { v: 'TOTALES', t: 's', s: sTotalLabel };
    ws[`N${totalRow}`] = { v: config.empleados.reduce((s, e) => s + (e.valorEmpleado ?? 0), 0), t: 'n', s: sTotal };
    ws[`O${totalRow}`] = { v: config.empleados.reduce((s, e) => s + (e.valorCarga    ?? 0), 0), t: 'n', s: sTotal };
    ws[`P${totalRow}`] = { v: '', t: 's', s: sTotalLabel };

    // ─── Ancho columnas ───
    ws['!cols'] = [
      { wch: 6  }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 35 },
      { wch: 5  }, { wch: 5  }, { wch: 10 }, { wch: 8  }, { wch: 8  },
      { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 22 }
    ];

    ws['!rows'] = [
      { hpt: 20 }, { hpt: 20 }, { hpt: 16 },
      { hpt: 16 }, { hpt: 6  }, { hpt: 30 }
    ];

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 15 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 15 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 15 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 15 } }
    ];

    ws['!ref'] = `A1:P${totalRow}`;

    XLSXStyle.utils.book_append_sheet(wb, ws, 'Detalle');
    XLSXStyle.writeFile(wb, `detalle_utilidades_${config.periodo}.xlsx`);
  }

  // ─── EXCEL RESUMEN ───────────────────────────────────────────────
  exportarExcelResumen(config: UtilidadesExportConfig): void {
    const wb = XLSXStyle.utils.book_new();
    const ws: any = {};

    const mujeres = config.empleados.filter(e => e.genero === 'FEMENINO');
    const hombres = config.empleados.filter(e => e.genero === 'MASCULINO');

    const totalEmplMuj = mujeres.reduce((s, e) => s + (e.valorEmpleado ?? 0), 0);
    const totalEmplHom = hombres.reduce((s, e) => s + (e.valorEmpleado ?? 0), 0);
    const totalCargMuj = mujeres.reduce((s, e) => s + (e.valorCarga    ?? 0), 0);
    const totalCargHom = hombres.reduce((s, e) => s + (e.valorCarga    ?? 0), 0);

    // ─── Estilos ───
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

    ws['A1'] = { v: 'RESUMEN GENERAL - UTILIDADES',   t: 's', s: sTitulo };
    ws['A2'] = { v: `Período: ${config.periodo}`,      t: 's', s: sInfo };
    ws['A3'] = { v: `Empresa: ${config.empresa}`,      t: 's', s: sInfo };
    ws['A4'] = { v: 'UTILIDADES',                      t: 's', s: sTipoNom };

    ws['A6'] = { v: 'SEXO',                  t: 's', s: sHeader };
    ws['B6'] = { v: 'No. EMPLEADOS',         t: 's', s: sHeader };
    ws['C6'] = { v: 'VALOR EMPLEADO (10%)',  t: 's', s: sHeader };
    ws['D6'] = { v: 'VALOR CARGA (5%)',      t: 's', s: sHeader };
    ws['E6'] = { v: 'TOTAL',                 t: 's', s: sHeader };

    ws['A7'] = { v: 'MUJERES',       t: 's', s: sRowMuj };
    ws['B7'] = { v: mujeres.length,  t: 'n', s: sRowMuj };
    ws['C7'] = { v: totalEmplMuj,    t: 'n', s: { ...sRowMuj, numFmt: '#,##0.00' } };
    ws['D7'] = { v: totalCargMuj,    t: 'n', s: { ...sRowMuj, numFmt: '#,##0.00' } };
    ws['E7'] = { v: totalEmplMuj + totalCargMuj, t: 'n', s: { ...sRowMuj, numFmt: '#,##0.00' } };

    ws['A8'] = { v: 'HOMBRES',       t: 's', s: sRowHom };
    ws['B8'] = { v: hombres.length,  t: 'n', s: sRowHom };
    ws['C8'] = { v: totalEmplHom,    t: 'n', s: { ...sRowHom, numFmt: '#,##0.00' } };
    ws['D8'] = { v: totalCargHom,    t: 'n', s: { ...sRowHom, numFmt: '#,##0.00' } };
    ws['E8'] = { v: totalEmplHom + totalCargHom, t: 'n', s: { ...sRowHom, numFmt: '#,##0.00' } };

    ws['A9'] = { v: 'TOTAL:',                                    t: 's', s: sTotal };
    ws['B9'] = { v: mujeres.length + hombres.length,             t: 'n', s: sTotal };
    ws['C9'] = { v: totalEmplMuj + totalEmplHom,                 t: 'n', s: sTotal };
    ws['D9'] = { v: totalCargMuj + totalCargHom,                 t: 'n', s: sTotal };
    ws['E9'] = { v: totalEmplMuj + totalEmplHom + totalCargMuj + totalCargHom, t: 'n', s: sTotal };

    ws['!cols']   = [{ wch: 20 }, { wch: 16 }, { wch: 22 }, { wch: 18 }, { wch: 18 }];
    ws['!rows']   = [{ hpt: 24 }, { hpt: 16 }, { hpt: 16 }, { hpt: 20 }, { hpt: 6 }, { hpt: 20 }];
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 4 } }
    ];
    ws['!ref'] = 'A1:E9';

    XLSXStyle.utils.book_append_sheet(wb, ws, 'Resumen');
    XLSXStyle.writeFile(wb, `resumen_utilidades_${config.periodo}.xlsx`);
  }

  // ─── HELPERS ────────────────────────────────────────────────────
  private fmt(value: number): string {
    return Number(value ?? 0).toFixed(2);
  }

  private agregarEncabezado(doc: jsPDF, config: UtilidadesExportConfig): void {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('INFORMACIÓN INDIVIDUAL SOBRE EL PAGO DE UTILIDADES', 148, 15, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Empresa: ${config.empresa}`, 15, 25);
    doc.text(`Período: ${config.periodo}`,  15, 30);
  }
}