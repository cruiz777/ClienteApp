import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ColDef } from 'ag-grid-community';

@Component({
  selector: 'app-cobro-individual',
  templateUrl: './cobro-individual.component.html',
  styleUrls: ['./cobro-individual.component.css']
})
export class CobroIndividualComponent implements OnInit {
  /** Control del stepper (1 = Datos del Cliente, 2 = Forma de Pago) */
  step = 1;

  /** Paso 1: Datos del Cliente */
  formCliente!: FormGroup;

  /** Paso 2: Forma de Pago */
  formPago!: FormGroup;

  /** Catálogos demo: reemplazar por servicios reales */
  clientes = [
    { id: 1, nombre: 'Cliente A' },
    { id: 2, nombre: 'Cliente B' }
  ];
  facturas = [
    { id: 100, numero: '001-001-000000123' },
    { id: 101, numero: '001-001-000000124' }
  ];
  formasPago = [
    { id: 1, descripcion: 'Efectivo' },
    { id: 2, descripcion: 'Tarjeta' },
    { id: 3, descripcion: 'Transferencia' }
  ];
  tipos = [
    'Transferencia Pichincha', 'Transferencia Produbanco', 'Cheque',
    'Depósito', 'Efectivo', 'Tarjeta Crédito', 'Tarjeta Débito'
  ];
  bancos = [
    'Banco Pichincha', 'Produbanco', 'Banco Guayaquil', 'Banco Pacífico', 'Otro'
  ];

  /** Lista cruda de pagos agregados */
  private formasPagoAgregadas: any[] = [];

  /** Datos para el grid */
  rowData: any[] = [];
  pinnedBottomRowData: any[] = [];

  /** Columnas AG Grid */
  columnDefs: ColDef[] = [
    { headerName: 'Forma Pago', field: 'tipo', minWidth: 200, flex: 1 },
    { headerName: 'Valor', field: 'valor', width: 130, valueFormatter: p => this.fmtMoneda(p.value), type: 'rightAligned' },
    { headerName: 'No. Documento', field: 'numeroDocumento', minWidth: 150 },
    { headerName: 'Banco', field: 'banco', minWidth: 150 },
    { headerName: 'Titular', field: 'propietario', minWidth: 180 },
    { headerName: 'Lote Recap', field: 'loteRecap', minWidth: 140 },
    { headerName: 'Fecha Emisión', field: 'fechaEmision', width: 140, valueFormatter: p => this.fmtFecha(p.value) },
    { headerName: 'Autorización', field: 'autorizacion', minWidth: 140 },
    { headerName: 'Fecha Autorización', field: 'fechaAutorizacion', width: 160, valueFormatter: p => this.fmtFecha(p.value) },
    { headerName: 'Observación', field: 'observacion', minWidth: 180 },
  ];

  defaultColDef: ColDef = {
    sortable: false,
    resizable: true,
    filter: false,
    editable: false,
    flex: 1
  };

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    // === Paso 1 ===
    this.formCliente = this.fb.group({
      cliente: ['', Validators.required],
      factura: ['', Validators.required],
      fecha: ['', Validators.required],
      formaPago: ['', Validators.required],
      fechaDetalle: ['', Validators.required],
      valorCxc: ['', [Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
      abono: ['', [Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
      saldo: ['', [Validators.pattern(/^\d+(\.\d{1,2})?$/)]]
    });

    // === Paso 2 ===
    this.formPago = this.fb.group({
      categoriaPago: ['efectivo', Validators.required], // efectivo | tarjeta
      tipo: ['', Validators.required],
      valor: ['', [Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
      fechaEmision: [''],
      banco: [''],
      numeroDocumento: [''],
      loteRecap: [''],
      propietario: [''],
      autorizacion: [''],
      fechaAutorizacion: [''],
      observacion: ['']
    });

    // Inicializar grid
    this.refreshGrid();
  }

  /** Helper para clases de validación Bootstrap */
  invalid(form: FormGroup, ctrl: string) {
    const c = form.get(ctrl);
    return { 'is-invalid': !!c && c.touched && c.invalid };
  }

  // ===== Acciones Paso 1 =====
  onCancel(): void {
    this.formCliente.reset({
      cliente: '', factura: '', fecha: '',
      formaPago: '', fechaDetalle: '',
      valorCxc: '', abono: '', saldo: ''
    });
    this.onCancelarPago();
    this.formasPagoAgregadas = [];
    this.refreshGrid();
    this.step = 1;
  }

  onNext(): void {
    if (this.formCliente.invalid) {
      this.formCliente.markAllAsTouched();
      return;
    }
    this.step = 2;
  }

  // ===== Acciones Paso 2 =====
  onCancelarPago(): void {
    this.formPago.reset({
      categoriaPago: 'efectivo', tipo: '', valor: '',
      fechaEmision: '', banco: '', numeroDocumento: '',
      loteRecap: '', propietario: '', autorizacion: '',
      fechaAutorizacion: '', observacion: ''
    });
  }

  onAddPago(): void {
    if (this.formPago.invalid) {
      this.formPago.markAllAsTouched();
      return;
    }

    const pago = this.formPago.getRawValue();
    pago.valor = this.toNumberOrZero(pago.valor); // normaliza

    this.formasPagoAgregadas.push(pago);
    this.refreshGrid();
    this.onCancelarPago();
  }

  /** Recalcula datos del grid y la fila “Total” */
  private refreshGrid(): void {
    this.rowData = this.formasPagoAgregadas.map(p => ({
      tipo: p.tipo,
      valor: this.toNumberOrZero(p.valor),
      numeroDocumento: p.numeroDocumento || '',
      banco: p.banco || '',
      propietario: p.propietario || '',
      loteRecap: p.loteRecap || '',
      fechaEmision: p.fechaEmision || '',
      autorizacion: p.autorizacion || '',
      fechaAutorizacion: p.fechaAutorizacion || '',
      observacion: p.observacion || ''
    }));

    const total = this.formasPagoAgregadas
      .reduce((acc, p) => acc + this.toNumberOrZero(p.valor), 0);

    this.pinnedBottomRowData = [{
      tipo: 'Total',
      valor: total
    }];
  }

  /** Acción LIQUIDAR */
  onLiquidar(): void {
    if (!this.formasPagoAgregadas.length) {
      alert('Agrega al menos una forma de pago para liquidar.');
      return;
    }

    const payload = {
      clienteId: this.formCliente.get('cliente')?.value,
      facturaId: this.formCliente.get('factura')?.value,
      fecha: this.formCliente.get('fecha')?.value,
      detalle: {
        formaPagoId: this.formCliente.get('formaPago')?.value,
        fechaDetalle: this.formCliente.get('fechaDetalle')?.value,
        valorCxc: this.toNumberOrZero(this.formCliente.get('valorCxc')?.value),
        abono: this.toNumberOrZero(this.formCliente.get('abono')?.value),
        saldo: this.toNumberOrZero(this.formCliente.get('saldo')?.value),
      },
      pagos: this.formasPagoAgregadas.map(p => ({
        categoriaPago: p.categoriaPago,
        tipo: p.tipo,
        valor: this.toNumberOrZero(p.valor),
        fechaEmision: p.fechaEmision || null,
        banco: p.banco || null,
        numeroDocumento: p.numeroDocumento || null,
        loteRecap: p.loteRecap || null,
        propietario: p.propietario || null,
        autorizacion: p.autorizacion || null,
        fechaAutorizacion: p.fechaAutorizacion || null,
        observacion: p.observacion || null
      }))
    };

    console.log('LIQUIDAR payload =>', payload);
    // TODO: llamar a backend:
    // this.cobrosService.liquidar(payload).subscribe(...)
  }

  // ===== Helpers =====
  private toNumberOrZero(v: any): number {
    const n = typeof v === 'string' ? v.replace(',', '.').trim() : v;
    const parsed = Number(n);
    return isNaN(parsed) ? 0 : parsed;
  }

  private fmtMoneda(v: any): string {
    const num = this.toNumberOrZero(v);
    return num.toLocaleString('es-EC', { style: 'currency', currency: 'USD' });
  }

  private fmtFecha(v: any): string {
    if (!v) return '';
    try {
      const d = new Date(v);
      if (isNaN(d.getTime())) return v; // ya viene formateada
      return d.toLocaleDateString('es-EC');
    } catch { return v; }
  }
}
