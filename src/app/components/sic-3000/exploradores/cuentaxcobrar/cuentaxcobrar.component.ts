import { Component, OnInit, ViewChild, ElementRef, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteTrigger, MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ClienteService, ClienteIndividual } from 'src/app/services/cliente.service';
import { UsuarioService } from 'src/app/services/usuario.service';
import { CuentaCobrarService, GridRow } from 'src/app/services/cuenta-cobrar.service';
import { PagoReportService } from 'src/app/services/pago-report.service';
import { ClienteSummary } from 'src/app/interfaces/responses/cliente-summary-response';
import { FormaPagoService, FormaPagoResponse } from 'src/app/services/forma-pago.service';
import { finalize, map, tap } from 'rxjs/operators';

// rxjs
import { combineLatest, Observable, of } from 'rxjs';

// rxjs/operators
import {
  startWith,
  shareReplay,
  debounceTime,
  distinctUntilChanged,
  filter,
  switchMap,
  catchError
} from 'rxjs/operators';

import {
  ColDef,
  GridApi,
  GridReadyEvent,
  ValueSetterParams,
  GetRowIdParams
} from 'ag-grid-community';
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
import { ClienteSeleccionadoService } from 'src/app/services/cliente-seleccionado.service';
import { Cliente } from 'src/app/interfaces/cliente';

// ==== exportaciones Excel / PDF ====
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-cuentaxcobrar',
  standalone: true,
  templateUrl: './cuentaxcobrar.component.html',
  styleUrl: './cuentaxcobrar.component.css',
  encapsulation: ViewEncapsulation.None,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    AgGridModule,
    CommonModule,
    HttpClientModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatOptionModule,
    MatSelectModule,
    MatButtonModule,
    MatMenuModule,
    MatTableModule,
    MatPaginatorModule,
    MatSnackBarModule,
    MatIconModule,
    MatDialogModule,
    MatTooltipModule
  ]
})
export class CuentaxcobrarComponent implements OnInit {

  // ===== estado general =====
  step = 1;
  hoy = new Date();
  errorMessage = '';
  opcionesImpresionVisibles = false;

  formCliente!: FormGroup;
  formPago!: FormGroup;
  clienteE!: ClienteIndividual;
  clienteSeleccionado: Cliente | any | null = null; // puede venir de ClienteSummary
  usuarioActual = this.usuarioService.getUsuarioActual();

  // Clientes (paso 1)
  @ViewChild(MatAutocompleteTrigger) autoClienteTrigger!: MatAutocompleteTrigger;
  @ViewChild('clienteInputRef') clienteInputRef!: ElementRef<HTMLInputElement>;

  // Valor a pagar
  @ViewChild('valorAPagarRef') valorAPagarRef!: ElementRef<HTMLInputElement>;

  // Autocomplete de formas de pago (paso 2)
  @ViewChild('pagoInputRef') pagoInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('autoPagoTrigger', { read: MatAutocompleteTrigger })
  autoPagoTrigger!: MatAutocompleteTrigger;

  mostrarNombreCliente = (cliente: ClienteSummary | string | null): string =>
    (cliente && typeof cliente === 'object')
      ? (cliente.nomcli ?? '')
      : (cliente ?? '') as string;

  // El control viene del form
  get clienteOrigenControl(): FormControl {
    return this.formCliente.get('clienteOrigenControl') as FormControl;
  }

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
          this.pagosEditadosMap.set(p.data.numero, {
            numero: p.data.numero,
            pago: val,
            estado: p.data.estado
          });
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
    {
      headerName: 'Vence',
      field: 'vence',
      width: 120,
      cellClass: p => (p.data?.valueVencido ? 'text-danger fw-bold' : '')
    },
    { headerName: 'Descripción', field: 'descripcion', flex: 1, minWidth: 220 },
    { headerName: 'Ord', field: 'ord', width: 80, type: 'rightAligned', hide: true },
    {
      headerName: 'Detalle',
      field: 'detalles',
      flex: 1,tooltipField:'detalles',
      minWidth: 220,
      valueGetter: p =>
        Array.isArray(p.data?.detalles) && p.data.detalles.length
          ? p.data.detalles
              .map((s: any) => String(s ?? '').trim())
              .filter(Boolean)
              .join(' • ')
          : 'SIN DETALLE'
    }
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

        const nav = [
          'Backspace',
          'Delete',
          'ArrowLeft',
          'ArrowRight',
          'Tab',
          'Home',
          'End',
          'Enter',
          'Escape'
        ];
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

    {
      headerName: 'BANCO',
      field: 'banco',
      width: 180,
      editable: true,
      suppressKeyboardEvent: this.suppressUpperAlnum(true),
      valueSetter: this.upperAlnumValueSetter('banco', true)
    },
    {
      headerName: 'No.CUENTA/TARJETA/FACTURA',
      field: 'numCuentaTarjetaFactura',
      width: 260,
      editable: true,
      suppressKeyboardEvent: this.suppressUpperAlnum(false),
      valueSetter: this.upperAlnumValueSetter('numCuentaTarjetaFactura', false),
      cellClassRules: {
        'cell-required': (p: any) =>
          this.requiereReferencia(p.data) &&
          !String(p.data?.numCuentaTarjetaFactura ?? '').trim()
      },
      tooltipValueGetter: (p: any) =>
        (this.requiereReferencia(p.data) &&
          !String(p.data?.numCuentaTarjetaFactura ?? '').trim())
          ? 'Debe ingresar el NÚMERO DE RETENCIÓN aquí'
          : '',
    },

    {
      headerName: 'No.CHEQUE/#',
      field: 'numCheque',
      width: 160,
      editable: true,
      suppressKeyboardEvent: this.suppressUpperAlnum(false),
      valueSetter: this.upperAlnumValueSetter('numCheque', false)
    },
    {
      headerName: 'DUEÑO',
      field: 'dueno',
      width: 160,
      editable: true,
      suppressKeyboardEvent: this.suppressUpperAlnum(true),
      valueSetter: this.upperAlnumValueSetter('dueno', true)
    },
    {
      headerName: 'AUTORIZACION',
      field: 'autorizacion',
      width: 160,
      editable: true,
      suppressKeyboardEvent: this.suppressUpperAlnum(false),
      valueSetter: this.upperAlnumValueSetter('autorizacion', false)
    },

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
    private pagoReportService: PagoReportService,
    private clienteSeleccionadoService: ClienteSeleccionadoService,
  ) { }

  // ===== getters de totales para exportar =====
  get totalMonto(): number {
    return (this.rowData ?? []).reduce((acc, r: any) => acc + (Number(r.monto) || 0), 0);
  }
  get totalPago(): number {
    return (this.rowData ?? []).reduce((acc, r: any) => acc + (Number(r.pago) || 0), 0);
  }
  get totalSaldo(): number {
    return this.totalMonto - this.totalPago;
  }

  ngOnInit(): void {
    this.usuarioActual = this.usuarioService.getUsuarioActual();

    this.formCliente = this.fb.group({
      noPago: [''],
      fechaPago: [this.hoyISO(), Validators.required],
      clienteOrigenControl: [null, Validators.required],
      clienteCodigo: [0],
      responsable: [this.usuarioActual?.nombre_usuario || ''],
      ruc: [''],
      valorAPagar: [],
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

    this.activarPlantilla('transfer');

    // búsqueda por cliente
    this.cargarCliente();

    // cliente que venga de otra pantalla
    //this.cargarClienteInv();

    // Autocomplete de formas de pago
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
          (typeof v === 'string'
            ? v
            : (v?.descripcionPago ?? v?.descripcion_pago ?? '')
          ).trim().toLowerCase()
        ),
        tap(() => this.isLoadingFormas = true)
      ),
      formasActivas$
    ]).pipe(
      map(([term, lista]: [string, FormaPagoResponse[]]) =>
        !term ? lista : lista.filter(fp => (fp.descripcionPago ?? '').toLowerCase().includes(term))
      ),
      tap(r => console.log('[FP] render ->', r)),
      finalize(() => this.isLoadingFormas = false),
      catchError(err => {
        console.error('[FP] stream error:', err);
        this.isLoadingFormas = false;
        return of([] as FormaPagoResponse[]);
      })
    );
  }

  // ===== Utils =====
  usd(v: number) {
    if (v == null) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
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

    const sumaPagos = this.clamp2(this.sumPagos());
    const deudaTotal = this.clamp2(this.getMontoDeudaNumber());
    const tieneValor = this.hasValorAPagar();
    const valorTarget = tieneValor ? this.clamp2(this.getValorAPagarNumber()) : deudaTotal;

    if (tieneValor) {
      if (Math.abs(sumaPagos - valorTarget) >= 0.005) {
        errors.push(`La suma de pagos (${this.usd(sumaPagos)}) debe ser exactamente ${this.usd(valorTarget)}.`);
      }
    } else {
      if (sumaPagos <= 0) errors.push('Distribuye un monto en al menos una factura.');
      if (sumaPagos > deudaTotal) {
        errors.push(`La suma de pagos (${this.usd(sumaPagos)}) no puede superar la deuda (${this.usd(deudaTotal)}).`);
      }
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

  // ===== Cancelar / limpiar todo =====
  onCancel(): void {
    this.cancelar();
  }

  cancelar(): void {
    console.log('Cancelar');

    // 1) Limpiar el grid
    this.rowData = [];

    if (this.gridApi) {
      this.gridApi.setGridOption('rowData', []);
      this.gridApi.deselectAll();
    }

    // 2) Limpiar selección de cliente / autocomplete
    this.clienteSeleccionado = null;
    this.codcliO = 0;
    this.clientesOrigenFiltrados = [];

    this.clienteOrigenControl.reset(null);
    this.clienteOrigenControl.markAsPristine();
    this.clienteOrigenControl.markAsUntouched();

    this.formCliente.patchValue({
      clienteCodigo: 0,
      ruc: '',
      montoDeuda: this.usd(0),
      valorAPagar: '',
      observacion: ''
    }, { emitEvent: false });

    // 3) Otros flags/mensajes
    this.errorMessage = '';
    this.opcionesImpresionVisibles = false;
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
    const total = this.clamp2(
      this.pagoRowData.reduce((s: number, r: any) => s + (Number(r.monto) || 0), 0)
    );
    const valorAPagar = this.clamp2(this.getValorAPagarNumber());

    if (Math.abs(total - valorAPagar) >= 0.005) {
      errors.push(`Total de formas de pago (${this.usd(total)}) debe ser ${this.usd(valorAPagar)}.`);
    }

    this.pagoRowData.forEach((r: any, i: number) => {
      const m = Number(r.monto) || 0;
      if (!Number.isFinite(m)) errors.push(`Línea ${i + 1}: monto inválido.`);
      if (m < 0) errors.push(`Línea ${i + 1}: monto negativo.`);

      if (this.requiereReferencia(r) && !String(r.numCuentaTarjetaFactura ?? '').trim()) {
        const etiqueta = r.descripcion || r.codigo || `Línea ${i + 1}`;
        errors.push(`Línea ${i + 1} (${etiqueta}): ingrese el NÚMERO DE RETENCIÓN en "No.CUENTA/TARJETA/FACTURA".`);
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
      this.pagoRowData.push({
        codigo: '',
        descripcion: '',
        porcRet: null,
        banco: '',
        numCuentaTarjetaFactura: '',
        numCheque: '',
        monto: montoAuto
      });
    } else {
      this.pagoRowData.push({
        numChequeFecha: '',
        nombreDueno: '',
        autorizacion: '',
        monto: montoAuto
      });
    }
    this.pagoGridApi?.setGridOption('rowData', this.pagoRowData);
    this.recalcularTotal();
  }

  private ultimoNumeroPago: string | null = null;

  // ===== Estado del botón =====
  isSubmitting = false;
  registroCompletado = false;

  registrarPago() {
    if (this.isSubmitting || this.registroCompletado) return;

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

    this.isSubmitting = true;

    this.cuentaCobrarService.registrarPago(req)
      .pipe(finalize(() => {
        this.isSubmitting = false;
      }))
      .subscribe({
        next: async (numeroPago) => {
          this.mostrarAlerta(`Pago ${numeroPago} registrado correctamente.`, 'ok');
          this.ultimoNumeroPago = numeroPago;
          this.registroCompletado = true;

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
    this.formPago.reset({
      plantilla: 'transfer',
      valor: '',
      observacion: '',
      metodoPago: ''
    });
    this.activarPlantilla('transfer');
    this.isSubmitting = false;
    this.registroCompletado = false;
  }

  // ===== Autocomplete clientes =====
  seleccionarClienteOrigen(cliente: ClienteSummary): void {
    if (!cliente?.clientes_codigo) return;

    this.codcliO = cliente.clientes_codigo;
    this.clienteSeleccionado = cliente; // usado para exportar

    this.formCliente.patchValue({
      clienteCodigo: this.codcliO,
      ruc: this.getRucCliente(cliente)
    });

    this.clienteOrigenControl.setValue(cliente, { emitEvent: false });

    this.cuentaCobrarService.getFacturasPendientesGrid(String(this.codcliO))
      .subscribe((rows: GridRow[]) => {
        this.rowData = rows;
        this.gridApi?.setGridOption('rowData', this.rowData);
        this.gridApi?.sizeColumnsToFit();
        this.recalcMontoDeuda();
        if (rows.length === 0) {
          this.mostrarAlerta('El cliente no tiene detalle de facturas (No tiene facturas_pendientes)', 'info');
        }
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
        return q
          ? this.clienteService.getClientesSummary(q).pipe(
              catchError(() => of({ data: [] }))
            )
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
      panelClass: tipo === 'error'
        ? ['snack-error']
        : tipo === 'ok'
          ? ['snack-ok']
          : ['snack-info']
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

      const nav = [
        'Backspace',
        'Delete',
        'ArrowLeft',
        'ArrowRight',
        'Tab',
        'Home',
        'End',
        'Enter',
        'Escape'
      ];
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
  private buildFacturasAPagar(): Array<{
    numero_factura: string;
    tipo_documento: string;
    tipo: string;
    monto_a_pagar: number;
  }> {
    const rows = (this.rowData ?? []).filter(r => (Number(r.pago) || 0) > 0);

    return rows.map(r => {
      const numero_factura = (r.numero_factura ?? String(r.numero || '')).replace(/^F\s*-\s*/i, '');
      const tipo_documento =
        (r.tipo_documento?.toString() || '') ||
        (/NC|ND|VT|FACT/i.test(r.descripcion)
          ? r.descripcion.trim().toUpperCase()
          : '') ||
        'FACTURA';

      return {
        numero_factura,
        tipo_documento,
        tipo: r.estado === 'CANCELADO'
          ? 'P'
          : r.estado === 'ABONADO'
            ? 'A'
            : r.estado,
        monto_a_pagar: this.clamp2(Number(r.pago) || 0),
      };
    });
  }

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

  private readonly formasRequierenRetencion = new Set<number>([12, 13]);

  private requiereReferencia(row: any): boolean {
    const cod = Number(row?.codigo) || 0;
    if (this.formasRequierenRetencion.has(cod)) return true;

    const desc = (row?.descripcion ?? '').toString().toUpperCase();
    return /RETENCI(Ó|O)N/.test(desc);
  }

  cargarClientePorId(id: number): void {
    this.clienteService.getClienteById(id).subscribe({
      next: (cliente) => {
        this.clienteE = cliente;
      },
      error: (err) => {
        console.error('Error al obtener cliente:', err);
      }
    });
  }

  cargarClienteInv(): void {
    const cliente = this.clienteSeleccionadoService.obtenerClienteActual();
    console.log('[ClienteSeleccionadoService] actual →', cliente);

    if (cliente) {
      this.clienteSeleccionado = cliente;
      this.applyClienteSeleccion(cliente);
    } else {
      this.unlockCliente();
    }
  }

  private getCodigoCliente(c: any): number {
    return Number(
      c?.clientes_codigo ??
      c?.cliente_codigo ??
      c?.codigoCliente ??
      c?.id ??
      0
    );
  }

  private getNombreCliente(c: any): string {
    return String(
      c?.nomcli ??
      c?.nombre ??
      c?.cliente ??
      c?.razon_social ??
      ''
    ).trim();
  }

  private applyClienteSeleccion(c: any): void {
    const codigo = this.getCodigoCliente(c);
    const nombre = this.getNombreCliente(c);
    if (!codigo) return;

    this.codcliO = codigo;
    this.clienteSeleccionado = c;

    this.formCliente.patchValue(
      {
        clienteCodigo: codigo,
        ruc: this.getRucCliente(c)
      },
      { emitEvent: false }
    );

    this.clienteOrigenControl.setValue(nombre || c, { emitEvent: false });

    this.cuentaCobrarService.getFacturasPendientesGrid(String(codigo))
      .subscribe((rows: GridRow[]) => {
        this.rowData = rows;

        if (!this.gridApi) {
          setTimeout(() => {
            this.gridApi?.setGridOption('rowData', this.rowData);
            this.gridApi?.sizeColumnsToFit();
          }, 0);
        } else {
          this.gridApi.setGridOption('rowData', this.rowData);
          this.gridApi.sizeColumnsToFit();
        }

        this.recalcMontoDeuda();

        if (rows.length === 0) {
          this.mostrarAlerta('El cliente no tiene detalle de facturas (No tiene facturas_pendientes)', 'info');
        }
        this.focusValorAPagar();
      });

    this.lockCliente();
  }

  private hasValorAPagar(): boolean {
    const raw = String(this.formCliente.get('valorAPagar')?.value ?? '').replace(/[^0-9.]/g, '');
    return raw !== '' && !isNaN(parseFloat(raw));
  }

  private getRucCliente(c: any): string {
    return String(
      c?.ruc ??
      c?.cedruc ??
      c?.ruc_ci ??
      c?.identificacion ??
      c?.rucCliente ??
      ''
    ).trim();
  }

  // ============== EXPORTAR A EXCEL ==============
  async exportarExcel(): Promise<void> {
    if (!this.rowData || this.rowData.length === 0) {
      alert('No hay información para exportar.');
      return;
    }

    const cli = this.clienteSeleccionado;
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('CuentasXCobrar');

    ws.columns = [
      { header: 'No. Factura', key: 'numero', width: 18 },
      { header: 'Fecha', key: 'fecha', width: 12 },
      { header: 'Monto', key: 'monto', width: 14 },
      { header: 'Pago', key: 'pago', width: 14 },
      { header: 'Estado', key: 'estado', width: 16 },
      { header: 'Vence', key: 'vence', width: 12 },
      { header: 'Descripción', key: 'descripcion', width: 40 },
      { header: 'Detalle', key: 'detalles', width: 50, },
    ];

    const allCols = [1, 2, 3, 4, 5, 6, 7, 8];
    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    };

    let currentRow = 1;
    const nextRow = () => ws.getRow(currentRow++);

    // TÍTULO
    const tituloRow = nextRow();
    tituloRow.getCell(1).value = 'EXPLORADOR CUENTAS POR COBRAR';
    ws.mergeCells(tituloRow.number, 1, tituloRow.number, 8);
    tituloRow.height = 22;
    tituloRow.eachCell(cell => {
      cell.font = { bold: true, size: 16, color: { argb: 'FF002C6C' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    currentRow++;

    // DATOS CLIENTE
    const nomCli = cli ? this.getNombreCliente(cli) : '';
    const rucCli = cli ? this.getRucCliente(cli) : '';

    if (cli) {
      const rowCli = nextRow();
      rowCli.getCell(1).value = 'Cliente:';
      rowCli.getCell(2).value = nomCli;
      ws.mergeCells(rowCli.number, 2, rowCli.number, 8);

      const rowRuc = nextRow();
      rowRuc.getCell(1).value = 'Ruc:';
      rowRuc.getCell(2).value = rucCli;
      ws.mergeCells(rowRuc.number, 2, rowRuc.number, 8);

      const rowFec = nextRow();
      rowFec.getCell(1).value = 'Fecha del reporte:';
      rowFec.getCell(2).value = this.hoy.toLocaleDateString('es-EC');
      ws.mergeCells(rowFec.number, 2, rowFec.number, 8);

      [rowCli, rowRuc, rowFec].forEach(r => {
        r.eachCell((cell, col) => {
          if (col === 1) {
            cell.font = { bold: true, size: 11, color: { argb: 'FF002C6C' } };
          } else {
            cell.font = { size: 11 };
          }
        });
      });
    } else {
      const rowFec = nextRow();
      rowFec.getCell(1).value = 'Fecha del reporte:';
      rowFec.getCell(2).value = this.hoy.toLocaleDateString('es-EC');
      ws.mergeCells(rowFec.number, 2, rowFec.number, 8);
    }

    currentRow++;

    // CABECERA TABLA
    const headerRow = nextRow();
    const headerIdx = headerRow.number;
    headerRow.values = [
      'No. Factura',
      'Fecha',
      'Monto',
      'Pago',
      'Estado',
      'Vence',
      'Descripción',
      'Detalle'
    ];

    headerRow.height = 18;
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1D789F' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = thinBorder;
    });

    const firstDetailRow = headerIdx + 1;

    // DETALLE
    this.rowData.forEach(r => {
      const row = nextRow();
      const detalle = Array.isArray((r as any).detalles)
        ? (r as any).detalles.map((s: any) => String(s ?? '').trim()).filter(Boolean).join(' • ')
        : ((r as any).detalles ?? '');
      row.values = [
        (r as any).numero,
        (r as any).fecha,
        (r as any).monto,
        (r as any).pago,
        (r as any).estado,
        (r as any).vence,
        (r as any).descripcion,
        detalle
      ];
    });

    const lastDetailRow = currentRow - 1;

    // ZEBRA, BORDES, FORMATOS
    for (let i = firstDetailRow; i <= lastDetailRow; i++) {
      const row = ws.getRow(i);
      const isEven = (i - firstDetailRow) % 2 === 1;

      allCols.forEach(col => {
        const cell = row.getCell(col);
        cell.border = thinBorder;

        if (isEven) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF7F9FC' }
          };
        }

        if ([3, 4].includes(col) && typeof cell.value === 'number') {
          cell.numFmt = '#,##0.00';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }

        if (col >= 7) {
          cell.alignment = {
            horizontal: 'left',
            vertical: 'top',
            wrapText: true
          };
        }
      });
    }

    // TOTALES
    currentRow++;
    const totTitleRow = nextRow();
    const totTitleIdx = totTitleRow.number;
    totTitleRow.getCell(1).value = 'RESUMEN';
    ws.mergeCells(totTitleIdx, 1, totTitleIdx, 2);
    totTitleRow.eachCell(cell => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE8EDF5' }
      };
      cell.border = thinBorder;
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
    });

    const rowTotMonto = nextRow();
    rowTotMonto.getCell(1).value = 'Total Monto:';
    rowTotMonto.getCell(2).value = this.totalMonto;

    const rowTotPago = nextRow();
    rowTotPago.getCell(1).value = 'Total Pago:';
    rowTotPago.getCell(2).value = this.totalPago;

    const rowTotSaldo = nextRow();
    rowTotSaldo.getCell(1).value = 'Saldo:';
    rowTotSaldo.getCell(2).value = this.totalSaldo;

    [rowTotMonto, rowTotPago, rowTotSaldo].forEach(r => {
      r.getCell(1).font = { bold: true };
      r.getCell(2).font = { bold: true };
      r.getCell(1).border = thinBorder;
      r.getCell(2).border = thinBorder;
      r.getCell(2).numFmt = '#,##0.00';
      r.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
      r.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };
    });

    const codigoCli = cli ? this.getCodigoCliente(cli) : '';
    const nombreArchivo =
      `explorador_cxc_${codigoCli}_${this.hoy.toISOString().substring(0, 10)}.xlsx`;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    saveAs(blob, nombreArchivo);

    this.opcionesImpresionVisibles = false;
  }

  // helper para logo en PDF (opcional)
  private async cargarLogoBase64(): Promise<string | null> {
    try {
      const resp = await fetch('assets/logo/GS1-logo.png');
      if (!resp.ok) return null;
      const blob = await resp.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = err => reject(err);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  // ============== EXPORTAR A PDF ==============
  async exportarPdf(): Promise<void> {
    if (!this.rowData || this.rowData.length === 0) {
      alert('No hay información para exportar.');
      return;
    }

    const cli = this.clienteSeleccionado;
    const doc = new jsPDF('l', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginLeft = 40;
    let cursorY = 40;

    // LOGO
    const logoDataUrl = await this.cargarLogoBase64();
    const logoHeight = 50;
    const logoWidth = 120;

    if (logoDataUrl) {
      doc.addImage(logoDataUrl, 'PNG', marginLeft, cursorY, logoWidth, logoHeight);
    }

    // TÍTULO
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(0, 44, 108);
    doc.text('EXPLORADOR CUENTAS POR COBRAR', pageWidth / 2, cursorY + 30, { align: 'center' });

    cursorY += logoHeight + 25;

    // DATOS CLIENTE
    const nomCli = cli ? this.getNombreCliente(cli) : '';
    const rucCli = cli ? this.getRucCliente(cli) : '';

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');

    if (cli) {
      doc.text(`Cliente: ${nomCli}`, marginLeft, cursorY);
      cursorY += 16;
      doc.text(`Ruc: ${rucCli}`, marginLeft, cursorY);
      cursorY += 16;
    }

    doc.text(`Fecha del reporte: ${this.hoy.toLocaleDateString('es-EC')}`, marginLeft, cursorY);
    cursorY += 24;

    // Línea separadora
    doc.setDrawColor(200);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, cursorY, pageWidth - marginLeft, cursorY);
    cursorY += 10;

    // TABLA
    const body = this.rowData.map((r: any) => {
      const detalle = Array.isArray(r.detalles)
        ? r.detalles.map((s: any) => String(s ?? '').trim()).filter(Boolean).join(' • ')
        : (r.detalles ?? '');
      return [
        r.numero,
        r.fecha,
        r.monto != null ? r.monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '',
        r.pago != null ? r.pago.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '',
        r.estado || '',
        r.vence || '',
        r.descripcion || '',
        detalle || ''
      ];
    });

    autoTable(doc, {
      startY: cursorY,
      head: [[
        'No. Factura',
        'Fecha',
        'Monto',
        'Pago',
        'Estado',
        'Vence',
        'Descripción',
        'Detalle'
      ]],
      body,
      styles: {
        fontSize: 8,
        cellPadding: 3,
        halign: 'left'
      },
      headStyles: {
        fillColor: [29, 120, 159],
        textColor: [255, 255, 255],
        halign: 'center'
      },
      alternateRowStyles: {
        fillColor: [247, 249, 252]
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 60 },
        2: { cellWidth: 70, halign: 'right' },
        3: { cellWidth: 70, halign: 'right' },
        4: { cellWidth: 80 },
        5: { cellWidth: 60 },
        6: { cellWidth: 140 },
        7: { cellWidth: 150 }
      },
      margin: { left: marginLeft, right: marginLeft },
      didDrawPage: (_data: any) => {
        const str = `Página ${doc.getNumberOfPages()}`;
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text(
          str,
          pageWidth - marginLeft,
          pageHeight - 10,
          { align: 'right' }
        );
      }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || cursorY;

    // TOTALES
    let yTotales = finalY + 20;

    if (yTotales + 60 > pageHeight) {
      doc.addPage('l');
      yTotales = 60;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('RESUMEN', marginLeft, yTotales);
    yTotales += 14;

    const labelX = pageWidth - 200;
    const valueX = pageWidth - marginLeft;

    const formatNum = (v: number) =>
      v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    doc.setFontSize(10);

    doc.text('Total Monto:', labelX, yTotales);
    doc.text(formatNum(this.totalMonto), valueX, yTotales, { align: 'right' });

    yTotales += 14;
    doc.text('Total Pago:', labelX, yTotales);
    doc.text(formatNum(this.totalPago), valueX, yTotales, { align: 'right' });

    yTotales += 14;
    doc.text('Saldo:', labelX, yTotales);
    doc.text(formatNum(this.totalSaldo), valueX, yTotales, { align: 'right' });

    const codigoCli = cli ? this.getCodigoCliente(cli) : '';
    const nombreArchivo =
      `explorador_cxc_${codigoCli}_${this.hoy.toISOString().substring(0, 10)}.pdf`;
    doc.save(nombreArchivo);

    this.opcionesImpresionVisibles = false;
  }

}
