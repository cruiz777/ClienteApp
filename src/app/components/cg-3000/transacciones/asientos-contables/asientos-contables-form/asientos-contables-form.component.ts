import { Component, OnInit, ViewChild, effect, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UsuarioService } from 'src/app/services/usuario.service';
import { MatDialogRef } from '@angular/material/dialog';
import { startWith, distinctUntilChanged } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { tap, shareReplay} from 'rxjs/operators';
import { TipoAsientoService } from 'src/app/services/tipoasiento.service';
import { TipoAsientoResponse } from 'src/app/interfaces/responses/tipo-asiento-response';

import { AgGridAngular } from 'ag-grid-angular';
import {
  AllCommunityModule, ModuleRegistry, ColDef, GridApi,
  GridReadyEvent, CellValueChangedEvent, CellClickedEvent,
} from 'ag-grid-community';

import { AsientosContablesService } from 'src/app/services/asientos-contables.service';
import {
  AsientoContableResponse,
  DetalleAsientoResponse,
  createEmptyAsientoContableResponse,
} from 'src/app/interfaces/responses/asiento-contable-response';

import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { catchError, finalize, map } from 'rxjs/operators';
import { of } from 'rxjs';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-asientos-contables-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AgGridAngular, MatSnackBarModule],
  templateUrl: './asientos-contables-form.component.html',
  styleUrls: ['./asientos-contables-form.component.css'],
})
export class AsientosContablesFormComponent implements OnInit {
  @ViewChild(AgGridAngular) agGrid!: AgGridAngular;

  modo = signal<'nuevo' | 'editar'>('nuevo');
  loading = signal(false);
  saving = signal(false);
  titulo = computed(() =>
    this.modo() === 'nuevo'
      ? 'Crear/Editar (Asiento Contable) — NUEVO'
      : 'Crear/Editar (Asiento Contable) — EDITAR'
  );

  // USUARIO
  usuarioActual = this.usuarioService.getUsuarioActual();
  gridOptions = {
      rowHeight: 25,      // alto de fila
      headerHeight: 30,   // alto de cabecera
  };

  //asigna variables a los controles quedan seteadas
  private syncUsuarioEmpresa(): void {
    const idUsuario = this.usuarioActual?.id_usuario ?? 0;
    const idEmpresa = this.usuarioActual?.id_empresa ?? 0;
    this.form.patchValue({ idUsuario, idEmpresa }, { emitEvent: false });
    this.form.patchValue({ anio: getYearFromInput(this.form.get('fechatransaccion')!.value) }, { emitEvent: false });
  }

    // para el <select> (async) y para mapear en TS
  tiposAsiento$!: Observable<TipoAsientoResponse[]>;
  private tipoAsientos: Array<{ id: number; nombre: string; tipDoc: string }> = [];
  /// tipo asiento

  form!: FormGroup;

  private gridApi!: GridApi<DetalleAsientoResponse>;
  rowData = signal<DetalleAsientoResponse[]>([]);

  columnDefs: ColDef<DetalleAsientoResponse>[] = [
    {
      headerName: 'Acción',
      colId: 'accion',
      width: 90,
      pinned: 'right',
      suppressHeaderMenuButton: true,
      sortable: false,
      filter: false,
      cellRenderer: () =>
        `<button class="btn-icon danger" data-action="delete" title="Eliminar línea">
           <img src="assets/icons/borrarfila.png" width="19" height="19" alt="Editar" />
        </button>`,
    },
    { headerName: '#', field: 'numlinea', width: 50, editable: false },
    { headerName: 'Local', field: 'idLocal', width: 110, editable: true, valueParser: numberParser },
    { headerName: 'Cuenta Contable', field: 'idPlanCuentas', width: 150, editable: true, valueParser: numberParser },
    { headerName: 'CodprePc', field: 'codprePc', width: 180, editable: true },
    { headerName: 'Auxiliar Contable', field: 'idCodContable', width: 150, editable: true, valueParser: numberParser },
    { headerName: 'No.Comprobante', field: 'nocomprobante', width: 160, editable: true },
    { headerName: 'Cheque', field: 'cheque', width: 100, editable: true, valueParser: numberParser },

    {
      headerName: 'Debe',
      field: 'debe',
      width: 130,
      editable: debeEditable,
      type: 'rightAligned',
      valueSetter: valueSetterDot2,
      valueFormatter: twoDecimalsDotFormatter,
      suppressKeyboardEvent: blockComma,
      cellClassRules: {
        'ag-disabled': (p: any) => toNumber(p.data?.haber) > 0
      }
    },
    {
      headerName: 'Haber',
      field: 'haber',
      width: 130,
      editable: haberEditable,
      type: 'rightAligned',
      valueSetter: valueSetterDot2,
      valueFormatter: twoDecimalsDotFormatter,
      suppressKeyboardEvent: blockComma,
      cellClassRules: {
        'ag-disabled': (p: any) => toNumber(p.data?.debe) > 0
      }
    },

    { headerName: 'Tipo Movimiento', field: 'idMovBancario', width: 150, editable: true, valueParser: numberParser },
    { headerName: 'Codigo Mov.', field: 'movbancario', width: 160, editable: true },

    { headerName: 'Sustento Trib.', field: 'idSustentoTrib', width: 150, editable: true, valueParser: numberParser },
    { headerName: 'Tipo Comp. SRI', field: 'idTipoCompSri', width: 170, editable: true, valueParser: numberParser },
    { headerName: 'Autorización', field: 'autorizacion', width: 160, editable: true },
    { headerName: 'Fecha Caduca', field: 'fechacaduca', width: 150, editable: true, valueParser: isoParser },

    { headerName: 'Tipo Retención', field: 'idTipoRetencion', width: 160, editable: true, valueParser: numberParser },
    { headerName: 'Comentario / Nota', field: 'comentario', width: 300, editable: true },
    { headerName: 'Centro Costos', field: 'idCentroCostos', width: 150, editable: true, valueParser: numberParser },
    { headerName: 'Proyecto', field: 'idProyecto', width: 130, editable: true, valueParser: numberParser },
    { headerName: 'Subproyecto', field: 'idSubproyecto', width: 160, editable: true, valueParser: numberParser },

    {
      headerName: 'Transferido',
      field: 'transferido',
      width: 120,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['true', 'false'] },
      valueParser: boolParser,
    },
    { headerName: 'Fecha Transferido', field: 'fechatransferido', width: 170, editable: true, valueParser: isoParser },
    { headerName: 'Fecha Vencimiento', field: 'fechavencimiento', width: 170, editable: true, valueParser: isoParser },
    { headerName: 'Cod Conciliación', field: 'idConciliacion', width: 150, editable: true, valueParser: numberParser },
    { headerName: 'Valor en Letras', field: 'valorLetras', width: 220, editable: true },
    { headerName: 'Año', field: 'anio', width: 90, editable: true },
    { headerName: 'Fecha Transacción', field: 'fechatransaccion', width: 170, editable: true, valueParser: isoParser },
    { headerName: 'Hora', field: 'hora', width: 100, editable: true },
    { headerName: 'Zona', field: 'idZona', width: 110, editable: true, valueParser: numberParser },

    { headerName: 'Doc. Relacionado', field: 'docurelacionado', width: 160, editable: true },

    { headerName: 'Beneficiario', field: 'beneficiario', width: 180, editable: true },
    { headerName: 'Fecha Ingreso', field: 'fechaingreso', width: 160, editable: true, valueParser: isoParser },
    { headerName: 'Fecha Cierre', field: 'fechacierre', width: 160, editable: true, valueParser: isoParser },

    { headerName: 'Fecha Conciliado', field: 'fechaconciliado', width: 170, editable: true, valueParser: isoParser },
    { headerName: 'Cierre', field: 'cierre', width: 120, editable: true },

    {
      headerName: 'Estado Ingreso',
      field: 'estadoIngreso',
      width: 140,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['true', 'false'] },
      valueParser: boolParser,
    },
  ];

  defaultColDef: ColDef = { resizable: true, editable: true };

  // Totales
  totDebe = computed(() => (this.rowData() ?? []).reduce((a, d) => a + (Number(d.debe) || 0), 0));
  totHaber = computed(() => (this.rowData() ?? []).reduce((a, d) => a + (Number(d.haber) || 0), 0));
  diferencia = computed(() => this.totDebe() - this.totHaber());

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private usuarioService: UsuarioService,
    public dialogRef: MatDialogRef<AsientosContablesFormComponent>,
    private tipoasientoservice: TipoAsientoService,
    private service: AsientosContablesService,
    private snack: MatSnackBar
  ) {
    effect(() => {
      const tDebe = this.totDebe();
      const tHaber = this.totHaber();
      if (this.form) this.form.patchValue({ totdebe: tDebe, tothaber: tHaber }, { emitEvent: false });
    });
  }

  ngOnInit(): void {
    this.buildForm();
    const id = Number(this.route.snapshot.paramMap.get('id') ?? 0);
    if (id > 0) {
      this.modo.set('editar');
      this.cargarAsiento(id);
    } else {
      this.modo.set('nuevo');
      const empty = createEmptyAsientoContableResponse();
      this.setFormFromHeader(empty);
      this.rowData.set(empty.detalles);
      //
      // mantener anio sincronizado cuando cambie la fecha
      this.form.patchValue(
        { anio: getYearFromInput(this.form.get('fechatransaccion')!.value) },
        { emitEvent: false }
      );
      
        this.form.get('fechatransaccion')!.valueChanges.pipe(
          startWith(this.form.get('fechatransaccion')!.value),
          map(getYearFromInput),
          distinctUntilChanged()
        ).subscribe(y => {
          this.form.patchValue({ anio: y }, { emitEvent: false });
        });

        // Forzar mayúsculas en TipDoc mientras escribe
        //    this.form.get('tipDoc')?.valueChanges.subscribe(v => {
        //      if (typeof v === 'string') {
        //        const up = v.toUpperCase();
        //        if (v !== up) this.form.get('tipDoc')?.setValue(up, { emitEvent: false });
        //      }
        //    });
        
            // Cargar tipos de asiento (para el combo) y guardar copia normalizada para lookup
            this.tiposAsiento$ = this.tipoasientoservice.ListadoAsiento().pipe(
              tap(list => {
                this.tipoAsientos = (list ?? []).map((r: any) => ({
                  id: r.IdTipoAsiento ?? r[' IdTipoAsiento'], // por si viene con espacio
                  nombre: (r.Descripcion ?? r.TipAsiento ?? '').toString().trim(),
                  // Campo que representa el código de doc a copiar a TipDoc (ajusta si tu API usa otro nombre)
                  tipDoc: (r.TipAsiento ?? r.CodigoDoc ?? '').toString().trim().toUpperCase()
                }));
                // Si ya hay IdTipoAsiento (edición), sincroniza TipDoc cuando llegue el catálogo
                this.syncTipDocFromCurrentId();
              }),
              shareReplay(1)
            );
        
            // Vincular cambios del combo a TipDoc
            this.bindTipoAsientoToTipDoc();
            // Forzar mayúsculas mientras escribe en tipdoc (nombre correcto)
            this.form.get('tipdoc')?.valueChanges.subscribe(v => {
              if (typeof v === 'string') {
                const up = v.toUpperCase();
                if (v !== up) this.form.get('tipdoc')?.setValue(up, { emitEvent: false });
              }
            });
       this.syncUsuarioEmpresa();
    }
  }

  private buildForm(): void {
    const nowIso = new Date().toISOString();
    this.form = this.fb.group({
      IdCabMaestro: [0],
      idZona: [0, [Validators.required, Validators.min(1)]],
      idUsuario: [this.usuarioActual?.id_usuario ?? null],
      idEmpresa: [this.usuarioActual?.id_empresa ?? null],
      idTipoAsiento: [null, [Validators.required, Validators.min(1)]],
      tipdoc: ['', [Validators.required]],
      numdoc: [0, [Validators.required]],
      anio: [''],
      fechatransaccion: [nowIso, [Validators.required]],
      fechaingreso: [nowIso, [Validators.required]],
      observacion: [''],
      totdebe: [0],
      tothaber: [0],
      beneficiario: [''],
      cierre: [''],
      fechacierre: [null as string | null],//// [nowIso],
      solicitado: [''],
      depto: [''],
      autorizado: [''],
      homCodigo: [0],
      estado: [true],
    });
 
  }

  //tipo asiento
private bindTipoAsientoToTipDoc(): void {
  this.form.get('idTipoAsiento')?.valueChanges.subscribe((id: number | null) => {
    const ta = this.tipoAsientos.find(x => x.id === Number(id));
    const tipDoc = (ta?.tipDoc ?? '').slice(0, 2); // asegura 2 chars (p.ej. 'AD')
    this.form.get('tipdoc')?.setValue(tipDoc, { emitEvent: false });
  });
}

private syncTipDocFromCurrentId(): void {
  const id = this.form.get('idTipoAsiento')?.value;
  const ta = this.tipoAsientos.find(x => x.id === Number(id));
  const tipDoc = (ta?.tipDoc ?? '').slice(0, 2);
  this.form.get('tipdoc')?.setValue(tipDoc, { emitEvent: false });
}
  /////
  
  private setFormFromHeader(h: AsientoContableResponse): void {
    this.form.reset({
      IdCabMaestro: h.IdCabMaestro,
      idZona: h.idZona,
      idUsuario: h.idUsuario,
      idEmpresa: h.idEmpresa,
      idTipoAsiento: h.idTipoAsiento,
      tipdoc: h.tipdoc,
      numdoc: h.numdoc,
      anio: h.anio,
      fechatransaccion: h.fechatransaccion,
      fechaingreso: h.fechaingreso,
      observacion: h.observacion,
      totdebe: h.totdebe,
      tothaber: h.tothaber,
      beneficiario: h.beneficiario,
      cierre: h.cierre,
      fechacierre: h.fechacierre,
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
        this.rowData.set(resp.detalles ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar asiento', err);
        this.loading.set(false);
      },
    });
  }

  guardar(): void {
    if (this.saving() || this.loading()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snack.open('Revisa los campos obligatorios', 'OK', { duration: 2500 , horizontalPosition: 'right', verticalPosition: 'top'});
      return;
    }

    const header: AsientoContableResponse = {
      ...(this.form.value as AsientoContableResponse),
      totdebe: this.totDebe(),
      tothaber: this.totHaber(),
      detalles: this.rowData(),
    };

    this.saving.set(true);

    // Normalizamos la respuesta del backend a boolean
    const normalize = map((resp: any) => {
      // soporta {success:true}, {ok:true}, {data:true}, true/false…
      const ok = resp?.success ?? resp?.ok ?? resp?.data ?? resp;
      return !!ok;
    });

    const onError = catchError((err) => {
      console.error('Error backend:', err);
      return of(false);
    });

    const finalizeSave = finalize(() => this.saving.set(false));

    const save$ = this.modo() === 'nuevo'
      ? this.service.crear(header).pipe(normalize, onError, finalizeSave)
      : this.service.actualizar(header.IdCabMaestro || Number(this.route.snapshot.paramMap.get('id') ?? 0), header)
          .pipe(normalize, onError, finalizeSave);

    save$.subscribe((ok) => {
      if (ok) {
        this.snack.open('Guardado correctamente', 'OK', { duration: 2000 , horizontalPosition: 'right', verticalPosition: 'top'});
        this.dialogRef.close(true); // notifica éxito al padre
      } else {
        this.snack.open('No se ha podido registrar', 'Cerrar', { duration: 3000, horizontalPosition: 'right', verticalPosition: 'top' });
      }
    });
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }

  onGridReady(evt: GridReadyEvent<DetalleAsientoResponse>): void { this.gridApi = evt.api; }

  onCellValueChanged(evt: CellValueChangedEvent<DetalleAsientoResponse>): void {
    if (evt.colDef.field === 'debe' || evt.colDef.field === 'haber') {
      this.rowData.set([...this.rowData()]);
    }
  }

  onCellClicked(evt: CellClickedEvent<DetalleAsientoResponse>): void {
    if (evt?.colDef?.colId === 'accion') {
      const action = (evt.event?.target as HTMLElement)?.closest('button')?.getAttribute('data-action');
      if (action === 'delete' && evt.node?.data) this.eliminarLinea(evt.node.data);
    }
  }

  agregarLinea(): void {
    const nowIso = new Date().toISOString();
    const items = this.rowData();
    const next = (items?.length ?? 0) + 1;

    const nueva: DetalleAsientoResponse = {
      IdDetMaestro: 0,
      IdCabMaestro: Number(this.form.value?.IdCabMaestro ?? 0),
      numlinea: next,
      anio: this.form.value?.anio ?? '',
      fechatransaccion: this.form.value?.fechatransaccion ?? nowIso,
      hora: '',
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
      comentario: '',
      idMovBancario: 0,
      movbancario: '',
      fechaingreso: this.form.value?.fechaingreso ?? nowIso,
      cierre: '',
      fechacierre: this.form.value?.fechacierre ?? nowIso,
      conciliado: '',
      fechaconciliado: nowIso,

      idSustentoTrib: 0,
      idTipoCompSri: 0,
      autorizacion: '',
      fechacaduca: nowIso,
      idTipoRetencion: 0,
      idProyecto: 0,
      idSubproyecto: 0,

      transferido: false,
      fechatransferido: nowIso,
      fechavencimiento: nowIso,
      idConciliacion: 0,
      valorLetras: '',
      estadoIngreso: true,
    };

    this.rowData.set([...(items ?? []), nueva]);
    queueMicrotask(() => {
      const lastIndex = (this.rowData().length ?? 1) - 1;
      this.gridApi?.ensureIndexVisible(lastIndex);
      this.gridApi?.startEditingCell({ rowIndex: lastIndex, colKey: 'codprePc' });
    });
  }

  eliminarLinea(item: DetalleAsientoResponse): void {
    const items = (this.rowData() ?? []).filter(x => x !== item);
    items.forEach((d, i) => (d.numlinea = i + 1));
    this.rowData.set(items);
  }

  isReadOnly(): boolean { return this.saving() || this.loading(); }
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
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toISOString();
}
function blockComma(params: any): boolean { return params.event?.key === ','; }
const decimalDot2Regex = /^\d*(\.\d{0,2})?$/;
function valueSetterDot2(params: any): boolean {
  const raw = String(params.newValue ?? '').trim();
  if (raw.includes(',')) return false;
  if (!decimalDot2Regex.test(raw)) return false;
  const n = Number(raw);
  if (Number.isNaN(n)) return false;
  // Reglas Debe/Haber: si uno > 0, el otro = 0
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
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
