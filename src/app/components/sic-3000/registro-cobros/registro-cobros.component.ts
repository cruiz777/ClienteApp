import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  ColDef,
  GridApi,
  GridReadyEvent,
  ValueSetterParams,
} from 'ag-grid-community';

@Component({
  selector: 'app-registro-cobros',
  templateUrl: './registro-cobros.component.html',
  styleUrls: ['./registro-cobros.component.css'],
})
export class RegistroCobrosComponent implements OnInit {
  /** Control del stepper (1 = Datos del Cliente, 2 = Forma de Pago) */
  step = 1;

  /** Paso 1: Datos del Cliente */
  formCliente!: FormGroup;

  /** Paso 2: Forma de Pago */
  formPago!: FormGroup;

  private gridApi!: GridApi;
  /** Cambios locales de pagos editados para persistir */
  private pagosEditadosMap = new Map<string, { numero: string; pago: number; estado: string }>();

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
      editable: true,
      valueSetter: (p: ValueSetterParams<any>) => {
        const old = Number(p.data.pago) || 0;
        let val = 0;

        if (p.newValue != null) {
          const n = parseFloat(String(p.newValue).replace(/[^\d.-]/g, ''));
          val = isNaN(n) ? 0 : Math.max(0, n);
        }

        p.data.pago = val;
        p.data.estado = this.getEstado(val, Number(p.data.monto) || 0);

        if (p.data?.numero) {
          this.pagosEditadosMap.set(p.data.numero, {
            numero: p.data.numero,
            pago: val,
            estado: p.data.estado,
          });
        }

        // ✅ evitar pasar null como rowNode
        const params: any = { columns: ['pago', 'estado'], force: true };
        if (p.node) params.rowNodes = [p.node];
        p.api.refreshCells(params);

        return old !== val;
      },
      valueFormatter: p => this.usd(p.value),
    },
    {
      headerName: 'Estado',
      field: 'estado',
      width: 170,
      cellClass: p => {
        const v = String(p.value || '').toUpperCase();
        if (v === 'CANCELADO') return 'text-success fw-bold';
        if (v === 'ABONADO')   return 'text-primary fw-bold';
        return 'text-warning fw-bold';
      },
    },
    {
      headerName: 'Vence',
      field: 'vence',
      width: 120,
      cellClass: p => (p.data?.valueVencido ? 'text-danger fw-bold' : ''),
    },
    { headerName: 'Descripción', field: 'descripcion', flex: 1, minWidth: 220 },
    { headerName: 'Ord', field: 'ord', width: 80 },
  ];

  defaultColDef: ColDef = { resizable: true, sortable: true, filter: true };

  rowData = [
    { numero: 'F - 00202100009308', fecha: '14/08/2025', monto: 189.75, pago: 0, estado: 'PENDIENTE DE PAGO', vence: '14/08/2025', valueVencido: true,  descripcion: 'CRÉDITO PERSONAL', ord: 1 },
    { numero: 'F - 00202100009305', fecha: '14/08/2025', monto: 498.81, pago: 0, estado: 'PENDIENTE DE PAGO', vence: '14/08/2025', valueVencido: true,  descripcion: 'CRÉDITO PERSONAL', ord: 1 },
    { numero: 'F - 00202100009306', fecha: '14/08/2025', monto: 498.81, pago: 0, estado: 'PENDIENTE DE PAGO', vence: '14/08/2025', valueVencido: true,  descripcion: 'CRÉDITO PERSONAL', ord: 1 },
    { numero: 'F - 00202100009307', fecha: '14/08/2025', monto: 240.48, pago: 0, estado: 'PENDIENTE DE PAGO', vence: '14/08/2025', valueVencido: true,  descripcion: 'CRÉDITO PERSONAL', ord: 1 },
    { numero: 'F - 00202100009308', fecha: '14/08/2025', monto: 250.41, pago: 0, estado: 'PENDIENTE DE PAGO', vence: '14/08/2025', valueVencido: true,  descripcion: 'CRÉDITO PERSONAL', ord: 1 },
    { numero: 'F - 00202100009328', fecha: '25/08/2025', monto: 498.81, pago: 0, estado: 'PENDIENTE DE PAGO', vence: '25/08/2025', valueVencido: false, descripcion: 'CRÉDITO PERSONAL', ord: 1 },
  ];

  // ==========================================================
  // PASO 2: GRID DE FORMAS DE PAGO
  // ==========================================================
  private pagoGridApi!: GridApi;

  // Columnas por plantilla
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

  // Activos / comunes
  pagoColumnDefs: ColDef[] = [];
  pagoDefaultColDef: ColDef = { resizable: true, sortable: true, filter: true };

  // Datos por plantilla
  pagoRowDataTransfer: any[] = [
    { codigo: '102', descripcion: 'TRANSFERENCIA PICHINCHA', porcRet: null, banco: '', numCuentaTarjetaFactura: '', numCheque: '', monto: 0 },
    { codigo: '12',  descripcion: 'RETENCION EN LA FUENTE',  porcRet: 0,    banco: '', numCuentaTarjetaFactura: '', numCheque: '', monto: 0 },
    { codigo: '13',  descripcion: 'RETENCION DEL IVA',       porcRet: 0,    banco: '', numCuentaTarjetaFactura: '', numCheque: '', monto: 0 },
  ];
  pagoRowDataCheque: any[] = [
    { numChequeFecha: '', nombreDueno: '', autorizacion: '', monto: 0 },
  ];

  // Datos visibles + total
  pagoRowData: any[] = [];
  totalPagos = 0;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    // === PASO 1 === (campos unificados para cliente y responsable)
    this.formCliente = this.fb.group({
      noPago: [''],
      fechaPago: ['', Validators.required],
      cliente: [''],
      responsable: [''],
      valorAPagar: ['0.00'],
      montoDeuda: ['0.00'],
      observacion: [''],
    });

    // === PASO 2 ===
    this.formPago = this.fb.group({
      plantilla: ['transfer'],   // 'transfer' | 'cheque'
      valor: [''],
      observacion: [''],
    });

    // Inicializa plantilla por defecto
    this.activarPlantilla('transfer');
  }

  // ==========================================================
  // UTILIDADES
  // ==========================================================
  usd(v: number) {
    if (v == null) return '';
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(v);
  }
  private getEstado(pago: number, monto: number): string {
    if (!pago || pago <= 0) return 'PENDIENTE DE PAGO';
    if (pago >= monto)     return 'CANCELADO';
    return 'ABONADO';
  }

  invalid(form: FormGroup, ctrl: string) {
    const c = form.get(ctrl);
    return { 'is-invalid': !!c && c.touched && c.invalid };
  }

  // ==========================================================
  // PASO 1: GRID DE FACTURAS
  // ==========================================================
  onGridReady(e: GridReadyEvent) {
    this.gridApi = e.api;
    this.gridApi.sizeColumnsToFit();
  }

  guardarPagosEditados() {
    const cambios = Array.from(this.pagosEditadosMap.values());
    if (cambios.length === 0) return;
    // TODO: persistir cambios vía servicio HTTP
    console.log('Guardando cambios de pagos:', cambios);
    this.pagosEditadosMap.clear();
  }

  // Acciones generales Paso 1
  onCancel(): void {
    this.formCliente.reset({
      noPago: '',
      fechaPago: '',
      cliente: '',
      responsable: '',
      valorAPagar: '0.00',
      montoDeuda: '0.00',
      observacion: '',
    });

    if (this.gridApi) {
      this.gridApi.setGridOption('quickFilterText', ''); // limpia quick filter
      this.gridApi.setFilterModel(null);                 // limpia filtros de columnas
      this.gridApi.deselectAll();                        // limpia selección
      this.gridApi.stopEditing(true);                    // cierra edición en celdas
    }

    this.onCancelarPago();
    this.step = 1;
  }

  onNext(): void {
    if (this.formCliente.invalid) {
      this.formCliente.markAllAsTouched();
      return;
    }
    this.step = 2;
  }

  // ==========================================================
  // PASO 2: GRID DE PAGOS
  // ==========================================================
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

  // Si tu template aún llama (cellValueChanged), esto evita errores
  onPagoCellValueChanged(_: any) {
    this.recalcularTotal();
  }

  private recalcularTotal() {
    this.totalPagos = this.pagoRowData.reduce((acc, r) => acc + (Number(r.monto) || 0), 0);
  }

  // Botones Paso 2
  aceptarPagos() {
    // Aquí envías pagoRowData al backend
    console.log('F4 Aceptar Pagos →', this.pagoRowData);
  }

  cancelarPagos() {
    const pl = this.formPago.get('plantilla')?.value as 'transfer' | 'cheque';
    this.activarPlantilla(pl); // reinicia la plantilla actual
  }

  salirPagos() {
    this.step = 1;
  }

  nuevoPago() {
    const pl = this.formPago.get('plantilla')?.value as 'transfer' | 'cheque';
    if (pl === 'transfer') {
      this.pagoRowData.push({
        codigo: '',
        descripcion: '',
        porcRet: null,
        banco: '',
        numCuentaTarjetaFactura: '',
        numCheque: '',
        monto: 0,
      });
    } else {
      this.pagoRowData.push({
        numChequeFecha: '',
        nombreDueno: '',
        autorizacion: '',
        monto: 0,
      });
    }
    if (this.pagoGridApi) this.pagoGridApi.setGridOption('rowData', this.pagoRowData);
  }

  registrarPago() {
    // Acción auxiliar (ej. validar, apilar temporal, etc.)
    console.log('Registrar Pago (temporal) →', this.pagoRowData);
  }

  onCancelarPago(): void {
    this.formPago.reset({
      plantilla: 'transfer',
      valor: '',
      observacion: '',
    });
    this.activarPlantilla('transfer');
  }
}
