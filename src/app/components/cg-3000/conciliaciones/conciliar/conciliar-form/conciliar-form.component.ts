import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, MatDateFormats, NativeDateAdapter } from '@angular/material/core';
import { GridOptions } from 'ag-grid-community';
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

  loading = false;
  loadingSelector = false;
  loadingPlan = false;
  private ultimaBusquedaConciliacionKey = '';
private cargandoConciliacionExistente = false;
  // VB6: cuando ya está TOTAL => bloqueado
  isLocked = false;

  // Solo para mostrar ID cuando se recupera una conciliación TOTAL
  idConciliacion: number | null = null;

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
    idEmpresa: [1, [Validators.required]],
    idUsuario: [2, [Validators.required]],
  });

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
  };

  defaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: true,
    minWidth: 80,
  };

  colSaldos: ColDef[] = [
    { headerName: 'Saldo Inicial', field: 'salconini' },
    { headerName: 'Depósito', field: 'salcondep' },
    { headerName: 'Cheques', field: 'salconchq' },
    { headerName: 'Notas/Crédito', field: 'salconnc' },
    { headerName: 'Notas/Débito', field: 'salconnd' },
    { headerName: 'Saldo Bancario', field: 'salconbanc' },
    { headerName: 'Diferencia', field: 'salcondif' },
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
    { headerName: 'N° Comp', field: 'nocomprobante', width: 120 },

    { headerName: 'Cheque', field: 'cheque', width: 100 },
    { headerName: 'Débito', field: 'debito', width: 110 },
    { headerName: 'Crédito', field: 'credito', width: 110 },


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

        // importante: el click debe caer a la celda
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
    { headerName: 'Beneficiario', field: 'beneficiario', minWidth: 220, flex: 1 },
    { headerName: 'Numdoc', field: 'numdoc', width: 140, valueFormatter: (p) => (p.value == null ? '' : String(p.value)) },
    { headerName: 'Tipdoc', field: 'tipdoc', width: 90 },
  ];

  colResumen: ColDef[] = [
    { headerName: 'Estado', field: 'tipo', width: 140 },
    { headerName: 'Saldo Contable', field: 'saldoContable' },
    { headerName: 'Depósito', field: 'deposito' },
    { headerName: 'Cheques', field: 'cheques' },
    { headerName: 'Notas/Débito', field: 'notasDebito' },
    { headerName: 'Notas/Crédito', field: 'notasCredito' },
    { headerName: 'Saldo Bancario', field: 'saldoBancario' },
    { headerName: 'Diferencia', field: 'diferencia' },
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
    //return this.canAbrirMenuGuardar && this.esConciliacionCuadrada();
    return this.canAbrirMenuGuardar && !this.isLocked;
  }

  // =======================
  // INIT
  // =======================
  ngOnInit(): void {
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

  private cargarConciliacionPorId(id: number) {
    if (!id || Number.isNaN(id) || id <= 0) return;

    this.loading = true;

    this.svc.getConciliacionById(id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res: ApiResponse<ConciliacionResponse>) => {
          if (res.type !== 'success' || !res.data) {
            this.notify(res.message ?? 'No se encontró la conciliación.', 'warn');
            return;
          }

          // VB6: si existe conciliación (cabecera) => bloqueado
          this.isLocked = true;
          this.idConciliacion = res.data.idConciliacion;

          this.cargarDesdeResponse(res.data);
        },
        error: () => this.notify('Error al buscar conciliación.', 'error', 5000),
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

    this.planSvc.getAll({ idEmpresa })
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
  this.isLocked = false;
  this.idConciliacion = null;

  this.buscarForm.enable({ emitEvent: false });
  this.planForm.enable({ emitEvent: false });
  this.form.enable({ emitEvent: false });

  this.buscarForm.reset({ idConciliacionBuscar: null });

  this.planForm.reset({ planCuentaBuscar: null }, { emitEvent: false });
  this.pendingPlanId = null;

  this.form.reset({
    idEmpresa: 1,
    idUsuario: 2,
    saldcontini: 0,
    saldcontfin: 0,
    saldbancini: 0,
    saldbancfin: 0,
    idPlanCuentas: null,
    codprePc: null,
    descripcion: null,
    fechaInicial: null,
    fechaFinal: null,
    comentario: null,
  });

  this.form.get('saldcontini')?.disable({ emitEvent: false });
  this.form.get('saldcontfin')?.disable({ emitEvent: false });

  this.movimientos = [];
  this.setRowDataCompat(this.gridMovApi, []);
  this.recalcularResumenes();
}
  onCancelar() {
    this.onNuevaConciliacion();
  }

  onCargar() {
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

  onGridResumenReady(e: GridReadyEvent) {
    this.gridResumenApi = e.api;
    this.setRowDataCompat(this.gridResumenApi, this.resumenRows);
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
  private abrirAgruparPorComprobante(numcomp: string) {
    if (this.isLocked) return;

    const rows = this.getMovimientosActuales()
      .filter(r => String((r as any).nocomprobante ?? '').trim() === numcomp);

    if (rows.length <= 1) {
      this.notify(`No hay más movimientos con el comprobante ${numcomp}.`, 'info');
      return;
    }

    const ref = this.dialog.open(ConciliacionAgruparDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      data: {
        numcomp,
        items: rows.map((r: any) => ({
          idDetMaestro: Number(r.idDetMaestro),
          fechatran: r.fechatran ?? null,
          movbancario: r.movbancario ?? null,
          cheque: this.num(r.cheque),
          debito: this.num(r.debito),
          credito: this.num(r.credito),
          beneficiario: r.beneficiario ?? null,
          concil: this.isChecked(r.concil) ? 'C' : 'N',
        })),
      },
    });

    ref.afterClosed().subscribe((result: any) => {
      if (this.isLocked) return;
      if (!result?.updates?.length) return;

      const map = new Map<number, 'C' | 'N'>();
      for (const u of result.updates) map.set(Number(u.idDetMaestro), u.concil);

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

        this.gridMovApi.refreshCells({ force: true, columns: ['concil', 'fechaconcil'] });
        this.recalcularResumenes();
      }
    });
  }

  // =======================
  // CARGAR DESDE RESPONSE (TOTAL => bloqueado)
  // =======================
private cargarDesdeResponse(c: ConciliacionResponse) {
  this.form.patchValue({
    idPlanCuentas: c.idPlanCuentas,
    codprePc: c.codprePc ?? null,
    descripcion: c.descripcion ?? null,
    fechaInicial: this.isoToDate(c.fechaconcil),
    fechaFinal: this.isoToDate(c.fechaconcil),
    saldcontini: c.saldcontini ?? 0,
    saldcontfin: c.saldcontfin ?? 0,
    saldbancini: c.saldbancini ?? 0,
    saldbancfin: c.saldbancfin ?? 0,
    comentario: c.comentario ?? null,
    idEmpresa: c.idEmpresa,
    idUsuario: c.idUsuario,
  }, { emitEvent: false });

  const idPlan = Number(c.idPlanCuentas ?? 0);
  if (this.planCuentas?.length) {
    this.setPlanSeleccionadoPorId(idPlan);
  } else {
    this.pendingPlanId = idPlan;
  }

  const cabFechaconcilIso = c.fechaconcil
    ? this.normalizeIsoString(c.fechaconcil)
    : null;

  this.movimientos = (c.detalles ?? []).map((d: any) => {
    const concVal = String(d?.concil ?? 'N').toUpperCase();
    const concil = (concVal === 'S' || concVal === 'C') ? 'C' : 'N';

    const fechaconcil =
  concil === 'C' && d?.fechaconcil
    ? this.normalizeIsoString(d.fechaconcil)
    : null;

    return {
      ...d,
      concil,
      fechatran: d?.fechatran ? this.normalizeIsoString(d.fechatran) : d?.fechatran,
      fechaconcil,
      numdoc: d?.numdoc != null ? String(d.numdoc) : null,
    } as any;
  });

  this.setRowDataCompat(this.gridMovApi, this.movimientos);
  this.gridMovApi?.refreshCells({ force: true, columns: ['fechaconcil', 'concil'] });

  this.recalcularResumenes();
}
  // =======================
  // MOVIMIENTOS MAESTRO (EN PROCESO)
  // =======================
 cargarMovimientosDetalleDesdeMaestro() {
  if (this.isLocked) return;

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

  this.svc.getMovimientosMaestro(idPlan, fechaInicio, fechaFin)
    .pipe(finalize(() => (this.loading = false)))
    .subscribe({
      next: (res) => {
        if (res.type !== 'success' || !Array.isArray(res.data)) {
          this.notify(res.message ?? 'No se pudo cargar movimientos.', 'error', 5000);
          this.movimientos = [];
          this.setRowDataCompat(this.gridMovApi, []);
          this.recalcularResumenes();
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
    //if (!this.canGuardarTotal) {
    if (!this.canAbrirMenuGuardar || this.isLocked) {
      this.notify('No se puede grabar la conciliación total.', 'warn');
      return;
    }

    const rows = this.getMovimientosActuales();

    if (!rows.length) {
      this.notify('Debe existir al menos un movimiento.', 'warn');
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

            // refrescar visualmente la grilla
            this.gridMovApi?.refreshCells({ force: true });
            this.gridMovApi?.redrawRows();

            // opcional: recargar desde backend para dejar exactamente lo guardado
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
    });

    this.gridMovApi.refreshCells({
      force: true,
      columns: ['concil', 'fechaconcil'],
    });

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
  private recalcularResumenes() {
    const cab = this.form.getRawValue();
    const rows = this.getMovimientosActuales();

    const conc = rows.filter((r) => this.isChecked((r as any).concil));
    const no = rows.filter((r) => !this.isChecked((r as any).concil));

    const sConc = this.sumPorTipo(conc);
    const sNo = this.sumPorTipo(no);

    const salconini = this.num(cab.saldcontini);
    const salconbanc = this.num(cab.saldbancini);

    const salcondep = sConc.deposito;
    const salconchq = -sConc.cheques;
    const salconnd = -sConc.notasDebito;
    const salconnc = sConc.notasCredito;

    const salcondif = this.r2((salconini + salcondep + salconchq + salconnd + salconnc) - salconbanc);

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

    const totalContableNo =
      saldoContNo
      + (-sNo.deposito + sNo.cheques - sNo.notasDebito + sNo.notasCredito);

    const difNo = this.r2(totalContableNo - saldoBancNo);
    const rowNo: ResumenRow = {
      tipo: 'No Conciliados',
      saldoContable: this.r2(saldoContNo),
      deposito: this.r2(sNo.deposito),
      cheques: this.r2(sNo.cheques),
      notasDebito: this.r2(sNo.notasDebito),
      notasCredito: this.r2(sNo.notasCredito),
      saldoBancario: this.r2(saldoBancNo),
      diferencia: this.r2(difNo),
    };

    this.resumenRows = [rowConc, rowNo];
    this.setRowDataCompat(this.gridResumenApi, this.resumenRows);
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

      // DP = depósito
      if (tipo === 'DP') {
        deposito += debito;
        continue;
      }

      // CH o TB = cheque
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

    return this.resumenRows.every(x => this.r2(x.diferencia ?? 0) === 0);
  }

  // =======================
  // REQUEST TOTAL
  // =======================
 private buildRequestFromUI(): UpdateConciliacionRequest {
  const cab = this.form.getRawValue();
  const fechaconcilCab = new Date();
  const fechaconcilCabIso = this.toIsoLocalStartOfDay(fechaconcilCab);
  const rows = this.getMovimientosActuales();

  const detalles: CreateConciliacionDetalleRequest[] = rows.map((d, idx) => {
    const checked = this.isChecked((d as any).concil);
    const concil = checked ? 'C' : 'N';

    return {
      idDetMaestro: (d as any).idDetMaestro,
      linea: (d as any).linea ?? idx + 1,
      fechatran: (d as any).fechatran ?? null,
      idMovBancario: (d as any).idMovBancario ?? null,
      movbancario: (d as any).movbancario ?? null,
      nocomprobante: (d as any).nocomprobante ?? null,
      cheque: (d as any).cheque ?? 0,
      debito: (d as any).debito ?? 0,
      credito: (d as any).credito ?? 0,
      concil,
      fechaconcil: checked ? ((d as any).fechaconcil ?? fechaconcilCabIso) : null,
      beneficiario: (d as any).beneficiario ?? null,
      numdoc: (d as any).numdoc ?? null,
      tipdoc: (d as any).tipdoc ?? null,
    };
  });

  const concRow = this.resumenRows.find((x) => x.tipo === 'Conciliados')!;
  const noRow = this.resumenRows.find((x) => x.tipo === 'No Conciliados')!;

  return {
    fechaconcil: fechaconcilCab,
    idPlanCuentas: Number(cab.idPlanCuentas),
    codprePc: cab.codprePc ?? null,
    descripcion: cab.descripcion ?? null,

    saldcontini: this.num(cab.saldcontini),
    saldcontfin: this.num(cab.saldcontfin),
    saldbancini: this.num(cab.saldbancini),
    saldbancfin: this.num(cab.saldbancfin),

    salconini: this.saldosConciliados.salconini,
    salcondep: this.saldosConciliados.salcondep,
    salconchq: this.saldosConciliados.salconchq,
    salconnc: this.saldosConciliados.salconnc,
    salconnd: this.saldosConciliados.salconnd,
    salconbanc: this.saldosConciliados.salconbanc,
    salcondif: this.saldosConciliados.salcondif,

    salconcidep: concRow.deposito,
    salconcichq: concRow.cheques,
    salconcinc: concRow.notasCredito,
    salconcind: concRow.notasDebito,

    salconcini: noRow.saldoContable,
    salconcdep: noRow.deposito,
    salconcchq: noRow.cheques,
    salconcnc: noRow.notasCredito,
    salconcnd: noRow.notasDebito,
    salconcbanc: noRow.saldoBancario,
    salconcdif: noRow.diferencia,

    comentario: cab.comentario ?? null,
    idEmpresa: Number(cab.idEmpresa),
    idUsuario: Number(cab.idUsuario),

    detalles,
  };
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

  private isoToDate(iso: string): Date {
    return new Date(iso);
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
  const codprePc = String(this.form.get('codprePc')?.value ?? '').trim();
  const fechaInicial = this.form.get('fechaInicial')?.value as Date | null;

  if (!codprePc || !fechaInicial || isNaN(fechaInicial.getTime())) {
    return;
  }

  const fecconcil = this.getPeriodoDesdeFecha(fechaInicial);
  const currentKey = `${codprePc}|${fecconcil}`;

  this.ultimaBusquedaConciliacionKey = currentKey;
  this.cargandoConciliacionExistente = true;

  this.svc.getConciliacionByPeriodoCuenta(codprePc, fecconcil).subscribe({
    next: (res) => {
      if (this.ultimaBusquedaConciliacionKey !== currentKey) {
        return;
      }

      this.cargandoConciliacionExistente = false;

      if (res.type === 'success' && res.data) {
        this.isLocked = true;
        this.idConciliacion = res.data.idConciliacion;

        this.cargarDesdeResponse(res.data);

        this.form.disable({ emitEvent: false });
        this.planForm.disable({ emitEvent: false });

        this.form.get('saldcontini')?.disable({ emitEvent: false });
        this.form.get('saldcontfin')?.disable({ emitEvent: false });

        this.notify('La conciliación ya existe. Se cargó en modo consulta.', 'info');
      } else {
        this.isLocked = false;
        this.idConciliacion = null;

        this.form.enable({ emitEvent: false });
        this.planForm.enable({ emitEvent: false });

        this.form.get('saldcontini')?.disable({ emitEvent: false });
        this.form.get('saldcontfin')?.disable({ emitEvent: false });
      }
    },
    error: () => {
      if (this.ultimaBusquedaConciliacionKey !== currentKey) {
        return;
      }

      this.cargandoConciliacionExistente = false;
      this.isLocked = false;
      this.idConciliacion = null;

      this.form.enable({ emitEvent: false });
      this.planForm.enable({ emitEvent: false });

      this.form.get('saldcontini')?.disable({ emitEvent: false });
      this.form.get('saldcontfin')?.disable({ emitEvent: false });
    }
  });
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

    this.gridMovApi?.refreshCells({
      force: true,
      columns: ['concil', 'fechaconcil'],
    });

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
}