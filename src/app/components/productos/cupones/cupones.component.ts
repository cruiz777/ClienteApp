import { Component, OnInit, OnDestroy } from '@angular/core';
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
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';

import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridApi, GridOptions, GridReadyEvent, SelectionChangedEvent } from 'ag-grid-community';

import { ClienteSeleccionadoService } from 'src/app/services/cliente-seleccionado.service';
import { PrefijoService } from 'src/app/services/prefijo.service';
import { UsuarioService } from 'src/app/services/usuario.service';
import { GrupoProductoService, GrupoProducto } from 'src/app/services/grupo-producto.service';
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
import { LoginUsuarioResponse } from 'src/app/interfaces/responses/usuario-log-response';
import { CuponService } from 'src/app/services/cupones.service';
import { ObservacionDialogComponent } from '../nuevo-sscc/observacion-dialog.component';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { isValid, parse, setHours, setMilliseconds, setMinutes, setSeconds } from 'date-fns';
import * as moment from 'moment';

interface CuponTablaView {
  id: number;
  empresa: string;
  idPrefijo: number;
  prefijo: string;
  serial: number | undefined;
  cupon: string;
  descripcion?: string;
  categoria?: number;
  categoriaNombre?: string; // Nuevo campo para mostrar el nombre del grupo
  fecha?: string;
  fecha_creacion?: string;
  fechaInicio?: string;     // ✅ Agregar este campo
  fechaCaducidad?: string;  
  estado: string;
  usuario?: number | string;
  usuarioNombre?: string; // Nuevo campo para mostrar el nombre del usuario
  seleccionado: boolean;
}
export const MY_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY'
  }
};
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
  ],
    providers: [
    { provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS }
  ]

})
export class CuponesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private gridApi!: GridApi<CuponTablaView>;
  
  selectedRows: CuponTablaView[] = [];
  
  // Usuario actual
  usuarioActual: LoginUsuarioResponse | null = null;
  
  // Datos para selects
  prefijosDisponibles: { id: number, codpre: string }[] = [];
  gruposProducto: GrupoProducto[] = [];
  clienteSeleccionadoObj: Cliente | null = null;

  // Configuración del grid con columna de grupo de producto mejorada
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
      field: 'categoriaNombre', 
      headerName: 'Grupo Producto', 
      filter: 'agTextColumnFilter',
      width: 180,
      cellClass: 'text-gray-600',
      tooltipField: 'categoriaNombre',
      valueGetter: (params) => {
        // Si no hay categoriaNombre, buscar por categoria
        if (params.data.categoriaNombre) {
          return params.data.categoriaNombre;
        }
        if (params.data.categoria) {
          const grupo = this.gruposProducto.find(g => g.id_grupo_producto === params.data.categoria);
          return grupo ? `${grupo.codigo} - ${grupo.desBrick}` : 'Sin asignar';
        }
        return 'Sin asignar';
      }
    },
    { 
      field: 'fecha', 
      headerName: 'Fecha Creación', 
      filter: 'agDateColumnFilter',
      width: 160,
      cellClass: 'text-gray-600',
        valueFormatter: (params) => {
          if (!params.value) return '';
          // Si la fecha viene como string ISO, formatear correctamente
          const fecha = new Date(params.value);
          return fecha.toLocaleDateString('es-ES') || params.value.split('T')[0];
        }
    },
    { 
      field: 'fechaInicio', 
      headerName: 'Fecha Inicio',  
      filter: 'agDateColumnFilter',
      width: 140,
      cellClass: 'text-blue-600',
      valueFormatter: (params) => {
        if (!params.value) return '';
        const fecha = new Date(params.value);
        return fecha.toLocaleDateString('es-ES') || params.value.split('T')[0];
      }
    },
    { 
      field: 'fechaCaducidad', 
      headerName: 'Fecha Caducidad',
      filter: 'agDateColumnFilter',
      width: 150,
      cellClass: 'text-red-600',
      valueFormatter: (params) => {
        if (!params.value) return '';
        const fecha = new Date(params.value);
        return fecha.toLocaleDateString('es-ES') || params.value.split('T')[0];
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
      field: 'usuarioNombre', 
      headerName: 'Usuario', 
      filter: 'agTextColumnFilter',
      width: 140,
      cellClass: 'text-gray-700',
      valueGetter: (params) => {
        return params.data.usuarioNombre || params.data.usuario || 'N/A';
      }
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

  gridOptions: GridOptions = {
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

  // Formularios
  formCupon: FormGroup;
  formReporte: FormGroup;
  
  codigoGenerado = false;
  cuponesGenerados: any[] = [];
  estados = ['Activo', 'Inactivo'];

  constructor(
    private fb: FormBuilder,
    private cuponService: CuponService,
    private clienteSeleccionadoService: ClienteSeleccionadoService,
    private prefijoService: PrefijoService,
    private usuarioService: UsuarioService,
    private grupoProductoService: GrupoProductoService,
    private dialog: MatDialog,
    private exportService: ExportService
  ) {
    this.formCupon = this.fb.group({
      codigoCliente: [''],
      cliente: [''],
      ruc: [''],
      prefijo: [null, Validators.required],
      descripcion: ['', Validators.required],
      categoria: [''], 
      idGrupoProducto: [null],
      cantidad: [1, [Validators.required, Validators.min(1), Validators.max(5000)]],
      serie: [false],
      inicio: [1],
      codigosGenerados: [''],
      fechaInicio: [null, Validators.required],    
      fechaCaducidad: [null, Validators.required]
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
    this.initializeComponent();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ========== INICIALIZACIÓN ==========
  private initializeForms(): void {
    // Formulario Generar con campo de grupo de producto
    this.formCupon = this.fb.group({
      codigoCliente: [''],
      cliente: [''],
      ruc: [''],
      prefijo: [null, Validators.required],
      descripcion: ['', Validators.required],
      categoria: [''], // Campo legacy mantenido por compatibilidad
      idGrupoProducto: [null], // Nuevo campo principal para grupo de producto
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

  private initializeComponent(): void {
    // Suscribirse a cambios del usuario actual de manera reactiva
    this.usuarioService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(usuario => {
        this.usuarioActual = usuario;
        console.log('👤 Usuario actual actualizado:', this.usuarioActual);
      });

    // Validar cliente seleccionado
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

    // Cargar datos iniciales
    this.cargarDatosIniciales();
    this.initFiltroBusquedaListener();
    this.setupFormControls();
  }

  private cargarDatosIniciales(): void {
    const cliente = this.clienteSeleccionadoObj;
    if (!cliente) return;

    // Cargar grupos de producto
    this.cargarGruposProducto();
    
    // Cargar prefijos
    this.cargarPrefijosPorCliente();
    
    // Cargar cupones
    this.cargarCuponesActual();

    // Setear datos del cliente en el formulario
    this.formCupon.patchValue({
      codigoCliente: cliente.clientes_codigo,
      cliente: cliente.nomcli,
      ruc: cliente.ruc
    });
  }

  private cargarGruposProducto(): void {
    this.grupoProductoService.obtenerGrupos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (grupos) => {
          this.gruposProducto = grupos;
          console.log('📦 Grupos de producto cargados:', grupos.length);
        },
        error: (err) => {
          console.error('❌ Error al cargar grupos de producto:', err);
          this.mostrarMensaje({
            title: 'Error al cargar grupos',
            message: 'No se pudieron cargar los grupos de producto.',
            type: 'warning'
          });
        }
      });
  }

  private setupFormControls(): void {
    // Controlar campos de secuencia
    this.formCupon.get('serie')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((checked: boolean) => {
        const inicioControl = this.formCupon.get('inicio');
        checked ? inicioControl?.enable() : inicioControl?.disable();
      });

    this.formCupon.get('inicio')?.disable();
  }

  // ========== MÉTODOS DE CARGA DE DATOS ==========
  cargarCupones(page: number = 0, size: number = 50): void {
    const cliente = this.clienteSeleccionadoService.obtenerClienteActual();
    if (!cliente) {
      this.mostrarMensaje({
        title: 'Cliente no seleccionado',
        message: 'Debes seleccionar al menos un cliente para continuar.',
        type: 'warning'
      });
      return;
    }

    this.cuponService.getByCliente(cliente.clientes_codigo, page + 1, size)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.type === 'ERROR' || !response.data) {
            this.mostrarMensaje({
              title: 'Error al cargar',
              message: response.message || 'Error al cargar los cupones.',
              type: 'error'
            });
            return;
          }

          const mappedData = this.mapearDatosCupones(response.data.items, cliente);
          this.cuponesData = mappedData;
          this.totalItems = response.data.totalItems;
          this.pageIndex = response.data.page - 1;
          this.pageSize = response.data.pageSize;
        },
        error: (err) => {
          console.error('Error al cargar cupones:', err);
          this.mostrarMensaje({
            title: 'Error de conexión',
            message: 'No se pudieron cargar los cupones. Intenta nuevamente.',
            type: 'error'
          });
        }
      });
  }

  private mapearDatosCupones(items: CuponResponse[], cliente: Cliente): CuponTablaView[] {
    return items.map((item: CuponResponse) => {
      console.log('Fecha original desde el backend:', item.fechaCreacion); 
      const codpre = this.prefijosDisponibles.find(p => p.id === item.idPrefijo)?.codpre || 'N/A';
      
      // Buscar información del grupo de producto
      const grupoProducto = this.gruposProducto.find(g => g.id_grupo_producto === item.idGrupoProducto);
      const categoriaNombre = grupoProducto 
        ? `${grupoProducto.codigo} - ${grupoProducto.desBrick}` 
        : undefined;

      return {
        id: item.idCupon,
        idPrefijo: item.idPrefijo,
        empresa: cliente?.nomcli || 'ECOP',
        prefijo: codpre,
        serial: item.serial,
        cupon: item.codigoCupon,
        descripcion: item.descripcion,
        categoria: item.idGrupoProducto,
        categoriaNombre: categoriaNombre,
        fecha: item.fechaCreacion,
        fechaInicio: item.fechaInicio,     
        fechaCaducidad: item.fechaCaducidad,
        estado: item.estado ? 'Activo' : 'Inactivo',
        usuario: item.usuario,
        usuarioNombre: this.obtenerNombreUsuario(item.usuario),
        seleccionado: false
      } as CuponTablaView;
    });
  }

  private obtenerNombreUsuario(idUsuario?: number): string {
    // Por ahora retornamos el ID, pero podrías implementar un cache de usuarios
    // o hacer una llamada al servicio para obtener el nombre
    if (!idUsuario) return 'N/A';
    
    // Si es el usuario actual, mostrar su nombre
    if (this.usuarioActual && idUsuario === this.usuarioActual.id_usuario) {
      return this.usuarioActual.nombreD || this.usuarioActual.nombre_usuario;
    }
    
    return `Usuario ${idUsuario}`;
  }

  cargarPrefijosPorCliente(): void {
    const cliente = this.clienteSeleccionadoService.obtenerClienteActual();
    if (!cliente) return;
         
    this.prefijoService.obtenerPrefijosUnicosPorCliente(cliente.clientes_codigo)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.prefijosDisponibles = res.map(p => ({
            id: p.idPrefijos,
            codpre: p.codpre
          }));
        },
        error: (err) => console.error('Error al cargar prefijos:', err)
      });
  }

  // ========== MÉTODOS DE GENERACIÓN ==========
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

    if (!cliente || !this.usuarioActual) {
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
      serialInicio: this.formCupon.get('serie')?.value ? inicio : undefined,
      previsualizar: true,
      fechaInicio: this.formatFecha(this.formCupon.get('fechaInicio')?.value),
      fechaCaducidad: this.formatFecha(this.formCupon.get('fechaCaducidad')?.value),
      descripcion: this.formCupon.get('descripcion')?.value,
      idGrupoProducto: this.formCupon.get('idGrupoProducto')?.value,
      estado: true,
      usuario: this.usuarioActual.id_usuario
    };

    this.cuponService.create(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
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

    if (!cliente || !this.usuarioActual) {
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
      serialInicio: this.formCupon.get('serie')?.value ? inicio : undefined,
      previsualizar: false,
      fechaInicio: this.formatFecha(this.formCupon.get('fechaInicio')?.value),
      fechaCaducidad: this.formatFecha(this.formCupon.get('fechaCaducidad')?.value),
      descripcion: this.formCupon.get('descripcion')?.value,
      idGrupoProducto: this.formCupon.get('idGrupoProducto')?.value,
      estado: true,
      usuario: this.usuarioActual.id_usuario
    };

    this.cuponService.create(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
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

  // ========== MÉTODOS DE BÚSQUEDA Y FILTROS ==========
  buscarConFiltros(): void {
    this.pageIndex = 0;
    this.buscarCuponesConFiltros(0, this.pageSize);
  }

  buscarCuponesConFiltros(page: number = 0, size: number = 50): void {
    const cliente = this.clienteSeleccionadoService.obtenerClienteActual();
    if (!cliente) {
      this.mostrarMensaje({
        title: 'Cliente no seleccionado',
        message: 'Debes seleccionar al menos un cliente para continuar.',
        type: 'warning'
      });
      return;
    }

    const filtros = {
      page: page + 1,
      pageSize: size,
      idCliente: cliente.clientes_codigo,
      ...(this.filtroPrefijo && { idPrefijo: this.filtroPrefijo }),
      ...(this.filtroBusqueda?.trim() && { codigoCupon: this.filtroBusqueda.trim() }),
      ...(this.filtroSerialDesde?.trim() && { serial: parseInt(this.filtroSerialDesde) }),
      ...(this.formReporte.value.estado === 'Activo' && { estado: true }),
      ...(this.formReporte.value.estado === 'Inactivo' && { estado: false }),
      ...(this.formReporte.value.desde && { fechaDesde: this.formReporte.value.desde }),
      ...(this.formReporte.value.hasta && { fechaHasta: this.formReporte.value.hasta })
    };

    this.cuponService.buscarCupones(filtros)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.type === 'ERROR' || !response.data) {
            this.mostrarMensaje({
              title: 'Error en búsqueda',
              message: response.message || 'Error al buscar los cupones.',
              type: 'error'
            });
            return;
          }

          if (response.data.items.length === 0) {
            this.mostrarMensaje({
              title: 'Sin resultados',
              message: 'No se encontraron cupones que coincidan con los filtros aplicados.',
              type: 'info'
            });
            this.cuponesData = [];
            this.totalItems = 0;
            return;
          }

          const mappedData = this.mapearDatosCupones(response.data.items, cliente);
          this.cuponesData = mappedData;
          this.totalItems = response.data.totalItems;
          this.pageIndex = response.data.page - 1;
          this.pageSize = response.data.pageSize;
        },
        error: (err) => {
          console.error('Error al buscar cupones:', err);
          this.mostrarMensaje({
            title: 'Error de búsqueda',
            message: err?.error?.message || 'Error al realizar la búsqueda de cupones.',
            type: 'error'
          });
        }
      });
  }

  buscarCuponPorCodigo(): void {
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

    if (!cliente) {
      this.mostrarMensaje({
        title: 'Cliente no seleccionado',
        message: 'Debes seleccionar un cliente para buscar cupones.',
        type: 'warning'
      });
      return;
    }

    this.cuponService.buscarCupones({ 
      codigoCupon,
      idCliente: cliente.clientes_codigo 
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        if (response.type === 'ERROR' || !response.data || response.data.items.length === 0) {
          this.mostrarMensaje({
            title: 'No encontrado',
            message: 'El código de cupón no existe o no pertenece al cliente seleccionado.',
            type: 'warning'
          });
          return;
        }

        const mappedData = this.mapearDatosCupones(response.data.items, cliente);
        this.cuponesData = mappedData;
        this.totalItems = 1;
        this.pageIndex = 0;
        this.pageSize = 1;

        this.mostrarMensaje({
          title: 'Cupón encontrado',
          message: `Se encontró el cupón: ${response.data.items[0].codigoCupon}`,
          type: 'success'
        });
      },
      error: (err) => {
        console.error('Error al buscar cupón:', err);
        this.mostrarMensaje({
          title: 'Error',
          message: err?.error?.message || 'Error al buscar el cupón.',
          type: 'error'
        });
      }
    });
  }

  // ========== MÉTODOS DE ELIMINACIÓN ==========
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

      if (!this.usuarioActual) {
        this.mostrarMensaje({
          title: 'Error de sesión',
          message: 'Usuario no disponible.',
          type: 'error'
        });
        return;
      }

      const payload: DeleteCuponRequest = {
        ids: this.selectedRows.map(row => row.id).filter(id => id != null) as number[],
        observacion,
        usuario: this.usuarioActual.id_usuario
      };

      if (payload.ids.length === 0) {
        this.mostrarMensaje({
          title: 'Error',
          message: 'No hay registros válidos para eliminar.',
          type: 'error'
        });
        return;
      }

      this.cuponService.deleteMultiple(payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
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

  // ========== MÉTODOS DE REPORTES ==========
  reportes(formato: 'excel' | 'pdf' = 'excel'): void {
    const { prefijo, estado, desde, hasta, operadorFecha } = this.formReporte.value;

    console.log('📋 Valores del formulario:', {
      prefijo, estado, desde, hasta, operadorFecha
    });

    const parseFecha = (valor: any, finDelDia: boolean = false): Date | undefined => {
      if (!valor) return undefined;

      let fecha: Date | undefined;

      if (valor instanceof Date && isValid(valor)) {
        fecha = valor;
      } else if (typeof valor === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(valor)) {
        // Parse formato dd/MM/yyyy
        fecha = parse(valor, 'dd/MM/yyyy', new Date());
      } else {
        const temp = new Date(valor);
        if (isValid(temp)) fecha = temp;
      }

      if (fecha && isValid(fecha)) {
        fecha = setHours(fecha, finDelDia ? 23 : 0);
        fecha = setMinutes(fecha, finDelDia ? 59 : 0);
        fecha = setSeconds(fecha, finDelDia ? 59 : 0);
        fecha = setMilliseconds(fecha, finDelDia ? 999 : 0);
        return fecha;
      }

      return undefined;
    };

    const fechaDesde = parseFecha(desde);
    const fechaHasta = parseFecha(hasta, true);

    console.log('📅 Fechas procesadas:', {
      fechaDesde: fechaDesde?.toISOString(),
      fechaHasta: fechaHasta?.toISOString()
    });

    // CAMBIO CRÍTICO: Solo incluir filtros con valores válidos
    const filtros: any = {};
    
    // Solo agregar si tiene valor válido
    if (prefijo && prefijo !== '' && prefijo !== 'todos') {
      filtros.idPrefijo = Number(prefijo);
    }
    
    if (estado && estado !== '' && estado !== 'todos') {
      filtros.estado = estado === 'Activo' ? true : false;
    }
    
    if (operadorFecha && operadorFecha !== '') {
      filtros.operadorFecha = operadorFecha;
    }
    
    if (fechaDesde) {
      filtros.fechaDesde = fechaDesde.toISOString();
    }
    
    if (fechaHasta) {
      filtros.fechaHasta = fechaHasta.toISOString();
    }

    console.log('🔍 Filtros finales enviados:', filtros);
    console.log('🔢 Cantidad de filtros:', Object.keys(filtros).length);

    // 🚨 VALIDACIÓN: Si no hay filtros, hacer consulta general
    if (Object.keys(filtros).length === 0) {
      console.log('⚠️ No hay filtros específicos, consultando todos los registros...');
    }

    this.cuponService.getReporte(filtros)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          console.log('📦 Respuesta del servicio:', res);
          console.log('📊 Cantidad de registros:', res.data?.length || 0);
          
          const cliente = this.clienteSeleccionadoObj;

          if (!res.data || res.data.length === 0) {
            console.log('❌ No se encontraron registros');
            this.mostrarMensaje({
              title: 'Sin resultados',
              message: 'No se encontraron registros que coincidan con los filtros.',
              type: 'warning'
            });
            return;
          }

          // Resto del código igual...
          const data = res.data.map((item): CuponTablaView => {
            const codpre = this.prefijosDisponibles.find(p => p.id === item.idPrefijo)?.codpre || 'N/A';
            const grupoProducto = this.gruposProducto.find(g => g.id_grupo_producto === item.idGrupoProducto);
            const categoriaNombre = grupoProducto 
              ? `${grupoProducto.codigo} - ${grupoProducto.desBrick}` 
              : 'Sin asignar';

            return {
              id: item.idCupon,
              idPrefijo: item.idPrefijo,
              empresa: cliente?.nomcli || 'ECOP',
              prefijo: codpre,
              serial: item.serial,
              cupon: item.codigoCupon,
              descripcion: item.descripcion,
              categoria: item.idGrupoProducto,
              categoriaNombre: categoriaNombre,
              fecha: item.fechaCreacion ? moment(item.fechaCreacion).format('DD/MM/YYYY') : '',
              fechaInicio: item.fechaInicio ? moment(item.fechaInicio).format('DD/MM/YYYY') : '',
              fechaCaducidad: item.fechaCaducidad ? moment(item.fechaCaducidad).format('DD/MM/YYYY') : '',
              estado: item.estado ? 'Activo' : 'Inactivo',
              usuario: item.usuario,
              usuarioNombre: this.obtenerNombreUsuario(item.usuario),
              seleccionado: false
            };
          });

          const headers = ['Cupón', 'Prefijo', 'Descripción', 'Grupo Producto', 'Fecha Creación', 'Fecha Inicio', 'Fecha Caducidad', 'Usuario'];
          const columns: (keyof CuponTablaView)[] = ['cupon', 'prefijo', 'descripcion', 'categoriaNombre', 'fecha', 'fechaInicio', 'fechaCaducidad', 'usuarioNombre'];

          const options = {
            data,
            columns,
            headers,
            filename: 'reporte_cupones',
            title: 'Reporte de Cupones',
            logoUrl: '/assets/logo/GS1-logo.png',
            headerInfo: {
              codigoEmpresa: this.prefijosDisponibles.find(p => p.id === Number(prefijo))?.codpre || 'SIN PREFIJO',
              nombreEmpresa: cliente?.nomcli || 'NOMBRE DE LA EMPRESA',
              emisor: 'GS1 Ecuador',
              fechaEmision: moment().format('DD/MM/YYYY'),
              pagina: '1',
              ruc: cliente?.ruc || '1234567890123',
            }
          };

          if (formato === 'excel') {
            this.exportService.exportarExcel(options);
          } else {
            this.exportService.exportarPDF(options);
          }
        },
        error: (err) => {
          console.error('❌ Error completo:', err);
          console.error('❌ Status:', err.status);
          console.error('❌ Error body:', err.error);
          
          this.mostrarMensaje({
            title: 'Error al generar reporte',
            message: err?.error?.message || 'Ocurrió un error al generar el reporte.',
            type: 'error'
          });
        }
      });
  }

  // ========== MÉTODOS DE UTILIDAD ==========
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
    const grupoInfo = row.categoriaNombre ? ` - Grupo: ${row.categoriaNombre}` : '';
    const usuarioInfo = row.usuarioNombre ? ` - Usuario: ${row.usuarioNombre}` : '';
    
    this.mostrarMensaje({
      title: 'Detalle del Cupón',
      message: `Cupón: ${row.cupon}${grupoInfo}${usuarioInfo}`,
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

  nuevo(): void {
    this.formCupon.patchValue({
      prefijo: null,
      descripcion: '',
      categoria: '',
      idGrupoProducto: null,
      cantidad: 1,
      serie: false,
      inicio: 1,
      codigosGenerados: '',
      fechaInicio: null,
       fechaCaducidad: null
    });
    this.formCupon.get('inicio')?.disable();
    this.cuponesGenerados = [];
    this.codigoGenerado = false;
  }

  cancelar(): void {
    this.nuevo();
  }

  compararIds = (o1: any, o2: any): boolean => Number(o1) === Number(o2);
  
  private initFiltroBusquedaListener(): void {
    this.buscarCuponControl.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(value => {
      this.filtroBusqueda = value ?? '';
      
      // Si hay texto de búsqueda, usar filtros; si no, cargar todos
      if (this.filtroBusqueda.trim()) {
        this.buscarCuponesConFiltros(0, this.pageSize);
      } else {
        this.cargarCuponesActual();
      }
    });
  }

  /**
   * Método para verificar si hay filtros activos
   */
  private tieneFiltrosActivos(): boolean {
    return !!(
      this.filtroBusqueda?.trim() ||
      this.filtroPrefijo !== null ||
      this.filtroSerialDesde?.trim() ||
      this.filtroSerialHasta?.trim() ||
      this.formReporte.value.estado ||
      this.formReporte.value.desde ||
      this.formReporte.value.hasta
    );
  }

  private formatFecha(fecha: Date): string {
    return fecha.toISOString().split('T')[0]; // "2025-06-30"
  }

  public cargarCuponesActual(): void {
    this.pageIndex = 0;
    this.cargarCupones(0, this.pageSize);
  }

  /**
   * Método para manejar cambios de página
   */
  onPageChange(event: any): void {
    // Decidir si usar filtros o cargar todos según el estado actual
    if (this.tieneFiltrosActivos()) {
      this.buscarCuponesConFiltros(event.pageIndex, event.pageSize);
    } else {
      this.cargarCupones(event.pageIndex, event.pageSize);
    }
  }

  /**
   * Método para limpiar filtros y cargar todos los cupones
   */
  limpiarFiltros(): void {
    // Resetear todos los filtros
    this.filtroBusqueda = '';
    this.filtroPrefijo = null;
    this.filtroSerialDesde = '';
    this.filtroSerialHasta = '';
    this.buscarCuponControl.setValue('');
    this.formReporte.reset();
    
    // Cargar todos los cupones sin filtros
    this.cargarCuponesActual();
  }

  // ========== GETTERS PARA EL TEMPLATE ==========
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

  get usuarioNombre(): string {
    return this.usuarioActual?.nombreD || this.usuarioActual?.nombre_usuario || '';
  }

  get gruposProductoDisponibles(): GrupoProducto[] {
    return this.gruposProducto;
  }

  /**
   * Método helper para obtener el nombre completo del grupo de producto
   */
  obtenerNombreGrupoProducto(idGrupo: number): string {
    const grupo = this.gruposProducto.find(g => g.id_grupo_producto === idGrupo);
    return grupo ? `${grupo.codigo} - ${grupo.desBrick}` : 'Grupo no encontrado';
  }
}