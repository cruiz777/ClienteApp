import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { Observable, debounceTime, distinctUntilChanged, switchMap, of, map } from 'rxjs';
import { CodigoContableSummaryResponse, FacturaPendienteResponse } from 'src/app/interfaces/responses/pago-proveedor-response';
import { PagoProveedorService } from 'src/app/services/pago-proveedor.service';
import { CreatePagoProveedorRequest, FacturaPagoItem, FormaPagoItem } from 'src/app/interfaces/requests/pago-proveedor-request';
import { LoginUsuarioResponse } from 'src/app/interfaces/responses/usuario-log-response';
import { UsuarioService } from 'src/app/services/usuario.service';
import { Router } from '@angular/router';
import { FormaPagoCgService } from 'src/app/services/forma-pago-cg.service';
import { FormaPagoCgResponse } from 'src/app/interfaces/responses/formapagocg-response';
import { PlanCuentasService, PlanCuenta } from 'src/app/services/plan-cuentas.service';


import { PlanCuentaCellEditorComponent } from './plan-cuenta-cell-editor.component';
import { MatDialog } from '@angular/material/dialog';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/components/utils/messages/custom-message-box.component';




interface FacturaRow extends FacturaPendienteResponse {
  pago: number; // Campo editable
}

interface FormaPagoRow {
  id: number;
  idFormaPago: number;
  descripcion: string;
  monto: number;
  idPlanCuentas: number;
  nombreCuenta?: string;
  idCodContable?: number;
  banco?: string;
  cuentaBanco?: string;
  numeroCheque?: string;
  referencia?: string;
  autorizacion?: string;
}

@Component({
  selector: 'app-registro-pagos-proveedor',
  templateUrl: './registro-pagos-proveedor.component.html',
  styleUrls: ['./registro-pagos-proveedor.component.scss']
})
export class RegistroPagosProveedorComponent implements OnInit {
  @ViewChild('stepper') stepper!: MatStepper;
  @ViewChild('gridFacturas') gridFacturas!: AgGridAngular;
  @ViewChild('gridFormasPago') gridFormasPago!: AgGridAngular;
  Math = Math;
  // ===== FORMULARIOS =====
  paso1Form!: FormGroup;
  paso2Form!: FormGroup;

  // ===== AUTOCOMPLETE PROVEEDOR =====
  proveedorCtrl = this.fb.control('');
  proveedoresFiltrados$!: Observable<CodigoContableSummaryResponse[]>;
  proveedorSeleccionado: CodigoContableSummaryResponse | null = null;
  cuentasBancoFormateadas: Array<{ id: number; label: string; codigo: string }> = [];
  // ===== GRIDS =====
  facturasRows: FacturaRow[] = [];
  formasPagoRows: FormaPagoRow[] = [];
  private gridApiFacturas!: GridApi;
  private gridApiFormasPago!: GridApi;

  // ===== COLUMNAS AG-GRID =====
  columnDefsFacturas: ColDef[] = [
    {
      field: 'nocomp',
      headerName: '#Comprobante',
      width: 140,
      checkboxSelection: true,
      headerCheckboxSelection: true
    },
    { field: 'numdoc', headerName: '#Documento', width: 130 },
    {
      field: 'fechatran',
      headerName: 'Fecha',
      width: 110,
      valueFormatter: params => this.formatDate(params.value)
    },
    {
      field: 'fechaVenc',
      headerName: 'Vencimiento',
      width: 120,
      valueFormatter: params => this.formatDate(params.value),
      cellStyle: params => {
        if (params.data?.vencida) {
          return { backgroundColor: '#ffebee', color: '#c62828' };
        }
        return null;
      }
    },
    {
      field: 'montoOriginal',
      headerName: 'Monto Total',
      width: 120,
      valueFormatter: params => this.formatCurrency(params.value),
      type: 'rightAligned'
    },
    {
      field: 'saldoPendiente',
      headerName: 'Saldo Pendiente',
      width: 140,
      valueFormatter: params => this.formatCurrency(params.value),
      type: 'rightAligned',
      cellStyle: { fontWeight: 'bold', color: '#d32f2f' }
    },
    {
      field: 'pago',
      headerName: 'Valor a Pagar',
      width: 140,
      editable: true,
      type: 'rightAligned',
      cellStyle: { backgroundColor: '#fff9c4' },
      valueFormatter: params => this.formatCurrency(params.value),
      valueSetter: params => {
        const old = Number(params.data.pago) || 0;
        const saldoPendiente = Number(params.data.saldoPendiente) || 0;

        let newValue = parseFloat(params.newValue) || 0;
        newValue = this.clamp2(newValue);

        if (newValue < 0) {
          this.showError('El valor no puede ser negativo');
          return false;
        }

        if (newValue > saldoPendiente) {
          this.showError(`El valor no puede exceder el saldo pendiente ($${saldoPendiente.toFixed(2)})`);
          return false;
        }

        // Actualizar pago Y estado
        params.data.pago = newValue;
        params.data.estadopago = this.getEstado(newValue, saldoPendiente);

        this.calcularTotales();

        // Refrescar AMBAS columnas
        if (params.node) {
          params.api.refreshCells({
            rowNodes: [params.node],
            columns: ['pago', 'estadopago'],
            force: true
          });
        }

        return old !== newValue;
      }
    },
    {
      field: 'estadopago',
      headerName: 'Estado',
      width: 110,
      cellRenderer: (params: any) => {
        const badges = {
          'N': '<span class="badge-estado badge-no-pagado">No Pagado</span>',
          'A': '<span class="badge-estado badge-abonado">Abonado</span>',
          'P': '<span class="badge-estado badge-cancelado">Cancelado</span>'
        };
        return badges[params.value as keyof typeof badges] || params.value;
      }
    },
    { field: 'comentario', headerName: 'Comentario', width: 200 }
  ];
  pinnedBottomRowData: any[] = [];

  columnDefsFormasPago: ColDef[] = [
    {
      field: 'descripcion',
      headerName: 'Forma de Pago',
      width: 200,
      editable: false
    },
    {
      field: 'idPlanCuentas',
      headerName: 'Cuenta Contable',
      width: 300,
      editable: true,
      singleClickEdit: true,
      cellEditor: PlanCuentaCellEditorComponent,
      cellEditorPopup: true,
      cellEditorParams: (params: any) => {
        const lista = this.esBancoPorForma(params.data)
          ? this.cuentasBancoFormateadas
          : this.cuentasFormateadas;
        return { cuentas: lista };
      },
      valueFormatter: (params) => {
        const v = Number(params.value || 0);
        if (!v) return 'Seleccione cuenta...';

        const lista = this.esBancoPorForma(params.data)
          ? this.cuentasBancoFormateadas
          : this.cuentasFormateadas;

        const cuenta = lista.find(c => c.id === v);
        return cuenta ? cuenta.label : String(v);
      },
      // Siempre tener el valuesetter
      valueSetter: (params) => {
        console.log('🎯 valueSetter ejecutado:', {
          newValue: params.newValue,
          tipoNewValue: typeof params.newValue,
          oldValue: params.oldValue
        });

        // Convertir a número
        const newValue = Number(params.newValue);

        // Validar
        if (isNaN(newValue)) {
          console.error('❌ Valor inválido recibido:', params.newValue);
          return false;
        }

        // Asignar
        params.data.idPlanCuentas = newValue;

        console.log('✅ Valor asignado:', newValue);
        return true; // ← Indica que el valor cambió exitosamente
      }
    },
    {
      field: 'monto',
      headerName: 'Monto',
      width: 140,
      editable: true,
      type: 'rightAligned',
      cellStyle: { backgroundColor: '#fff9c4' },
      valueFormatter: params => this.formatCurrency(params.value),
      valueSetter: params => {
        const newValue = parseFloat(params.newValue) || 0;
        if (newValue < 0) {
          this.showError('El monto no puede ser negativo');
          return false;
        }
        params.data.monto = newValue;
        this.calcularTotales();
        return true;
      }
    },
    { field: 'banco', headerName: 'Banco', width: 150, editable: true },
    { field: 'cuentaBanco', headerName: 'Cuenta Banco', width: 150, editable: true },
    { field: 'referencia', headerName: 'Referencia', width: 150, editable: true },
    { field: 'autorizacion', headerName: 'Autorización', width: 150, editable: true },
    {
      headerName: 'Acciones',
      width: 100,
      cellRenderer: (params: any) => {
        return '<button class="btn btn-sm btn-danger">Eliminar</button>';
      },
      onCellClicked: params => {
        this.eliminarFormaPago(params.data.id);
      }
    }
  ];

  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true
  };

  // ===== TOTALES =====
  totalFacturas = 0;
  totalFormasPago = 0;
  diferencia = 0;
  montoPagar = 0;

  // ===== ESTADO =====
  cargandoFacturas = false;
  guardando = false;

  // ===== DATOS DE SESIÓN =====
  idEmpresa!: number;
  idUsuario!: number;
  idZona!: 1;
  usuarioActual: LoginUsuarioResponse | null = null;

  cuentasDisponibles: PlanCuenta[] = [];
  cuentasFormateadas: Array<{ id: number; label: string; codigo: string }> = [];

   // ===== AUTOCOMPLETE FORMAS DE PAGO =====
  formaPagoCtrl = this.fb.control('');
  formasPagoDisponibles$!: Observable<FormaPagoCgResponse[]>;
  formaPagoSeleccionada: FormaPagoCgResponse | null = null;
  constructor(
    private fb: FormBuilder,
    private pagoProveedorService: PagoProveedorService,
    private usuarioService: UsuarioService,
    private formaPagoCgService: FormaPagoCgService,
    private planCuentasService: PlanCuentasService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.cargarDatosUsuario();
    this.initForms();
    this.initAutocompleteProveedor();
    this.initFormasPago();
    this.cargarCuentasContables();
  }
  private getIdCodigoEspecial(c: any): number {
    return Number(c?.IdCodigoEspecial ?? c?.idCodigoEspecial ?? 0);
  }

  private esBancoPorForma(row?: FormaPagoRow): boolean {
    const d = (row?.descripcion ?? '').toLowerCase();
      return d.includes('cheque') || d.includes('transfer') || d.includes('acreditacion');
  }
  private cargarCuentasContables(): void {
    this.planCuentasService.getAll({ idEmpresa: this.idEmpresa }).subscribe({
      next: (cuentas) => {
        this.cuentasDisponibles = (cuentas || []).filter(c => c.EsMovimiento);

        // ✅ Cuentas BANCO (IdCodigoEspecial === 4)
        const bancos = this.cuentasDisponibles.filter(c => this.getIdCodigoEspecial(c) === 4);
        this.cuentasBancoFormateadas = bancos.map(c => ({
          id: Number(c.IdPlanCuentas),
          label: `${c.CuentaPresentacion} - ${c.NombreCuenta}`,
          codigo: c.CuentaPresentacion
        }));

        // ✅ Cuentas NO BANCO (todas menos IdCodigoEspecial === 4)
        const noBancos = this.cuentasDisponibles.filter(c => this.getIdCodigoEspecial(c) !== 4);
        this.cuentasFormateadas = noBancos.map(c => ({
          id: Number(c.IdPlanCuentas),
          label: `${c.CuentaPresentacion} - ${c.NombreCuenta}`,
          codigo: c.CuentaPresentacion
        }));

        console.log('✅ Cuentas banco:', this.cuentasBancoFormateadas.length);
        console.log('✅ Cuentas NO banco:', this.cuentasFormateadas.length);
      }
    });
  }
  private initFormasPago(): void {
    // ✅ Cargar TODAS las formas de pago (activas e inactivas)
    this.formasPagoDisponibles$ = this.formaPagoCgService.getAll({
      idEmpresa: this.idEmpresa
    }).pipe(
      map(formas => {
        console.log('📦 Formas de pago cargadas:', formas);

        // ✅ OPCIÓN 1: Mostrar todas (puedes filtrar visualmente en el HTML)
        return formas;

        // ✅ OPCIÓN 2: Solo activas (descomentar si prefieres esto)
        // return formas.filter(f => f.activo === true);
      })
    );

    // ✅ FORZAR carga inmediata
    this.formasPagoDisponibles$.subscribe(formas => {
      console.log('✅ Formas disponibles en el componente:', formas);
    });
  }
  // private initFormasPago(): void {
  //   // Cargar todas las formas de pago de la empresa
  //   this.formasPagoDisponibles$ = this.formaPagoCgService.getAll({
  //     idEmpresa: this.idEmpresa
  //   }).pipe(
  //     map(formas => formas.filter(f => f.activo !== false)) // Solo activas
  //   );

  //   // Opcional: Para búsqueda en tiempo real
  //   // this.formasPagoDisponibles$ = this.formaPagoCtrl.valueChanges.pipe(
  //   //   debounceTime(300),
  //   //   distinctUntilChanged(),
  //   //   switchMap(value => {
  //   //     if (typeof value === 'string' && value.length >= 2) {
  //   //       return this.formaPagoCgService.getAll({ idEmpresa: this.idEmpresa }).pipe(
  //   //         map(formas => formas.filter(f =>
  //   //           f.activo !== false &&
  //   //           f.descripcion.toLowerCase().includes(value.toLowerCase())
  //   //         ))
  //   //       );
  //   //     }
  //   //     return this.formaPagoCgService.getAll({ idEmpresa: this.idEmpresa });
  //   //   })
  //   // );
  // }
  getRowIdFormasPago = (params: any) => {
    return params.data.id.toString();
  };
  onFormaPagoSeleccionadaDropdown(forma: FormaPagoCgResponse): void {
    if (!forma) return;

    const nuevaForma: FormaPagoRow = {
      id: Date.now(),
      idFormaPago: forma.idFormaPagoCg,
      descripcion: forma.descripcion,
      monto: 0,
      idPlanCuentas: 0,
      nombreCuenta: '',
      idCodContable: undefined
    };

    this.formasPagoRows.push(nuevaForma);
    this.gridApiFormasPago?.applyTransaction({ add: [nuevaForma] });
    this.calcularTotales();
  }
  private cargarDatosUsuario(): void {
    this.usuarioActual = this.usuarioService.getUsuarioActual();

    if (!this.usuarioActual) {
      this.showError('Sesión expirada. Por favor inicie sesión nuevamente.');
      this.router.navigate(['/login']);
      return;
    }

    // ✅ Asignar datos del usuario logueado
    this.idEmpresa = this.usuarioActual.id_empresa;
    this.idUsuario = this.usuarioActual.id_usuario;

    // ✅ Zona: Usar id_autorizacion_caja como idZona (ajusta según tu lógica)
    this.idZona =  1;

    console.log('Datos de sesión cargados:', {
      idEmpresa: this.idEmpresa,
      idUsuario: this.idUsuario,
      idZona: this.idZona,
      usuario: this.usuarioActual.nombre_usuario
    });
  }
  onInputFocus(event: Event): void {
    const input = event.target as HTMLInputElement;
    input?.select();
  }
  // ===== INICIALIZACIÓN =====
  private initForms(): void {
    this.paso1Form = this.fb.group({
      proveedor: ['', Validators.required],
      montoPagar: [0, [Validators.required, Validators.min(0.01)]],
      beneficiario: ['', Validators.required],
      observaciones: ['']
    });

    this.paso2Form = this.fb.group({
      // Este formulario se valida dinámicamente
    });
  }

  private initAutocompleteProveedor(): void {
    this.proveedoresFiltrados$ = this.proveedorCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(value => {
        if (typeof value === 'string' && value.length >= 2) {
          return this.pagoProveedorService.searchProveedores(this.idEmpresa, value);
        }
        return of({ type: 'SUCCESS', data: { items: [] }, message: '', id: '' });
      }),
      switchMap(response => {
        if (response.type === 'SUCCESS' && response.data) {
          return of(response.data.items);
        }
        return of([]);
      })
    );
  }

  // ===== EVENTOS AG-GRID =====
  onGridFacturasReady(params: GridReadyEvent): void {
    this.gridApiFacturas = params.api;
    this.gridApiFacturas.sizeColumnsToFit();
  }

  onGridFormasPagoReady(params: GridReadyEvent): void {
    this.gridApiFormasPago = params.api;
    this.gridApiFormasPago.sizeColumnsToFit();
  }

  // ===== AUTOCOMPLETE PROVEEDOR =====
  displayProveedor(proveedor: CodigoContableSummaryResponse | null): string {
    if (!proveedor) return '';
    return `${proveedor.identificacion} - ${proveedor.nombre}`;
  }
  displayFormaPago(forma: FormaPagoCgResponse | null): string {
    if (!forma) return '';
    return forma.descripcion;
  }

  onFormaPagoSeleccionada(event: MatAutocompleteSelectedEvent): void {
    this.formaPagoSeleccionada = event.option.value;

    // Validación null
    if (!this.formaPagoSeleccionada) {
      return;
    }

    // Usar solo los campos que existen en FormaPagoCgResponse
    const nuevaForma: FormaPagoRow = {
      id: Date.now(),
      idFormaPago: this.formaPagoSeleccionada.idFormaPagoCg, //Campo correcto
      descripcion: this.formaPagoSeleccionada.descripcion,
      monto: 0,
      idPlanCuentas: 0, // No existe en response, valor default
      nombreCuenta: '', // No existe en response
      idCodContable: undefined // No existe en response
    };

    this.formasPagoRows.push(nuevaForma);
    this.gridApiFormasPago?.applyTransaction({ add: [nuevaForma] });
    this.calcularTotales();

    // Limpiar el control
    this.formaPagoCtrl.reset();
    this.formaPagoSeleccionada = null;
  }
  onProveedorSeleccionado(event: MatAutocompleteSelectedEvent): void {
    this.proveedorSeleccionado = event.option.value;
    this.paso1Form.patchValue({
      proveedor: this.proveedorSeleccionado?.nombre || '' ,
      beneficiario: this.proveedorSeleccionado?.nombre || ''
    });
    this.cargarFacturasPendientes();
  }

  // ===== CARGA DE DATOS =====
  private cargarFacturasPendientes(): void {
    if (!this.proveedorSeleccionado) return;

    this.cargandoFacturas = true;
    this.pagoProveedorService.getFacturasPendientes(
      this.idEmpresa,
      this.proveedorSeleccionado.idCodContable
    ).subscribe({
      next: (response) => {
        if (response.type === 'SUCCESS' && response.data) {
          this.facturasRows = response.data.map(f => ({
            ...f,
            pago: 0,
            estadopago: f.estadopago || 'N'
          }));
          this.gridApiFacturas?.setGridOption('rowData', this.facturasRows);
        } else {
          this.showError(response.message || 'Error al cargar facturas');
        }
        this.cargandoFacturas = false;
      },
      error: (err) => {
        this.showError('Error de conexión al cargar facturas');
        this.cargandoFacturas = false;
      }
    });
  }

  // // ===== DISTRIBUCIÓN DE PAGO =====
  // distribuirPagoUniforme(): void {
  //   const facturasSeleccionadas = this.gridApiFacturas.getSelectedRows() as FacturaRow[];

  //   if (facturasSeleccionadas.length === 0) {
  //     this.showError('Seleccione al menos una factura');
  //     return;
  //   }

  //   const montoPorFactura = this.montoPagar / facturasSeleccionadas.length;

  //   facturasSeleccionadas.forEach(factura => {
  //     factura.pago = Math.min(montoPorFactura, factura.saldoPendiente);
  //     factura.estadopago = this.getEstado(factura.pago, factura.saldoPendiente);

  //   });

  //   this.gridApiFacturas.applyTransaction({ update: facturasSeleccionadas });
  //   this.calcularTotales();
  // }

  // distribuirPagoProporcional(): void {
  //   const facturasSeleccionadas = this.gridApiFacturas.getSelectedRows() as FacturaRow[];

  //   if (facturasSeleccionadas.length === 0) {
  //     this.showError('Seleccione al menos una factura');
  //     return;
  //   }

  //   const totalSaldos = facturasSeleccionadas.reduce((sum, f) => sum + f.saldoPendiente, 0);

  //   facturasSeleccionadas.forEach(factura => {
  //     const proporcion = factura.saldoPendiente / totalSaldos;
  //     factura.pago = Math.min(this.montoPagar * proporcion, factura.saldoPendiente);
  //     factura.estadopago = this.getEstado(factura.pago, factura.saldoPendiente);
  //   });

  //   this.gridApiFacturas.applyTransaction({ update: facturasSeleccionadas });
  //   this.calcularTotales();
  // }

  // Esta función reemplaza distribuirPagoUniforme y distribuirPagoProporcional
  distribuirPago(): void {
    let facturasSeleccionadas = this.gridApiFacturas.getSelectedRows() as FacturaRow[];

    // Si NO hay facturas seleccionadas, seleccionar TODAS
    if (facturasSeleccionadas.length === 0) {
      this.gridApiFacturas.selectAll();
      facturasSeleccionadas = this.gridApiFacturas.getSelectedRows() as FacturaRow[];
    }

    if (facturasSeleccionadas.length === 0) {
      this.showError('No hay facturas disponibles');
      return;
    }

    // Distribuir proporcionalmente
    const totalSaldos = facturasSeleccionadas.reduce((sum, f) => sum + f.saldoPendiente, 0);

    facturasSeleccionadas.forEach(factura => {
      const proporcion = factura.saldoPendiente / totalSaldos;
      factura.pago = Math.min(this.montoPagar * proporcion, factura.saldoPendiente);
      factura.estadopago = this.getEstado(factura.pago, factura.saldoPendiente);
    });

    this.gridApiFacturas.applyTransaction({ update: facturasSeleccionadas });
    this.calcularTotales();
  }

  limpiarPagos(): void {
    this.facturasRows.forEach(factura => {
      factura.pago = 0;
      factura.estadopago = 'N';
    });
    this.gridApiFacturas.applyTransaction({ update: this.facturasRows });
    this.calcularTotales();
  }

  // // ===== FORMAS DE PAGO =====
  // agregarFormaPago(): void {
  //   const nuevaForma: FormaPagoRow = {
  //     id: Date.now(),
  //     idFormaPago: 0,
  //     descripcion: 'Nueva Forma de Pago',
  //     monto: 0,
  //     idPlanCuentas: 0
  //   };

  //   this.formasPagoRows.push(nuevaForma);
  //   this.gridApiFormasPago?.applyTransaction({ add: [nuevaForma] });
  // }

  eliminarFormaPago(id: number): void {
    const index = this.formasPagoRows.findIndex(f => f.id === id);
    if (index !== -1) {
      const removed = this.formasPagoRows.splice(index, 1);
      this.gridApiFormasPago?.applyTransaction({ remove: removed });
      this.calcularTotales();
    }
  }

  // ===== CÁLCULOS =====
  private calcularTotales(): void {
    this.totalFacturas = this.facturasRows.reduce((sum, f) => sum + (f.pago || 0), 0);
    this.totalFormasPago = this.formasPagoRows.reduce((sum, f) => sum + (f.monto || 0), 0);
    this.diferencia = this.totalFacturas - this.totalFormasPago;
  }
  get totalDeuda(): number {
    return this.facturasRows.reduce((sum, f) => sum + f.saldoPendiente, 0);
  }

  get saldoDeuda(): number {
    return this.totalDeuda - this.montoPagar;
  }
  get totalFacturasConPago(): number {
    return this.facturasRows.filter(f => f.pago > 0).length;
  }

  get pagoValido(): boolean {
    return Math.abs(this.diferencia) < 0.01 &&
           this.totalFacturas > 0 &&
           this.formasPagoRows.length > 0;
  }

  // ===== NAVEGACIÓN STEPPER =====
  avanzarPaso2(): void {
    if (this.totalFacturasConPago === 0) {
      this.showError('Debe asignar un monto a pagar en al menos una factura');
      return;
    }

    if (!this.paso1Form.valid) {
      this.showError('Complete todos los campos obligatorios');
      return;
    }

    this.stepper.next();
  }

  volverPaso1(): void {
    this.stepper.previous();
  }

  // ===== GUARDAR =====
  guardarPago(): void {
    if (!this.pagoValido) {
      this.showError('La suma de facturas debe coincidir con la suma de formas de pago');
      return;
    }

    if (!this.proveedorSeleccionado) {
      this.showError('Debe seleccionar un proveedor');
      return;
    }
    // Validar que todas las formas de pago tengan cuenta contable
    const formasSinCuenta = this.formasPagoRows.filter(f => !f.idPlanCuentas || f.idPlanCuentas === 0);
    if (formasSinCuenta.length > 0) {
      this.showError('Todas las formas de pago deben tener una cuenta contable asignada');
      return;
    }
    const loadingDialog = this.dialog.open(CustomMessageBoxComponent, {
      data: {
        title: 'Guardando Pago',
        message: 'Por favor espere mientras se procesa el pago...',
        type: 'info',
        isLoading: true,
        loadingText: 'Registrando pago en el sistema...'
      } as MessageBoxData,
      disableClose: true
    });
    const facturas: FacturaPagoItem[] = this.facturasRows
      .filter(f => f.pago > 0)
      .map(f => ({
        idCuentaPorPagar: f.idCuentaPorPagar,
        nocomp: f.nocomp,
        montoPagar: f.pago,
        idPlanCuentasCxP: f.idPlanCuentas,
        idCodContableCxP: f.codigoContable,
        idTipComp: 1 // TODO: Obtener el tipo de comprobante correcto
      }));

    const formasPago: FormaPagoItem[] = this.formasPagoRows.map(f => ({
      idFormaPago: f.idFormaPago || 1,
      descripcion: f.descripcion,
      monto: f.monto,
      idPlanCuentas: f.idPlanCuentas || 0,
      idCodContable: f.idCodContable,
      banco: f.banco,
      cuentaBanco: f.cuentaBanco,
      numeroCheque: f.numeroCheque,
      referencia: f.referencia,
      autorizacion: f.autorizacion
    }));

    const request: CreatePagoProveedorRequest = {
      idEmpresa: this.idEmpresa,
      idUsuario: this.idUsuario,
      idZona: this.idZona,
      idCodContable: this.proveedorSeleccionado.idCodContable,
      beneficiario: this.paso1Form.value.beneficiario,
      fechatransaccion: new Date().toISOString(),
      observaciones: this.paso1Form.value.observaciones,
      idLocal: 1,
      facturas: facturas,
      formasPago: formasPago
    };

    this.guardando = true;
    this.pagoProveedorService.registrarPago(request).subscribe({
      next: (response) => {
        loadingDialog.close(); // ✅ Cerrar loading

        if (response.type === 'CREATED') {
          // ✅ Mostrar éxito
          const successDialog = this.dialog.open(CustomMessageBoxComponent, {
            data: {
              title: 'Pago Registrado',
              message: response.message || 'El pago se ha registrado exitosamente',
              type: 'success',
              confirmText: 'Aceptar',
              showCancel: false
            } as MessageBoxData
          });

          successDialog.afterClosed().subscribe(() => {
            this.resetearFormulario();
          });
        } else {
          this.showError(response.message || 'Error al registrar el pago');
        }
      },
      error: (err) => {
        loadingDialog.close(); // ✅ Cerrar loading
        this.showError('Error de conexión al guardar el pago');
      }
    });
  }

  private resetearFormulario(): void {
    this.paso1Form.reset();
    this.proveedorCtrl.reset();
    this.formaPagoCtrl.reset();
    this.proveedorSeleccionado = null;
    this.facturasRows = [];
    this.formaPagoSeleccionada = null;
    this.formasPagoRows = [];
    this.gridApiFacturas?.setGridOption('rowData', []);
    this.gridApiFormasPago?.setGridOption('rowData', []);
    this.calcularTotales();
    this.stepper.reset();
  }

  // ===== UTILIDADES =====
  private formatDate(value: string | null | undefined): string {
    if (!value) return '';
    const date = new Date(value);
    return date.toLocaleDateString('es-EC');
  }

  private formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined) return '$0.00';
    return `$${value.toFixed(2)}`;
  }
  onCellValueChangedFormasPago(event: any): void {
    const field = event.colDef.field;
    const rowIndex = event.rowIndex;

    if (!field || rowIndex == null) return;

    const row = this.formasPagoRows[rowIndex];

    if (field === 'idPlanCuentas') {
      const id = Number(event.newValue ?? 0);

      // ✅ Determinar lista correcta
      const lista = this.esBancoPorForma(row)
        ? this.cuentasBancoFormateadas
        : this.cuentasFormateadas;

      const cuenta = lista.find(c => c.id === id);

      // ✅ Actualizar valores
      row.idPlanCuentas = cuenta ? cuenta.id : 0;
      row.nombreCuenta = cuenta ? cuenta.label : '';

      console.log('✅ Forma de pago:', row.descripcion);
      console.log('✅ Es banco?', this.esBancoPorForma(row));
      console.log('✅ Lista usada:', lista.length, 'cuentas');
      console.log('✅ Cuenta seleccionada:', cuenta);

      // ✅ CRÍTICO: Actualizar el array Y el grid
      this.formasPagoRows[rowIndex] = { ...row }; // Clonar fila
      this.gridApiFormasPago?.applyTransaction({
        update: [this.formasPagoRows[rowIndex]]
      });
    }

    if (field === 'monto') {
      row.monto = parseFloat(event.newValue) || 0;
      this.calcularTotales();
    }
  }
  // private showError(message: string): void {
  //   this.snackBar.open(message, 'Cerrar', {
  //     duration: 5000,
  //     panelClass: ['error-snackbar'],
  //     horizontalPosition: 'end',
  //     verticalPosition: 'top'
  //   });
  // }

  // private showSuccess(message: string): void {
  //   this.snackBar.open(message, 'Cerrar', {
  //     duration: 3000,
  //     panelClass: ['success-snackbar'],
  //     horizontalPosition: 'end',
  //     verticalPosition: 'top'
  //   });
  // }
  private showError(message: string): void {
    this.dialog.open(CustomMessageBoxComponent, {
      data: {
        title: 'Error',
        message: message,
        type: 'error',
        confirmText: 'Aceptar',
        showCancel: false
      } as MessageBoxData
    });
  }

  private showSuccess(message: string): void {
    this.dialog.open(CustomMessageBoxComponent, {
      data: {
        title: 'Éxito',
        message: message,
        type: 'success',
        confirmText: 'Aceptar',
        showCancel: false
      } as MessageBoxData
    });
  }
  private getEstado(pago: number, saldoPendiente: number): string {
    if (!pago || pago <= 0) return 'N'; // Pendiente
    if (pago >= saldoPendiente) return 'P'; // Pagado completamente
    return 'A'; // Abonado (pago parcial)
  }

  private clamp2(v: number): number {
    if (!isFinite(v) || v < 0) return 0;
    return Math.round(v * 100) / 100;
  }
  nuevoRegistro(): void {
    const dialogRef = this.dialog.open(CustomMessageBoxComponent, {
      data: {
        title: 'Confirmar',
        message: '¿Está seguro que desea iniciar un nuevo registro? Se perderán los datos actuales.',
        type: 'warning',
        confirmText: 'Sí, continuar',
        cancelText: 'Cancelar',
        showCancel: true
      } as MessageBoxData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.resetearFormulario();
        this.montoPagar = 0;
      }
    });
  }
}
