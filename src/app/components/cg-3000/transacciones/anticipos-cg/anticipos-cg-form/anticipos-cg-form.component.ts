
import { Component, OnInit, Optional } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormControl,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { AgGridAngular } from 'ag-grid-angular';
import {
  ColDef,
  GridApi,
  GridReadyEvent,
  CellValueChangedEvent,
  CellClickedEvent,
} from 'ag-grid-community';

import {
  AnticipoDetalleRequest,
  CreateAnticipoRequest,
} from 'src/app/interfaces/requests/anticipo-cg-request';
import {
  AnticiposCgService,
  ApiResponse,
} from 'src/app/services/anticipos-cg.service';

// === Servicios / interfaces para cabecera (igual que Asientos) ===
import { UsuarioService } from 'src/app/services/usuario.service';
import { TipoAsientoService } from 'src/app/services/tipoasiento.service';
import { TipoAsientoResponse } from 'src/app/interfaces/responses/tipo-asiento-response';

import { ZonaService } from 'src/app/services/zona.service';
import { ZonaResponse } from 'src/app/interfaces/responses/zona-response';

import { CodigosContablesService } from 'src/app/services/codigoscontables.service';
import { CodigosContablesResponse } from 'src/app/interfaces/responses/codigos-contables-response';

import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Observable, of } from 'rxjs';
import {
  debounceTime,
  map,
  distinctUntilChanged,
  switchMap,
  tap,
  shareReplay,
  catchError,
} from 'rxjs/operators';

// Forma de pago CG
import { FormaPagoCgResponse } from 'src/app/interfaces/responses/formapagocg-response';
import { FormaPagoCgService } from 'src/app/services/forma-pago-cg.service';
import { Router } from '@angular/router';
import { MatDialogRef } from '@angular/material/dialog';

// Plan de cuentas (para Cuenta Anticipo)
import {
  PlanCuentasService,
  PlanCuenta,
} from 'src/app/services/plan-cuentas.service';

// ⬇️ Cell editor reutilizado (lo tienes en esta misma carpeta)
import { PlanCuentaCellEditorComponent } from './plan-cuenta-cell-editor.component';

@Component({
  selector: 'app-anticipo-cg-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AgGridAngular,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    PlanCuentaCellEditorComponent, // ⬅️ importante para AG Grid
  ],
  templateUrl: './anticipos-cg-form.component.html',
  styleUrls: ['./anticipos-cg-form.component.css'],
})
export class AnticipoCgFormComponent implements OnInit {
  // ========= CABECERA =========
  formCabecera!: FormGroup;

  // combos
  tiposAsiento$!: Observable<TipoAsientoResponse[]>;
  zonas$!: Observable<ZonaResponse[]>;
  beneficiariosFiltrados$!: Observable<CodigosContablesResponse[]>;
  formasPago$!: Observable<FormaPagoCgResponse[]>;
  cuentasAnticipo$!: Observable<PlanCuenta[]>; // Plan de cuentas

  private tipoAsientos: Array<{ id: number; nombre: string; tipDoc: string }> =
    [];

  private cuentasAnticipo: PlanCuenta[] = []; // cache local para la línea de anticipo

  // ⬇️ listado plano de cuentas para el cell editor del grid (banco)
  cuentasBanco: { id: number; label: string; codigo: string }[] = [];

  usuarioActual = this.usuarioService.getUsuarioActual();
  idEmpresaActual = this.usuarioActual?.id_empresa ?? 0;
  idUsuarioActual = this.usuarioActual?.id_usuario ?? 0;
  moduloAnticipos = 3;

  // para el beneficiario (banco)
  busquedaCodBanco = new FormControl<string | CodigosContablesResponse>('');
  codigosBancoFiltrados$!: Observable<CodigosContablesResponse[]>;

  // ========= GRID =========
  columnDefs: ColDef[] = [];
  defaultColDef: ColDef = {
    editable: true,
    resizable: true,
    sortable: false,
    filter: false,
  };

  rowData: AnticipoDetalleRequest[] = [];
  private gridApi!: GridApi<AnticipoDetalleRequest>;

  // 🔹 ÚNICO TOTAL
  totalAnticipo = 0;

  constructor(
    private fb: FormBuilder,
    private anticiposService: AnticiposCgService,
    private usuarioService: UsuarioService,
    private tipoAsientoService: TipoAsientoService,
    private zonaService: ZonaService,
    private codigosContablesService: CodigosContablesService,
    private formaPagoCgService: FormaPagoCgService,
    private planCuentasService: PlanCuentasService,
    private router: Router,
    @Optional() private dialogRef: MatDialogRef<AnticipoCgFormComponent> | null
  ) {}

  // ==========================================================
  //  INICIALIZACIÓN
  // ==========================================================
  ngOnInit(): void {
    this.initForm();
    this.initGridColumns();

    this.cargarZonasPorEmpresa();
    this.cargarTiposAsiento();
    this.cargarFormasPagoCg();
    this.cargarCuentasAnticipo(); // ⬅️ aquí se llena combo + cuentasBanco
    this.bindTipoAsientoToTipDoc();
    this.initAutocompleteBeneficiario();
    this.initAutocompleteCodBanco();

    // Forzar TIPDOC siempre en mayúsculas
    this.formCabecera
      .get('tipdoc')
      ?.valueChanges.subscribe((v: string | null) => {
        if (!v) return;
        const up = v.toUpperCase();
        if (v !== up) {
          this.formCabecera.get('tipdoc')?.setValue(up, { emitEvent: false });
        }
      });
  }

  // Construye el formulario de cabecera con los campos del diseño
  private initForm(): void {
    const ahora = new Date();

    this.formCabecera = this.fb.group({
      idZona: [null, Validators.required],
      idTipoAsiento: [null, Validators.required],
      tipdoc: ['', Validators.required],

      // manejamos strings para que el <input type="date/datetime-local"> no dé problemas
      fechatransaccion: [this.formatDateOnly(ahora), Validators.required], // yyyy-MM-dd
      fechaingreso: [this.formatDateTimeLocal(ahora), Validators.required], // yyyy-MM-ddTHH:mm

      // Campo de búsqueda / selección de beneficiario
      beneficiario: ['', Validators.required],

      // Concepto del anticipo
      concepto: ['', Validators.required],

      // Cuenta Anticipo: solo guardamos el IdPlanCuentas
      idPlanCtasAnticipo: [null, Validators.required],

      // auxiliar contable de anticipo (si lo usas luego)
      idCodContableAnticipo: [0, Validators.required],

      // Forma de pago CG (GUARDA idFormaPagoCg)
      idFormaPagoCg: [null, Validators.required],
    });
  }

  // ==========================================================
  //  CARGA DE COMBOS
  // ==========================================================

  private cargarZonasPorEmpresa(): void {
    const empresaId = this.idEmpresaActual;

    this.zonas$ = this.zonaService.getAll().pipe(
      map((list) => (list || []).filter((z) => z.empresaCodigo === empresaId)),
      shareReplay(1)
    );
  }

  private cargarTiposAsiento(): void {
    this.tiposAsiento$ = this.tipoAsientoService.ListadoAsiento().pipe(
      tap((list) => {
        this.tipoAsientos = (list ?? []).map((r: any) => ({
          id: r.IdTipoAsiento ?? r[' IdTipoAsiento'],
          nombre: (r.Descripcion ?? r.TipAsiento ?? '').toString().trim(),
          tipDoc: (r.TipAsiento ?? r.CodigoDoc ?? '')
            .toString()
            .trim()
            .toUpperCase(),
        }));
        this.setDefaultTipoAsientoEG();
      }),
      shareReplay(1)
    );
  }

  private setDefaultTipoAsientoEG(): void {
    if (!this.formCabecera) return;
    if (!this.tipoAsientos || this.tipoAsientos.length === 0) return;

    const eg = this.tipoAsientos.find((x) => x.tipDoc === 'EG');
    if (!eg) return;

    this.formCabecera.patchValue(
      {
        idTipoAsiento: eg.id,
        tipdoc: eg.tipDoc.slice(0, 2), // "EG"
      },
      { emitEvent: false }
    );
  }

  // Formas de pago CG filtradas por empresa
  private cargarFormasPagoCg(): void {
    const empresaId = this.idEmpresaActual;

    this.formasPago$ = this.formaPagoCgService
      .getAll({ idEmpresa: empresaId })
      .pipe(
        tap((list) => {
          console.log('Formas de pago CG recibidas:', list);
        }),
        shareReplay(1)
      );
  }

  // Plan de cuentas para Cuenta Anticipo + cuentas para el grid banco
  private cargarCuentasAnticipo(): void {
    const empresaId = this.idEmpresaActual;

    this.cuentasAnticipo$ = this.planCuentasService
      .getAll({ idEmpresa: empresaId })
      .pipe(
        map((list) => (list || []).filter((c) => c.EsMovimiento)),
        tap((list) => {
          this.cuentasAnticipo = list || [];

          // ⬇️ Preparamos la lista para el cell editor del grid (banco)
          this.cuentasBanco = (list || []).map((c) => ({
            id: c.IdPlanCuentas,
            label: `${c.CuentaPresentacion} - ${c.NombreCuenta}`,
            codigo: c.CuentaPresentacion,
          }));
        }),
        shareReplay(1)
      );
  }

  private bindTipoAsientoToTipDoc(): void {
    this.formCabecera
      .get('idTipoAsiento')
      ?.valueChanges.subscribe((id: number | null) => {
        const ta = this.tipoAsientos.find((x) => x.id === Number(id));
        const tipDoc = (ta?.tipDoc ?? '').slice(0, 2);
        this.formCabecera.get('tipdoc')?.setValue(tipDoc, {
          emitEvent: false,
        });
      });
  }

  // ========= Autocomplete de beneficiario principal =========
  // ========= Autocomplete de beneficiario principal =========
private initAutocompleteBeneficiario(): void {
  const ctrl = this.formCabecera.get('beneficiario');
  if (!ctrl) return;

  this.beneficiariosFiltrados$ = ctrl.valueChanges.pipe(
    debounceTime(300),
    map((value: any) => (typeof value === 'string' ? value : '')),
    distinctUntilChanged(),
    switchMap((term: string) => {
      const empresaId = this.idEmpresaActual;
      if (!empresaId) return of([]);

      const texto = term.trim();
      if (texto.length < 2) {
        return of([]);
      }

      return this.codigosContablesService
        .buscar(texto, { idEmpresa: empresaId, maxResults: 20 })
        .pipe(
          map((r) => r.data ?? []),
          catchError(() => of([]))
        );
    })
  );
}

  formatearBeneficiario(c: CodigosContablesResponse): string {
    return `${c.Identificacionauxiliar} - ${c.Razonsocial}`.trim();
  }

  onBeneficiarioSelected(c: CodigosContablesResponse): void {
    if (!c) return;
    const razon = (c.Razonsocial ?? '').toString().trim();
    this.formCabecera.get('beneficiario')?.setValue(razon, {
      emitEvent: false,
    });
  }

  // ========= Autocomplete Códigos Contables (Banco) – independiente =========
  private initAutocompleteCodBanco(): void {
    const ctrl = this.busquedaCodBanco;
    if (!ctrl) return;

    this.codigosBancoFiltrados$ = ctrl.valueChanges.pipe(
      debounceTime(300),
      map((value: any) => (typeof value === 'string' ? value : '')),
      distinctUntilChanged(),
      switchMap((term: string) => {
        const empresaId = this.idEmpresaActual;
        if (!empresaId) return of([]);

        const texto = term.trim();
        if (texto.length < 2) {
          return of([]);
        }

        return this.codigosContablesService
          .buscar(texto, { idEmpresa: empresaId, maxResults: 20 })
          .pipe(
            map((r) => r.data ?? []),
            catchError(() => of([]))
          );
      })
    );
  }

  onCodBancoSelected(c: CodigosContablesResponse): void {
    if (!c) return;
    const texto = `${c.Identificacionauxiliar} - ${c.Razonsocial}`.trim();
    this.busquedaCodBanco.setValue(texto, { emitEvent: false });
    // Aquí podrías usar c para llenar columnas del grid si luego lo necesitas
  }

  // ==========================================================
  //  GRID (detalle banco)
  // ==========================================================
  private initGridColumns(): void {
    this.columnDefs = [
      { headerName: 'No', field: 'numlinea', width: 80, editable: false },
      { headerName: 'Local', field: 'idLocal', width: 100 },

      // ⬇️ Cuenta contable del banco usando el mismo CellEditor que Asientos
      {
        headerName: 'Cuenta Contable (Banco)',
        field: 'idPlanCuentas',
        width: 580,
        editable: true,
        singleClickEdit: true,
        cellEditor: PlanCuentaCellEditorComponent,
        cellEditorPopup: true,
        cellEditorParams: () => ({
          cuentas: this.cuentasBanco,
        }),
        valueFormatter: (params) => {
          const v = params.value;
          if (v === null || v === undefined || v === '' || Number(v) === 0) {
            return 'Seleccione...';
          }
          const id = Number(v);
          const cta = this.cuentasBanco.find((c) => c.id === id);
          return cta ? cta.label : String(v);
        },
      },

      {
        headerName: 'Cheque',
        field: 'cheque',
        width: 150,
        valueParser: this.numberParser,
      },
      {
        headerName: 'Valor',
        field: 'haber',
        width: 120,
        valueParser: this.numberParser,
      },
      {
        headerName: 'Acción',
        colId: 'accion',
        width: 90,
        editable: false,
        cellRenderer: () => '🗑️',
      },
    ];
  }

  onGridReady(event: GridReadyEvent<AnticipoDetalleRequest>): void {
    this.gridApi = event.api;
    this.gridApi.setGridOption('rowData', this.rowData);
  }

  onCellValueChanged(
    event: CellValueChangedEvent<AnticipoDetalleRequest>
  ): void {
    const rowIndex = event.rowIndex;
    const field = event.colDef.field as keyof AnticipoDetalleRequest | undefined;

    if (field && rowIndex != null && rowIndex >= 0) {
      const row = this.rowData[rowIndex];

      // @ts-ignore
      row[field] = event.newValue;

      // ⬇️ Cuando cambia la cuenta contable del banco,
      // guardamos también el código en codprePc
      if (field === 'idPlanCuentas') {
        const id = Number(event.newValue ?? 0);
        const cta = this.cuentasBanco.find((c) => c.id === id);

        if (cta) {
          row.idPlanCuentas = cta.id;
          row.codprePc = cta.codigo;
        } else {
          row.idPlanCuentas = 0;
          row.codprePc = null;
        }

        // refrescamos sólo esa fila/columna
        if (this.gridApi) {
          this.gridApi.refreshCells({
            rowNodes: [event.node],
            columns: ['idPlanCuentas'],
            force: true,
          });
        }
      }

      if (field === 'haber' || field === 'cheque') {
        const num = this.toNumber(event.newValue);
        // @ts-ignore
        row[field] = num;
      }

      this.rowData = [...this.rowData];
      this.recalcularTotales();
    }
  }

  onCellClicked(event: CellClickedEvent<AnticipoDetalleRequest>): void {
    const colId = event.column.getColId();
    if (colId === 'accion') {
      const idx = event.rowIndex ?? -1;

      if (idx >= 0) {
        this.rowData.splice(idx, 1);
        this.rowData = [...this.rowData];

        if (this.gridApi) {
          this.gridApi.setGridOption('rowData', this.rowData);
        }

        this.recalcularTotales();
      }
    }
  }

  // ==========================================================
  //  LÓGICA DE ANTICIPO: LÍNEA BANCO + CABECERA
  // ==========================================================
  agregarLinea(): void {
    if (this.formCabecera.invalid) {
      alert('Complete la cabecera antes de agregar la línea del banco.');
      return;
    }

    if (this.rowData.length >= 1) {
      alert('Solo se permite una línea de banco para el anticipo.');
      return;
    }

    const cab = this.formCabecera.value;
    const fechaTran = new Date(cab.fechatransaccion);
    const fechaIng = new Date(cab.fechaingreso);

    const nuevaLineaBanco: AnticipoDetalleRequest = {
      IdDetMaestro: 0,
      IdCabMaestro: 0,
      numlinea: 2,
      anio: fechaTran.getFullYear().toString(),
      fechatransaccion: fechaTran,
      fechaingreso: fechaIng,
      hora: this.buildHoraFromDate(fechaIng),
      idZona: cab.idZona,
      idLocal: 1,
      idPlanCuentas: 0, // se seleccionará desde el cell editor
      codprePc: null,   // se llenará automáticamente con el código de la cuenta
      idCodContable: 0,
      nocomprobante: null,
      cheque: null,
      beneficiario: cab.beneficiario,
      debe: null,
      haber: 0, // se digitará en la columna "Valor"
      comentario: cab.concepto,
      idMovBancario: null,
      movbancario: '1',
    };

    this.rowData = [nuevaLineaBanco];
    if (this.gridApi) {
      this.gridApi.setGridOption('rowData', this.rowData);
    }
    this.recalcularTotales();
  }

  // 🔹 Calcula un ÚNICO total anticipo desde la columna "Valor" (haber) del grid
  private recalcularTotales(): void {
    this.totalAnticipo = this.rowData.reduce(
      (acc, r) => acc + (r.haber ?? 0),
      0
    );
  }

  guardar(): void {
    if (this.formCabecera.invalid) {
      alert('Complete todos los campos obligatorios de la cabecera.');
      return;
    }

    if (this.rowData.length !== 1) {
      alert('Debe ingresar exactamente una línea de banco en el detalle.');
      return;
    }

    this.recalcularTotales();

    if (this.totalAnticipo <= 0) {
      alert(
        'Ingrese el valor del anticipo en la columna "Valor" de la línea de banco.'
      );
      return;
    }

    const cab = this.formCabecera.value;
    const fechaTran = new Date(cab.fechatransaccion);
    const fechaIng = new Date(cab.fechaingreso);

    // Obtenemos la cuenta seleccionada del plan de cuentas (anticipo)
    const cuentaPlan = this.cuentasAnticipo.find(
      (c) => c.IdPlanCuentas === cab.idPlanCtasAnticipo
    );
    const cuentaCodigo =
      cuentaPlan?.CuentaPresentacion || (cuentaPlan as any)?.CodigoCompleto || '';

    // Línea 1: ANTICIPO (DEBE)
    const lineaAnticipo: AnticipoDetalleRequest = {
      IdDetMaestro: 0,
      IdCabMaestro: 0,
      numlinea: 1,
      anio: fechaTran.getFullYear().toString(),
      fechatransaccion: fechaTran,
      fechaingreso: fechaIng,
      hora: this.buildHoraFromDate(fechaIng),
      idZona: cab.idZona,
      idLocal: 1,
      idPlanCuentas: cab.idPlanCtasAnticipo, // IdPlanCuentas
      codprePc: cuentaCodigo, // CuentaPresentacion (o CodigoCompleto)
      idCodContable: cab.idCodContableAnticipo,
      nocomprobante: null,
      cheque: 0,
      beneficiario: cab.beneficiario,
      debe: this.totalAnticipo, // 🔹 Debe = Total Anticipo
      haber: 0,
      comentario: cab.concepto,
      idMovBancario: 1,// null,
      movbancario: '0',
    };

    // Línea 2: BANCO (HABER)
    const bancoRow = this.rowData[0];
    // idPlanCuentas y codprePc se toman del grid
const idPlanBanco = Number(bancoRow.idPlanCuentas ?? 0);
const cuentaBanco = this.cuentasBanco.find(c => c.id === idPlanBanco);
const codigoBanco = cuentaBanco?.codigo ?? bancoRow.codprePc ?? '';

const lineaBanco: AnticipoDetalleRequest = {
    IdDetMaestro: 0,
    IdCabMaestro: 0,
    numlinea: 2,
    anio: fechaTran.getFullYear().toString(),
    fechatransaccion: fechaTran,
    fechaingreso: fechaIng,
    hora: this.buildHoraFromDate(fechaIng),

    // zona y local
    idZona: cab.idZona,
    idLocal: 1,/// bancoRow.idLocal ?? 1,

    // 🔹 estos tres vienen del AG-Grid
    idPlanCuentas: idPlanBanco,
    codprePc: codigoBanco,
    cheque: bancoRow.cheque ?? 0,

    idCodContable: bancoRow.idCodContable ?? 0,
    nocomprobante: null, // bancoRow.nocomprobante ?? null,

    beneficiario: cab.beneficiario,
    debe: 0,
    haber: this.totalAnticipo,      // Haber = Total Anticipo
    comentario: cab.concepto,
    idMovBancario: 2,// bancoRow.idMovBancario ?? null,
    movbancario: 'CH',
  };

    const request: CreateAnticipoRequest = {
      IdCabMaestro: 0,
      idZona: cab.idZona,
      idUsuario: this.idUsuarioActual,
      idEmpresa: this.idEmpresaActual,
      idTipoAsiento: cab.idTipoAsiento,
      tipdoc: cab.tipdoc,
      numdoc: 0,
      anio: fechaTran.getFullYear().toString(),
      fechatransaccion: fechaTran,
      fechaingreso: fechaIng,
      observacion: cab.concepto,
      // 🔹 Cabecera: Debe y Haber iguales al total anticipo
      totdebe: this.totalAnticipo,
      tothaber: this.totalAnticipo,
      beneficiario: cab.beneficiario,
      modulo: this.moduloAnticipos,
      id_forma_pago_cg: 7,// cab.idFormaPagoCg,
      detalles: [lineaAnticipo, lineaBanco],
    };

    this.anticiposService.crearAnticipo(request).subscribe({
      next: (resp: ApiResponse<number>) => {
        if (resp.type === 'CREATED') {
          alert(`Anticipo creado correctamente. Id Cabecera: ${resp.data}`);
          this.resetFormulario();
        } else {
          alert(`Respuesta del servidor: ${resp.message || resp.type}`);
        }
      },
      error: (err) => {
        console.error('Error al crear anticipo', err);
        alert('Ocurrió un error al crear el anticipo.');
      },
    });
  }

  cancelar(): void {
    if (this.dialogRef) {
      this.dialogRef.close(false);
    } else {
      this.router.navigate(['/cg-3000/inicio-cg']);
    }
  }

  private resetFormulario(): void {
    const ahora = new Date();
    this.formCabecera.reset({
      idZona: null,
      idTipoAsiento: null,
      tipdoc: '',
      fechatransaccion: this.formatDateOnly(ahora),
      fechaingreso: this.formatDateTimeLocal(ahora),
      idPlanCtasAnticipo: null,
      idCodContableAnticipo: 0,
      idFormaPagoCg: null,
      beneficiario: '',
      concepto: '',
    });

    this.setDefaultTipoAsientoEG();

    this.rowData = [];
    if (this.gridApi) {
      this.gridApi.setGridOption('rowData', this.rowData);
    }
    this.totalAnticipo = 0;
  }

  // ==========================================================
  //  HELPERS
  // ==========================================================
  private numberParser = (params: any): number | null => {
    const value = params.newValue ?? params.value;
    return this.toNumber(value);
  };

  private toNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const num = Number(value);
    return isNaN(num) ? null : num;
  }

  private buildHoraFromDate(date: Date): string {
    const d = date instanceof Date ? date : new Date(date);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  private formatDateOnly(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private formatDateTimeLocal(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).toString().padStart(2, '0');
    const mi = String(d.getMinutes()).toString().padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  }
}



