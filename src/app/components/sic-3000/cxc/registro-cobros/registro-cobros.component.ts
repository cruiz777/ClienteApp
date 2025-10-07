import { Component, OnInit, ViewChild, ElementRef, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteTrigger, MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ClienteService } from 'src/app/services/cliente.service';
import { UsuarioService } from 'src/app/services/usuario.service';
import { CuentaCobrarService, GridRow } from 'src/app/services/cuenta-cobrar.service';
import { PagoReportService } from 'src/app/services/pago-report.service';
import { ClienteSummary } from 'src/app/interfaces/responses/cliente-summary-response';
import { FormaPagoService, FormaPagoResponse } from 'src/app/services/forma-pago.service';
import { finalize } from 'rxjs/operators';
import { map, tap } from 'rxjs/operators';

// rxjs
import { combineLatest, Observable, of } from 'rxjs';

// rxjs/operators
import { startWith, shareReplay, debounceTime, distinctUntilChanged, filter, switchMap, catchError } from 'rxjs/operators';

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
    { headerName: 'CODIGO', field: 'codigo', width: 110, editable: false },
    { headerName: 'DESCRIPCION', field: 'descripcion', flex: 1, minWidth: 220, editable: false },
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
          val = isNaN(n) ? 0 : Math.max(0, this.clamp2(n));
        }

        const saldoDisponible = this.clamp2(this.getValorAPagarNumber() - (this.totalPagos - old));
        if (val > saldoDisponible) val = saldoDisponible;

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
      headerName: 'PORC.RET',
      field: 'porcRet',
      width: 140,
      editable: true,
      cellEditor: 'agTextCellEditor',
      suppressKeyboardEvent: (p) => {
        if (!p.editing) return false;
        const e = p.event as KeyboardEvent;

        const nav = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End', 'Enter', 'Escape'];
        if (nav.includes(e.key)) return false;

        const isDigit = e.key >= '0' && e.key <= '9';
        if (isDigit) return false;

        if (e.key === '.') {
          const el = e.target as HTMLInputElement;
          const curr = el?.value ?? String((p.data ?? {}).porcRet ?? '');
          return curr.includes('.');
        }
        return true;
      },
      valueSetter: (p: ValueSetterParams<any>) => {
        const old = Number(p.data.porcRet) || 0;

        let raw = String(p.newValue ?? '').replace(/[^\d.]/g, '');
        const firstDot = raw.indexOf('.');
        if (firstDot !== -1) {
          raw = raw.slice(0, firstDot + 1) + raw.slice(firstDot + 1).replace(/\./g, '');
        }
        raw = raw.replace(/^(\d+)(\.\d{0,2})?.*$/, (_m, int, dec) => int + (dec ?? ''));

        const val = raw === '' ? 0 : parseFloat(raw);
        p.data.porcRet = isNaN(val) ? 0 : val;

        p.api.refreshCells({
          columns: ['porcRet'],
          rowNodes: p.node ? [p.node] : undefined,
          force: true
        });

        return old !== p.data.porcRet;
      },
      valueFormatter: p => (p.value || p.value === 0) ? `${(+p.value).toFixed(2)} %` : '',
    },

    { headerName: 'BANCO', field: 'banco', width: 180, editable: true, suppressKeyboardEvent: this.suppressUpperAlnum(true), valueSetter: this.upperAlnumValueSetter('banco', true) },
    { headerName: 'No.CUENTA/TARJETA/FACTURA', field: 'numCuentaTarjetaFactura', width: 260, editable: true, suppressKeyboardEvent: this.suppressUpperAlnum(false), valueSetter: this.upperAlnumValueSetter('numCuentaTarjetaFactura', false) },
    { headerName: 'No.CHEQUE/#', field: 'numCheque', width: 160, editable: true, suppressKeyboardEvent: this.suppressUpperAlnum(false), valueSetter: this.upperAlnumValueSetter('numCheque', false) },
    { headerName: 'DUEÑO', field: 'dueno', width: 160, editable: true, suppressKeyboardEvent: this.suppressUpperAlnum(true), valueSetter: this.upperAlnumValueSetter('dueno', true) },
    { headerName: 'AUTORIZACION', field: 'autorizacion', width: 160, editable: true, suppressKeyboardEvent: this.suppressUpperAlnum(false), valueSetter: this.upperAlnumValueSetter('autorizacion', false) },

    {
      colId: 'acciones',
      headerName: '',
      pinned: 'left',
      width: 64,
      minWidth: 64,
      maxWidth: 64,
      suppressSizeToFit: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: any) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ag-btn-icon ag-btn-delete';
        btn.title = 'Eliminar';
        btn.setAttribute('aria-label', 'Eliminar forma de pago');
        btn.innerHTML = '<span class="material-icons">delete</span>';
        btn.addEventListener('click', () => {
          const removed = params.node.data;
          params.api.applyTransaction({ remove: [removed] });
          this.pagoRowData = (this.pagoRowData ?? []).filter((r: any) =>
            r !== removed && String(r.codigo ?? '') !== String(removed?.codigo ?? '')
          );
          this.pagoGridApi?.setGridOption('rowData', this.pagoRowData);
          this.recalcularTotal();
        });
        return btn;
      },
    }
  ];

  pagoColumnDefs: ColDef[] = [];
  pagoDefaultColDef: ColDef = { resizable: true, sortable: true, filter: true };
  saldoPendiente = 0;
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
    private pagoReportService: PagoReportService
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
    const vCtrl = this.formCliente.get('valorAPagar')!;
    vCtrl.addValidators(this.maxDeudaValidator);

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
    const refreshMax = () => vCtrl.updateValueAndValidity({ emitEvent: false });

    // Cargar facturas (ajusta origen real si aplica)
    this.cuentaCobrarService.getFacturasPendientesGrid(String(this.codcliO))
      .subscribe((rows: GridRow[]) => {
        this.rowData = rows;
        this.gridApi?.setGridOption('rowData', this.rowData);
        this.gridApi?.sizeColumnsToFit();
        this.recalcMontoDeuda();
        refreshMax();
        if (rows.length === 0) this.mostrarAlerta('El cliente no tiene detalle de facturas (No tiene facturas_pendientes)', 'info');
        this.focusValorAPagar();
      });

    // Autocomplete formas de pago
    const metodoCtrl = this.formPago.get('metodoPago') as FormControl;

    const formasActivas$ = this.formaPagoService.getPagedLite(1, 10).pipe(
      map(resp => resp?.type === 'Success' ? (resp.data?.items ?? []) : []),
      tap(list => console.log('[FP] paged items:', list)),
      catchError(err => {
        console.error('[FP] error getPagedLite:', err);
        return of([] as FormaPagoResponse[]);
      }),
      shareReplay(1)
    );

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
    this.unlockCliente();
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

  saldoPagos = 0;
  private recalcularTotal() {
    this.totalPagos = (this.pagoRowData ?? []).reduce((acc, r) => acc + (Number(r.monto) || 0), 0);
    this.saldoPendiente = Math.max(0, this.clamp2(this.getValorAPagarNumber() - this.totalPagos));
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
    const montoAuto = Math.max(0, this.getSaldo());

    if (pl === 'transfer') {
      this.pagoRowData.push({ codigo: '', descripcion: '', porcRet: null, banco: '', numCuentaTarjetaFactura: '', numCheque: '', monto: montoAuto });
    } else {
      this.pagoRowData.push({ numChequeFecha: '', nombreDueno: '', autorizacion: '', monto: montoAuto });
    }
    this.pagoGridApi?.setGridOption('rowData', this.pagoRowData);
    this.recalcularTotal();
  }
  private ultimoNumeroPago: string | null = null;
  registrarPago() {
    const plant = this.validateGridPlantilla();
    if (!plant.ok) {
      this.mostrarAlerta('Revisa las formas de pago (totales/retenciones).', 'error');
      console.warn('Errores plantilla:', plant.errors);
      return;
    }

    const facturas_a_pagar = this.buildFacturasAPagar();
    const formas_pago = this.buildFormasPago();

    if (facturas_a_pagar.length === 0) {
      this.mostrarAlerta('No hay pagos distribuidos en facturas.', 'info');
      this.salirPagos();
      return;
    }
    if (formas_pago.length === 0) {
      this.mostrarAlerta('Agrega al menos una forma de pago.', 'info');
      return;
    }

    const req = {
      cliente_codigo: this.formCliente.value.clienteCodigo ?? this.codcliO ?? 0,
      facturas_a_pagar,
      formas_pago,
      id_usuario_responsable: Number(this.usuarioActual?.id_usuario ?? 0),
      caja: String(this.formPago.value?.caja || '001'),
      observaciones: String(this.formCliente.value?.observacion || '').trim(),
    } as const;

    const chk = this.cuentaCobrarService.validatePago(req as any);
    if (!chk.ok) {
      this.mostrarAlerta(
        `La suma de formas de pago no coincide con las facturas. Diferencia: ${chk.diferencia.toFixed(2)}`,
        'error'
      );
      return;
    }

    const to2 = (n: number) => Math.round((n ?? 0) * 100) / 100;
    const totalFacturas = to2(req.facturas_a_pagar.reduce((a, b) => a + (b.monto_a_pagar || 0), 0));
    const totalFormas = to2(req.formas_pago.reduce((a, b) => a + (b.monto || 0), 0));
    const payloadPretty = JSON.stringify(req, null, 2);

    console.groupCollapsed('%c[PAGOS] Payload a enviar', 'color:#2563eb;font-weight:700;');
    console.log('Cliente:', req.cliente_codigo);
    console.log('Totales → facturas:', totalFacturas.toFixed(2), '| formas_pago:', totalFormas.toFixed(2));
    console.log('Detalle facturas_a_pagar:', req.facturas_a_pagar);
    console.log('Detalle formas_pago:', req.formas_pago);
    console.log('JSON pretty:\n', payloadPretty);
    console.groupEnd();


    console.groupCollapsed('%c[PAGOS] Payload a enviar', 'color:#2563eb;font-weight:700;');
    console.log('POST → /api/Pagos');
    console.log('Cliente:', req.cliente_codigo);
    console.log('facturas_a_pagar:', req.facturas_a_pagar);
    console.log('formas_pago:', req.formas_pago);
    console.log('JSON pretty:\n', payloadPretty);
    console.groupEnd();
    // dentro del subscribe de registrarPago()
    this.cuentaCobrarService.registrarPago(req).subscribe({
      next: async (numeroPago) => {
        this.mostrarAlerta(`Pago ${numeroPago} registrado correctamente.`, 'ok');
        this.ultimoNumeroPago = numeroPago;

        // Generar PDF inmediatamente
        try {
          await this.pagoReportService.generarPdfDesdeApi(numeroPago, {
            titulo: 'GS1 ECUADOR',
            logoUrl: 'assets/logo/GS1-logo.png'
          });
        } catch (e: any) {
          console.error(e);
          this.mostrarAlerta('Se registró el pago pero no se pudo generar el PDF.', 'warn');
        }

      },
      error: (err) => {
        console.error(err);
        this.mostrarAlerta('Error registrando el pago', 'error');
      }
    });

  }

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

    this.lockCliente();
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
    this.formCliente.get('valorAPagar')?.updateValueAndValidity({ emitEvent: false });
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
    if (t && t.closest('.ag-root')) return;
    e.preventDefault();
  }

  // ===== Autocomplete de Formas de Pago (Paso 2) =====
  displayFormaPago = (fp: FormaPagoResponse | string | null): string =>
    (typeof fp === 'string') ? fp : (fp?.descripcionPago ?? '');

  onFormaPagoSelected(event: MatAutocompleteSelectedEvent): void {
    const item = event.option.value as FormaPagoResponse;
    const pl = this.formPago.get('plantilla')?.value as 'transfer' | 'cheque';

    const codigo = String((item as any).codigo ?? (item as any).idFormaPago ?? '');
    const descripcion = (item as any).descripcionPago ?? (item as any).descripcion ?? '';
    if (!codigo && !descripcion) return;

    const yaExiste = this.pagoRowData.some(r => String(r.codigo ?? '') === codigo && !!codigo);
    if (!yaExiste) {
      const montoAuto = Math.max(0, this.getSaldo());

      if (pl === 'transfer') {
        this.pagoRowData.push({
          codigo, descripcion, porcRet: null, banco: '',
          numCuentaTarjetaFactura: '', numCheque: '', monto: montoAuto
        });
      } else {
        this.pagoRowData.push({
          codigo, descripcion, numChequeFecha: '', nombreDueno: '',
          autorizacion: '', monto: montoAuto
        });
      }

      this.pagoGridApi?.setGridOption('rowData', this.pagoRowData);
      this.recalcularTotal();
    }

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

  // Total de deuda tomado del grid
  getMontoDeudaNumber(): number {
    return (this.rowData ?? []).reduce((acc, r) => acc + (Number(r.monto) || 0), 0);
  }

  // Validador: valorAPagar <= monto deuda
  maxDeudaValidator = (ctrl: import('@angular/forms').AbstractControl) => {
    const raw = String(ctrl.value ?? '').replace(/[^0-9.]/g, '');
    const n = parseFloat(raw);
    const max = this.clamp2(this.getMontoDeudaNumber());
    if (isNaN(n)) return null;
    return n <= max ? null : { maxDeuda: { max, actual: n } };
  };

  onValorAPagarInput(e: Event) {
    if (this.valorAPagarBloqueado) return;

    this.sanearDecimal(e);

    const max = this.clamp2(this.getMontoDeudaNumber());
    const ctrl = this.formCliente.get('valorAPagar')!;
    const n = this.getValorAPagarNumber();

    if (n > max) {
      this.mostrarAlerta(`El Valor a Pagar no puede superar el total (${this.usd(max)}).`, 'info');
      ctrl.setValue(max.toFixed(2), { emitEvent: false });
    }

    this.rowData = (this.rowData || []).map(r => {
      const monto = Number(r.monto) || 0;
      return { ...r, pago: 0, estado: this.getEstado(0, monto) };
    });
    this.gridApi?.setGridOption('rowData', this.rowData);
    this.invalidRows.clear();
    this.gridApi?.refreshCells({ force: true });

    this.recalcularTotal();
  }

  clienteBloqueado = false;

  private lockCliente() {
    this.clienteBloqueado = true;
    this.clienteOrigenControl.disable({ emitEvent: false });
    this.autoClienteTrigger?.closePanel();
    this.clienteInputRef?.nativeElement.blur();
  }

  private unlockCliente() {
    this.clienteBloqueado = false;
    this.clienteOrigenControl.enable({ emitEvent: false });
  }

  private getSaldo(): number {
    return this.clamp2(this.getValorAPagarNumber() - this.totalPagos);
  }

  // ===== Helpers de normalizado =====
  private sanitizeUpperAlnum(raw: any, allowSpace = true): string {
    let s = String(raw ?? '').toUpperCase();
    const re = allowSpace ? /[^A-Z0-9 ]/g : /[^A-Z0-9]/g;
    return s.replace(re, '');
  }

  private suppressUpperAlnum(allowSpace = true) {
    return (p: any) => {
      if (!p.editing) return false;
      const e = p.event as KeyboardEvent;

      const nav = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End', 'Enter', 'Escape'];
      if (nav.includes(e.key)) return false;

      const isDigit = e.key >= '0' && e.key <= '9';
      const isLetter = (/^[a-z]$/i).test(e.key);
      const isSpace = e.key === ' ';

      if (isDigit || isLetter) return false;
      if (allowSpace && isSpace) return false;

      return true;
    };
  }

  private upperAlnumValueSetter(field: string, allowSpace = true) {
    return (p: any) => {
      const oldVal = String(p.data?.[field] ?? '');
      const cleaned = this.sanitizeUpperAlnum(p.newValue, allowSpace);
      p.data[field] = cleaned;
      p.api.refreshCells({
        columns: [field],
        rowNodes: p.node ? [p.node] : undefined,
        force: true
      });
      return cleaned !== oldVal;
    };
  }

  // ===== Helpers de mapeo =====
  // Facturas con pago > 0 (INCLUYE 'tipo')
  private buildFacturasAPagar(): Array<{ numero_factura: string; tipo_documento: string; tipo: string; monto_a_pagar: number }> {
    const rows = (this.rowData ?? []).filter(r => (Number(r.pago) || 0) > 0);

    return rows.map(r => {
      const numero_factura = (r.numero_factura ?? String(r.numero || '')).replace(/^F\s*-\s*/i, '');
      const tipo_documento =
        (r.tipo_documento?.toString() || '')
        || (/NC|ND|VT|FACT/i.test(r.descripcion) ? r.descripcion.trim().toUpperCase() : '')
        || 'FACTURA';

      return {
        numero_factura,
        tipo_documento,
        tipo: r.estado === 'CANCELADO' ? 'P'
          : r.estado === 'ABONADO' ? 'A'
            : r.estado,
        monto_a_pagar: this.clamp2(Number(r.pago) || 0),
      };
    });
  }

  // Formas de pago desde grilla (transfer/cheque)
  private buildFormasPago(): Array<{
    id_forma_pago: number;
    monto: number;
    referencia?: string;
    autorizacion?: string;
    banco?: string;
    numero_documento?: string;
  }> {
    const rows = this.pagoRowData ?? [];

    return rows
      .filter(r => (Number(r.monto) || 0) > 0)
      .map(r => ({
        id_forma_pago: Number(r.codigo || 0),
        monto: this.clamp2(Number(r.monto) || 0),
        referencia: String(r.numCuentaTarjetaFactura ?? '').trim(),
        autorizacion: String(r.autorizacion ?? '').trim(),
        banco: String(r.banco ?? '').trim(),
        numero_documento: String(r.numCheque ?? '').trim(),
      }));
  }
}
