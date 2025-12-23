import { Component, OnInit, ViewChild, effect, computed, signal, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UsuarioService } from 'src/app/services/usuario.service';
import { MatDialogRef, MatDialog, MAT_DIALOG_DATA, MatDialogConfig } from '@angular/material/dialog';
import { ComponentType } from '@angular/cdk/portal';
import { startWith, distinctUntilChanged } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { tap, shareReplay, map, catchError, finalize, debounceTime, switchMap } from 'rxjs/operators';

import { TipoAsientoService } from 'src/app/services/tipoasiento.service';
import { TipoAsientoResponse } from 'src/app/interfaces/responses/tipo-asiento-response';
import { ZonaService } from 'src/app/services/zona.service';
import { ZonaResponse } from 'src/app/interfaces/responses/zona-response';

import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule }   from '@angular/material/form-field';
import { MatInputModule }       from '@angular/material/input';

// para impresion
import { AsientoImpresion } from 'src/app/interfaces/responses/asiento-impresion.model';
import { generarPdfAsiento } from '../../util/asiento-pdf.util';

/// LOCALES
import { LocalesService } from 'src/app/services/locales.service';
import { LocalesResponse } from 'src/app/interfaces/responses/local-response';
import { LocalCellEditorComponent } from './local-cell-editor.component';

///// plan de cuenta ///
import { PlanCuentasService, PlanCuenta } from 'src/app/services/plan-cuentas.service';
import { PlanCuentaCellEditorComponent } from './plan-cuenta-cell-editor.component';

///// codigos contables /////
import { CodigosContablesService } from 'src/app/services/codigoscontables.service';
import { CodigosContablesResponse } from 'src/app/interfaces/responses/codigos-contables-response';
import { CodContableCellEditorComponent } from './cod-contable-cell-editor.component';

// MOVIMIENTOS BANCARIOS
import { MovimientoBancarioService } from 'src/app/services/movimiento-bancario.service';
import { MovimientoBancarioResponse } from 'src/app/interfaces/responses/movimiento-bancario-response';
import { MovimientoBancarioCellEditorComponent } from './movimiento-bancario-cell-editor.component';

/// componente adicional datos tributarios
import {
  AsientoTributarioDialogComponent,
  AsientoTributarioData,
} from '../datos-tributarios/asiento-tributario-dialog.component';

// MENSAJERIA
import {
  CustomMessageBoxComponent,
  MessageBoxData,
} from 'src/app/util/messages/custom-message-box.component';

import { AgGridAngular } from 'ag-grid-angular';

import {
  AllCommunityModule,
  ModuleRegistry,
  ColDef,
  GridApi,
  GridReadyEvent,
  CellValueChangedEvent,
  CellClickedEvent,
  CellKeyDownEvent,
  FullWidthCellKeyDownEvent,
} from 'ag-grid-community';

import {
  AsientosContablesService,
  ApiResponse,
} from 'src/app/services/asientos-contables.service';
import {
  AsientoContableResponse,
  DetalleAsientoResponse,
  createEmptyAsientoContableResponse,
} from 'src/app/interfaces/responses/asiento-contable-response';

import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-asientos-contables-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AgGridAngular,
    MatSnackBarModule,
    LocalCellEditorComponent,
    PlanCuentaCellEditorComponent,
    CodContableCellEditorComponent,
    MovimientoBancarioCellEditorComponent,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './asientos-contables-form.component.html',
  styleUrls: ['./asientos-contables-form.component.css'],
})
export class AsientosContablesFormComponent implements OnInit {
  @ViewChild(AgGridAngular) agGrid!: AgGridAngular;

  // modo = signal<'nuevo' | 'editar'>('nuevo');
  modo = signal<'nuevo' | 'editar' | 'plantilla'>('nuevo');
  loading = signal(false);
  saving = signal(false);

  titulo = computed(() => {
    const m = this.modo();
    if (m === 'editar') {
      return 'Crear/Editar (Asiento Contable) — EDITAR';
    }
    if (m === 'plantilla') {
      return 'Duplicación de Asiento (Asiento estándar)';  // Plantilla
    }
    return 'Crear/Editar (Asiento Contable) — NUEVO';
  });

  // USUARIO
  usuarioActual = this.usuarioService.getUsuarioActual();
  nombreusuario = this.usuarioActual?.nombre_usuario ?? '';
  numdocGenerado: string | null = null; // numero documento generado

  ///validar hr para solo lectura en caso de editar
  soloLectura = signal(false);
  motivoSoloLectura = signal<string>('');
  isViewOnly = computed(() => this.soloLectura() === true);
  ////end

  //RECUPERA USUARIO DEL ASIENTO: 
  usuarioAsientoNombre = signal<string>('');
  private usuarioAsientoIdCargado: number | null = null;
  //END

  gridOptions = {
    rowHeight: 30,
    headerHeight: 32,
    stopEditingWhenCellsLoseFocus: true,
  };

  private gridApi!: GridApi<DetalleAsientoResponse>;
  private pendingGridRefresh = false;   // 🔹 para refrescar cuando aún no hay gridApi

  private syncUsuarioEmpresa(): void {
    const idUsuario = this.usuarioActual?.id_usuario ?? 0;
    const idEmpresa = this.usuarioActual?.id_empresa ?? 0;
    this.form.patchValue({ idUsuario, idEmpresa }, { emitEvent: false });
    this.form.patchValue(
      { anio: getYearFromInput(this.form.get('fechatransaccion')!.value) },
      { emitEvent: false }
    );
  }

  // PARA VALIDAR CARACTERES ESPECIALES
  private readonly allowedTextPattern = /[^0-9a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.,;-]/g;

  validarTexto(
    controlName: 'observacion' | 'beneficiario',
    event: Event
  ): void {
    const input = event.target as HTMLInputElement | HTMLTextAreaElement;
    if (!input) return;

    const original = input.value;
    const limpio = original.replace(this.allowedTextPattern, '');

    if (original !== limpio) {
      input.value = limpio;
    }
    this.form.get(controlName)?.setValue(limpio, { emitEvent: false });
  }

  // controles y carga de datos
  cabeceraBloqueada = false;

  tiposAsiento$!: Observable<TipoAsientoResponse[]>;
  private tipoAsientos: Array<{ id: number; nombre: string; tipDoc: string }> =
    [];
  zonas$!: Observable<ZonaResponse[]>;

  locales: { id: number; nombre: string }[] = [];
  cuentas: { id: number; label: string; codigo: string }[] = [];
  auxiliares: { id: number; label: string }[] = [];
  movimientosBancarios: {
    id: number;
    movimiento: string;
    descripcion: string;
    label: string;
  }[] = [];

  beneficiariosFiltrados$!: Observable<CodigosContablesResponse[]>;

  form!: FormGroup;

  rowData = signal<DetalleAsientoResponse[]>([]);

  onCellKeyDown(
    evt:
      | CellKeyDownEvent<DetalleAsientoResponse>
      | FullWidthCellKeyDownEvent<DetalleAsientoResponse>
  ): void {
    const keyboardEvent = evt.event as KeyboardEvent;

    if (keyboardEvent.key === 'Enter') {
      keyboardEvent.preventDefault();

      if (!keyboardEvent.shiftKey) {
        this.gridApi.tabToNextCell();
      } else {
        this.gridApi.tabToPreviousCell();
      }
    }
  }

  columnDefs: ColDef<DetalleAsientoResponse>[] = [
    {
      headerName: 'Acción',
      colId: 'accion',
      width: 80,
      pinned: 'right',
      suppressHeaderMenuButton: true,
      sortable: false,
      filter: false,
      cellRenderer: (params: any) => {
        const idMov = Number(params.data?.idMovBancario || 0);
        const tieneMovimiento = idMov > 0;

        const disabledClass = !tieneMovimiento ? 'btn-disabled' : '';
        const disabledAttr = !tieneMovimiento
          ? 'data-disabled="true"'
          : 'data-disabled="false"';

        return `
          <div class="acciones-cell">
            <button class="btn-icon danger"
                    data-action="delete"
                    title="Eliminar línea">
              <img src="assets/icons/borrarfila.png" width="15" height="15" alt="Eliminar" />
            </button>

            <button class="btn-icon primary ${disabledClass}"
                    data-action="edit-tributario"
                    ${disabledAttr}
                    title="Datos Tributarios">
              <img src="assets/icons/eye-open.png" width="15" height="15" alt="Editar" />
            </button>
          </div>
        `;
      },
    },
    { headerName: 'No', field: 'numlinea', width: 50, editable: false },
    {
      headerName: 'Local',
      field: 'idLocal',
      width: 150,
      editable: true,
      singleClickEdit: true,
      cellEditor: LocalCellEditorComponent,
      cellEditorPopup: true,
      cellEditorParams: () => ({
        locales: this.locales,
      }),
      valueFormatter: (params) => {
        const v = params.value;
        if (v === null || v === undefined || v === '' || Number(v) === 0) {
          return 'Seleccione...';
        }
        const id = Number(v);
        const local = this.locales.find((l) => l.id === id);
        return local ? `${local.id} - ${local.nombre}` : String(v);
      },
    },
    {
      headerName: 'Cuenta Contable',
      field: 'idPlanCuentas',
      width: 280,
      editable: true,
      singleClickEdit: true,
      cellEditor: PlanCuentaCellEditorComponent,
      cellEditorParams: () => ({
        cuentas: this.cuentas,
      }),
      valueFormatter: (params) => {
        const v = params.value;
        if (v === null || v === undefined || v === '' || Number(v) === 0) {
          return 'Seleccione...';
        }
        const id = Number(v);
        const cta = this.cuentas.find((c) => c.id === id);
        return cta ? cta.label : String(v);
      },
    },
    {
      headerName: 'Auxiliar Contable',
      field: 'idCodContable',
      width: 260,
      editable: true,
      singleClickEdit: true,
      cellEditor: CodContableCellEditorComponent,
      cellEditorParams: () => ({
        auxiliares: this.auxiliares,
      }),
      valueFormatter: (params) => {
        const v = params.value;
        if (v == null || v === '' || Number(v) === 0) {
          return 'Seleccione...';
        }
        const id = Number(v);
        const aux = this.auxiliares.find((a) => a.id === id);
        return aux ? aux.label : String(v);
      },
    },
    {
      headerName: 'No.Comprobante',
      field: 'nocomprobante',
      width: 160,
      editable: true,
      suppressKeyboardEvent: onlyDigitsKey,
      valueSetter: (params) => {
        const soloDigitos = String(params.newValue ?? '').replace(/\D/g, '');
        params.data.nocomprobante = soloDigitos;
        return true;
      },
    },
    {
      headerName: 'Cheque',
      field: 'cheque',
      width: 100,
      editable: true,
      suppressKeyboardEvent: onlyDigitsKey,
      valueSetter: (params) => {
        const soloDigitos = String(params.newValue ?? '').replace(/[^0-9]/g, '');
        const n = Number(soloDigitos);
        params.data.cheque = Number.isNaN(n) ? 0 : n;
        return true;
      },
    },
    {
      headerName: 'Debe',
      field: 'debe',
      width: 100,
      editable: debeEditable,
      type: 'rightAligned',
      valueSetter: valueSetterDot2,
      valueFormatter: twoDecimalsDotFormatter,
      suppressKeyboardEvent: blockComma,
      cellClassRules: {
        'ag-disabled': (p: any) => toNumber(p.data?.haber) > 0,
      },
    },
    {
      headerName: 'Haber',
      field: 'haber',
      width: 100,
      editable: haberEditable,
      type: 'rightAligned',
      valueSetter: valueSetterDot2,
      valueFormatter: twoDecimalsDotFormatter,
      suppressKeyboardEvent: blockComma,
      cellClassRules: {
        'ag-disabled': (p: any) => toNumber(p.data?.debe) > 0,
      },
    },
    {
      headerName: 'Tipo Movimiento',
      field: 'idMovBancario',
      width: 220,
      editable: true,
      singleClickEdit: true,
      cellEditor: MovimientoBancarioCellEditorComponent,
      cellEditorParams: () => ({
        movimientos: this.movimientosBancarios,
      }),
      valueFormatter: (params) => {
        const v = params.value;
        if (v == null || v === '' || Number(v) === 0) {
          return 'Seleccione...';
        }
        const id = Number(v);
        const mov = this.movimientosBancarios.find((m) => m.id === id);
        return mov ? mov.label : String(v);
      },
    },
    {
      headerName: 'Comentario / Nota',
      field: 'comentario',
      width: 300,
      editable: true,
      cellEditor: 'agLargeTextCellEditor',
      cellEditorPopup: true,
      cellEditorParams: {
        maxLength: 150,
        rows: 4,
        cols: 40,
      },
      suppressKeyboardEvent: onlyAllowedComentarioKey,
      valueSetter: (params) => {
        const limpio = sanitizeTextoGenerico(params.newValue);
        params.data.comentario = limpio;
        return true;
      },
    },
    {
      headerName: 'Codigo Mov.',
      field: 'movbancario',
      width: 160,
      editable: false,
      hide: true,
    },
    {
      headerName: 'Sustento Trib.',
      field: 'idSustentoTrib',
      width: 150,
      editable: true,
      valueParser: numberParser,
      hide: true,
    },
    {
      headerName: 'Tipo Comp. SRI',
      field: 'idTipoCompSri',
      width: 170,
      editable: true,
      valueParser: numberParser,
      hide: true,
    },
    {
      headerName: 'Autorización',
      field: 'autorizacion',
      width: 160,
      editable: true,
      hide: true,
    },
    {
      headerName: 'Fecha Caduca',
      field: 'fechacaduca',
      width: 150,
      editable: true,
      valueParser: isoParser,
      hide: true,
    },
    {
      headerName: 'Tipo Retención',
      field: 'idTipoRetencion',
      width: 160,
      editable: true,
      valueParser: numberParser,
      hide: true,
    },
    {
      headerName: 'Centro Costos',
      field: 'idCentroCostos',
      width: 150,
      editable: true,
      valueParser: numberParser,
      hide: true,
    },
    {
      headerName: 'Proyecto',
      field: 'idProyecto',
      width: 130,
      editable: true,
      valueParser: numberParser,
      hide: true,
    },
    {
      headerName: 'Subproyecto',
      field: 'idSubproyecto',
      width: 160,
      editable: true,
      valueParser: numberParser,
      hide: true,
    },
    {
      headerName: 'Transferido',
      field: 'transferido',
      width: 120,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['true', 'false'] },
      valueParser: boolParser,
      hide: true,
    },
    {
      headerName: 'Fecha Transferido',
      field: 'fechatransferido',
      width: 170,
      editable: true,
      valueParser: isoParser,
      hide: true,
    },
    {
      headerName: 'Fecha Vencimiento',
      field: 'fechavencimiento',
      width: 170,
      editable: true,
      valueParser: isoParser,
      hide: true,
    },
    {
      headerName: 'Cod Conciliación',
      field: 'idConciliacion',
      width: 150,
      editable: true,
      valueParser: numberParser,
      hide: true,
    },
    {
      headerName: 'Valor en Letras',
      field: 'valorLetras',
      width: 220,
      editable: true,
      hide: true,
    },
    { headerName: 'Año', field: 'anio', width: 90, editable: true, hide: true },
    {
      headerName: 'Fecha Transacción',
      field: 'fechatransaccion',
      width: 170,
      editable: true,
      valueParser: isoParser,
      hide: true,
    },
    { headerName: 'Hora', field: 'hora', width: 100, editable: true, hide: true },
    {
      headerName: 'Zona',
      field: 'idZona',
      width: 110,
      editable: true,
      valueParser: numberParser,
      hide: true,
    },
    {
      headerName: 'Doc. Relacionado',
      field: 'docurelacionado',
      width: 160,
      editable: true,
      hide: true,
    },
    {
      headerName: 'Beneficiario',
      field: 'beneficiario',
      width: 180,
      editable: true,
      hide: true,
    },
    {
      headerName: 'Fecha Ingreso',
      field: 'fechaingreso',
      width: 160,
      editable: true,
      valueParser: isoParser,
      hide: true,
    },
    {
      headerName: 'Fecha Cierre',
      field: 'fechacierre',
      width: 160,
      editable: true,
      valueParser: isoParser,
      hide: true,
    },
    {
      headerName: 'Fecha Conciliado',
      field: 'fechaconciliado',
      width: 170,
      editable: true,
      valueParser: isoParser,
      hide: true,
    },
    { headerName: 'Cierre', field: 'cierre', width: 120, editable: true, hide: true },
    { headerName: 'CodprePc', field: 'codprePc', width: 180, editable: true, hide: true },
    {
      headerName: 'Estado Ingreso',
      field: 'estadoIngreso',
      width: 140,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['true', 'false'] },
      valueParser: boolParser,
      hide: true,
    },
    {
      headerName: 'Autorizacion Relacionado',
      field: 'autorizacionRelacionado',
      width: 200,
      editable: true,
      hide: true,
    },
    {
      headerName: 'Fecha Caduca Relacionado',
      field: 'fechaCadRelacionado',
      width: 190,
      editable: true,
      valueParser: isoParser,
      hide: true,
    },
  ];

  defaultColDef: ColDef = { resizable: true, editable: true };

  // Totales
  totDebe = computed(() =>
    (this.rowData() ?? []).reduce((a, d) => a + (Number(d.debe) || 0), 0)
  );
  totHaber = computed(() =>
    (this.rowData() ?? []).reduce((a, d) => a + (Number(d.haber) || 0), 0)
  );
  diferencia = computed(() => this.totDebe() - this.totHaber());

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private usuarioService: UsuarioService,
    public dialogRef: MatDialogRef<AsientosContablesFormComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      id?: number;
      IdCabMaestro?: number;
      modo?: 'nuevo' | 'editar' | 'plantilla';
      asientoPlantilla?: AsientoContableResponse;
      soloLectura?: boolean; //cambio hr solo de lectura
      motivoSoloLectura?: string; /// cambio hr solo de lectura
    } | null,
    private tipoasientoservice: TipoAsientoService,
    private service: AsientosContablesService,
    private zonaService: ZonaService,
    private localesService: LocalesService,
    private planCuentasService: PlanCuentasService,
    private codigosContablesService: CodigosContablesService,
    private movimientoBancarioService: MovimientoBancarioService,
    private dialog: MatDialog,
    private snack: MatSnackBar
  ) {
    effect(() => {
      const tDebe = this.totDebe();
      const tHaber = this.totHaber();
      if (this.form) {
        this.form.patchValue(
          { totdebe: tDebe, tothaber: tHaber },
          { emitEvent: false }
        );
      }
    });

    this.dialogRef.disableClose = true;
  }

  // 🔹 Helper para refrescar el grid respetando el orden de carga
  private refreshGrid(columns?: string[]): void {
    if (!this.gridApi) {
      this.pendingGridRefresh = true;
      return;
    }
    this.gridApi.refreshCells({
      force: true,
      columns,
    });
  }

  // zonas
  private cargarZonasPorEmpresa(): void {
    const empresaId = this.usuarioActual?.id_empresa ?? 0;

    this.zonas$ = this.zonaService.getAll().pipe(
      map((list) => (list || []).filter((z) => z.empresaCodigo === empresaId)),
      shareReplay(1)
    );
  }

  private idEdicion: number | null = null;

  ngOnInit(): void {
    this.buildForm();
    this.initAutocompleteBeneficiario();

    this.tiposAsiento$ = this.tipoasientoservice.ListadoAsiento().pipe(
      tap((list) => {
        this.tipoAsientos = (list ?? []).map((r: any) => ({
          id: r.IdTipoAsiento ?? r[' IdTipoAsiento'],
          nombre: (r.Descripcion ?? r.TipAsiento ?? '').toString().trim(),
          tipDoc: (r.TipAsiento ?? r.CodigoDoc ?? '')
            .toString()
            .trim()
            .toUpperCase(),
        }));
        this.syncTipDocFromCurrentId();
      }),
      shareReplay(1)
    );

    this.bindTipoAsientoToTipDoc();

    this.form.get('tipdoc')?.valueChanges.subscribe((v) => {
      if (typeof v === 'string') {
        const up = v.toUpperCase();
        if (v !== up) {
          this.form.get('tipdoc')?.setValue(up, { emitEvent: false });
        }
      }
    });

    this.cargarZonasPorEmpresa();
    this.cargarLocales();
    this.cargarPlanCuentas();
    this.cargarCodigosContables();
    this.cargarMovimientosBancarios();

    const idFromDialog = Number(this.data?.id ?? this.data?.IdCabMaestro ?? 0);
    const idFromRoute = Number(this.route.snapshot.paramMap.get('id') ?? 0);
    const id = idFromDialog || idFromRoute;
    // Verificar si viene modo 'plantilla' en data
    const modoData = this.data?.modo;
    const plantilla = this.data?.asientoPlantilla;

    if (modoData === 'plantilla' && plantilla) {
      // 🔹 MODO PLANTILLA: Cargar asiento pre-configurado
      this.modo.set('plantilla');
      this.cargarPlantilla(plantilla);
      ///ID USUARIO RECUPERADO
      this.usuarioAsientoNombre.set('');
      this.usuarioAsientoIdCargado = null;
      ////

    } else {
      // Lógica original para 'nuevo' o 'editar'
      const idFromDialog = Number(this.data?.id ?? this.data?.IdCabMaestro ?? 0);
      const idFromRoute = Number(this.route.snapshot.paramMap.get('id') ?? 0);
      const id = idFromDialog || idFromRoute;

      if (id > 0) {
        this.idEdicion = id;
        this.modo.set('editar');
        this.bloquearCabecera();
        this.cargarAsiento(id);
        //modo edicion hr cambio solo de lectura
        if (this.data?.soloLectura) {
          this.soloLectura.set(true);
          this.motivoSoloLectura.set(this.data?.motivoSoloLectura ?? '');
        }
        //
      } else {
        this.modo.set('nuevo');

        const empty = createEmptyAsientoContableResponse();
        this.setFormFromHeader(empty);
        this.rowData.set([]);

        this.syncUsuarioEmpresa();

        const fechaTransCtrl = this.form.get('fechatransaccion')!;
        this.form.patchValue(
          { anio: getYearFromInput(fechaTransCtrl.value) },
          { emitEvent: false }
        );

        fechaTransCtrl.valueChanges
          .pipe(
            startWith(fechaTransCtrl.value),
            map(getYearFromInput),
            distinctUntilChanged()
          )
          .subscribe((y) => {
            this.form.patchValue({ anio: y }, { emitEvent: false });
          });
      }
    }
    // if (id > 0) {
    //   this.idEdicion = id;
    //   this.modo.set('editar');
    //   this.bloquearCabecera();
    //   this.cargarAsiento(id);
    // } else {
    //   this.modo.set('nuevo');

    //   const empty = createEmptyAsientoContableResponse();
    //   this.setFormFromHeader(empty);
    //   this.rowData.set([]);

    //   this.syncUsuarioEmpresa();

    //   const fechaTransCtrl = this.form.get('fechatransaccion')!;
    //   this.form.patchValue(
    //     { anio: getYearFromInput(fechaTransCtrl.value) },
    //     { emitEvent: false }
    //   );

    //   fechaTransCtrl.valueChanges
    //     .pipe(
    //       startWith(fechaTransCtrl.value),
    //       map(getYearFromInput),
    //       distinctUntilChanged()
    //     )
    //     .subscribe((y) => {
    //       this.form.patchValue({ anio: y }, { emitEvent: false });
    //     });
    // }
  }

  private buildForm(): void {
    const ahora = new Date();
    const nowIso = formatLocalIso(ahora);
    const today = normalizeToDateOnly(ahora);

    this.form = this.fb.group({
      IdCabMaestro: [0],
      idZona: [0, [Validators.required, Validators.min(1)]],
      idUsuario: [this.usuarioActual?.id_usuario ?? null],
      idEmpresa: [this.usuarioActual?.id_empresa ?? null],
      idTipoAsiento: [null, [Validators.required, Validators.min(1)]],
      tipdoc: ['', [Validators.required]],
      numdoc: [0],
      anio: [''],
      fechatransaccion: [today, [Validators.required]],
      fechaingreso: [nowIso, [Validators.required]],
      observacion: ['', [Validators.required, Validators.maxLength(250)]],
      totdebe: [0],
      tothaber: [0],
      beneficiario: ['', [Validators.required, Validators.maxLength(150)]],
      cierre: [''],
      fechacierre: [null as string | null],
      solicitado: [''],
      depto: [''],
      autorizado: [''],
      homCodigo: [0],
      estado: [true],
      modulo: [0],
    });
  }

  private bindTipoAsientoToTipDoc(): void {
    this.form
      .get('idTipoAsiento')
      ?.valueChanges.subscribe((id: number | null) => {
        const ta = this.tipoAsientos.find((x) => x.id === Number(id));
        const tipDoc = (ta?.tipDoc ?? '').slice(0, 2);
        this.form.get('tipdoc')?.setValue(tipDoc, { emitEvent: false });
      });
  }

  private syncTipDocFromCurrentId(): void {
    const id = this.form.get('idTipoAsiento')?.value;
    const ta = this.tipoAsientos.find((x) => x.id === Number(id));
    const tipDoc = (ta?.tipDoc ?? '').slice(0, 2);
    this.form.get('tipdoc')?.setValue(tipDoc, { emitEvent: false });
  }

  private setFormFromHeader(h: AsientoContableResponse): void {
    const idTipoAsiento =
      h.idTipoAsiento && h.idTipoAsiento > 0 ? h.idTipoAsiento : null;

    this.form.reset({
      IdCabMaestro: h.IdCabMaestro,
      idZona: h.idZona,
      idUsuario: h.idUsuario,
      idEmpresa: h.idEmpresa,
      idTipoAsiento: idTipoAsiento,
      tipdoc: h.tipdoc,
      numdoc: h.numdoc,
      anio: h.anio,
      fechatransaccion: h.fechatransaccion
        ? normalizeToDateOnly(h.fechatransaccion as any)
        : '',
      fechaingreso: h.fechaingreso,
      observacion: h.observacion,
      totdebe: h.totdebe,
      tothaber: h.tothaber,
      beneficiario: h.beneficiario,
      cierre: h.cierre,
      fechacierre: h.fechacierre ?? null,
      solicitado: h.solicitado,
      depto: h.depto,
      autorizado: h.autorizado,
      homCodigo: h.homCodigo,
      estado: h.estado,
    });
  }

  private cargarAsiento(idCabMaestro: number): void {
    this.loading.set(true);
    this.service.getById(idCabMaestro).subscribe({
      next: (resp) => {
        this.setFormFromHeader(resp);
        ///USUARIO RECUPERADO
        //SOLO EDITAR: recuperar nombre del usuario del asiento (transacción)
        const idUserAsiento =
        Number((resp as any)?.idUsuario ?? (resp as any)?.IdUsuario ?? this.form.get('idUsuario')?.value ?? 0);
        this.cargarUsuarioAsientoNombre(idUserAsiento);
        /// END

        this.rowData.set(resp.detalles ?? []);
        this.refreshGrid(); // 🔹 fuerza refresco cuando ya hay detalle
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar asiento', err);
        this.loading.set(false);
      },
    });
  }
  /**
   * Carga un asiento como plantilla para transacciones estándar
   * Mantiene toda la estructura pero permite editar solo campos específicos
  */
  private cargarPlantilla(plantilla: AsientoContableResponse): void {
    // Setear la cabecera (con beneficiario y observación vacíos)
    this.setFormFromHeader(plantilla);

    // Asegurar que modulo = 5
    this.form.patchValue({ modulo: 5 }, { emitEvent: false });

    this.form.get('idZona')?.disable();
    this.form.get('idTipoAsiento')?.disable();

    // Cargar las líneas del detalle
    this.rowData.set(plantilla.detalles ?? []);

    // Sincronizar usuario y empresa
    this.syncUsuarioEmpresa();

    // Forzar refresco del grid
    this.refreshGrid();

    console.log('✅ Plantilla cargada con modulo=5');
  }
  private cargarLocales(): void {
    this.localesService.getAll().subscribe({
      next: (res) => {
        const data = (res.data ?? []) as LocalesResponse[];

        this.locales = data.map((l) => ({
          id: (l as any).idLocal ?? (l as any).id ?? 0,
          nombre: (l as any).nombre,
        }));

        this.refreshGrid(['idLocal']); // 🔹 en vez de gridApi?
      },
      error: (err) => {
        console.error('Error cargando locales', err);
      },
    });
  }

  /*
  private cargarPlanCuentas(): void {
    const empresaId = this.usuarioActual?.id_empresa ?? 0;
    this.planCuentasService
      .getAll({ idEmpresa: empresaId, estado: 'A' })
      .subscribe({
        next: (list: PlanCuenta[]) => {
          const movs = (list || []).filter((c) => c.EsMovimiento);

          this.cuentas = movs.map((c) => ({
            id: c.IdPlanCuentas,
            label: `${c.CuentaPresentacion} - ${c.NombreCuenta}`,
            codigo: c.CuentaPresentacion,
          }));

          this.refreshGrid(['idPlanCuentas']);
        },
        error: (err) => {
          console.error('Error cargando plan de cuentas', err);
        },
      });
  }

  */

  ////PLAN DE CUENTAS FILTRADAS
  private cargarPlanCuentas(): void {
    const empresaId = this.usuarioActual?.id_empresa ?? 0;

    this.planCuentasService
      .getAll({ idEmpresa: empresaId, estado: 'A' })
      .subscribe({
        next: (list: PlanCuenta[]) => {
          const fuente = list || [];

          // ✅ SOLO cuentas con esMovimiento = 1
          const soloMovimiento = fuente.filter((c: any) => {
            const v =
              c?.EsMovimiento ??
              c?.esMovimiento ??
              c?.es_movimiento ??
              c?.Movimiento ??
              c?.movimiento;

            return Number(v) === 1; // <- aquí está la regla exacta
          });

          this.cuentas = soloMovimiento.map((c: any) => ({
            id: Number(c?.IdPlanCuentas ?? 0),
            label: `${(c?.CuentaPresentacion ?? '').toString().trim()} - ${(c?.NombreCuenta ?? '').toString().trim()}`,
            codigo: (c?.CuentaPresentacion ?? '').toString().trim(),
          }));

          this.refreshGrid(['idPlanCuentas']);
        },
        error: (err) => {
          console.error('Error cargando plan de cuentas', err);
        },
      });
  }

  ///

  private cargarCodigosContables(): void {
    const empresaId = this.usuarioActual?.id_empresa ?? 0;

    this.codigosContablesService.getAll({ idEmpresa: empresaId }).subscribe({
      next: (res) => {
        const data = (res.data ?? []) as CodigosContablesResponse[];

        this.auxiliares = data.map((a) => ({
          id: a.IdCodContable,
          label: `${a.Identificacionauxiliar} - ${a.Razonsocial}`,
        }));

        this.refreshGrid(['idCodContable']);
      },
      error: (err) => {
        console.error('Error cargando códigos contables', err);
      },
    });
  }

  private cargarMovimientosBancarios(): void {
    this.movimientoBancarioService.getAll().subscribe({
      next: (res) => {
        const data = (res.data ?? []) as MovimientoBancarioResponse[];

        this.movimientosBancarios = (data || [])
          .filter((m) => m.IdMovBancario && m.IdMovBancario > 0)
          .map((m) => ({
            id: m.IdMovBancario,
            movimiento: m.Movimiento,
            descripcion: m.Descripcion,
            label: `${m.Movimiento} - ${m.Descripcion}`,
          }));

        this.refreshGrid(['idMovBancario']);
      },
      error: (err) => {
        console.error('Error cargando movimientos bancarios', err);
      },
    });
  }

  private validarDetalle(): boolean {
    const filas = this.rowData() ?? [];
    const errores: string[] = [];

    if (!filas.length) {
      errores.push('Debe ingresar al menos una línea en el detalle.');
    }

    filas.forEach((f, idx) => {
      const linea = idx + 1;
      const idLocal = Number(f.idLocal || 0);
      const idPlanCuentas = Number(f.idPlanCuentas || 0);
      const idAuxiliar = Number(f.idCodContable || 0);
      const idMovBancario = Number(f.idMovBancario || 0);
      const debe = Number(f.debe || 0);
      const haber = Number(f.haber || 0);

      if (idLocal <= 0) {
        errores.push(`Línea ${linea}: debe seleccionar el Local.`);
      }

      if (idPlanCuentas <= 0) {
        errores.push(`Línea ${linea}: debe seleccionar la Cuenta Contable.`);
      }

      if (idAuxiliar <= 0) {
        errores.push(
          `Línea ${linea}: debe seleccionar el Auxiliar Contable.`
        );
      }

      if (debe <= 0 && haber <= 0) {
        errores.push(
          `Línea ${linea}: debe ingresar un valor en Debe o en Haber.`
        );
      }

      if (debe > 0 && haber > 0) {
        errores.push(
          `Línea ${linea}: no puede tener valores en Debe y Haber al mismo tiempo.`
        );
      }

      if (idMovBancario <= 0) {
        errores.push(
          `Línea ${linea}: debe seleccionar el Tipo de Movimiento (distinto de NINGUNO).`
        );
      }
    });

    const diff = this.totDebe() - this.totHaber();
    if (Math.round(diff * 100) / 100 !== 0) {
      errores.push(
        'La diferencia entre Total Debe y Total Haber debe ser 0. Verifique los valores.'
      );
    }

    if (errores.length > 0) {
      this.snack.open(errores[0], 'Cerrar', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top',
      });

      console.warn('Errores en detalle de asiento:', errores);
      return false;
    }

    return true;
  }

  guardar(): void {
    
    ///validacion hr solo de lectura
    if (this.isViewOnly()) {
       const msg = this.motivoSoloLectura().trim() || 'Este asiento está en modo solo lectura.';
        this.snack.open(msg, 'Cerrar', {
          duration: 5000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
      });
      return;
    }
    
    
    if (this.saving() || this.loading()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snack.open('Revisa los campos obligatorios', 'OK', {
        duration: 2500,
        horizontalPosition: 'right',
        verticalPosition: 'top',
      });
      return;
    }

    if (!this.validarDetalle()) {
      return;
    }

    // const esNuevo = this.modo() === 'nuevo';

    const esNuevo = this.modo() === 'nuevo' || this.modo() === 'plantilla';

    const ahora = new Date();
    const nowIso = formatLocalIso(ahora);

    const fechaTransControl = this.form.get('fechatransaccion')!.value;
    const fechaTransaccionDateOnly = fechaTransControl
      ? normalizeToDateOnly(fechaTransControl)
      : normalizeToDateOnly(ahora);

    const anioTransaccion = getYearFromInput(fechaTransaccionDateOnly);

    this.form.patchValue(
      {
        anio: anioTransaccion,
        fechatransaccion: fechaTransaccionDateOnly,
      },
      { emitEvent: false }
    );

    if (esNuevo) {
      this.form.patchValue(
        {
          fechaingreso: nowIso,
          fechacierre: null,
        },
        { emitEvent: false }
      );

      const detallesActuales = this.rowData() ?? [];

      const detallesConFecha = detallesActuales.map((d) => {
        const fechaIng =
          d.fechaingreso && d.fechaingreso !== ''
            ? normalizeToLocalIso(d.fechaingreso)
            : nowIso;

        const fechaTransDet =
          d.fechatransaccion && d.fechatransaccion !== ''
            ? normalizeToDateOnly(d.fechatransaccion)
            : fechaTransaccionDateOnly;

        return {
          ...d,
          anio: d.anio && d.anio !== '' ? d.anio : anioTransaccion,
          fechatransaccion: fechaTransDet,
          fechaingreso: fechaIng,
          hora: d.hora && d.hora !== '' ? d.hora : getTimeFromInput(fechaIng),
          fechacierre: d.fechacierre || '',
          autorizacionRelacionado: '',
          fechaCadRelacionado: '',
          // PORCENTAJE Siempre enviar null en estos campos al crear
          idPorIva: null,
          porcentaje: null,

        } as DetalleAsientoResponse;
      });

      this.rowData.set(detallesConFecha);
    }

    const rawForm = this.form.value as AsientoContableResponse;

    const header: AsientoContableResponse = {
      ...rawForm,
      modulo: this.modo() === 'plantilla' ? 5 : (rawForm.modulo ?? 0),
      idZona: this.form.get('idZona')?.value ?? rawForm.idZona,
      idTipoAsiento: this.form.get('idTipoAsiento')?.value ?? rawForm.idTipoAsiento,
      tipdoc: this.form.get('tipdoc')?.value ?? rawForm.tipdoc,
      fechatransaccion: fechaTransaccionDateOnly,
      fechaingreso: esNuevo ? nowIso : normalizeToLocalIso(rawForm.fechaingreso),
      fechacierre: esNuevo ? '' : rawForm.fechacierre,
      numdoc: esNuevo ? 0 : rawForm.numdoc ?? 0,
      totdebe: this.totDebe(),
      tothaber: this.totHaber(),
      //detalles: this.rowData(), ESTABA ANTES AHORA ESTA CON PORCENTAJE NULL
      detalles: (this.rowData() ?? []).map((d) => ({
        ...d,
        idPorIva: null,
        porcentaje: null,
      }) as DetalleAsientoResponse),
    };
    console.log('🔍 Guardando asiento:', {
      modo: this.modo(),
      esNuevo,
      modulo: header.modulo,
      idZona: header.idZona,
      idTipoAsiento: header.idTipoAsiento,
      beneficiario: header.beneficiario,
      observacion: header.observacion
    });
    this.saving.set(true);

    let save$: import('rxjs').Observable<ApiResponse<number | boolean>>;

    if (esNuevo) {
      save$ = this.service.crear(header) as any;
    } else {
      save$ = this.service.actualizar(
        header.IdCabMaestro ||
          Number(this.route.snapshot.paramMap.get('id') ?? 0),
        header
      ) as any;
    }

    save$
      .pipe(
        tap((resp: ApiResponse<number | boolean>) => {
          if (esNuevo && typeof resp.data === 'number' && resp.data > 0) {
            this.form.patchValue(
              { IdCabMaestro: resp.data },
              { emitEvent: false }
            );
          }

          if (resp.message) {
            const match = resp.message.match(/Numdoc\s*=\s*(\d+)/i);
            this.numdocGenerado = match && match[1] ? match[1] : null;
          }
        }),
        map((resp: ApiResponse<number | boolean>) => {
          const ok =
            typeof resp.data === 'number' ? resp.data > 0 : !!resp.data;

          if (!ok) {
            throw resp;
          }
          return true;
        }),
        catchError((err: any) => {
          let msg = 'No se ha podido registrar el asiento.';

          if (err?.status === 400) {
            msg =
              'No está definido el número de control o está ocupado, verifique.';
          } else if (err?.error?.message) {
            msg = err.error.message;
          } else if (err?.message) {
            msg = err.message;
          }

          this.snack.open(msg, 'Cerrar', {
            duration: 4000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
          });
          console.error('Error backend asiento:', err);
          return of(false);
        }),
        finalize(() => this.saving.set(false))
      )
      .subscribe((ok) => {
        if (ok) {
          const msg = this.numdocGenerado
            ? `Guardado correctamente. Numdoc: ${this.numdocGenerado}`
            : 'Guardado correctamente';

          this.snack.open(msg, 'OK', {
            duration: 2000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
          });

          const dlg = this.mostrarMensaje({
            title: 'Imprimir asiento',
            message: '¿Desea imprimir el asiento?',
            type: 'info',
            confirmText: 'Sí',
            cancelText: 'No',
            showCancel: true,
          });

          dlg.afterClosed().subscribe((imprimir) => {
            if (imprimir) {
              this.imprimirAsiento();
            }
            this.dialogRef.close(true);
          });
        }
      });
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }

  onGridReady(evt: GridReadyEvent<DetalleAsientoResponse>): void {
    this.gridApi = evt.api;

    // Si mientras tanto algún catálogo pidió refrescar, lo aplicamos ahora
    if (this.pendingGridRefresh) {
      this.pendingGridRefresh = false;
      this.refreshGrid();
    }
  }

  onCellValueChanged(
    evt: CellValueChangedEvent<DetalleAsientoResponse>
  ): void {
    if (evt.colDef.field === 'debe' || evt.colDef.field === 'haber') {
      const filas = this.rowData() ?? [];
      const rowIndex = evt.node.rowIndex ?? 0;
      const lastIndex = filas.length - 1;

      this.rowData.set([...filas]);

      if (rowIndex < lastIndex) {
        this.recalcularHaberDesdeDebe(false);
      }
    }

    if (evt.colDef.field === 'idPlanCuentas') {
      const id = Number(evt.newValue ?? 0);
      const cta = this.cuentas.find((c) => c.id === id);

      if (cta && evt.data) {
        evt.data.codprePc = cta.codigo;

        this.rowData.set([...this.rowData()]);
        this.gridApi.refreshCells({
          rowNodes: [evt.node],
          columns: ['codprePc'],
          force: true,
        });
      }
    }

    if (evt.colDef.field === 'idMovBancario') {
      const id = Number(evt.newValue ?? 0);

      if (!id || id <= 0) {
        const oldId = Number(evt.oldValue ?? 0);
        evt.data!.idMovBancario = oldId;

        const oldMov = this.movimientosBancarios.find((m) => m.id === oldId);
        evt.data!.movbancario = oldMov ? oldMov.movimiento : '';

        this.rowData.set([...this.rowData()]);
        this.gridApi.refreshCells({
          rowNodes: [evt.node],
          columns: ['idMovBancario', 'movbancario', 'accion'],
          force: true,
        });

        this.snack.open(
          'Debe seleccionar un Tipo de Movimiento válido (no se permite "0 - NINGUNO").',
          'Cerrar',
          {
            duration: 3500,
            horizontalPosition: 'right',
            verticalPosition: 'top',
          }
        );
        return;
      }

      const mov = this.movimientosBancarios.find((m) => m.id === id);

      if (mov && evt.data) {
        evt.data.movbancario = mov.movimiento;

        this.rowData.set([...this.rowData()]);
        this.gridApi.refreshCells({
          rowNodes: [evt.node],
          columns: ['movbancario', 'accion'],
          force: true,
        });
      }
    }
  }

  onCellClicked(evt: CellClickedEvent<DetalleAsientoResponse>): void {
    if (evt?.colDef?.colId !== 'accion') {
      return;
    }

    const button = (evt.event?.target as HTMLElement)?.closest('button');
    if (!button) {
      return;
    }

    const action = button.getAttribute('data-action');

    if (action === 'delete' && evt.node?.data) {
      this.eliminarLinea(evt.node.data);
      return;
    }

    if (action === 'edit-tributario' && evt.node?.data) {
      const idMov = Number(evt.node.data.idMovBancario || 0);
      const disabled = button.getAttribute('data-disabled') === 'true';
      const movCode = (evt.node.data.movbancario ?? '').toString().trim();

      if (disabled || idMov <= 0) {
        this.snack.open(
          'Primero seleccione un Tipo de Movimiento válido para esta línea.',
          'Cerrar',
          {
            duration: 4000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
          }
        );
        return;
      }

      if (disabled || movCode === '0') {
        this.snack.open(
          'No puede registrar datos tributarios cuando el tipo de movimiento es NINGUNO.',
          'Cerrar',
          {
            duration: 4000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
          }
        );
        return;
      }

      this.abrirDialogoTributario(evt.node.data, evt.node);
    }
  }

  agregarLinea(): void {
   
    ///cambio hr validacion solo de lectura
    if (this.isViewOnly()) {
      const msg = this.motivoSoloLectura().trim() || 'Este asiento está en modo solo lectura.';
      this.snack.open(msg, 'Cerrar', { duration: 3500, horizontalPosition: 'right', verticalPosition: 'top' });
      return;
    }
    
    
    const idZonaCtrl = this.form.get('idZona');
    const idTipoAsientoCtrl = this.form.get('idTipoAsiento');

    const idZona = Number(idZonaCtrl?.value || 0);
    const idTipoAsiento = Number(idTipoAsientoCtrl?.value || 0);

    const beneficiarioCtrl  = this.form.get('beneficiario');
    const conceptoCtrl      = this.form.get('observacion'); //campo "Concepto" en el formulario


    const mensajes: string[] = [];
    if (idZona <= 0) {
      mensajes.push('Debe seleccionar la Zona.');
      idZonaCtrl?.markAsTouched();
    }
    if (!idTipoAsiento || idTipoAsiento <= 0) {
      mensajes.push('Debe seleccionar el Tipo de Asiento.');
      idTipoAsientoCtrl?.markAsTouched();
    }

    // 🔹 NUEVO: validar Beneficiario
    if (!beneficiarioCtrl?.value || beneficiarioCtrl.invalid) {
      mensajes.push('Debe seleccionar el Beneficiario.');
      beneficiarioCtrl?.markAsTouched();
    }

    // 🔹 NUEVO: validar Concepto (observacion)
    if (!conceptoCtrl?.value || conceptoCtrl.invalid) {
      mensajes.push('Debe ingresar el Concepto.');
      conceptoCtrl?.markAsTouched();
    }

    if (mensajes.length > 0) {
      this.snack.open(mensajes.join(' '), 'Cerrar', {
        duration: 4000,
        horizontalPosition: 'right',
        verticalPosition: 'top',
      });
      return;
    }

    /// VALIDAR SI YA ESTA CON DATOS LAS LINEA
      if (!this.validarAntesDeAgregarLinea()) {
        return;
      }

    //

    const ahora = new Date();
    const nowIso = formatLocalIso(ahora);

    const items = this.rowData();
    const next = (items?.length ?? 0) + 1;

    const fechaTransFormulario =
      this.form.value?.fechatransaccion || normalizeToDateOnly(ahora);
    const fechaTransaccionDetalle = normalizeToDateOnly(fechaTransFormulario);
    const anioTransaccion =
      this.form.value?.anio || getYearFromInput(fechaTransaccionDetalle);

    const fechaIngresoIso = nowIso;
    const horaIngreso = getTimeFromInput(fechaIngresoIso);

    const nueva: DetalleAsientoResponse = {
      IdDetMaestro: 0,
      IdCabMaestro: Number(this.form.value?.IdCabMaestro ?? 0),
      numlinea: next,
      anio: anioTransaccion,
      fechatransaccion: fechaTransaccionDetalle,
      fechaingreso: fechaIngresoIso,
      hora: horaIngreso,
      idZona: Number(this.form.value?.idZona ?? 0),
      idCentroCostos: 0,
      idLocal: 0,
      idPlanCuentas: 0,
      codprePc: '',
      idCodContable: 0,
      nocomprobante: '',
      docurelacionado: '',
      cheque: 0,
      beneficiario: this.form.value?.beneficiario ?? '',
      debe: 0,
      haber: 0,
      comentario: this.form.value?.observacion ?? '',
      idMovBancario: 0,
      movbancario: '',
      cierre: '',
      fechacierre: '',
      conciliado: '',
      fechaconciliado: '',
      idSustentoTrib: 0,
      idTipoCompSri: 0,
      autorizacion: '',
      fechacaduca: '',
      idTipoRetencion: 0,
      idProyecto: 0,
      idSubproyecto: 0,
      transferido: false,
      fechatransferido: '',
      fechavencimiento: '',
      idConciliacion: 0,
      valorLetras: '',
      estadoIngreso: true,
      autorizacionRelacionado: '',
      fechaCadRelacionado: '',
      idPorIva: null,  //AÑADIDO PORCENTAJE IVA AQUI SIEMPRE VA NULL
      porcentaje: null,
    };

    this.rowData.set([...(items ?? []), nueva]);

    queueMicrotask(() => {
      const lastIndex = (this.rowData().length ?? 1) - 1;
      this.gridApi?.ensureIndexVisible(lastIndex);
      this.gridApi?.startEditingCell({
        rowIndex: lastIndex,
        colKey: 'codprePc',
      });
    });

    this.bloquearCabecera();
    this.recalcularHaberDesdeDebe(true);
  }

  eliminarLinea(item: DetalleAsientoResponse): void {
    const actuales = this.rowData() ?? [];
    const deletedIndex = actuales.indexOf(item);
    const items = actuales.filter((x) => x !== item);

    items.forEach((d, i) => (d.numlinea = i + 1));

    this.rowData.set(items);

    const eraUltima = deletedIndex === actuales.length - 1;

    if (!eraUltima) {
      this.recalcularHaberDesdeDebe(false);
    }
  }

  isReadOnly(): boolean {
    return this.saving() || this.loading();
  }

  private mostrarMensaje(data: MessageBoxData) {
    const config: MatDialogConfig<MessageBoxData> = {
      width: '400px',
      data: {
        confirmText: 'Aceptar',
        cancelText: 'Cancelar',
        ...data,
      },
    };
    return this.dialog.open<unknown, MessageBoxData, boolean>(
      CustomMessageBoxComponent as ComponentType<unknown>,
      config
    );
  }

  private mostrarValidacion(campos: string[]): void {
    const message =
      'Faltan campos obligatorios:\n' +
      campos.map((c) => `• ${c}`).join('\n');

    this.mostrarMensaje({
      title: 'Formulario incompleto',
      message,
      type: 'warning',
      showCancel: false,
      confirmText: 'Aceptar',
    });
  }

  private abrirDialogoTributario(
    row: DetalleAsientoResponse,
    rowNode: any
  ): void {
    const movLabel =
      this.movimientosBancarios.find(
        (m) => m.id === Number(row.idMovBancario || 0)
      )?.label || row.movbancario || '';

    const data: AsientoTributarioData & { movLabel?: string } = {
      idSustentoTrib: Number(row.idSustentoTrib || 0),
      idTipoCompSri: Number(row.idTipoCompSri || 0),
      autorizacion: row.autorizacion || '',
      fechacaduca: row.fechacaduca || null,
      idTipoRetencion: Number(row.idTipoRetencion || 0),
      idCentroCostos: Number(row.idCentroCostos || 0),
      idProyecto: Number(row.idProyecto || 0),
      idSubproyecto: Number(row.idSubproyecto || 0),
      movLabel,
    };

    const dialogRef = this.dialog.open(AsientoTributarioDialogComponent, {
      width: '820px',
      data: data as any,
    });

    dialogRef
      .afterClosed()
      .subscribe(
        (result?: AsientoTributarioData & { movLabel?: string }) => {
          if (!result) {
            return;
          }

          row.idSustentoTrib = result.idSustentoTrib;
          row.idTipoCompSri = result.idTipoCompSri;
          row.autorizacion = result.autorizacion;
          row.fechacaduca = (result as any).fechacaduca ?? '';
          row.idTipoRetencion = result.idTipoRetencion;
          row.idCentroCostos = result.idCentroCostos;
          row.idProyecto = result.idProyecto;
          row.idSubproyecto = result.idSubproyecto;

          this.rowData.set([...this.rowData()]);
          this.gridApi.refreshCells({
            rowNodes: [rowNode],
            force: true,
            columns: [
              'idSustentoTrib',
              'idTipoCompSri',
              'autorizacion',
              'fechacaduca',
              'idTipoRetencion',
              'idCentroCostos',
              'idProyecto',
              'idSubproyecto',
            ],
          });
        }
      );
  }

  private bloquearCabecera(): void {
    if (this.cabeceraBloqueada) {
      return;
    }
    this.cabeceraBloqueada = true;
  }

  private recalcularHaberDesdeDebe(forzar: boolean = false): void {
    const filas = this.rowData() ?? [];

    if (filas.length < 2) {
      if (forzar && filas.length === 1) {
        filas[0].haber = 0;
        filas[0].debe = filas[0].debe || 0;
        this.rowData.set([...filas]);
        this.gridApi?.refreshCells({
          force: true,
          columns: ['debe', 'haber'],
        });
      }
      return;
    }

    const lastIndex = filas.length - 1;
    const filaSaldo = filas[lastIndex];

    const lastTieneHaber = Number(filaSaldo.haber || 0) > 0;

    if (!forzar && !lastTieneHaber) {
      return;
    }

    const totalDebe = filas.reduce(
      (acc, f) => acc + (Number(f.debe) || 0),
      0
    );

    const totalHaberSinSaldo = filas.reduce((acc, f, idx) => {
      if (idx === lastIndex) return acc;
      return acc + (Number(f.haber) || 0);
    }, 0);

    let saldo = totalDebe - totalHaberSinSaldo;
    saldo = Number(saldo.toFixed(2));

    if (saldo < 0) {
      saldo = 0;
    }

    filaSaldo.debe = 0;
    filaSaldo.haber = saldo;

    this.rowData.set([...filas]);
    this.gridApi?.refreshCells({
      force: true,
      columns: ['debe', 'haber'],
    });
  }

  formatearBeneficiario(c: CodigosContablesResponse): string {
    return `${c.Identificacionauxiliar} - ${c.Razonsocial}`.trim();
  }

  private initAutocompleteBeneficiario(): void {
    const ctrl = this.form.get('beneficiario');
    if (!ctrl) return;

    this.beneficiariosFiltrados$ = ctrl.valueChanges.pipe(
      debounceTime(300),
      map((value: any) => {
        if (typeof value === 'string') {
          return value;
        }
        return '';
      }),
      distinctUntilChanged(),
      switchMap((term: string) => {
        const empresaId = this.usuarioActual?.id_empresa ?? 0;
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

  onBeneficiarioSelected(c: CodigosContablesResponse): void {
    if (!c) return;

    const razon = (c.Razonsocial ?? '').toString().trim();
    this.form.get('beneficiario')?.setValue(razon, { emitEvent: false });
  }

  imprimirAsiento(): void {
    const id = Number(
      this.form.get('IdCabMaestro')?.value ||
        this.route.snapshot.paramMap.get('id') ||
        0
    );

    if (!id || id <= 0) {
      this.snack.open(
        'Debe guardar el asiento antes de poder imprimirlo.',
        'Cerrar',
        {
          duration: 4000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
        }
      );
      return;
    }

    this.loading.set(true);

    this.service
      .getAsientoImpresion(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (asiento: AsientoImpresion) => {
          if (!asiento) {
            this.snack.open(
              'No se encontraron datos para la impresión del asiento.',
              'Cerrar',
              {
                duration: 4000,
                horizontalPosition: 'right',
                verticalPosition: 'top',
              }
            );
            return;
          }
          generarPdfAsiento(asiento, this.nombreusuario);
        },
        error: (err) => {
          console.error('Error al obtener asiento para impresión:', err);
          this.snack.open(
            'Ocurrió un error al preparar la impresión del asiento.',
            'Cerrar',
            {
              duration: 4000,
              horizontalPosition: 'right',
              verticalPosition: 'top',
            }
          );
        },
      });
  }

  //AÑADIR MAS EVENTOS QUI
  private validarLineaDetalleMinima(
    f: DetalleAsientoResponse,
    idxBase1: number
  ): string[] {
    const errores: string[] = [];

    const idLocal = Number(f.idLocal || 0);
    const idPlanCuentas = Number(f.idPlanCuentas || 0);
    const idAuxiliar = Number(f.idCodContable || 0);
    const idMovBancario = Number(f.idMovBancario || 0);
    const debe = Number(f.debe || 0);
    const haber = Number(f.haber || 0);

    if (idLocal <= 0) errores.push(`Línea ${idxBase1}: seleccione el Local.`);
    if (idPlanCuentas <= 0) errores.push(`Línea ${idxBase1}: seleccione la Cuenta Contable.`);
    if (idAuxiliar <= 0) errores.push(`Línea ${idxBase1}: seleccione el Auxiliar Contable.`);

    if (debe <= 0 && haber <= 0) {
      errores.push(`Línea ${idxBase1}: ingrese un valor en Debe o Haber.`);
    }
    if (debe > 0 && haber > 0) {
      errores.push(`Línea ${idxBase1}: no puede tener Debe y Haber a la vez.`);
    }

    if (idMovBancario <= 0) {
      errores.push(`Línea ${idxBase1}: seleccione un Tipo de Movimiento (distinto de NINGUNO).`);
    }

    return errores;
  }

  /** Si ya hay líneas, obliga a que la última esté completa antes de agregar otra */
 private validarAntesDeAgregarLinea(): boolean {
  const filas = this.rowData() ?? [];
  if (filas.length === 0) return true;

  for (let i = 0; i < filas.length; i++) {
    const errores = this.validarLineaDetalleMinima(filas[i], i + 1);
    if (errores.length > 0) {
      this.snack.open(errores[0], 'Cerrar', {
        duration: 4000,
        horizontalPosition: 'right',
        verticalPosition: 'top',
      });
      return false;
    }
  }
  return true;
}

///
private cargarUsuarioAsientoNombre(idUsuario: number): void {
  const id = Number(idUsuario || 0);

    // Solo en editar
    if (this.modo() !== 'editar') {
      this.usuarioAsientoNombre.set('');
      this.usuarioAsientoIdCargado = null;
      return;
    }

    if (id <= 0) {
      this.usuarioAsientoNombre.set('');
      this.usuarioAsientoIdCargado = null;
      return;
    }

    // Evita llamar varias veces por el mismo usuario
    if (this.usuarioAsientoIdCargado === id && this.usuarioAsientoNombre().trim()) return;

    this.usuarioAsientoIdCargado = id;

    this.usuarioService.getUsuarioById(id).pipe(
      map((r: any) => r?.data),
      catchError((err) => {
        console.error('Error getUsuarioById (usuario asiento):', err);
        return of(null);
      })
    ).subscribe((u: any) => {
      // Ajusta estos campos según tu UsuariosResponse real:
      const nombre =
        (u?.nombre_usuario ?? u?.nombreUsuario ?? u?.username ?? u?.usuario ?? '').toString().trim();

      this.usuarioAsientoNombre.set(nombre || '');
    });
  }

  ///
}

/** Helpers de celdas */
function numberParser(params: any): number {
  const v = (params.newValue ?? '').toString().replace(',', '.').trim();
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function boolParser(params: any): boolean {
  const v = (params.newValue ?? '').toString().toLowerCase().trim();
  return v === 'true' || v === '1' || v === 'sí' || v === 'si';
}

function isoParser(params: any): string {
  const v = (params.newValue ?? '').toString().trim();
  if (!v) return '';
  return normalizeToLocalIso(v);
}

function blockComma(params: any): boolean {
  return params.event?.key === ',';
}

const decimalDot2Regex = /^\d*(\.\d{0,2})?$/;

function valueSetterDot2(params: any): boolean {
  const raw = String(params.newValue ?? '').trim();
  if (raw.includes(',')) return false;
  if (!decimalDot2Regex.test(raw)) return false;
  const n = Number(raw);
  if (Number.isNaN(n)) return false;

  const field = params.colDef.field!;
  if (field === 'debe') {
    params.data.debe = n > 0 ? Number(n.toFixed(2)) : 0;
    if (params.data.debe > 0) params.data.haber = 0;
  } else if (field === 'haber') {
    params.data.haber = n > 0 ? Number(n.toFixed(2)) : 0;
    if (params.data.haber > 0) params.data.debe = 0;
  } else {
    (params.data as any)[field] = n;
  }
  return true;
}

function twoDecimalsDotFormatter(p: any): string {
  const val = Number(p.value ?? 0);
  return val.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const toNumber = (v: any): number => {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return v;
  const normalized = String(v).replace(/\./g, '').replace(',', '.');
  const n = parseFloat(normalized);
  return isNaN(n) ? 0 : n;
};

function debeEditable(params: any) {
  const h = toNumber(params.data?.haber);
  return h <= 0;
}

function haberEditable(params: any) {
  const d = toNumber(params.data?.debe);
  return d <= 0;
}

function getYearFromInput(v: any): string {
  if (!v) return '';
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? '' : String(d.getFullYear());
}

function getTimeFromInput(v: any): string {
  if (!v) return '';
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return '';

  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');

  return `${hh}:${mm}:${ss}`;
}

function formatLocalIso(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
}

function normalizeToLocalIso(v: any): string {
  if (!v) return '';
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) {
    return String(v);
  }
  return formatLocalIso(d);
}

function onlyDigitsKey(params: any): boolean {
  const e = params.event as KeyboardEvent;
  const key = e.key;

  if (
    key === 'Backspace' ||
    key === 'Delete' ||
    key === 'Tab' ||
    key === 'ArrowLeft' ||
    key === 'ArrowRight' ||
    key === 'ArrowUp' ||
    key === 'ArrowDown' ||
    key === 'Home' ||
    key === 'End' ||
    key === 'Enter'
  ) {
    return false;
  }

  if (e.ctrlKey || e.metaKey) {
    return false;
  }

  if (/^[0-9]$/.test(key)) {
    return false;
  }

  e.preventDefault();
  return true;
}

function sanitizeTextoGenerico(value: any): string {
  const raw = (value ?? '').toString();
  return raw.replace(/[^0-9a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.,;-]/g, '');
}

function onlyAllowedComentarioKey(params: any): boolean {
  const e = params.event as KeyboardEvent;
  const key = e.key;

  if (
    key === 'Backspace' ||
    key === 'Delete' ||
    key === 'Tab' ||
    key === 'Enter' ||
    key === 'Escape' ||
    key === 'ArrowLeft' ||
    key === 'ArrowRight' ||
    key === 'ArrowUp' ||
    key === 'ArrowDown' ||
    key === 'Home' ||
    key === 'End'
  ) {
    return false;
  }

  if (e.ctrlKey || e.metaKey) {
    return false;
  }

  const allowedCharRegex = /^[0-9a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.,;-]$/;

  if (allowedCharRegex.test(key)) {
    return false;
  }

  e.preventDefault();
  return true;
}

function formatDateOnly(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Normaliza cualquier entrada a SOLO fecha yyyy-MM-dd */
function normalizeToDateOnly(v: any): string {
  if (!v) return '';

  if (typeof v === 'string') {
    const s = v.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      return s.substring(0, 10);
    }
    return s;
  }

  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) {
    return String(v);
  }
  return formatDateOnly(d);
}
