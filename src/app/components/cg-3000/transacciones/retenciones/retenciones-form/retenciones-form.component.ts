import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, Optional, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { AgGridAngular } from 'ag-grid-angular';
import {
  ColDef,
  GridApi,
  GridReadyEvent,
  CellClickedEvent,
  CellValueChangedEvent,
  GridOptions,
  ColumnResizedEvent
} from 'ag-grid-community';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { RetencionPdfUtil } from '../../util/retencion-pdf.util';
import { MatDialog, MatDialogModule, MatDialogConfig, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ComponentType } from '@angular/cdk/portal';

import { RetencionesService, CreateRetencionesResultResponse } from 'src/app/services/retenciones.service';
import { RetencionesRequest } from 'src/app/interfaces/requests/retenciones-request';
import { RetencionesResponse } from 'src/app/interfaces/responses/retenciones-response';
import { RetencionesResumenResponse } from 'src/app/interfaces/responses/retenciones-resumen-response';
import { EmpresaService } from 'src/app/services/empresa.service';
import { LogoService } from 'src/app/services/logo.service';
import { HttpClient } from '@angular/common/http';
import { UsuarioService } from 'src/app/services/usuario.service';
import {
  CustomMessageBoxComponent,
  MessageBoxData,
} from 'src/app/util/messages/custom-message-box.component';


type RetRow = RetencionesRequest & {
  _uiState?: 'NUEVO' | 'EDITADO' | 'GUARDADO' | 'ERROR';
  _uiMsg?: string;
};

@Component({
  selector: 'app-retenciones-cabecera',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    AgGridAngular,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDialogModule,
  ],
  templateUrl: './retenciones-form.component.html',
  styleUrls: ['./retenciones-form.component.css'],
})
export class RetencionesFormComponent implements OnInit, OnDestroy {
  loading = false;

  idEmpresa = 0;
  idCabMaestro = 0;
  usuarioActual = this.usuarioService.getUsuarioActual();
  idUsuario = this.usuarioActual?.id_usuario ?? 0;

  headerForm!: FormGroup;

  gridApi?: GridApi<RetRow>;
  // ✅ NUEVO: para autosize por contenido
  private columnApi: any;

  rowData: RetRow[] = [];

  // ✅ NUEVO: banderas para NO bloquear resize manual
  private didInitialAutoSize = false;
  private userResized = false;

  // TOTALES
  totBase = 0;
  totValorRet = 0;
  totCalcRet = 0;

  private recalcTotals(): void {
    const rows = this.rowData ?? [];
    this.totBase = rows.reduce((a, r) => a + (Number(r.baseimponible) || 0), 0);
    this.totValorRet = rows.reduce((a, r) => a + (Number(r.valorretenido) || 0), 0);
    this.totCalcRet = rows.reduce((a, r) => a + (Number(r.porcentajeretencion) || 0), 0);
  }

  readOnly = false;

  gridOptions: GridOptions = {
    rowHeight: 24,
    headerHeight: 28,
    stopEditingWhenCellsLoseFocus: true,
    suppressLoadingOverlay: true,
    suppressNoRowsOverlay: true,

    colResizeDefault: 'shift',

    // ✅ Importante: NO usar suppressColumnVirtualisation en true (deja default)
  };

  defaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: false,
    minWidth: 90,
    editable: (p: any) => this.canEditCell(p?.data as RetRow),
  };

  columnDefs: ColDef[] = [
    // ✅ Recomendación: no usar width 10 (hace difícil “agarrar” y ver)
    { headerName: 'Estado', field: '_uiState', editable: false, width: 110, pinned: 'left' },
    { headerName: 'Mensaje', field: '_uiMsg', editable: false, width: 220, pinned: 'left' , hide: true, },

    { headerName: 'IdRet', field: 'idretencion', editable: false, width: 90, pinned: 'left' , hide: true, },

    ///vamos a ordenar
    { headerName: 'Secuencial', field: 'secuencial', width: 110 },
    { headerName: 'CódigoRet', field: 'codigoretencion', width: 100 },
    { headerName: 'NumCompVta', field: 'numcompvta', width: 160 },
    { headerName: 'TipCompVta', field: 'tipcompvta', width: 120 },
    { headerName: 'EjerFiscal', field: 'ejerfiscal', width: 110 },
    { headerName: 'DesComp', field: 'descomp', width: 180 },

    { headerName: 'Base', field: 'baseimponible', width: 100, valueParser: p => p.newValue === '' ? null : Number(p.newValue) },
    { headerName: '%Ret', field: 'porcentajeretencion', width: 100, valueParser: p => p.newValue === '' ? null : Number(p.newValue) },
    { headerName: 'ValorRet', field: 'valorretenido', width: 100, valueParser: p => p.newValue === '' ? null : Number(p.newValue) },
    { headerName: 'TipoComprobante', field: 'tipocomprobante', width: 120 },

    { headerName: 'TipoMov', field: 'tipomovimiento', width: 100, },

    { headerName: 'IdTipoCompSRI', field: 'idtipocompsri', width: 140, valueParser: p => p.newValue === '' ? null : Number(p.newValue) , hide: true,},

    { headerName: 'Empresa', field: 'idempresa', width: 110, editable: false , hide: true,},
    { headerName: 'CabMaestro', field: 'idcabmaestro', width: 120, editable: false, hide: true, },

    { headerName: 'NumDoc', field: 'numdoc', width: 110 , hide: true,},
    { headerName: 'Línea', field: 'numlinea', width: 90, valueParser: p => Number(p.newValue ?? 0) , hide: true,},
    { headerName: 'Año', field: 'anio', width: 90, hide: true, },


    {
      headerName: 'Fecha',
      field: 'fecha',
      width: 150,
      valueFormatter: p => this.formatIso(p.value),
      valueParser: p => this.toIso(p.newValue),
       hide: true,
    },
    { headerName: 'Hora', field: 'hora', width: 110 , hide: true,},
    { headerName: 'TipoComp', field: 'tipocomp', width: 110 ,  hide: true,},


    { headerName: 'IdCodContable', field: 'idcodcontable', width: 140, valueParser: p => Number(p.newValue ?? 0) , hide: true,},



    { headerName: 'RUC/CI', field: 'rucci', width: 140 , hide: true,},
    { headerName: 'Contribuyente', field: 'contribuyente', width: 220 , hide: true,},
    { headerName: 'Dirección', field: 'direccion', width: 240 , hide: true,},
    { headerName: 'Teléfono', field: 'telefono', width: 140 , hide: true, },
    { headerName: 'Concepto', field: 'concepto', width: 220 , hide: true,},


    { headerName: 'IdTipoRet', field: 'idtiporetencion', width: 110, valueParser: p => Number(p.newValue ?? 0) , hide: true,},

    { headerName: 'AutRet', field: 'autretencion', width: 170, hide: true, },
    { headerName: 'Estab', field: 'numestablecimiento', width: 110 , hide: true,},
    { headerName: 'PtoEmisión', field: 'puntoemision', width: 110 , hide: true,},


    {
      headerName: 'Enviado',
      field: 'enviado',
      width: 110,
      valueGetter: (p: any) => this.asBool(p.data?.enviado),
      valueSetter: (p: any) => { p.data.enviado = this.asBool(p.newValue); return true; },
      cellRenderer: (p: any) => (this.asBool(p.value) ? 'SI' : 'NO'),
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: [true, false] },
      cellStyle: { textAlign: 'center', fontWeight: '600' },
       hide: true,
    },



    {
      headerName: 'EstadoIng',
      field: 'estadoingreso',
      width: 120,
      valueGetter: (p: any) => this.asBool(p.data?.estadoingreso),
      valueSetter: (p: any) => { p.data.estadoingreso = this.asBool(p.newValue); return true; },
      cellRenderer: (p: any) => (this.asBool(p.value) ? 'ACTIVO' : 'INACTIVO'),
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: [true, false] },
      cellStyle: { textAlign: 'center', fontWeight: '600' },
       hide: true,
    },

    {
      headerName: 'FechaIng',
      field: 'fechaing',
      width: 160,
      valueFormatter: p => this.formatIso(p.value),
      valueParser: p => this.toIso(p.newValue),
       hide: true,
    },

    { headerName: 'IdUsuario', field: 'idusuario', width: 110, editable: false, hide: true },

  ];

  private sub = new Subscription();
  private suppressHeaderSync = false;
  private selectedIndex: number | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private empresaService: EmpresaService,
    private logoService: LogoService,
    private usuarioService: UsuarioService, ///para grabar usuario anula retencion
     private dialog: MatDialog, ///mensajes
    private route: ActivatedRoute,
    private router: Router,
    private snack: MatSnackBar,
    private retencionesService: RetencionesService,
    @Optional() public dialogRef: MatDialogRef<RetencionesFormComponent> | null,
    @Optional() @Inject(MAT_DIALOG_DATA)
    public data: { modo?: 'nuevo' | 'editar'; id?: number; idEmpresa?: number; idCabMaestro?: number } | null
  ) {}

  async ngOnInit(): Promise<void> {
    this.buildHeader();

    const dEmpresa = Number(this.data?.idEmpresa ?? 0);
    const dCab = Number(this.data?.idCabMaestro ?? 0);

    const qp = this.route.snapshot.queryParamMap;
    const qEmpresa = Number(qp.get('idEmpresa') ?? 0);
    const qCab = Number(qp.get('idCabMaestro') ?? 0);

    this.idEmpresa = dEmpresa > 0 ? dEmpresa : qEmpresa;
    this.idCabMaestro = dCab > 0 ? dCab : qCab;

    if (this.idEmpresa <= 0 || this.idCabMaestro <= 0) {
      this.snack.open('Faltan parámetros: idEmpresa e idCabMaestro.', 'Cerrar', { duration: 5000 ,
         horizontalPosition: 'right',
          verticalPosition: 'top',
      });
      if (this.dialogRef) this.dialogRef.close(false);
      return;
    }

    this.headerForm.patchValue(
      { idempresa: this.idEmpresa, idcabmaestro: this.idCabMaestro },
      { emitEvent: false }
    );

    this.sub.add(
      this.headerForm.valueChanges.subscribe(v => {
        if (this.suppressHeaderSync) return;
        if (this.readOnly) return;
        if (this.selectedIndex === null) return;

        const row = this.rowData[this.selectedIndex];
        if (!row) return;

        row.autretencion = v.autretencion ?? null;
        row.fecha = this.dateInputToIso(v.fecha);

        row.rucci = v.rucci ?? null;
        row.contribuyente = v.contribuyente ?? null;
        row.direccion = v.direccion ?? null;
        row.telefono = v.telefono ?? null;
        row.concepto = v.concepto ?? null;

        row.numdoc = v.numdoc ?? row.numdoc;
        row.anio = v.anio ?? row.anio;
        row.hora = v.hora ?? row.hora;
        row.tipocomp = v.tipocomp ?? row.tipocomp;
        row.descomp = v.descomp ?? row.descomp;

        row.enviado = this.asBool(v.enviado);
        row.tipomovimiento = v.tipomovimiento ?? row.tipomovimiento;
        row.estadoingreso = this.asBool(v.estadoingreso);

        row._uiState = 'EDITADO';
        this.recalcTotals();
        this.gridApi?.refreshCells({ force: true });
      })
    );

    await this.loadInitial();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  private buildHeader(): void {
    const now = new Date();

    this.headerForm = this.fb.group({
      idempresa: [{ value: 0, disabled: true }],
      idcabmaestro: [{ value: 0, disabled: true }],
      autretencion: [''],
      fecha: [this.toDateInputValue(now), Validators.required],
      rucci: [''],
      contribuyente: [''],
      direccion: [''],
      telefono: [''],
      concepto: [''],
      numdoc: [''],
      anio: [String(now.getFullYear())],
      hora: [this.hhmm()],
      tipocomp: ['RT'],
      descomp: ['RETENCION'],
      enviado: [false],
      tipomovimiento: ['RT'],
      estadoingreso: [true],
    });
  }

  private setHeaderEditable(editable: boolean): void {
    const editableKeys = [
      'autretencion', 'fecha', 'rucci', 'contribuyente', 'direccion', 'telefono', 'concepto',
      'numdoc', 'anio', 'hora', 'tipocomp', 'descomp', 'enviado', 'tipomovimiento', 'estadoingreso'
    ];

    for (const k of editableKeys) {
      const ctrl = this.headerForm.get(k);
      if (!ctrl) continue;
      if (editable) ctrl.enable({ emitEvent: false });
      else ctrl.disable({ emitEvent: false });
    }
  }

  onGridReady(e: GridReadyEvent): void {
    this.gridApi = e.api as GridApi<RetRow>;
    this.columnApi = (e as any).columnApi;

    // ✅ Detectar resize manual del usuario
    this.gridApi.addEventListener('columnResized', (ev: ColumnResizedEvent) => {
      if (ev?.finished && ev.source === 'uiColumnDragged') {
        this.userResized = true;
      }
    });

    this.setGridData(this.rowData ?? []);

    // ✅ Auto-ajuste inicial SOLO una vez
    this.autoSizeInitialOnce();
  }

  private autoSizeInitialOnce(): void {
    if (!this.gridApi || !this.columnApi) return;
    if (this.didInitialAutoSize) return;

    this.didInitialAutoSize = true;

    setTimeout(() => {
      try {
        const all = this.columnApi.getAllColumns?.() ?? [];
        const ids = all.map((c: any) => c.getColId?.()).filter((x: any) => !!x);
        if (ids.length) this.columnApi.autoSizeColumns(ids, false);
      } catch {
        // fallback suave (una sola vez)
        try { this.gridApi?.sizeColumnsToFit(); } catch {}
      }
    }, 0);
  }

  onCellValueChanged(e: CellValueChangedEvent): void {
    if (this.readOnly) return;
    const row = e.data as RetRow;
    if (!row) return;
    row._uiState = 'EDITADO';
    this.recalcTotals();
  }

  onCellClicked(e: CellClickedEvent): void {
    if (this.readOnly) return;

    const target = e.event?.target as HTMLElement | null;
    const btn = target?.closest('button[data-action]') as HTMLButtonElement | null;
    if (!btn) return;

    const action = btn.getAttribute('data-action');
    if (action === 'delete') {
      const row = e.data as RetRow;
      this.deleteRow(row);
    }
  }

  onRowClicked(e: any): void {
    const idx = (typeof e?.rowIndex === 'number')
      ? e.rowIndex
      : (typeof e?.node?.rowIndex === 'number' ? e.node.rowIndex : null);

    if (idx === null || idx < 0) return;

    this.selectedIndex = idx;
    const row = this.rowData[idx];
    if (row) this.patchHeaderFromRow(row);
  }

  private patchHeaderFromRow(row: RetRow): void {
    this.suppressHeaderSync = true;

    this.headerForm.patchValue({
      autretencion: row.autretencion ?? '',
      fecha: this.toDateInputValue(row.fecha),
      rucci: row.rucci ?? '',
      contribuyente: row.contribuyente ?? '',
      direccion: row.direccion ?? '',
      telefono: row.telefono ?? '',
      concepto: row.concepto ?? '',
      numdoc: row.numdoc ?? '',
      anio: row.anio ?? String(new Date().getFullYear()),
      hora: row.hora ?? this.hhmm(),
      tipocomp: row.tipocomp ?? 'RT',
      descomp: row.descomp ?? 'RETENCION',
      enviado: this.asBool(row.enviado),
      tipomovimiento: row.tipomovimiento ?? 'RT',
      estadoingreso: this.asBool(row.estadoingreso),
    }, { emitEvent: false });

    this.setHeaderEditable(!this.readOnly);
    this.suppressHeaderSync = false;
  }

  private canEditCell(_row: RetRow | null | undefined): boolean {
    return !this.readOnly;
  }

  private async loadInitial(): Promise<void> {
    try {
      this.loading = true;

      const lines = await firstValueFrom(
        this.retencionesService.getByCabecera(this.idEmpresa, this.idCabMaestro)
      );

      if ((lines ?? []).length > 0) {
        this.readOnly = true;

        const rows = (lines ?? []).map((x: RetencionesResponse) => ({
          ...x,
          idusuario: Number((x as any).idusuario ?? 0), // ✅ nuevo campo
          enviado: this.asBool((x as any).enviado),
          estadoingreso: this.asBool((x as any).estadoingreso),
          hora: this.normalizeHora((x as any).hora),
          _uiState: 'GUARDADO',
          _uiMsg: ''
        })) as RetRow[];

        this.setGridData(rows);

        this.selectedIndex = 0;
        if (this.rowData[0]) this.patchHeaderFromRow(this.rowData[0]);

        this.snack.open('Retenciones ya generada.', 'OK', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
        });

        return;
      }

      this.readOnly = false;
      this.setHeaderEditable(true);

      const resumen = await firstValueFrom(
        this.retencionesService.getResumen(this.idEmpresa, this.idCabMaestro)
      );

      if ((resumen ?? []).length > 0) {
        const mapped = (resumen ?? []).map((r, i) => this.mapResumenToRow(r as any, i + 1));
        this.setGridData(mapped);

        this.selectedIndex = 0;
        if (this.rowData[0]) this.patchHeaderFromRow(this.rowData[0]);

        /*
        this.snack.open('No existe retencion generada).', 'OK', { duration: 3500 ,
           horizontalPosition: 'right',
          verticalPosition: 'top',
        });
      */

        return;
      }

      const empty = [this.buildEmptyRow(1)];
      this.setGridData(empty);
      this.selectedIndex = 0;
      if (this.rowData[0]) this.patchHeaderFromRow(this.rowData[0]);

    } catch (err: any) {
      this.snack.open(err?.message ?? 'Error cargando retenciones/resumen.', 'Cerrar', { duration: 5000,
         horizontalPosition: 'right',
          verticalPosition: 'top',
       });

      this.readOnly = false;
      this.setHeaderEditable(true);

      const empty = [this.buildEmptyRow(1)];
      this.setGridData(empty);
      this.selectedIndex = 0;
      if (this.rowData[0]) this.patchHeaderFromRow(this.rowData[0]);

    } finally {
      this.loading = false;
    }
  }

  private mapResumenToRow(src: RetencionesResumenResponse, fallbackLinea: number): RetRow {
    const now = new Date();

    const fechaIso = this.toIso((src as any).fechatransaccion);
    const anio = String(new Date((src as any).fechatransaccion).getFullYear());

    const ln = Number((src as any).numlinea ?? 0);
    const numlinea = ln > 0 ? ln : fallbackLinea;

    return {
      idretencion: 0,
      idempresa: this.idEmpresa,
      idcabmaestro: this.idCabMaestro,
      idusuario: this.idUsuario, // ✅ nuevo campo
      numdoc: String((src as any).numdoc ?? ''),
      numlinea,
      anio,

      fecha: fechaIso,
      hora: this.normalizeHora((src as any).hora),

      tipocomp: String((src as any).tipocomp ?? (src as any).tipdoc ?? 'RT'),
      descomp: (src as any).descomp ?? 'RETENCION',

      idcodcontable: Number((src as any).idcodcontable ?? 0),

      rucci: (src as any).ruc ?? null,
      contribuyente: (src as any).razonsocial ?? null,
      direccion: (src as any).direccion ?? null,
      telefono: (src as any).telefono ?? null,

      idtipocompsri: (src as any).idtipocompsri ?? null,
      tipocomprobante: (src as any).codtipcomp ?? null,
      tipcompvta: (src as any).destipcomp ?? null,
      numcompvta: (src as any).nocomprobante ?? null,
      ejerfiscal: anio,

      baseimponible: (src as any).base ?? null,
      porcentajeretencion: (src as any).portiporet ?? null,
      valorretenido: (src as any).valorret ?? null,

      idtiporetencion: Number((src as any).idtiporetencion ?? 0),
      codigoretencion: (src as any).codigotiporet ?? null,

      autretencion: (src as any).autorizacionretencion ?? null,
      numestablecimiento: (src as any).nestablecimiento ?? null,
      puntoemision: (src as any).puntoemision ?? null,
      secuencial: (src as any).secuencial ?? null,

      enviado: this.asBool((src as any).enviado),
      tipomovimiento: (src as any).tipmov ?? null,
      estadoingreso: this.asBool((src as any).declarado),

      concepto: (src as any).concepto ?? null,

      fechaing: now.toISOString(),

      _uiState: 'NUEVO',
      _uiMsg: 'Precargado desde resumen',
    };
  }

  addRow(): void {
    if (this.readOnly) {
      this.snack.open('Modo lectura: no puede agregar líneas.', 'OK', { duration: 2500 ,
         horizontalPosition: 'right',
          verticalPosition: 'top',
      });
      return;
    }

    const next = this.nextLinea();
    const row = this.buildEmptyRow(next);

    const v = this.headerForm.getRawValue();

    row.autretencion = v.autretencion ?? null;
    row.fecha = this.dateInputToIso(v.fecha);

    row.rucci = v.rucci ?? null;
    row.contribuyente = v.contribuyente ?? null;
    row.direccion = v.direccion ?? null;
    row.telefono = v.telefono ?? null;
    row.concepto = v.concepto ?? null;

    row.numdoc = v.numdoc ?? '';
    row.anio = v.anio ?? String(new Date().getFullYear());
    row.hora = this.normalizeHora(v.hora);
    row.tipocomp = v.tipocomp ?? 'RT';
    row.descomp = v.descomp ?? null;

    row.enviado = this.asBool(v.enviado);
    row.tipomovimiento = v.tipomovimiento ?? null;
    row.estadoingreso = this.asBool(v.estadoingreso);
    row.idusuario = this.idUsuario; // ✅ nuevo nuevo

    this.setGridData([...this.rowData, row]);
    this.gridApi?.refreshCells({ force: true });
  }

  private deleteRow(row: RetRow): void {
    if (this.readOnly) return;

    const filtered = this.rowData.filter(r => r !== row);
    this.setGridData(filtered.length > 0 ? filtered : [this.buildEmptyRow(1)]);

    this.selectedIndex = 0;
    if (this.rowData[0]) this.patchHeaderFromRow(this.rowData[0]);
    this.gridApi?.refreshCells({ force: true });
  }

  async grabar(): Promise<void> {
    if (this.readOnly) {
      this.snack.open('Retencion solo en Modo lectura.', 'OK', { duration: 3500
        , horizontalPosition: 'right',
          verticalPosition: 'top',
      });
      return;
    }

    try {
      this.loading = true;

      const toSave: RetencionesRequest[] = [];

      for (const row of this.rowData) {
        row._uiMsg = '';

        row.idempresa = this.idEmpresa;
        row.idcabmaestro = this.idCabMaestro;
        row.idusuario = this.idUsuario; // ✅ nuevo (campo)

        row.fecha = this.toIso(row.fecha);
        row.hora = this.normalizeHora(row.hora);
        row.fechaing = row.fechaing ? this.toIso(row.fechaing) : new Date().toISOString();

        row.idretencion = 0;

        const msg = this.validateRow(row);
        if (msg) {
          row._uiState = 'ERROR';
          row._uiMsg = msg;
          continue;
        }

        toSave.push(this.sanitize(row));
      }

      this.gridApi?.refreshCells({ force: true });

      if (toSave.length === 0) {
        this.snack.open('No hay líneas válidas para crear. Revisa los errores en el grid.', 'OK', { duration: 4000,
           horizontalPosition: 'right',
          verticalPosition: 'top',
         });
        return;
      }

      const result: CreateRetencionesResultResponse = await firstValueFrom(
        this.retencionesService.createLote(toSave)
      );

      const ids = result?.idsretencion ?? [];
      let k = 0;

      for (const row of this.rowData) {
        const msg = this.validateRow(row);
        if (msg) continue;

        const newId = ids[k] ?? 0;
        k++;

        if (newId > 0) {
          row.idretencion = newId;
          row.secuencial = result.secuencial ?? row.secuencial ?? null;
          row.numestablecimiento = result.numestablecimiento ?? row.numestablecimiento ?? null;
          row.puntoemision = result.puntoemision ?? row.puntoemision ?? null;

          row._uiState = 'GUARDADO';
          row._uiMsg = `Creado (ID ${newId})`;
        } else {
          row._uiState = 'ERROR';
          row._uiMsg = 'Creado pero no se recibió ID.';
        }
      }

      this.readOnly = true;
      this.setHeaderEditable(false);
      this.gridApi?.refreshCells({ force: true });

      this.snack.open(`Creación finalizada. Total: ${result.total}. Secuencial: ${result.secuencial}`, 'OK', { duration: 4500 ,
         horizontalPosition: 'right',
          verticalPosition: 'top',
      });
    } catch (err: any) {
      this.snack.open(err?.message ?? 'Error general al grabar retenciones.', 'Cerrar', { duration: 6000,
         horizontalPosition: 'right',
          verticalPosition: 'top',
       });
    } finally {
      this.loading = false;
    }
  }

  cancelar(): void {
    if (this.dialogRef) {
      this.dialogRef.close(false);
    } else {
      this.router.navigate(['/cg-3000/inicio-cg']);
    }
  }


  ///ANULAR RETENCIONES
  canAnularRet(): boolean {
    // Reglas mínimas:
    // - Debe existir cabecera/empresa
    // - Debe estar en modo lectura (ya grabado) para poder anular lo existente
    // - Debe existir al menos una línea con idretencion > 0
    if (this.idEmpresa <= 0 || this.idCabMaestro <= 0) return false;
    if (!this.readOnly) return false;

    const hasSaved = (this.rowData ?? []).some(r => Number(r.idretencion ?? 0) > 0);
    return hasSaved;
  }

  /*
  async anularRet(): Promise<void> {
    if (this.loading) return;

    if (this.idUsuario <= 0) {
      this.snack.open('No se encontró IdUsuario para auditoría. Vuelva a iniciar sesión.', 'Cerrar', {
        duration: 4500,
        horizontalPosition: 'right',
        verticalPosition: 'top',
      });
      return;
    }

    if (!this.canAnularRet()) {
      this.snack.open('Solo puede anular una retención ya GENERADAS.', 'OK', {
        duration: 3500,
        horizontalPosition: 'right',
        verticalPosition: 'top',
      });
      return;
    }

    // Confirmación simple (sin añadir MatDialog nuevo)
    const ok = confirm('¿Desea ANULAR la retención? Esto eliminará y archivará todas las líneas.');



    if (!ok) return;

    try {
      this.loading = true;

      await firstValueFrom(
        this.retencionesService.deleteByCabecera(this.idCabMaestro, this.idEmpresa, this.idUsuario)
      );

      this.snack.open('Retención anulada correctamente.', 'OK', {
        duration: 3500,
        horizontalPosition: 'right',
        verticalPosition: 'top',
      });

      // Refrescar pantalla: vuelve a cargar resumen/retenciones según exista o no
      this.readOnly = false;
      this.setHeaderEditable(true);
      await this.loadInitial();

    } catch (err: any) {
      this.snack.open(err?.message ?? 'Error al anular retenciones.', 'Cerrar', {
        duration: 6000,
        horizontalPosition: 'right',
        verticalPosition: 'top',
      });
    } finally {
      this.loading = false;
    }
  }

  */

  async anularRet(): Promise<void> {
    if (this.loading) return;

    if (this.idUsuario <= 0) {
      this.mostrarMensajeAdvertencia('No se encontró IdUsuario para auditoría. Vuelva a iniciar sesión.');
      return;
    }

    if (!this.canAnularRet()) {
      this.mostrarMensajeAdvertencia('Solo puede anular una retención ya GENERADA.');
      return;
    }

    // ✅ Confirmación con tu CustomMessageBoxComponent
    const ref = this.mostrarMensaje({
      title: 'Confirmación',
      message: '¿Desea ANULAR la retención?',
      type: 'warning',
      confirmText: 'Sí, anular',
      cancelText: 'No',
      showCancel: true,
    });

    const confirmado = await firstValueFrom(ref.afterClosed());
    if (!confirmado) return;

    try {
      this.loading = true;

      await firstValueFrom(
        this.retencionesService.deleteByCabecera(this.idCabMaestro, this.idEmpresa, this.idUsuario)
      );

      // Mensaje anulado éxitosamente
      this.snack.open('Retención anulada correctamente.', 'OK', {
        duration: 3500,
        horizontalPosition: 'right',
        verticalPosition: 'top',
      });

      this.readOnly = false;
      this.setHeaderEditable(true);
      await this.loadInitial();

    } catch (err: any) {
      // ✅ Error con tu MessageBox
      this.mostrarMensaje({
        title: 'Error',
        message: err?.message ?? 'Error al anular retenciones.',
        type: 'error',
        confirmText: 'Entendido',
        showCancel: false,
      });

    } finally {
      this.loading = false;
    }
  }


  ///////

  // async imprimir(): Promise<void> {
  //   if (!this.readOnly) {
  //     this.snack.open('Primero debe GRABAR la retención para poder imprimir.', 'OK', {
  //       duration: 3500,
  //       horizontalPosition: 'right',
  //       verticalPosition: 'top',
  //     });
  //     return;
  //   }

  //   const hasIds = (this.rowData ?? []).some(r => Number(r.idretencion ?? 0) > 0);
  //   if (!hasIds) {
  //     this.snack.open('No existen líneas guardadas (ID) para imprimir.', 'OK', {
  //       duration: 3500,
  //       horizontalPosition: 'right',
  //       verticalPosition: 'top',
  //     });
  //     return;
  //   }

  //   try {
  //     this.loading = true;

  //     // 1) Datos de impresión (tu backend CG)
  //     const data = await firstValueFrom(
  //       this.retencionesService.getImpresion(this.idEmpresa, this.idCabMaestro)
  //     );

  //     // 2) Traer logo parametrizado (Security)
  //     const lf = await firstValueFrom(this.empresaService.getLogoFirma(this.idEmpresa));
  //     const logoFile = String(lf?.logo ?? '').trim();

  //     let logoDataUrl: string | null = null;

  //     if (logoFile) {
  //       const logoUrl = this.logoService.getLogoUrl(logoFile);

  //       // IMPORTANTE: convierte URL -> DataURL (jsPDF NO debe recibir URL http)
  //       logoDataUrl = await this.urlToDataUrl(logoUrl);

  //       if (!logoDataUrl) {
  //         console.warn('[RET] No se pudo convertir logo a DataURL. URL=', logoUrl);
  //       }
  //     } else {
  //       console.warn('[RET] Empresa sin logo parametrizado (getLogoFirma devolvió vacío).');
  //     }

  //     // 3) Generar PDF (si logoDataUrl existe, lo usa; si no, imprime sin logo)
  //     RetencionPdfUtil.generarPdfRetencion(data, logoDataUrl);

  //   } catch (err: any) {
  //     this.snack.open(err?.message ?? 'Error al imprimir retención.', 'Cerrar', {
  //       duration: 6000,
  //       horizontalPosition: 'right',
  //       verticalPosition: 'top',
  //     });
  //   } finally {
  //     this.loading = false;
  //   }
  // }

  /**
   * IMPRIMIR: Descarga el PDF desde el backend
   * El backend genera automáticamente el XML si no existe
   */
  async imprimir(): Promise<void> {
    if (this.loading) return;

    // Validar que esté guardado
    if (!this.readOnly) {
      this.mostrarMensajeAdvertencia('Primero debe GRABAR la retención para poder imprimir.');
      return;
    }

    // Obtener el PRIMER ID de retención guardada
    const primeraRetencion = (this.rowData ?? [])
      .map(r => Number(r.idretencion ?? 0))
      .find(id => id > 0);

    if (!primeraRetencion) {
      this.mostrarMensajeAdvertencia('No existen retenciones guardadas para imprimir.');
      return;
    }

    try {
      this.loading = true;

      // Descargar el PDF del backend
      const pdfBlob = await firstValueFrom(
        this.retencionesService.descargarPdf(primeraRetencion)
      );

      // Crear URL temporal del Blob
      const url = window.URL.createObjectURL(pdfBlob);

      // Crear elemento <a> para descargar
      const link = document.createElement('a');
      link.href = url;

      // Nombre del archivo (puedes obtenerlo del rowData si quieres)
      const secuencial = this.rowData[0]?.secuencial || 'RETENCION';
      link.download = `RET-${secuencial}.pdf`;

      // Disparar descarga
      document.body.appendChild(link);
      link.click();

      // Limpiar
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      this.snack.open('PDF descargado correctamente.', 'OK', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top',
      });

    } catch (err: any) {
      this.mostrarMensaje({
        title: 'Error',
        message: err?.message ?? 'Error al descargar PDF de retención.',
        type: 'error',
        confirmText: 'Entendido',
        showCancel: false,
      });
    } finally {
      this.loading = false;
    }
  }


///////////
  /////
  async envioSRI(): Promise<void> {
    if (this.loading) return;

    // Validar que esté en modo lectura (ya guardado)
    if (!this.readOnly) {
      this.mostrarMensajeAdvertencia('Primero debe GRABAR la retención para enviar al SRI.');
      return;
    }

    // Obtener el PRIMER ID de retención guardada
    const primeraRetencion = (this.rowData ?? [])
      .map(r => Number(r.idretencion ?? 0))
      .find(id => id > 0);

    if (!primeraRetencion) {
      this.mostrarMensajeAdvertencia('No existen retenciones guardadas para enviar al SRI.');
      return;
    }

    // ✅ Confirmación
    const ref = this.mostrarMensaje({
      title: 'Confirmación',
      message: '¿Desea generar el XML y enviar la retención al SRI?',
      type: 'warning',
      confirmText: 'Sí, enviar',
      cancelText: 'No',
      showCancel: true,
    });

    const confirmado = await firstValueFrom(ref.afterClosed());
    if (!confirmado) return;

    try {
      this.loading = true;

      const respuesta = await firstValueFrom(
        this.retencionesService.generarXml(primeraRetencion)
      );

      if (respuesta.success) {
        const mensaje = `${respuesta.message || 'XML generado correctamente'}\n\n` +
                        `Clave de Acceso: ${respuesta.claveAcceso || 'N/A'}\n` +
                        `Secuencial: ${respuesta.secuencial || 'N/A'}\n` +
                        `Total Líneas: ${respuesta.totalLineas || 0}`;

        this.mostrarMensaje({
          title: 'Envío exitoso',
          message: mensaje,
          type: 'success',
          confirmText: 'Aceptar',
          showCancel: false,
        });
      } else {
        this.mostrarMensaje({
          title: 'Error',
          message: respuesta.message || 'No se pudo generar el XML.',
          type: 'error',
          confirmText: 'Entendido',
          showCancel: false,
        });
      }

    } catch (err: any) {
      this.mostrarMensaje({
        title: 'Error',
        message: err?.message ?? 'Error al enviar retención al SRI.',
        type: 'error',
        confirmText: 'Entendido',
        showCancel: false,
      });
    } finally {
      this.loading = false;
    }
  }

  // ---------- Validación y Sanitización ----------
  private validateRow(r: RetRow): string | null {
    if (!r.numdoc || !String(r.numdoc).trim()) return 'Falta NumDoc.';
    if (!r.anio || !String(r.anio).trim()) return 'Falta Año.';
    if (!r.tipocomp || !String(r.tipocomp).trim()) return 'Falta TipoComp.';
    if (!r.idcodcontable || Number(r.idcodcontable) <= 0) return 'Falta IdCodContable.';
    if (!r.idtiporetencion || Number(r.idtiporetencion) <= 0) return 'Falta IdTipoRetención.';
    if (!r.codigoretencion || !String(r.codigoretencion).trim()) return 'Falta CódigoRetención.';
    if (r.baseimponible === null || r.baseimponible === undefined) return 'Falta BaseImponible.';
    if (r.porcentajeretencion === null || r.porcentajeretencion === undefined) return 'Falta % Retención.';
    if (r.valorretenido === null || r.valorretenido === undefined) return 'Falta Valor Retenido.';
    if (!r.numlinea || Number(r.numlinea) <= 0) return 'Falta Línea.';
    return null;
  }

  private sanitize(r: RetRow): RetencionesRequest {
    const clean: RetencionesRequest = {
      idretencion: 0,
      idempresa: this.idEmpresa,
      idcabmaestro: this.idCabMaestro,
      numdoc: r.numdoc ?? '',
      numlinea: Number(r.numlinea ?? 0),
      anio: r.anio ?? '',
      fecha: this.toIso(r.fecha),
      hora: this.normalizeHora(r.hora),
      tipocomp: r.tipocomp ?? '',
      descomp: r.descomp ?? null,
      idcodcontable: Number(r.idcodcontable ?? 0),
      contribuyente: r.contribuyente ?? null,
      direccion: r.direccion ?? null,
      telefono: r.telefono ?? null,
      rucci: r.rucci ?? null,
      idtipocompsri: r.idtipocompsri ?? null,
      tipocomprobante: r.tipocomprobante ?? null,
      tipcompvta: r.tipcompvta ?? null,
      numcompvta: r.numcompvta ?? null,
      ejerfiscal: r.ejerfiscal ?? null,
      baseimponible: r.baseimponible ?? null,
      porcentajeretencion: r.porcentajeretencion ?? null,
      valorretenido: r.valorretenido ?? null,
      concepto: r.concepto ?? null,
      idtiporetencion: Number(r.idtiporetencion ?? 0),
      codigoretencion: r.codigoretencion ?? null,
      fechaing: r.fechaing ? this.toIso(r.fechaing) : new Date().toISOString(),
      autretencion: r.autretencion ?? null,
      numestablecimiento: r.numestablecimiento ?? null,
      puntoemision: r.puntoemision ?? null,
      secuencial: r.secuencial ?? null,
      enviado: this.asBool(r.enviado),
      tipomovimiento: r.tipomovimiento ?? null,
      estadoingreso: this.asBool(r.estadoingreso), /// 1 as any, //this.asBool(r.estadoingreso),
      idusuario: Number(r.idusuario ?? this.idUsuario), // ✅ nuevo campo
    };

    return clean;
  }

  private buildEmptyRow(numlinea: number): RetRow {
    const now = new Date();
    return {
      idretencion: 0,
      idempresa: this.idEmpresa,
      idcabmaestro: this.idCabMaestro,
      idusuario: this.idUsuario, // ✅ nuevo campo
      numdoc: '',
      numlinea,
      anio: String(now.getFullYear()),
      fecha: now.toISOString(),
      hora: this.hhmm(),

      tipocomp: 'RT',
      descomp: null,
      idcodcontable: 0,

      contribuyente: null,
      direccion: null,
      telefono: null,
      rucci: null,

      idtipocompsri: null,
      tipocomprobante: null,
      tipcompvta: null,
      numcompvta: null,
      ejerfiscal: null,

      baseimponible: null,
      porcentajeretencion: null,
      valorretenido: null,

      concepto: null,

      idtiporetencion: 0,
      codigoretencion: null,

      fechaing: now.toISOString(),
      autretencion: null,

      numestablecimiento: null,
      puntoemision: null,
      secuencial: null,

      enviado: false,
      tipomovimiento: 'RT',
      estadoingreso: true,

      _uiState: 'NUEVO',
      _uiMsg: '',
    };
  }

  private nextLinea(): number {
    const max = this.rowData.reduce((acc, r) => Math.max(acc, Number(r.numlinea ?? 0)), 0);
    return max + 1;
  }

  private hhmm(): string {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  private normalizeHora(v: any): string {
    const s = String(v ?? '').trim();
    if (!s) return this.hhmm();

    if (/^\d+$/.test(s)) {
      const h = Number(s);
      if (!isNaN(h) && h >= 0 && h <= 23) return `${String(h).padStart(2, '0')}:00`;
    }

    if (/^\d{1,2}:\d{2}$/.test(s)) {
      const [hh, mm] = s.split(':').map(Number);
      if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
        return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
      }
    }

    return this.hhmm();
  }

  private toIso(val: any): string {
    const d = val instanceof Date ? val : new Date(val);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }

  private formatIso(val: any): string {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy}`;
  }

  private toDateInputValue(val: any): string {
    if (!val) return '';
    const d = val instanceof Date ? val : new Date(val);
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private dateInputToIso(val: any): string {
    if (!val) return new Date().toISOString();

    if (val instanceof Date) {
      return isNaN(val.getTime()) ? new Date().toISOString() : val.toISOString();
    }

    const s = String(val);
    const parts = s.split('-').map(x => Number(x));
    if (parts.length === 3 && parts[0] > 0 && parts[1] > 0 && parts[2] > 0) {
      const [y, m, d] = parts;
      return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
    }

    const d2 = new Date(val);
    return isNaN(d2.getTime()) ? new Date().toISOString() : d2.toISOString();
  }

  private asBool(v: any): boolean {
    if (v === true || v === 1) return true;
    if (v === false || v === 0) return false;

    const s = String(v ?? '').trim().toUpperCase();
    if (s === '1' || s === 'TRUE' || s === 'S' || s === 'SI' || s === 'YES') return true;
    if (s === '0' || s === 'FALSE' || s === 'N' || s === 'NO') return false;

    return false;
  }

  // ✅ CLAVE: ya NO forzamos sizeColumnsToFit en cada carga
  private setGridData(rows: RetRow[]): void {
    this.rowData = rows ?? [];
    this.recalcTotals();

    if (this.gridApi) {
      this.gridApi.setGridOption('rowData', this.rowData);
      this.gridApi.refreshCells({ force: true });

      // ✅ Solo auto-ajusta si el usuario NO ha redimensionado manualmente
      if (!this.userResized) {
        this.autoSizeInitialOnce();
      }
    }
  }
  ////

  private async urlToDataUrl(url: string): Promise<string | null> {
    try {
      // Si tu backend usa cookies/sesión, esto es CLAVE.
      // Si usas JWT con interceptor, no estorba.
      const blob = await firstValueFrom(
        this.http.get(url, { responseType: 'blob', withCredentials: true })
      );

      // Validación mínima: si viene vacío, no sirve
      if (!blob || blob.size <= 0) {
        console.warn('[RET] Blob del logo vacío:', url);
        return null;
      }

      return await this.blobToDataUrl(blob);
    } catch (e) {
      console.warn('[RET] urlToDataUrl falló:', url, e);
      return null;
    }
  }

  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('No se pudo leer el blob.'));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(blob);
    });
  }

  //mensajeria
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


 private mostrarMensajeAdvertencia(mensaje: string): void {
    this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: {
        title: 'Campos obligatorios',
        message: mensaje,
        type: 'warning',
        confirmText: 'Entendido',
        showCancel: false
      }
    });
  }

  /// rp
}
