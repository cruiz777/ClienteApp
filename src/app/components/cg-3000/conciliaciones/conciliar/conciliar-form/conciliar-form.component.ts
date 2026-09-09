import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, MatDateFormats, NativeDateAdapter } from '@angular/material/core';
import { GridOptions } from 'ag-grid-community';
import { UsuarioService } from 'src/app/services/usuario.service';
import { CustomMessageBoxComponent } from 'src/app/util/messages/custom-message-box.component';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormsModule,
  FormControl,
} from '@angular/forms';

import { finalize, startWith } from 'rxjs/operators';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent, CellValueChangedEvent } from 'ag-grid-community';

import {
  UpdateConciliacionRequest,
  CreateConciliacionDetalleRequest,
  GuardarConciliacionParcialRequest,
} from 'src/app/interfaces/requests/conciliacion-request';

import {
  ConciliacionResponse,
  ConciliacionDetalleResponse,
} from 'src/app/interfaces/responses/conciliacion-response';

import { ConciliacionSelectorResponse } from 'src/app/interfaces/responses/conciliacion-selector-response';
import { MovimientoMaestroResponse } from 'src/app/interfaces/responses/movimiento-maestro-response';

import {
  ConciliacionesService,
  ApiResponse,
} from 'src/app/services/conciliaciones.service';

import { PlanCuentasService, PlanCuenta } from 'src/app/services/plan-cuentas.service';

// Dialog agrupar
import { ConciliacionAgruparDialogComponent } from '../conciliacion-agrupar-dialog/conciliacion-agrupar-dialog.component';

interface MovimientoRow extends ConciliacionDetalleResponse {
  // extra tolerante (por si backend manda conciliado/fechaconciliado)
  conciliado?: string | null;
  fechaconciliado?: any;
}

interface SaldosConciliadosRow {
  salconini: number;
  salcondep: number;
  salconchq: number;
  salconnc: number;
  salconnd: number;
  salconbanc: number;
  salcondif: number;
}

interface ResumenRow {
  tipo: 'Conciliados' | 'No Conciliados';
  saldoContable: number;
  deposito: number;
  cheques: number;
  notasDebito: number;
  notasCredito: number;
  saldoBancario: number;
  diferencia: number;
}
export const CG_DATE_FORMATS: MatDateFormats = {
  parse: { dateInput: 'DD/MM/YYYY' },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMMM YYYY',
    dateA11yLabel: 'DD/MM/YYYY',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

export class DdMmYyyyDateAdapter extends NativeDateAdapter {
  override parse(value: any): Date | null {
    if (typeof value === 'string') {
      const v = value.trim();
      const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v);
      if (m) {
        const day = Number(m[1]);
        const month = Number(m[2]) - 1;
        const year = Number(m[3]);
        const d = new Date(year, month, day);
        return isNaN(d.getTime()) ? null : d;
      }
    }
    return super.parse(value);
  }

  override format(date: Date, displayFormat: any): string {
    if (!(date instanceof Date) || isNaN(date.getTime())) return '';
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
}
@Component({
  selector: 'app-conciliacion-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,

    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatAutocompleteModule,
    MatSnackBarModule,
    MatMenuModule,
    MatDialogModule,

    AgGridModule,
  ],
  templateUrl: './conciliar-form.component.html',
  styleUrls: ['./conciliar-form.component.css'],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'es-EC' },
    { provide: DateAdapter, useClass: DdMmYyyyDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: CG_DATE_FORMATS },
  ],
})
export class ConciliacionComponent implements OnInit {
  private fb = inject(FormBuilder);
  private svc = inject(ConciliacionesService);
  private planSvc = inject(PlanCuentasService);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private ultimaFilaClickeada: any = null;
  usuarioActual: any = null;
  loading = false;
  loadingSelector = false;
  loadingPlan = false;
  private ultimaBusquedaConciliacionKey = '';
  private cargandoConciliacionExistente = false;
  private movimientosRequestVersion = 0;
  private conciliacionPersistida: ConciliacionResponse | null = null;

panelIzquierdoAncho = 1240;
panelDerechoAncho = 0;

private resizing = false;
private startX = 0;
private startLeftWidth = 0;
private startRightWidth = 0;
  // VB6: cuando ya está TOTAL => bloqueado
  isLocked = false;
  mostrarExcel: boolean = false;
  constructor(private usuarioService: UsuarioService) {

  }
  // Solo para mostrar ID cuando se recupera una conciliación TOTAL
  idConciliacion: number | null = null;

  ///otro grid
  private gridExcelApi?: GridApi;

  excelRows: any[] = [];

  rowClassRulesExcel = {
    'row-excel-match': (p: any) => !!p.data?.matchExcel,
    'row-excel-no-match': (p: any) => p.data?.matchExcel === false,
  };

colExcel: ColDef[] = [
  {
    headerName: '',
    field: 'matchExcel',
    width: 55,
    sortable: false,
    filter: false,
    resizable: false,
    editable: false,
    cellStyle: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
    },
    cellRenderer: (params: any) => {
      const checked = !!params.data?.matchExcel;

      const wrapper = document.createElement('div');
      wrapper.style.width = '100%';
      wrapper.style.height = '100%';
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.justifyContent = 'center';

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = checked;

      // 👇 importante: ya no bloquees el clic
      input.disabled = false;
      input.style.pointerEvents = 'auto';
      input.style.width = '14px';
      input.style.height = '14px';
      input.style.margin = '0';
      input.style.padding = '0';
      input.style.accentColor = '#2e7d32';
      input.style.cursor = 'pointer';

      input.addEventListener('click', (event: MouseEvent) => {
        event.stopPropagation();

        const nuevoValor = !params.data.matchExcel;
        params.data.matchExcel = nuevoValor;

        params.node.setData({
          ...params.data,
          matchExcel: nuevoValor
        });

        params.api.refreshCells({
          rowNodes: [params.node],
          columns: ['matchExcel'],
          force: true
        });
      });

      wrapper.appendChild(input);
      return wrapper;
    },
  },

  { headerName: 'Fecha', field: 'fecha', width: 125 },
  { headerName: 'Código', field: 'codigo', width: 110 },
  { headerName: 'Concepto', field: 'concepto', minWidth: 220, flex: 1, tooltipField: 'concepto' },
  { headerName: 'Tipo', field: 'tipo', width: 90 },
  { headerName: 'Documento', field: 'documento', width: 130 },
  { headerName: 'Oficina', field: 'oficina', width: 120 },
  {
    headerName: 'Monto',
    field: 'monto',
    width: 120,
    valueFormatter: (p) => this.formatNumber2(p.value),
    cellStyle: (p) => this.numberCellStyle(p),
  },

  { headerName: 'Referencia', field: 'referencia', minWidth: 160, hide: true, tooltipField: 'referencia' },
  { headerName: 'Transacción', field: 'transaccion', minWidth: 140, hide: true, tooltipField: 'transaccion' },
  { headerName: 'Signo', field: 'signo', width: 90, hide: true },
  { headerName: 'Beneficiario', field: 'beneficiario', minWidth: 180, hide: true, tooltipField: 'beneficiario' },
  { headerName: 'Referencia1', field: 'referencia1', minWidth: 180, hide: true, tooltipField: 'referencia1' },
  { headerName: 'Referencia2', field: 'referencia2', minWidth: 180, hide: true, tooltipField: 'referencia2' },
];

  ////

  // =======================
  // SELECTOR
  // =======================
  selectorConciliaciones: ConciliacionSelectorResponse[] = [];
  selectorConciliacionesFiltradas: ConciliacionSelectorResponse[] = [];

  buscarForm: FormGroup = this.fb.group({
    idConciliacionBuscar: new FormControl<any>(null),
  });

  displayConciliacion = (c: ConciliacionSelectorResponse | null): string => {
    if (!c) return '';
    return `#${c.idConciliacion} • ${c.fecconcil} • ${c.cuentaPresentacion} - ${c.nombreCuenta}`;
  };

  // =======================
  // PLAN CUENTAS
  // =======================
  planCuentas: PlanCuenta[] = [];
  planCuentasFiltradas: PlanCuenta[] = [];

  planForm: FormGroup = this.fb.group({
    planCuentaBuscar: new FormControl<any>(null),
  });

  private pendingPlanId: number | null = null;

  displayPlanCuenta = (p: PlanCuenta | null): string => {
    if (!p) return '';
    const nombre = (p.NombreCuenta ?? p.Descripcion ?? '').toString();
    return `#${p.IdPlanCuentas} • ${p.CuentaPresentacion} — ${nombre}`;
  };

  // =======================
  // FORM CABECERA
  // =======================
  form: FormGroup = this.fb.group({
    idPlanCuentas: [null, [Validators.required]],
    codprePc: [null, [Validators.required]],
    descripcion: [null],

    fechaInicial: [null, [Validators.required]],
    fechaFinal: [null, [Validators.required]],

    saldcontini: [0, [Validators.required]],
    saldcontfin: [0, [Validators.required]],
    saldbancini: [0, [Validators.required]],
    saldbancfin: [0, [Validators.required]],

    comentario: [null],
    idEmpresa: [null, [Validators.required]],
    idUsuario: [null, [Validators.required]],
  });
  saldosPorConciliar: SaldosConciliadosRow = {
    salconini: 0,
    salcondep: 0,
    salconchq: 0,
    salconnc: 0,
    salconnd: 0,
    salconbanc: 0,
    salcondif: 0,
  };

  // =======================
  // GRIDS
  // =======================
  private gridMovApi?: GridApi;
  private gridSaldosApi?: GridApi;
  private gridResumenApi?: GridApi;

  movimientos: MovimientoRow[] = [];

  saldosConciliados: SaldosConciliadosRow = {
    salconini: 0,
    salcondep: 0,
    salconchq: 0,
    salconnc: 0,
    salconnd: 0,
    salconbanc: 0,
    salcondif: 0,
  };

  resumenRows: ResumenRow[] = [
    { tipo: 'Conciliados', saldoContable: 0, deposito: 0, cheques: 0, notasDebito: 0, notasCredito: 0, saldoBancario: 0, diferencia: 0 },
    { tipo: 'No Conciliados', saldoContable: 0, deposito: 0, cheques: 0, notasDebito: 0, notasCredito: 0, saldoBancario: 0, diferencia: 0 },
  ];

  // fila roja si fechatran < fechaInicial
  rowClassRules = {
    'row-out-of-range': (p: any) => {
      const ini: Date | null = this.form.get('fechaInicial')?.value ?? null;
      if (!ini) return false;
      const raw = (p.data as any)?.fechatran;
      if (!raw) return false;
      const dt = new Date(String(raw));
      if (Number.isNaN(dt.getTime())) return false;
      return dt < ini;
    },
    'row-match-excel': (p: any) => {
      return !!p.data?.matchExcel;
    },
  };

  defaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: true,
    minWidth: 80,
  };
  colSaldos: ColDef[] = [
    {
      headerName: 'Saldo Inicial',
      field: 'salconini',
      valueFormatter: (p) => this.formatNumber2(p.value),
      cellStyle: (p) => this.numberCellStyle(p),
    },
    {
      headerName: 'Depósito',
      field: 'salcondep',
      valueFormatter: (p) => this.formatNumber2(p.value),
      cellStyle: (p) => this.numberCellStyle(p),
    },
    {
      headerName: 'Cheques',
      field: 'salconchq',
      valueFormatter: (p) => this.formatNumber2(p.value),
      cellStyle: (p) => this.numberCellStyle(p),
    },
    {
      headerName: 'Notas/Crédito',
      field: 'salconnc',
      valueFormatter: (p) => this.formatNumber2(p.value),
      cellStyle: (p) => this.numberCellStyle(p),
    },
    {
      headerName: 'Notas/Débito',
      field: 'salconnd',
      valueFormatter: (p) => this.formatNumber2(p.value),
      cellStyle: (p) => this.numberCellStyle(p),
    },
    {
      headerName: 'Saldo Bancario',
      field: 'salconbanc',
      valueFormatter: (p) => this.formatNumber2(p.value),
      cellStyle: (p) => this.numberCellStyle(p),
    },
    {
      headerName: 'Diferencia',
      field: 'salcondif',
      valueFormatter: (p) => this.formatNumber2(p.value),
      cellStyle: (p) => this.numberCellStyle(p),
    },
  ];
  colMov: ColDef[] = [
    { headerName: 'IdDetMaestro', field: 'idDetMaestro', width: 120, hide: true },
    { headerName: 'Línea', field: 'linea', width: 80 },

    {
      headerName: 'Fecha Transac',
      field: 'fechatran',
      width: 160,
      valueFormatter: (p) => this.formatDdMmYyyy(p.value),
      filterValueGetter: (p) => this.formatDdMmYyyy(p.data?.fechatran),
    },

    { headerName: 'IdMov', field: 'idMovBancario', width: 90, hide: true },
    { headerName: 'TipMov', field: 'movbancario', width: 90 },
    { headerName: 'N° Comp', field: 'nocomprobante', width: 120, tooltipField: 'nocomprobante' },

    {
      headerName: 'Cheque',
      field: 'cheque',
      width: 100,
      filter: 'agNumberColumnFilter',
      cellStyle: (p) => this.numberCellStyle(p), tooltipField: 'cheque'
    },
    {
      headerName: 'Débito',
      field: 'debito',
      width: 110,
      filter: 'agNumberColumnFilter',
      valueFormatter: (p) => this.formatNumber2(p.value),
      filterValueGetter: (p) => this.num(p.data?.debito),
      cellStyle: (p) => this.numberCellStyle(p),
    },
    {
      headerName: 'Crédito',
      field: 'credito',
      width: 110,
      filter: 'agNumberColumnFilter',
      valueFormatter: (p) => this.formatNumber2(p.value),
      filterValueGetter: (p) => this.num(p.data?.credito),
      cellStyle: (p) => this.numberCellStyle(p),
    },

    {
      headerName: 'Concil',
      field: 'concil',
      width: 90,
      editable: false,
      sortable: false,
      filter: false,
      cellStyle: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: this.isLocked ? 'default' : 'pointer',
      },
      cellRenderer: (params: any) => {
        const checked = this.isChecked(params.data?.concil);

        const wrapper = document.createElement('div');
        wrapper.style.width = '100%';
        wrapper.style.height = '100%';
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.justifyContent = 'center';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = checked;
        input.disabled = false;
        input.style.pointerEvents = 'none';
        input.style.width = '14px';
        input.style.height = '14px';
        input.style.margin = '0';
        input.style.padding = '0';
        input.style.accentColor = '#e91e63';
        input.style.transform = 'none';

        wrapper.appendChild(input);
        return wrapper;
      },
    },
    {
      headerName: 'Fecha Concil',
      field: 'fechaconcil',
      width: 150,
      valueFormatter: (p) => this.formatDdMmYyyy(p.value),
      filterValueGetter: (p) => this.formatDdMmYyyy(p.data?.fechaconcil),
    },
    { headerName: 'Beneficiario', field: 'beneficiario', minWidth: 220, flex: 1, tooltipField: 'beneficiario' },
    { headerName: 'Numdoc', field: 'numdoc', width: 140, valueFormatter: (p) => (p.value == null ? '' : String(p.value)) },
    { headerName: 'Tipdoc', field: 'tipdoc', width: 90 },
  ];

 colResumen: ColDef[] = [
  {
    headerName: 'Estado',
    field: 'tipo',
    minWidth: 120,
    flex: 1.15,
  },
  {
    headerName: 'Saldo Contable',
    field: 'saldoContable',
    minWidth: 115,
    flex: 1,
    valueFormatter: p => this.formatNumber2(p.value),
    cellStyle: p => this.numberCellStyle(p),
  },
  {
    headerName: 'Depósito',
    field: 'deposito',
    minWidth: 105,
    flex: 1,
    valueFormatter: p => this.formatNumber2(p.value),
    cellStyle: p => this.numberCellStyle(p),
  },
  {
    headerName: 'Cheques',
    field: 'cheques',
    minWidth: 105,
    flex: 1,
    valueFormatter: p => this.formatNumber2(p.value),
    cellStyle: p => this.numberCellStyle(p),
  },
  {
    headerName: 'Notas/Débito',
    field: 'notasDebito',
    minWidth: 115,
    flex: 1,
    valueFormatter: p => this.formatNumber2(p.value),
    cellStyle: p => this.numberCellStyle(p),
  },
  {
    headerName: 'Notas/Crédito',
    field: 'notasCredito',
    minWidth: 115,
    flex: 1,
    valueFormatter: p => this.formatNumber2(p.value),
    cellStyle: p => this.numberCellStyle(p),
  },
  {
    headerName: 'Saldo Bancario',
    field: 'saldoBancario',
    minWidth: 120,
    flex: 1,
    valueFormatter: p => this.formatNumber2(p.value),
    cellStyle: p => this.numberCellStyle(p),
  },
  {
    headerName: 'Diferencia',
    field: 'diferencia',
    minWidth: 110,
    flex: 0.9,
    valueFormatter: p => this.formatNumber2(p.value),
    cellStyle: p => this.numberCellStyle(p),
  },
];

  // filtros quick filter
  filtroTipMov = '';
  filtroValor = '';
  filtroCheque = '';
  filtroComprobante = '';
  filtroDocumento = '';

  // =======================
  // Botones (VB6)
  // =======================
  get labelCargar(): string {
    return (this.movimientos?.length ?? 0) > 0 ? 'Recargar' : 'Cargar';
  }

  get canCargar(): boolean {
    if (this.loading) return false;
    if (this.isLocked) return false;
    if (this.cargandoConciliacionExistente) return false;
    return this.form.valid;
  }

  get canAbrirMenuGuardar(): boolean {
    if (this.loading) return false;
    if (this.isLocked) return false;
    if (this.cargandoConciliacionExistente) return false;
    return this.form.valid && this.getMovimientosActuales().length > 0;
  }

  get canGuardarParcial(): boolean {
    return this.canAbrirMenuGuardar && !this.isLocked;
  }

  get canGuardarTotal(): boolean {
    return this.canAbrirMenuGuardar
      && !this.isLocked
      && this.esConciliacionCuadrada()
      && this.validarRangoMensualCompleto().ok;
  }
  // =======================
  // INIT
  // =======================
  ngOnInit(): void {
    this.usuarioActual = this.usuarioService.getUsuarioActual();
    this.form.patchValue({
      idEmpresa: this.getIdEmpresaActual(),
      idUsuario: this.getIdUsuarioActual(),
      fechaInicial: this.getPrimerDiaMesActual(),
      fechaFinal: this.getUltimoDiaMesActual(),
    }, { emitEvent: false });
    this.cargarSelectorConciliaciones();
    this.cargarPlanCuentas();
    this.escucharCambiosParaBuscarConciliacion();
    this.planForm.get('planCuentaBuscar')?.valueChanges
      .pipe(startWith(''))
      .subscribe((val) => {
        const txt = val && typeof val === 'object' ? this.displayPlanCuenta(val) : String(val ?? '');
        this.filtrarPlan(txt);
      });

    this.form.get('idEmpresa')?.valueChanges.subscribe(() => {
      this.cargarPlanCuentas(true);
    });

    this.buscarForm.get('idConciliacionBuscar')?.valueChanges
      .pipe(startWith(''))
      .subscribe((val) => {
        const txt = val && typeof val === 'object' ? this.displayConciliacion(val) : String(val ?? '');
        this.filtrarSelector(txt);
      });

    this.form.valueChanges.subscribe(() => this.recalcularResumenes());
  }

  // =======================
  // NOTIFY
  // =======================
  private notify(message: string, type: 'success' | 'error' | 'warn' | 'info' = 'info', durationMs = 3500) {
    this.snack.open(message, 'OK', {
      duration: durationMs,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: [`snack-${type}`],
    });
  }

  // =======================
  // SELECTOR
  // =======================
  cargarSelectorConciliaciones() {
    this.loadingSelector = true;

    this.svc.getConciliacionesSelector()
      .pipe(finalize(() => (this.loadingSelector = false)))
      .subscribe({
        next: (res: ApiResponse<ConciliacionSelectorResponse[]>) => {
          this.selectorConciliaciones =
            res.type === 'success' && Array.isArray(res.data) ? (res.data ?? []) : [];
          this.selectorConciliacionesFiltradas = this.selectorConciliaciones.slice(0, 50);
        },
        error: () => {
          this.selectorConciliaciones = [];
          this.selectorConciliacionesFiltradas = [];
        },
      });
  }

  private filtrarSelector(texto: string) {
    const q = (texto ?? '').toString().trim().toLowerCase();
    if (!q) {
      this.selectorConciliacionesFiltradas = this.selectorConciliaciones.slice(0, 50);
      return;
    }

    this.selectorConciliacionesFiltradas = this.selectorConciliaciones
      .filter((x) => (
        String(x.idConciliacion ?? '').includes(q) ||
        String(x.fecconcil ?? '').includes(q) ||
        String(x.cuentaPresentacion ?? '').toLowerCase().includes(q) ||
        String(x.nombreCuenta ?? '').toLowerCase().includes(q)
      ))
      .slice(0, 50);
  }

  onConciliacionSelected(item: ConciliacionSelectorResponse) {
    if (!item?.idConciliacion) return;
    this.buscarForm.patchValue({ idConciliacionBuscar: item }, { emitEvent: false });
    this.cargarConciliacionPorId(Number(item.idConciliacion));
  }

  private cargarConciliacionPorId(id: number): void {
    if (!id || Number.isNaN(id) || id <= 0) return;

    this.loading = true;
    this.cargandoConciliacionExistente = true;

    this.svc.getConciliacionById(id)
      .pipe(finalize(() => {
        this.loading = false;
        this.cargandoConciliacionExistente = false;
      }))
      .subscribe({
        next: (res: ApiResponse<ConciliacionResponse>) => {
          if (res.type !== 'success' || !res.data) {
            this.notify(res.message ?? 'No se encontró la conciliación.', 'warn');
            return;
          }

          this.conciliacionPersistida = this.clonarConciliacion(res.data);
          this.idConciliacion = Number(res.data.idConciliacion);
          this.isLocked = true;

          this.cargarDesdeResponse(this.conciliacionPersistida);
          this.bloquearConciliacionRecuperada();
        },
        error: (error) => {
          console.error('Error recuperando conciliación:', error);
          this.conciliacionPersistida = null;
          this.notify('Error al buscar conciliación.', 'error', 5000);
        },
      });
  }

  // =======================
  // PLAN DE CUENTAS
  // =======================
  private cargarPlanCuentas(forceReset = false) {
    const idEmpresa = Number(this.form.get('idEmpresa')?.value ?? 1);

    if (forceReset) {
      this.planForm.reset({ planCuentaBuscar: null }, { emitEvent: false });
      this.form.patchValue({ idPlanCuentas: null, codprePc: null, descripcion: null }, { emitEvent: false });
      this.pendingPlanId = null;
    }

    this.loadingPlan = true;

    this.planSvc.getByCodigoEspecial4({ idEmpresa })
      .pipe(finalize(() => (this.loadingPlan = false)))
      .subscribe({
        next: (items: PlanCuenta[]) => {
          this.planCuentas = items ?? [];
          this.planCuentasFiltradas = this.planCuentas.slice(0, 50);

          if (this.pendingPlanId) {
            this.setPlanSeleccionadoPorId(this.pendingPlanId);
            this.pendingPlanId = null;
          }
        },
        error: () => {
          this.planCuentas = [];
          this.planCuentasFiltradas = [];
          this.notify('No se pudo cargar el Plan de Cuentas.', 'error', 5000);
        },
      });
  }

  private filtrarPlan(texto: string) {
    const q = (texto ?? '').toString().trim().toLowerCase();
    if (!q) {
      this.planCuentasFiltradas = this.planCuentas.slice(0, 50);
      return;
    }

    this.planCuentasFiltradas = this.planCuentas
      .filter((x) => {
        const id = String(x.IdPlanCuentas ?? '');
        const cuenta = String(x.CuentaPresentacion ?? '').toLowerCase();
        const nombre = String(x.NombreCuenta ?? x.Descripcion ?? '').toLowerCase();
        return id.includes(q) || cuenta.includes(q) || nombre.includes(q);
      })
      .slice(0, 50);
  }


  private setPlanSeleccionadoPorId(idPlan: number) {
    if (!idPlan || !this.planCuentas?.length) return;
    const found = this.planCuentas.find(p => Number(p.IdPlanCuentas) === Number(idPlan));
    if (!found) return;

    this.planForm.patchValue({ planCuentaBuscar: found }, { emitEvent: false });

    this.form.patchValue({
      idPlanCuentas: Number(found.IdPlanCuentas),
      codprePc: found.CuentaPresentacion ?? null,
      descripcion: (found.NombreCuenta ?? found.Descripcion ?? null),
    }, { emitEvent: false });
  }

  // =======================
  // TOP BOTONES
  // =======================
onNuevaConciliacion() {
  this.conciliacionPersistida = null;
  this.ultimaBusquedaConciliacionKey = '';
  this.movimientosRequestVersion++;
  this.cargandoConciliacionExistente = false;
  this.isLocked = false;
  this.idConciliacion = null;

  this.buscarForm.enable({ emitEvent: false });
  this.planForm.enable({ emitEvent: false });
  this.form.enable({ emitEvent: false });

  this.buscarForm.reset({ idConciliacionBuscar: null });

  this.planForm.reset({ planCuentaBuscar: null }, { emitEvent: false });
  this.pendingPlanId = null;

  this.form.reset({
    idEmpresa: this.getIdEmpresaActual(),
    idUsuario: this.getIdUsuarioActual(),
    saldcontini: 0,
    saldcontfin: 0,
    saldbancini: 0,
    saldbancfin: 0,
    idPlanCuentas: null,
    codprePc: null,
    descripcion: null,
    fechaInicial: this.getPrimerDiaMesActual(),
    fechaFinal: this.getUltimoDiaMesActual(),
    comentario: null,
  });

  this.form.get('saldcontini')?.disable({ emitEvent: false });
  this.form.get('saldcontfin')?.disable({ emitEvent: false });

  // limpiar grid izquierdo
  this.movimientos = [];
  this.setRowDataCompat(this.gridMovApi, []);

  // limpiar grid derecho
  this.excelRows = [];
  this.nombreArchivoExcel = '';
  this.mostrarExcel = false;

  // resetear anchos del split
  this.panelIzquierdoAncho = 1240;
  this.panelDerechoAncho = 0;

  this.setRowDataCompat(this.gridExcelApi, []);

  // limpiar saldos / resumen
  this.saldosConciliados = {
    salconini: 0,
    salcondep: 0,
    salconchq: 0,
    salconnc: 0,
    salconnd: 0,
    salconbanc: 0,
    salcondif: 0,
  };

  this.resumenRows = [
    {
      tipo: 'Conciliados',
      saldoContable: 0,
      deposito: 0,
      cheques: 0,
      notasDebito: 0,
      notasCredito: 0,
      saldoBancario: 0,
      diferencia: 0,
    },
    {
      tipo: 'No Conciliados',
      saldoContable: 0,
      deposito: 0,
      cheques: 0,
      notasDebito: 0,
      notasCredito: 0,
      saldoBancario: 0,
      diferencia: 0,
    },
  ];

  this.setRowDataCompat(this.gridSaldosApi, [this.saldosConciliados]);
  this.setRowDataCompat(this.gridResumenApi, this.resumenRows);

  setTimeout(() => {
    this.gridMovApi?.refreshCells({ force: true });
    this.gridExcelApi?.refreshCells({ force: true });
    this.gridSaldosApi?.refreshCells({ force: true });
    this.gridResumenApi?.refreshCells({ force: true });

    this.gridMovApi?.redrawRows();
    this.gridExcelApi?.redrawRows();

    this.gridMovApi?.sizeColumnsToFit();
    this.gridExcelApi?.sizeColumnsToFit();
  }, 50);

  this.recalcularResumenes();
}
  onCancelar() {
    this.onNuevaConciliacion();
  }

  onCargar() {
    if (this.isLocked || this.cargandoConciliacionExistente) {
      return;
    }

    this.cargarMovimientosDetalleDesdeMaestro();

    setTimeout(() => {
      console.log(this.debugGuardar);
    }, 500);
  }

  // =======================
  // GRID READY
  // =======================
  onGridMovReady(e: GridReadyEvent) {
    this.gridMovApi = e.api;
    if (this.movimientos?.length) this.setRowDataCompat(this.gridMovApi, this.movimientos);
  }

  onGridSaldosReady(e: GridReadyEvent) {
    this.gridSaldosApi = e.api;
    this.setRowDataCompat(this.gridSaldosApi, [this.saldosConciliados]);
  }


  onGridExcelReady(e: GridReadyEvent) {
    this.gridExcelApi = e.api;
    if (this.excelRows?.length) {
      this.setRowDataCompat(this.gridExcelApi, this.excelRows);
    }
  }
  onMovCellValueChanged(_e: CellValueChangedEvent) {
    this.recalcularResumenes();
  }

  // =======================
  // DOBLE CLIC (N° Comp)
  // =======================
  private lastClickKey = '';
  private lastClickTs = 0;

  onMovCellDoubleClicked(e: any) {
    const field = e?.colDef?.field ?? '';
    if (field !== 'nocomprobante') return;

    const numcomp = String(e?.data?.nocomprobante ?? '').trim();
    if (!numcomp) return;

    this.abrirAgruparPorComprobante(numcomp);
  }

  // fallback por si doble click no dispara
  onMovCellClicked(e: any) {
    this.ultimaFilaClickeada = e?.data ?? null;

    const field = e?.colDef?.field ?? '';

    if (field === 'concil') {
      this.toggleConcilRow(e?.data);
      return;
    }

    if (field !== 'nocomprobante') return;

    const key = `${e?.rowIndex ?? ''}:${field}`;
    const now = Date.now();

    if (this.lastClickKey === key && (now - this.lastClickTs) < 350) {
      this.lastClickKey = '';
      this.lastClickTs = 0;

      const numcomp = String(e?.data?.nocomprobante ?? '').trim();
      if (!numcomp) return;

      this.abrirAgruparPorComprobante(numcomp);
      return;
    }

    this.lastClickKey = key;
    this.lastClickTs = now;
  }

  onGridResumenReady(e: GridReadyEvent): void {
  this.gridResumenApi = e.api;

  this.setRowDataCompat(
    this.gridResumenApi,
    this.resumenRows
  );

  setTimeout(() => {
    this.ajustarGridResumen();
  }, 100);
}

ajustarGridResumen(): void {
  if (!this.gridResumenApi) {
    return;
  }

  requestAnimationFrame(() => {
    this.gridResumenApi?.sizeColumnsToFit();
    this.gridResumenApi?.refreshHeader();
    this.gridResumenApi?.refreshCells({
      force: true
    });
  });
}
  private abrirAgruparPorComprobante(numcomp: string) {
    if (this.isLocked) return;

    const rows = this.getMovimientosActuales()
      .filter(r => String((r as any).nocomprobante ?? '').trim() === String(numcomp).trim());

    if (rows.length === 0) {
      this.notify(`No existe el comprobante ${numcomp}.`, 'warn');
      return;
    }

    const ref = this.dialog.open(ConciliacionAgruparDialogComponent, {
      width: '1100px',
      maxWidth: '98vw',
      disableClose: true,
      data: {
        numcomp,
        items: rows.map((r: any) => ({
          idDetMaestro: Number(r.idDetMaestro),
          linea: Number(r.linea ?? 0),
          fechatran: r.fechatran ?? null,
          movbancario: r.movbancario ?? null,
          nocomprobante: r.nocomprobante ?? null,
          cheque: this.num(r.cheque),
          debito: this.num(r.debito),
          credito: this.num(r.credito),
          numdoc: r.numdoc ?? null,
          beneficiario: r.beneficiario ?? null,
          tipdoc: r.tipdoc ?? null,
          concil: this.isChecked(r.concil) ? 'C' : 'N',
        })),
      },
    });

    ref.afterClosed().subscribe((result: any) => {
      if (this.isLocked) return;
      if (!result?.updates?.length) return;

      const map = new Map<number, 'C' | 'N'>();
      for (const u of result.updates) {
        map.set(Number(u.idDetMaestro), u.concil);
      }

      const isoS = this.getFechaConcilDefaultIso();

      if (this.gridMovApi) {
        this.gridMovApi.forEachNode((n) => {
          if (!n.data) return;

          const id = Number((n.data as any).idDetMaestro);
          if (!map.has(id)) return;

          const concil = map.get(id)!;
          (n.data as any).concil = concil;
          (n.data as any).fechaconcil = concil === 'C' ? isoS : null;
        });

        this.gridMovApi.refreshCells({
          force: true,
          columns: ['concil', 'fechaconcil'],
        });

        this.recalcularResumenes();
      }
    });
  }
  // =======================
  // CARGAR DESDE RESPONSE (TOTAL => bloqueado)
  // =======================
  private cargarDesdeResponse(c: ConciliacionResponse): void {
    const rango = this.obtenerRangoDesdeConciliacion(c);

    this.form.patchValue({
      idPlanCuentas: this.num(c.idPlanCuentas),
      codprePc: c.codprePc ?? null,
      descripcion: c.descripcion ?? null,
      fechaInicial: rango.fechaInicial,
      fechaFinal: rango.fechaFinal,
      saldcontini: this.num(c.saldcontini),
      saldcontfin: this.num(c.saldcontfin),
      saldbancini: this.num(c.saldbancini),
      saldbancfin: this.num(c.saldbancfin),
      comentario: c.comentario ?? null,
      idEmpresa: this.num(c.idEmpresa),
      idUsuario: this.num(c.idUsuario),
    }, { emitEvent: false });

    const idPlan = Number(c.idPlanCuentas ?? 0);
    if (this.planCuentas?.length) {
      this.setPlanSeleccionadoPorId(idPlan);
    } else {
      this.pendingPlanId = idPlan;
    }

    this.movimientos = (c.detalles ?? [])
      .filter((d: any) => this.isChecked(d?.concil))
      .map((d: any, index: number) => {
        const conciliado = this.isChecked(d?.concil);

        return {
          ...d,
          idDetMaestro: this.num(d?.idDetMaestro ?? d?.id_det_maestro),
          linea: this.num(d?.linea) || index + 1,
          idMovBancario: d?.idMovBancario ?? d?.id_mov_bancario ?? null,
          movbancario: d?.movbancario ?? d?.movBancario ?? null,
          nocomprobante: d?.nocomprobante ?? d?.noComprobante ?? null,
          fechatran: d?.fechatran ? this.normalizeIsoString(d.fechatran) : null,
          cheque: this.num(d?.cheque),
          debito: this.num(d?.debito),
          credito: this.num(d?.credito),
          concil: conciliado ? 'C' : 'N',
          fechaconcil: conciliado && d?.fechaconcil
            ? this.normalizeIsoString(d.fechaconcil)
            : null,
          beneficiario: d?.beneficiario ?? null,
          numdoc: d?.numdoc != null ? String(d.numdoc) : null,
          tipdoc: d?.tipdoc ?? null,
          matchExcel: false,
        } as MovimientoRow;
      })
      .sort((a: any, b: any) => this.num(a.linea) - this.num(b.linea));

    this.saldosConciliados = {
      salconini: this.r2((c as any).salconini),
      salcondep: this.r2((c as any).salcondep),
      salconchq: this.r2((c as any).salconchq),
      salconnc: this.r2((c as any).salconnc),
      salconnd: this.r2((c as any).salconnd),
      salconbanc: this.r2((c as any).salconbanc),
      salcondif: 0,
    };

    this.resumenRows = [
      {
        tipo: 'Conciliados',
        saldoContable: 0,
        deposito: this.r2((c as any).salconcidep),
        cheques: this.r2((c as any).salconcichq),
        notasDebito: this.r2((c as any).salconcind),
        notasCredito: this.r2((c as any).salconcinc),
        saldoBancario: 0,
        diferencia: 0,
      },
      {
        tipo: 'No Conciliados',
        saldoContable: this.r2((c as any).salconcini),
        deposito: this.r2((c as any).salconcdep),
        cheques: this.r2((c as any).salconcchq),
        notasDebito: this.r2((c as any).salconcnd),
        notasCredito: this.r2((c as any).salconcnc),
        saldoBancario: this.r2((c as any).salconcbanc),
        diferencia: this.r2((c as any).salconcdif),
      },
    ];

    this.setRowDataCompat(this.gridMovApi, this.movimientos);
    this.setRowDataCompat(this.gridSaldosApi, [this.saldosConciliados]);
    this.setRowDataCompat(this.gridResumenApi, this.resumenRows);

    setTimeout(() => {
      this.gridMovApi?.refreshCells({ force: true });
      this.gridSaldosApi?.refreshCells({ force: true });
      this.gridResumenApi?.refreshCells({ force: true });
      this.gridMovApi?.redrawRows();
      this.gridSaldosApi?.redrawRows();
      this.gridResumenApi?.redrawRows();
    });
  }
  // =======================
  // MOVIMIENTOS MAESTRO (EN PROCESO)
  // =======================
  cargarMovimientosDetalleDesdeMaestro() {
    if (this.isLocked || this.cargandoConciliacionExistente) return;

    const requestVersion = ++this.movimientosRequestVersion;
    const idPlan = Number(this.form.get('idPlanCuentas')?.value);
    const fIni: Date | null = this.form.get('fechaInicial')?.value ?? null;
    const fFin: Date | null = this.form.get('fechaFinal')?.value ?? null;

    if (!idPlan || idPlan <= 0) {
      this.notify('Seleccione un Plan de Cuenta.', 'warn');
      return;
    }

    if (!fIni || !fFin) {
      this.notify('Ingrese Fecha Inicial y Fecha Final.', 'warn');
      return;
    }

    const fechaInicio = this.toYmd(fIni);
    const fechaFin = this.toYmd(fFin);

    this.loading = true;

    const codprePc = String(this.form.get('codprePc')?.value ?? '').trim();
    const requestKey = `${idPlan}|${codprePc}|${fechaInicio}|${fechaFin}`;

    this.svc.getMovimientosMaestro(
      idPlan,
      codprePc,
      fechaInicio,
      fechaFin
    )
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res) => {
          const idPlanActual = Number(this.form.get('idPlanCuentas')?.value);
          const codpreActual = String(this.form.get('codprePc')?.value ?? '').trim();
          const fIniActual = this.form.get('fechaInicial')?.value as Date | null;
          const fFinActual = this.form.get('fechaFinal')?.value as Date | null;
          const currentRequestKey = fIniActual && fFinActual
            ? `${idPlanActual}|${codpreActual}|${this.toYmd(fIniActual)}|${this.toYmd(fFinActual)}`
            : '';

          if (
            requestVersion !== this.movimientosRequestVersion ||
            requestKey !== currentRequestKey ||
            this.isLocked ||
            this.cargandoConciliacionExistente
          ) {
            return;
          }

          if (res.type !== 'success' || !Array.isArray(res.data)) {
            this.notify(
              res.message ?? 'No se pudo cargar movimientos.',
              'error',
              5000
            );

            this.movimientos = [];
            this.setRowDataCompat(this.gridMovApi, []);
            this.recalcularResumenes();
            return;
          }

          console.log('Movimientos recibidos:', {
            idPlan,
            codprePc,
            fechaInicio,
            fechaFin,
            cantidad: res.data.length,
            response: res,
          });

          if (res.data.length === 0) {
            this.movimientos = [];
            this.setRowDataCompat(this.gridMovApi, []);
            this.recalcularResumenes();

            this.notify(
              `La API no devolvió movimientos para ${fechaInicio} hasta ${fechaFin}.`,
              'warn',
              5000
            );

            return;
          }

          this.movimientos = res.data.map((m: any, idx: number) => {
            const estadoRaw =
              m.conciliado ??
              m.conciliadoDb ??
              m.concil ??
              m.estado ??
              m.estadoConcil ??
              m.conciliacion ??
              null;

            const estado = String(estadoRaw ?? '').toUpperCase().trim();
            const marcado =
              estado === 'P' ||
              estado === 'C' ||
              estado === 'S' ||
              estado === '1' ||
              estado === 'TRUE';

            const fechaConcRaw =
              m.fechaConciliado ??
              m.fechaconciliado ??
              m.fechaConcil ??
              m.fechaconcil ??
              null;

            const fechaConcIso = fechaConcRaw
              ? this.normalizeIsoString(fechaConcRaw)
              : null;

            return {
              idDetMaestro: m.idDetMaestro,
              linea: idx + 1,
              fechatran: m.fechaTransaccion ? this.normalizeIsoString(m.fechaTransaccion) : null,
              idMovBancario: m.idMovBancario,
              movbancario: m.movBancario,
              nocomprobante: m.noComprobante,
              cheque: m.cheque ?? 0,
              debito: m.debe ?? 0,
              credito: m.haber ?? 0,
              concil: marcado ? 'C' : 'N',
              fechaconcil: marcado ? fechaConcIso : null,
              beneficiario: m.beneficiario,
              numdoc: m.numdoc != null ? String(m.numdoc) : null,
              tipdoc: m.tipdoc,
            } as any;
          });

          this.setRowDataCompat(this.gridMovApi, this.movimientos);
          this.gridMovApi?.refreshCells({ force: true, columns: ['fechaconcil', 'concil'] });
          this.recalcularResumenes();
        },
        error: () => {
          this.notify('Error llamando movimientos-maestro.', 'error', 5000);
          this.movimientos = [];
          this.setRowDataCompat(this.gridMovApi, []);
          this.recalcularResumenes();
        },
      });
  }

  // =======================
  // GUARDAR PARCIAL (VB6: marca DetalleMaestro = 'P')
  // =======================
  onGuardarParcial() {
    if (!this.canGuardarParcial) return;

    const rows = this.getMovimientosActuales();
    if (!rows.length) {
      this.notify('No hay movimientos cargados para guardar parcial.', 'warn');
      return;
    }

    const fechaconcil = new Date();

    const payload: GuardarConciliacionParcialRequest = {
      fechaconcil,
      detalles: rows.map((r: any) => ({
        idDetMaestro: Number(r.idDetMaestro),
        concil: (r.concil === 'C' ? 'S' : 'N') as 'N' | 'S',
      }))
    };

    this.loading = true;

    this.svc.guardarParcial(payload)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res) => {
          if (res.type === 'success') {
            this.notify(res.message ?? 'Guardado parcial OK.', 'success', 4500);
            this.cargarMovimientosDetalleDesdeMaestro();
          } else {
            this.notify(res.message ?? 'No se pudo guardar parcial.', 'error', 5000);
          }
        },
        error: () => this.notify('Error al guardar parcial.', 'error', 5000),
      });
  }

  // =======================
  // GUARDAR TOTAL (VB6: crea cabecera + detalle y bloquea)
  // =======================

  onGuardarTotal() {
    console.log(this.debugGuardar);

    if (!this.canAbrirMenuGuardar || this.isLocked) {
      this.notify('No se puede grabar la conciliación total.', 'warn');
      return;
    }

    if (!this.esConciliacionCuadrada()) {
      this.notify('No se puede grabar una conciliación total con diferencias.', 'warn');
      return;
    }

    const rows = this.getMovimientosActuales();

    if (!rows.length) {
      this.notify('Debe existir al menos un movimiento.', 'warn');
      return;
    }

    const validacionMensual = this.validarRangoMensualCompleto();
    if (!validacionMensual.ok) {
      this.notify(validacionMensual.mensaje, 'warn', 5000);
      return;
    }

    const cab = this.form.getRawValue();
    const periodo = cab.fechaInicial ? this.getPeriodoDesdeFecha(cab.fechaInicial) : '';
    const cuenta = String(cab.codprePc ?? '').trim();
    const descripcion = String(cab.descripcion ?? '').trim();

    this.dialog.open(CustomMessageBoxComponent, {
      width: '420px',
      data: {
        title: 'Confirmar conciliación total',
        message:
          `Se grabará la conciliación total.\n\n` +
          `Cuenta: ${cuenta || '(sin cuenta)'}\n` +
          `Periodo: ${periodo || '(sin período)'}\n` +
          `Descripción: ${descripcion || '(sin descripción)'}\n\n` +
          `¿Está seguro de continuar?`,
        type: 'info',
        confirmText: 'Sí, grabar',
        cancelText: 'Cancelar',
        showCancel: true
      }
    }).afterClosed().subscribe(confirmado => {
      if (!confirmado) {
        console.log('❌ Conciliación total cancelada por el usuario');
        return;
      }

      const payload = this.buildRequestFromUI();

      this.loading = true;

      this.svc.crearConciliacion(payload)
        .pipe(finalize(() => this.loading = false))
        .subscribe({
          next: (res) => {
            if (res.type === 'success') {
              this.idConciliacion = Number(res.data);
              this.isLocked = true;

              this.gridMovApi?.refreshCells({ force: true });
              this.gridMovApi?.redrawRows();

              if (this.idConciliacion > 0) {
                this.cargarConciliacionPorId(this.idConciliacion);
              }

              this.notify('Conciliación TOTAL guardada correctamente', 'success');
            } else {
              this.notify(res.message || 'Error al guardar', 'error');
            }
          },
          error: () => this.notify('Error al guardar conciliación', 'error')
        });
    });
  }
  // =======================
  // FILTROS GRID
  // =======================
  aplicarFiltros() {
    if (!this.gridMovApi) return;
    const q = [
      this.filtroTipMov,
      this.filtroValor,
      this.filtroCheque,
      this.filtroComprobante,
      this.filtroDocumento,
    ].filter(Boolean).join(' ');
    this.setQuickFilterCompat(this.gridMovApi, q);
  }

  limpiarFiltros() {
    this.filtroTipMov = '';
    this.filtroValor = '';
    this.filtroCheque = '';
    this.filtroComprobante = '';
    this.filtroDocumento = '';
    this.aplicarFiltros();
  }

  // =======================
  // MARCAR / DESMARCAR
  // =======================
  marcarTodos() {
    if (this.isLocked) return;
    this.setConcilMasivo(true);
  }

  desmarcarTodos() {
    if (this.isLocked) return;
    this.setConcilMasivo(false);
  }

  private setConcilMasivo(checked: boolean) {
    if (this.isLocked || !this.gridMovApi) return;

    const iso = checked ? this.getFechaConcilDefaultIso() : null;

    this.gridMovApi.forEachNode((n) => {
      if (!n.data) return;

      (n.data as any).concil = checked ? 'C' : 'N';
      (n.data as any).fechaconcil = iso;

      // al desmarcar masivo, quitar color verde
      if (!checked) {
        (n.data as any).matchExcel = false;
      }
    });

    this.gridMovApi.refreshCells({
      force: true,
      columns: ['concil', 'fechaconcil'],
    });

    this.gridMovApi.redrawRows();

    this.recalcularResumenes();
  }
  // =======================
  // RECALCULOS
  // =======================
  private getMovimientosActuales(): MovimientoRow[] {
    if (!this.gridMovApi) return this.movimientos ?? [];

    const rows: MovimientoRow[] = [];
    this.gridMovApi.forEachNode((n) => {
      if (n.data) rows.push(n.data as MovimientoRow);
    });

    return rows;
  }
  private recalcularResumenes(): void {
    if (this.esConciliacionGuardada) return;
    const cab = this.form.getRawValue();
    const rows = this.getMovimientosActuales();

    const fechaInicial = this.form.get('fechaInicial')?.value as Date | null;
    const fechaFinal = this.form.get('fechaFinal')?.value as Date | null;

    const rowsDentroPeriodo = rows.filter(r =>
      this.estaDentroDelPeriodo(
        (r as any).fechatran,
        fechaInicial,
        fechaFinal
      )
    );

    const conc = rowsDentroPeriodo.filter(r => this.isChecked((r as any).concil));
    const no = rowsDentroPeriodo.filter(r => !this.isChecked((r as any).concil));

    const sConc = this.sumPorTipo(conc);
    const sNo = this.sumPorTipo(no);

    // ============================
    // GRILLA SUPERIOR: SALDOS CONCILIADOS
    // ============================
    const salconini = this.num(cab.saldcontini);
    const salconbanc = this.num(cab.saldbancini);

    const salcondep = sConc.deposito;
    const salconchq = sConc.cheques;
    const salconnd = sConc.notasDebito;
    const salconnc = sConc.notasCredito;

    const salcondif = this.r2(
      salconini + salcondep - salconchq - salconnd + salconnc - salconbanc
    );

    this.saldosConciliados = {
      salconini: this.r2(salconini),
      salcondep: this.r2(salcondep),
      salconchq: this.r2(salconchq),
      salconnc: this.r2(salconnc),
      salconnd: this.r2(salconnd),
      salconbanc: this.r2(salconbanc),
      salcondif: this.r2(salcondif),
    };

    this.setRowDataCompat(this.gridSaldosApi, [this.saldosConciliados]);

    // ============================
    // GRILLA INFERIOR: SALDOS POR CONCILIAR
    // ============================
    const rowConc: ResumenRow = {
      tipo: 'Conciliados',
      saldoContable: 0,
      deposito: this.r2(sConc.deposito),
      cheques: this.r2(sConc.cheques),
      notasDebito: this.r2(sConc.notasDebito),
      notasCredito: this.r2(sConc.notasCredito),
      saldoBancario: 0,
      diferencia: 0,
    };

    const saldoContNo = this.num(cab.saldcontfin);
    const saldoBancNo = this.num(cab.saldbancfin);

    const totalContableNo = this.r2(
      saldoContNo + (-sNo.deposito + sNo.cheques - sNo.notasDebito + sNo.notasCredito)
    );

    const rowNo: ResumenRow = {
      tipo: 'No Conciliados',
      saldoContable: this.r2(saldoContNo),
      deposito: this.r2(sNo.deposito),
      cheques: this.r2(sNo.cheques),
      notasDebito: this.r2(sNo.notasDebito),
      notasCredito: this.r2(sNo.notasCredito),
      saldoBancario: this.r2(saldoBancNo),
      diferencia: this.r2(totalContableNo - saldoBancNo),
    };

    this.resumenRows = [rowConc, rowNo];
    this.setRowDataCompat(this.gridResumenApi, this.resumenRows);

    this.gridMovApi?.refreshCells({ force: true });
    this.gridSaldosApi?.refreshCells({ force: true });
    this.gridResumenApi?.refreshCells({ force: true });
  }
  private sumPorTipo(rows: MovimientoRow[]) {
    let deposito = 0;
    let cheques = 0;
    let notasDebito = 0;
    let notasCredito = 0;

    for (const r of rows) {
      const tipo = String((r as any)?.movbancario ?? '').toUpperCase().trim();
      const debito = this.num((r as any)?.debito);
      const credito = this.num((r as any)?.credito);

      // DP
      if (tipo === 'DP') {
        deposito += debito;
        continue;
      }

      // CH / TB
      if (tipo === 'CH' || tipo === 'TB') {
        cheques += credito;
        continue;
      }

      // ND
      if (tipo === 'ND') {
        if (credito !== 0) notasCredito += credito;
        if (debito !== 0) notasDebito += debito;
        continue;
      }

      // NC
      if (tipo === 'NC') {
        notasDebito += debito;
        continue;
      }
    }

    return {
      deposito: this.r2(deposito),
      cheques: this.r2(cheques),
      notasDebito: this.r2(notasDebito),
      notasCredito: this.r2(notasCredito),
    };
  }

  // VB6: no permitir TOTAL si hay diferencias
  private esConciliacionCuadrada(): boolean {
    if (!this.resumenRows || this.resumenRows.length === 0) return false;

    return this.resumenRows.every(row => Math.abs(this.num(row.diferencia)) < 0.01);
  }

  // =======================
  // REQUEST TOTAL
  // =======================
  private buildRequestFromUI(): UpdateConciliacionRequest {
    const cab = this.form.getRawValue();
    const rows = this.getMovimientosActuales();

    // =========================================================
    // 1) PERIODO CONCILIADO => fecconcil (yyyyMM)
    //    Debe salir de la fecha del período, NO de la fecha actual
    // =========================================================
    const fechaPeriodo: Date =
      cab.fechaInicial instanceof Date && !isNaN(cab.fechaInicial.getTime())
        ? cab.fechaInicial
        : cab.fechaFinal instanceof Date && !isNaN(cab.fechaFinal.getTime())
          ? cab.fechaFinal
          : new Date();

    const fecconcil = this.getPeriodoDesdeFecha(fechaPeriodo); // ej: 202601

    // =========================================================
    // 2) FECHA REAL DE CONCILIACION => fechaconcil
    //    Debe ser la fecha en la que se está guardando la conciliación
    // =========================================================
    const fechaconcilReal = new Date();

    // Si quieres mandar fecha sin hora:
    // const fechaconcilReal = this.dateOnly(new Date());

    // =========================================================
    // 3) DETALLES
    // =========================================================
    const detalles: CreateConciliacionDetalleRequest[] = rows.map((d, idx) => {
      const checked = this.isChecked((d as any).concil);
      const concil = checked ? 'C' : 'N';

      return {
        idDetMaestro: Number((d as any).idDetMaestro),
        linea: (d as any).linea ?? (idx + 1),

        fechatran: this.toDateOrNull((d as any).fechatran),
        idMovBancario: (d as any).idMovBancario ?? null,
        movbancario: (d as any).movbancario ?? null,
        nocomprobante: (d as any).nocomprobante ?? null,

        cheque: this.num((d as any).cheque),
        debito: this.num((d as any).debito),
        credito: this.num((d as any).credito),

        concil,

        // IMPORTANTE:
        // la fecha del detalle conciliado debe ser la fecha REAL de conciliación
        // NO fechaInicial ni fechaFinal del período
        fechaconcil: checked ? fechaconcilReal : null,

        beneficiario: (d as any).beneficiario ?? null,
        numdoc: (d as any).numdoc ?? null,
        tipdoc: (d as any).tipdoc ?? null,
      };
    });

    // =========================================================
    // 4) RESUMENES
    // =========================================================
    const concRow = this.resumenRows.find((x) => x.tipo === 'Conciliados')!;
    const noRow = this.resumenRows.find((x) => x.tipo === 'No Conciliados')!;

    // =========================================================
    // 5) REQUEST FINAL
    // =========================================================
    return {
      // NUEVO CAMPO QUE TU BACKEND YA VA A ESPERAR
      fecconcil,                  // ej: "202601"

      // FECHA REAL EN QUE SE HACE LA CONCILIACION
      fechaconcil: fechaconcilReal,

      idPlanCuentas: Number(cab.idPlanCuentas),
      codprePc: cab.codprePc ?? null,
      descripcion: cab.descripcion ?? null,

      saldcontini: this.num(cab.saldcontini),
      saldcontfin: this.num(cab.saldcontfin),
      saldbancini: this.num(cab.saldbancini),
      saldbancfin: this.num(cab.saldbancfin),

      salconini: this.num(this.saldosConciliados.salconini),
      salcondep: this.num(this.saldosConciliados.salcondep),
      salconchq: this.num(this.saldosConciliados.salconchq),
      salconnc: this.num(this.saldosConciliados.salconnc),
      salconnd: this.num(this.saldosConciliados.salconnd),
      salconbanc: this.num(this.saldosConciliados.salconbanc),
      salcondif: 0,

      salconcidep: this.num(concRow.deposito),
      salconcichq: this.num(concRow.cheques),
      salconcinc: this.num(concRow.notasCredito),
      salconcind: this.num(concRow.notasDebito),

      salconcini: this.num(noRow.saldoContable),
      salconcdep: this.num(noRow.deposito),
      salconcchq: this.num(noRow.cheques),
      salconcnc: this.num(noRow.notasCredito),
      salconcnd: this.num(noRow.notasDebito),
      salconcbanc: this.num(noRow.saldoBancario),
      salconcdif: this.num(noRow.diferencia),

      comentario: cab.comentario ?? null,
      idEmpresa: Number(cab.idEmpresa),
      idUsuario: Number(cab.idUsuario),

      detalles,
    } as UpdateConciliacionRequest;
  }

  private toDateOrNull(value: any): Date | null {
    return this.parseFechaFlexible(value);
  }

  private dateOnly(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  // =======================
  // HELPERS
  // =======================
  private isChecked(v: any): boolean {
    const s = String(v ?? '').toUpperCase().trim();
    return s === 'C' || s === 'S' || s === 'P' || s === 'TRUE' || s === '1';
  }

  private num(v: any): number {
    const n = Number(v ?? 0);
    return Number.isFinite(n) ? n : 0;
  }

  private r2(v: any): number {
    const n = this.num(v);
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  private isoToDate(iso: string): Date | null {
    return this.parseBackendDate(iso);
  }

  private setRowDataCompat(api: GridApi | undefined, rowData: any[]) {
    if (!api) return;
    const a = api as any;
    if (typeof a.setGridOption === 'function') { a.setGridOption('rowData', rowData); return; }
    if (typeof a.updateGridOptions === 'function') { a.updateGridOptions({ rowData }); return; }
    if (typeof a.setRowData === 'function') { a.setRowData(rowData); return; }
  }

  private setQuickFilterCompat(api: GridApi | undefined, text: string) {
    if (!api) return;
    const a = api as any;
    if (typeof a.setGridOption === 'function') { a.setGridOption('quickFilterText', text); return; }
    if (typeof a.setQuickFilter === 'function') { a.setQuickFilter(text); return; }
  }

  private toYmd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private toIsoLocalStartOfDay(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}T00:00:00`;
  }

  private normalizeIsoString(v: any): string {
    if (v == null) return '';
    if (v instanceof Date) return this.toIsoLocalStartOfDay(v);
    const s = String(v);
    if (s.includes('T')) return s;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T00:00:00`;
    return s;
  }

  private getFechaConcilDefaultIso(): string {
    return this.toIsoLocalStartOfDay(new Date());
  }
  private pad2(n: number): string {
    return String(n).padStart(2, '0');
  }

  private formatDdMmYyyy(value: any): string {
    if (value == null || value === '') return '';

    // Si viene "YYYY-MM-DDTHH:mm:ss"
    const s = String(value);
    const dt = new Date(s);

    if (Number.isNaN(dt.getTime())) {
      // fallback por si viene "YYYY-MM-DD"
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const [y, m, d] = s.split('-');
        return `${d}/${m}/${y}`;
      }
      return s;
    }

    const d = this.pad2(dt.getDate());
    const m = this.pad2(dt.getMonth() + 1);
    const y = dt.getFullYear();
    return `${d}/${m}/${y}`;
  }
  private formatearFechaDdMmYyyy(fecha: Date | null | undefined): string {
    if (!fecha || !(fecha instanceof Date) || isNaN(fecha.getTime())) return '';
    const dd = String(fecha.getDate()).padStart(2, '0');
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const yyyy = fecha.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  private puedeConsultarSaldosIniciales(): boolean {
    const codprePc = String(this.form.get('codprePc')?.value ?? '').trim();
    const fechaInicial = this.form.get('fechaInicial')?.value as Date | null;

    return !!codprePc && !!fechaInicial && fechaInicial instanceof Date && !isNaN(fechaInicial.getTime());
  }

  private puedeConsultarSaldosFinales(): boolean {
    const codprePc = String(this.form.get('codprePc')?.value ?? '').trim();
    const fechaFinal = this.form.get('fechaFinal')?.value as Date | null;

    return !!codprePc && !!fechaFinal && fechaFinal instanceof Date && !isNaN(fechaFinal.getTime());
  }

  onBlurDatosCabecera(): void {
    if (this.isLocked) return;

    this.cargarSaldoContableInicial();
    this.cargarSaldoContableFinal();
    this.intentarBuscarConciliacionExistente();
  }
  private buscarConciliacionExistente(): void {
    const codprePc = String(
      this.form.get('codprePc')?.value ?? ''
    ).trim();

    const fechaInicial =
      this.form.get('fechaInicial')?.value as Date | null;

    if (
      !codprePc ||
      !fechaInicial ||
      !(fechaInicial instanceof Date) ||
      isNaN(fechaInicial.getTime())
    ) {
      return;
    }

    const fecconcil =
      this.getPeriodoDesdeFecha(fechaInicial);

    const currentKey =
      `${codprePc}|${fecconcil}`;

    if (
      this.ultimaBusquedaConciliacionKey === currentKey &&
      this.cargandoConciliacionExistente
    ) {
      return;
    }

    this.ultimaBusquedaConciliacionKey = currentKey;
    this.cargandoConciliacionExistente = true;

    // Invalida cualquier consulta anterior de movimientos.
    this.movimientosRequestVersion++;

    this.svc
      .getConciliacionByPeriodoCuenta(codprePc, fecconcil)
      .pipe(
        finalize(() => {
          if (this.ultimaBusquedaConciliacionKey === currentKey) {
            this.cargandoConciliacionExistente = false;
          }
        })
      )
      .subscribe({
        next: (res) => {
          if (this.ultimaBusquedaConciliacionKey !== currentKey) {
            return;
          }

          if (res.type === 'success' && res.data) {
            this.conciliacionPersistida = this.clonarConciliacion(res.data);
            this.idConciliacion = Number(res.data.idConciliacion);
            this.isLocked = true;

            this.cargarDesdeResponse(this.conciliacionPersistida);
            this.bloquearConciliacionRecuperada();

            this.notify(
              'La conciliación ya existe. Se cargó en modo consulta.',
              'info'
            );

            return;
          }

          this.prepararPeriodoNuevo(currentKey);
        },

        error: (error) => {
          if (this.ultimaBusquedaConciliacionKey !== currentKey) {
            return;
          }

          const status = Number(error?.status ?? 0);

          if (status === 404) {
            this.prepararPeriodoNuevo(currentKey);
            return;
          }

          console.error('Error buscando conciliación existente:', error);

          this.conciliacionPersistida = null;
          this.idConciliacion = null;
          this.isLocked = false;

          this.notify(
            'No se pudo verificar si existe una conciliación para el período seleccionado.',
            'error',
            5000
          );
        }
      });
  }

  private prepararPeriodoNuevo(requestKey: string): void {
    if (this.ultimaBusquedaConciliacionKey !== requestKey) {
      return;
    }

    this.conciliacionPersistida = null;
    this.idConciliacion = null;
    this.isLocked = false;

    this.form.enable({ emitEvent: false });
    this.planForm.enable({ emitEvent: false });

    this.form.get('saldcontini')?.disable({ emitEvent: false });
    this.form.get('saldcontfin')?.disable({ emitEvent: false });

    this.movimientos = [];
    this.setRowDataCompat(this.gridMovApi, []);

    this.saldosConciliados = {
      salconini: 0,
      salcondep: 0,
      salconchq: 0,
      salconnc: 0,
      salconnd: 0,
      salconbanc: 0,
      salcondif: 0,
    };

    this.resumenRows = [
      {
        tipo: 'Conciliados',
        saldoContable: 0,
        deposito: 0,
        cheques: 0,
        notasDebito: 0,
        notasCredito: 0,
        saldoBancario: 0,
        diferencia: 0,
      },
      {
        tipo: 'No Conciliados',
        saldoContable: 0,
        deposito: 0,
        cheques: 0,
        notasDebito: 0,
        notasCredito: 0,
        saldoBancario: 0,
        diferencia: 0,
      },
    ];

    this.setRowDataCompat(this.gridSaldosApi, [this.saldosConciliados]);
    this.setRowDataCompat(this.gridResumenApi, this.resumenRows);

    this.cargarSaldoContableInicial();
    this.cargarSaldoContableFinal();

    setTimeout(() => {
      if (
        !this.isLocked &&
        this.ultimaBusquedaConciliacionKey === requestKey
      ) {
        this.cargarMovimientosDetalleDesdeMaestro();
      }
    }, 0);
  }

  private getPeriodoDesdeFecha(fecha: Date): string {
    const yyyy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    return `${yyyy}${mm}`;
  }
  private cargarSaldoContableInicial(): void {
    if (!this.puedeConsultarSaldosIniciales()) return;

    const codprePc = String(this.form.get('codprePc')?.value ?? '').trim();
    const fechaInicial = this.form.get('fechaInicial')?.value as Date;
    const fechaCorte = this.formatearFechaDdMmYyyy(fechaInicial);

    this.svc.getSaldoContableInicial(codprePc, fechaCorte).subscribe({
      next: (res) => {
        if (res.type === 'success' && res.data) {
          const saldo = Number(res.data.saldoContableInicial ?? 0);

          this.form.patchValue(
            { saldcontini: this.r2(saldo) },
            { emitEvent: true }
          );
        } else {
          this.form.patchValue(
            { saldcontini: 0 },
            { emitEvent: true }
          );
        }
      },
      error: () => {
        this.form.patchValue(
          { saldcontini: 0 },
          { emitEvent: true }
        );
      }
    });
  }

  private cargarSaldoContableFinal(): void {
    if (!this.puedeConsultarSaldosFinales()) return;

    const codprePc = String(this.form.get('codprePc')?.value ?? '').trim();
    const fechaFinal = this.form.get('fechaFinal')?.value as Date;
    const fechaCorte = this.formatearFechaDdMmYyyy(fechaFinal);

    this.svc.getTotalesContablesHastaFecha(codprePc, fechaCorte).subscribe({
      next: (res) => {
        if (res.type === 'success' && res.data) {
          // SOLO EL SALDO
          const saldoFinal = Number(res.data.saldo ?? 0);

          this.form.patchValue(
            { saldcontfin: this.r2(saldoFinal) },
            { emitEvent: true }
          );
        } else {
          this.form.patchValue(
            { saldcontfin: 0 },
            { emitEvent: true }
          );
        }
      },
      error: () => {
        this.form.patchValue(
          { saldcontfin: 0 },
          { emitEvent: true }
        );
      }
    });
  }
  private toggleConcilRow(row: any): void {
    if (!row || this.isLocked) return;

    const actual = String(row.concil ?? 'N').toUpperCase();
    const nuevoEsCheck = actual !== 'C';

    row.concil = nuevoEsCheck ? 'C' : 'N';
    row.fechaconcil = nuevoEsCheck ? this.getFechaConcilDefaultIso() : null;

    // si se desmarca, quitar verde
    if (!nuevoEsCheck) {
      row.matchExcel = false;
    }

    this.gridMovApi?.refreshCells({
      force: true,
      columns: ['concil', 'fechaconcil'],
    });

    this.gridMovApi?.redrawRows();

    this.recalcularResumenes();
  }
  get debugGuardar(): any {
    return {
      loading: this.loading,
      isLocked: this.isLocked,
      formValid: this.form.valid,
      invalidControls: Object.keys(this.form.controls).filter(k => this.form.get(k)?.invalid),
      movimientos: this.getMovimientosActuales().length,
      cuadrada: this.esConciliacionCuadrada(),
      canAbrirMenuGuardar: this.canAbrirMenuGuardar,
      canGuardarTotal: this.canGuardarTotal
    };
  }
  private escucharCambiosParaBuscarConciliacion(): void {
    this.form.get('codprePc')?.valueChanges.subscribe(() => {
      this.intentarBuscarConciliacionExistente();
    });

    this.form.get('fechaInicial')?.valueChanges.subscribe(() => {
      this.intentarBuscarConciliacionExistente();
    });
  }

  private intentarBuscarConciliacionExistente(): void {
    const codprePc = String(this.form.get('codprePc')?.value ?? '').trim();
    const fechaInicial = this.form.get('fechaInicial')?.value as Date | null;

    if (!codprePc) return;
    if (!fechaInicial || isNaN(fechaInicial.getTime())) return;

    this.buscarConciliacionExistente();
  }
  onPlanCuentaSelected(item: PlanCuenta) {
    if (!item?.IdPlanCuentas) return;

    this.planForm.patchValue(
      { planCuentaBuscar: item },
      { emitEvent: false }
    );

    this.form.patchValue(
      {
        idPlanCuentas: Number(item.IdPlanCuentas),
        codprePc: item.CuentaPresentacion ?? null,
        descripcion: item.NombreCuenta ?? item.Descripcion ?? null,
      },
      { emitEvent: true }
    );

    this.intentarBuscarConciliacionExistente();
  }
  onAgrupar(): void {
    if (this.isLocked) return;

    let numcomp = '';

    // 1) Primero intenta con fila seleccionada del grid
    const seleccionadas = this.gridMovApi?.getSelectedRows?.() ?? [];
    if (seleccionadas.length > 0) {
      numcomp = String(seleccionadas[0]?.nocomprobante ?? '').trim();
    }

    // 2) Si no hay fila seleccionada, usa la última fila clickeada
    if (!numcomp && this.ultimaFilaClickeada) {
      numcomp = String(this.ultimaFilaClickeada?.nocomprobante ?? '').trim();
    }

    // 3) Si todavía no hay comprobante, usa filtroComprobante si lo tienes cargado
    if (!numcomp) {
      numcomp = String(this.filtroComprobante ?? '').trim();
    }

    if (!numcomp) {
      this.notify('Seleccione una fila o indique un N° Comprobante para agrupar.', 'warn');
      return;
    }

    this.abrirAgruparPorComprobante(numcomp);
  }
  private getIdEmpresaActual(): number {
    return Number(this.usuarioActual?.id_empresa ?? 1);
  }

  private getIdUsuarioActual(): number {
    return Number(this.usuarioActual?.id_usuario ?? 2);
  }
  onImprimir(): void {
    this.imprimirDesdeBase('CONCILIADOS');
  }

  get esConciliacionGuardada(): boolean {
    return this.isLocked &&
      this.idConciliacion !== null &&
      this.idConciliacion > 0 &&
      this.conciliacionPersistida !== null;
  }

  private clonarConciliacion(c: ConciliacionResponse): ConciliacionResponse {
    return {
      ...c,
      detalles: (c.detalles ?? []).map(d => ({ ...d }))
    };
  }

  private bloquearConciliacionRecuperada(): void {
    this.isLocked = true;
    this.form.disable({ emitEvent: false });
    this.planForm.disable({ emitEvent: false });
    this.buscarForm.enable({ emitEvent: false });
    this.gridMovApi?.refreshCells({ force: true, columns: ['concil', 'fechaconcil'] });
    this.gridMovApi?.redrawRows();
  }

  private imprimirDesdeBase(tipo: 'CONCILIADOS' | 'NO_CONCILIADOS'): void {
    if (!this.idConciliacion || this.idConciliacion <= 0) {
      this.notify('Primero debe recuperar o guardar una conciliación total.', 'warn');
      return;
    }

    this.loading = true;
    this.svc.getConciliacionById(this.idConciliacion)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (res: ApiResponse<ConciliacionResponse>) => {
          if (res.type !== 'success' || !res.data) {
            this.notify(res.message ?? 'No se pudo recuperar la conciliación para imprimir.', 'error', 5000);
            return;
          }
          this.generarPdfConciliacionPersistida(res.data, tipo);
        },
        error: (error) => {
          console.error('Error recuperando conciliación para PDF:', error);
          this.notify('Error consultando la conciliación en base de datos.', 'error', 5000);
        }
      });
  }

  private generarPdfConciliacionPersistida(
    conciliacion: ConciliacionResponse,
    tipoReporte: 'CONCILIADOS' | 'NO_CONCILIADOS'
  ): void {
    try {
      const detalles = (conciliacion.detalles ?? [])
        .map((d: any, index: number) => ({
          ...d,
          linea: this.num(d?.linea) || index + 1,
          concil: this.isChecked(d?.concil) ? 'C' : 'N',
          cheque: this.num(d?.cheque),
          debito: this.num(d?.debito),
          credito: this.num(d?.credito),
        }))
        .filter((d: any) => tipoReporte === 'CONCILIADOS' ? d.concil === 'C' : d.concil !== 'C')
        .sort((a: any, b: any) => this.num(a.linea) - this.num(b.linea));

      if (!detalles.length) {
        this.notify(
          tipoReporte === 'CONCILIADOS'
            ? 'No existen movimientos conciliados almacenados.'
            : 'No existen movimientos no conciliados almacenados.',
          'warn'
        );
        return;
      }

      const rango = this.obtenerRangoDesdeConciliacion(conciliacion);
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const cuenta = String((conciliacion as any).codPrePc ?? conciliacion.codprePc ?? '');
      const descripcion = String(conciliacion.descripcion ?? '');
      const fechaInicial = this.formatearFechaDdMmYyyy(rango.fechaInicial);
      const fechaFinal = this.formatearFechaDdMmYyyy(rango.fechaFinal);
      const fechaConciliacion = this.formatDdMmYyyy(conciliacion.fechaconcil);
      const titulo = tipoReporte === 'CONCILIADOS'
        ? 'DETALLE DE MOVIMIENTOS CONCILIADOS'
        : 'DETALLE DE MOVIMIENTOS NO CONCILIADOS';

      let y = 12;
      doc.setFont('times', 'bold');
      doc.setFontSize(14);
      doc.text('CONCILIACIÓN BANCARIA', 148.5, y, { align: 'center' });
      y += 8;

      doc.setFontSize(10);
      doc.text('N.º conciliación:', 10, y);
      doc.setFont('times', 'normal');
      doc.text(String(conciliacion.idConciliacion ?? ''), 42, y);
      doc.setFont('times', 'bold');
      doc.text('Periodo:', 75, y);
      doc.setFont('times', 'normal');
      doc.text(String((conciliacion as any).fecconcil ?? ''), 93, y);
      doc.setFont('times', 'bold');
      doc.text('Fecha conciliación:', 125, y);
      doc.setFont('times', 'normal');
      doc.text(fechaConciliacion, 160, y);
      y += 6;

      doc.setFont('times', 'bold');
      doc.text('Cuenta bancaria:', 10, y);
      doc.setFont('times', 'normal');
      doc.text(cuenta, 42, y);
      doc.text(descripcion, 75, y);
      y += 6;

      doc.setFont('times', 'bold');
      doc.text('Fecha inicial:', 10, y);
      doc.setFont('times', 'normal');
      doc.text(fechaInicial, 42, y);
      doc.setFont('times', 'bold');
      doc.text('Fecha final:', 75, y);
      doc.setFont('times', 'normal');
      doc.text(fechaFinal, 100, y);
      y += 5;
      doc.line(10, y, 287, y);
      y += 7;
      doc.setFont('times', 'bold');
      doc.setFontSize(11);
      doc.text(titulo, 10, y);

      const body = detalles.map((r: any) => [
        String(r.linea ?? ''),
        this.formatDdMmYyyy(r.fechatran),
        String(r.movbancario ?? ''),
        String(r.nocomprobante ?? ''),
        String(r.cheque ?? ''),
        this.formatNumber2(r.debito),
        this.formatNumber2(r.credito),
        String(r.numdoc ?? ''),
        String(r.beneficiario ?? ''),
        String(r.tipdoc ?? ''),
      ]);

      autoTable(doc, {
        startY: y + 2,
        theme: 'grid',
        styles: { font: 'times', fontSize: 7.5, cellPadding: 1.2, overflow: 'linebreak', textColor: 0, lineColor: 160, lineWidth: 0.1 },
        headStyles: { fontStyle: 'bold', halign: 'center', fillColor: [235, 235, 235], textColor: 0 },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },
          1: { halign: 'center', cellWidth: 22 },
          2: { halign: 'center', cellWidth: 14 },
          3: { cellWidth: 34 },
          4: { cellWidth: 27 },
          5: { halign: 'right', cellWidth: 24 },
          6: { halign: 'right', cellWidth: 24 },
          7: { cellWidth: 25 },
          8: { cellWidth: 72 },
          9: { halign: 'center', cellWidth: 16 },
        },
        head: [['Línea', 'Fecha', 'Tipo', 'Comprobante', 'Cheque', 'Débito', 'Crédito', 'Documento', 'Beneficiario', 'Tip. Doc.']],
        body,
        margin: { left: 10, right: 10 },
      });

      let summaryY = ((doc as any).lastAutoTable?.finalY ?? 120) + 8;
      if (summaryY > 175) {
        doc.addPage();
        summaryY = 20;
      }

      const resumen = tipoReporte === 'CONCILIADOS'
        ? {
            saldoInicial: this.num((conciliacion as any).salconini),
            deposito: this.num((conciliacion as any).salconcidep),
            cheques: this.num((conciliacion as any).salconcichq),
            notasDebito: this.num((conciliacion as any).salconcind),
            notasCredito: this.num((conciliacion as any).salconcinc),
            saldoBancario: this.num((conciliacion as any).salconbanc),
            diferencia: 0,
          }
        : {
            saldoInicial: this.num((conciliacion as any).salconcini),
            deposito: this.num((conciliacion as any).salconcdep),
            cheques: this.num((conciliacion as any).salconcchq),
            notasDebito: this.num((conciliacion as any).salconcnd),
            notasCredito: this.num((conciliacion as any).salconcnc),
            saldoBancario: this.num((conciliacion as any).salconcbanc),
            diferencia: this.num((conciliacion as any).salconcdif),
          };

      doc.line(160, summaryY, 287, summaryY);
      summaryY += 6;
      doc.setFontSize(10);

      const summaryRows: Array<[string, number]> = [
        ['Saldo inicial', resumen.saldoInicial],
        ['Depósitos', resumen.deposito],
        ['Cheques', resumen.cheques],
        ['Notas de débito', resumen.notasDebito],
        ['Notas de crédito', resumen.notasCredito],
        ['Saldo bancario', resumen.saldoBancario],
        ['Diferencia', resumen.diferencia],
      ];

      for (const [label, value] of summaryRows) {
        doc.setFont('times', 'bold');
        doc.text(label, 165, summaryY);
        doc.setFont('times', 'normal');
        doc.text(this.formatNumber2(value), 282, summaryY, { align: 'right' });
        summaryY += 6;
      }

      summaryY += 14;
      if (summaryY > 185) {
        doc.addPage();
        summaryY = 40;
      }

      doc.line(45, summaryY, 115, summaryY);
      doc.line(180, summaryY, 250, summaryY);
      summaryY += 6;
      doc.setFont('times', 'bold');
      doc.text('Realizado por', 80, summaryY, { align: 'center' });
      doc.text('Revisado por', 215, summaryY, { align: 'center' });

      const id = conciliacion.idConciliacion ?? 0;
      const periodo = (conciliacion as any).fecconcil ?? '';
      const sufijo = tipoReporte === 'CONCILIADOS' ? 'Conciliados' : 'No_Conciliados';
      doc.save(`Conciliacion_${id}_${periodo}_${sufijo}.pdf`);
      this.notify('Reporte generado con información de base de datos.', 'success');
    } catch (error) {
      console.error('Error generando PDF de conciliación:', error);
      this.notify('Ocurrió un error al generar el PDF.', 'error', 5000);
    }
  }

  private formatNumber2(value: any): string {
    const n = Number(value ?? 0);
    if (!Number.isFinite(n)) return '0.00';

    return n.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  private escapeHtml(value: any): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private numberCellStyle(_params: any) {
    return {
      textAlign: 'right',
      justifyContent: 'flex-end',
      fontVariantNumeric: 'tabular-nums',
    };
  }
  private getPrimerDiaMesActual(): Date {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  }

  private getUltimoDiaMesActual(): Date {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  }
  onImprimirMarcados(): void {
    this.imprimirDesdeBase('CONCILIADOS');
  }
  onFechaChange(): void {
    if (this.isLocked) {
      return;
    }

    const fechaInicial =
      this.form.get('fechaInicial')?.value as Date | null;

    const fechaFinal =
      this.form.get('fechaFinal')?.value as Date | null;

    if (
      !fechaInicial ||
      !fechaFinal ||
      !(fechaInicial instanceof Date) ||
      !(fechaFinal instanceof Date) ||
      isNaN(fechaInicial.getTime()) ||
      isNaN(fechaFinal.getTime())
    ) {
      return;
    }

    this.movimientosRequestVersion++;

    this.movimientos = [];
    this.setRowDataCompat(this.gridMovApi, []);

    this.intentarBuscarConciliacionExistente();
  }

  private validarRangoMensualCompleto(): { ok: boolean; mensaje: string } {
    const fechaInicial = this.form.get('fechaInicial')?.value as Date | null;
    const fechaFinal = this.form.get('fechaFinal')?.value as Date | null;

    if (!fechaInicial || !fechaFinal) {
      return {
        ok: false,
        mensaje: 'Debe ingresar la fecha inicial y la fecha final.'
      };
    }

    if (!(fechaInicial instanceof Date) || isNaN(fechaInicial.getTime())) {
      return {
        ok: false,
        mensaje: 'La fecha inicial no es válida.'
      };
    }

    if (!(fechaFinal instanceof Date) || isNaN(fechaFinal.getTime())) {
      return {
        ok: false,
        mensaje: 'La fecha final no es válida.'
      };
    }

    const mismoAnio = fechaInicial.getFullYear() === fechaFinal.getFullYear();
    const mismoMes = fechaInicial.getMonth() === fechaFinal.getMonth();

    if (!mismoAnio || !mismoMes) {
      return {
        ok: false,
        mensaje: 'No se puede guardar la conciliación total porque la fecha inicial y la fecha final no pertenecen al mismo mes.'
      };
    }

    const esPrimerDiaMes = fechaInicial.getDate() === 1;

    if (!esPrimerDiaMes) {
      return {
        ok: false,
        mensaje: 'No se puede guardar la conciliación total porque la fecha inicial debe ser el primer día del mes.'
      };
    }

    const ultimoDiaDelMes = new Date(
      fechaFinal.getFullYear(),
      fechaFinal.getMonth() + 1,
      0
    ).getDate();

    const esUltimoDiaMes = fechaFinal.getDate() === ultimoDiaDelMes;

    if (!esUltimoDiaMes) {
      return {
        ok: false,
        mensaje: 'No se puede guardar la conciliación total porque la fecha final debe ser el último día del mes.'
      };
    }

    return {
      ok: true,
      mensaje: ''
    };
  }
  private obtenerRangoDesdeConciliacion(c: any): { fechaInicial: Date | null; fechaFinal: Date | null } {
    const fechaInicialBackend =
      c?.fechaInicial ??
      c?.fechainicial ??
      c?.fecini ??
      null;

    const fechaFinalBackend =
      c?.fechaFinal ??
      c?.fechafinal ??
      c?.fecfin ??
      null;

    const fechaInicialParseada = this.parseBackendDate(fechaInicialBackend);
    const fechaFinalParseada = this.parseBackendDate(fechaFinalBackend);

    if (fechaInicialParseada && fechaFinalParseada) {
      return {
        fechaInicial: fechaInicialParseada,
        fechaFinal: fechaFinalParseada,
      };
    }

    const periodoRaw = c?.fecconcil ?? c?.fechaconcil ?? null;
    const periodo = this.parsePeriodoConciliacion(periodoRaw);

    if (periodo) {
      return {
        fechaInicial: new Date(periodo.year, periodo.month - 1, 1),
        fechaFinal: new Date(periodo.year, periodo.month, 0),
      };
    }

    return {
      fechaInicial: null,
      fechaFinal: null,
    };
  }

  private parsePeriodoConciliacion(value: any): { year: number; month: number } | null {
    if (value == null) return null;

    const raw = String(value).trim();

    if (/^\d{6}$/.test(raw)) {
      const year = Number(raw.substring(0, 4));
      const month = Number(raw.substring(4, 6));

      if (year > 1900 && month >= 1 && month <= 12) {
        return { year, month };
      }
    }

    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      const soloFecha = raw.substring(0, 10);
      const [y, m] = soloFecha.split('-');
      const year = Number(y);
      const month = Number(m);

      if (year > 1900 && month >= 1 && month <= 12) {
        return { year, month };
      }
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      const [, m, y] = raw.split('/');
      const year = Number(y);
      const month = Number(m);

      if (year > 1900 && month >= 1 && month <= 12) {
        return { year, month };
      }
    }

    return null;
  }

  private parseBackendDate(value: any): Date | null {
    if (value == null || value === '') return null;

    if (value instanceof Date) {
      return isNaN(value.getTime())
        ? null
        : new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }

    const raw = String(value).trim();

    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      const soloFecha = raw.substring(0, 10);
      const [y, m, d] = soloFecha.split('-').map(Number);

      if (!y || !m || !d) return null;

      const fecha = new Date(y, m - 1, d);
      return isNaN(fecha.getTime()) ? null : fecha;
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      const [d, m, y] = raw.split('/').map(Number);

      if (!y || !m || !d) return null;

      const fecha = new Date(y, m - 1, d);
      return isNaN(fecha.getTime()) ? null : fecha;
    }

    if (/^\d{6}$/.test(raw)) {
      const year = Number(raw.substring(0, 4));
      const month = Number(raw.substring(4, 6));

      if (year > 1900 && month >= 1 && month <= 12) {
        return new Date(year, month - 1, 1);
      }
    }

    return null;
  }
  private estaDentroDelPeriodo(
    fechaValue: any,
    fechaInicial: Date | null,
    fechaFinal: Date | null
  ): boolean {
    if (!fechaInicial || !fechaFinal) return false;

    const fecha = this.parseFechaFlexible(fechaValue);
    if (!fecha) return false;

    const fi = new Date(
      fechaInicial.getFullYear(),
      fechaInicial.getMonth(),
      fechaInicial.getDate()
    );

    const ff = new Date(
      fechaFinal.getFullYear(),
      fechaFinal.getMonth(),
      fechaFinal.getDate()
    );

    const fx = new Date(
      fecha.getFullYear(),
      fecha.getMonth(),
      fecha.getDate()
    );

    return fx >= fi && fx <= ff;
  }

  private parseFechaFlexible(value: any): Date | null {
    if (value == null || value === '') return null;

    if (value instanceof Date) {
      return isNaN(value.getTime())
        ? null
        : new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }

    const raw = String(value).trim();

    // yyyy-MM-dd o yyyy-MM-ddTHH:mm:ss
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      const soloFecha = raw.substring(0, 10);
      const [y, m, d] = soloFecha.split('-').map(Number);

      if (!y || !m || !d) return null;

      const fecha = new Date(y, m - 1, d);
      return isNaN(fecha.getTime()) ? null : fecha;
    }

    // dd/MM/yyyy
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      const [d, m, y] = raw.split('/').map(Number);

      if (!y || !m || !d) return null;

      const fecha = new Date(y, m - 1, d);
      return isNaN(fecha.getTime()) ? null : fecha;
    }

    return null;
  }

  nombreArchivoExcel = '';

  onExcelSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const archivo = input.files[0];
    this.nombreArchivoExcel = archivo.name;

    const reader = new FileReader();

    reader.onload = (e: any) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'array' });

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const filas = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
          raw: true
        });

        if (!filas || filas.length === 0) {
          this.notify('El archivo Excel está vacío.', 'warn');
          return;
        }

        this.compararExcelBanco(filas as any[]);
      } catch (error) {
        console.error(error);
        this.notify('No se pudo leer el archivo Excel.', 'error');
      } finally {
        input.value = '';
      }
    };

    reader.readAsArrayBuffer(archivo);
    
  }
 private compararExcelBanco(filasExcel: any[]): void {
  if (!this.gridMovApi) {
    this.notify('El grid aún no está listo.', 'warn');
    return;
  }

  const dataExcel = filasExcel
    .filter((row: any) => row && Array.isArray(row) && row.length > 0)
    .map((row: any[]) => ({
      fecha: this.normalizarFechaExcel(row[0]),        // A
      codigo: this.normalizarTexto(row[1]),            // B
      concepto: this.normalizarTexto(row[2]),          // C
      tipo: this.normalizarTexto(row[3]),              // D => C / D
      documento: this.normalizarRegistro(row[4]),      // E => Documento
      oficina: this.normalizarTexto(row[5]),           // F
      monto: this.normalizarNumero(row[6]),            // G
      matchExcel: false,
    }))
    .filter((x: any) => x.documento && x.fecha && x.tipo && x.monto > 0);

  this.excelRows = dataExcel;
  this.setRowDataCompat(this.gridExcelApi, this.excelRows);
  this.configurarColumnasExcel('pichincha');

  if (!dataExcel.length) {
    this.notify('No se encontraron registros válidos en el Excel.', 'warn');
    return;
  }

  let totalMatches = 0;

  this.gridMovApi.deselectAll();

  this.gridMovApi.forEachNode((node: any) => {
    if (!node.data) return;
    node.data.matchExcel = false;
  });

  this.excelRows.forEach((x: any) => {
    x.matchExcel = false;
  });

  this.gridMovApi.forEachNode((node: any) => {
    if (!node.data) return;

    const row = node.data;

    const chequeGrid = this.normalizarRegistro(row.cheque);
    const fechaGrid = this.normalizarFechaGrid(
      row.fechatran ?? row.fechaTransac ?? row.fechaTransaccion
    );
    const beneficiarioGrid = this.normalizarTexto(row.beneficiario);
    const debitoGrid = this.normalizarNumero(row.debito);
    const creditoGrid = this.normalizarNumero(row.credito);

    let excelEncontrado: any = null;

    const match = dataExcel.some((excel: any) => {
      if (excel.matchExcel) return false;

      const coincideCheque = excel.documento === chequeGrid;
      if (!coincideCheque) return false;

      const coincideFecha = excel.fecha === fechaGrid;
      if (!coincideFecha) return false;

      const coincideBeneficiario = this.esBeneficiarioSimilar(
        beneficiarioGrid,
        excel.concepto
      );
      if (!coincideBeneficiario) return false;

      let coincideMonto = false;

      if (excel.tipo === 'C') {
        coincideMonto = Math.abs(excel.monto - debitoGrid) < 0.01;
      } else if (excel.tipo === 'D') {
        coincideMonto = Math.abs(excel.monto - creditoGrid) < 0.01;
      }

      if (coincideMonto) {
        excelEncontrado = excel;
      }

      return coincideMonto;
    });

    if (match && excelEncontrado) {
      totalMatches++;

      node.setSelected(true);

      row.concil = 'C';
      row.fechaconcil = this.getFechaConcilDefaultIso();
      row.matchExcel = true;

      excelEncontrado.matchExcel = true;
    } else {
      row.matchExcel = false;
    }
  });

  this.gridMovApi.refreshCells({
    force: true,
    columns: ['concil', 'fechaconcil']
  });
  this.gridMovApi.redrawRows();

  this.setRowDataCompat(this.gridExcelApi, this.excelRows);
  this.gridExcelApi?.refreshCells({ force: true, columns: ['matchExcel'] });
  this.gridExcelApi?.redrawRows();

  if (typeof this.recalcularResumenes === 'function') {
    this.recalcularResumenes();
  }

  this.notify(
    `Comparación finalizada. Coincidencias: ${totalMatches}`,
    totalMatches > 0 ? 'success' : 'warn'
  );
}
  private esBeneficiarioSimilar(beneficiario: string, concepto: string): boolean {
    if (!beneficiario || !concepto) return false;

    if (concepto.includes(beneficiario)) {
      return true;
    }

    const palabrasBeneficiario = beneficiario
      .split(' ')
      .map(x => x.trim())
      .filter(x => x.length >= 3);

    if (!palabrasBeneficiario.length) return false;

    let coincidencias = 0;

    for (const palabra of palabrasBeneficiario) {
      if (concepto.includes(palabra)) {
        coincidencias++;
      }
    }

    const porcentaje = coincidencias / palabrasBeneficiario.length;
    return porcentaje >= 0.6;
  }

  private normalizarTexto(value: any): string {
    return String(value ?? '')
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }

  private normalizarRegistro(value: any): string {
    return String(value ?? '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '')
      .replace(/[^A-Z0-9]/g, '');
  }

  private normalizarNumero(value: any): number {
    if (value == null || value === '') return 0;

    const s = String(value)
      .trim()
      .replace(/,/g, '');

    const n = Number(s);
    return Number.isFinite(n)
      ? Math.round((n + Number.EPSILON) * 100) / 100
      : 0;
  }

  private normalizarFechaExcel(value: any): string {
    if (value == null || value === '') return '';

    if (typeof value === 'number' && Number.isFinite(value)) {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (!parsed) return '';

      const y = String(parsed.y);
      const m = String(parsed.m).padStart(2, '0');
      const d = String(parsed.d).padStart(2, '0');

      return `${y}-${m}-${d}`;
    }

    const texto = String(value).trim();

    const partes = texto.split('/');
    if (partes.length === 3) {
      const dia = partes[0].padStart(2, '0');
      const mes = partes[1].padStart(2, '0');
      const anio = partes[2];
      return `${anio}-${mes}-${dia}`;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
      return texto;
    }

    const d = new Date(texto);
    if (isNaN(d.getTime())) return '';

    return this.formatearFechaIso(d);
  }

  private normalizarFechaGrid(value: any): string {
    if (!value) return '';

    const texto = String(value).trim();

    const partes = texto.split('/');
    if (partes.length === 3) {
      const dia = partes[0].padStart(2, '0');
      const mes = partes[1].padStart(2, '0');
      const anio = partes[2];
      return `${anio}-${mes}-${dia}`;
    }

    if (/^\d{4}-\d{2}-\d{2}/.test(texto)) {
      return texto.substring(0, 10);
    }

    const d = new Date(texto);
    if (isNaN(d.getTime())) return '';

    return this.formatearFechaIso(d);
  }

  private formatearFechaIso(fecha: Date): string {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private fechaHoyTexto(): string {
    const hoy = new Date();
    const d = String(hoy.getDate()).padStart(2, '0');
    const m = String(hoy.getMonth() + 1).padStart(2, '0');
    const y = hoy.getFullYear();
    return `${d}/${m}/${y}`;
  }

  get esCuentaPichincha(): boolean {
    return Number(this.form.get('idPlanCuentas')?.value ?? 0) === 10;
  }

  get esCuentaProdubanco(): boolean {
    return Number(this.form.get('idPlanCuentas')?.value ?? 0) === 9;
  }

onExcelSeleccionadoPichincha(event: Event): void {
  this.mostrarExcel = true;
  this.panelIzquierdoAncho = 820;
  this.panelDerechoAncho = 420;
  this.leerExcel(event, (filas) => this.compararExcelBanco(filas));
}

onExcelSeleccionadoProdubanco(event: Event): void {
  this.mostrarExcel = true;
  this.panelIzquierdoAncho = 820;
  this.panelDerechoAncho = 420;
  this.leerExcel(event, (filas) => this.compararExcelBancoProdubanco(filas));
}

private compararExcelBancoProdubanco(filasExcel: any[]): void {
  if (!this.gridMovApi) {
    this.notify('El grid aún no está listo.', 'warn');
    return;
  }

  const dataExcel = filasExcel
    .filter((row: any) => row && Array.isArray(row) && row.length > 0)
    .map((row: any[]) => {
      const referencia1 = String(row[15] ?? '').trim(); // columna P
      const partes = referencia1.split('|#|');

      const cheque = this.normalizarRegistro(partes[0] ?? '');
      const beneficiario = this.normalizarTexto(partes[2] ?? '');

      return {
        fecha: this.normalizarFechaExcel(row[0]),            // columna A
        referencia: this.normalizarTexto(row[1]),            // columna B
        transaccion: this.normalizarTexto(row[4]),           // columna E
        signo: this.normalizarTexto(row[5]),                 // columna F => (+) / (-)
        monto: this.normalizarNumeroProdubanco(row[7]),      // columna H
        documento: cheque,
        cheque,
        beneficiario,
        referencia1: this.normalizarTexto(referencia1),
        referencia2: this.normalizarTexto(row[16] ?? ''),    // columna Q
        codigo: '',
        concepto: beneficiario,
        tipo: '',
        oficina: '',
        matchExcel: false,
      };
    })
    .filter((x: any) => x.cheque && x.fecha && x.monto > 0);

  this.excelRows = dataExcel;
  this.setRowDataCompat(this.gridExcelApi, this.excelRows);
  this.configurarColumnasExcel('produbanco');

  if (!dataExcel.length) {
    this.notify('No se encontraron registros válidos en el Excel de Produbanco.', 'warn');
    return;
  }

  let totalMatches = 0;

  this.gridMovApi.deselectAll();

  this.gridMovApi.forEachNode((node: any) => {
    if (!node.data) return;
    node.data.matchExcel = false;
  });

  this.excelRows.forEach((x: any) => {
    x.matchExcel = false;
  });

  this.gridMovApi.forEachNode((node: any) => {
    if (!node.data) return;

    const row = node.data;

    const chequeGrid = this.normalizarRegistro(row.cheque);
    const fechaGrid = this.normalizarFechaGrid(
      row.fechatran ?? row.fechaTransac ?? row.fechaTransaccion
    );
    const debitoGrid = this.normalizarNumero(row.debito);
    const creditoGrid = this.normalizarNumero(row.credito);

    let excelEncontrado: any = null;

    const match = dataExcel.some((excel: any) => {
      if (excel.matchExcel) return false;

      const coincideCheque = excel.cheque === chequeGrid;
      if (!coincideCheque) return false;

      const coincideFecha = excel.fecha === fechaGrid;
      if (!coincideFecha) return false;

      let coincideMonto = false;

      if (excel.signo === '(+)') {
        coincideMonto = Math.abs(excel.monto - debitoGrid) < 0.01;
      } else if (excel.signo === '(-)') {
        coincideMonto = Math.abs(excel.monto - creditoGrid) < 0.01;
      }

      if (coincideMonto) {
        excelEncontrado = excel;
      }

      return coincideMonto;
    });

    if (match && excelEncontrado) {
      totalMatches++;

      node.setSelected(true);

      row.concil = 'C';
      row.fechaconcil = this.getFechaConcilDefaultIso();
      row.matchExcel = true;

      excelEncontrado.matchExcel = true;
    } else {
      row.matchExcel = false;
    }
  });

  this.gridMovApi.refreshCells({
    force: true,
    columns: ['concil', 'fechaconcil']
  });

  this.gridMovApi.redrawRows();

  this.setRowDataCompat(this.gridExcelApi, this.excelRows);
  this.gridExcelApi?.refreshCells({ force: true, columns: ['matchExcel'] });
  this.gridExcelApi?.redrawRows();

  this.recalcularResumenes();

  this.notify(
    `Comparación Produbanco finalizada. Coincidencias: ${totalMatches}`,
    totalMatches > 0 ? 'success' : 'warn'
  );
}
  private normalizarNumeroProdubanco(value: any): number {
    if (value == null || value === '') return 0;

    const s = String(value)
      .replace(/\$/g, '')
      .replace(/\s+/g, '')
      .replace(/,/g, '')
      .trim();

    const n = Number(s);
    return Number.isFinite(n)
      ? Math.round((n + Number.EPSILON) * 100) / 100
      : 0;
  }

  private leerExcel(event: Event, callback: (filas: any[]) => void): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const archivo = input.files[0];
    this.nombreArchivoExcel = archivo.name;

    const reader = new FileReader();

    reader.onload = (e: any) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'array' });

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const filas = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
          raw: true
        });

        if (!filas || filas.length === 0) {
          this.notify('El archivo Excel está vacío.', 'warn');
          return;
        }

        callback(filas as any[]);
      } catch (error) {
        console.error(error);
        this.notify('No se pudo leer el archivo Excel.', 'error');
      } finally {
        input.value = '';
      }
    };

    reader.readAsArrayBuffer(archivo);
  }
  
  private configurarColumnasExcel(tipo: 'pichincha' | 'produbanco'): void {
    if (!this.gridExcelApi) return;

    const columnasProdubanco = ['referencia', 'transaccion', 'signo', 'beneficiario', 'referencia1', 'referencia2'];
    const columnasBase = ['codigo', 'concepto', 'tipo', 'documento', 'oficina', 'monto'];

    if (tipo === 'pichincha') {
      columnasBase.forEach(col => this.gridExcelApi!.setColumnsVisible([col], true));
      columnasProdubanco.forEach(col => this.gridExcelApi!.setColumnsVisible([col], false));
    } else {
      columnasBase.forEach(col => this.gridExcelApi!.setColumnsVisible([col], true));
      columnasProdubanco.forEach(col => this.gridExcelApi!.setColumnsVisible([col], true));
    }

    this.gridExcelApi.sizeColumnsToFit();
  }
toggleExcel() {
  this.mostrarExcel = !this.mostrarExcel;

  if (this.mostrarExcel) {
    // expandido: ambos visibles
    this.panelIzquierdoAncho = 820;
    this.panelDerechoAncho = 420;
  } else {
    // contraído: solo izquierdo, ocupa casi todo
    this.panelIzquierdoAncho = 1240;
    this.panelDerechoAncho = 0;
  }

  setTimeout(() => {
    this.gridMovApi?.sizeColumnsToFit();
    this.gridExcelApi?.sizeColumnsToFit();
  }, 120);
}
iniciarResize(event: MouseEvent): void {
  if (!this.mostrarExcel || !this.excelRows?.length) return;

  event.preventDefault();

  this.resizing = true;
  this.startX = event.clientX;
  this.startLeftWidth = this.panelIzquierdoAncho;
  this.startRightWidth = this.panelDerechoAncho;

  document.addEventListener('mousemove', this.onResizeMouseMove);
  document.addEventListener('mouseup', this.onResizeMouseUp);
}

private onResizeMouseMove = (event: MouseEvent): void => {
  if (!this.resizing) return;

  const dx = event.clientX - this.startX;

  let nuevoIzquierdo = this.startLeftWidth + dx;
  let nuevoDerecho = this.startRightWidth - dx;

  // mínimos
  const minIzquierdo = 500;
  const minDerecho = 220;

  if (nuevoIzquierdo < minIzquierdo) {
    nuevoIzquierdo = minIzquierdo;
    nuevoDerecho = this.startLeftWidth + this.startRightWidth - nuevoIzquierdo;
  }

  if (nuevoDerecho < minDerecho) {
    nuevoDerecho = minDerecho;
    nuevoIzquierdo = this.startLeftWidth + this.startRightWidth - nuevoDerecho;
  }

  this.panelIzquierdoAncho = nuevoIzquierdo;
  this.panelDerechoAncho = nuevoDerecho;

  requestAnimationFrame(() => {
    this.gridMovApi?.sizeColumnsToFit();
    this.gridExcelApi?.sizeColumnsToFit();
  });
};

private onResizeMouseUp = (): void => {
  this.resizing = false;
  document.removeEventListener('mousemove', this.onResizeMouseMove);
  document.removeEventListener('mouseup', this.onResizeMouseUp);

  setTimeout(() => {
    this.gridMovApi?.sizeColumnsToFit();
    this.gridExcelApi?.sizeColumnsToFit();
  }, 50);
};
}