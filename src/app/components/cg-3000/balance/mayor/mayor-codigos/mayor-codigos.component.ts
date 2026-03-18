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
  GridReadyEvent,
} from 'ag-grid-community';

/* ==========================
 * Exportaciones
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
import { UsuarioService } from 'src/app/services/usuario.service';
import { RequiredFieldsToastService } from 'src/app/components/utils/messages/required-fields-toast.service';

/* ==========================
 * Interfaces / DTOs
 * ========================== */
import { MayorCodigosRequest } from 'src/app/interfaces/requests/mayor-codigos-request';
import { LocalesResponse } from 'src/app/interfaces/responses/local-response';
import { ZonaResponse } from 'src/app/interfaces/responses/zona-response';
import { CodigosContablesResponse } from 'src/app/interfaces/responses/codigos-contables-response';

import {
  debounceTime,
  distinctUntilChanged,
  of,
  Subject,
  switchMap,
} from 'rxjs';
import { CodigosContablesService } from 'src/app/services/codigoscontables.service';
import { 
  CodigoContableResponse, 
  CuentaHijaResponse,
  MayorCodigosAgrupadoResponse 
} from 'src/app/interfaces/responses/mayor-codigos-agrupado-response';
/* ==========================
 * Tipo local para las filas
 * ========================== */
type MayorCodigoRow = {
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
  idCodContable: number;
  nombreCodigo: string;
  cuentaHijo: string;
};

@Component({
  selector: 'app-mayor-codigos-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    AgGridModule,
  ],
  templateUrl: './mayor-codigos.component.html',
  styleUrl: './mayor-codigos.component.css',
})
export class MayorCodigosListComponent implements OnInit {

  /* ==========================================================
   * AG Grid config
   * ========================================================== */
  private gridApi!: GridApi;

  // Paginación activada
  pagination = true;
  paginationPageSize = 100;
  paginationPageSizeSelector = [50, 100, 200, 500];

  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: true,
  };

  columnDefs: ColDef[] = [
    { headerName: 'Cód. Contable', field: 'idCodContable', width: 130, filter: 'agNumberColumnFilter' },
    { headerName: 'Nombre Código', field: 'nombreCodigo', width: 280 },
    { headerName: 'Cuenta', field: 'cuentaHijo', width: 120 },
    { headerName: 'Tipo', field: 'tipo', width: 70 },
    {
      headerName: 'Asiento', field: 'asiento', width: 110,
      filter: 'agNumberColumnFilter',
    },
    {
      headerName: 'Cheque', field: 'cheque', width: 90,
      filter: 'agNumberColumnFilter',
    },
    {
      headerName: 'F. Transacción', field: 'fechaTransaccion', width: 140,
      valueFormatter: (p) => this.formatIsoDDMMYYYY(p.value),
    },
    {
      headerName: 'F. Ingreso', field: 'fechaIngreso', width: 140,
      valueFormatter: (p) => this.formatIsoDDMMYYYY(p.value),
    },
    { headerName: 'N. Comprobante', field: 'numeroComprobante', width: 180 },
    { headerName: 'Mov', field: 'movimiento', width: 80 },
    { headerName: 'Beneficiario', field: 'beneficiario', width: 260 },
    {
      headerName: 'Debe', field: 'debe', width: 130,
      filter: 'agNumberColumnFilter',
      valueFormatter: (p) => this.fmtMoney(p.value),
      cellStyle: { textAlign: 'right' },
    },
    {
      headerName: 'Haber', field: 'haber', width: 130,
      filter: 'agNumberColumnFilter',
      valueFormatter: (p) => this.fmtMoney(p.value),
      cellStyle: { textAlign: 'right' },
    },
    {
      headerName: 'Saldo', field: 'saldo', width: 130,
      filter: 'agNumberColumnFilter',
      valueFormatter: (p) => this.fmtMoney(p.value),
      cellStyle: { textAlign: 'right' },
    },
    { headerName: 'Concepto', field: 'concepto', width: 420 },
  ];

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
  }

  /* ==========================================================
   * Filtros / Estado UI
   * ========================================================== */
  filtros: MayorCodigosRequest = {
    fechaDesde: '',
    fechaHasta: '',
    cuentaA: undefined,
    cuentaB: undefined,
    idLocal: undefined,
    idZona: undefined,
    codContableDesde: undefined,
    codContableHasta: undefined,
  };

  // ── Búsqueda por CUENTA (igual que mayor cuentas) ──────────
  sugerenciasA: any[] = [];
  mostrarDropA = false;
  private searchCuentaA$ = new Subject<string>();

  sugerenciasB: any[] = [];
  mostrarDropB = false;
  private searchCuentaB$ = new Subject<string>();

  // ── Búsqueda por CÓDIGO CONTABLE ───────────────────────────
  // Desde
  sugerenciasCodDesde: CodigosContablesResponse[] = [];
  mostrarDropCodDesde = false;
  labelCodDesde = '';           // texto visible en el input
  private searchCodDesde$ = new Subject<string>();

  // Hasta
  sugerenciasCodHasta: CodigosContablesResponse[] = [];
  mostrarDropCodHasta = false;
  labelCodHasta = '';
  private searchCodHasta$ = new Subject<string>();

  // ── Modos filtro ───────────────────────────────────────────
  modoFiltro1: 'cuenta' | null = null;      // rango cuentas
  modoFiltro2: 'local' | null = null;       // local
  modoFiltro3: 'zona' | null = null;        // zona
  modoFiltroCod: 'codigo' | null = null;    // rango códigos contables

    loading = false;
    resultados: MayorCodigosAgrupadoResponse | null = null;
    codigosContables: CodigoContableResponse[] = [];
  // Combos
  localesResponse: LocalesResponse[] = [];
  zonaResponse: ZonaResponse[] = [];

  get idEmpresa(): number {
    return this.usuarioService.getEmpresaId() ?? 0;
  }

  /* ==========================================================
   * Constructor / DI
   * ========================================================== */
  constructor(
    private balanceService: BalanceService,
    private localService: LocalesService,
    private zonaService: ZonaService,
    private codigosService: CodigosContablesService,
    private usuarioService: UsuarioService,
    private message: RequiredFieldsToastService,
  ) {}

  trackById    = (_: number, item: any) => item.id;
  trackByIdZona = (_: number, item: any) => item.idZona;

  /* ==========================================================
   * Lifecycle
   * ========================================================== */
  ngOnInit(): void {
    this.setRangoMesActual();
    this.cargarLocales();
    this.cargarZona();

    // Autocomplete cuenta A
    this.searchCuentaA$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(txt => txt.length >= 2
        ? this.codigosService.buscar(txt, { idEmpresa: this.idEmpresa })
        : of(null))
    ).subscribe(res => {
      this.sugerenciasA = res?.data ?? [];
      this.mostrarDropA = this.sugerenciasA.length > 0;
    });

    // Autocomplete cuenta B
    this.searchCuentaB$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(txt => txt.length >= 2
        ? this.codigosService.buscar(txt, { idEmpresa: this.idEmpresa })
        : of(null))
    ).subscribe(res => {
      this.sugerenciasB = res?.data ?? [];
      this.mostrarDropB = this.sugerenciasB.length > 0;
    });

    // Autocomplete código contable DESDE
    this.searchCodDesde$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(txt => txt.length >= 2
        ? this.codigosService.buscar(txt, { idEmpresa: this.idEmpresa, maxResults: 20 })
        : of(null))
    ).subscribe(res => {
      this.sugerenciasCodDesde = res?.data ?? [];
      this.mostrarDropCodDesde = this.sugerenciasCodDesde.length > 0;
    });

    // Autocomplete código contable HASTA
    this.searchCodHasta$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(txt => txt.length >= 2
        ? this.codigosService.buscar(txt, { idEmpresa: this.idEmpresa, maxResults: 20 })
        : of(null))
    ).subscribe(res => {
      this.sugerenciasCodHasta = res?.data ?? [];
      this.mostrarDropCodHasta = this.sugerenciasCodHasta.length > 0;
    });
  }

  /* ==========================================================
   * Toggles UI
   * ========================================================== */
  toggleModoCuenta(): void {
    this.modoFiltro1 = this.modoFiltro1 === 'cuenta' ? null : 'cuenta';
    this.filtros.cuentaA = undefined;
    this.filtros.cuentaB = undefined;
  }

  toggleModoLocal(): void {
    this.modoFiltro2 = this.modoFiltro2 === 'local' ? null : 'local';
    this.modoFiltro3 = this.modoFiltro3 === 'zona' ? null : 'zona';
    this.filtros.idLocal = undefined;
    this.filtros.idZona = undefined;
  }

  toggleModoCodigo(): void {
    this.modoFiltroCod = this.modoFiltroCod === 'codigo' ? null : 'codigo';
    this.filtros.codContableDesde = undefined;
    this.filtros.codContableHasta = undefined;
    this.labelCodDesde = '';
    this.labelCodHasta = '';
  }

  /* ==========================================================
   * Búsqueda código contable (Desde / Hasta)
   * ========================================================== */
  onBuscarCodDesde(ev: Event): void {
    const txt = (ev.target as HTMLInputElement).value ?? '';
    this.labelCodDesde = txt;
    // si borraron el texto, limpia el id guardado
    if (!txt.trim()) {
      this.filtros.codContableDesde = undefined;
      this.sugerenciasCodDesde = [];
      this.mostrarDropCodDesde = false;
      return;
    }
    this.searchCodDesde$.next(txt);
  }

  onBuscarCodHasta(ev: Event): void {
    const txt = (ev.target as HTMLInputElement).value ?? '';
    this.labelCodHasta = txt;
    if (!txt.trim()) {
      this.filtros.codContableHasta = undefined;
      this.sugerenciasCodHasta = [];
      this.mostrarDropCodHasta = false;
      return;
    }
    this.searchCodHasta$.next(txt);
  }

  seleccionarCodDesde(cod: CodigosContablesResponse): void {
    this.filtros.codContableDesde = cod.IdCodContable;
    // Muestra algo legible en el input: identificación + razón social
    this.labelCodDesde = `${cod.Identificacionauxiliar ?? ''} - ${cod.Razonsocial ?? cod.Nombreauxiliar ?? ''}`.trim();
    this.mostrarDropCodDesde = false;
    this.sugerenciasCodDesde = [];
  }

  seleccionarCodHasta(cod: CodigosContablesResponse): void {
    this.filtros.codContableHasta = cod.IdCodContable;
    this.labelCodHasta = `${cod.Identificacionauxiliar ?? ''} - ${cod.Razonsocial ?? cod.Nombreauxiliar ?? ''}`.trim();
    this.mostrarDropCodHasta = false;
    this.sugerenciasCodHasta = [];
  }

  cerrarDropdowns(): void {
    setTimeout(() => {
      this.mostrarDropA = false;
      this.mostrarDropB = false;
      this.mostrarDropCodDesde = false;
      this.mostrarDropCodHasta = false;
    }, 200);
  }

  /* ==========================================================
   * Búsqueda por CUENTA (rango)
   * ========================================================== */
  onBuscarCuenta(tipo: 'A' | 'B', ev: Event): void {
    const texto = (ev.target as HTMLInputElement).value ?? '';
    if (/^\d/.test(texto)) {
      this.onCuentaInput(tipo, ev);
    } else {
      if (tipo === 'A') { this.filtros.cuentaA = texto; this.searchCuentaA$.next(texto); }
      else              { this.filtros.cuentaB = texto; this.searchCuentaB$.next(texto); }
    }
  }

  onCuentaInput(tipo: 'A' | 'B', ev: Event): void {
    const input = ev.target as HTMLInputElement;
    let v = (input.value ?? '').replace(/\D/g, '');
    if (v.length > 9) v = v.slice(0, 9);
    if (v.length > 6) v = `${v.slice(0, 6)}-${v.slice(6)}`;
    input.value = v;
    if (tipo === 'A') this.filtros.cuentaA = v;
    else              this.filtros.cuentaB = v;
  }

  seleccionarCuenta(tipo: 'A' | 'B', cuenta: any): void {
    if (tipo === 'A') {
      this.filtros.cuentaA = cuenta.codigoPresentacion ?? '';
      this.mostrarDropA = false;
      this.sugerenciasA = [];
    } else {
      this.filtros.cuentaB = cuenta.codigoPresentacion ?? '';
      this.mostrarDropB = false;
      this.sugerenciasB = [];
    }
  }

  /* ==========================================================
   * Consultar (acción principal)
   * ========================================================== */
  consultar(): void {
    // 1) Fechas obligatorias
    const d1 = (this.filtros.fechaDesde ?? '').trim();
    const d2 = (this.filtros.fechaHasta ?? '').trim();

    if (!d1 || !d2) {
      this.message.mostrar(['Fecha Inicio', 'Fecha Final']);
      return;
    }

    const dateDesde = new Date(d1);
    const dateHasta = new Date(d2);

    if (isNaN(dateDesde.getTime()) || isNaN(dateHasta.getTime())) {
      this.message.error('Formato de fecha inválido. Use YYYY-MM-DD.');
      return;
    }
    if (dateDesde > dateHasta) {
      this.message.error('La Fecha Inicial no puede ser mayor a la Fecha Final.');
      return;
    }

    // 2) Validar rango de cuentas si el modo está activo
    if (this.modoFiltro1 === 'cuenta') {
      const desde = (this.filtros.cuentaA ?? '').trim();
      const hasta = (this.filtros.cuentaB ?? '').trim();
      if (!!desde !== !!hasta) {
        this.message.mostrar(['Cuenta A', 'Cuenta B']);
        return;
      }
      if (desde && hasta && hasta.localeCompare(desde) < 0) {
        this.message.error('Cuenta B no puede ser menor que Cuenta A.');
        return;
      }
    }

    // 3) Validar rango de códigos contables si el modo está activo
    if (this.modoFiltroCod === 'codigo') {
      const codD = this.filtros.codContableDesde;
      const codH = this.filtros.codContableHasta;
      if ((codD == null) !== (codH == null)) {
        this.message.mostrar(['Código Contable Desde', 'Código Contable Hasta']);
        return;
      }
      if (codD != null && codH != null && codD > codH) {
        this.message.error('El Código Contable Desde no puede ser mayor al Hasta.');
        return;
      }
    }

    // 4) Llamar al backend
    this.loading = true;

    // Construir request limpio: si el modo no está activo, mandamos null
    const req: MayorCodigosRequest = {
      fechaDesde: this.filtros.fechaDesde,
      fechaHasta: this.filtros.fechaHasta,
      cuentaA:          this.modoFiltro1  === 'cuenta' ? this.filtros.cuentaA  : undefined,
      cuentaB:          this.modoFiltro1  === 'cuenta' ? this.filtros.cuentaB  : undefined,
      idLocal:          this.modoFiltro2  === 'local'  ? this.filtros.idLocal  : undefined,
      idZona:           this.modoFiltro3  === 'zona'   ? this.filtros.idZona   : undefined,
      codContableDesde: this.modoFiltroCod === 'codigo' ? this.filtros.codContableDesde : undefined,
      codContableHasta: this.modoFiltroCod === 'codigo' ? this.filtros.codContableHasta : undefined,
    };

    this.balanceService.getByCondicionMayorCodigos(req).subscribe({
        next: (resp) => {
            this.resultados = resp?.data ?? null;
            this.codigosContables = this.resultados?.codigosContables ?? [];
            this.loading = false;
            this.message.exito('Consulta mayor de códigos realizada correctamente.');
        },
        error: (err) => {
            console.error('ERROR BACK:', err);
            this.loading = false;
            this.message.error('No se pudo consultar el mayor de códigos.');
        },
     });
  }

  /* ==========================================================
   * Combos
   * ========================================================== */
  private cargarLocales(): void {
    this.localService.getAll().subscribe({
      next: (resp: any) => { this.localesResponse = resp?.data ?? []; },
      error: () => { this.localesResponse = []; },
    });
  }

  private cargarZona(): void {
    this.zonaService.getAll().subscribe({
      next: (resp: any) => {
        const data = Array.isArray(resp) ? resp : (resp?.data ?? resp?.datos ?? []);
        this.zonaResponse = Array.isArray(data) ? data : [];
      },
      error: () => { this.zonaResponse = []; },
    });
  }

  /* ==========================================================
   * Export Excel
   * ========================================================== */
  async exportExcel(): Promise<void> {
    try {
      const d1 = (this.filtros.fechaDesde ?? '').trim();
      const d2 = (this.filtros.fechaHasta ?? '').trim();
      if (!d1 || !d2) return;
      if (d2 < d1) return;

      const rows = this.aplanarDatos(); 
      if (!rows.length) { console.warn('Sin datos para exportar'); return; }

      // Labels
      const codDesdeLabel = this.labelCodDesde || 'TODOS';
      const codHastaLabel = this.labelCodHasta || 'TODOS';
      const cuentaIni     = (this.filtros.cuentaA ?? '').trim() || 'TODOS';
      const cuentaFin     = (this.filtros.cuentaB ?? '').trim() || 'TODOS';
      const localLabel    = this.filtros.idLocal
        ? (this.localesResponse.find((x: any) => x.id === this.filtros.idLocal)?.nombre ?? 'TODOS')
        : 'TODOS';
      const zonaLabel     = this.filtros.idZona
        ? (this.zonaResponse.find((z: any) => z.idZona === this.filtros.idZona)?.nombre ?? 'TODOS')
        : 'TODOS';
      const usuario         = 'ADMINISTRADOR';
      const fechaImpresion  = this.formatDateEC(new Date());
      const desde           = this.formatDateECFromIso(d1);
      const hasta           = this.formatDateECFromIso(d2);

      // Workbook
      const wb = new ExcelJS.Workbook();
      wb.creator = 'ECOP';
      wb.created = new Date();

      const ws = wb.addWorksheet('Mayor Codigos', {
        pageSetup: {
          paperSize: 9,
          orientation: 'landscape',
          fitToPage: true, fitToWidth: 1, fitToHeight: 0,
          margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
        },
        properties: { defaultRowHeight: 15 },
      });

      ws.columns = [
        { key: 'codContable', width: 14 },
        { key: 'nombreCod',   width: 32 },
        { key: 'tipo',        width: 6  },
        { key: 'asiento',     width: 12 },
        { key: 'cheque',      width: 9  },
        { key: 'fTrans',      width: 12 },
        { key: 'fIng',        width: 12 },
        { key: 'nComp',       width: 18 },
        { key: 'mov',         width: 6  },
        { key: 'benef',       width: 26 },
        { key: 'debe',        width: 14 },
        { key: 'haber',       width: 14 },
        { key: 'saldo',       width: 14 },
        { key: 'concepto',    width: 42 },
      ];

      // Logo
      const LOGO_URL = 'assets/logo/GS1-logo.png';
      try {
        const logo = await this.getBase64ImageFromUrl(LOGO_URL);
        const imgId = wb.addImage({ base64: logo.dataUrl, extension: logo.format === 'PNG' ? 'png' : 'jpeg' });
        ws.addImage(imgId, { tl: { col: 0, row: 0 }, ext: { width: 100, height: 50 } });
      } catch { /* sin logo */ }

      // Título
      ws.mergeCells('A1:N1');
      const titleCell = ws.getCell('A1');
      titleCell.value = 'MAYOR DE CÓDIGOS DETALLADO';
      titleCell.font = { bold: true, size: 14 };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(1).height = 22;

      // Encabezado filtros
      const setLabel = (addr: string, val: string, bold = false) => {
        ws.getCell(addr).value = val;
        ws.getCell(addr).font = { bold, size: 10 };
      };

      setLabel('A3', 'Cód. Desde:',  true);  setLabel('B3', codDesdeLabel); ws.mergeCells('B3:E3');
      setLabel('A4', 'Cód. Hasta:',  true);  setLabel('B4', codHastaLabel); ws.mergeCells('B4:E4');
      setLabel('A5', 'Cta. Desde:',  true);  setLabel('B5', cuentaIni);     ws.mergeCells('B5:E5');
      setLabel('A6', 'Cta. Hasta:',  true);  setLabel('B6', cuentaFin);     ws.mergeCells('B6:E6');
      setLabel('A7', 'Fecha Desde:', true);  setLabel('B7', desde);         ws.mergeCells('B7:E7');
      setLabel('A8', 'Fecha Hasta:', true);  setLabel('B8', hasta);         ws.mergeCells('B8:E8');

      setLabel('J5', 'Zona:',          true); setLabel('K5', zonaLabel);        ws.mergeCells('K5:N5');
      setLabel('J6', 'Local:',         true); setLabel('K6', localLabel);       ws.mergeCells('K6:N6');
      setLabel('J7', 'Usuario:',       true); setLabel('K7', usuario);          ws.mergeCells('K7:N7');
      setLabel('J8', 'Fec. Impresion:',true); setLabel('K8', fechaImpresion);   ws.mergeCells('K8:N8');

      // Línea separadora
      ws.getRow(9).height = 6;
      for (let c = 1; c <= 14; c++) ws.getCell(9, c).border = { bottom: { style: 'thin' } };

      // Header tabla
      const HDR_ROW = 10;
      const hdr = ws.getRow(HDR_ROW);
      hdr.values = [
        'Cód. Cont.', 'Nombre Código',
        'Tipo', 'Asiento', 'Cheque',
        'F. Trans', 'F. Ing',
        'N. Comp', 'Mov', 'Beneficiario',
        'Debe', 'Haber', 'Saldo', 'Concepto',
      ];
      hdr.font = { bold: true, size: 10 };
      hdr.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      hdr.height = 22;
      for (let c = 1; c <= 14; c++) ws.getCell(HDR_ROW, c).border = { bottom: { style: 'thin' } };
      ws.views = [{ state: 'frozen', ySplit: HDR_ROW }];

      // Body agrupado por idCodContable
      const numFmt = '#,##0.00';
      const fmtDate = (iso: string) => {
        const v = (iso ?? '').trim();
        if (!v) return '';
        return `${v.slice(8, 10)}/${v.slice(5, 7)}/${v.slice(0, 4)}`;
      };

      let rowIdx = HDR_ROW + 1;

        // Recorrer por CÓDIGO CONTABLE (nivel 1)
        for (const codigo of (this.resultados?.codigosContables ?? [])) {
        
        // ═══════════════════════════════════════════════════════════
        // ENCABEZADO DEL CÓDIGO CONTABLE
        // ═══════════════════════════════════════════════════════════
        ws.mergeCells(rowIdx, 1, rowIdx, 14);
        const hCodigo = ws.getRow(rowIdx).getCell(1);
        hCodigo.value = `CÓDIGO CONTABLE: ${codigo.idCodContable} - ${codigo.nombreCodigo}`;
        hCodigo.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
        hCodigo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        hCodigo.alignment = { horizontal: 'left', vertical: 'middle' };
        ws.getRow(rowIdx).height = 20;
        rowIdx++;

        // Recorrer CUENTAS HIJAS (nivel 2)
        for (const cuenta of codigo.cuentas) {
            
            // ─────────────────────────────────────────────────────────
            // SUB-ENCABEZADO: Cuenta Hija + Saldo Anterior
            // ─────────────────────────────────────────────────────────
            ws.mergeCells(rowIdx, 1, rowIdx, 14);
            const hCuenta = ws.getRow(rowIdx).getCell(1);
            hCuenta.value = `   Cuenta: ${cuenta.cuentaHijo}   |   Saldo Anterior: ${cuenta.saldoAnterior.toFixed(2)}`;
            hCuenta.font = { bold: true, size: 10, color: { argb: 'FF000000' } };
            hCuenta.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
            hCuenta.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
            ws.getRow(rowIdx).height = 18;
            rowIdx++;

            // ─────────────────────────────────────────────────────────
            // MOVIMIENTOS DE LA CUENTA
            // ─────────────────────────────────────────────────────────
            for (const mov of cuenta.movimientos) {
            const r = ws.getRow(rowIdx);
            r.getCell(1).value  = codigo.idCodContable;
            r.getCell(2).value  = codigo.nombreCodigo;
            r.getCell(3).value  = mov.tipo ?? '';
            r.getCell(4).value  = mov.asiento ?? null;
            r.getCell(5).value  = mov.cheque ?? null;
            r.getCell(6).value  = fmtDate(mov.fechaTransaccion ?? '');
            r.getCell(7).value  = ''; // fechaIngreso ya no existe
            r.getCell(8).value  = mov.numeroComprobante ?? '';
            r.getCell(9).value  = ''; // movimiento ya no existe
            r.getCell(10).value = mov.beneficiario ?? '';
            r.getCell(11).value = mov.debe || null;  r.getCell(11).numFmt = numFmt;
            r.getCell(12).value = mov.haber || null; r.getCell(12).numFmt = numFmt;
            r.getCell(13).value = mov.saldo || null; r.getCell(13).numFmt = numFmt;
            r.getCell(14).value = mov.concepto ?? '';

            for (let c = 1; c <= 10; c++) r.getCell(c).alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
            for (let c = 11; c <= 13; c++) r.getCell(c).alignment = { vertical: 'top', horizontal: 'right' };
            r.getCell(1).alignment = { vertical: 'top', horizontal: 'right' };
            
            rowIdx++;
            }

            // ─────────────────────────────────────────────────────────
            // TOTALES DE LA CUENTA
            // ─────────────────────────────────────────────────────────
            const rTotCta = ws.getRow(rowIdx);
            ws.mergeCells(rowIdx, 1, rowIdx, 10);
            const cLabelCta = rTotCta.getCell(1);
            cLabelCta.value = `      TOTAL CUENTA ${cuenta.cuentaHijo}`;
            cLabelCta.font = { bold: true, size: 9, italic: true };
            cLabelCta.alignment = { horizontal: 'right', vertical: 'middle' };
            
            rTotCta.getCell(11).value = cuenta.totalesCuenta.debe;   
            rTotCta.getCell(11).numFmt = numFmt; 
            rTotCta.getCell(11).font = { bold: true };
            rTotCta.getCell(11).alignment = { horizontal: 'right' };
            
            rTotCta.getCell(12).value = cuenta.totalesCuenta.haber;  
            rTotCta.getCell(12).numFmt = numFmt;
            rTotCta.getCell(12).font = { bold: true };
            rTotCta.getCell(12).alignment = { horizontal: 'right' };
            
            rTotCta.getCell(13).value = cuenta.totalesCuenta.saldo;  
            rTotCta.getCell(13).numFmt = numFmt;
            rTotCta.getCell(13).font = { bold: true };
            rTotCta.getCell(13).alignment = { horizontal: 'right' };

            for (let c = 1; c <= 14; c++) {
            rTotCta.getCell(c).border = { top: { style: 'thin', color: { argb: 'FF000000' } } };
            rTotCta.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
            }
            
            rowIdx++;
        }

        // ═══════════════════════════════════════════════════════════
        // TOTALES DEL CÓDIGO CONTABLE
        // ═══════════════════════════════════════════════════════════
        const rTotCod = ws.getRow(rowIdx);
        ws.mergeCells(rowIdx, 1, rowIdx, 10);
        const cLabelCod = rTotCod.getCell(1);
        cLabelCod.value = `TOTAL CÓDIGO ${codigo.idCodContable} - ${codigo.nombreCodigo}`;
        cLabelCod.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
        cLabelCod.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF203864' } };
        cLabelCod.alignment = { horizontal: 'right', vertical: 'middle' };

        rTotCod.getCell(11).value = codigo.totalesCodigo.debe;   
        rTotCod.getCell(11).numFmt = numFmt;
        rTotCod.getCell(11).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        rTotCod.getCell(11).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF203864' } };
        rTotCod.getCell(11).alignment = { horizontal: 'right' };

        rTotCod.getCell(12).value = codigo.totalesCodigo.haber;  
        rTotCod.getCell(12).numFmt = numFmt;
        rTotCod.getCell(12).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        rTotCod.getCell(12).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF203864' } };
        rTotCod.getCell(12).alignment = { horizontal: 'right' };

        rTotCod.getCell(13).value = codigo.totalesCodigo.saldo;  
        rTotCod.getCell(13).numFmt = numFmt;
        rTotCod.getCell(13).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        rTotCod.getCell(13).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF203864' } };
        rTotCod.getCell(13).alignment = { horizontal: 'right' };

        for (let c = 14; c <= 14; c++) {
            rTotCod.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF203864' } };
        }

        rTotCod.height = 20;
        rowIdx += 2; // Espacio entre códigos
        }

        // ═══════════════════════════════════════════════════════════
        // TOTALES GENERALES (FINAL DEL REPORTE)
        // ═══════════════════════════════════════════════════════════
        if (this.resultados?.totalesGenerales) {
        // Línea separadora
        for (let c = 1; c <= 14; c++) {
            ws.getCell(rowIdx, c).border = { 
            top: { style: 'medium', color: { argb: 'FF000000' } } 
            };
        }
        rowIdx++;

        // Título TOTALES GENERALES
        ws.mergeCells(rowIdx, 1, rowIdx, 14);
        const hTotGen = ws.getRow(rowIdx).getCell(1);
        hTotGen.value = 'TOTALES GENERALES';
        hTotGen.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
        hTotGen.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
        hTotGen.alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getRow(rowIdx).height = 24;
        rowIdx++;

        // Fila de valores
        const rTotGen = ws.getRow(rowIdx);
        ws.mergeCells(rowIdx, 1, rowIdx, 9);
        const cLabelGen = rTotGen.getCell(1);
        cLabelGen.value = 'TOTAL GENERAL';
        cLabelGen.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
        cLabelGen.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
        cLabelGen.alignment = { horizontal: 'right', vertical: 'middle' };
        
        // Saldo Anterior
        rTotGen.getCell(10).value = this.resultados.totalesGenerales.saldoAnterior;
        rTotGen.getCell(10).numFmt = numFmt;
        rTotGen.getCell(10).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
        rTotGen.getCell(10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
        rTotGen.getCell(10).alignment = { horizontal: 'right', vertical: 'middle' };

        rTotGen.getCell(11).value = this.resultados.totalesGenerales.debe;
        rTotGen.getCell(11).numFmt = numFmt;
        rTotGen.getCell(11).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
        rTotGen.getCell(11).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
        rTotGen.getCell(11).alignment = { horizontal: 'right', vertical: 'middle' };

        rTotGen.getCell(12).value = this.resultados.totalesGenerales.haber;
        rTotGen.getCell(12).numFmt = numFmt;
        rTotGen.getCell(12).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
        rTotGen.getCell(12).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
        rTotGen.getCell(12).alignment = { horizontal: 'right', vertical: 'middle' };

        rTotGen.getCell(13).value = this.resultados.totalesGenerales.saldo;
        rTotGen.getCell(13).numFmt = numFmt;
        rTotGen.getCell(13).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
        rTotGen.getCell(13).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
        rTotGen.getCell(13).alignment = { horizontal: 'right', vertical: 'middle' };

        for (let c = 14; c <= 14; c++) {
            rTotGen.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
        }

        rTotGen.height = 22;
        }
      const fileName = `Mayor_Codigos_${desde.split('/').join('-')}_${hasta.split('/').join('-')}.xlsx`;
      const buffer = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName);

    } catch (e) {
      this.message.error('No se pudo exportar el Excel.');
      console.error('Error exportando Excel Mayor de Códigos', e);
    }
  }

  /* ==========================================================
   * Export PDF
   * ========================================================== */
  async exportPdf(): Promise<void> {
    try {
      const d1 = (this.filtros.fechaDesde ?? '').trim();
      const d2 = (this.filtros.fechaHasta ?? '').trim();
      if (!d1 || !d2) { this.message.mostrar(['Fecha Inicio', 'Fecha Final']); return; }
      if (d2 < d1)    { this.message.error('Fecha Inicial mayor a Fecha Final.'); return; }

      const rows = this.aplanarDatos();
      if (!rows.length) { console.warn('Sin datos para exportar'); return; }

      const HEADER_H = 56;
      const MARGIN_X = 10;
      const MARGIN_B = 12;

      const doc = new jsPDF('l', 'mm', 'a4'); // landscape para más columnas
      const pageWidth  = doc.internal.pageSize.getWidth();
      const totalPagesExp = '{total_pages_count_string}';

      const codDesdeLabel = this.labelCodDesde || 'TODOS';
      const codHastaLabel = this.labelCodHasta || 'TODOS';
      const cuentaIni     = (this.filtros.cuentaA ?? '').trim() || 'TODOS';
      const cuentaFin     = (this.filtros.cuentaB ?? '').trim() || 'TODOS';
      const localLabel    = this.filtros.idLocal
        ? (this.localesResponse.find((x: any) => x.id === this.filtros.idLocal)?.nombre ?? 'TODOS')
        : 'TODOS';
      const zonaLabel     = this.filtros.idZona
        ? (this.zonaResponse.find((z: any) => z.idZona === this.filtros.idZona)?.nombre ?? 'TODOS')
        : 'TODOS';
      const usuario        = 'ADMINISTRADOR';
      const fechaImpresion = this.formatDateEC(new Date());
      const desde          = this.formatDateECFromIso(d1);
      const hasta          = this.formatDateECFromIso(d2);

      let logo: { dataUrl: string; format: 'PNG' | 'JPEG' } | null = null;
      try { logo = await this.getBase64ImageFromUrl('assets/logo/GS1-logo.png'); } catch { logo = null; }

      const columns = [
        'Cód.', 'Nombre Código',
        'Tipo', 'Asiento', 'Cheque',
        'F. Ing', 'F. Trans.',
        'N. Comp', 'Mov', 'Beneficiario',
        'Debe', 'Haber', 'Saldo',
      ];

      const body = this.buildPdfBodyMayorCodigos(rows, columns.length);

      autoTable(doc, {
        theme: 'plain',
        head: [columns],
        body,
        margin: { top: HEADER_H, left: MARGIN_X, right: MARGIN_X, bottom: MARGIN_B },
        startY: HEADER_H,
        styles: {
          fontSize: 6.5, cellPadding: 1, lineWidth: 0,
          textColor: 20, overflow: 'linebreak', valign: 'top',
        },
        headStyles: { fontStyle: 'bold', fontSize: 7, textColor: 0, halign: 'center', valign: 'middle' },
        columnStyles: {
          0:  { cellWidth: 14, halign: 'right'  }, // Cód.
          1:  { cellWidth: 38, halign: 'left'   }, // Nombre Código
          2:  { cellWidth: 8,  halign: 'center' }, // Tipo
          3:  { cellWidth: 15, halign: 'right'  }, // Asiento
          4:  { cellWidth: 13, halign: 'right'  }, // Cheque
          5:  { cellWidth: 18, halign: 'center' }, // F. Ing
          6:  { cellWidth: 18, halign: 'center' }, // F. Trans
          7:  { cellWidth: 24, halign: 'center' }, // N. Comp
          8:  { cellWidth: 10, halign: 'center' }, // Mov
          9:  { cellWidth: 32, halign: 'left'   }, // Beneficiario
          10: { cellWidth: 16, halign: 'right'  }, // Debe
          11: { cellWidth: 16, halign: 'right'  }, // Haber
          12: { cellWidth: 16, halign: 'right'  }, // Saldo
        },
        didParseCell: (data) => {
          if (data.section !== 'body') return;
          const raw: any = data.row.raw;
          if (raw?.__rowTipo === 'codigoHeader') {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fontSize  = 7.5;
          }
          if (raw?.__rowTipo === 'total') {
            data.cell.styles.fontStyle = 'bold';
          }
        },
        didDrawPage: () => {
          this.drawPdfHeaderMayorCodigos(doc, pageWidth, HEADER_H, logo, {
            codDesdeLabel, codHastaLabel, cuentaIni, cuentaFin,
            desde, hasta, usuario, fechaImpresion, localLabel, zonaLabel,
          });
          const pageStr = `Página ${doc.getNumberOfPages()} de ${totalPagesExp}`;
          doc.setFontSize(8);
          doc.text(pageStr, pageWidth - MARGIN_X, HEADER_H - 4, { align: 'right' });
          doc.setDrawColor(0); doc.setLineWidth(0.2);
          doc.line(MARGIN_X, HEADER_H - 2, pageWidth - MARGIN_X, HEADER_H - 2);
        },
      });

      if ((doc as any).putTotalPages) (doc as any).putTotalPages(totalPagesExp);

      doc.save(`Mayor_Codigos_${desde.split('/').join('-')}_${hasta.split('/').join('-')}.pdf`);

    } catch (e) {
      this.message.error('No se pudo exportar el PDF.');
      console.error('Error exportando PDF Mayor de Códigos', e);
    }
  }

  /* ==========================================================
   * Builder PDF body (agrupado por idCodContable)
   * ========================================================== */
  private buildPdfBodyMayorCodigos(rows: MayorCodigoRow[], colCount: number): any[] {
    const fmt = (v: any) => {
        const n = Number(v);
        return Number.isFinite(n)
        ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
        : '';
    };
    const fmtDate = (iso: string) => {
        const d = (iso ?? '').trim();
        if (!d) return '';
        return `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
    };

    const body: any[] = [];

    if (!this.resultados?.codigosContables) return body;

    // Iterar por CÓDIGO CONTABLE
    for (const codigo of this.resultados.codigosContables) {
        
        // ═══════ HEADER CÓDIGO CONTABLE ═══════
        const headerCod: any[] = [{
        content: `CÓDIGO: ${codigo.idCodContable} - ${codigo.nombreCodigo}`,
        colSpan: colCount,
        styles: { 
            halign: 'left', 
            fontStyle: 'bold', 
            fontSize: 8,
            fillColor: [68, 114, 196],
            textColor: [255, 255, 255]
        }
        }];
        (headerCod as any).__rowTipo = 'codigoHeader';
        body.push(headerCod);

        // Iterar por CUENTA HIJA
        for (const cuenta of codigo.cuentas) {
        
        // ─────── SUB-HEADER CUENTA ───────
        const headerCta: any[] = [{
            content: `   Cuenta: ${cuenta.cuentaHijo}   |   Saldo Anterior: ${fmt(cuenta.saldoAnterior)}`,
            colSpan: colCount,
            styles: { 
            halign: 'left', 
            fontStyle: 'bold', 
            fontSize: 7.5,
            fillColor: [217, 225, 242],
            textColor: [0, 0, 0]
            }
        }];
        (headerCta as any).__rowTipo = 'cuentaHeader';
        body.push(headerCta);

        // ─────── MOVIMIENTOS ───────
        for (const mov of cuenta.movimientos) {
            const detalle: any[] = [
            codigo.idCodContable,
            codigo.nombreCodigo,
            mov.tipo ?? '',
            mov.asiento ?? '',
            mov.cheque ?? '',
            fmtDate(mov.fechaTransaccion ?? ''),
            '', // fechaIngreso
            mov.numeroComprobante ?? '',
            '', // movimiento
            mov.beneficiario ?? '',
            fmt(mov.debe),
            fmt(mov.haber),
            fmt(mov.saldo),
            ];
            (detalle as any).__rowTipo = 'detalle';
            body.push(detalle);

            // Concepto en fila aparte si existe
            const conceptoTxt = (mov.concepto ?? '').trim();
            if (conceptoTxt) {
            const conceptoRow: any[] = [
                { content: 'Concepto', colSpan: 2, styles: { fontStyle: 'bold', halign: 'left', fontSize: 6.5 } },
                { content: conceptoTxt, colSpan: colCount - 2, styles: { halign: 'left', fontSize: 6.5 } },
            ];
            (conceptoRow as any).__rowTipo = 'concepto';
            body.push(conceptoRow);
            }
        }

        // ─────── TOTAL CUENTA ───────
        const totalCta: any[] = [
            { 
            content: `TOTAL CUENTA ${cuenta.cuentaHijo}`, 
            colSpan: 10, 
            styles: { halign: 'right', fontStyle: 'bold', fontSize: 7, fillColor: [242, 242, 242] } 
            },
            { content: fmt(cuenta.totalesCuenta.debe),  styles: { halign: 'right', fontStyle: 'bold', fillColor: [242, 242, 242] } },
            { content: fmt(cuenta.totalesCuenta.haber), styles: { halign: 'right', fontStyle: 'bold', fillColor: [242, 242, 242] } },
            { content: fmt(cuenta.totalesCuenta.saldo), styles: { halign: 'right', fontStyle: 'bold', fillColor: [242, 242, 242] } },
        ];
        (totalCta as any).__rowTipo = 'totalCuenta';
        body.push(totalCta);
        }

        // ═══════ TOTAL CÓDIGO CONTABLE ═══════
        const totalCod: any[] = [
        { 
            content: `TOTAL CÓDIGO ${codigo.idCodContable} - ${codigo.nombreCodigo}`, 
            colSpan: 10, 
            styles: { 
            halign: 'right', 
            fontStyle: 'bold', 
            fontSize: 7.5,
            fillColor: [32, 56, 100],
            textColor: [255, 255, 255]
            } 
        },
        { content: fmt(codigo.totalesCodigo.debe),  styles: { halign: 'right', fontStyle: 'bold', fillColor: [32, 56, 100], textColor: [255, 255, 255] } },
        { content: fmt(codigo.totalesCodigo.haber), styles: { halign: 'right', fontStyle: 'bold', fillColor: [32, 56, 100], textColor: [255, 255, 255] } },
        { content: fmt(codigo.totalesCodigo.saldo), styles: { halign: 'right', fontStyle: 'bold', fillColor: [32, 56, 100], textColor: [255, 255, 255] } },
        ];
        (totalCod as any).__rowTipo = 'totalCodigo';
        body.push(totalCod);

        // Espacio entre códigos
        body.push([{ content: '', colSpan: colCount, styles: { minCellHeight: 3 } }]);
    }
     // ═══════════════════════════════════════════════════════════
    // TOTALES GENERALES (FINAL DEL REPORTE)
    // ═══════════════════════════════════════════════════════════
    if (this.resultados?.totalesGenerales) {
        // Línea separadora
        body.push([{ 
        content: '', 
        colSpan: colCount, 
        styles: { minCellHeight: 1, lineWidth: { top: 0.5 }, lineColor: [0, 0, 0] } 
        }]);

        // Título TOTALES GENERALES
        const headerTotGen: any[] = [{
        content: 'TOTALES GENERALES',
        colSpan: colCount,
        styles: { 
            halign: 'center', 
            fontStyle: 'bold', 
            fontSize: 9,
            fillColor: [31, 78, 120],
            textColor: [255, 255, 255],
            cellPadding: 3
        }
        }];
        (headerTotGen as any).__rowTipo = 'totalesGeneralesHeader';
        body.push(headerTotGen);

        // Valores
        const totalGen: any[] = [
        { 
            content: 'TOTAL GENERAL', 
            colSpan: 9, 
            styles: { 
            halign: 'right', 
            fontStyle: 'bold', 
            fontSize: 8.5,
            fillColor: [31, 78, 120],
            textColor: [255, 255, 255]
            } 
        },
        { 
            content: fmt(this.resultados.totalesGenerales.saldoAnterior),  
            styles: { 
                halign: 'right', 
                fontStyle: 'bold', 
                fillColor: [31, 78, 120], 
                textColor: [255, 255, 255] 
            } 
        },
        { 
            content: fmt(this.resultados.totalesGenerales.debe),  
            styles: { 
                halign: 'right', 
                fontStyle: 'bold', 
                fillColor: [31, 78, 120], 
                textColor: [255, 255, 255] 
            } 
        },
        { 
            content: fmt(this.resultados.totalesGenerales.haber), 
            styles: { 
            halign: 'right', 
            fontStyle: 'bold', 
            fillColor: [31, 78, 120], 
            textColor: [255, 255, 255] 
            } 
        },
        { 
            content: fmt(this.resultados.totalesGenerales.saldo), 
            styles: { 
            halign: 'right', 
            fontStyle: 'bold', 
            fillColor: [31, 78, 120], 
            textColor: [255, 255, 255] 
            } 
        },
        ];
        (totalGen as any).__rowTipo = 'totalesGenerales';
        body.push(totalGen);
    }
    return body;
    }

  //** METODO APLANAR PARA REPORTE */
   // REEMPLAZAR MÉTODO COMPLETO:
public aplanarDatos(): MayorCodigoRow[] {
    if (!this.resultados?.codigosContables) return [];
    
    const filas: MayorCodigoRow[] = [];
    
    // Recorrer cada código contable
    for (const codigo of this.resultados.codigosContables) {
        // Recorrer cada cuenta hija del código
        for (const cuenta of codigo.cuentas) {
        // Recorrer cada movimiento de la cuenta
        for (const mov of cuenta.movimientos) {
            filas.push({
            tipo: mov.tipo ?? '',
            asiento: mov.asiento ?? 0,
            cheque: mov.cheque ?? 0,
            fechaTransaccion: mov.fechaTransaccion ?? '',
            fechaIngreso: '',
            numeroComprobante: mov.numeroComprobante ?? '',
            movimiento: '',
            beneficiario: mov.beneficiario ?? '',
            debe: mov.debe,
            haber: mov.haber,
            saldo: mov.saldo,
            saldoAnterior: cuenta.saldoAnterior,
            concepto: mov.concepto ?? '',
            idCodContable: codigo.idCodContable,
            nombreCodigo: codigo.nombreCodigo ?? '',
            cuentaHijo: cuenta.cuentaHijo ?? '',
            });
        }
        }
    }
    
    return filas;
    }
  /* ==========================================================
   * Header PDF
   * ========================================================== */
  private drawPdfHeaderMayorCodigos(
    doc: jsPDF,
    pageWidth: number,
    headerH: number,
    logo: { dataUrl: string; format: 'PNG' | 'JPEG' } | null,
    info: {
      codDesdeLabel: string; codHastaLabel: string;
      cuentaIni: string; cuentaFin: string;
      desde: string; hasta: string;
      usuario: string; fechaImpresion: string;
      localLabel: string; zonaLabel: string;
    }
  ): void {
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, headerH, 'F');

    if (logo?.dataUrl) {
      try { doc.addImage(logo.dataUrl, logo.format, 10, 6, 22, 12); } catch { /* sin logo */ }
    }

    doc.setTextColor(0);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('MAYOR DE CÓDIGOS DETALLADO', pageWidth / 2, 12, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    const xL = 10;
    let y = 20;
    const lbl = (label: string, val: string) => {
      doc.setFont('helvetica', 'bold');   doc.text(label, xL, y);
      doc.setFont('helvetica', 'normal'); doc.text(val, xL + 30, y);
      y += 5;
    };
    lbl('Cód. Desde:',  info.codDesdeLabel);
    lbl('Cód. Hasta:',  info.codHastaLabel);
    lbl('Cta. Desde:',  info.cuentaIni);
    lbl('Cta. Hasta:',  info.cuentaFin);
    lbl('Fecha Desde:', info.desde);
    lbl('Fecha Hasta:', info.hasta);

    const xR = pageWidth - 90;
    let yR = 20;
    const lblR = (label: string, val: string) => {
      doc.setFont('helvetica', 'bold');   doc.text(label, xR, yR);
      doc.setFont('helvetica', 'normal'); doc.text(val, xR + 28, yR);
      yR += 5;
    };
    lblR('Zona:',          info.zonaLabel);
    lblR('Local:',         info.localLabel);
    lblR('Usuario:',       info.usuario);
    lblR('Fec. Impresión:', info.fechaImpresion);
  }

  /* ==========================================================
   * Helpers
   * ========================================================== */
  private formatIsoDDMMYYYY(iso: any): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  private fmtMoney(v: any): string {
    const n = Number(v ?? 0);
    return Number.isFinite(n)
      ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
      : '';
  }

  private formatDateEC(d: Date): string {
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  private formatDateECFromIso(value: string): string {
    const v = (value ?? '').trim();
    if (!v) return '';
    if (v.includes('/')) return v;
    const p = v.split('-');
    if (p.length < 3) return v;
    return `${p[2].substring(0, 2)}/${p[1]}/${p[0]}`;
  }

  private async getBase64ImageFromUrl(url: string): Promise<{ dataUrl: string; format: 'PNG' | 'JPEG' }> {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`No se pudo cargar imagen: ${url}`);
    const blob = await res.blob();
    if (!blob.type.startsWith('image/')) throw new Error('No es imagen');
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return { dataUrl, format: blob.type.includes('png') ? 'PNG' : 'JPEG' };
  }

  private setRangoMesActual(): void {
    const hoy = new Date();
    const y   = hoy.getFullYear();
    const m   = hoy.getMonth();
    this.filtros.fechaDesde = this.toISODate(new Date(y, m, 1));
    this.filtros.fechaHasta = this.toISODate(new Date(y, m + 1, 0));
  }

  private toISODate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
    limpiarCodDesde(): void {
    this.filtros.codContableDesde = undefined;
    this.labelCodDesde = '';
    this.sugerenciasCodDesde = [];
    this.mostrarDropCodDesde = false;
    }

    limpiarCodHasta(): void {
    this.filtros.codContableHasta = undefined;
    this.labelCodHasta = '';
    this.sugerenciasCodHasta = [];
    this.mostrarDropCodHasta = false;
    }
    limpiarCuentaA(): void {
    this.filtros.cuentaA = undefined;
    this.sugerenciasA = [];
    this.mostrarDropA = false;
    }

    limpiarCuentaB(): void {
    this.filtros.cuentaB = undefined;
    this.sugerenciasB = [];
    this.mostrarDropB = false;
    }
}