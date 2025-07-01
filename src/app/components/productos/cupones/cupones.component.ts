import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatDialog, MatDialogContent, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridApi, GridOptions, GridReadyEvent, SelectionChangedEvent } from 'ag-grid-community';


import { ClienteSeleccionadoService } from 'src/app/services/cliente-seleccionado.service';
import { PrefijoService } from 'src/app/services/prefijo.service';
import { UsuarioService } from 'src/app/services/usuario.service';
import { ExportService } from 'src/app/services/export.service';

import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
import { ButtonRendererComponent } from '../../utils/grid/button-renderer.component';
import { StatusRendererComponent } from '../../utils/grid/status-renderer.component';
import { ConfirmDialogComponent } from '../../reusable/confirm-dialog/confirm-dialog.component';


import { CuponResponse } from 'src/app/interfaces/responses/cupon-response';
import { CuponRequest } from 'src/app/interfaces/requests/cupon-request';
import { DeleteCuponRequest } from 'src/app/interfaces/requests/delete-cupon-request';
import { SimplePrefijoResponse } from 'src/app/interfaces/responses/prefijo-simple';
import { Cliente } from 'src/app/interfaces/cliente';
import { CuponService } from 'src/app/services/cupones.service';
import { ObservacionDialogComponent } from '../nuevo-sscc/observacion-dialog.component';

interface CuponTablaView {
  id: number;
  empresa: string;
  idPrefijo: number;
  prefijo: string;
  serial: number;
  cupon: string;
  descripcion?: string;  // Hacer opcional
  categoria?: string;    // Hacer opcional
  fecha?: string;
  fecha_creacion?: string; // Hacer opcional
  estado: string;
  usuario?: number | string;
  seleccionado: boolean;
}

@Component({
  selector: 'app-cupones',
  standalone: true,
  templateUrl: './cupones.component.html',
  styleUrls: ['./cupones.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatCheckboxModule,
    MatIconModule,
    MatMenuModule,
    MatTableModule,
    MatSortModule,
    MatDatepickerModule,
    MatPaginatorModule,
    AgGridModule,
    ButtonRendererComponent,
    MatDialogModule
  ]
})
export class CuponesComponent implements OnInit {
  private gridApi!: GridApi<CuponTablaView>;
  selectedRows: CuponTablaView[] = [];
  usuario: any;
  
  // Configuración del grid
  columnDefs: ColDef[] = [
    {
      headerName: '',
      checkboxSelection: true,
      headerCheckboxSelection: true,
      width: 50,
      pinned: 'left',
      lockPosition: true,
      sortable: false,
      filter: false,
      resizable: false
    },
    {
      headerName: '#',
      valueGetter: 'node.rowIndex + 1',
      width: 70,
      pinned: 'left',
      sortable: false,
      filter: false,
      cellClass: 'text-center font-medium text-gray-600'
    },
    { 
      field: 'empresa', 
      headerName: 'Empresa', 
      filter: 'agTextColumnFilter',
      width: 200,
      cellClass: 'font-medium text-gray-800'
    },
    { 
      field: 'prefijo', 
      headerName: 'Prefijo', 
      filter: 'agTextColumnFilter',
      width: 120,
      cellClass: 'text-center font-mono bg-blue-50'
    },
    {
      field: 'serial',
      headerName: 'Serial',
      filter: 'agNumberColumnFilter',
      width: 120,
      cellClass: 'text-right font-mono',
      valueFormatter: (params) => params.value?.toString() || 'N/A'
    },
    { 
      field: 'cupon', 
      headerName: 'Cupón', 
      filter: 'agTextColumnFilter',
      width: 200,
      cellClass: 'font-mono text-sm',
      tooltipField: 'cupon'
    },
    { 
      field: 'descripcion', 
      headerName: 'Descripción', 
      filter: 'agTextColumnFilter',
      width: 250,
      cellClass: 'text-gray-600'
    },
    { 
      field: 'categoria', 
      headerName: 'Categoría', 
      filter: 'agTextColumnFilter',
      width: 150,
      cellClass: 'text-gray-600'
    },
    { 
      field: 'fecha', 
      headerName: 'Fecha', 
      filter: 'agDateColumnFilter',
      width: 160,
      cellClass: 'text-gray-600',
      valueFormatter: (params) => {
        if (params.value) {
          return new Date(params.value).toLocaleDateString('es-EC', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
        return '';
      }
    },
    { 
      field: 'estado', 
      headerName: 'Estado', 
      filter: 'agSetColumnFilter',
      width: 120,
      cellRenderer: StatusRendererComponent,
      cellClass: 'text-center'
    },
    { 
      field: 'usuario', 
      headerName: 'Usuario', 
      filter: 'agTextColumnFilter',
      width: 140,
      cellClass: 'text-gray-700'
    },
    {
      headerName: 'Acciones',
      cellRenderer: ButtonRendererComponent,
      width: 120,
      pinned: 'right',
      sortable: false,
      filter: false,
      cellRendererParams: {
        buttons: [
          {
            icon: 'visibility',
            tooltip: 'Ver detalle',
            color: 'primary',
            onClick: (params: any) => this.verDetalle(params.data)
          },
          {
            icon: 'edit',
            tooltip: 'Editar',
            color: 'accent',
            onClick: (params: any) => this.editarRegistro(params.data)
          }
        ]
      }
    }
  ];

  defaultColDef: ColDef = {
    sortable: true,
    resizable: true,
    filter: true,
    floatingFilter: true,
    menuTabs: ['filterMenuTab', 'generalMenuTab'],
    cellClass: 'ag-cell-focus'
  };

  gridOptions: GridOptions =  {
    animateRows: true,
    enableRangeSelection: true,
    suppressRowClickSelection: true,
    rowSelection: 'multiple',
    suppressCellFocus: false,
    enableCellTextSelection: true,
    pagination: true,
    paginationPageSize: 50,
    paginationPageSizeSelector: [50, 100, 200, 500],
    overlayLoadingTemplate: '<span class="ag-overlay-loading-center">Cargando datos...</span>',
    overlayNoRowsTemplate: '<span class="ag-overlay-no-rows-center">No hay datos para mostrar</span>',
    rowHeight: 48,
    headerHeight: 50,
    floatingFiltersHeight: 35,
    onSelectionChanged: (event: SelectionChangedEvent) => this.onSelectionChanged(event)
  };

  activeTab: string = 'Listado';
  prefijosDisponibles: { id: number, codpre: string }[] = [];
  clienteSeleccionadoObj: Cliente | null = null;
  
  // Filtros
  filtroBusqueda = '';
  filtroPrefijo: number | null = null;
  filtroSerialDesde: string = '';
  filtroSerialHasta: string = '';
  buscarCuponControl = new FormControl('');
  
  // Datos
  cuponesData: CuponTablaView[] = [];
  totalItems = 0;
  pageIndex = 0;
  pageSize = 50;
  pageSizeOptions = [50, 100, 200, 500];

  // Formulario Generar
  formCupon: FormGroup;
  codigoGenerado = false;
  cuponesGenerados: any[] = [];
  
  // Formulario Reportes
  formReporte: FormGroup;
  estados = ['Activo', 'Inactivo'];

  constructor(
    private fb: FormBuilder,
    private cuponService: CuponService,
    private clienteSeleccionadoService: ClienteSeleccionadoService,
    private prefijoService: PrefijoService,
    private usuarioService: UsuarioService,
    private dialog: MatDialog,
    private exportService: ExportService
  ) {
    // Formulario Generar
    this.formCupon = this.fb.group({
      codigoCliente: [''],
      cliente: [''],
      ruc: [''],
      prefijo: [null, Validators.required],
      descripcion: ['', Validators.required],
      categoria: [''],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      serie: [false],
      inicio: [1],
      codigosGenerados: ['']
    });

    // Formulario Reportes
    this.formReporte = this.fb.group({
      prefijo: [''],
      estado: [''],
      desde: [null],
      hasta: [null],
      operadorFecha: ['=']
    });
  }

  ngOnInit(): void {
    this.usuarioService.currentUser$.subscribe(usuario => {
      this.usuario = usuario;
    });

    const cliente = this.clienteSeleccionadoService.obtenerClienteActual();
    this.clienteSeleccionadoObj = cliente;

    if (!cliente) {
      this.mostrarMensaje({
        title: 'Cliente no seleccionado',
        message: 'Debes seleccionar al menos un cliente para continuar.',
        type: 'warning'
      });
      return;
    }

    this.cargarPrefijosPorCliente();
    this.initFiltroBusquedaListener();
    this.cargarCuponesActual();

    // Setear datos del cliente en el formulario
    this.formCupon.patchValue({
      codigoCliente: cliente.clientes_codigo,
      cliente: cliente.nomcli,
      ruc: cliente.ruc
    });

    // Controlar campos de secuencia
    this.formCupon.get('serie')?.valueChanges.subscribe((checked: boolean) => {
      const inicioControl = this.formCupon.get('inicio');
      checked ? inicioControl?.enable() : inicioControl?.disable();
    });

    this.formCupon.get('inicio')?.disable();
  }

  // ========== LISTADO ==========
  cargarCupones(page: number = 0, size: number = 10): void {
    const cliente = this.clienteSeleccionadoService.obtenerClienteActual();
    if (!cliente) return;

    const idPrefijoSeleccionado = this.filtroPrefijo;

    const filtros = {
      page: page + 1,
      pageSize: size,
      idCliente: cliente.clientes_codigo,
      idPrefijo: idPrefijoSeleccionado ?? undefined,
      codigoCupon: this.filtroBusqueda?.trim() || undefined,
      serial: this.filtroSerialDesde ? parseInt(this.filtroSerialDesde) : undefined,
      estado: this.formReporte.value.estado === 'Activo' ? true : 
              this.formReporte.value.estado === 'Inactivo' ? false : undefined,
      fechaDesde: this.formReporte.value.desde || undefined,
      fechaHasta: this.formReporte.value.hasta || undefined
    };

    this.cuponService.buscarCupones(filtros).subscribe({
      next: (response) => {
        const mappedData = response.data.items.map((item: CuponResponse) => {
          const codpre = this.prefijosDisponibles.find(p => p.id === item.idPrefijo)?.codpre || 'N/A';

          return {
            id: item.id_cupon,
            idPrefijo: item.idPrefijo,
            empresa: cliente?.nomcli || 'ECOP',
            prefijo: codpre,
            serial: item.serial,
            cupon: item.codigoCupon,
            // descripcion: item.descripcion,
            // categoria: item.categoria_producto,
            // fecha: item.fechaInicio,
            estado: item.estado ? 'Activo' : 'Inactivo',
            usuario: 1,
            seleccionado: false
          };
        });

        this.cuponesData = mappedData;
        this.totalItems = response.data.totalItems;
        this.pageIndex = response.data.page - 1;
        this.pageSize = response.data.pageSize;
      },
      error: (err) => console.error('Error al cargar cupones:', err)
    });
  }

  cargarPrefijosPorCliente(): void {
    const cliente = this.clienteSeleccionadoService.obtenerClienteActual();
    if (!cliente) return;
         
    this.prefijoService.obtenerPrefijosUnicosPorCliente(cliente.clientes_codigo).subscribe({
      next: (res) => {
        this.prefijosDisponibles = res.map(p => ({
          id: p.idPrefijos,
          codpre: p.codpre
        }));
      },
      error: (err) => console.error('Error al cargar prefijos:', err)
    });
  }

  buscarConFiltros(): void {
    this.pageIndex = 0;
    this.cargarCupones(0, this.pageSize);
  }

  buscarCupon(): void {
    const codigoCupon = this.buscarCuponControl.value?.trim();
    const cliente = this.clienteSeleccionadoService.obtenerClienteActual();

    if (!codigoCupon) {
      this.mostrarMensaje({
        title: 'Campo vacío',
        message: 'Por favor, ingresa un código de cupón.',
        type: 'warning'
      });
      return;
    }

    this.cuponService.buscarCupones({ codigoCupon }).subscribe({
      next: (res) => {
        if (res.type === 'ERROR' || !res.data || res.data.items.length === 0) {
          this.mostrarMensaje({
            title: 'No encontrado',
            message: 'El código de cupón no existe.',
            type: 'warning'
          });
          return;
        }

        const item = res.data.items[0];
        const codpre = this.prefijosDisponibles.find(p => Number(p.id) === Number(item.idPrefijo))?.codpre || 'N/A';
        const formatFecha = (fecha: Date): string =>
           fecha.toISOString().split('T')[0]; // "2025-06-30"
        const registro: CuponTablaView = {
          id: item.id_cupon,
          empresa: cliente?.nomcli || 'ECOP',
          idPrefijo: item.idPrefijo,
          prefijo: codpre,
          serial: item.serial,
          cupon: item.codigoCupon,
          // descripcion: item.descripcion,
          // categoria: item.categoria_producto,
          fecha: item.fechaInicio ?? '',
          estado: item.estado ? 'Activo' : 'Inactivo',
          usuario: '1',
          seleccionado: false
        };

        this.cuponesData = [registro];
        this.totalItems = 1;
      },
      error: (err) => {
        this.mostrarMensaje({
          title: 'Error',
          message: err?.error?.message || 'Error al buscar el cupón.',
          type: 'error'
        });
      }
    });
  }

  // ========== GENERAR ==========
  generarCupones(): void {
    if (!this.formCupon.valid) {
      this.mostrarMensaje({
        title: 'Formulario inválido',
        message: 'Por favor complete todos los campos requeridos.',
        type: 'warning'
      });
      return;
    }

    const cantidad = this.formCupon.get('cantidad')?.value;
    const inicio = this.formCupon.get('inicio')?.value || 1;
    const cliente = this.clienteSeleccionadoService.obtenerClienteActual();
    const usuario = this.usuarioService.getUsuarioActual();

    if (!cliente || !usuario) {
      this.mostrarMensaje({
        title: 'Error de sesión',
        message: 'Cliente o usuario no disponible.',
        type: 'error'
      });
      return;
    }

    const payload: CuponRequest = {
      idPrefijo: Number(this.formCupon.get('prefijo')?.value),
      idCliente: cliente.clientes_codigo,
      cantidad: cantidad,
      serie: this.formCupon.get('serie')?.value || false,
      serialInicio: inicio,
      previsualizar: true,
      fechaInicio: this.formatFecha(new Date()),
      fechaCaducidad: this.formatFecha(new Date()),
      estado: true
    };

    this.cuponService.create(payload).subscribe({
      next: (res) => {
        const lista = res.data.map((codigo: string, index: number) => ({
          ia: index + 1,
          cupon: codigo,
          prefijo: this.prefijosDisponibles.find(p => p.id === Number(this.formCupon.get('prefijo')?.value))?.codpre || 'N/A',
          fecha: this.formatFecha(new Date())
        }));


        this.cuponesGenerados = lista;
        this.formCupon.patchValue({ codigosGenerados: lista.length });
        this.codigoGenerado = true;

        this.mostrarMensaje({
          title: 'Previsualización completa',
          message: `Se generaron ${lista.length} cupones. Presiona "Grabar" para guardar.`,
          type: 'info'
        });
      },
      error: (err) => {
        console.error('Error al previsualizar cupones:', err);
        this.mostrarMensaje({
          title: 'Error al generar',
          message: err?.error?.message || 'Error al generar los cupones.',
          type: 'error'
        });
      }
    });
  }
  grabar(): void {
    if (!this.formCupon.valid || this.cuponesGenerados.length === 0) {
      this.mostrarMensaje({
        title: 'No hay cupones para grabar',
        message: 'Primero genera los cupones para luego grabarlos.',
        type: 'warning'
      });
      return;
    }

    const cantidad = this.formCupon.get('cantidad')?.value;
    const inicio = this.formCupon.get('inicio')?.value || 1;
    const cliente = this.clienteSeleccionadoService.obtenerClienteActual();
    const usuario = this.usuarioService.getUsuarioActual();

    if (!cliente || !usuario) {
      this.mostrarMensaje({
        title: 'Error de sesión',
        message: 'Cliente o usuario no disponible.',
        type: 'error'
      });
      return;
    }

    const payload: CuponRequest = {
      idPrefijo: Number(this.formCupon.get('prefijo')?.value),
      idCliente: cliente.clientes_codigo,
      cantidad: cantidad,
      serie: this.formCupon.get('serie')?.value || false,
      serialInicio: inicio,
      previsualizar: false, // ¡Este es el cambio clave!
      fechaInicio: this.formatFecha(new Date()),
      fechaCaducidad: this.formatFecha(new Date()),
      estado: true
    };

    this.cuponService.create(payload).subscribe({
      next: () => {
        this.mostrarMensaje({
          title: 'Cupones guardados',
          message: 'Se grabaron correctamente los cupones generados.',
          type: 'success'
        });
        this.nuevo();
        this.cargarCuponesActual();
      },
      error: (err) => {
        console.error('Error al grabar cupones:', err);
        this.mostrarMensaje({
          title: 'Error al grabar',
          message: err?.error?.message || 'No se pudieron guardar los cupones.',
          type: 'error'
        });
      }
    });
  }

  nuevo(): void {
    this.formCupon.patchValue({
      prefijo: null,
      descripcion: '',
      categoria: '',
      cantidad: 1,
      serie: false,
      inicio: 1,
      codigosGenerados: ''
    });
    this.formCupon.get('inicio')?.disable();
    this.cuponesGenerados = [];
    this.codigoGenerado = false;
  }

  cancelar(): void {
    this.nuevo();
  }

  // ========== ELIMINACIÓN ==========
  eliminarSeleccionados(): void {
    if (this.selectedRows.length === 0) {
      this.mostrarMensaje({
        title: 'Sin selección',
        message: 'Selecciona al menos un registro para eliminar.',
        type: 'warning'
      });
      return;
    }

    const dialogRef = this.dialog.open(ObservacionDialogComponent, {
      width: '450px',
      data: { observacion: '' }
    });

    dialogRef.afterClosed().subscribe((observacion: string | undefined) => {
      if (!observacion) return;

      const payload: DeleteCuponRequest = {
        ids: this.selectedRows.map(row => row.id).filter(id => id != null) as number[],
        observacion,
        usuario: this.usuario.id_usuario
      };

      if (payload.ids.length === 0) {
        this.mostrarMensaje({
          title: 'Error',
          message: 'No hay registros válidos para eliminar.',
          type: 'error'
        });
        return;
      }

      this.cuponService.deleteMultiple(payload).subscribe({
        next: (response) => {
          this.mostrarMensaje({
            title: 'Eliminación exitosa',
            message: response.message || 'Registros eliminados correctamente.',
            type: 'success'
          });
          this.cargarCuponesActual();
          this.selectedRows = [];
        },
        error: (err) => {
          this.mostrarMensaje({
            title: 'Error al eliminar',
            message: 'Ocurrió un error al intentar eliminar los registros.',
            type: 'error'
          });
          console.error(err);
        }
      });
    });
  }

  // ========== REPORTES ==========
  reportes(formato: 'excel' | 'pdf' = 'excel'): void {
    const { prefijo, estado, desde, hasta } = this.formReporte.value;

    const filtros = {
      idPrefijo: prefijo ? Number(prefijo) : undefined,
      estado: estado === 'Activo' ? true : estado === 'Inactivo' ? false : undefined,
      fechaDesde: desde || undefined,
      fechaHasta: hasta || undefined
    };

    this.cuponService.buscarCupones(filtros).subscribe({
      next: (res) => {
        const cliente = this.clienteSeleccionadoObj;

        if (!res.data || res.data.items.length === 0) {
          this.mostrarMensaje({
            title: 'Sin resultados',
            message: 'No se encontraron registros que coincidan con los filtros.',
            type: 'warning'
          });
          return;
        }

        const data = res.data.items.map((item: CuponResponse): CuponTablaView => {
          const codpre = this.prefijosDisponibles.find(p => p.id === item.idPrefijo)?.codpre || 'N/A';

          return {
            id: item.id_cupon,
            idPrefijo: item.idPrefijo,
            empresa: cliente?.nomcli || 'ECOP',
            prefijo: codpre,
            serial: item.serial,
            cupon: item.codigoCupon,
            // descripcion: item.descripcion,
            // categoria: item.categoria_producto,
            fecha: item.fechaInicio ?? '',
            estado: item.estado ? 'Activo' : 'Inactivo',
            // usuario: item.usuario,
            seleccionado: false
          };
        });

        const headers = ['Cupón', 'Prefijo', 'Descripción', 'Categoría', 'Fecha'];
        const columns: (keyof CuponTablaView)[] = ['cupon', 'prefijo', 'descripcion', 'categoria', 'fecha'];

        const options = {
          data,
          columns,
          headers,
          filename: 'reporte_cupones',
          title: 'Reporte de Cupones',
          logoUrl: '/assets/logo.png'
        };

        if (formato === 'excel') {
          this.exportService.exportarExcel(options);
        } else {
          this.exportService.exportarPDF(options);
        }
      },
      error: (err) => {
        this.mostrarMensaje({
          title: 'Error al generar reporte',
          message: err?.error?.message || 'Ocurrió un error al generar el reporte.',
          type: 'error'
        });
      }
    });
  }

  // ========== UTILIDADES ==========
  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
  }

  onSelectionChanged(event: SelectionChangedEvent): void {
    this.selectedRows = this.gridApi.getSelectedRows();
  }

  cambiarTab(tab: string): void {
    this.activeTab = tab;
    this.selectedRows = [];
    if (this.gridApi) {
      this.gridApi.deselectAll();
    }
  }

  verDetalle(row: any): void {
    this.mostrarMensaje({
      title: 'Detalle',
      message: `Mostrando detalle para: ${row.cupon}`,
      type: 'info'
    });
  }

  editarRegistro(row: any): void {
    this.mostrarMensaje({
      title: 'Editar Cupón',
      message: `Editando cupón: ${row.cupon}`,
      type: 'info'
    });
  }

  mostrarMensaje(data: MessageBoxData): void {
    this.dialog.open(CustomMessageBoxComponent, {
      width: '420px',
      data
    });
  }

  compararIds = (o1: any, o2: any): boolean => Number(o1) === Number(o2);
  
  private initFiltroBusquedaListener(): void {
    this.buscarCuponControl.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(value => {
      this.filtroBusqueda = value ?? '';
      this.cargarCuponesActual();
    });
  }
  private formatFecha(fecha: Date): string {
    return fecha.toISOString().split('T')[0]; // "2025-06-30"
  }

  public cargarCuponesActual(): void {
    this.pageIndex = 0;
    this.cargarCupones(0, this.pageSize);
  }

  onPageChange(event: any): void {
    this.cargarCupones(event.pageIndex, event.pageSize);
  }

  get puedeBuscar(): boolean {
    return !!(
      this.filtroBusqueda?.trim() ||
      this.filtroPrefijo !== null ||
      this.filtroSerialDesde?.trim() ||
      this.filtroSerialHasta?.trim()
    );
  }

  get tieneSeleccion(): boolean {
    return this.selectedRows.length > 0;
  }

  get textoSeleccion(): string {
    return `${this.selectedRows.length} registro(s) seleccionado(s)`;
  }
}