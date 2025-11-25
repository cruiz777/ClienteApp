import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import {
  ColDef,
  GridApi,
  GridReadyEvent,
  CellClickedEvent,
} from 'ag-grid-community';
import { MatDialog } from '@angular/material/dialog';
import { AnticipoResponse } from 'src/app/interfaces/responses/anticipo-response';
import { AnticipoLiquidaResponse } from 'src/app/interfaces/responses/anticipo-liquida-response';
import { AnticipoService } from 'src/app/services/anticipo.service';
import { AnticipoLiquidaService } from 'src/app/services/anticipo-liquida.service';
import { CustomMessageBoxComponent } from 'src/app/components/utils/messages/custom-message-box.component';
import { TipoAnticipo } from 'src/app/interfaces/responses/tipo-anticipo-response';
import { TipoAnticipoService } from 'src/app/services/tipo-anticipo.service';

@Component({
  selector: 'app-cierre-anticipos',
  templateUrl: './cierre-anticipos.component.html',
  styleUrls: ['./cierre-anticipos.component.css'],
})
export class CierreAnticiposComponent implements OnInit {
  selectedTab: 'cierre' | 'liquidados' = 'cierre';

  filtroCierreForm!: FormGroup;
  filtroLiquidadosForm!: FormGroup;

  columnDefsCierre: ColDef[] = [];
  columnDefsLiquidados: ColDef[] = [];
  defaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: true,
    flex: 1,
    minWidth: 110,
  };

  rowDataCierre: AnticipoResponse[] = [];
  rowDataLiquidados: AnticipoLiquidaResponse[] = [];
  tiposAnticipo: TipoAnticipo[] = [];
  private gridApiCierre!: GridApi;
  private gridApiLiquidados!: GridApi;

  // Paginación
  currentPageCierre = 1;
  pageSizeCierre = 50;
  totalItemsCierre = 0;

  currentPageLiquidados = 1;
  pageSizeLiquidados = 50;
  totalItemsLiquidados = 0;

  // Loading states
  loadingCierre = false;
  loadingLiquidados = false;

  // Modal
  showModalLiquidar = false;
  anticipoSeleccionado: AnticipoResponse | null = null;

  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
    private anticipoService: AnticipoService,
    private anticipoLiquidaService: AnticipoLiquidaService,
    private tipoAnticipoService: TipoAnticipoService
  ) {}

  ngOnInit(): void {
    this.buildForms();
    this.buildColumns();
    this.loadTiposAnticipo();
    this.loadAnticiposDisponibles();
  }

  private buildForms(): void {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    this.filtroCierreForm = this.fb.group({
      fechaInicio: [formatDate(firstDayOfMonth)],
      fechaHasta: [formatDate(today)],
      tipoAnticipo: [''],
      cliente: [''],
    });

    this.filtroLiquidadosForm = this.fb.group({
      fechaInicio: [formatDate(firstDayOfMonth)],
      fechaHasta: [formatDate(today)],
      cliente: [''],
    });
  }

  private buildColumns(): void {
    this.columnDefsCierre = [
      {
        headerName: 'Anticipo',
        field: 'numero_anticipo',
        width: 120,
        valueFormatter: (params) => {
          // Si numero_anticipo es null, mostrar el ID
          return params.data?.id_anticipo || `#${params.data?.id_anticipo || ''}`;
        },
      },
      {
        headerName: 'Fecha',
        field: 'fecha',
        width: 110,
        valueFormatter: (params) => {
          if (!params.value) return '';
          return new Date(params.value).toLocaleDateString('es-EC');
        },
      },
      {
        headerName: 'Cliente',
        field: 'nombre_cliente',
        minWidth: 200,
        valueFormatter: (params) => {
          return params.value || `Código: ${params.data?.clientes_codigo || 'N/A'}`;
        },
      },
      {
        headerName: 'Monto Original',
        field: 'monto',
        type: 'rightAligned',
        width: 130,
        valueFormatter: (params) =>
          params.value != null ? `$${params.value.toFixed(2)}` : '$0.00',
      },
      {
        headerName: 'Saldo',
        field: 'monto',
        type: 'rightAligned',
        width: 130,
        valueFormatter: (params) =>
          params.value != null ? `$${params.value.toFixed(2)}` : '$0.00',
        cellStyle: (params) => ({
          color: params.value > 0 ? '#059669' : '#dc2626',
          fontWeight: params.value > 0 ? '600' : 'normal'
        }),
      },
      {
        headerName: 'Concepto',
        field: 'concepto',
        minWidth: 180,
      },
      {
        headerName: 'Forma Pago',
        field: 'descripcion_forma_pago',
        width: 150,
      },
      {
        headerName: 'Cierre',
        colId: 'cierreAction',
        width: 90,
        cellRenderer: (params: any) => {
          const saldo = params.data?.monto || 0;
          if (saldo > 0) {
            return `<img src="assets/icons/icon-cancelar.png"
                         class="action-icon"
                         title="Liquidar anticipo"
                         style="cursor: pointer; width: 24px; height: 24px;" />`;
          }
          return '<span style="color: #9ca3af; font-size: 11px;">Sin saldo</span>';
        },
        sortable: false,
        filter: false,
      },
      {
        headerName: 'Desglose',
        colId: 'desgloseAction',
        width: 90,
        cellRenderer: () =>
          `<img src="assets/icons/icon-imprimir.png"
                class="action-icon"
                title="Ver desglose"
                style="cursor: pointer; width: 24px; height: 24px;" />`,
        sortable: false,
        filter: false,
      },
    ];

    this.columnDefsLiquidados = [
      {
        headerName: '# Liquidación',
        field: 'num_liquidacion',
        width: 100,
      },
      {
        headerName: 'Fecha Liq',
        field: 'fecha_liquidacion',
        width: 110,
        valueFormatter: (params) => {
          if (!params.value) return '';
          // Parsear como fecha local sin conversión de zona horaria
          const [year, month, day] = params.value.split('-');
          const date = new Date(year, month - 1, day);
          return date.toLocaleDateString('es-EC');
        },
      },
      {
        headerName: '# Anticipo',
        field: 'id_anticipo',
        width: 100,
      },
      {
        headerName: 'Cliente',
        field: 'nombre_cliente',
        minWidth: 280,
        valueFormatter: (params) => {
          return params.value || `Código: ${params.data?.clientes_codigo || 'N/A'}`;
        },
      },
      {
        headerName: 'Valor',
        field: 'valor_liquidado',
        type: 'rightAligned',
        width: 120,
        valueFormatter: (params) =>
          params.value != null ? `$${params.value.toFixed(2)}` : '$0.00',
      },
      {
        headerName: 'Concepto',
        field: 'concepto',
        minWidth: 180,
      },
      {
        headerName: 'Beneficiario',
        field: 'beneficiario',
        width: 150,
      },
      {
        headerName: 'Usuario',
        field: 'usuario_ingreso',
        width: 120,
      },
      {
        headerName: 'Detalle',
        colId: 'liqAction',
        width: 90,
        cellRenderer: () =>
          `<img src="assets/icons/icon-imprimir.png"
                class="action-icon"
                title="Ver detalle"
                style="cursor: pointer; width: 24px; height: 24px;" />`,
        sortable: false,
        filter: false,
      },
    ];
  }

  // ==================== CARGAR DATOS ====================

  public loadAnticiposDisponibles(): void {
    this.loadingCierre = true;
    const filters = this.filtroCierreForm.value;

    //  Ajustar fechaHasta para incluir todo el día
    let fechaHasta = filters.fechaHasta;
    if (fechaHasta) {
      fechaHasta = `${fechaHasta}T23:59:59`;
    }

    this.anticipoService
      .getAll({
        page: this.currentPageCierre,
        pageSize: this.pageSizeCierre,
        cancelado: false,
        estado: true,
        utilizado: false,
        fechaDesde: filters.fechaInicio || undefined,
        fechaHasta: fechaHasta || undefined,
        idTipoAnticipo: filters.tipoAnticipo || undefined,
        cliente: filters.cliente || undefined, //  AGREGAR ESTA LÍNEA
      })
      .subscribe({
        next: (response) => {
          if (response.type === 'success' && response.data) {
            this.rowDataCierre = response.data.items;
            this.totalItemsCierre = response.data.totalItems;
          } else {
            this.rowDataCierre = [];
            this.totalItemsCierre = 0;
          }
          this.loadingCierre = false;
        },
        error: (error) => {
          console.error('Error cargando anticipos:', error);
          this.showMessageBox(
            'Error',
            'No se pudieron cargar los anticipos disponibles para liquidar',
            'error'
          );
          this.loadingCierre = false;
        },
      });
  }
  private loadTiposAnticipo(): void {
    this.tipoAnticipoService.getAll().subscribe({
      next: (response) => {
        if (response.type === 'success' && response.data) {
          this.tiposAnticipo = response.data;
        }
      },
      error: (error) => {
        console.error('Error cargando tipos de anticipo:', error);
        this.tiposAnticipo = [];
      },
    });
  }
  public loadLiquidaciones(): void {
    this.loadingLiquidados = true;
    const filters = this.filtroLiquidadosForm.value;

    let fechaHasta = filters.fechaHasta;
    if (fechaHasta) {
      fechaHasta = `${fechaHasta}T23:59:59`;
    }

    this.anticipoLiquidaService
      .getAll({
        page: this.currentPageLiquidados,
        pageSize: this.pageSizeLiquidados,
        fechaDesde: filters.fechaInicio || undefined,
        fechaHasta: fechaHasta || undefined,
        nombreCliente: filters.cliente || undefined,
      })
      .subscribe({
        next: (response) => {
          if (response.type === 'success' && response.data) {
            this.rowDataLiquidados = response.data.items;
            this.totalItemsLiquidados = response.data.totalItems;
          } else {
            this.rowDataLiquidados = [];
            this.totalItemsLiquidados = 0;
          }
          this.loadingLiquidados = false;
        },
        error: (error) => {
          console.error('Error cargando liquidaciones:', error);
          this.showMessageBox(
            'Error',
            'No se pudieron cargar las liquidaciones',
            'error'
          );
          this.loadingLiquidados = false;
        },
      });
  }

  // ==================== GRID EVENTS ====================

  onGridReadyCierre(event: GridReadyEvent): void {
    this.gridApiCierre = event.api;
    this.gridApiCierre.sizeColumnsToFit();
  }

  onGridReadyLiquidados(event: GridReadyEvent): void {
    this.gridApiLiquidados = event.api;
    this.gridApiLiquidados.sizeColumnsToFit();
  }

  onCellClickedCierre(event: CellClickedEvent): void {
    const saldo = event.data?.monto || 0;

    if (event.colDef.colId === 'cierreAction' && saldo > 0) {
      this.abrirModalLiquidar(event.data);
    } else if (event.colDef.colId === 'desgloseAction') {
      this.verDesglose(event.data);
    }
  }

  onCellClickedLiquidados(event: CellClickedEvent): void {
    if (event.colDef.colId === 'liqAction') {
      this.verDetalleLiquidacion(event.data);
    }
  }

  // ==================== ACCIONES BOTONES ====================

  onNuevoCierre(): void {
    // Limpiar filtros
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    this.filtroCierreForm.patchValue({
      fechaInicio: formatDate(firstDayOfMonth),
      fechaHasta: formatDate(today),
      tipoAnticipo: '',
      cliente: ''
    });

    // Recargar con filtros limpios
    this.currentPageCierre = 1;
    this.loadAnticiposDisponibles();
  }

  onBuscarCierre(): void {
    this.currentPageCierre = 1;
    this.loadAnticiposDisponibles();
  }

  onNuevoLiq(): void {
      // Limpiar filtros
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    this.filtroLiquidadosForm.patchValue({
      fechaInicio: formatDate(firstDayOfMonth),
      fechaHasta: formatDate(today),
      cliente: ''
    });

    // Recargar con filtros limpios
    this.currentPageLiquidados = 1;
    this.loadLiquidaciones();
  }

  onBuscarLiq(): void {
    this.currentPageLiquidados = 1;
    this.loadLiquidaciones();
  }

  // ==================== ACCIONES PRINCIPALES ====================

  private abrirModalLiquidar(anticipo: AnticipoResponse): void {
    this.anticipoSeleccionado = anticipo;
    this.showModalLiquidar = true;
  }

  private verDesglose(anticipo: AnticipoResponse): void {
    // TODO: Implementar modal de desglose
    console.log('Ver desglose del anticipo:', anticipo);
    this.showMessageBox(
      'Información',
      `Desglose del anticipo ${anticipo.id_anticipo}<br><br>Esta funcionalidad se implementará próximamente`,
      'info'
    );
  }

  private verDetalleLiquidacion(liquidacion: AnticipoLiquidaResponse): void {
    // TODO: Implementar modal de detalle
    console.log('Ver detalle de liquidación:', liquidacion);
    this.showMessageBox(
      'Información',
      `Detalle de la liquidación #${liquidacion.num_liquidacion}<br><br>Esta funcionalidad se implementará próximamente`,
      'info'
    );
  }

  // ==================== CALLBACK DEL MODAL ====================

  onLiquidacionExitosa(): void {
    this.showModalLiquidar = false;
    this.anticipoSeleccionado = null;

    this.showMessageBox(
      'Éxito',
      'La liquidación se ha registrado correctamente',
      'success'
    );

    // Recargar ambas tablas
    this.loadAnticiposDisponibles();
    this.loadLiquidaciones();
  }

  onCerrarModal(): void {
    // Verificar si el formulario tiene cambios
    const dialogRef = this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: {
        title: '¿Cerrar liquidación?',
        message: '¿Está seguro que desea cerrar? Los datos ingresados se perderán.',
        type: 'warning',
        confirmText: 'Sí, cerrar',
        cancelText: 'Cancelar',
        showCancel: true,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.showModalLiquidar = false;
        this.anticipoSeleccionado = null;
      }
    });
  }

  // ==================== UTILIDADES ====================

  private showMessageBox(
    title: string,
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info'
  ): void {
    this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: {
        title,
        message,
        type,
        confirmText: 'Aceptar',
        showCancel: false,
      },
    });
  }
}
