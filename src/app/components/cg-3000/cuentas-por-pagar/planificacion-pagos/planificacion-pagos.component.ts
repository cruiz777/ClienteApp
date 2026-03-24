import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar'; 
import { Router } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { Observable, debounceTime, distinctUntilChanged, switchMap, of, map } from 'rxjs';

// Services
import { PlanificacionPagoService } from 'src/app/services/planificacion-pago.service';
import { UsuarioService } from 'src/app/services/usuario.service';
import { FormaPagoCgService } from 'src/app/services/forma-pago-cg.service';
import { PlanCuentasService, PlanCuenta } from 'src/app/services/plan-cuentas.service';
import { PagoProveedorService } from 'src/app/services/pago-proveedor.service';

// Interfaces
import { DocumentoPendienteResponse } from 'src/app/interfaces/responses/planificacion-pago-response';

import { LoginUsuarioResponse } from 'src/app/interfaces/responses/usuario-log-response';
import { FormaPagoCgResponse } from 'src/app/interfaces/responses/formapagocg-response';
import { CodigoContableSummaryResponse } from 'src/app/interfaces/responses/pago-proveedor-response';

// Components
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/components/utils/messages/custom-message-box.component';
import { DocumentoPagoRequest, DocumentoPendienteRequest, ProcesarPagoRequest } from 'src/app/interfaces/requests/planificacion-pago-response';

@Component({
  selector: 'app-planificacion-pagos',
  templateUrl: './planificacion-pagos.component.html',
  styleUrls: ['./planificacion-pagos.component.scss'],
  encapsulation: ViewEncapsulation.None 
})
export class PlanificacionPagosComponent implements OnInit {
  @ViewChild('gridDocumentos') gridDocumentos!: AgGridAngular;
  
  Math = Math;

  // ===== FORMULARIOS =====
  filtrosForm!: FormGroup;
  datosPagoForm!: FormGroup;

  // ===== AUTOCOMPLETE PROVEEDOR =====
  proveedorCtrl = this.fb.control('');
  proveedoresFiltrados$!: Observable<CodigoContableSummaryResponse[]>;
  proveedorSeleccionado: CodigoContableSummaryResponse | null = null;

  // ===== CUENTAS CONTABLES (FILTRO MULTISELECCIÓN) =====
  cuentasContablesDisponibles: Array<{ codigo: string; nombre: string; seleccionado: boolean }> = [];
  mostrarFiltroCuentas = false;

  // ===== FORMAS DE PAGO =====
  formasPagoDisponibles$!: Observable<FormaPagoCgResponse[]>;
  
  // ===== CUENTAS BANCO (PARA DROPDOWN) =====
  cuentasBancoFormateadas: Array<{ id: number; label: string; codigo: string }> = [];

  // ===== GRID =====
  documentosRows: DocumentoPendienteResponse[] = [];
  private gridApiDocumentos!: GridApi;

  // ===== COLUMNAS AG-GRID =====
  columnDefsDocumentos: ColDef[] = [
    {
      field: 'seleccionado',
      headerName: '',
      width: 50,
      checkboxSelection: true,
      headerCheckboxSelection: true,
      editable: false
    },
    {
      field: 'id_proveedor',
      headerName: 'Cód. Prov',
      width: 100,
      editable: false
    },
    {
      field: 'nombre_proveedor',
      headerName: 'Proveedor',
      width: 220,
      editable: false
    },
    {
      field: 'descripcion_tipo_movimiento',
      headerName: 'Tipo Movimiento',
      width: 150,
      editable: false
    },
    {
      field: 'numero_comprobante',
      headerName: 'No. Comprobante',
      width: 140,
      editable: false
    },
    {
      field: 'fecha_transaccion',
      headerName: 'Fecha Movim.',
      width: 120,
      valueFormatter: params => this.formatDate(params.value),
      editable: false
    },
    {
      field: 'fecha_vencimiento',
      headerName: 'Fecha Venc.',
      width: 120,
      valueFormatter: params => this.formatDate(params.value),
      cellStyle: params => {
        if (params.data?.esta_vencido) {
          return { backgroundColor: '#ffebee', color: '#c62828' };
        }
        return null;
      },
      editable: false
    },
    {
      field: 'total_documento',
      headerName: 'Total Doc.',
      width: 120,
      valueFormatter: params => this.formatCurrency(params.value),
      type: 'rightAligned',
      editable: false
    },
    {
      field: 'comision',
      headerName: 'Comisión',
      width: 100,
      valueFormatter: params => this.formatCurrency(params.value),
      type: 'rightAligned',
      editable: false
    },
    {
      field: 'aporte',
      headerName: 'Aporte',
      width: 100,
      valueFormatter: params => this.formatCurrency(params.value),
      type: 'rightAligned',
      editable: false
    },
    {
      field: 'retencion_fuente',
      headerName: 'Retenc. Fuente',
      width: 120,
      valueFormatter: params => this.formatCurrency(params.value),
      type: 'rightAligned',
      editable: false
    },
    {
      field: 'retencion_iva',
      headerName: 'Retenc. IVA',
      width: 120,
      valueFormatter: params => this.formatCurrency(params.value),
      type: 'rightAligned',
      editable: false
    },
    {
      field: 'debe',
      headerName: 'Debe',
      width: 120,
      valueFormatter: params => this.formatCurrency(params.value),
      type: 'rightAligned',
      editable: false
    },
    {
      field: 'haber',
      headerName: 'Haber',
      width: 120,
      valueFormatter: params => this.formatCurrency(params.value),
      type: 'rightAligned',
      editable: false
    },
    {
      field: 'saldo',
      headerName: 'Saldo',
      width: 120,
      valueFormatter: params => this.formatCurrency(params.value),
      type: 'rightAligned',
      cellStyle: { fontWeight: 'bold', color: '#d32f2f' },
      editable: false
    },
    {
      field: 'tipo_pago_seleccionado',
      headerName: 'Tipo Pago',
      width: 120,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['P', 'A', 'N']
      },
      cellRenderer: (params: any) => {
        const badges: any = {
          'P': '<span class="badge-estado badge-cancelado">PAGADO</span>',
          'A': '<span class="badge-estado badge-abonado">ABONADO</span>',
          'N': '<span class="badge-estado badge-no-pagado">NINGUNO</span>'
        };
        return badges[params.value] || params.value || '';
      },
      valueSetter: params => {
        const newValue = params.newValue;
        if (!['P', 'A', 'N'].includes(newValue)) {
          return false;
        }
        params.data.tipo_pago_seleccionado = newValue;
        
        // Auto-ajustar monto según tipo
        if (newValue === 'P') {
          params.data.monto_a_pagar = params.data.saldo;
        } else if (newValue === 'N') {
          params.data.monto_a_pagar = 0;
        }
        
        this.calcularTotales();
        return true;
      }
    },
    {
        field: 'monto_a_pagar',
        headerName: 'Valor a Pagar',
        width: 140,
        editable: true,
        type: 'rightAligned',
        cellStyle: { backgroundColor: '#fff9c4' },
        valueFormatter: params => this.formatCurrency(params.value),
        valueSetter: params => {
            // ⚡ CLAVE: El saldo es NEGATIVO (-262), pero el pago es POSITIVO (262)
            const saldoNegativo = Number(params.data.saldo) || 0;
            const saldoMaximo = Math.abs(saldoNegativo); // ✅ Convertir a positivo
            
            let newValue = parseFloat(params.newValue) || 0;
            
            // ✅ No permitir negativos
            if (newValue < 0) {
                newValue = 0;
            }
            
            // ✅ AUTO-AJUSTE: Si es mayor al saldo, tomar solo el saldo máximo
            if (newValue > saldoMaximo) {
                newValue = saldoMaximo;
                this.showSuccess(`Ajustado automáticamente a $${saldoMaximo.toFixed(2)} (saldo máximo)`);
            }

            newValue = this.clamp2(newValue);
            params.data.monto_a_pagar = newValue;
            
            // Auto-ajustar tipo de pago
            if (newValue === 0) {
                params.data.tipo_pago_seleccionado = 'N';
            } else if (newValue >= saldoMaximo) {
                params.data.tipo_pago_seleccionado = 'P';
            } else {
                params.data.tipo_pago_seleccionado = 'A';
            }

            this.calcularTotales();
            
            if (params.node) {
                params.api.refreshCells({
                    rowNodes: [params.node],
                    columns: ['tipo_pago_seleccionado'],
                    force: true
                });
            }

            return true;
        }
    },
    {
      field: 'exceso',
      headerName: 'Exceso',
      width: 100,
      valueFormatter: params => this.formatCurrency(params.value),
      type: 'rightAligned',
      editable: false
    },
    {
      field: 'observaciones',
      headerName: 'Observaciones',
      width: 200,
      editable: true
    }
  ];

  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true
  };

  // ===== TOTALES =====
  totalDocumentosSeleccionados = 0;
  totalAPlanificar = 0;
    totalMarcado = 0;      
    totalSaldoTotal = 0;
    totalPendiente = 0; 
    diferencia = 0;

  // ===== ESTADO =====
  cargandoDocumentos = false;
  guardando = false;

  // ===== DATOS DE SESIÓN =====
  idEmpresa!: number;
  idUsuario!: number;
  idZona = 1;
  usuarioActual: LoginUsuarioResponse | null = null;

  constructor(
    private fb: FormBuilder,
    private planificacionService: PlanificacionPagoService,
    private pagoProveedorService: PagoProveedorService,
    private usuarioService: UsuarioService,
    private formaPagoCgService: FormaPagoCgService,
    private planCuentasService: PlanCuentasService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar 
  ) {}

  ngOnInit(): void {
    this.cargarDatosUsuario();
    this.initForms();
    this.initAutocompleteProveedor();
    this.initFormasPago();
    this.cargarCuentasContables();
  }

  // ===== INICIALIZACIÓN =====
  private cargarDatosUsuario(): void {
    this.usuarioActual = this.usuarioService.getUsuarioActual();

    if (!this.usuarioActual) {
      this.showError('Sesión expirada. Por favor inicie sesión nuevamente.');
      this.router.navigate(['/login']);
      return;
    }

    this.idEmpresa = this.usuarioActual.id_empresa;
    this.idUsuario = this.usuarioActual.id_usuario;
    this.idZona = 1;

    console.log('✅ Datos de sesión cargados:', {
      idEmpresa: this.idEmpresa,
      idUsuario: this.idUsuario,
      usuario: this.usuarioActual.nombre_usuario
    });
  }

  private initForms(): void {
    this.filtrosForm = this.fb.group({
      proveedor: [''],
      fechaVencimientoHasta: ['']
    });

    this.datosPagoForm = this.fb.group({
      fechaPago: ['', Validators.required],
      fechaVencimiento: [''],
      idFormaPago: ['', Validators.required],
      cuentaBanco: ['', Validators.required],
      observacion: ['']
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

  private initFormasPago(): void {
    this.formasPagoDisponibles$ = this.formaPagoCgService.getAll({
      idEmpresa: this.idEmpresa
    }).pipe(
      map(formas => formas.filter(f => f.activo !== false))
    );
  }

  private cargarCuentasContables(): void {
    this.planCuentasService.getAll({ idEmpresa: this.idEmpresa }).subscribe({
      next: (cuentas) => {
        const cuentasMovimiento = (cuentas || []).filter(c => c.EsMovimiento);

        // ✅ Cuentas BANCO (para dropdown de cuenta banco)
        const bancos = cuentasMovimiento.filter(c => this.getIdCodigoEspecial(c) === 4);
        this.cuentasBancoFormateadas = bancos.map(c => ({
          id: Number(c.IdPlanCuentas),
          label: `${c.CuentaPresentacion} - ${c.NombreCuenta}`,
          codigo: c.CuentaPresentacion
        }));

        // ✅ Cuentas para filtro multiselección (TODAS las cuentas de proveedores)
        // Ajusta el filtro según tu lógica de negocio
        this.cuentasContablesDisponibles = cuentasMovimiento
          .filter(c => c.CuentaPresentacion.startsWith('2')) // Ejemplo: cuentas que empiezan con 2
          .map(c => ({
            codigo: c.CuentaPresentacion,
            nombre: c.NombreCuenta,
            seleccionado: false
          }));

        console.log('✅ Cuentas banco:', this.cuentasBancoFormateadas.length);
        console.log('✅ Cuentas filtro:', this.cuentasContablesDisponibles.length);
      }
    });
  }

  private getIdCodigoEspecial(c: any): number {
    return Number(c?.IdCodigoEspecial ?? c?.idCodigoEspecial ?? 0);
  }

  // ===== EVENTOS AG-GRID =====
  onGridDocumentosReady(params: GridReadyEvent): void {
    this.gridApiDocumentos = params.api;
    this.gridApiDocumentos.sizeColumnsToFit();
  }

  // ===== AUTOCOMPLETE =====
  displayProveedor(proveedor: CodigoContableSummaryResponse | null): string {
    if (!proveedor) return '';
    return `${proveedor.identificacion} - ${proveedor.nombre}`;
  }

  onProveedorSeleccionado(event: MatAutocompleteSelectedEvent): void {
    this.proveedorSeleccionado = event.option.value;
  }

  // ===== FILTRO CUENTAS CONTABLES =====
  toggleFiltroCuentas(): void {
    this.mostrarFiltroCuentas = !this.mostrarFiltroCuentas;
  }

  get cuentasSeleccionadas(): string[] {
    return this.cuentasContablesDisponibles
      .filter(c => c.seleccionado)
      .map(c => c.codigo);
  }

  // ===== CARGAR DOCUMENTOS =====
  buscarDocumentos(): void {
    this.cargandoDocumentos = true;

    const request: DocumentoPendienteRequest = {
      id_empresa: this.idEmpresa,
      id_proveedor: this.proveedorSeleccionado?.idCodContable,
      fecha_vencimiento_hasta: this.filtrosForm.value.fechaVencimientoHasta || undefined,
      cuentas_contables: this.cuentasSeleccionadas.length > 0 ? this.cuentasSeleccionadas : undefined
    };

    this.planificacionService.getDocumentosPendientes(request).subscribe({
      next: (response) => {
        if (response.type === 'LIST' && response.data) {
          this.documentosRows = response.data.map(d => ({
            ...d,
            seleccionado: false,
            tipo_pago_seleccionado: null,
            monto_a_pagar: 0,
            exceso: null,
            observaciones: null
          }));
          
          this.gridApiDocumentos?.setGridOption('rowData', this.documentosRows);
          this.calcularTotales();
          
          console.log(`✅ ${response.data.length} documentos cargados`);
        } else {
          this.showError(response.message || 'Error al cargar documentos');
        }
        this.cargandoDocumentos = false;
      },
      error: (err) => {
        console.error('❌ Error al cargar documentos:', err);
        this.showError('Error de conexión al cargar documentos');
        this.cargandoDocumentos = false;
      }
    });
  }

  // ===== CÁLCULOS =====
  private calcularTotales(): void {
    const seleccionados = this.documentosRows.filter(d => 
      d.seleccionado || (d.monto_a_pagar && d.monto_a_pagar > 0)
    );
    
    this.totalDocumentosSeleccionados = seleccionados.length;
    this.totalAPlanificar = seleccionados.reduce((sum, d) => sum + (d.monto_a_pagar || 0), 0);
    this.totalMarcado = seleccionados.reduce((sum, d) => sum + (d.saldo || 0), 0);
    this.totalSaldoTotal = this.documentosRows.reduce((sum, d) => sum + (d.saldo || 0), 0);
    this.totalPendiente = this.totalMarcado - this.totalAPlanificar;
    this.diferencia = this.totalAPlanificar - this.totalMarcado;
  }

  // ===== PLANIFICAR PAGO =====
  planificarPago(): void {
    // Validar formulario
    if (!this.datosPagoForm.valid) {
      this.showError('Complete todos los campos obligatorios (Fecha Pago, Forma Pago, Cuenta Banco)');
      return;
    }

    // Validar documentos seleccionados
    const documentosAPagar = this.documentosRows.filter(d => 
      d.monto_a_pagar && d.monto_a_pagar > 0 && d.tipo_pago_seleccionado
    );

    if (documentosAPagar.length === 0) {
      this.showError('Seleccione al menos un documento con monto a pagar');
      return;
    }

    // Confirmar planificación
    const dialogRef = this.dialog.open(CustomMessageBoxComponent, {
      data: {
        title: 'Confirmar Planificación',
        message: `¿Desea planificar el pago de ${documentosAPagar.length} documento(s) por un total de $${this.totalAPlanificar.toFixed(2)}?`,
        type: 'warning',
        confirmText: 'Sí, planificar',
        cancelText: 'Cancelar',
        showCancel: true
      } as MessageBoxData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.ejecutarPlanificacion(documentosAPagar);
      }
    });
  }

  private ejecutarPlanificacion(documentos: DocumentoPendienteResponse[]): void {
    const loadingDialog = this.dialog.open(CustomMessageBoxComponent, {
      data: {
        title: 'Planificando Pago',
        message: 'Por favor espere mientras se crea la planificación...',
        type: 'info',
        isLoading: true,
        loadingText: 'Creando planificación...'
      } as MessageBoxData,
      disableClose: true
    });

    const documentosPago: DocumentoPagoRequest[] = documentos.map(d => ({
    id_cuenta_por_pagar: Number(d.id_cuenta_por_pagar), // ✅ ASEGURAR NÚMERO
    tipo_pago: d.tipo_pago_seleccionado || 'P',
    valor_pago: Number(d.monto_a_pagar), // ✅ ASEGURAR NÚMERO
    comentario: d.observaciones || undefined
    }));

    // ✅ LOG PARA DEBUG
    console.log('📤 Documentos a enviar:', documentosPago);
    console.log('📤 Total documentos:', documentosPago.length);
    const request: ProcesarPagoRequest = {  // ← CAMBIAR TIPO
        id_empresa: this.idEmpresa,
        id_usuario: this.idUsuario,
        fecha_pago: this.datosPagoForm.value.fechaPago,
        fecha_vencimiento: this.datosPagoForm.value.fechaVencimiento || this.datosPagoForm.value.fechaPago,
        id_forma_pago: Number(this.datosPagoForm.value.idFormaPago),
        cuenta_banco: this.datosPagoForm.value.cuentaBanco,
        observacion: this.datosPagoForm.value.observacion || undefined,
        documentos: documentosPago,
        id_zona: this.idZona,
        id_tipo_asiento: 5
        }; 

    this.guardando = true;

    this.planificacionService.planificarPago(request).subscribe({
      next: (response) => {
        loadingDialog.close();

        if (response.type === 'SUCCESS' && response.data) {
          const successDialog = this.dialog.open(CustomMessageBoxComponent, {
            data: {
              title: 'Planificación Creada',
              message: `✅ ${response.message}\n\nNúmero de Transacción: ${response.data.numero_transaccion}\nDocumentos: ${response.data.documentos_planificados}\nTotal: $${response.data.total_planificado.toFixed(2)}`,
              type: 'success',
              confirmText: 'Aceptar',
              showCancel: false
            } as MessageBoxData
          });

          successDialog.afterClosed().subscribe(() => {
            this.resetearFormulario();
          });
        } else {
          this.showError(response.message || 'Error al crear la planificación');
        }
        
        this.guardando = false;
      },
      error: (err) => {
        loadingDialog.close();
        console.error('❌ Error al planificar:', err);
        this.showError('Error de conexión al crear la planificación');
        this.guardando = false;
      }
    });
    console.log('📤 REQUEST COMPLETO:', JSON.stringify(request, null, 2));

  }

  // ===== RESETEAR =====
 resetearFormulario(): void {
    this.filtrosForm.reset();
    this.datosPagoForm.reset();
    this.proveedorCtrl.reset();
    this.proveedorSeleccionado = null;
    this.documentosRows = [];
    this.gridApiDocumentos?.setGridOption('rowData', []);
    this.cuentasContablesDisponibles.forEach(c => c.seleccionado = false);
    this.calcularTotales();
  }

  limpiarSeleccion(): void {
    this.documentosRows.forEach(d => {
      d.seleccionado = false;
      d.tipo_pago_seleccionado = null;
      d.monto_a_pagar = 0;
      d.exceso = null;
      d.observaciones = null;
    });
    this.gridApiDocumentos?.applyTransaction({ update: this.documentosRows });
    this.calcularTotales();
  }

  // ===== UTILIDADES =====
  private formatDate(value: string | null | undefined): string {
    if (!value) return '';
    
    // Tomar solo la parte de fecha (antes de la 'T' si existe)
    const dateOnly = value.split('T')[0];
    const [year, month, day] = dateOnly.split('-');
    
    // Construir fecha local
    const date = new Date(+year, +month - 1, +day);
    
    // Formatear
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }

  private formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined) return '$0.00';
    return `$${value.toFixed(2)}`;
  }

  private clamp2(v: number): number {
    if (!isFinite(v) || v < 0) return 0;
    return Math.round(v * 100) / 100;
  }

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
    this.snackBar.open(message, '✓', {
        duration: 4000, // ← Más tiempo
        horizontalPosition: 'center', // ← Centro
        verticalPosition: 'top',
        panelClass: ['snackbar-success']
    });
    }

  onInputFocus(event: Event): void {
    const input = event.target as HTMLInputElement;
    input?.select();
  }

    // ===== EXPORTAR A EXCEL =====
        exportarSeleccionadosExcel(): void {
        const seleccionados = this.documentosRows.filter(d => 
            d.monto_a_pagar && d.monto_a_pagar > 0
        );

        if (seleccionados.length === 0) {
            this.showError('No hay documentos seleccionados para exportar');
            return;
        }

        // ✅ Exportar usando ag-Grid con filtro personalizado
        this.gridApiDocumentos.exportDataAsExcel({
            fileName: `Planificacion_Pago_${new Date().toISOString().split('T')[0]}.xlsx`,
            sheetName: 'Documentos a Pagar',
            columnKeys: [
            'id_proveedor',
            'nombre_proveedor',
            'descripcion_tipo_movimiento',
            'numero_comprobante',
            'fecha_transaccion',
            'fecha_vencimiento',
            'total_documento',
            'saldo',
            'tipo_pago_seleccionado',
            'monto_a_pagar',
            'observaciones'
            ],
            shouldRowBeSkipped: (params) => {
            // Solo exportar documentos con monto a pagar
            return !params.node.data.monto_a_pagar || params.node.data.monto_a_pagar <= 0;
            },
            processCellCallback: (params) => {
            // Formatear fechas
            if (params.column.getColId() === 'fecha_transaccion' || 
                params.column.getColId() === 'fecha_vencimiento') {
                return this.formatDate(params.value);
            }
            
            // Formatear tipo de pago
            if (params.column.getColId() === 'tipo_pago_seleccionado') {
                return params.value === 'P' ? 'PAGADO' : 
                    params.value === 'A' ? 'ABONADO' : 'NINGUNO';
            }
            
            return params.value;
            }
        });

        this.showSuccess(`${seleccionados.length} documentos exportados a Excel`);
    }
}
