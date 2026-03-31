import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar'; 
import { Router } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { Observable, debounceTime, distinctUntilChanged, switchMap, of, map } from 'rxjs';
import * as XLSX from 'xlsx';
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
import { AprobarPlanificacionRequest, DocumentoPagoRequest, DocumentoPendienteRequest, ProcesarPagoRequest } from 'src/app/interfaces/requests/planificacion-pago-response';
import { PlanificacionPagoResponse } from 'src/app/interfaces/responses/planificacion-pago-response';
import { AprobacionPlanificacionesComponent } from './aprobacion/aprobacion-planificaciones.component';

@Component({
  selector: 'app-planificacion-pagos',
  templateUrl: './planificacion-pagos.component.html',
  styleUrls: ['./planificacion-pagos.component.scss'],
  encapsulation: ViewEncapsulation.None 
})
export class PlanificacionPagosComponent implements OnInit {
  @ViewChild('gridDocumentos') gridDocumentos!: AgGridAngular;
  
  Math = Math;

  montoTotalADistribuir: number = 0;
  vistaSimplificada: boolean = false;

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
      pinned: 'left',
      headerName: '',
      width: 50,
      checkboxSelection: (params) => !params.data?.esSubtotal && !params.data?.esEspacio,
      headerCheckboxSelection: true,
      editable: (params) => !params.data?.esSubtotal && !params.data?.esEspacio,
      cellStyle: ((params: any) => {
        if (params.data?.esEspacio) {
          return { backgroundColor: '#fff', border: 'none' };
        }
        if (params.data?.esSubtotal) {
          return { 
            backgroundColor: '#1976d2', 
            color: 'white',
            fontWeight: 'bold',
            fontSize: '14px'
          };
        }
        return { backgroundColor: '#fff9c4', fontWeight: 'normal' };
      }) as any,
    },
    {
      field: 'id_proveedor',
      headerName: 'Cód. Prov',
      width: 100,
      editable: false,
      hide: true
    },
    {
      field: 'nombre_proveedor',
      headerName: 'Proveedor',
      width: 750,
      editable: false,
      cellStyle: ((params: any) => {
        if (params.data?.esEspacio) {
          return { backgroundColor: '#fff', border: 'none' };
        }
        if (params.data?.esSubtotal) {
          return {
            backgroundColor: '#F27046',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '15px',
            borderTop: '3px solid #d85a2f',
            borderBottom: '3px solid #d85a2f',
            textAlign: 'left',
            paddingLeft: '20px'
          };
        }
        return null;
      }) as any,
      valueFormatter: params => {
        if (params.data?.esEspacio) return '';
        return params.value || '';
      }
    },
    {
      field: 'descripcion_tipo_movimiento',
      headerName: 'Tip. Movim.',
      width: 180,
      editable: false,
      hide: false  
    },
    {
      field: 'numero_comprobante',
      headerName: 'No. Comp.',
      width: 180,
      editable: false,
      pinned: 'left'
    },
    {
      field: 'fecha_transaccion',
      headerName: 'Fec. Movim.',
      width: 420,
      valueFormatter: params => this.formatDate(params.value),
      editable: false,
      hide: false
    },
    {
      field: 'fecha_vencimiento',
      headerName: 'Fec. Venc.',
      width: 420,
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
      width: 320,
      valueFormatter: params => {
        if (params.data?.esEspacio || params.data?.esSubtotal) return '';
        if (!params.value || params.value === 0) return '';
        return this.formatCurrency(params.value);
      },      
      type: 'rightAligned',
      editable: false,
      hide: false
    },
    {
      field: 'comision',
      headerName: 'Comisión',
      width: 180,
      valueFormatter: params => {
        if (params.data?.esEspacio || params.data?.esSubtotal) return '';
        if (!params.value || params.value === 0) return '';
        return this.formatCurrency(params.value);
      },  
      type: 'rightAligned',
      editable: false,
      hide: false
    },
    {
      field: 'aporte',
      headerName: 'Aporte',
      width: 180,
      valueFormatter: params => {
        if (params.data?.esEspacio || params.data?.esSubtotal) return '';
        if (!params.value || params.value === 0) return '';
        return this.formatCurrency(params.value);
      },  
      type: 'rightAligned',
      editable: false,
      hide: false
    },
    {
      field: 'retencion_fuente',
      headerName: 'Ret. Fuente',
      width: 220,
      valueFormatter: params => {
        if (params.data?.esEspacio || params.data?.esSubtotal) return '';
        if (!params.value || params.value === 0) return '';
        return this.formatCurrency(params.value);
      },  
      type: 'rightAligned',
      editable: false,
      hide: false
    },
    {
      field: 'retencion_iva',
      headerName: 'Ret. IVA',
      width: 220,
      valueFormatter: params => {
        if (params.data?.esEspacio || params.data?.esSubtotal) return '';
        if (!params.value || params.value === 0) return '';
        return this.formatCurrency(params.value);
      },  
      type: 'rightAligned',
      editable: false,
      hide: false
    },
    {
      field: 'debe',
      headerName: 'Debe',
      width: 320,
      valueFormatter: params => {
        if (params.data?.esEspacio || params.data?.esSubtotal) return '';
        if (!params.value || params.value === 0) return '';
        return this.formatCurrency(params.value);
      },  
      type: 'rightAligned',
      editable: false,
      hide: false
    },
    {
      field: 'haber',
      headerName: 'Haber',
      width: 320,
      valueFormatter: params => {
        if (params.data?.esEspacio || params.data?.esSubtotal) return '';
        if (!params.value || params.value === 0) return '';
        return this.formatCurrency(params.value);
      },  
      type: 'rightAligned',
      editable: false,
      hide: false
    },
    {
      field: 'saldo',
      headerName: 'Saldo',
      width: 320,
      valueFormatter: params => {
        if (params.data?.esEspacio) return '';
        if (!params.value) return '';
        return this.formatCurrency(params.value);
      },
      type: 'rightAligned',
      cellStyle: ((params: any) => {
        if (params.data?.esEspacio) {
          return { backgroundColor: '#fff', border: 'none' };
        }
        if (params.data?.esSubtotal) {
          return { 
            backgroundColor: '#F27046',  // ✅ Naranja llamativo
            color: 'white',
            fontWeight: 'bold',
            fontSize: '15px',
            borderTop: '3px solid #d85a2f',
            borderBottom: '3px solid #d85a2f'
          };
        }
        return { fontWeight: 'bold', color: '#d32f2f' };
      }) as any,
      editable: false
    },
    {
      field: 'tipo_pago_seleccionado',
      headerName: 'Tipo Pago',
      width: 180,
      editable: (params) => !params.data?.esSubtotal && !params.data?.esEspacio,       
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
      headerName: 'Valor',
      width: 320,
      editable: (params) => !params.data?.esSubtotal && !params.data?.esEspacio,
      type: 'rightAligned',
      cellStyle: ((params: any) => {
        if (params.data?.esEspacio) {
          return { backgroundColor: '#fff', border: 'none' };
        }
        if (params.data?.esSubtotal) {
          return { 
            backgroundColor: '#F27046',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '15px',
            borderTop: '3px solid #d85a2f',
            borderBottom: '3px solid #d85a2f'
          };
        }
        return { backgroundColor: '#fff9c4', fontWeight: 'normal' };
      }) as any,
      valueFormatter: params => {
        if (params.data?.esEspacio) return '';
        if (!params.value || params.value === 0) return '';
        return this.formatCurrency(params.value);
      },
      pinned: 'right',
      valueSetter: params => {
        const saldoNegativo = Number(params.data.saldo) || 0;
        const saldoMaximo = Math.abs(saldoNegativo);
        
        let newValue = parseFloat(params.newValue) || 0;
        
        if (newValue < 0) newValue = 0;
        if (newValue > saldoMaximo) {
          newValue = saldoMaximo;
          this.showSuccess(`Ajustado a $${saldoMaximo.toFixed(2)} (saldo máximo)`);
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
      valueFormatter: params => {
        if (params.data?.esEspacio || params.data?.esSubtotal) return '';
        if (!params.value || params.value === 0) return '';
        return this.formatCurrency(params.value);
      },  
      type: 'rightAligned',
      editable: false,
      
      hide: false
    },
    {
      field: 'observaciones',
      headerName: 'Observaciones',
      width: 200,
      editable: (params) => !params.data?.esSubtotal && !params.data?.esEspacio, 
      valueFormatter: params => {
        if (params.data?.esEspacio || params.data?.esSubtotal) return '';
        return params.value || '';
      },
      hide: false
    }
  ];  

  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    flex: 1
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
  montoRestante: number = 0;

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

  autoGroupColumnDef: ColDef = {
    headerName: 'Proveedor',
    minWidth: 450,
    cellRendererParams: {
      suppressCount: false,
      checkbox: (params: any) => !params.node.footer, 
      
      //PERSONALIZAR RENDERER DE SUBTOTAL
      innerRenderer: (params: any) => {
        // Si es FILA DE SUBTOTAL (footer)
        if (params.node.footer) {
          return '<strong style="color: #1976d2; font-weight: 600;">S U B T O T A L</strong>';
        }
        
        // Si es GRUPO (proveedor)
        if (params.node.group) {
          const proveedor = params.node.key;
          const subtotal = params.node.aggData?.saldo || 0;
          return `<strong>${proveedor}</strong> <span style="color: #d32f2f; font-weight: bold;">($${Math.abs(subtotal).toFixed(2)})</span>`;
        }
        
        // Si es fila normal
        return params.value;
      },
      
      //PERSONALIZAR ESTILO DE LA FILA DE SUBTOTAL
      footerValueGetter: (params: any) => {
        return 'SUBTOTAL';
      }
    }
  };


  gridOptions = {
    groupDefaultExpanded: 1,  // Expandir primer nivel
    groupIncludeTotalFooter: true,  //MOSTRAR FILA DE SUBTOTAL
    groupDisplayType: 'multipleColumns' as const,
    suppressAggFuncInHeader: true,
    groupHideOpenParents: false,
    rowGroupPanelShow: 'never' as const,
    //PERSONALIZAR TEXTO DE LA FILA DE SUBTOTAL
    groupTotalRow: 'bottom' as const,  // Subtotal abajo del grupo
    isRowSelectable: (node: any) => {
      return !node.data?.esSubtotal && !node.data?.esEspacio;
    },
    onCellValueChanged: (event: any) => {
      this.calcularTotales();
    }
  };
  
  getRowStyle = (params: any): any => {
    // Estilo para fila de SUBTOTAL
    if (params.node.footer) {
      return {
        background: '#e3f2fd',
        fontWeight: '600'
      };
    }
    
    // Estilo para fila de GRUPO (cabecera de proveedor)
    if (params.node.group) {
      return {
        background: '#f5f5f5',
        fontWeight: '500'
      };
    }
    
    return null;
  };

getRowClass = (params: any): string | string[] | undefined => {
  // Clase para fila de SUBTOTAL (con bordes)
  if (params.node.footer) {
    return 'subtotal-row';
  }
  
  // Clase para fila de GRUPO
  if (params.node.group) {
    return 'grupo-row';
  }
  
  return undefined;
};

distribuirMonto(): void {
  if (this.montoTotalADistribuir <= 0) {
    this.showError('Ingrese un monto válido para distribuir');
    return;
  }
 
  // Obtener documentos seleccionados (que tengan checkbox marcado)
  const seleccionados = this.gridApiDocumentos.getSelectedRows()
    .filter((d: any) => !d.esSubtotal && !d.esEspacio) as DocumentoPendienteResponse[];
    
  if (seleccionados.length === 0) {
    this.showError('Seleccione al menos un documento para distribuir el monto');
    return;
  }
 
  // Ordenar por fecha de vencimiento (más antiguos primero)
  seleccionados.sort((a, b) => {
    const fechaA = a.fecha_vencimiento ? new Date(a.fecha_vencimiento).getTime() : 0;
    const fechaB = b.fecha_vencimiento ? new Date(b.fecha_vencimiento).getTime() : 0;
    return fechaA - fechaB;
  });
 
  let montoRestante = this.montoTotalADistribuir;
 
  for (const doc of seleccionados) {
    const saldoDoc = Math.abs(doc.saldo || 0);
    
    if (montoRestante <= 0) {
      // No queda monto
      doc.monto_a_pagar = 0;
      doc.tipo_pago_seleccionado = 'N';
    } else if (montoRestante >= saldoDoc) {
      // Cubrir toda la deuda
      doc.monto_a_pagar = saldoDoc;
      doc.tipo_pago_seleccionado = 'P';  // Pagado
      montoRestante -= saldoDoc;
    } else {
      // Pago parcial
      doc.monto_a_pagar = montoRestante;
      doc.tipo_pago_seleccionado = 'A';  // Abonado
      montoRestante = 0;
    }
  }
 
  // Actualizar grid
  this.gridApiDocumentos.applyTransaction({ update: seleccionados });
  this.calcularTotales();
  this.montoRestante = montoRestante;

  // Mostrar resultado
  const mensaje = montoRestante > 0 
    ? `✅ $${this.montoTotalADistribuir.toFixed(2)} distribuidos. Sobrante: $${montoRestante.toFixed(2)}`
    : `✅ $${this.montoTotalADistribuir.toFixed(2)} distribuidos completamente`;
  
  this.showSuccess(mensaje);
}
 
//Pagar todo lo seleccionado (checkbox)
  pagarTodoSeleccionado(): void {
    // ✅ Obtener seleccionados y filtrar documentos reales
    const todosSeleccionados = this.gridApiDocumentos.getSelectedRows();
    const seleccionados = todosSeleccionados.filter((d: any) => 
      !d.esSubtotal && !d.esEspacio
    ) as DocumentoPendienteResponse[];
    
    if (seleccionados.length === 0) {
      this.showError('Seleccione al menos un documento');
      return;
    }
  
    for (const doc of seleccionados) {
      const saldoDoc = Math.abs(doc.saldo || 0);
      doc.monto_a_pagar = saldoDoc;
      doc.tipo_pago_seleccionado = 'P';
    }
  
    this.gridApiDocumentos.applyTransaction({ update: seleccionados });
    this.calcularTotales();
    
    this.showSuccess(`${seleccionados.length} documentos marcados para pago completo`);
  }
 
//Calcular totales mejorado (con agrupación)
private calcularTotales(): void {
    //FILTRAR solo documentos reales (sin subtotales ni espacios)
    const documentosReales = this.documentosRows.filter((d: any) => 
      !d.esSubtotal && !d.esEspacio
    );
    
    // TOTAL SALDO DE TODOS LOS DOCUMENTOS REALES
    this.totalSaldoTotal = Math.abs(
      documentosReales.reduce((sum, d) => sum + (d.saldo || 0), 0)
    );
    
    // DOCUMENTOS REALES CON MONTO ASIGNADO (> 0)
    const docsConMonto = documentosReales.filter(d => 
      d.monto_a_pagar && d.monto_a_pagar > 0
    );
    
    this.totalDocumentosSeleccionados = docsConMonto.length;
    
    // ✅ TOTAL A PLANIFICAR (suma de montos a pagar)
    this.totalAPlanificar = docsConMonto.reduce((sum, d) => sum + (d.monto_a_pagar || 0), 0);
    
    // ✅ TOTAL MARCADO (suma de SALDOS de documentos con monto > 0)
    this.totalMarcado = Math.abs(
      docsConMonto.reduce((sum, d) => sum + (d.saldo || 0), 0)
    );
    
    // PENDIENTE = Lo que falta pagar de los documentos marcados
    this.totalPendiente = this.totalMarcado - this.totalAPlanificar;
    
    // DIFERENCIA = Si pagaste de más o de menos vs lo marcado
    this.diferencia = this.totalAPlanificar - this.totalMarcado;
  }
  ngOnInit(): void {
    this.cargarDatosUsuario();
    this.initForms();
    this.initAutocompleteProveedor();
    this.initFormasPago();
    this.cargarCuentasContables();
  }

  toggleVistaSimplificada(): void {
    // this.vistaSimplificada = !this.vistaSimplificada;
    
    // En vista simplificada, ocultar SOLO columnas secundarias
    this.gridApiDocumentos?.setColumnsVisible(
      [
        'descripcion_tipo_movimiento',  // Tipo Movimiento
        'fecha_transaccion',            // Fecha Movim.
        'total_documento',              // Total Doc.
        'comision',                     // Comisión
        'aporte',                       // Aporte
        'debe',                        // Debe
        'haber',                       // Haber
        'exceso'                       // Exceso
      ],
      !this.vistaSimplificada  // false = ocultar, true = mostrar
    );
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
        const cuentasProveedores = cuentasMovimiento.filter(c => {
          const codigoEspecial = this.getIdCodigoEspecial(c);
          return codigoEspecial === 11 || codigoEspecial === 14;
        });

        this.cuentasContablesDisponibles = cuentasProveedores.map(c => ({
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
    console.log('🔧 Grid ready - aplicando agrupación...');
  
    this.gridApiDocumentos.applyColumnState({
      state: [
        {
          colId: 'id_proveedor',
          rowGroup: true,
          hide: true
        }
      ],
      defaultState: { sort: null }
    });
    
    console.log('✅ Agrupación aplicada');
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
    this.montoTotalADistribuir = 0;
    this.montoRestante = 0;

    const request: DocumentoPendienteRequest = {
      id_empresa: this.idEmpresa,
      id_proveedor: this.proveedorSeleccionado?.idCodContable,
      fecha_vencimiento_hasta: this.filtrosForm.value.fechaVencimientoHasta || undefined,
      cuentas_contables: this.cuentasSeleccionadas.length > 0 ? this.cuentasSeleccionadas : undefined
    };

    this.planificacionService.getDocumentosPendientes(request).subscribe({
      next: (response) => {
        if (response.type === 'LIST' && response.data) {
          // ✅ AGRUPAR MANUALMENTE
          const grouped = this.agruparPorProveedor(response.data);
          this.documentosRows = grouped;
          
          this.gridApiDocumentos?.setGridOption('rowData', this.documentosRows);
          this.calcularTotales();
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

  private agruparPorProveedor(docs: DocumentoPendienteResponse[]): any[] {
    const resultado: any[] = [];
    
    // Agrupar por proveedor
    const grupos = docs.reduce((acc, doc) => {
      const key = doc.id_proveedor || 'SIN_PROVEEDOR';
      if (!acc[key]) acc[key] = [];
      acc[key].push({
        ...doc,
        esSubtotal: false,
        esEspacio: false,
        seleccionado: false,
        tipo_pago_seleccionado: null,
        monto_a_pagar: 0,
        exceso: null,
      });
      return acc;
    }, {} as Record<string, any[]>);
    
    // Insertar filas de subtotal + espacio
    Object.keys(grupos).forEach(idProveedor => {
      const docsProveedor = grupos[idProveedor];
      
      // 1. Agregar documentos
      resultado.push(...docsProveedor);
      
      // 2. Calcular subtotal
      const subtotalSaldo = docsProveedor.reduce((sum, d) => sum + (d.saldo || 0), 0);
      const subtotalMonto = docsProveedor.reduce((sum, d) => sum + (d.monto_a_pagar || 0), 0);
      
      // 3. Agregar fila de SUBTOTAL
      resultado.push({
        esSubtotal: true,
        esEspacio: false,
        nombre_proveedor: `SUBTOTAL ${docsProveedor[0].nombre_proveedor}`,
        saldo: subtotalSaldo,
        monto_a_pagar: subtotalMonto > 0 ? subtotalMonto : null,
        seleccionado: false,
        tipo_pago_seleccionado: null, 
        editable: false
      });
      
      // 4. Agregar fila de ESPACIO
      resultado.push({
        esSubtotal: false,
        esEspacio: true,
        nombre_proveedor: '',
        seleccionado: false,
        editable: false
      });
    });
    
    return resultado;
  }
  // ===== CÁLCULOS =====
  // private calcularTotales(): void {
  //   const seleccionados = this.documentosRows.filter(d => 
  //     d.seleccionado || (d.monto_a_pagar && d.monto_a_pagar > 0)
  //   );
    
  //   this.totalDocumentosSeleccionados = seleccionados.length;
  //   this.totalAPlanificar = seleccionados.reduce((sum, d) => sum + (d.monto_a_pagar || 0), 0);
  //   this.totalMarcado = seleccionados.reduce((sum, d) => sum + (d.saldo || 0), 0);
  //   this.totalSaldoTotal = this.documentosRows.reduce((sum, d) => sum + (d.saldo || 0), 0);
  //   this.totalPendiente = this.totalMarcado - this.totalAPlanificar;
  //   this.diferencia = this.totalAPlanificar - this.totalMarcado;
  // }

  // ===== PLANIFICAR PAGO =====
  planificarPago(): void {
    // Validar formulario
    if (!this.datosPagoForm.valid) {
      this.showError('Complete todos los campos obligatorios (Fecha Pago, Forma Pago, Cuenta Banco)');
      return;
    }

    // Validar documentos seleccionados
    const documentosAPagar = this.documentosRows.filter((d: any) => 
      !d.esSubtotal && !d.esEspacio && d.monto_a_pagar && d.monto_a_pagar > 0 && d.tipo_pago_seleccionado
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
    const seleccionados = this.documentosRows.filter((d: any) => 
      !d.esSubtotal && !d.esEspacio && d.monto_a_pagar && d.monto_a_pagar > 0
    );

    if (seleccionados.length === 0) {
      this.showError('No hay documentos seleccionados para exportar');
      return;
    }

    //Preparar datos para Excel
    const datosExcel = seleccionados.map(d => ({
      'Cód. Proveedor': d.id_proveedor,
      'Proveedor': d.nombre_proveedor,
      'Tipo Movimiento': d.descripcion_tipo_movimiento,
      'No. Comprobante': d.numero_comprobante,
      'Fecha Transacción': this.formatDate(d.fecha_transaccion),
      'Fecha Vencimiento': this.formatDate(d.fecha_vencimiento),
      'Total Documento': d.total_documento,
      'Saldo': d.saldo,
      'Tipo Pago': d.tipo_pago_seleccionado === 'P' ? 'PAGADO' : 
                  d.tipo_pago_seleccionado === 'A' ? 'ABONADO' : 'NINGUNO',
      'Monto a Pagar': d.monto_a_pagar,
      'Observaciones': d.observaciones || ''
    }));

    //Crear libro Excel
    const ws = XLSX.utils.json_to_sheet(datosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Documentos a Pagar');

    //Descargar archivo
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Planificacion_Pago_${fecha}.xlsx`);

    this.showSuccess(`${seleccionados.length} documentos exportados a Excel`);
  }

    // ===== MODAL APROBACIÓN =====
  abrirModalAprobacion(): void {
    const dialogRef = this.dialog.open(AprobacionPlanificacionesComponent, {
      width: '1200px',
      height: '85vh', 
      maxHeight: '90vh',
      disableClose: false,
      panelClass: 'custom-dialog-container'
    });

    dialogRef.afterClosed().subscribe(() => {
      console.log('Modal cerrado');
    });
  }
  
  get totalDocumentosReales(): number {
    return this.documentosRows.filter((d: any) => !d.esSubtotal && !d.esEspacio).length;
  }
}
