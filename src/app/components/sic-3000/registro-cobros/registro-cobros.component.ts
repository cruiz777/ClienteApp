import { Component, OnInit, ViewChild, ElementRef, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteTrigger, MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ClienteService } from 'src/app/services/cliente.service';
import { UsuarioService } from 'src/app/services/usuario.service';
import { CuentaCobrarService, GridRow } from 'src/app/services/cuenta-cobrar.service';
import { ClienteSummary } from 'src/app/interfaces/responses/cliente-summary-response';
import { FormaPagoService, FormaPagoResponse } from 'src/app/services/forma-pago.service';
import {  finalize } from 'rxjs/operators';
import { map, tap } from 'rxjs/operators'; // añade estos si no están

// rxjs
import {combineLatest } from 'rxjs';

// rxjs/operators
import {
 
  startWith,
  shareReplay
} from 'rxjs/operators';



import { Observable, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, switchMap, catchError } from 'rxjs/operators';

import { ColDef, GridApi, GridReadyEvent, ValueSetterParams, GetRowIdParams } from 'ag-grid-community';
import { AgGridModule } from 'ag-grid-angular';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-registro-cobros',
  standalone: true,
  templateUrl: './registro-cobros.component.html',
  styleUrls: ['./registro-cobros.component.css'],
  encapsulation: ViewEncapsulation.None,
  imports: [
    FormsModule, ReactiveFormsModule, MatAutocompleteModule, AgGridModule, CommonModule, HttpClientModule,
    MatTabsModule, MatFormFieldModule, MatInputModule, MatOptionModule, MatSelectModule, MatButtonModule,
    MatMenuModule, MatTableModule, MatPaginatorModule, MatSnackBarModule, MatIconModule, MatDialogModule, MatTooltipModule
  ]
})
export class RegistroCobrosComponent implements OnInit {
  // Clientes
// Clientes (paso 1)
@ViewChild(MatAutocompleteTrigger) autoClienteTrigger!: MatAutocompleteTrigger;
@ViewChild('clienteInputRef') clienteInputRef!: ElementRef<HTMLInputElement>;

// Valor a pagar
@ViewChild('valorAPagarRef') valorAPagarRef!: ElementRef<HTMLInputElement>;

// Autocomplete de formas de pago (paso 2)
@ViewChild('pagoInputRef') pagoInputRef!: ElementRef<HTMLInputElement>;
@ViewChild('autoPagoTrigger', { read: MatAutocompleteTrigger }) 
autoPagoTrigger!: MatAutocompleteTrigger;

  step = 1;

  formCliente!: FormGroup;
  formPago!: FormGroup;

  usuarioActual = this.usuarioService.getUsuarioActual();

  mostrarNombreCliente = (cliente: ClienteSummary | string | null): string =>
    (cliente && typeof cliente === 'object') ? (cliente.nomcli ?? '') : (cliente ?? '') as string;

  clienteOrigenControl = new FormControl<string | any | null>(null, Validators.required);
  clientesOrigenFiltrados: ClienteSummary[] = [];

  // ===== GRID FACTURAS =====
  private gridApi!: GridApi;
  private pagosEditadosMap = new Map<string, { numero: string; pago: number; estado: string }>();

  private invalidRows = new Set<string>();
  private gridTouched = false;

  getRowId = (p: GetRowIdParams) => {
    const d = p.data as any;
    return String(d?.numero ?? d?.id ?? `${d?.fecha}|${d?.descripcion}|${d?.monto}`);
  };

  columnDefs: ColDef[] = [
    { headerName: 'No. Factura', field: 'numero', minWidth: 160, pinned: 'left' },
    { headerName: 'Fecha', field: 'fecha', width: 120 },
    {
      headerName: 'Monto',
      field: 'monto',
      width: 120,
      type: 'rightAligned',
      valueFormatter: p => this.usd(p.value),
    },
    {
      headerName: 'Pago',
      field: 'pago',
      width: 120,
      type: 'rightAligned',
      editable: () => this.canEditFacturas,
      cellEditor: 'agTextCellEditor',
      // ⬇️ permite Enter/Escape y restringe a dígitos + un punto
      suppressKeyboardEvent: (p) => {
        if (!p.editing) return false;
        const e = p.event as KeyboardEvent;
        if (e.key === 'Enter' || e.key === 'Escape') return false;
        const allowedNav = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
        if (allowedNav.includes(e.key)) return false;
        const isDigit = e.key >= '0' && e.key <= '9';
        const isDot = e.key === '.';
        const target = (e.target as HTMLInputElement | null);
        const current = target?.value ?? String((p.data as any)?.pago ?? '');
        if (isDot) return current.includes('.');
        return !(isDigit || isDot);
      },
      valueParser: (p) => {
        const n = parseFloat(String(p.newValue).replace(/[^0-9.]/g, ''));
        return isNaN(n) ? 0 : n;
      },
      valueSetter: (p: ValueSetterParams<any>) => {
        const old = Number(p.data.pago) || 0;
        const montoFactura = Number(p.data.monto) || 0;

        let val = parseFloat(String(p.newValue).replace(/[^0-9.]/g, ''));
        val = this.clamp2(isNaN(val) ? 0 : val);

        if (val > montoFactura) {
          this.mostrarAlerta('El pago no puede superar el Monto de la factura.', 'info');
          val = montoFactura;
        }

        const valorAPagar = this.getValorAPagarNumber();
        const totalActual = this.sumPagos();
        const totalPropuesto = this.clamp2(totalActual - old + val);
        if (totalPropuesto > valorAPagar) {
          const maxValPermitido = this.clamp2(valorAPagar - (totalActual - old));
          this.mostrarAlerta('La suma de pagos no puede superar el Valor a Pagar.', 'info');
          val = Math.max(0, maxValPermitido);
        }

        p.data.pago = val;
        p.data.estado = this.getEstado(val, montoFactura);

        const id = this.getRowId({ data: p.data } as any);
        const errs = this.validateFacturaRow(p.data);
        if (errs.length) this.invalidRows.add(id); else this.invalidRows.delete(id);

        if (p.data?.numero) {
          this.pagosEditadosMap.set(p.data.numero, { numero: p.data.numero, pago: val, estado: p.data.estado });
        }
        this.gridTouched = true;

        const params: any = { columns: ['pago', 'estado'], force: true };
        if (p.node) params.rowNodes = [p.node];
        p.api.refreshCells(params);
        return old !== val;
      },
      valueFormatter: p => this.usd(p.value),
      cellClassRules: {
        'cell-invalid': (params) => this.invalidRows.has(this.getRowId(params as any)),
      },
      tooltipValueGetter: (params) => {
        const r = params.data as GridRow;
        const errs = this.validateFacturaRow(r);
        return errs.length ? errs.join(' • ') : '';
      },
    },
    {
      headerName: 'Estado',
      field: 'estado',
      width: 170,
      cellClass: p => {
        if (this.invalidRows.has(this.getRowId(p as any))) return 'text-danger fw-bold';
        const v = String(p.value || '').toUpperCase();
        if (v === 'CANCELADO') return 'text-success fw-bold';
        if (v === 'ABONADO') return 'text-primary fw-bold';
        return 'text-warning fw-bold';
      },
    },
    { headerName: 'Vence', field: 'vence', width: 120, cellClass: p => (p.data?.valueVencido ? 'text-danger fw-bold' : '') },
    { headerName: 'Descripción', field: 'descripcion', flex: 1, minWidth: 220 },
    { headerName: 'Ord', field: 'ord', width: 80, type: 'rightAligned', hide: true },
  ];

  defaultColDef: ColDef = { resizable: true, sortable: true, filter: true };
  rowData: GridRow[] = [];

  // ===== GRID PAGOS (plantillas) =====
  private pagoGridApi!: GridApi;

  filteredFormasPago$: Observable<FormaPagoResponse[]> = of([]);
  isLoadingFormas = false;

  pagoColumnDefsTransfer: ColDef[] = [
    { headerName: 'CODIGO', field: 'codigo', width: 110, editable: true },
    { headerName: 'DESCRIPCION', field: 'descripcion', flex: 1, minWidth: 220, editable: true },
    {
      headerName: 'PORC.RET',
      field: 'porcRet',
      width: 120,
      editable: true,
      valueSetter: (p: ValueSetterParams<any>) => {
        const old = Number(p.data.porcRet) || 0;
        let val = 0;
        if (p.newValue != null) {
          const n = parseFloat(String(p.newValue).replace(/[^\d.-]/g, ''));
          val = isNaN(n) ? 0 : Math.max(0, n);
        }
        p.data.porcRet = val;
        const params: any = { columns: ['porcRet'], force: true };
        if (p.node) params.rowNodes = [p.node];
        p.api.refreshCells(params);
        return old !== val;
      },
      valueFormatter: p => (p.value || p.value === 0) ? `${(+p.value).toFixed(2)} %` : '',
    },
    { headerName: 'BANCO', field: 'banco', width: 180, editable: true },
    { headerName: 'No.CUENTA/TARJETA/FACTURA', field: 'numCuentaTarjetaFactura', width: 260, editable: true },
    { headerName: 'No.CHEQUE/#', field: 'numCheque', width: 160, editable: true },
    {
      headerName: 'MONTO',
      field: 'monto',
      width: 120,
      editable: true,
      type: 'rightAligned',
      valueSetter: (p: ValueSetterParams<any>) => {
        const old = Number(p.data.monto) || 0;
        let val = 0;
        if (p.newValue != null) {
          const n = parseFloat(String(p.newValue).replace(/[^\d.-]/g, ''));
          val = isNaN(n) ? 0 : Math.max(0, n);
        }
        p.data.monto = val;
        this.recalcularTotal();
        const params: any = { columns: ['monto'], force: true };
        if (p.node) params.rowNodes = [p.node];
        p.api.refreshCells(params);
        return old !== val;
      },
      valueFormatter: p => this.usd(p.value),
    },
    {
  headerName: '',
  width: 66,
  pinned: 'left',
  cellRenderer: (params: any) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ag-btn-icon ag-btn-delete';
  btn.title = 'Eliminar';
  btn.setAttribute('aria-label', 'Eliminar forma de pago');
  btn.innerHTML = '<span class="material-icons">delete</span>';

  btn.addEventListener('click', () => {
    const removed = params.node.data;

    // 1) Quita del grid
    params.api.applyTransaction({ remove: [removed] });

    // 2) Quita del arreglo fuente (por referencia o por código)
    this.pagoRowData = (this.pagoRowData ?? []).filter((r: any) =>
      r !== removed && String(r.codigo ?? '') !== String(removed?.codigo ?? '')
    );

    // 3) Refresca datos del grid y totales
    this.pagoGridApi?.setGridOption('rowData', this.pagoRowData);
    this.recalcularTotal();
  });

  return btn;
}

}

  ];


  pagoColumnDefs: ColDef[] = [];
  pagoDefaultColDef: ColDef = { resizable: true, sortable: true, filter: true };

  pagoRowDataTransfer: any[] = [];
  pagoRowDataCheque: any[] = [{ numChequeFecha: '', nombreDueno: '', autorizacion: '', monto: 0 }];
  pagoRowData: any[] = [];
  totalPagos = 0;

  codcliO = 0;

  constructor(
    private fb: FormBuilder,
    private usuarioService: UsuarioService,
    private clienteService: ClienteService,
    private cuentaCobrarService: CuentaCobrarService,
    private _snackBar: MatSnackBar,
    private formaPagoService: FormaPagoService,
  ) { }

  ngOnInit(): void {
    this.usuarioActual = this.usuarioService.getUsuarioActual();
    this.cargarCliente();

    this.formCliente = this.fb.group({
      noPago: [''],
      fechaPago: [this.hoyISO(), Validators.required],
      clienteOrigenControl: [''],
      clienteCodigo: [0],
      responsable: [this.usuarioActual?.nombre_usuario || ''],
      valorAPagar: [
        '0.00',
        [
          Validators.required,
          Validators.pattern(/^(?:\d+(?:\.\d{0,2})?)$/),
          Validators.min(0.01)
        ]
      ],
      montoDeuda: [this.usd(0)],
      observacion: [''],
    });

    this.formPago = this.fb.group({
      plantilla: ['transfer'],
      valor: [''],
      observacion: [''],
     metodoPago: [''] 
    });

    // Toggle edición del grid según valor a pagar válido
    this.formCliente.get('valorAPagar')!.valueChanges.subscribe(() => {
      this.gridApi?.setGridOption('suppressClickEdit', !this.canEditFacturas);
    });

    // Autocomplete formas de pago
// ngOnInit()
const DEBUG_FP = true;
// --- dentro de ngOnInit() ---
const metodoCtrl = this.formPago.get('metodoPago') as FormControl;

// 1) Trae una vez las formas activas y cachea
const formasActivas$ = this.formaPagoService.getActivas().pipe(
  map((resp: any) => (resp?.data ?? resp ?? []).map((x: any) => ({
    idFormaPago: x.idFormaPago ?? x.id_forma_pago ?? x.id ?? 0,
    descripcionPago: x.descripcionPago ?? x.descripcion_pago ?? x.descripcion ?? ''
  }) as FormaPagoResponse)),
  tap(list => console.log('[FP] activas:', list)),
  catchError(err => {
    console.error('[FP] error getActivas:', err);
    return of([] as FormaPagoResponse[]);
  }),
  shareReplay(1)
);

// 2) Filtra localmente según lo que teclea el usuario (o vacío para ver todo)
this.filteredFormasPago$ = combineLatest([
  metodoCtrl.valueChanges.pipe(
    startWith(''),
    debounceTime(250),
    distinctUntilChanged(),
    map((v: any) =>
      (typeof v === 'string' ? v : (v?.descripcionPago ?? v?.descripcion_pago ?? '')).trim().toLowerCase()
    ),
    tap(() => this.isLoadingFormas = true)
  ),
  formasActivas$
]).pipe(
  map(([term, lista]: [string, FormaPagoResponse[]]) =>
    !term ? lista : lista.filter((fp: FormaPagoResponse) =>
      (fp.descripcionPago ?? '').toLowerCase().includes(term)
    )
  ),
  tap(r => console.log('[FP] render ->', r)),
  finalize(() => this.isLoadingFormas = false),
  catchError(err => {
    console.error('[FP] stream error:', err);
    this.isLoadingFormas = false;
    return of([] as FormaPagoResponse[]);
  })
);




    this.activarPlantilla('transfer');
  }

  // ===== Utils =====
  usd(v: number) {
    if (v == null) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(v);
  }

  private getEstado(pago: number, monto: number): string {
    if (!pago || pago <= 0) return 'PENDIENTE DE PAGO';
    if (pago >= monto) return 'CANCELADO';
    return 'ABONADO';
  }

  invalid(form: FormGroup, ctrl: string) {
    const c = form.get(ctrl);
    return { 'is-invalid': !!c && c.touched && c.invalid };
  }

  onGridReady(e: GridReadyEvent) {
    this.gridApi = e.api;
    this.gridApi.sizeColumnsToFit();
  }

  private validateFacturaRow(r: GridRow): string[] {
    const pago = Number(r.pago) || 0;
    const monto = Number(r.monto) || 0;

    const errors: string[] = [];
    if (pago < 0) errors.push('Pago negativo.');
    if (!Number.isFinite(pago)) errors.push('Pago inválido.');
    if (pago > monto) errors.push('Pago supera el monto.');
    if (Math.round(pago * 100) !== pago * 100) errors.push('Pago con más de 2 decimales.');
    return errors;
  }

  private validateGridFacturas(): { ok: boolean; errors: string[] } {
    this.gridApi?.stopEditing();
    const errors: string[] = [];
    this.invalidRows.clear();

    (this.rowData || []).forEach((r) => {
      const rowErrors = this.validateFacturaRow(r);
      if (rowErrors.length) {
        const id = this.getRowId({ data: r } as any);
        this.invalidRows.add(id);
        errors.push(`Factura ${r.numero}: ${rowErrors.join(' ')}`);
      }
    });

    const valorAPagar = this.clamp2(this.getValorAPagarNumber());
    const sumaPagos = this.clamp2(this.sumPagos());
    if (Math.abs(sumaPagos - valorAPagar) >= 0.005) {
      errors.push(`La suma de pagos (${this.usd(sumaPagos)}) debe ser exactamente ${this.usd(valorAPagar)}.`);
    }

    this.gridApi?.refreshCells({ force: true });
    return { ok: errors.length === 0, errors };
  }

  onCellValueChangedFacturas(_: any) {
    if (!this.gridTouched) return;
    this.validateGridFacturas();
  }

  guardarPagosEditados() {
    const cambios = Array.from(this.pagosEditadosMap.values());
    if (cambios.length === 0) return;
    console.log('Guardando cambios de pagos:', cambios);
    this.pagosEditadosMap.clear();
  }

  onCancel(): void {
    this.formCliente.reset({
      noPago: '',
      fechaPago: this.hoyISO(),
      clienteCodigo: 0,
      responsable: this.usuarioActual?.nombre_usuario || '',
      valorAPagar: '0.00',
      montoDeuda: '0.00',
      observacion: '',
    });
    this.unlockValorAPagar();
    this.limpiarClienteAutocomplete();

    this.rowData = [];
    this.pagosEditadosMap.clear();
    this.invalidRows.clear();

    if (this.gridApi) {
      this.gridApi.stopEditing(true);
      this.gridApi.setFilterModel(null);
      (this.gridApi as any).setGridOption?.('quickFilterText', '');
      this.gridApi.applyColumnState({ defaultState: { sort: null } });
      (this.gridApi as any).setGridOption?.('rowData', []);
      this.gridApi.refreshCells({ force: true });
    }

    this.onCancelarPago();
    this.totalPagos = 0;
    this.step = 1;
  }

  onNext(): void {
    if (this.formCliente.invalid) {
      this.formCliente.markAllAsTouched();
      return;
    }
    if (this.sumPagos() === 0 && this.getValorAPagarNumber() > 0) {
      this.mostrarAlerta('Distribuye el Valor a Pagar en el detalle antes de continuar.', 'info');
      this.irADetalleFacturas();
      return;
    }
    const res = this.validateGridFacturas();
    if (!res.ok) {
      this.mostrarAlerta('Hay errores en el detalle de facturas. Revisa los campos en rojo.', 'error');
      this.revealFirstError();
      return;
    }
    this.step = 2;
  }

  // ===== Paso 2 (plantillas) =====
  onPlantillaChange() {
    const pl = this.formPago.get('plantilla')?.value as 'transfer' | 'cheque';
    this.activarPlantilla(pl);
  }

  private activarPlantilla(pl: 'transfer' | 'cheque') {
    if (pl === 'transfer') {
      this.pagoColumnDefs = this.pagoColumnDefsTransfer;
      this.pagoRowData = JSON.parse(JSON.stringify(this.pagoRowDataTransfer));
    } else {
      
      this.pagoRowData = JSON.parse(JSON.stringify(this.pagoRowDataCheque));
    }
    this.recalcularTotal();
    if (this.pagoGridApi) {
      this.pagoGridApi.setGridOption('columnDefs', this.pagoColumnDefs);
      this.pagoGridApi.setGridOption('rowData', this.pagoRowData);
      this.pagoGridApi.sizeColumnsToFit();
    }
  }

  onPagoGridReady(e: GridReadyEvent) {
    this.pagoGridApi = e.api;
    this.pagoGridApi.sizeColumnsToFit();
  }

  onPagoCellValueChanged(_: any) {
    this.recalcularTotal();
  }

  private recalcularTotal() {
    this.totalPagos = this.pagoRowData.reduce((acc, r) => acc + (Number(r.monto) || 0), 0);
  }

  private validateGridPlantilla(): { ok: boolean; errors: string[] } {
    this.pagoGridApi?.stopEditing();

    const errors: string[] = [];
    const total = this.clamp2(this.pagoRowData.reduce((s: number, r: any) => s + (Number(r.monto) || 0), 0));
    const valorAPagar = this.clamp2(this.getValorAPagarNumber());

    if (Math.abs(total - valorAPagar) >= 0.005) {
      errors.push(`Total de formas de pago (${this.usd(total)}) debe ser ${this.usd(valorAPagar)}.`);
    }

    this.pagoRowData.forEach((r: any, i: number) => {
      const m = Number(r.monto) || 0;
      if (!Number.isFinite(m)) errors.push(`Línea ${i + 1}: monto inválido.`);
      if (m < 0) errors.push(`Línea ${i + 1}: monto negativo.`);
      const isRet = r.codigo === '12' || r.codigo === '13';
      if (isRet && !(Number(r.porcRet) > 0)) {
        errors.push(`Línea ${i + 1}: retención requiere porcentaje.`);
      }
    });

    return { ok: errors.length === 0, errors };
  }

  aceptarPagos() {
    const p = this.validateGridPlantilla();
    if (!p.ok) {
      this.mostrarAlerta('Revisa las formas de pago (totales/retenciones).', 'error');
      console.warn('Errores plantilla:', p.errors);
      return;
    }
    console.log('F4 Aceptar Pagos →', this.pagoRowData);
  }

  cancelarPagos() {
    const pl = this.formPago.get('plantilla')?.value as 'transfer' | 'cheque';
    this.activarPlantilla(pl);
  }

  salirPagos() { this.step = 1; }

  nuevoPago() {
    const pl = this.formPago.get('plantilla')?.value as 'transfer' | 'cheque';
    if (pl === 'transfer') {
      this.pagoRowData.push({ codigo: '', descripcion: '', porcRet: null, banco: '', numCuentaTarjetaFactura: '', numCheque: '', monto: 0 });
    } else {
      this.pagoRowData.push({ numChequeFecha: '', nombreDueno: '', autorizacion: '', monto: 0 });
    }
    if (this.pagoGridApi) this.pagoGridApi.setGridOption('rowData', this.pagoRowData);
  }

  registrarPago() { console.log('Registrar Pago (temporal) →', this.pagoRowData); }

  onCancelarPago(): void {
    this.formPago.reset({ plantilla: 'transfer', valor: '', observacion: '', metodoPago: '' });
    this.activarPlantilla('transfer');
  }

  // ===== Autocomplete clientes =====
  seleccionarClienteOrigen(cliente: ClienteSummary): void {
    if (!cliente?.clientes_codigo) return;

    this.codcliO = cliente.clientes_codigo;
    this.formCliente.patchValue({ clienteCodigo: this.codcliO });

    this.cuentaCobrarService.getFacturasPendientesGrid(String(this.codcliO))
      .subscribe((rows: GridRow[]) => {
        this.rowData = rows;
        if (this.gridApi) {
          this.gridApi.setGridOption('rowData', this.rowData);
          this.gridApi.sizeColumnsToFit();
        }
        this.recalcMontoDeuda();

        if (rows.length === 0) this.mostrarAlerta('El cliente no tiene detalle de facturas (No tiene facturas_pendientes)', 'info');
        this.focusValorAPagar();
      });
  }

  cargarCliente() {
    this.clienteOrigenControl.valueChanges.pipe(
      filter((v): v is string => typeof v === 'string'),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(txt => {
        const q = (txt || '').trim();
        return q ? this.clienteService.getClientesSummary(q).pipe(catchError(() => of({ data: [] })))
          : of({ data: [] });
      })
    ).subscribe(resp => this.clientesOrigenFiltrados = resp?.data ?? []);
  }

  private limpiarClienteAutocomplete(): void {
    if (this.autoClienteTrigger) this.autoClienteTrigger.closePanel();
    this.clienteOrigenControl.setValue('', { emitEvent: false });
    this.clienteOrigenControl.markAsPristine();
    this.clienteOrigenControl.markAsUntouched();
    if (this.clienteInputRef) this.clienteInputRef.nativeElement.blur();
    this.codcliO = 0;
    this.clientesOrigenFiltrados = [];
    this.formCliente.patchValue({ clienteCodigo: 0 }, { emitEvent: false });
  }

  private hoyISO(): string {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${yyyy}-${mm}-${dd}`;
  }

  private recalcMontoDeuda(): void {
    const total = (this.rowData ?? []).reduce((acc, r) => acc + (Number(r.monto) || 0), 0);
    this.formCliente.patchValue({ montoDeuda: this.usd(total) }, { emitEvent: false });
  }

  mostrarAlerta(mensaje: string, tipo: 'info' | 'error' | 'ok' | string): void {
    this._snackBar.open(mensaje, 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: tipo === 'error' ? ['snack-error'] : tipo === 'ok' ? ['snack-ok'] : ['snack-info']
    });
  }

  getValorAPagarNumber(): number {
    const raw = String(this.formCliente.get('valorAPagar')?.value ?? '').replace(/[^0-9.]/g, '');
    const n = parseFloat(raw);
    return isNaN(n) ? 0 : n;
  }

  private sumPagos(): number {
    return (this.rowData ?? []).reduce((acc, r) => acc + (Number(r.pago) || 0), 0);
  }

  private clamp2(v: number): number {
    if (!isFinite(v) || v < 0) return 0;
    return Math.round(v * 100) / 100;
  }

  bloquearTeclasInvalidas(e: KeyboardEvent) {
    const invalid = ['-', '+', 'e', 'E', ','];
    if (invalid.includes(e.key)) {
      e.preventDefault();
      return;
    }
    const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
    if (allowed.includes(e.key)) return;
    const isDigit = e.key >= '0' && e.key <= '9';
    const isDot = e.key === '.';
    if (!isDigit && !isDot) { e.preventDefault(); return; }
    if (isDot) {
      const input = e.target as HTMLInputElement;
      if (input?.value?.includes('.')) e.preventDefault();
    }
  }

  sanearDecimal(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input) return;
    let v = input.value ?? '';
    v = v.replace(/[^0-9.]/g, '');
    const firstDot = v.indexOf('.');
    if (firstDot !== -1) v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, '');
    v = v.replace(/^0+(?=\d)/, '0');
    v = v.replace(/^(\d+)(\.\d{0,2})?.*$/, (_m, int, dec) => int + (dec ?? ''));
    if (v !== input.value) input.value = v;
    this.formCliente.get('valorAPagar')!.setValue(v, { emitEvent: false });
  }

  processDataFromClipboard = (params: any) => {
    const col = params.column ? params.column.getColId() : null;
    if (col !== 'pago') return params.data;
    return (params.data || []).map((row: any[]) => {
      const raw = String(row[0] ?? '');
      const n = parseFloat(raw.replace(/[^0-9.]/g, ''));
      const v = isNaN(n) ? '' : this.clamp2(n);
      return [v];
    });
  };

  private revealFirstError() {
    const firstId = Array.from(this.invalidRows)[0];
    if (!firstId || !this.gridApi) return;
    const rowNode = this.gridApi.getRowNode(firstId);
    if (rowNode) {
      this.gridApi.ensureNodeVisible(rowNode, 'middle');
      this.gridApi.flashCells({ rowNodes: [rowNode], columns: ['pago'] });
      this.gridApi.setFocusedCell(rowNode.rowIndex!, 'pago');
    }
  }

  get canEditFacturas(): boolean {
    const ctrl = this.formCliente?.get('valorAPagar');
    const n = this.getValorAPagarNumber();
    const isOk = ctrl?.enabled ? !!ctrl && ctrl.valid : true;
    return isOk && n > 0;
  }

  onFocusValorAPagar() {
    this.gridApi?.stopEditing();
  }

  onValorAPagarInput(e: Event) {
    if (this.valorAPagarBloqueado) return;
    this.sanearDecimal(e);
    const newRows = (this.rowData || []).map(r => {
      const monto = Number(r.monto) || 0;
      return { ...r, pago: 0, estado: this.getEstado(0, monto) };
    });
    this.rowData = newRows;
    this.gridApi?.setGridOption('rowData', this.rowData);
    this.invalidRows.clear();
    this.gridApi?.refreshCells({ force: true });
  }

  irADetalleFacturas(e?: Event) {
    e?.preventDefault();
    this.lockValorAPagar();
    if (this.gridApi && (this.rowData?.length ?? 0) > 0) {
      this.gridApi.ensureIndexVisible(0, 'middle');
      this.gridApi.setFocusedCell(0, 'pago');
      (this.gridApi as any).startEditingCell({ rowIndex: 0, colKey: 'pago' });
    }
  }

  private focusValorAPagar() {
    setTimeout(() => {
      const el = this.valorAPagarRef?.nativeElement;
      if (el) {
        el.focus();
        el.select();
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }, 0);
  }

  valorAPagarBloqueado = false;

  private lockValorAPagar() {
    if (this.valorAPagarBloqueado) return;
    const ctrl = this.formCliente.get('valorAPagar');
    const n = this.getValorAPagarNumber();
    if (ctrl && n > 0) {
      ctrl.disable({ emitEvent: false });
      this.valorAPagarBloqueado = true;
      this.gridApi?.setGridOption('suppressClickEdit', !this.canEditFacturas);
    }
  }

  confirmarValorAPagar() {
    this.lockValorAPagar();
  }

  private unlockValorAPagar() {
    this.valorAPagarBloqueado = false;
    const ctrl = this.formCliente?.get('valorAPagar');
    ctrl?.enable({ emitEvent: false });
    this.gridApi?.setGridOption('suppressClickEdit', !this.canEditFacturas);
  }

  onFormEnter(e: Event) {
    const t = e.target as HTMLElement | null;
    if (t && t.closest('.ag-root')) return; // deja pasar Enter dentro del grid
    e.preventDefault(); // evita submit por Enter en otros inputs
  }

  // ===== Autocomplete de Formas de Pago (Paso 2) =====
  displayFormaPago = (fp: FormaPagoResponse | string | null): string =>
    (typeof fp === 'string') ? fp : (fp?.descripcionPago ?? '');

  onFormaPagoSelected(event: MatAutocompleteSelectedEvent): void {
    const item = event.option.value as FormaPagoResponse;
    const pl = this.formPago.get('plantilla')?.value as 'transfer' | 'cheque';
    

    // normaliza datos mínimos
    const codigo = String((item as any).codigo ?? (item as any).idFormaPago ?? '');
    const descripcion = (item as any).descripcionPago ?? (item as any).descripcion ?? '';

    if (!codigo && !descripcion) return;

    // evita duplicados por 'codigo'
    const yaExiste = this.pagoRowData.some(r => String(r.codigo ?? '') === codigo && !!codigo);
    if (!yaExiste) {
      if (pl === 'transfer') {
        this.pagoRowData.push({ codigo, descripcion, porcRet: null, banco: '', numCuentaTarjetaFactura: '', numCheque: '', monto: 0 });
      } else {
        this.pagoRowData.push({ numChequeFecha: '', nombreDueno: '', autorizacion: '', monto: 0, codigo, descripcion });
      }
      this.pagoGridApi?.setGridOption('rowData', this.pagoRowData);
      this.recalcularTotal();
    }

    // limpia input y cierra autocomplete
    setTimeout(() => {
      this.formPago.get('metodoPago')?.setValue('', { emitEvent: false });
      this.autoPagoTrigger?.closePanel();
      this.pagoInputRef?.nativeElement.blur();
    }, 0);
  }
  onPagosRowsChanged(): void {
  this.recalcularTotal();
}
private existeFormaEnGrid(codigo: string): boolean {
  if (!this.pagoGridApi) return false;
  const count = this.pagoGridApi.getDisplayedRowCount();
  for (let i = 0; i < count; i++) {
    const data = this.pagoGridApi.getDisplayedRowAtIndex(i)?.data;
    if (String(data?.codigo ?? '') === String(codigo ?? '')) return true;
  }
  return false;
}

}
