import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
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

import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent, CellValueChangedEvent } from 'ag-grid-community';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import {
  UpdateConciliacionRequest,
  CreateConciliacionDetalleRequest,
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

// ✅ NUEVO: Plan de cuentas service
import { PlanCuentasService, PlanCuenta } from 'src/app/services/plan-cuentas.service';

interface MovimientoRow extends ConciliacionDetalleResponse {}

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
    AgGridModule,
  ],
  templateUrl: './conciliar-form.component.html',
  styleUrls: ['./conciliar-form.component.css'],
})
export class ConciliacionComponent implements OnInit {
  private fb = inject(FormBuilder);
  private svc = inject(ConciliacionesService);

  // ✅ NUEVO
  private planSvc = inject(PlanCuentasService);

  loading = false;
  loadingSelector = false;

  isEditMode = false;
  idConciliacion: number | null = null;

  // =======================
  // SELECTOR CONCILIACIONES
  // =======================
  selectorConciliaciones: ConciliacionSelectorResponse[] = [];
  selectorConciliacionesFiltradas: ConciliacionSelectorResponse[] = [];

  buscarForm: FormGroup = this.fb.group({
    idConciliacionBuscar: new FormControl<any>(null),
  });

  // =======================
  // ✅ PLAN DE CUENTAS (Combo)
  // =======================
  loadingPlan = false;
  planCuentas: PlanCuenta[] = [];
  planCuentasFiltradas: PlanCuenta[] = [];

  planForm: FormGroup = this.fb.group({
    planCuentaBuscar: new FormControl<any>(null),
  });

  private pendingPlanId: number | null = null;

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
    { headerName: 'IdDetConc', field: 'idDetConciliacion', width: 110, hide: true },
    { headerName: 'IdConc', field: 'idConciliacion', width: 90, hide: true },
    { headerName: 'IdDetMaestro', field: 'idDetMaestro', width: 120, hide: true },
    { headerName: 'Línea', field: 'linea', width: 80 },

    { headerName: 'Fecha Transac', field: 'fechatran', width: 160, valueFormatter: (p) => (p.value == null ? '' : String(p.value)) },

    { headerName: 'IdMov', field: 'idMovBancario', width: 90 },
    { headerName: 'TipMov', field: 'movbancario', width: 90 },
    { headerName: 'N° Comp', field: 'nocomprobante', width: 120 },

    { headerName: 'Cheque', field: 'cheque', width: 100 },
    { headerName: 'Débito', field: 'debito', width: 100 },
    { headerName: 'Crédito', field: 'credito', width: 100 },

    {
      headerName: 'Concil',
      field: 'concil',
      width: 90,
      editable: true,
      cellRenderer: 'agCheckboxCellRenderer',
      cellEditor: 'agCheckboxCellEditor',

      valueGetter: (p) => String((p.data as any)?.concil ?? 'N').toUpperCase() === 'S',

      valueSetter: (p) => {
        if (!p.data) return false;

        const checked = p.newValue === true;
        const nuevo = checked ? 'S' : 'N';
        const actual = String((p.data as any).concil ?? 'N').toUpperCase();

        if (actual === nuevo) return false;

        (p.data as any).concil = nuevo;

        if (nuevo === 'S') {
          const f: Date | null =
            this.form.get('fechaFinal')?.value ??
            this.form.get('fechaInicial')?.value ??
            null;

          (p.data as any).fechaconcil = f ? this.toIsoLocalStartOfDay(f) : this.toIsoLocalStartOfDay(new Date());
        } else {
          (p.data as any).fechaconcil = null;
        }

        this.recalcularResumenes();
        this.gridMovApi?.refreshCells({ force: true, columns: ['fechaconcil', 'concil'] });

        return true;
      },
    },

    { headerName: 'Fecha Concil', field: 'fechaconcil', width: 150, valueFormatter: (p) => (p.value == null ? '' : String(p.value)) },

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

  filtroTipMov = '';
  filtroValor = '';
  filtroCheque = '';
  filtroComprobante = '';
  filtroDocumento = '';

  get labelGenerar(): string {
    if (!this.isEditMode && (!this.movimientos || this.movimientos.length === 0)) return 'Cargar';
    return this.isEditMode ? 'Actualizar' : 'Generar';
  }

  private snack = inject(MatSnackBar);

  private notify(
    message: string,
    type: 'success' | 'error' | 'warn' | 'info' = 'info',
    durationMs = 3500,
    action = 'OK'
  ) {
    this.snack.open(message, action, {
      duration: durationMs,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: [`snack-${type}`],
    });
  }

  // =======================
  // INIT
  // =======================
  ngOnInit(): void {
    this.cargarSelectorConciliaciones();

    // ✅ cargar plan de cuentas con tu servicio
    this.cargarPlanCuentas();

    // filtro plan mientras escribe
    this.planForm.get('planCuentaBuscar')?.valueChanges
      .pipe(startWith(''))
      .subscribe((val) => {
        const txt =
          val && typeof val === 'object'
            ? this.displayPlanCuenta(val)
            : String(val ?? '');
        this.filtrarPlan(txt);
      });

    // recargar plan si cambia empresa
    this.form.get('idEmpresa')?.valueChanges.subscribe(() => {
      this.cargarPlanCuentas(true);
    });

    // filtra conciliaciones mientras escribe
    this.buscarForm.get('idConciliacionBuscar')?.valueChanges
      .pipe(startWith(''))
      .subscribe((val) => {
        const txt =
          val && typeof val === 'object'
            ? this.displayConciliacion(val)
            : String(val ?? '');
        this.filtrarSelector(txt);
      });

    this.form.valueChanges.subscribe(() => this.recalcularResumenes());
  }

  // =======================
  // ✅ PLAN DE CUENTAS
  // =======================
  private cargarPlanCuentas(forceReset = false) {
    const idEmpresa = Number(this.form.get('idEmpresa')?.value ?? 1);

    if (forceReset) {
      this.planForm.reset({ planCuentaBuscar: null }, { emitEvent: false });
      // si quieres borrar campos azules al cambiar empresa:
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

  displayPlanCuenta = (p: PlanCuenta | null): string => {
    if (!p) return '';
    const nombre = (p.NombreCuenta ?? p.Descripcion ?? '').toString();
    return `#${p.IdPlanCuentas} • ${p.CuentaPresentacion} — ${nombre}`;
  };

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

  onPlanCuentaSelected(item: PlanCuenta) {
    if (!item?.IdPlanCuentas) return;

    this.planForm.patchValue({ planCuentaBuscar: item }, { emitEvent: false });

    this.form.patchValue({
      idPlanCuentas: Number(item.IdPlanCuentas),
      codprePc: item.CuentaPresentacion ?? null,
      descripcion: (item.NombreCuenta ?? item.Descripcion ?? null),
    });
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
  // SELECTOR CONCILIACIONES
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

  displayConciliacion = (c: ConciliacionSelectorResponse | null): string => {
    if (!c) return '';
    return `#${c.idConciliacion} • ${c.fecconcil} • ${c.cuentaPresentacion} - ${c.nombreCuenta}`;
  };

  private filtrarSelector(texto: string) {
    const q = (texto ?? '').toString().trim().toLowerCase();

    if (!q) {
      this.selectorConciliacionesFiltradas = this.selectorConciliaciones.slice(0, 50);
      return;
    }

    this.selectorConciliacionesFiltradas = this.selectorConciliaciones
      .filter((x) => {
        return (
          String(x.idConciliacion ?? '').includes(q) ||
          String(x.fecconcil ?? '').includes(q) ||
          String(x.cuentaPresentacion ?? '').toLowerCase().includes(q) ||
          String(x.nombreCuenta ?? '').toLowerCase().includes(q)
        );
      })
      .slice(0, 50);
  }

  onConciliacionSelected(item: ConciliacionSelectorResponse) {
    if (!item?.idConciliacion) return;
    this.buscarForm.patchValue({ idConciliacionBuscar: item }, { emitEvent: false });
    this.cargarConciliacionPorId(Number(item.idConciliacion));
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
  // CARGA POR ID
  // =======================
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
          this.cargarDesdeResponse(res.data);
          this.isEditMode = true;
          this.idConciliacion = res.data.idConciliacion;
        },
        error: () => this.notify('Error al buscar conciliación.', 'error', 5000),
      });
  }

  // =======================
  // NUEVA
  // =======================
  onNuevaConciliacion() {
    this.isEditMode = false;
    this.idConciliacion = null;

    this.buscarForm.reset({ idConciliacionBuscar: null });

    // ✅ limpiar combo plan
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
    });

    this.movimientos = [];
    this.setRowDataCompat(this.gridMovApi, []);
    this.recalcularResumenes();
  }

  // =======================
  // GENERAR / ACTUALIZAR
  // =======================
  onGenerarActualizar() {
    if (!this.isEditMode && (!this.movimientos || this.movimientos.length === 0)) {
      if (this.form.invalid) {
        this.form.markAllAsTouched();
        this.notify('Completa los campos obligatorios (Plan de Cuenta y Fechas).', 'warn');
        return;
      }
      this.cargarMovimientosDetalleDesdeMaestro();
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify('Complete los campos obligatorios.', 'warn');
      return;
    }

    const rowsActuales = this.getMovimientosActuales();
    if (!rowsActuales || rowsActuales.length < 1) {
      this.notify('Debe existir al menos 1 detalle para grabar la conciliación.', 'warn');
      return;
    }

    const payload = this.buildRequestFromUI();
    this.loading = true;

    if (!this.isEditMode || !this.idConciliacion) {
      this.svc.crearConciliacion(payload)
        .pipe(finalize(() => (this.loading = false)))
        .subscribe({
          next: (res) => {
            if (res.type === 'success' && typeof res.data === 'number') {
              const id = res.data;
              const total = this.getMovimientosActuales().length;
              this.notify(`Conciliación creada • #${id} • ${total} movimientos`, 'success', 4500);

              this.isEditMode = true;
              this.idConciliacion = id;
              this.cargarSelectorConciliaciones();
            } else {
              this.notify(res.message ?? 'No se pudo crear la conciliación.', 'error', 5000);
            }
          },
          error: () => this.notify('Error al crear conciliación.', 'error', 5000),
        });
    } else {
      this.svc.actualizarConciliacion(this.idConciliacion, payload)
        .pipe(finalize(() => (this.loading = false)))
        .subscribe({
          next: (res) => {
            if (res.type === 'success') {
              this.notify(`Conciliación actualizada • #${this.idConciliacion}`, 'success', 4000);
              this.cargarSelectorConciliaciones();
            } else {
              this.notify(res.message ?? 'No se pudo actualizar la conciliación.', 'error', 5000);
            }
          },
          error: () => this.notify('Error al actualizar conciliación.', 'error', 5000),
        });
    }
  }

  // =======================
  // CARGAR DESDE RESPONSE
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
    });

    // ✅ posicionar combo del plan (si ya está cargado, lo setea; si no, queda pendiente)
    const idPlan = Number(c.idPlanCuentas ?? 0);
    if (this.planCuentas?.length) this.setPlanSeleccionadoPorId(idPlan);
    else this.pendingPlanId = idPlan;

    const cabFechaconcilIso = c.fechaconcil ? this.normalizeIsoString(c.fechaconcil) : null;

    this.movimientos = (c.detalles ?? []).map((d) => {
      const concil = String((d as any).concil ?? 'N').toUpperCase() === 'S' ? 'S' : 'N';
      const fechaconcil =
        concil === 'S'
          ? ((d as any).fechaconcil ? this.normalizeIsoString((d as any).fechaconcil) : cabFechaconcilIso)
          : null;

      return {
        ...d,
        concil,
        fechatran: (d as any).fechatran ? this.normalizeIsoString((d as any).fechatran) : (d as any).fechatran,
        fechaconcil,
        numdoc: (d as any).numdoc != null ? String((d as any).numdoc) : null,
      } as any;
    }) as any;

    this.setRowDataCompat(this.gridMovApi, this.movimientos);
    this.gridMovApi?.refreshCells({ force: true, columns: ['fechaconcil', 'concil'] });
    this.recalcularResumenes();
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
  // RECALCULOS
  // =======================
  private getMovimientosActuales(): MovimientoRow[] {
    if (!this.gridMovApi) return this.movimientos ?? [];
    const rows: MovimientoRow[] = [];
    this.gridMovApi.forEachNode((n) => {
      if (n.data) rows.push(n.data as MovimientoRow);
    });
    this.movimientos = rows;
    return rows;
  }

  private recalcularResumenes() {
    const cab = this.form.getRawValue();
    const rows = this.getMovimientosActuales();

    const conc = rows.filter((r) => String((r as any).concil ?? 'N').toUpperCase() === 'S');
    const no = rows.filter((r) => String((r as any).concil ?? 'N').toUpperCase() !== 'S');

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
      saldoContable: this.r2(salconini),
      deposito: this.r2(sConc.deposito),
      cheques: this.r2(sConc.cheques),
      notasDebito: this.r2(sConc.notasDebito),
      notasCredito: this.r2(sConc.notasCredito),
      saldoBancario: this.r2(salconbanc),
      diferencia: this.r2(salcondif),
    };

    const saldoContNo = this.num(cab.saldcontfin);
    const saldoBancNo = this.num(cab.saldbancfin);

    const difNo = this.r2(
      (saldoContNo + sNo.deposito - sNo.cheques - sNo.notasDebito + sNo.notasCredito) - saldoBancNo
    );

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
    const tipo = (x: any) => String(x?.movbancario ?? '').toUpperCase().trim();

    const deposito = rows
      .filter((x) => ['DEP', 'DP'].includes(tipo(x)))
      .reduce((a, x) => a + this.num((x as any).debito), 0);

    const cheques = rows
      .filter((x) => ['CH', 'CHE', 'CHK'].includes(tipo(x)))
      .reduce((a, x) => a + this.num((x as any).cheque), 0);

    const notasDebito = rows
      .filter((x) => ['ND'].includes(tipo(x)))
      .reduce((a, x) => a + this.num((x as any).debito), 0);

    const notasCredito = rows
      .filter((x) => ['NC'].includes(tipo(x)))
      .reduce((a, x) => a + this.num((x as any).credito), 0);

    return {
      deposito: this.r2(deposito),
      cheques: this.r2(cheques),
      notasDebito: this.r2(notasDebito),
      notasCredito: this.r2(notasCredito),
    };
  }

  // =======================
  // REQUEST
  // =======================
  private buildRequestFromUI(): UpdateConciliacionRequest {
    const cab = this.form.getRawValue();
    const fechaconcilCab = cab.fechaFinal ?? cab.fechaInicial;
    if (!fechaconcilCab) throw new Error('fechaFinal/fechaInicial no pueden ser null');

    const fechaconcilCabIso = this.toIsoLocalStartOfDay(fechaconcilCab);

    const rows = this.getMovimientosActuales();

    const detalles: CreateConciliacionDetalleRequest[] = rows.map((d, idx) => {
      const concil = String((d as any).concil ?? 'N').toUpperCase() === 'S' ? 'S' : 'N';

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
        fechaconcil: concil === 'S' ? ((d as any).fechaconcil ?? fechaconcilCabIso) : null,
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
  // UTIL
  // =======================
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

  cargarMovimientosDetalleDesdeMaestro() {
    const idPlan = Number(this.form.get('idPlanCuentas')?.value);
    const fIni: Date | null = this.form.get('fechaInicial')?.value ?? null;
    const fFin: Date | null = this.form.get('fechaFinal')?.value ?? null;

    if (!idPlan || idPlan <= 0) { this.notify('Seleccione un Plan de Cuenta.', 'warn'); return; }
    if (!fIni || !fFin) { this.notify('Ingrese Fecha Inicial y Fecha Final.', 'warn'); return; }

    const fechaInicio = this.toYmd(fIni);
    const fechaFin = this.toYmd(fFin);

    this.loading = true;

    this.svc.getMovimientosMaestro(idPlan, fechaInicio, fechaFin)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res) => {
          if (res.type !== 'success' || !Array.isArray(res.data)) {
            this.notify(res.message ?? 'No se pudo cargar movimientos.', 'error', 5000);
            return;
          }

          this.movimientos = res.data.map((m: MovimientoMaestroResponse, idx: number) => ({
            idDetConciliacion: null,
            idConciliacion: this.idConciliacion ?? null,

            idDetMaestro: m.idDetMaestro,
            linea: idx + 1,

            fechatran: m.fechaTransaccion ? this.normalizeIsoString(m.fechaTransaccion as any) : null,
            idMovBancario: m.idMovBancario,
            movbancario: m.movBancario,
            nocomprobante: m.noComprobante,

            cheque: m.cheque ?? 0,
            debito: m.debe ?? 0,
            credito: m.haber ?? 0,

            concil: 'N',
            fechaconcil: null,

            beneficiario: m.beneficiario,
            numdoc: m.numdoc != null ? String(m.numdoc) : null,
            tipdoc: m.tipdoc
          } as any));

          this.setRowDataCompat(this.gridMovApi, this.movimientos);
          this.recalcularResumenes();
        },
        error: () => this.notify('Error llamando movimientos-maestro.', 'error', 5000),
      });
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
}