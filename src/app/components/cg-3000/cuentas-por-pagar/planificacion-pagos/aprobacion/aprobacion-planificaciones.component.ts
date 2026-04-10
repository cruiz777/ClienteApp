import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';

// Services
import { PlanificacionPagoService } from 'src/app/services/planificacion-pago.service';
import { UsuarioService } from 'src/app/services/usuario.service';

// Interfaces
import { PlanificacionPagoResponse } from 'src/app/interfaces/responses/planificacion-pago-response';
import { AprobarPlanificacionRequest } from 'src/app/interfaces/requests/planificacion-pago-response';
import { LoginUsuarioResponse } from 'src/app/interfaces/responses/usuario-log-response';

// Components
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/components/utils/messages/custom-message-box.component';
import { DetalleTransaccionDialogComponent } from './detalle-transaccion-dialog.component';

interface TransaccionAgrupada {
  num_transaccion: number;
  fecha: string;
  observacion: string;
  cantidad_documentos: number;
  total_planificado: number;
  forma_pago: string;
  cuenta_banco: string;
  usuario: string;
  proveedores: string;
  _items: PlanificacionPagoResponse[];
}

@Component({
  selector: 'app-aprobacion-planificaciones',
  templateUrl: './aprobacion-planificaciones.component.html',
  styleUrls: ['./aprobacion-planificaciones.component.scss']
})
export class AprobacionPlanificacionesComponent implements OnInit {
  @ViewChild('gridPlanificaciones') gridPlanificaciones!: AgGridAngular;

  // ===== GRID =====
  planificacionesRows: TransaccionAgrupada[] = [];
  private gridApi!: GridApi;

  columnDefs: ColDef[] = [
    {
      field: 'seleccionado',
      headerName: '',
      width: 50,
      checkboxSelection: true,
      headerCheckboxSelection: true,
      pinned: 'left'
    },
    {
      field: 'num_transaccion',
      headerName: 'N° Transacción',
      width: 130,
      pinned: 'left',
      cellStyle: { fontWeight: 'bold' }
    },
    {
      field: 'fecha',
      headerName: 'Fecha',
      width: 130,
      valueFormatter: params => this.formatDate(params.value)
    },
    {
      field: 'observacion',
      headerName: 'Observación',
      width: 250,
      cellStyle: { fontWeight: '500' }
    },
    {
      field: 'cantidad_documentos',
      headerName: 'Cant. Docs.',
      width: 120,
      type: 'rightAligned'
    },
    {
      field: 'total_planificado',
      headerName: 'Total',
      width: 140,
      valueFormatter: params => this.formatCurrency(params.value),
      type: 'rightAligned',
      cellStyle: { fontWeight: 'bold', color: '#1976d2' }
    },
    {
      field: 'forma_pago',
      headerName: 'Forma Pago',
      width: 150
    },
    {
      field: 'cuenta_banco',
      headerName: 'Cuenta',
      width: 130
    },
    {
      field: 'usuario',
      headerName: 'Creado por',
      width: 150
    },
    {
      field: 'proveedores',
      headerName: 'Proveedores',
      width: 300,
      tooltipField: 'proveedores'
    },
    {
      field: 'acciones',
      headerName: 'Acciones',
      width: 120,
      cellRenderer: (params: any) => {
        const container = document.createElement('div');
        container.style.cssText = 'display: flex; gap: 12px; align-items: center; justify-content: center;';
        
        // ===== BOTÓN EDITAR (SOLO ÍCONO) =====
        const btnEditar = document.createElement('button');
        btnEditar.className = 'btn-icon-only';
        btnEditar.style.cssText = 'background: transparent; border: none; cursor: pointer; padding: 4px; transition: transform 0.2s;';
        btnEditar.onmouseover = () => btnEditar.style.transform = 'scale(1.1)';
        btnEditar.onmouseout = () => btnEditar.style.transform = 'scale(1)';
        
        const imgEditar = document.createElement('img');
        imgEditar.src = 'assets/icons/icon-modificar.png'; 
        imgEditar.alt = 'Editar';
        imgEditar.style.cssText = 'width: 20px; height: 20px; object-fit: contain;';
        
        btnEditar.appendChild(imgEditar);
        btnEditar.onclick = () => this.cargarPlanificacion(params.data);
        btnEditar.title = 'Editar';
        
        // ===== BOTÓN ELIMINAR (SOLO ÍCONO) =====
        const btnEliminar = document.createElement('button');
        btnEliminar.className = 'btn-icon-only';
        btnEliminar.style.cssText = 'background: transparent; border: none; cursor: pointer; padding: 4px; transition: transform 0.2s;';
        btnEliminar.onmouseover = () => btnEliminar.style.transform = 'scale(1.1)';
        btnEliminar.onmouseout = () => btnEliminar.style.transform = 'scale(1)';
        
        const imgEliminar = document.createElement('img');
        imgEliminar.src = 'assets/icons/icon-basurero.png'; 
        imgEliminar.alt = 'Eliminar';
        imgEliminar.style.cssText = 'width: 20px; height: 20px; object-fit: contain;';
        
        btnEliminar.appendChild(imgEliminar);
        btnEliminar.onclick = () => this.eliminarPlanificacion(params.data);
        btnEliminar.title = 'Eliminar';
        
        container.appendChild(btnEditar);
        container.appendChild(btnEliminar);
        
        return container;
      },
      pinned: 'right',
      sortable: false,
      filter: false
    }
  ];

  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true
  };

  // ===== ESTADO =====
  cargando = false;
  aprobando = false;

  // ===== DATOS DE SESIÓN =====
  idEmpresa!: number;
  idUsuario!: number;
  idZona = 1;
  usuarioActual: LoginUsuarioResponse | null = null;

  constructor(
    private planificacionService: PlanificacionPagoService,
    private usuarioService: UsuarioService,
    private dialog: MatDialog,
    private dialogRef: MatDialogRef<AprobacionPlanificacionesComponent>
  ) {}

  ngOnInit(): void {
    this.cargarDatosUsuario();
    this.cargarPlanificaciones();
  }

  private cargarDatosUsuario(): void {
    this.usuarioActual = this.usuarioService.getUsuarioActual();

    if (!this.usuarioActual) {
      this.showError('Sesión expirada');
      return;
    }

    this.idEmpresa = this.usuarioActual.id_empresa;
    this.idUsuario = this.usuarioActual.id_usuario;
  }

  cargarPlanificaciones(): void {
    this.cargando = true;

    this.planificacionService.getPlanificacionesPendientes(
      this.idEmpresa,
      undefined,
      undefined,
      undefined,
      0  // Solo pendientes
    ).subscribe({
      next: (response) => {
        if (response.type === 'LIST' && response.data) {
          this.planificacionesRows = this.agruparPorTransaccion(response.data);
          console.log(`✅ ${this.planificacionesRows.length} transacciones cargadas`);
        } else {
          this.showError(response.message || 'Error al cargar');
        }
        this.cargando = false;
      },
      error: (err) => {
        console.error('❌ Error:', err);
        this.showError('Error de conexión');
        this.cargando = false;
      }
    });
  }

  // ===== MÉTODO PARA ELIMINAR PLANIFICACIÓN =====
  eliminarPlanificacion(transaccion: TransaccionAgrupada): void {
    // Confirmar eliminación
    const dialogRef = this.dialog.open(CustomMessageBoxComponent, {
      data: {
        title: 'Confirmar Eliminación',
        message: `¿Está seguro de eliminar la transacción ${transaccion.num_transaccion}?\n\n` +
                `• Documentos: ${transaccion.cantidad_documentos}\n` +
                `• Total: $${transaccion.total_planificado.toFixed(2)}\n\n` +
                `Esta acción no se puede deshacer.`,
        type: 'warning',
        confirmText: 'Sí, eliminar',
        cancelText: 'Cancelar',
        showCancel: true
      } as MessageBoxData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.ejecutarEliminacion(transaccion);
      }
    });
  }

  private ejecutarEliminacion(transaccion: TransaccionAgrupada): void {
    const loadingDialog = this.dialog.open(CustomMessageBoxComponent, {
      data: {
        title: 'Eliminando Planificación',
        message: 'Por favor espere...',
        type: 'info',
        isLoading: true,
        loadingText: 'Procesando eliminación...'
      } as MessageBoxData,
      disableClose: true
    });

    this.planificacionService.eliminarPlanificacion({
      numero_transaccion: transaccion.num_transaccion,
      id_empresa: this.idEmpresa,
      id_usuario: this.idUsuario,
      motivo: `Eliminación de planificación ${transaccion.num_transaccion} desde interfaz de carga`
    }).subscribe({
      next: (response) => {
        loadingDialog.close();

        if (response.type === 'SUCCESS') {
          this.dialog.open(CustomMessageBoxComponent, {
            data: {
              title: 'Eliminación Exitosa',
              message: `✅ Transacción ${transaccion.num_transaccion} eliminada correctamente\n\n` +
                      `Documentos eliminados: ${response.data?.cantidad_eliminada || transaccion.cantidad_documentos}`,
              type: 'success',
              confirmText: 'Aceptar',
              showCancel: false
            } as MessageBoxData
          }).afterClosed().subscribe(() => {
            this.cargarPlanificaciones();
          });
        } else {
          this.showError(response.message || 'Error al eliminar la planificación');
        }
      },
      error: (err) => {
        loadingDialog.close();
        console.error('❌ Error:', err);
        
        let mensajeError = 'Error de conexión al eliminar';
        if (err.error?.message) {
          mensajeError = err.error.message;
        } else if (err.message) {
          mensajeError = err.message;
        }
        
        this.showError(mensajeError);
      }
    });
  }
  
  private agruparPorTransaccion(planificaciones: PlanificacionPagoResponse[]): TransaccionAgrupada[] {
    const grupos = new Map<number, PlanificacionPagoResponse[]>();

    planificaciones.forEach(p => {
      if (!grupos.has(p.num_transaccion)) {
        grupos.set(p.num_transaccion, []);
      }
      grupos.get(p.num_transaccion)!.push(p);
    });

    return Array.from(grupos.entries()).map(([numTrans, items]) => {
      const primera = items[0];
      
      // ⭐ CALCULAR CORRECTAMENTE: Separar facturas de anticipos
      const totalFacturas = items
        .filter(i => i.valor_pago > 0)  // Facturas (positivas)
        .reduce((sum, i) => sum + i.valor_pago, 0);
      
      const totalAnticipos = Math.abs(
        items
          .filter(i => i.valor_pago < 0)  // Anticipos (negativos)
          .reduce((sum, i) => sum + i.valor_pago, 0)
      );
      
      // Total neto = Facturas - Anticipos
      const totalNeto = totalFacturas - totalAnticipos;
      
      return {
        num_transaccion: numTrans,
        fecha: primera.fecha || '',
        observacion: primera.comentario || 'Sin observación',
        cantidad_documentos: items.length,
        total_planificado: Math.abs(totalNeto),  // ⭐ Valor absoluto para mostrar
        forma_pago: primera.descripcion_forma_pago || '',
        cuenta_banco: primera.cuenta_banco || '',
        usuario: primera.nombre_usuario_ingreso || '',
        proveedores: [...new Set(items.map(i => i.nombre_proveedor))].join(', '),
        _items: items
      };
    });
  }

  aprobarSeleccionadas(): void {
    const seleccionadas = this.gridApi?.getSelectedRows() as TransaccionAgrupada[];

    if (!seleccionadas || seleccionadas.length === 0) {
      this.showError('Seleccione al menos una transacción');
      return;
    }

    const totalDocs = seleccionadas.reduce((sum, s) => sum + s.cantidad_documentos, 0);
    const totalMonto = seleccionadas.reduce((sum, s) => sum + s.total_planificado, 0);

    const dialogRef = this.dialog.open(CustomMessageBoxComponent, {
      data: {
        title: 'Confirmar Aprobación',
        message: `¿Aprobar ${seleccionadas.length} transacción(es)?\n\n` +
                 `• Documentos: ${totalDocs}\n` +
                 `• Monto total: $${totalMonto.toFixed(2)}`,
        type: 'warning',
        confirmText: 'Sí, aprobar',
        cancelText: 'Cancelar',
        showCancel: true
      } as MessageBoxData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.ejecutarAprobacion(seleccionadas);
      }
    });
  }

  private ejecutarAprobacion(transacciones: TransaccionAgrupada[]): void {
    const loadingDialog = this.dialog.open(CustomMessageBoxComponent, {
      data: {
        title: 'Aprobando Pagos',
        message: 'Por favor espere...',
        type: 'info',
        isLoading: true,
        loadingText: 'Procesando aprobaciones...'
      } as MessageBoxData,
      disableClose: true
    });

    this.aprobando = true;

    const promesas = transacciones.map(t => {
      const request: AprobarPlanificacionRequest = {
        numero_transaccion: t.num_transaccion,
        id_empresa: this.idEmpresa,
        id_usuario: this.idUsuario,
        id_zona: this.idZona,
        id_tipo_asiento: 6
      };

      return this.planificacionService.aprobarPlanificacion(request).toPromise();
    });

    Promise.all(promesas).then(responses => {
      loadingDialog.close();
      
      const exitosos = responses.filter(r => r?.type === 'SUCCESS').length;
      const fallidos = responses.length - exitosos;
      
      if (exitosos > 0) {
        const successDialog = this.dialog.open(CustomMessageBoxComponent, {
          data: {
            title: 'Aprobación Completada',
            message: `✅ ${exitosos} transacción(es) aprobadas` +
                     (fallidos > 0 ? `\n⚠️ ${fallidos} fallidas` : ''),
            type: 'success',
            confirmText: 'Aceptar',
            showCancel: false
          } as MessageBoxData
        });

        successDialog.afterClosed().subscribe(() => {
          this.cargarPlanificaciones();
        });
      } else {
        this.showError('No se pudo aprobar ninguna transacción');
      }
      
      this.aprobando = false;
    }).catch(err => {
      loadingDialog.close();
      console.error('❌ Error:', err);
      this.showError('Error al aprobar: ' + (err.message || 'Error desconocido'));
      this.aprobando = false;
    });
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    this.gridApi.sizeColumnsToFit();
  }

  private formatDate(value: string | null): string {
    if (!value) return '';
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }

  private formatCurrency(value: number): string {
    return `$${value.toFixed(2)}`;
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
  verDetalle(transaccion: TransaccionAgrupada): void {
    const dialogRef = this.dialog.open(DetalleTransaccionDialogComponent, {
      width: '900px',
      data: {
        numTransaccion: transaccion.num_transaccion,
        documentos: transaccion._items,  // Pasa los items directamente
        totalTransaccion: transaccion.total_planificado
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.aprobar) {
        this.aprobarDocumentosEspecificos(
          transaccion.num_transaccion, 
          result.documentos
        );
      }
    });
  }

  private aprobarDocumentosEspecificos(
    numTransaccion: number, 
    documentos: number[]
  ): void {
    const loadingDialog = this.dialog.open(CustomMessageBoxComponent, {
      data: {
        title: 'Aprobando Pagos',
        message: `Aprobando ${documentos.length} documento(s)...`,
        type: 'info',
        isLoading: true
      } as MessageBoxData,
      disableClose: true
    });

    const request: AprobarPlanificacionRequest = {
      numero_transaccion: numTransaccion,
      id_empresa: this.idEmpresa,
      id_usuario: this.idUsuario,
      id_zona: this.idZona,
      id_tipo_asiento: 6,
      documentos_a_aprobar: documentos  // ⭐ Lista de IDs
    };

    this.planificacionService.aprobarPlanificacion(request).subscribe({
      next: (response) => {
        loadingDialog.close();
        
        if (response.type === 'SUCCESS') {
          this.dialog.open(CustomMessageBoxComponent, {
            data: {
              title: 'Éxito',
              message: `✅ ${documentos.length} documento(s) aprobado(s)`,
              type: 'success'
            } as MessageBoxData
          });
          
          this.cargarPlanificaciones();
        } else {
          this.showError(response.message || 'Error al aprobar');
        }
      },
      error: (err) => {
        loadingDialog.close();
        this.showError('Error: ' + err.message);
      }
    });
  }
  // ===== MÉTODO PARA CARGAR PLANIFICACIÓN =====
  cargarPlanificacion(transaccion: TransaccionAgrupada): void {
    console.log('🔄 Cargando planificación en grid principal:', transaccion);
    
    // Cerrar el modal y devolver los datos
    this.dialogRef.close({
      cargar: true,
      transaccion: transaccion
    });
  }
}