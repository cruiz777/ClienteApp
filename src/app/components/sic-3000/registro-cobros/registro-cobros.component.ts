import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteTrigger, MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ClienteService } from 'src/app/services/cliente.service';
import { UsuarioService } from 'src/app/services/usuario.service';
import { CuentaCobrarService, GridRow } from 'src/app/services/cuenta-cobrar.service';
import { ClienteSummary } from 'src/app/interfaces/responses/cliente-summary-response';
import { of } from 'rxjs';
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
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ViewEncapsulation } from '@angular/core';
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
  @ViewChild(MatAutocompleteTrigger) autoClienteTrigger!: MatAutocompleteTrigger;
  @ViewChild('clienteInputRef') clienteInputRef!: ElementRef<HTMLInputElement>;

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

  // tracking de errores por fila
  private invalidRows = new Set<string>();
  private gridTouched = false;

  // getRowId estable (usado para invalidRows)
  getRowId = (p: GetRowIdParams) => {
    const d = p.data as any;
    // Usa campos estables; ajusta si tu backend garantiza otro identificador
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
        const allowedNav = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
        if (allowedNav.includes(e.key)) return false;
        const isDigit = e.key >= '0' && e.key <= '9';
        const isDot = e.key === '.';
        const target = e.target as HTMLInputElement | null;
        const current = target?.value ?? String(p.data?.pago ?? '');
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
        const totalActual = this.sumPagos(); // incluye old
        const totalPropuesto = this.clamp2(totalActual - old + val);
        if (totalPropuesto > valorAPagar) {
          const maxValPermitido = this.clamp2(valorAPagar - (totalActual - old));
          this.mostrarAlerta('La suma de pagos no puede superar el Valor a Pagar.', 'info');
          val = Math.max(0, maxValPermitido);
        }

        p.data.pago = val;
        p.data.estado = this.getEstado(val, montoFactura);

        // revalidación de fila
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

      // pinta y muestra tooltip cuando la fila es inválida
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
    { headerName: 'Ord', field: 'ord', width: 80, type: 'rightAligned' },
  ];

  defaultColDef: ColDef = { resizable: true, sortable: true, filter: true };
  rowData: GridRow[] = [];

  // ===== GRID PAGOS (plantillas) =====
  private pagoGridApi!: GridApi;
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
  ];
  pagoColumnDefsCheque: ColDef[] = [
    { headerName: 'No.CHEQUE/FECHA CADUCIDAD', field: 'numChequeFecha', width: 260, editable: true },
    { headerName: 'NOMBRE DUEÑO', field: 'nombreDueno', flex: 1, minWidth: 220, editable: true },
    { headerName: 'AUTORIZACION', field: 'autorizacion', width: 160, editable: true },
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
  ];
  pagoColumnDefs: ColDef[] = [];
  pagoDefaultColDef: ColDef = { resizable: true, sortable: true, filter: true };
  pagoRowDataTransfer: any[] = [
    { codigo: '102', descripcion: 'TRANSFERENCIA PICHINCHA', porcRet: null, banco: '', numCuentaTarjetaFactura: '', numCheque: '', monto: 0 },
    { codigo: '12', descripcion: 'RETENCION EN LA FUENTE', porcRet: 0, banco: '', numCuentaTarjetaFactura: '', numCheque: '', monto: 0 },
    { codigo: '13', descripcion: 'RETENCION DEL IVA', porcRet: 0, banco: '', numCuentaTarjetaFactura: '', numCheque: '', monto: 0 },
  ];
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
      Validators.min(0.01)                 // ⬅️ > 0
    ]
  ],
      montoDeuda: [this.usd(0)],
      observacion: [''],
    });

    this.formPago = this.fb.group({
      plantilla: ['transfer'],
      valor: [''],
      observacion: [''],
    });
    this.formCliente.get('valorAPagar')!.valueChanges.subscribe(() => {
    // si el grid ya está listo, habilita o deshabilita el click-edit
    this.gridApi?.setGridOption('suppressClickEdit', !this.canEditFacturas);
  });


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

  // Validación por fila (factura)
  private validateFacturaRow(r: GridRow): string[] {
    const pago = Number(r.pago) || 0;
    const monto = Number(r.monto) || 0;

    const errors: string[] = [];
    if (pago < 0) errors.push('Pago negativo.');
    if (!Number.isFinite(pago)) errors.push('Pago inválido.');
    if (pago > monto) errors.push('Pago supera el monto.');
    if (Math.round(pago * 100) !== pago * 100) errors.push('Pago con más de 2 decimales.');

    // ejemplo adicional: si está vencido, no permitir abonos
    // if ((r as any).valueVencido && pago > 0 && pago < monto) {
    //   errors.push('Factura vencida no admite abonos (solo cancelación).');
    // }
    return errors;
  }

  // Validación global de grilla de facturas
  private validateGridFacturas(): { ok: boolean; errors: string[] } {
    this.gridApi?.stopEditing();
    const errors: string[] = [];
    this.invalidRows.clear();

    (this.rowData || []).forEach((r, idx) => {
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

  // Cambios en celdas de facturas
  onCellValueChangedFacturas(_: any) {
    if (!this.gridTouched) return;
    const res = this.validateGridFacturas();
    if (!res.ok) {
      // solo marcamos visualmente; el bloqueo está en onNext()
      // console.warn('Errores grilla:', res.errors);
    }
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

    const res = this.validateGridFacturas();
    if (!res.ok) {
      this.mostrarAlerta('Hay errores en el detalle de facturas. Revisa los campos en rojo.', 'error');
      this.revealFirstError();                // ⬅️ te lleva a la primera
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
      this.pagoColumnDefs = this.pagoColumnDefsCheque;
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

  // Validación de grilla de plantillas
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
    this.formPago.reset({ plantilla: 'transfer', valor: '', observacion: '' });
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

        if (rows.length === 0) this.mostrarAlerta('El cliente no tiene detalle de facturas (facturas_pendientes = null)', 'info');
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

  // Alertas
  mostrarAlerta(mensaje: string, tipo: 'info' | 'error' | 'ok' | string): void {
    this._snackBar.open(mensaje, 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: tipo === 'error' ? ['snack-error'] : tipo === 'ok' ? ['snack-ok'] : ['snack-info']
    });
  }

  /** Helpers de validación de pagos/valor a pagar */
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

  // Restringe teclas: solo dígitos y un solo punto. Bloquea '-', '+', 'e', 'E', ','
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

  // Limpia pegado/escritura: dígitos + 1 punto, máx 2 decimales
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

  // Sanea pegado en la columna Pago del ag-Grid
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
      // Opcional: poner focus en la celda Pago
      this.gridApi.setFocusedCell(rowNode.rowIndex!, 'pago');
    }
  }
get canEditFacturas(): boolean {
  // válido y > 0
  const ctrl = this.formCliente?.get('valorAPagar');
  const n = this.getValorAPagarNumber();
  return !!ctrl && ctrl.valid && n > 0;
}
onFocusValorAPagar() {
  this.gridApi?.stopEditing();
}

// 2) sanea el input y ajusta el detalle para que puedas cambiar el número siempre
onValorAPagarInput(e: Event) {
  this.sanearDecimal(e); // ya la tienes

  // si el valor cambia, ponemos pagos a 0 para que no “amarren” el input
  // (si prefieres, aquí podrías recortar sólo el exceso en vez de poner todo a 0)
  const newRows = (this.rowData || []).map(r => {
    const monto = Number(r.monto) || 0;
    return { ...r, pago: 0, estado: this.getEstado(0, monto) };
  });
  this.rowData = newRows;
  this.gridApi?.setGridOption('rowData', this.rowData);

  // limpiar marcas de error y refrescar
  this.invalidRows.clear();
  this.gridApi?.refreshCells({ force: true });
}
}
