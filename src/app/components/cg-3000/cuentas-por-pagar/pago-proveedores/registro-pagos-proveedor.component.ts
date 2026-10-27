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
  // ===== TOTALES CONTABLES =====
  totalDebe = 0;      // Total del Debe
  totalHaber = 0;     // Total del Haber
  totalSaldo = 0;     // Debe - Haber (lo que realmente sale de caja)
  totalFormasPago = 0;
  diferencia = 0;
    // ===== CONTROL DE ANTICIPOS =====
  private anticiposSeleccionados = new Set<number>(); 
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
      headerCheckboxSelection: true,
      pinned: 'left'
    },
    {
      field: 'numdoc',
      headerName: '#Documento',
      width: 130
    },
    {
      field: 'fechatran',
      headerName: 'Fec. Movim.',
      width: 120,
      valueFormatter: params => this.formatDate(params.value)
    },
    {
      field: 'fechaVenc',
      headerName: 'Fec. Venc.',
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
      headerName: 'Total Doc.',
      width: 140,
      valueFormatter: params => this.formatCurrency(params.value),
      type: 'rightAligned'
    },
    // {
    //   field: 'comision',
    //   headerName: 'Comisión',
    //   width: 120,
    //   valueFormatter: params => {
    //     if (!params.value || params.value === 0) return '';
    //     return this.formatCurrency(params.value);
    //   },
    //   type: 'rightAligned'
    // },
    // {
    //   field: 'aporte',
    //   headerName: 'Aporte',
    //   width: 120,
    //   valueFormatter: params => {
    //     if (!params.value || params.value === 0) return '';
    //     return this.formatCurrency(params.value);
    //   },
    //   type: 'rightAligned'
    // },
    {
      field: 'retencionFuente',
      headerName: 'Ret. Fuente',
      width: 120,
      valueFormatter: params => {
        if (!params.value || params.value === 0) return '';
        return this.formatCurrency(params.value);
      },
      type: 'rightAligned'
    },
    {
      field: 'retencionIva',
      headerName: 'Ret. IVA',
      width: 120,
      valueFormatter: params => {
        if (!params.value || params.value === 0) return '';
        return this.formatCurrency(params.value);
      },
      type: 'rightAligned'
    },
    {
      field: 'debe',
      headerName: 'Debe',
      width: 120,
      valueFormatter: params => {
        if (!params.value || params.value === 0) return '';
        return this.formatCurrency(params.value);
      },
      type: 'rightAligned'
    },
    {
      field: 'haber',
      headerName: 'Haber',
      width: 120,
      valueFormatter: params => {
        if (!params.value || params.value === 0) return '';
        return this.formatCurrency(params.value);
      },
      type: 'rightAligned'
    },
    {
      field: 'saldoPendiente',
      headerName: 'Saldo',
      width: 140,
      valueFormatter: params => this.formatCurrency(params.value),
      type: 'rightAligned',
      cellStyle: ((params: any) => {
        const saldo = params.value || 0;
        if (saldo > 0) {
          // ANTICIPO (verde pastel)
          return { 
            fontWeight: 'bold', 
            color: '#2e7d32', 
            backgroundColor: '#c8e6c9' 
          };
        }
        // FACTURA (rojo)
        return { 
          fontWeight: 'bold', 
          color: '#d32f2f',
          backgroundColor: 'transparent'
        };
      }) as any
    },
    {
      field: '',
      headerName: '',
      width: 50,
      checkboxSelection: true,
      headerCheckboxSelection: false,
      pinned: 'right'
    },
    {
      field: 'pago',
      headerName: 'Valor a Pagar',
      width: 140,
      editable: true,
      type: 'rightAligned',
      cellStyle: { backgroundColor: '#fff9c4' },
      valueFormatter: params => this.formatCurrency(params.value),
      pinned: 'right',
      valueSetter: params => {
        const saldoPendiente = Number(params.data.saldoPendiente) || 0;
        const saldoAbsoluto = Math.abs(saldoPendiente);
        
        let newValue = parseFloat(params.newValue) || 0;
        newValue = this.clamp2(newValue);

        if (newValue < 0) {
          this.showError('El valor no puede ser negativo');
          return false;
        }

        if (newValue > saldoAbsoluto) {
          this.showError(`El valor no puede exceder $${saldoAbsoluto.toFixed(2)}`);
          return false;
        }

        params.data.pago = newValue;
        params.data.estadopago = this.getEstado(newValue, saldoAbsoluto);
        
        this.calcularTotales();

        if (params.node) {
          params.api.refreshCells({
            rowNodes: [params.node],
            columns: ['pago', 'estadopago'],
            force: true
          });
        }

        return true;
      }
    },
    {
      field: 'estadopago',
      headerName: 'Estado',
      width: 110,
      pinned: 'right',
      cellRenderer: (params: any) => {
        const badges = {
          'N': '<span class="badge-estado badge-no-pagado">No Pagado</span>',
          'A': '<span class="badge-estado badge-abonado">Abonado</span>',
          'P': '<span class="badge-estado badge-cancelado">Cancelado</span>'
        };
        return badges[params.value as keyof typeof badges] || params.value;
      }
    },
    {
      field: 'comentario',
      headerName: 'Observaciones',
      width: 200,
      editable: true
    }
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
      editable: (params) => {
        // ✅ NO editable si es "Cruce de Cuentas"
        const desc = params.data?.descripcion?.toLowerCase() || '';
        return !(desc.includes('cruce') || desc.includes('asiento'));
      },
      singleClickEdit: true,
      cellEditor: PlanCuentaCellEditorComponent,
      cellEditorPopup: true,
      cellEditorParams: (params: any) => {
        console.log('🔍 cellEditorParams descripcion:', params.data?.descripcion);
        const lista = this.esBancoPorForma(params.data)
          ? this.cuentasBancoFormateadas
          : this.cuentasFormateadas;
        console.log('🔍 lista seleccionada:', lista.length, 'cuentas');
        return { cuentas: lista };
      },
      valueFormatter: (params) => {
        const v = Number(params.value || 0);
        
        // ✅ Si es cruce, mostrar "No aplica"
        const desc = params.data?.descripcion?.toLowerCase() || '';
        if (desc.includes('cruce') || desc.includes('asiento')) {
          return 'No aplica (cruce interno)';
        }
        
        if (!v) return 'Seleccione cuenta...';

        const lista = this.esBancoPorForma(params.data)
          ? this.cuentasBancoFormateadas
          : this.cuentasFormateadas;

        const cuenta = lista.find(c => c.id === v);
        return cuenta ? cuenta.label : String(v);
      },
      cellStyle: (params) => {
        const desc = params.data?.descripcion?.toLowerCase() || '';
        if (desc.includes('cruce') || desc.includes('asiento')) {
          return { 
            backgroundColor: '#f5f5f5',  // Gris claro
            fontStyle: 'italic',
            color: '#757575'
          };
        }
        return null;
      },
      valueSetter: (params) => {
        // ✅ Si es cruce, ignorar cambios
        const desc = params.data?.descripcion?.toLowerCase() || '';
        if (desc.includes('cruce') || desc.includes('asiento')) {
          return false;  // No permitir cambios
        }

        console.log('🎯 valueSetter ejecutado:', {
          newValue: params.newValue,
          tipoNewValue: typeof params.newValue,
          oldValue: params.oldValue
        });

        const newValue = Number(params.newValue);

        if (isNaN(newValue)) {
          console.error('❌ Valor inválido recibido:', params.newValue);
          return false;
        }

        params.data.idPlanCuentas = newValue;
        console.log('✅ Valor asignado:', newValue);
        return true;
      }
    },
    {
      field: 'monto',
      headerName: 'Monto',
      width: 140,
      editable: (params) => {
        // ✅ NO editable si es "Cruce de Cuentas"
        const desc = params.data?.descripcion?.toLowerCase() || '';
        return !(desc.includes('cruce') || desc.includes('asiento'));
      },
      type: 'rightAligned',
      cellStyle: (params) => {
        const desc = params.data?.descripcion?.toLowerCase() || '';
        if (desc.includes('cruce') || desc.includes('asiento')) {
          return { 
            backgroundColor: '#e8f5e9',  // Verde claro (indica cruce)
            fontWeight: 'bold'
          };
        }
        return { 
          backgroundColor: '#fff9c4',
          fontWeight: 'normal'  // AGREGAR para que sean consistentes
        };
      },
      valueFormatter: params => this.formatCurrency(params.value),
      valueSetter: params => {
        // ✅ Bloquear edición de cruce
        const desc = params.data?.descripcion?.toLowerCase() || '';
        if (desc.includes('cruce') || desc.includes('asiento')) {
          this.showError('El monto del cruce se calcula automáticamente según los anticipos aplicados');
          return false;
        }

        let newValue = parseFloat(params.newValue) || 0;
        
        if (newValue < 0) newValue = 0;
        
        const montoActualFilas = this.formasPagoRows
          .filter(f => f.id !== params.data.id)
          .reduce((sum, f) => sum + (f.monto || 0), 0);
        
        const disponible = this.totalSaldo - montoActualFilas;
        
        if (newValue > disponible) {
          newValue = disponible;
          this.showSuccess(`Ajustado a $${disponible.toFixed(2)} (máximo disponible)`);
        }
        
        const valorFinal = this.clamp2(newValue);
        params.data.monto = valorFinal;
        
        const index = this.formasPagoRows.findIndex(f => f.id === params.data.id);
        if (index !== -1) {
          this.formasPagoRows[index] = { ...params.data };
        }
        
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
    this.calcularTotales(); 
  }
  private getIdCodigoEspecial(c: any): number {
    return Number(c?.IdCodigoEspecial ?? c?.idCodigoEspecial ?? 0);
  }

  private esBancoPorForma(row?: FormaPagoRow): boolean {
    const d = (row?.descripcion ?? '').toLowerCase();
      return d.includes('cheque') || d.includes('transfer');
  }
  private cargarCuentasContables(): void {
    this.planCuentasService.getAll({ idEmpresa: this.idEmpresa }).subscribe({
      next: (cuentas) => {
        this.cuentasDisponibles = (cuentas || []).filter(c => c.EsMovimiento);

        // ✅ Solo cuentas 110102-xxx (Bancos reales)
        this.cuentasBancoFormateadas = this.cuentasDisponibles
          .filter(c => (c.CuentaPresentacion || '').startsWith('110102'))
          .map(c => ({
            id: Number(c.IdPlanCuentas),
            label: `${c.CuentaPresentacion} - ${c.NombreCuenta}`,
            codigo: c.CuentaPresentacion
          }));

        // ✅ Todo lo demás (NO bancos)
        this.cuentasFormateadas = this.cuentasDisponibles
          .filter(c => !(c.CuentaPresentacion || '').startsWith('110102'))
          .map(c => ({
            id: Number(c.IdPlanCuentas),
            label: `${c.CuentaPresentacion} - ${c.NombreCuenta}`,
            codigo: c.CuentaPresentacion
          }));
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
        return formas.filter(f => f.activo === true);
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

    const esCruce = forma.descripcion.toLowerCase().includes('cruce') ||
                    forma.descripcion.toLowerCase().includes('asiento');

    // ✅ Calcular monto inicial según tipo
    let montoInicial = 0;
    
    if (!esCruce && !this.tieneAnticiposAplicados) {
      // ✅ AUTO-ASIGNAR: Si NO es cruce Y NO hay anticipos, poner el saldo pendiente
      montoInicial = this.totalSaldo;
    }

    const nuevaForma: FormaPagoRow = {
      id: Date.now(),
      idFormaPago: forma.idFormaPagoCg,
      descripcion: forma.descripcion,
      monto: montoInicial,
      idPlanCuentas: 0,
      nombreCuenta: '',
      idCodContable: undefined
    };

    this.formasPagoRows.push(nuevaForma);
    this.gridApiFormasPago?.applyTransaction({ add: [nuevaForma] });
    
    // ✅ Solo calcular si NO es cruce vacío
    if (!esCruce || this.tieneAnticiposAplicados) {
      this.calcularTotales();
    }
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
      montoPagar: [0],
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

    if (!this.formaPagoSeleccionada) {
      return;
    }

    // ✅ Detectar si es "Cruce de Cuentas"
    const esCruce = this.formaPagoSeleccionada.descripcion.toLowerCase().includes('cruce') ||
                    this.formaPagoSeleccionada.descripcion.toLowerCase().includes('asiento');

    // ✅ Calcular monto según tipo
    let montoInicial = 0;
    
    if (esCruce) {
      montoInicial = 0;
    }

    const nuevaForma: FormaPagoRow = {
      id: Date.now(),
      idFormaPago: this.formaPagoSeleccionada.idFormaPagoCg,
      descripcion: this.formaPagoSeleccionada.descripcion,
      monto: montoInicial,  // ✅ Auto-asigna si es cruce
      idPlanCuentas: 0,
      nombreCuenta: '',
      idCodContable: undefined
    };

    this.formasPagoRows.push(nuevaForma);
    this.gridApiFormasPago?.applyTransaction({ add: [nuevaForma] });
    this.calcularTotales();

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
          this.calcularTotales(); 
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
    if (this.montoPagar <= 0) {
      this.showError('Debe ingresar un monto a pagar mayor a 0');
      return;
    }

    // ✅ NO usar selectAll() - trabajar directamente con las filas
    // ✅ SOLO tomar FACTURAS (saldo < 0), NO anticipos (saldo > 0)
    const todasLasFacturas = this.facturasRows.filter(f => f.saldoPendiente < 0);

    if (todasLasFacturas.length === 0) {
      this.showError('No hay facturas disponibles para distribuir el pago');
      return;
    }

    // ✅ Calcular total de facturas
    const totalSaldosFacturas = todasLasFacturas.reduce((sum, f) => sum + Math.abs(f.saldoPendiente), 0);

    // ✅ Distribuir proporcionalmente SOLO entre facturas
    todasLasFacturas.forEach(factura => {
      const saldoAbsoluto = Math.abs(factura.saldoPendiente);
      const proporcion = saldoAbsoluto / totalSaldosFacturas;
      
      factura.pago = this.clamp2(Math.min(this.montoPagar * proporcion, saldoAbsoluto));
      factura.estadopago = this.getEstado(factura.pago, saldoAbsoluto);
    });

    // ✅ Actualizar SOLO las facturas modificadas (sin tocar anticipos)
    this.gridApiFacturas.applyTransaction({ update: todasLasFacturas });
    this.calcularTotales();
    
    this.showSuccess(`Distribuido $${this.montoPagar.toFixed(2)} entre ${todasLasFacturas.length} factura(s)`);
  }
  get montoRestante(): number {
    const montoAsignado = this.facturasRows
      .filter(f => f.saldoPendiente < 0) // Solo facturas
      .reduce((sum, f) => sum + (f.pago || 0), 0);
    
    return Math.max(0, this.clamp2(this.montoPagar - montoAsignado));
  }
  limpiarPagos(): void {
    this.facturasRows.forEach(factura => {
      factura.pago = 0;
      factura.estadopago = 'N';
    });
    this.montoPagar = 0;
    this.anticiposSeleccionados.clear();  // ✅ Limpiar Set
    this.gridApiFacturas.deselectAll();   // ✅ Deseleccionar todo
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
    // ===== TOTALES DE DOCUMENTOS DISPONIBLES (para mostrar siempre) =====
    const todasLasFacturas = this.facturasRows.filter(f => f.saldoPendiente < 0);
    const todosLosAnticipos = this.facturasRows.filter(f => f.saldoPendiente > 0);
    
    const totalDebeDisponible = todosLosAnticipos.reduce((sum, a) => sum + Math.abs(a.saldoPendiente), 0);
    const totalHaberDisponible = todasLasFacturas.reduce((sum, f) => sum + Math.abs(f.saldoPendiente), 0);
    
    // ===== TOTALES DE DOCUMENTOS CON PAGO ASIGNADO =====
    const docsConPago = this.facturasRows.filter(f => f.pago > 0);
    const facturasConPago = docsConPago.filter(f => f.saldoPendiente < 0);
    const anticiposConPago = docsConPago.filter(f => f.saldoPendiente > 0);
    
    const debePagado = anticiposConPago.reduce((sum, a) => sum + a.pago, 0);
    const haberPagado = facturasConPago.reduce((sum, f) => sum + f.pago, 0);
    
    // ===== DECIDIR QUÉ MOSTRAR =====
    if (docsConPago.length > 0) {
      // Si hay documentos con pago → mostrar SOLO lo que va a pagar
      this.totalDebe = debePagado;
      this.totalHaber = haberPagado;
      this.totalSaldo = haberPagado - debePagado;
    } else {
      // Si NO hay documentos con pago → mostrar debe/haber reales de los documentos
      this.totalDebe = this.facturasRows.reduce((sum, f) => sum + (f.debe || 0), 0);
      this.totalHaber = this.facturasRows.reduce((sum, f) => sum + (f.haber || 0), 0);
      this.totalSaldo = this.totalHaber - this.totalDebe;
    }
    
    this.totalFormasPago = this.formasPagoRows.reduce((sum, f) => sum + (f.monto || 0), 0);
    
    this.diferencia = this.totalSaldo - this.totalFormasPago;

    // Diferencia
    const hayCruce = this.formasPagoRows.some(f => 
      f.descripcion.toLowerCase().includes('cruce') || 
      f.descripcion.toLowerCase().includes('asiento')
    );

    if (hayCruce) {
      const totalAnticiposAplicados = this.facturasRows
        .filter(f => f.saldoPendiente > 0 && f.pago > 0)
        .reduce((sum, a) => sum + a.pago, 0);
      
      //Si NO hay anticipos, usar lógica normal
      if (totalAnticiposAplicados > 0) {
        this.diferencia = totalAnticiposAplicados - this.totalFormasPago;
      } else {
        this.diferencia = this.totalSaldo - this.totalFormasPago;
      }
    } else {
      this.diferencia = this.totalSaldo - this.totalFormasPago;
    }
    
    console.log('📊 Totales actualizados:', {
      documentosConPago: docsConPago.length,
      debe: this.totalDebe,
      haber: this.totalHaber,
      saldo: this.totalSaldo,
      formasPago: this.totalFormasPago,
      diferencia: this.diferencia
    });
  }

  
  filtrarFormasPago(formas: FormaPagoCgResponse[] | null): FormaPagoCgResponse[] {
    if (!formas) return [];
    return formas.filter(f => 
      !f.descripcion.toLowerCase().includes('cruce') &&
      !f.descripcion.toLowerCase().includes('asiento')
    );
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
  get totalAnticiposAplicados(): number {
    return this.facturasRows
      .filter(f => f.saldoPendiente > 0 && f.pago > 0)
      .reduce((sum, f) => sum + f.pago, 0);
  }
  get pagoValido(): boolean {
    return Math.abs(this.diferencia) < 0.01 &&
          this.totalSaldo >= 0 &&
          this.formasPagoRows.length > 0 ||
          (this.tieneAnticiposAplicados && this.totalSaldo === 0);
  }
  // ===== NAVEGACIÓN STEPPER =====
  avanzarPaso2(): void {
    // ✅ Validación: si hay anticipos con pago, debe haber al menos una factura
    const hayAnticiposConPago = this.facturasRows.some(f => f.saldoPendiente > 0 && f.pago > 0);
    const hayFacturasConPago = this.facturasRows.some(f => f.saldoPendiente < 0 && f.pago > 0);

    if (hayAnticiposConPago && !hayFacturasConPago) {
      this.showError('No puede aplicar un anticipo sin tener facturas seleccionadas para cruzar');
      return;
    }
    // ✅ Validar que hay al menos una factura con monto
    if (this.totalFacturasConPago === 0) {
      this.showError('Debe asignar un monto a pagar en al menos una factura o seleccionar documentos con el checkbox');
      return;
    }

    // ✅ NUEVA VALIDACIÓN: Si hay anticipos, verificar que haya cruce o que esté balanceado
    const hayAnticipos = this.facturasRows.some(f => f.saldoPendiente > 0 && f.pago > 0);
    const hayCruce = this.formasPagoRows.some(f => 
      f.descripcion.toLowerCase().includes('cruce') || 
      f.descripcion.toLowerCase().includes('asiento')
    );


    // ✅ Validar beneficiario
    if (!this.paso1Form.get('beneficiario')?.value) {
      this.showError('El beneficiario es obligatorio');
      return;
    }

    // ✅ RECALCULAR totales antes de avanzar
    this.calcularTotales();
    
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
    const hayAnticiposAplicados = this.facturasRows.some(f => 
      f.saldoPendiente > 0 && f.pago > 0
    );

    // Validar que todas las formas de pago tengan cuenta contable
    const formasSinCuenta = this.formasPagoRows.filter(f => {
      const esCruce = f.descripcion.toLowerCase().includes('cruce') || 
                      f.descripcion.toLowerCase().includes('asiento');
      
      // Si NO es cruce, validar que tenga cuenta
      return !esCruce && (!f.idPlanCuentas || f.idPlanCuentas === 0);
    });

    if (formasSinCuenta.length > 0) {
      this.showError('Todas las formas de pago (excepto cruce) deben tener una cuenta contable asignada');
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

    //SEPARAR FACTURAS Y ANTICIPOS
    const facturasParaPagar = this.facturasRows
      .filter(f => f.pago > 0 && f.saldoPendiente < 0);  // Solo facturas (saldo negativo)
    
    const anticiposAplicados = this.facturasRows
      .filter(f => f.pago > 0 && f.saldoPendiente > 0);  // Solo anticipos (saldo positivo)

    //MAPEAR FACTURAS
    const facturas: FacturaPagoItem[] = facturasParaPagar.map(f => ({
      idCuentaPorPagar: f.idCuentaPorPagar,
      nocomp: f.nocomp,
      montoPagar: f.pago,
      idPlanCuentasCxP: f.idPlanCuentas,
      idCodContableCxP: f.codigoContable,
      idTipComp: 1
    }));

    //MAPEAR ANTICIPOS
    const anticipos: FacturaPagoItem[] = anticiposAplicados.map(a => ({
      idCuentaPorPagar: a.idCuentaPorPagar,
      nocomp: a.nocomp,
      montoPagar: a.pago,
      idPlanCuentasCxP: a.idPlanCuentas,
      idCodContableCxP: a.codigoContable,
      idTipComp: 1
    }));

    //COMBINAR TODOS LOS DOCUMENTOS
    const todosLosDocumentos = [...facturas, ...anticipos];

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
      facturas: todosLosDocumentos,  // ✅ Enviar facturas + anticipos
      formasPago: formasPago
    };

    this.guardando = true;
    this.pagoProveedorService.registrarPago(request).subscribe({
      next: (response) => {
        loadingDialog.close();

        if (response.type === 'CREATED') {
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
        this.guardando = false;
      },
      error: (err) => {
        loadingDialog.close();
        this.showError('Error de conexión al guardar el pago');
        this.guardando = false;
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
    const rowId = event.data?.id;
    const index = this.formasPagoRows.findIndex(f => f.id === rowId);

    if (!field || index === -1) return;

    // ✅ Usar event.data directamente (tiene la descripcion correcta del grid)
    const rowData = event.data;  // <-- este es el que tiene 'Transferencia Bancaria'
    const row = this.formasPagoRows[index];

    if (field === 'idPlanCuentas') {
      const id = Number(event.newValue ?? 0);

      // ✅ Usar rowData (event.data) en lugar de row para el chequeo
      console.log('🔍 descripcion para esBanco:', rowData.descripcion);
      
      const lista = this.esBancoPorForma(rowData)
        ? this.cuentasBancoFormateadas
        : this.cuentasFormateadas;

      const cuenta = lista.find(c => c.id === id);

      row.idPlanCuentas = cuenta ? cuenta.id : 0;
      row.nombreCuenta = cuenta ? cuenta.label : '';

      this.formasPagoRows[index] = { ...row };
      this.gridApiFormasPago?.applyTransaction({
        update: [this.formasPagoRows[index]]
      });
    }

    if (field === 'monto') {
      row.monto = parseFloat(event.newValue) || 0;
      this.calcularTotales();
    }
  }

  // Selecciona facturas

  onFacturaSeleccionada(event: any): void {
    const doc = event.data as FacturaRow;
    const isSelected = event.node.isSelected();
    const saldoAbsoluto = Math.abs(doc.saldoPendiente);
    const idDocumento = doc.idCuentaPorPagar;
    
    if (!isSelected) {
      // ✅ DESELECCIONADO
      if (doc.saldoPendiente > 0) {
        // Es anticipo → remover del Set
        this.anticiposSeleccionados.delete(idDocumento);
      }
      
      doc.pago = 0;
      doc.estadopago = 'N';
      
      this.gridApiFacturas.refreshCells({
        rowNodes: [event.node],
        columns: ['pago', 'estadopago'],
        force: true
      });
      
      // ✅ RECALCULAR TODO desde cero
      this.recalcularAnticiposYDistribuir();
      return;
    }

    // ✅ SELECCIONADO
    if (doc.saldoPendiente > 0) {
      // Es ANTICIPO
      if (this.anticiposSeleccionados.has(idDocumento)) {
        // Ya estaba seleccionado, no hacer nada
        return;
      }
      
      this.anticiposSeleccionados.add(idDocumento);
      doc.pago = saldoAbsoluto;
      doc.estadopago = 'P';
      
      console.log(`✅ Anticipo agregado: $${saldoAbsoluto}`);
      
    } else {
      // Es FACTURA
      doc.pago = saldoAbsoluto;
      doc.estadopago = 'P';
    }

    // Actualizar grid
    this.gridApiFacturas.refreshCells({
      rowNodes: [event.node],
      columns: ['pago', 'estadopago'],
      force: true
    });
    
    // ✅ RECALCULAR TODO
    this.recalcularAnticiposYDistribuir();
  }
  
  //Recalcular anticipos y redistribuir
  private recalcularAnticiposYDistribuir(): void {
    // 1. Obtener anticipos CON PAGO (no importa si están seleccionados o no)
    const anticiposConPago = this.facturasRows.filter(f => 
      f.saldoPendiente > 0 && f.pago > 0
    );
    
    // 2. Si NO hay anticipos con pago, usar comportamiento normal
    if (anticiposConPago.length === 0) {
      // Sin anticipos → solo asignar valor completo a facturas seleccionadas
      const facturasSeleccionadas = this.facturasRows.filter(f => 
        f.saldoPendiente < 0 && 
        this.gridApiFacturas.getSelectedNodes().some(n => n.data.idCuentaPorPagar === f.idCuentaPorPagar)
      );
      
      facturasSeleccionadas.forEach(factura => {
        const saldoFactura = Math.abs(factura.saldoPendiente);
        factura.pago = saldoFactura;
        factura.estadopago = 'P';
      });
      
      this.gridApiFacturas.applyTransaction({ update: facturasSeleccionadas });
      this.calcularTotales();
      return;
    }
    
    // 3. SI hay anticipos con pago → calcular total
    const totalAnticipos = anticiposConPago.reduce((sum, a) => sum + a.pago, 0);
    
    // Asegurar que anticipos estén marcados correctamente
    anticiposConPago.forEach(a => {
      const saldoAnticipo = Math.abs(a.saldoPendiente);
      a.estadopago = a.pago >= saldoAnticipo ? 'P' : 'A';
    });
    
    // 4. Obtener facturas seleccionadas
    const facturasSeleccionadas = this.facturasRows.filter(f => 
      f.saldoPendiente < 0 && 
      this.gridApiFacturas.getSelectedNodes().some(n => n.data.idCuentaPorPagar === f.idCuentaPorPagar)
    );
    
    // 5. Distribuir anticipos entre facturas
    let anticipoRestante = totalAnticipos;
    
    // facturasSeleccionadas.forEach(factura => {
    //   const saldoFactura = Math.abs(factura.saldoPendiente);
      
    //   if (anticipoRestante > 0) {
    //     if (anticipoRestante >= saldoFactura) {
    //       // El anticipo cubre toda la factura
    //       factura.pago = saldoFactura;
    //       factura.estadopago = 'P';
    //       anticipoRestante -= saldoFactura;
    //     } else {
    //       // El anticipo cubre parcialmente
    //       factura.pago = anticipoRestante;
    //       factura.estadopago = 'A';
    //       anticipoRestante = 0;
    //     }
    //   } else {
    //     // Sin anticipo → no asignar nada (mantener lo que tenía)
    //     // O si prefieres asignar el saldo completo, descomenta:
    //     // factura.pago = saldoFactura;
    //     // factura.estadopago = 'P';
    //   }
    // });
    facturasSeleccionadas.forEach(factura => {
      const saldoFactura = Math.abs(factura.saldoPendiente);
      // ✅ SIEMPRE el saldo completo, sin importar el anticipo
      factura.pago = saldoFactura;
      factura.estadopago = 'P';
    });
    // 6. Actualizar grid
    this.gridApiFacturas.applyTransaction({ 
      update: [...anticiposConPago, ...facturasSeleccionadas] 
    });
    
    // 7. Calcular totales
    this.calcularTotales();
    
    console.log('📊 Distribución completada. Anticipo restante:', anticipoRestante);
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

  get anticipoDisponible(): number {
    const totalAnticipos = this.facturasRows
      .filter(f => f.saldoPendiente > 0 && f.pago > 0)
      .reduce((sum, a) => sum + a.pago, 0);
    
    const totalFacturas = this.facturasRows
      .filter(f => f.saldoPendiente < 0 && f.pago > 0)
      .reduce((sum, f) => sum + f.pago, 0);
    
    return Math.max(0, totalAnticipos - totalFacturas);
  }
  get tieneCruceReal(): boolean {
    const hayAnticiposConPago = this.facturasRows.some(f => f.saldoPendiente > 0 && f.pago > 0);
    const hayFacturasConPago = this.facturasRows.some(f => f.saldoPendiente < 0 && f.pago > 0);
    return hayAnticiposConPago && hayFacturasConPago;
  }
  get totalFacturasCruzadas(): number {
    return this.facturasRows.filter(f => f.saldoPendiente < 0 && f.pago > 0).length;
  }
  get tieneAnticiposAplicados(): boolean {
    return this.facturasRows.some(f => f.saldoPendiente > 0 && f.pago > 0);
  }
  get montoCruzadoEnFacturas(): number {
    return this.facturasRows
      .filter(f => f.saldoPendiente < 0 && f.pago > 0)
      .reduce((sum, f) => sum + f.pago, 0);
  }



  // ✅ SALDO: Lo que realmente sale de caja (Haber - Debe)
  get saldoAPagar(): number {
    return this.totalHaber - this.totalDebe;
  }
  
}
