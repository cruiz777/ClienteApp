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
import { AprobarPlanificacionRequest, DocumentoPagoRequest, DocumentoPendienteRequest, ProcesarPagoRequest, ValorModificadoDto } from 'src/app/interfaces/requests/planificacion-pago-response';
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
  planificacionCargada: any = null; // Almacena la planificación cargada para aprobar

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
  mostrarDropdownExcel = false;

  // ===== COLUMNAS AG-GRID =====
  columnDefsDocumentos: ColDef[] = [
    
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
      field: 'seleccionado',
      headerName: '',
      width: 50,
      checkboxSelection: (params) => !params.data?.esSubtotal && !params.data?.esEspacio,
      headerCheckboxSelection: true,
      editable: false, 
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
        return { backgroundColor: '#fff', textAlign: 'center' };
      }) as any,
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
    groupDefaultExpanded: 1,
    groupIncludeTotalFooter: true,
    groupDisplayType: 'multipleColumns' as const,
    suppressAggFuncInHeader: true,
    groupHideOpenParents: false,
    rowGroupPanelShow: 'never' as const,
    groupTotalRow: 'bottom' as const,
    suppressRowClickSelection: true,
    isRowSelectable: (node: any) => {
      return !node.data?.esSubtotal && !node.data?.esEspacio;
    },
    onCellValueChanged: (event: any) => {
      this.calcularTotales();
    },
    //AGREGAR EVENTO DE SELECCIÓN
    onRowSelected: (event: any) => {
      if (event.node.data?.esSubtotal || event.node.data?.esEspacio) return;
      
      const isSelected = event.node.isSelected();
      const doc = event.node.data;
      
      if (isSelected) {
        //SELECCIONADO → Llenar con saldo completo
        const saldoDoc = Math.abs(doc.saldo || 0);
        doc.monto_a_pagar = saldoDoc;
        doc.tipo_pago_seleccionado = 'P';
      } else {
        // DESELECCIONADO → Limpiar
        doc.monto_a_pagar = 0;
        doc.tipo_pago_seleccionado = null;
      }
      
      // Refrescar celdas
      this.gridApiDocumentos.refreshCells({
        rowNodes: [event.node],
        columns: ['monto_a_pagar', 'tipo_pago_seleccionado'],
        force: true
      });
      
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
 
  // ⭐ OBTENER TODAS las facturas (no solo seleccionadas)
  const todasLasFacturas = this.documentosRows
    .filter((d: any) => !d.esSubtotal && !d.esEspacio);
    
  if (todasLasFacturas.length === 0) {
    this.showError('No hay documentos disponibles para distribuir el monto');
    return;
  }
 
  // Ordenar por fecha de vencimiento (más antiguos primero)
  todasLasFacturas.sort((a, b) => {
    const fechaA = a.fecha_vencimiento ? new Date(a.fecha_vencimiento).getTime() : 0;
    const fechaB = b.fecha_vencimiento ? new Date(b.fecha_vencimiento).getTime() : 0;
    return fechaA - fechaB;
  });
 
  let montoRestante = this.montoTotalADistribuir;
 
  for (const doc of todasLasFacturas) {
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
  this.gridApiDocumentos.applyTransaction({ update: todasLasFacturas });
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
      this.actualizarSubtotales(); 
  }

  private actualizarSubtotales(): void {
    let indexActual = 0;
    
    while (indexActual < this.documentosRows.length) {
      const fila = this.documentosRows[indexActual] as any;  // ✅ Agregar 'as any'
      
      // Si es SUBTOTAL, recalcular
      if (fila.esSubtotal) {
        // Buscar hacia atrás los documentos de este proveedor
        let subtotalMonto = 0;
        
        for (let i = indexActual - 1; i >= 0; i--) {
          const docAnterior = this.documentosRows[i] as any;  // ✅ Agregar 'as any'
          
          // Si llegamos a otro subtotal o espacio, paramos
          if (docAnterior.esSubtotal || docAnterior.esEspacio) break;
          
          // Sumar monto a pagar
          subtotalMonto += (docAnterior.monto_a_pagar || 0);
        }
        
        // Actualizar subtotal
        fila.monto_a_pagar = subtotalMonto > 0 ? subtotalMonto : 0;  // ✅ Cambiar null a 0
      }
      
      indexActual++;
    }
    
    // Refrescar grid
    this.gridApiDocumentos?.applyTransaction({ update: this.documentosRows });
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
        'comision',                     // Comisión
        'aporte',                       // Aporte                  
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
    this.planificacionCargada = null;
    if (!this.datosPagoForm.get('fechaPago')?.value) {
      this.showError('Debe ingresar la Fecha de Pago antes de buscar documentos');
      return;
    }
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

  private agruparPorProveedor(docs: DocumentoPendienteResponse[], preservarValores: boolean = false): any[] {
    const resultado: any[] = [];
    
    // Agrupar por proveedor
    const grupos = docs.reduce((acc, doc) => {
      const key = doc.id_proveedor || 'SIN_PROVEEDOR';
      if (!acc[key]) acc[key] = [];
      
      // ⭐ LÓGICA CONDICIONAL
      let montoInicial = 0;
      let tipoInicial = null;
      
      if (preservarValores) {
        //CARGAR PLANIFICACIÓN: preservar valores
        montoInicial = doc.monto_a_pagar || 0;
        tipoInicial = doc.tipo_pago_seleccionado || null;
      }
      // Si NO preservarValores, quedan en 0 y null
      
      acc[key].push({
        ...doc,
        esSubtotal: false,
        esEspacio: false,
        seleccionado: false,
        tipo_pago_seleccionado: tipoInicial,
        monto_a_pagar: montoInicial,
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
// ===== MÉTODOS NUEVOS - AGREGAR =====
aprobarPlanificacionCargada(): void {
  const documentosAprobar = this.documentosRows.filter((d: any) => 
    !d.esSubtotal && !d.esEspacio && d._esPlanificacion && d.monto_a_pagar && d.monto_a_pagar > 0
  );

  if (documentosAprobar.length === 0) {
    this.showError('Seleccione al menos un documento con monto a pagar');
    return;
  }

  const dialogRef = this.dialog.open(CustomMessageBoxComponent, {
    data: {
      title: 'Confirmar Aprobación',
      message: `¿Aprobar ${documentosAprobar.length} documento(s) de la transacción ${this.planificacionCargada.num_transaccion} por $${this.totalAPlanificar.toFixed(2)}?`,
      type: 'warning',
      confirmText: 'Sí, aprobar',
      cancelText: 'Cancelar',
      showCancel: true
    } as MessageBoxData
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      this.ejecutarAprobacionPlanificacion(documentosAprobar);
    }
  });
}

private ejecutarAprobacionPlanificacion(documentos: any[]): void {
  const loadingDialog = this.dialog.open(CustomMessageBoxComponent, {
    data: {
      title: 'Aprobando Planificación',
      message: 'Por favor espere...',
      type: 'info',
      isLoading: true,
      loadingText: 'Procesando aprobación...'
    } as MessageBoxData,
    disableClose: true
  });

  this.guardando = true;

  // ⭐ PREPARAR VALORES MODIFICADOS
  const valoresModificados: ValorModificadoDto[] = documentos.map(d => ({
    id_cuenta_por_pagar: d._idCuentaPorPagar,
    valor_pago: d.monto_a_pagar,
    tipo_pago: d.tipo_pago_seleccionado,
    comentario: d.observaciones || undefined
  }));

  const request: AprobarPlanificacionRequest = {
    numero_transaccion: this.planificacionCargada.num_transaccion,
    id_empresa: this.idEmpresa,
    id_usuario: this.idUsuario,
    id_zona: this.idZona,
    id_tipo_asiento: 6,
    documentos_a_aprobar: documentos.map(d => d._idCuentaPorPagar),
    valores_modificados: valoresModificados  // ⭐ ENVIAR VALORES MODIFICADOS
  };

  console.log('📤 REQUEST DE APROBACIÓN:', JSON.stringify(request, null, 2));

  this.planificacionService.aprobarPlanificacion(request).subscribe({
    next: (response) => {
      loadingDialog.close();

      if (response.type === 'SUCCESS') {
        this.dialog.open(CustomMessageBoxComponent, {
          data: {
            title: 'Aprobación Exitosa',
            message: `✅ ${documentos.length} documento(s) aprobado(s)\n\nTotal: $${this.totalAPlanificar.toFixed(2)}`,
            type: 'success',
            confirmText: 'Aceptar',
            showCancel: false
          } as MessageBoxData
        }).afterClosed().subscribe(() => {
          this.resetearFormulario();
          this.planificacionCargada = null;
        });
      } else {
        this.showError(response.message || 'Error al aprobar');
      }
      
      this.guardando = false;
    },
    error: (err) => {
      loadingDialog.close();
      console.error('❌ Error:', err);
      this.showError('Error de conexión al aprobar');
      this.guardando = false;
    }
  });
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
    this.planificacionCargada = null;
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

    this.exportarDocumentosExcel(seleccionados, 'Seleccionados');
  }

  exportarNoSeleccionadosExcel(): void {
    const noSeleccionados = this.documentosRows.filter((d: any) => 
      !d.esSubtotal && !d.esEspacio && (!d.monto_a_pagar || d.monto_a_pagar === 0)
    );

    if (noSeleccionados.length === 0) {
      this.showError('No hay documentos sin seleccionar para exportar');
      return;
    }

    this.exportarDocumentosExcel(noSeleccionados, 'No_Seleccionados');
  }

  exportarTodosExcel(): void {
    const todos = this.documentosRows.filter((d: any) => 
      !d.esSubtotal && !d.esEspacio
    );

    if (todos.length === 0) {
      this.showError('No hay documentos para exportar');
      return;
    }

    this.exportarDocumentosExcel(todos, 'Todos');
  }

  // ===== MÉTODO COMÚN PARA EXPORTAR =====
  private exportarDocumentosExcel(documentos: any[], tipo: string): void {
    const datosExcel = documentos.map(d => ({
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
      'Monto a Pagar': d.monto_a_pagar || 0,
      'Observaciones': d.observaciones || ''
    }));

    const ws = XLSX.utils.json_to_sheet(datosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Documentos');

    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Planificacion_${tipo}_${fecha}.xlsx`);

    this.showSuccess(`${documentos.length} documentos exportados a Excel (${tipo})`);
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

    // ← CAMBIO: Escuchar el resultado del modal
    dialogRef.afterClosed().subscribe((resultado) => {
      if (resultado?.cargar && resultado?.transaccion) {
        console.log('🔄 Cargando planificación:', resultado.transaccion);
        this.cargarPlanificacionEnGrid(resultado.transaccion);
      }
    });
  }
  procesarExcelPagos(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        // Leer Excel
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        // Buscar índices de columnas
        const headers = jsonData[0] as string[];
        const colComprobante = headers.findIndex(h => 
          h && h.toString().toLowerCase().includes('comp')
        );
        const colTipoPago = headers.findIndex(h => 
          h && h.toString().toLowerCase().includes('tipo') && h.toString().toLowerCase().includes('pago')
        );

        if (colComprobante === -1 || colTipoPago === -1) {
          this.showError('El Excel debe contener columnas "No. Comprobante" y "Tipo Pago"');
          return;
        }

        // Procesar filas (saltar header)
        let marcados = 0;
        for (let i = 1; i < jsonData.length; i++) {
          const fila = jsonData[i];
          const numComprobante = fila[colComprobante]?.toString().trim();
          const tipoPago = fila[colTipoPago]?.toString().trim().toUpperCase();

          // Solo procesar si tiene "P"
          if (tipoPago === 'P' && numComprobante) {
            // Buscar documento en grid
            const doc = this.documentosRows.find((d: any) => 
              !d.esSubtotal && 
              !d.esEspacio && 
              d.numero_comprobante?.toString().trim() === numComprobante
            );

            if (doc) {
              const saldoDoc = Math.abs(doc.saldo || 0);
              doc.monto_a_pagar = saldoDoc;
              doc.tipo_pago_seleccionado = 'P';
              marcados++;
            }
          }
        }

        // Actualizar grid
        this.gridApiDocumentos?.applyTransaction({ update: this.documentosRows });
        this.calcularTotales();

        // Limpiar input
        event.target.value = '';

        // Mensaje de resultado
        if (marcados > 0) {
          this.showSuccess(`✅ ${marcados} documento(s) marcado(s) para pago desde Excel`);
        } else {
          this.showError('No se encontraron documentos con "P" en el Excel');
        }

      } catch (err) {
        console.error('❌ Error procesando Excel:', err);
        this.showError('Error al leer el archivo Excel');
      }
    };

    reader.readAsArrayBuffer(file);
  }
  cargarPlanificacionEnGrid(transaccion: any): void {
    console.log('📥 Cargando planificación:', transaccion);
    console.log('📥 Items recibidos:', transaccion._items);
    
    // Guardar referencia
    this.planificacionCargada = transaccion;
    
    // Convertir items
    const documentosFormateados = transaccion._items.map((item: PlanificacionPagoResponse) => {
      const valorPago = Math.abs(item.valor_pago || 0);
      
      console.log('📄 Procesando:', item.nombre_proveedor, 'Valor original:', item.valor_pago, 'Valor abs:', valorPago);
      
      return {
        // Identificación
        id_proveedor: item.id_proveedor || item.codigo_proveedor,
        nombre_proveedor: item.nombre_proveedor,
        descripcion_tipo_movimiento: 'PLANIFICACIÓN',
        numero_comprobante: item.numero_documento || `PLAN-${item.num_transaccion}`,
        
        // Fechas
        fecha_transaccion: item.fecha,
        fecha_vencimiento: item.fecha_vencimiento,
        
        // Montos (para mostrar en columnas)
        total_documento: item.total || 0,
        comision: item.comision || 0,
        aporte: item.aporte || 0,
        retencion_fuente: item.retencion || 0,
        retencion_iva: item.retencion_iva || 0,
        debe: 0,
        haber: 0,
        saldo: -valorPago, // ⭐ Negativo para consistencia con CxP
        
        // ⭐ VALORES EDITABLES (lo más importante)
        tipo_pago_seleccionado: item.estado_pago || 'P',
        monto_a_pagar: valorPago, // ⭐ ESTE ES EL QUE SE MUESTRA EN LA COLUMNA "Valor"
        observaciones: item.comentario || '',
        exceso: null,
        
        // Metadata de planificación
        _esPlanificacion: true,
        _numTransaccion: item.num_transaccion,
        _idPlanificacion: item.id_planificacion,
        _idCuentaPorPagar: item.id_cuenta_por_pagar,
        
        // Flags de control
        esSubtotal: false,
        esEspacio: false,
        seleccionado: false,
        esta_vencido: false
      };
    });

    console.log('📊 Documentos formateados:', documentosFormateados);
    console.log('📊 Primer doc - monto_a_pagar:', documentosFormateados[0]?.monto_a_pagar);

    // Agrupar por proveedor (con subtotales)
    const documentosConSubtotales = this.agruparPorProveedor(documentosFormateados,true);
    
    console.log('📊 Con subtotales:', documentosConSubtotales);
    
    // Cargar en grid
    this.documentosRows = documentosConSubtotales;
    this.gridApiDocumentos?.setGridOption('rowData', this.documentosRows);
    
    // Recalcular totales
    this.calcularTotales();
    
    // Mensaje de éxito
    this.showSuccess(
      `✅ Planificación ${transaccion.num_transaccion} cargada: ${transaccion.cantidad_documentos} documentos`
    );
    
    // Pre-llenar formulario
    if (transaccion._items && transaccion._items.length > 0) {
      const primerItem = transaccion._items[0];
      this.datosPagoForm.patchValue({
        fechaPago: primerItem.fecha || '',
        idFormaPago: primerItem.id_forma_pago || '',
        cuentaBanco: primerItem.cuenta_banco || '',
        observacion: transaccion.observacion || primerItem.comentario || ''
      });
    }
  }
  get totalDocumentosReales(): number {
    return this.documentosRows.filter((d: any) => !d.esSubtotal && !d.esEspacio).length;
  }
  toggleDropdownExcel(): void {
    this.mostrarDropdownExcel = !this.mostrarDropdownExcel;
  }
}
