/* ==========================
 * Angular core + módulos base
 * ========================== */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/* ==========================
 * Angular Material (UI)
 * ========================== */
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

/* ==========================
 * AG Grid
 * ========================== */
import { AgGridModule } from 'ag-grid-angular';
import {
  ColDef,
  GridApi,
  GridOptions,
  GridReadyEvent,
  ValueFormatterParams,
} from 'ag-grid-community';

/* ==========================
 * PDF (stubs por ahora)
 * ========================== */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';


/* ==========================
 * Services
 * ========================== */
import { BalanceService } from 'src/app/services/balance.service';
import { LocalesService } from 'src/app/services/locales.service';
import { ZonaService } from 'src/app/services/zona.service';

/* ==========================
 * Interfaces / DTOs
 * ========================== */
import { BalanceComprobacionRequest } from 'src/app/interfaces/requests/balance-comprobacion-request';

import { MayorCuentasResponse } from 'src/app/interfaces/responses/mayor-cuentas-response';
import { LocalesResponse } from 'src/app/interfaces/responses/local-response'
import { ZonaResponse } from 'src/app/interfaces/responses/zona-response'
import { ApiResponse } from 'src/app/services/generacion-codigos.service';

type MayorCuentaRow = {
  tipo: string;
  asiento: number;
  cheque: number;
  fechaTransaccion: string;
  fechaIngreso: string;
  numeroComprobante: string;
  movimiento: string;
  beneficiario: string;
  debe: number;
  haber: number;
  saldo: number;
  saldoAnterior: number;
  concepto: string;
  cuentaHijo: string;
  nombreHijo: string;
};

@Component({
  selector: 'app-mayor-cuentas-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    AgGridModule,
  ],
  templateUrl: './mayor-cuentas-list.component.html',
  styleUrl: './mayor-cuentas-list.component.css'
})
export class MayorCuentasListComponent implements OnInit {

  /* ==========================================================
   * 1) Estado / Filtros / Flags UI
   * ========================================================== */

  // Filtros iniciales (lo que se envía al backend)
  filtros: BalanceComprobacionRequest = {
    fechaDesde: '',
    fechaHasta: '',
    cuentaA: undefined,
    cuentaB: undefined,
    idLocal: undefined,
    idZona: undefined,
  };

  // Modos UI (activan/ocultan secciones en el HTML mediante *ngIf)
  modoFiltro1: 'cuenta' | null = null;
  modoFiltro2: 'local' | null = null;
  modoFiltro3: 'zona' | null = null;

  // Flag para loading/spinner
  loading = false;

  //Respuesta
  resultados: MayorCuentasResponse[] = [];

  // Combos (locales y zonas)
  localesResponse: LocalesResponse[] = [];
  zonaResponse: ZonaResponse[] = [];

  /* ==========================================================
   * 2) Inyección de servicios + variables internas
   * ========================================================== */
  constructor(
    private balanceService: BalanceService,
    private localService: LocalesService,
    private zonaService: ZonaService
  ) { }

  // trackBy (mejora performance en combos)
  trackById = (_: number, item: any) => item.id;
  trackByIdZona = (_: number, item: any) => item.idZona;

  /* ==========================================================
 * 3) Lifecycle
 * ========================================================== */
  ngOnInit(): void {
    // Precarga combos
    this.cargarLocales();
    this.cargarZona();
  }

  /* ==========================================================
 * 4) UI toggles (mostrar/ocultar filtros en HTML)
 * ========================================================== */

  toggleModoCuenta(): void {
    this.modoFiltro1 = this.modoFiltro1 === 'cuenta' ? null : 'cuenta';
    this.filtros.cuentaA = undefined;
    this.filtros.cuentaB = undefined;
  }

  toggleModoLocal(): void {
    /**
     * Nota:
     * - Aquí se alterna el modo “local”
     * - Y se manipula modoFiltro3 (zona) según tu lógica actual
     * - Además, resetea valores para que el select quede en "Seleccione"
     */
    this.modoFiltro2 = this.modoFiltro2 === 'local' ? null : 'local';
    this.modoFiltro3 = this.modoFiltro3 === 'zona' ? null : 'zona';
    this.filtros.idLocal = null;
    this.filtros.idZona = null;
    this.filtros.idZona = null;
  }

  /* ==========================================================
 * 5) Acción principal: Consultar (backend -> build reporte -> grid)
 * ========================================================== */

  consultar(): void {
    // 1) Validar fechas (obligatorias)
    const d1 = (this.filtros.fechaDesde ?? '').trim();
    const d2 = (this.filtros.fechaHasta ?? '').trim();

    if (!d1 || !d2) {
      console.warn('Debe ingresar Fecha Inicio y Fecha Final');
      return;
    }

    // 2) Validar orden de fechas (seguro si es YYYY-MM-DD)
    // Si tu input es <input type="date">, normalmente ya te da YYYY-MM-DD.
    const dateDesde = new Date(d1);
    const dateHasta = new Date(d2);

    if (isNaN(dateDesde.getTime()) || isNaN(dateHasta.getTime())) {
      console.warn('Formato de fecha inválido');
      return;
    }

    if (dateDesde > dateHasta) {
      console.warn('La Fecha Inicial no puede ser mayor a la Fecha Final');
      return;
    }

    // 3) Validar cuentas SOLO si el modo "cuenta" está activo
    if (this.modoFiltro1 === 'cuenta') {
      const desde = (this.filtros.cuentaA ?? '').trim();
      const hasta = (this.filtros.cuentaB ?? '').trim();

      const tieneDesde = !!desde;
      const tieneHasta = !!hasta;

      // Regla: si llena una, debe llenar la otra
      if (tieneDesde !== tieneHasta) {
        console.warn('Para filtrar por cuenta debe ingresar CUENTA A y CUENTA B');
        return;
      }

      // (Opcional recomendado) Validar orden de cuentas si ambas vienen
      if (tieneDesde && tieneHasta) {
        // Comparación simple (si tus cuentas son códigos comparables alfabéticamente)
        if (hasta.localeCompare(desde) < 0) {
          console.warn('CUENTA B no puede ser menor que CUENTA A');
          return;
        }
      }
    }

    // ===== aquí sigue tu lógica actual, sin tocar =====
    this.loading = true;

    this.balanceService.getByCondicionMayorCuentas(this.filtros).subscribe({
      next: (resp) => {
        //console.log('RESP COMPLETA:', resp);          // todo el objeto
        console.log('RESP.DATA:', resp?.data);        // solo data
        //console.log('DATA LENGTH:', resp?.data?.length ?? 0);

        const data = resp?.data ?? [];
        this.resultados = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('ERROR BACK:', err);
        this.loading = false;
      }
    });


  }

  /* ==========================================================
 * 6) Carga de combos (Locales / Zonas)
 * ========================================================== */

  private cargarLocales(): void {
    this.localService.getAll().subscribe({
      next: (resp: any) => {
        // Asume wrapper { data: [...] }
        this.localesResponse = resp?.data ?? [];
      },
      error: (err: any) => {
        console.error('Error cargando locales', err);
        this.localesResponse = [];
      }
    })
  }

  private cargarZona(): void {
    this.zonaService.getAll().subscribe({
      next: (resp: any) => {
        /**
         * Normalización de respuesta:
         * - A veces el backend puede devolver:
         *    a) array directo: [...]
         *    b) wrapper: { data: [...] }
         *    c) wrapper alterno: { datos: [...] }
         */
        // console.log('ZONAS resp completo =>', resp); // me ayuda a saber si me llego data

        const data = Array.isArray(resp) ? resp : (resp?.data ?? resp?.datos ?? []);
        this.zonaResponse = Array.isArray(data) ? data : [];

        // console.log('ZONAS count =>', this.zonaResponse.length);
        // console.log('ZONAS first keys =>', this.zonaResponse[0] ? Object.keys(this.zonaResponse[0]) : 'sin data');
      },
      error: (err: any) => {
        console.error('Error cargando zonas', err);
        this.zonaResponse = [];
      }
    });
  }

  /* ==========================================================
 * 7) Exportaciones (stubs / placeholders)
 * ========================================================== */

  // Acciones de exportación (placeholders)
  async exportExcel(): Promise<void> {
    try {
      // 1) Validaciones mínimas
      const d1 = (this.filtros.fechaDesde ?? '').trim();
      const d2 = (this.filtros.fechaHasta ?? '').trim();

      if (!d1 || !d2) {
        console.warn('Debe ingresar Fecha Inicio y Fecha Final');
        return;
      }
      if (d2 < d1) {
        console.warn('La Fecha Final no puede ser menor a la Fecha Inicial');
        return;
      }

      // 2) Labels
      const cuentaIni = (this.filtros.cuentaA ?? '').trim() || 'TODOS';
      const cuentaFin = (this.filtros.cuentaB ?? '').trim() || 'TODOS';

      const localLabel =
        this.filtros.idLocal
          ? (this.localesResponse.find(x => (x as any).id === this.filtros.idLocal)?.nombre ?? 'TODOS')
          : 'TODOS';

      const zonaLabel =
        this.filtros.idZona
          ? (this.zonaResponse.find(z => (z as any).idZona === this.filtros.idZona)?.nombre ?? 'TODOS')
          : 'TODOS';

      const usuario = (this as any).usuarioActual ?? 'ADMINISTRADOR';
      const fechaImpresion = this.formatDateEC(new Date());
      const desde = this.formatDateECFromIso(d1);
      const hasta = this.formatDateECFromIso(d2);

      // 3) Data
      const rows = (this.resultados ?? []) as MayorCuentasResponse[];
      if (!rows.length) {
        console.warn('No hay datos para exportar');
        return;
      }

      // 4) Workbook / Worksheet
      const wb = new ExcelJS.Workbook();
      wb.creator = 'ECOP';
      wb.created = new Date();

      const ws = wb.addWorksheet('Mayor', {
        pageSetup: {
          paperSize: 9, // A4
          orientation: 'landscape',
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,
          margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 }
        },
        properties: { defaultRowHeight: 15 }
      });

      // 5) Column widths
      ws.columns = [
        { key: 'tipo', width: 6 },
        { key: 'asiento', width: 12 },
        { key: 'cheque', width: 9 },
        { key: 'fTrans', width: 12 },
        { key: 'fIng', width: 12 },
        { key: 'nComp', width: 18 },
        { key: 'mov', width: 6 },
        { key: 'benef', width: 26 },
        { key: 'debe', width: 14 },
        { key: 'haber', width: 14 },
        { key: 'saldo', width: 14 },
        { key: 'concepto', width: 55 },
      ];

      // 6) Logo (opcional)
      const LOGO_URL = 'assets/logo/GS1-logo.png';
      try {
        const logo = await this.getBase64ImageFromUrl(LOGO_URL);
        const imgId = wb.addImage({
          base64: logo.dataUrl,
          extension: logo.format === 'PNG' ? 'png' : 'jpeg',
        });

        ws.addImage(imgId, {
          tl: { col: 0, row: 0 },   // A1
          ext: { width: 100, height: 50 }
        });
      } catch {
        // sin logo no bloquea
      }

      // 7) Encabezado general
      // Título
      ws.mergeCells('A1:L1');
      const titleCell = ws.getCell('A1');
      titleCell.value = 'MAYOR DE CUENTAS DETALLADO';
      titleCell.font = { bold: true, size: 14 };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(1).height = 22;

      // Bloque izquierda
      ws.getCell('A3').value = 'CuentaDesde:';
      ws.getCell('B3').value = cuentaIni;
      ws.mergeCells('B3:D3');

      ws.getCell('A4').value = 'CuentaHasta:';
      ws.getCell('B4').value = cuentaFin;
      ws.mergeCells('B4:D4');

      ws.getCell('A5').value = 'Fecha Desde:';
      ws.getCell('B5').value = desde;
      ws.mergeCells('B5:D5');

      ws.getCell('A6').value = 'Fecha Hasta:';
      ws.getCell('B6').value = hasta;
      ws.mergeCells('B6:D6');

      ws.getCell('A7').value = 'Usuario:';
      ws.getCell('B7').value = usuario;
      ws.mergeCells('B7:D7');

      ws.getCell('A8').value = 'Fec. Impresion:';
      ws.getCell('B8').value = fechaImpresion;
      ws.mergeCells('B8:D8');

      // Bloque derecha
      ws.getCell('J5').value = 'Zona:';
      ws.getCell('K5').value = zonaLabel;
      ws.mergeCells('K5:L5');

      ws.getCell('J6').value = 'Local:';
      ws.getCell('K6').value = localLabel;
      ws.mergeCells('K6:L6');

      // Estilos labels
      const headerLabelCells = ['A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'J5', 'J6'];
      for (const addr of headerLabelCells) {
        ws.getCell(addr).font = { bold: true, size: 10 };
      }
      const headerValueCells = ['B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'K5', 'K6'];
      for (const addr of headerValueCells) {
        ws.getCell(addr).font = { size: 10 };
      }

      // Línea separadora
      ws.getRow(9).height = 6;
      for (let c = 1; c <= 12; c++) {
        ws.getCell(9, c).border = { bottom: { style: 'thin' } };
      }

      // 8) Header de columnas (tabla)
      const tableHeaderRowIdx = 10;
      const hdr = ws.getRow(tableHeaderRowIdx);
      hdr.values = [
        'Tipo', 'Asiento', 'Cheque',
        'F. Trans', 'F. Ing',
        'N. Comp', 'Mov',
        'Beneficiario',
        'Debe', 'Haber', 'Saldo',
        'Concepto'
      ];
      hdr.font = { bold: true, size: 10 };
      hdr.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      hdr.height = 22;

      // Bordes header
      for (let c = 1; c <= 12; c++) {
        ws.getCell(tableHeaderRowIdx, c).border = { bottom: { style: 'thin' } };
      }

      // Freeze panes (mantiene headers)
      ws.views = [{ state: 'frozen', ySplit: tableHeaderRowIdx }];

      // 9) Body agrupado por cuentaHijo
      const numFmt = '#,##0.00';
      const fmtDate = (iso: string): string => {
        const v = (iso ?? '').trim();
        if (!v) return '';
        // ISO -> dd/MM/yyyy
        const yyyy = v.slice(0, 4);
        const mm = v.slice(5, 7);
        const dd = v.slice(8, 10);
        if (!yyyy || !mm || !dd) return v;
        return `${dd}/${mm}/${yyyy}`;
      };

      const getCuenta = (r: any): string => {
        return String((r?.cuentaHijo ?? r?.cuentalHijo ?? '')).trim();
      };

      let rowIdx = tableHeaderRowIdx + 1;

      let currentCuenta = '';
      let totalDebe = 0;
      let totalHaber = 0;
      let saldoFinal = 0;

      const pushTotal = () => {
        if (!currentCuenta) return;

        const r = ws.getRow(rowIdx);

        // Merge A..H para el label TOTAL
        ws.mergeCells(rowIdx, 1, rowIdx, 8);
        const cLabel = r.getCell(1);
        cLabel.value = 'TOTAL';
        cLabel.font = { bold: true, size: 10 };
        cLabel.alignment = { horizontal: 'right', vertical: 'middle' };

        const cDebe = r.getCell(9);
        cDebe.value = totalDebe;
        cDebe.numFmt = numFmt;
        cDebe.font = { bold: true, size: 10 };
        cDebe.alignment = { horizontal: 'right', vertical: 'middle' };

        const cHaber = r.getCell(10);
        cHaber.value = totalHaber;
        cHaber.numFmt = numFmt;
        cHaber.font = { bold: true, size: 10 };
        cHaber.alignment = { horizontal: 'right', vertical: 'middle' };

        const cSaldo = r.getCell(11);
        cSaldo.value = saldoFinal;
        cSaldo.numFmt = numFmt;
        cSaldo.font = { bold: true, size: 10 };
        cSaldo.alignment = { horizontal: 'right', vertical: 'middle' };

        // Concepto vacío
        r.getCell(12).value = '';

        // Borde superior fino para separar
        for (let c = 1; c <= 12; c++) {
          r.getCell(c).border = { top: { style: 'thin' } };
        }

        rowIdx++;
        // fila en blanco opcional para separación visual
        rowIdx++;
      };

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i] as any;
        const cuenta = getCuenta(r);

        // Cambio de cuenta
        if (i === 0 || cuenta !== currentCuenta) {
          // cerrar anterior
          if (i !== 0) pushTotal();

          // abrir nuevo
          currentCuenta = cuenta;
          totalDebe = 0;
          totalHaber = 0;
          saldoFinal = 0;

          const nombre = String(r?.nombreHijo ?? '').trim();
          const saldoAnterior = Number(r?.saldoAnterior ?? 0);

          // Encabezado de cuenta: merge A..L
          ws.mergeCells(rowIdx, 1, rowIdx, 12);
          const h = ws.getRow(rowIdx).getCell(1);
          h.value = `Cuenta: ${cuenta} ${nombre}    Saldo Anterior: ${saldoAnterior.toFixed(2)}`;
          h.font = { bold: true, size: 10 };
          h.alignment = { horizontal: 'left', vertical: 'middle' };
          ws.getRow(rowIdx).height = 18;

          rowIdx++;
        }

        // Acumular totales
        const debe = Number(r?.debe ?? 0) || 0;
        const haber = Number(r?.haber ?? 0) || 0;
        totalDebe += debe;
        totalHaber += haber;
        saldoFinal = Number(r?.saldo ?? saldoFinal) || saldoFinal;

        // Detalle
        const excelRow = ws.getRow(rowIdx);

        excelRow.getCell(1).value = r?.tipo ?? '';
        excelRow.getCell(2).value = r?.asiento ?? null;
        excelRow.getCell(3).value = r?.cheque ?? null;
        excelRow.getCell(4).value = fmtDate(String(r?.fechaTransaccion ?? ''));
        excelRow.getCell(5).value = fmtDate(String(r?.fechaIngreso ?? ''));
        excelRow.getCell(6).value = r?.numeroComprobante ?? '';
        excelRow.getCell(7).value = r?.movimiento ?? '';
        excelRow.getCell(8).value = r?.beneficiario ?? '';

        excelRow.getCell(9).value = debe || null;
        excelRow.getCell(9).numFmt = numFmt;

        excelRow.getCell(10).value = haber || null;
        excelRow.getCell(10).numFmt = numFmt;

        excelRow.getCell(11).value = Number(r?.saldo ?? 0) || null;
        excelRow.getCell(11).numFmt = numFmt;

        excelRow.getCell(12).value = r?.concepto ?? '';

        // Alineaciones
        for (let c = 1; c <= 8; c++) {
          excelRow.getCell(c).alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
        }
        for (let c = 9; c <= 11; c++) {
          excelRow.getCell(c).alignment = { vertical: 'top', horizontal: 'right' };
        }
        excelRow.getCell(6).alignment = { vertical: 'top', horizontal: 'center' }; // N. Comp
        excelRow.getCell(7).alignment = { vertical: 'top', horizontal: 'center' }; // Mov
        excelRow.getCell(2).alignment = { vertical: 'top', horizontal: 'right' };  // Asiento
        excelRow.getCell(3).alignment = { vertical: 'top', horizontal: 'right' };  // Cheque
        excelRow.getCell(4).alignment = { vertical: 'top', horizontal: 'center' }; // fechas
        excelRow.getCell(5).alignment = { vertical: 'top', horizontal: 'center' };

        rowIdx++;
      }

      // Cerrar último grupo
      pushTotal();

      // 10) Descargar
      const fileName = `Mayor_Cuentas_${desde.split('/').join('-')}_${hasta.split('/').join('-')}.xlsx`;
      const buffer = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName);

    } catch (e) {
      console.error('Error exportando Excel Mayor de Cuentas', e);
    }
  }
  async exportPdf(): Promise<void> {
    try {
      // 1) Validaciones mínimas (igual a tu guía)
      const d1 = (this.filtros.fechaDesde ?? '').trim();
      const d2 = (this.filtros.fechaHasta ?? '').trim();

      if (!d1 || !d2) {
        console.warn('Debe ingresar Fecha Inicio y Fecha Final');
        return;
      }
      if (d2 < d1) {
        console.warn('La Fecha Final no puede ser menor a la Fecha Inicial');
        return;
      }

      // 2) Constantes layout (mismo patrón que tu guía)
      const HEADER_H = 52;
      const MARGIN_X = 10;
      const MARGIN_B = 12;

      // 3) Documento
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const totalPagesExp = '{total_pages_count_string}';

      // 4) Encabezado (filtros)
      const cuentaIni = (this.filtros.cuentaA ?? '').trim() || 'TODOS';
      const cuentaFin = (this.filtros.cuentaB ?? '').trim() || 'TODOS';

      const localLabel =
        this.filtros.idLocal
          ? (this.localesResponse.find((x: any) => x.id === this.filtros.idLocal)?.nombre ?? 'TODOS')
          : 'TODOS';

      const zonaLabel =
        this.filtros.idZona
          ? (this.zonaResponse.find((z: any) => z.idZona === this.filtros.idZona)?.nombre ?? 'TODOS')
          : 'TODOS';

      // Ajusta a tu auth real
      const usuario = (this as any).usuarioActual ?? 'ADMINISTRADOR';

      const fechaImpresion = this.formatDateEC(new Date());
      const desde = this.formatDateECFromIso(d1);
      const hasta = this.formatDateECFromIso(d2);

      // 5) Logo (opcional) - mismo enfoque robusto que tu guía
      const LOGO_URL = 'assets/logo/GS1-logo.png';
      let logo: { dataUrl: string; format: 'PNG' | 'JPEG' } | null = null;
      try {
        logo = await this.getBase64ImageFromUrl(LOGO_URL);
      } catch {
        logo = null;
      }

      // 6) Datos: usa lo que ya cargaste (resultados o rowData)
      const rows: MayorCuentaRow[] = (this.resultados ?? []) as MayorCuentaRow[];
      if (!rows.length) {
        console.warn('No hay datos para exportar');
        return;
      }

      // 7) Construir body agrupado por cuentalHijo con TOTAL por grupo
      const columns = [
        'Tipo', 'Asiento', 'Cheque',
        'F. Ingreso', 'F. Trans.',
        'N. Comp', 'Mov',
        'Beneficiario',
        'Debe', 'Haber', 'Saldo'
      ];

      const body = this.buildPdfBodyMayorCuentas(rows, columns.length);

      // 8) Tabla
      autoTable(doc, {
        theme: 'plain',
        head: [columns],
        body,

        margin: { top: HEADER_H, left: MARGIN_X, right: MARGIN_X, bottom: MARGIN_B },
        startY: HEADER_H,

        styles: {
          fontSize: 7,
          cellPadding: 1.1,
          lineWidth: 0,
          textColor: 20,
          overflow: 'linebreak',
          valign: 'top',
        },
        headStyles: {
          fontStyle: 'bold',
          fontSize: 7.5,
          textColor: 0,
          halign: 'center',
          valign: 'middle',
        },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' }, // Tipo
          1: { cellWidth: 15, halign: 'right' }, // Asiento
          2: { cellWidth: 15, halign: 'right' }, // Cheque
          3: { cellWidth: 18, halign: 'center' }, // F. Ingreso
          4: { cellWidth: 18, halign: 'center' }, // F. Trans
          5: { cellWidth: 28, halign: 'center' }, // N. Comp
          6: { cellWidth: 10, halign: 'center' }, // Mov
          7: { cellWidth: 35, halign: 'left' }, // Beneficiario
          8: { cellWidth: 15, halign: 'right' }, // Debe
          9: { cellWidth: 15, halign: 'right' }, // Haber
          10: { cellWidth: 15, halign: 'right' }, // Saldo
        },

        didParseCell: (data) => {
          if (data.section === 'head') return;

          const raw: any = data.row.raw;
          if (!raw || data.section !== 'body') return;

          // Estilos por tipo de fila
          if (raw.__rowTipo === 'cuentaHeader') {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fontSize = 8;
            data.cell.styles.textColor = 0;
          }

          if (raw.__rowTipo === 'total') {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = 0;
          }
        },

        didDrawPage: () => {
          // Header en cada página (mismo enfoque que tu guía)
          this.drawPdfHeaderMayorCuentas(
            doc,
            pageWidth,
            HEADER_H,
            logo,
            {
              cuentaIni,
              cuentaFin,
              desde,
              hasta,
              usuario,
              fechaImpresion,
              localLabel,
              zonaLabel
            }
          );

          // Page X of Y
          const pageNumber = doc.getNumberOfPages();
          const pageStr = `Page ${pageNumber} of ${totalPagesExp}`;
          doc.setFontSize(8);
          doc.text(pageStr, pageWidth - MARGIN_X, 48, { align: 'right' });

          // Línea separadora bajo header
          doc.setDrawColor(0);
          doc.setLineWidth(0.2);
          doc.line(MARGIN_X, 50, pageWidth - MARGIN_X, 50);
        }
      });

      if ((doc as any).putTotalPages) {
        (doc as any).putTotalPages(totalPagesExp);
      }

      const fileName = `Mayor_Cuentas_${desde.split('/').join('-')}_${hasta.split('/').join('-')}.pdf`;
      doc.save(fileName);

    } catch (e) {
      console.error('Error exportando PDF Mayor de Cuentas', e);
    }
  }

  /** BODY agrupado por cuentalHijo con encabezado + total por grupo */
  private buildPdfBodyMayorCuentas(rows: MayorCuentaRow[], colCount: number): any[] {
    const fmt = (v: any) => {
      const n = Number(v);
      if (!Number.isFinite(n)) return '';
      return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
    };

    const fmtDate = (iso: string) => {
      const d = (iso ?? '').trim();
      if (!d) return '';
      // iso: 2025-12-15T16:38:05.763 -> 15/12/2025
      const yyyy = d.slice(0, 4);
      const mm = d.slice(5, 7);
      const dd = d.slice(8, 10);
      if (!yyyy || !mm || !dd) return d;
      return `${dd}/${mm}/${yyyy}`;
    };

    const body: any[] = [];

    let currentCuenta = '';
    let totalDebe = 0;
    let totalHaber = 0;
    let saldoFinal = 0;

    const pushTotal = () => {
      if (!currentCuenta) return;

      // TOTAL (label + debe + haber + saldo final)
      const idxDebe = 8; // según columnas definidas arriba
      const labelSpan = idxDebe; // columnas 0..7

      const row: any[] = [
        { content: 'TOTAL', colSpan: labelSpan, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: fmt(totalDebe), styles: { halign: 'right', fontStyle: 'bold' } }, // Debe
        { content: fmt(totalHaber), styles: { halign: 'right', fontStyle: 'bold' } }, // Haber
        { content: fmt(saldoFinal), styles: { halign: 'right', fontStyle: 'bold' } }, // Saldo
      ];
      (row as any).__rowTipo = 'total';
      body.push(row);
    };

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const cuenta = (r.cuentaHijo ?? '').trim();

      // Cambio de cuenta => cerrar anterior y abrir nueva
      if (i === 0 || cuenta !== currentCuenta) {
        // cerrar grupo anterior
        if (i !== 0) {
          pushTotal();
        }

        // reset grupo
        currentCuenta = cuenta;
        totalDebe = 0;
        totalHaber = 0;
        saldoFinal = 0;

        // Encabezado del grupo (usa saldoAnterior del primer registro del grupo)
        const headerText =
          `Cuenta: ${cuenta} ${((r.nombreHijo ?? '').trim())}    ` +
          `Saldo Anterior: ${fmt(r.saldoAnterior)}`;

        const headerRow: any[] = [
          { content: headerText, colSpan: colCount, styles: { halign: 'left', fontStyle: 'bold' } }
        ];
        (headerRow as any).__rowTipo = 'cuentaHeader';
        body.push(headerRow);
      }

      // Acumular totales
      const debe = Number(r.debe) || 0;
      const haber = Number(r.haber) || 0;
      totalDebe += debe;
      totalHaber += haber;
      saldoFinal = Number(r.saldo) || saldoFinal;

      // Detalle
      const detalle: any[] = [
        r.tipo ?? '',
        (r.asiento ?? '') as any,
        (r.cheque ?? '') as any,
        fmtDate(r.fechaIngreso),
        fmtDate(r.fechaTransaccion),
        r.numeroComprobante ?? '',
        r.movimiento ?? '',
        (r.beneficiario ?? 'N/A'),
        fmt(debe),
        fmt(haber),
        fmt(r.saldo),
      ];
      (detalle as any).__rowTipo = 'detalle';
      body.push(detalle);

      // Fila concepto debajo (colSpan al resto)
      const conceptoTxt = (r.concepto ?? '').toString().trim();
      if (conceptoTxt) {
        const conceptoRow: any[] = [
          { content: 'Concepto', colSpan: 2, styles: { fontStyle: 'bold', halign: 'left' } },
          { content: conceptoTxt, colSpan: colCount - 2, styles: { halign: 'left' } },
        ];
        (conceptoRow as any).__rowTipo = 'concepto';
        body.push(conceptoRow);
      }

    }

    // cerrar último grupo
    pushTotal();

    return body;
  }

  // ==========================
  // HEADER MAYOR DE CUENTAS (similar a tu guía)
  // ==========================
  private drawPdfHeaderMayorCuentas(
    doc: jsPDF,
    pageWidth: number,
    headerH: number,
    logo: { dataUrl: string; format: 'PNG' | 'JPEG' } | null,
    info: {
      cuentaIni: string;
      cuentaFin: string;
      desde: string;
      hasta: string;
      usuario: string;
      fechaImpresion: string;
      localLabel: string;
      zonaLabel: string;
    }
  ): void {
    // Limpia header
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, headerH, 'F');

    // Logo
    if (logo?.dataUrl) {
      try {
        doc.addImage(logo.dataUrl, logo.format, 10, 6, 22, 12);
      } catch { /* no bloquea */ }
    }

    // Título
    doc.setTextColor(0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('MAYOR DE CUENTAS DETALLADO', pageWidth / 2, 12, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    // Bloque izquierdo
    const xL = 10;
    let y = 22;

    doc.text(`CuentaDesde:`, xL, y);
    doc.text(info.cuentaIni, xL + 28, y);
    y += 5;

    doc.text(`CuentaHasta:`, xL, y);
    doc.text(info.cuentaFin, xL + 28, y);
    y += 7;

    doc.text(`Fecha Desde:`, xL, y);
    doc.text(info.desde, xL + 28, y);
    y += 5;

    doc.text(`Fecha Hasta:`, xL, y);
    doc.text(info.hasta, xL + 28, y);
    y += 5;



    // Bloque derecho
    const xR = pageWidth - 70;
    let yR = 22;
    doc.text(`Zona:`, xR, yR);
    doc.text(info.zonaLabel, xR + 20, yR);
    yR += 5;

    doc.text(`Local:`, xR, yR);
    doc.text(info.localLabel, xR + 20, yR);
    yR += 7;

    doc.text(`Usuario:`, xR, yR);
    doc.text(info.usuario, xR + 28, yR);
    yR += 5;

    doc.text(`Fec. Impresion:`, xR, yR);
    doc.text(info.fechaImpresion, xR + 28, yR);
  }

  // ==========================
  // HELPERS (idénticos al enfoque de tu guía)
  // ==========================
  private formatDateEC(d: Date): string {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  private formatDateECFromIso(value: string): string {
    const v = (value ?? '').trim();
    if (!v) return '';
    if (v.includes('/')) return v; // ya dd/MM/yyyy
    // espera YYYY-MM-DD
    const parts = v.split('-');
    if (parts.length < 3) return v;
    const yyyy = parts[0];
    const mm = parts[1];
    const dd = parts[2].substring(0, 2);
    return `${dd}/${mm}/${yyyy}`;
  }

  private async getBase64ImageFromUrl(url: string): Promise<{ dataUrl: string; format: 'PNG' | 'JPEG' }> {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`No se pudo cargar imagen: ${url} (${res.status})`);

    const blob = await res.blob();
    if (!blob.type.startsWith('image/')) throw new Error(`El recurso no es imagen. Content-Type=${blob.type}`);

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const format: 'PNG' | 'JPEG' = blob.type.includes('png') ? 'PNG' : 'JPEG';
    if (!dataUrl.startsWith('data:image/')) throw new Error('DataURL inválido para imagen');

    return { dataUrl, format };
  }

  /* ==========================================================
 * 8) Se parece NgxMask: CUENTA A / CUENTA B
 * ========================================================== */

  private readonly CUENTA_REGEX = /^\d{6}-\d{3}$/;

  // Se llama en (input)
  onCuentaInput(tipo: 'A' | 'B', ev: Event): void {
    const input = ev.target as HTMLInputElement;
    let v = (input.value ?? '').replace(/\D/g, ''); // solo dígitos

    // max 9 dígitos (6 + 3)
    if (v.length > 9) v = v.slice(0, 9);

    // inserta guion después de 6 dígitos
    if (v.length > 6) v = `${v.slice(0, 6)}-${v.slice(6)}`;

    input.value = v; // actualiza el input visible

    if (tipo === 'A') this.filtros.cuentaA = v;
    else this.filtros.cuentaB = v;
  }

  // Se llama en (blur): valida formato completo
  onCuentaBlur(tipo: 'A' | 'B'): void {
    const v = (tipo === 'A' ? this.filtros.cuentaA : this.filtros.cuentaB) ?? '';
    const t = v.trim();

    // si está vacío, no molestar (la regla de “ambas cuentas” ya la validas en consultar())
    if (!t) return;

    if (!this.CUENTA_REGEX.test(t)) {
      console.warn('Formato de cuenta inválido. Use: 110101-001');
      // opcional: limpiar campo para obligar corrección
      // if (tipo === 'A') this.filtros.cuentaA = '';
      // else this.filtros.cuentaB = '';
    }
  }

}
