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
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { catchError, debounceTime, distinctUntilChanged, filter, firstValueFrom, Subject, takeUntil, throwError, timeout } from 'rxjs';

import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridApi, GridOptions, GridReadyEvent, SelectionChangedEvent } from 'ag-grid-community';

import { ClienteSeleccionadoService } from 'src/app/services/cliente-seleccionado.service';
import { PrefijoService } from 'src/app/services/prefijo.service';
import { UsuarioService } from 'src/app/services/usuario.service';
import { GrupoProductoService, GrupoProducto } from 'src/app/services/grupo-producto.service';
import { ExportService } from 'src/app/services/export.service';

import { CustomMessageBoxComponent, MessageBoxData } from '../../utils/messages/custom-message-box.component';
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
import { CustomValidators } from '../../utils/validators/validator.util';
import { PermissionsService } from 'src/app/services/permission.service';
import { MatTooltipModule } from '@angular/material/tooltip';

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
  fechaInicio?: string;     //  Agregar este campo
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
    MatDialogModule,
    MatTooltipModule
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
  private todosLosIdsSeleccionados: Set<number> = new Set();
  seleccionandoTodo: boolean = false;
  private restaurandoSeleccion: boolean = false;
  public CustomValidators = CustomValidators;
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
      headerCheckboxSelectionFilteredOnly: false,
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
    // {
    //   field: 'empresa',
    //   headerName: 'Empresa',
    //   filter: 'agTextColumnFilter',
    //   width: 200,
    //   cellClass: 'font-medium text-gray-800'
    // },
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
          return moment(params.value).format('DD/MM/YYYY');
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
        return moment(params.value).format('DD/MM/YYYY');
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
        return moment(params.value).format('DD/MM/YYYY');
      }
    },
    {
      field: 'estado',
      headerName: 'Estado',
      filter: 'agSetColumnFilter',
      width: 120,
      pinned: 'right',
      cellRenderer: StatusRendererComponent,
      cellClass: 'text-center',
      // Hacer la columna editable
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['Activo', 'Inactivo']
      },
      //  Manejar el cambio de valor
      onCellValueChanged: (params: any) => this.onEstadoChangedConConfirmacion(params)
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
    // {
    //   headerName: 'Acciones',
    //   cellRenderer: ButtonRendererComponent,
    //   width: 120,
    //   pinned: 'right',
    //   sortable: false,
    //   filter: false,
    //   cellRendererParams: {
    //     buttons: [
    //       {
    //         icon: 'visibility',
    //         tooltip: 'Ver detalle',
    //         color: 'primary',
    //         onClick: (params: any) => this.verDetalle(params.data)
    //       },
    //       {
    //         icon: 'edit',
    //         tooltip: 'Editar',
    //         color: 'accent',
    //         onClick: (params: any) => this.editarRegistro(params.data)
    //       }
    //     ]
    //   }
    // }
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
    pagination: false, // SE CAMBIA A FALSE PARA PAGINAR CON ANGUALR NO CON AGGRID
    // paginationPageSize: 50,
    // paginationPageSizeSelector: [50, 100, 200, 500],
    overlayLoadingTemplate: '<span class="ag-overlay-loading-center">Cargando datos...</span>',
    overlayNoRowsTemplate: '<span class="ag-overlay-no-rows-center">No hay datos para mostrar</span>',
    rowHeight: 48,
    headerHeight: 50,
    floatingFiltersHeight: 35,
    singleClickEdit: true, // Permitir edición por clic simple (opcional)
    stopEditingWhenCellsLoseFocus: true, // Detener edición al hacer clic fuera
    onSelectionChanged: (event: SelectionChangedEvent) => this.onSelectionChanged(event),
    onRowSelected: (event: any) => this.onRowSelected(event)

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
  minDate = new Date(); //FECHA MINIMA VALIDADA
  // Cache
  private ultimaCarga: number = 0;
  private readonly CACHE_DURATION = 30000; // 30 segundos

  constructor(
    private fb: FormBuilder,
    private cuponService: CuponService,
    private clienteSeleccionadoService: ClienteSeleccionadoService,
    private prefijoService: PrefijoService,
    private usuarioService: UsuarioService,
    private grupoProductoService: GrupoProductoService,
    private dialog: MatDialog,
    private exportService: ExportService,
    private router: Router,
    public permissions: PermissionsService
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
      estado: ['todos'],
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
        console.log(' Usuario actual actualizado:', this.usuarioActual);
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

  private async cargarDatosIniciales(): Promise<void> {
    const cliente = this.clienteSeleccionadoObj;
    if (!cliente) return;

    try {
      // Cargar grupos y prefijos en paralelo
      const [grupos] = await Promise.all([
        firstValueFrom(this.grupoProductoService.obtenerGrupos().pipe(takeUntil(this.destroy$))),
        // Cargar prefijos sin esperar
        this.cargarPrefijosPorClienteAsync()
      ]);

      this.gruposProducto = grupos;

      // Solo cargar cupones si estamos en el tab de Listado
      if (this.activeTab === 'Listado') {
        this.cargarCuponesActual();
      }

      // Configurar formulario
      this.formCupon.patchValue({
        codigoCliente: cliente.clientes_codigo,
        cliente: cliente.nomcli,
        ruc: cliente.ruc
      });

    } catch (err) {
      console.error('Error al cargar datos iniciales:', err);
      this.mostrarMensaje({
        title: 'Error al cargar datos',
        message: 'No se pudieron cargar algunos datos iniciales.',
        type: 'error'
      });
    }
  }

  private cargarPrefijosPorClienteAsync(): Promise<void> {
    const cliente = this.clienteSeleccionadoObj;
    if (!cliente) return Promise.resolve();

    return firstValueFrom(
      this.prefijoService.obtenerPrefijosUnicosPorCliente(cliente.clientes_codigo)
        .pipe(takeUntil(this.destroy$))
    ).then(res => {
      this.prefijosDisponibles = res.map(p => ({
        id: p.idPrefijos,
        codpre: p.codpre
      }));
    }).catch(err => {
      console.error('Error al cargar prefijos:', err);
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
  // Validar fecha de inicio
  this.formCupon.get('fechaInicio')?.valueChanges
    .pipe(takeUntil(this.destroy$))
    .subscribe((fecha) => {
      if (fecha) {
        const fechaSeleccionada = new Date(fecha);
        const hoy = new Date();

        // Normalizar ambas fechas a medianoche para comparar solo días
        fechaSeleccionada.setHours(0, 0, 0, 0);
        hoy.setHours(0, 0, 0, 0);

        if (fechaSeleccionada < hoy) {
          this.mostrarMensaje({
            title: 'Fecha inválida',
            message: 'La fecha de inicio no puede ser anterior a la fecha actual.',
            type: 'warning'
          });
          this.formCupon.patchValue({ fechaInicio: null }, { emitEvent: false });
        }
      }
    });

  // Validar fecha de caducidad
  this.formCupon.get('fechaCaducidad')?.valueChanges
    .pipe(takeUntil(this.destroy$))
    .subscribe((fecha) => {
      if (fecha) {
        const fechaSeleccionada = new Date(fecha);
        const hoy = new Date();

        // Normalizar ambas fechas a medianoche para comparar solo días
        fechaSeleccionada.setHours(0, 0, 0, 0);
        hoy.setHours(0, 0, 0, 0);

        if (fechaSeleccionada < hoy) {
          this.mostrarMensaje({
            title: 'Fecha inválida',
            message: 'La fecha de caducidad no puede ser anterior a la fecha actual.',
            type: 'warning'
          });
          this.formCupon.patchValue({ fechaCaducidad: null }, { emitEvent: false });
        }
      }
    });
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

    // Mostrar loading antes de la petición
    const loadingDialog = this.dialog.open(CustomMessageBoxComponent, {
      disableClose: true,
      data: {
        title: 'Cargando cupones...',
        message: 'Por favor espere mientras se cargan los cupones del cliente.',
        type: 'info',
        isLoading: true,
        loadingText: `Cargando página ${page + 1}...`,
        showCancel: false
      }
    });

    this.cuponService.getByCliente(cliente.clientes_codigo, page + 1, size)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Cerrar loading en éxito
          loadingDialog.close();

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
          this.restaurarSeleccionVisual();
        },
        error: (err) => {
          // Cerrar loading en error
          loadingDialog.close();

          console.error('Error al cargar cupones:', err);
          this.mostrarMensaje({
            title: 'Error de conexión',
            message: err?.error?.message || 'No se pudieron cargar los cupones. Intenta nuevamente.',
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
          const generados = res.data?.cuponesGenerados || [];
          const duplicados = res.data?.cuponesDuplicados || [];

          //  MEJORA: Mapear correctamente los duplicados
          const lista = generados.map((codigo: string, index: number) => ({
            ia: index + 1,
            cupon: codigo,
            prefijo: this.prefijosDisponibles.find(p => p.id === Number(this.formCupon.get('prefijo')?.value))?.codpre || 'N/A',
            fecha: this.formatFecha(new Date()),
            duplicado: duplicados.includes(codigo) //  Marcar si es duplicado
          }));

          //  MEJORA: Agregar duplicados a la lista para mostrarlos
          const duplicadosParaMostrar = duplicados.map((codigo: string, index: number) => ({
            ia: generados.length + index + 1,
            cupon: codigo,
            prefijo: this.prefijosDisponibles.find(p => p.id === Number(this.formCupon.get('prefijo')?.value))?.codpre || 'N/A',
            fecha: this.formatFecha(new Date()),
            duplicado: true //  Marcar como duplicado
          }));

          //  Combinar generados y duplicados en una sola lista
          this.cuponesGenerados = [...lista, ...duplicadosParaMostrar];

          this.formCupon.patchValue({ codigosGenerados: generados.length }); // Solo contar los nuevos
          this.codigoGenerado = true;

          //  MEJORA: Mensaje más claro sobre el estado
          let mensaje = `Se generaron ${generados.length} cupones nuevos.`;
          if (duplicados.length > 0) {
            mensaje += ` Se encontraron ${duplicados.length} duplicados que no serán guardados`;
          }

          this.mostrarMensaje({
            title: 'Previsualización completa',
            message: mensaje,
            type: duplicados.length > 0 ? 'warning' : 'info'
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
      previsualizar: false, //  Importante: false para grabar realmente
      fechaInicio: this.formatFecha(this.formCupon.get('fechaInicio')?.value),
      fechaCaducidad: this.formatFecha(this.formCupon.get('fechaCaducidad')?.value),
      descripcion: this.formCupon.get('descripcion')?.value,
      idGrupoProducto: this.formCupon.get('idGrupoProducto')?.value,
      estado: true,
      usuario: this.usuarioActual.id_usuario
    };

    //  Mostrar loading
    const loadingDialog = this.dialog.open(CustomMessageBoxComponent, {
      disableClose: true,
      data: {
        title: 'Guardando cupones...',
        message: 'Por favor espere mientras se procesan los cupones generados.',
        type: 'info',
        isLoading: true,
        loadingText: `Guardando ${this.cuponesGenerados.length} cupones...`,
        showCancel: false
      }
    });

    this.cuponService.create(payload)
      .pipe(
        takeUntil(this.destroy$),
        //  Agregar timeout para evitar loading infinito
        timeout(30000), // 30 segundos timeout
        //  Agregar manejo de errores más robusto
        catchError(error => {
          console.error('Error en grabar():', error);
          loadingDialog.close();

          this.mostrarMensaje({
            title: 'Error al grabar',
            message: error?.error?.message || 'No se pudieron guardar los cupones. Intenta nuevamente.',
            type: 'error'
          });

          return throwError(() => error);
        })
      )
      .subscribe({
        next: (response) => {
          //  Cerrar loading inmediatamente
          loadingDialog.close();

          console.log(' Cupones guardados exitosamente:', response);

          //  Mostrar mensaje de éxito
          this.mostrarMensaje({
            title: 'Cupones guardados',
            message: `Se grabaron correctamente ${this.cuponesGenerados.length} cupones.`,
            type: 'success'
          });

          //  Limpiar formulario ANTES de recargar datos
          this.nuevo();

          //  Cambiar a tab de listado para ver los resultados
          this.activeTab = 'Listado';

          //  Recargar cupones de forma más simple (sin navegación compleja)
          setTimeout(() => {
            this.cargarCuponesActual();
          }, 500); // Pequeño delay para que se complete el cambio de tab
        },
        error: (err) => {
          // Este bloque puede que no se ejecute debido al catchError arriba
          // pero lo mantenemos por seguridad
          console.error('Error final en grabar():', err);
          if (loadingDialog && loadingDialog.getState() === 0) {//Verifica si está abierto
            loadingDialog.close();
          }
        }
      });
  }

  // ========== MÉTODOS DE BÚSQUEDA Y FILTROS ==========
  buscarConFiltros(): void {
    // Limpiar selección antes de nueva búsqueda
    this.todosLosIdsSeleccionados.clear();
    this.seleccionandoTodo = false;
    this.selectedRows = [];
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
      ...(this.filtroBusqueda?.trim() && { busqueda: this.filtroBusqueda.trim() }),
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
          this.restaurarSeleccionVisual();
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
    const busqueda = this.buscarCuponControl.value?.trim();
    const cliente = this.clienteSeleccionadoService.obtenerClienteActual();

    if (!busqueda) {
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
      busqueda : busqueda,
      idCliente: cliente.clientes_codigo ,
      page: 1,
      pageSize: 50
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
  // eliminarSeleccionados(): void {
  //   if (this.selectedRows.length === 0) {
  //     this.mostrarMensaje({
  //       title: 'Sin selección',
  //       message: 'Selecciona al menos un registro para eliminar.',
  //       type: 'warning'
  //     });
  //     return;
  //   }

  //   const dialogRef = this.dialog.open(ObservacionDialogComponent, {
  //     width: '450px',
  //     data: { observacion: '' }
  //   });

  //   dialogRef.afterClosed().subscribe((observacion: string | undefined) => {
  //     if (!observacion) return;

  //     if (!this.usuarioActual) {
  //       this.mostrarMensaje({
  //         title: 'Error de sesión',
  //         message: 'Usuario no disponible.',
  //         type: 'error'
  //       });
  //       return;
  //     }

  //     const payload: DeleteCuponRequest = {
  //       ids: this.selectedRows.map(row => row.id).filter(id => id != null) as number[],
  //       observacion,
  //       usuario: this.usuarioActual.id_usuario
  //     };

  //     if (payload.ids.length === 0) {
  //       this.mostrarMensaje({
  //         title: 'Error',
  //         message: 'No hay registros válidos para eliminar.',
  //         type: 'error'
  //       });
  //       return;
  //     }

  //     this.cuponService.deleteMultiple(payload)
  //       .pipe(takeUntil(this.destroy$))
  //       .subscribe({
  //         next: (response) => {
  //           this.mostrarMensaje({
  //             title: 'Eliminación exitosa',
  //             message: response.message || 'Registros eliminados correctamente.',
  //             type: 'success'
  //           });
  //           this.cargarCuponesActual();
  //           this.selectedRows = [];
  //         },
  //         error: (err) => {
  //           this.mostrarMensaje({
  //             title: 'Error al eliminar',
  //             message: 'Ocurrió un error al intentar eliminar los registros.',
  //             type: 'error'
  //           });
  //           console.error(err);
  //         }
  //       });
  //   });
  // }
  eliminarSeleccionados(): void {
    if (this.todosLosIdsSeleccionados.size === 0) {
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
        ids: Array.from(this.todosLosIdsSeleccionados),
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

            //  LIMPIAR TODO completamente
            this.todosLosIdsSeleccionados.clear();
            this.seleccionandoTodo = false;
            this.selectedRows = [];

            //  Limpiar selección visual del grid
            if (this.gridApi) {
              this.gridApi.deselectAll();
            }

            //  Recargar datos desde página 1
            this.pageIndex = 0;
            this.cargarCupones(0, this.pageSize);
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

    //Solo se incluyen filtros con valores válidos
    const filtros: any = {};

    // Solo agregar si tiene valor válido
    if (estado === true || estado === false) {
      filtros.estado = estado;
    }
    if (estado !== null && estado !== undefined && estado !== '') {
      filtros.estado = estado; // Ya viene como true/false desde el HTML
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

    // VALIDACIÓN: Si no hay filtros, hacer consulta general
    if (Object.keys(filtros).length === 0) {
      console.log('No hay filtros específicos, consultando todos los registros...');
    }

    //  Mostrar loading durante la generación del reporte
    const loadingDialog = this.dialog.open(CustomMessageBoxComponent, {
      disableClose: true,
      data: {
        title: 'Generando reporte...',
        message: `Preparando reporte de cupones en formato ${formato.toUpperCase()}.`,
        type: 'info',
        isLoading: true,
        loadingText: 'Obteniendo datos y procesando archivo...',
        showCancel: false
      }
    });

    this.cuponService.getReporte(filtros)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          console.log('📦 Respuesta del servicio:', res);
          console.log('📊 Cantidad de registros:', res.data?.length || 0);

          const cliente = this.clienteSeleccionadoObj;

          if (!res.data || res.data.length === 0) {
            //  Cerrar loading antes de mostrar mensaje
            loadingDialog.close();

            console.log('❌ No se encontraron registros');
            this.mostrarMensaje({
              title: 'Sin resultados',
              message: 'No se encontraron registros que coincidan con los filtros.',
              type: 'warning'
            });
            return;
          }

          // Mapear los datos
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

          const headers = ['Cupón', 'Prefijo', 'Descripción', 'Grupo Producto', 'Fecha Inicio', 'Fecha Caducidad'];
          const columns: (keyof CuponTablaView)[] = ['cupon', 'prefijo', 'descripcion', 'categoriaNombre', 'fechaInicio', 'fechaCaducidad'];

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

          try {
            // Exportar según el formato solicitado
            if (formato === 'excel') {
              this.exportService.exportarExcel(options);
            } else {
              this.exportService.exportarPDF(options);
            }

            //  Cerrar loading después de la exportación exitosa
            loadingDialog.close();

            // Mostrar mensaje de éxito
            this.mostrarMensaje({
              title: 'Reporte generado',
              message: `El reporte en formato ${formato.toUpperCase()} se ha generado exitosamente.`,
              type: 'success'
            });

          } catch (exportError) {
            //  Cerrar loading en error de exportación
            loadingDialog.close();

            console.error('Error al exportar:', exportError);
            this.mostrarMensaje({
              title: 'Error al exportar',
              message: 'Se obtuvieron los datos pero ocurrió un error al generar el archivo.',
              type: 'error'
            });
          }
        },
        error: (err) => {
          //  Cerrar loading en error de servicio
          loadingDialog.close();

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
  /**
 * Restaura la selección visual en el grid basándose en el Set global
 */
  private restaurarSeleccionVisual(): void {
    if (!this.gridApi) {
      console.log('⚠️ Grid API no disponible');
      return;
    }

    if (this.todosLosIdsSeleccionados.size === 0) {
      console.log('⚠️ No hay IDs para restaurar');
      this.gridApi.deselectAll();
      return;
    }

    console.log('🔄 Iniciando restauración...', this.todosLosIdsSeleccionados.size, 'IDs en Set');
    this.restaurandoSeleccion = true;

    setTimeout(() => {
      try {
        // ✅ Primero deseleccionar todo
        this.gridApi.deselectAll();

        // ✅ Recolectar nodos a seleccionar
        const nodosASeleccionar: any[] = [];
        const idsEnPaginaActual: number[] = [];

        this.gridApi.forEachNode(node => {
          if (node.data) {
            idsEnPaginaActual.push(node.data.id);

            if (this.todosLosIdsSeleccionados.has(node.data.id)) {
              nodosASeleccionar.push(node);
            }
          }
        });

        // ✅ Seleccionar todos los nodos de una vez (más eficiente)
        if (nodosASeleccionar.length > 0) {
          this.gridApi.setNodesSelected({
            nodes: nodosASeleccionar,
            newValue: true
          });
        }

        console.log('📄 IDs en página actual:', idsEnPaginaActual);
        console.log(`✅ Seleccionados ${nodosASeleccionar.length} de ${idsEnPaginaActual.length}`);

        // ✅ Forzar actualización del header checkbox
        this.gridApi.refreshHeader();

      } catch (error) {
        console.error('❌ Error en restaurarSeleccionVisual:', error);
      } finally {
        setTimeout(() => {
          this.restaurandoSeleccion = false;
          this.selectedRows = this.gridApi.getSelectedRows();
          console.log('✅ Restauración completa. Total en selectedRows:', this.selectedRows.length);
        }, 200);
      }
    }, 100);
  }
  // onSelectionChanged(event: SelectionChangedEvent): void {
  //   this.selectedRows = this.gridApi.getSelectedRows();
  // }

  onSelectionChanged(event: SelectionChangedEvent): void {
    // AGREGAR esta validación al inicio
    if (this.restaurandoSeleccion) {
      return; // No hacer nada si estamos restaurando
    }
    const selectedNodes = this.gridApi.getSelectedNodes();

    // Si se clickeó el header checkbox
    if (selectedNodes.length === this.cuponesData.length || selectedNodes.length === 0) {
      const todosSeleccionados = selectedNodes.length === this.cuponesData.length;

      if (todosSeleccionados && !this.seleccionandoTodo) {
        // Se clickeó para seleccionar todo
        this.seleccionarTodosLosCupones();
      } else if (!todosSeleccionados && this.todosLosIdsSeleccionados.size > 0) {
        // Se clickeó para deseleccionar todo
        this.deseleccionarTodosLosCupones();
      }
    }

    this.selectedRows = this.gridApi.getSelectedRows();
  }

  onRowSelected(event: any): void {
    if (this.restaurandoSeleccion) {
      return; // No hacer nada si estamos restaurando
    }

    if (event.node.isSelected()) {
      this.todosLosIdsSeleccionados.add(event.data.id);
    } else {
      this.todosLosIdsSeleccionados.delete(event.data.id);
      this.seleccionandoTodo = false;
    }
  }
  /**
 * Selecciona TODOS los cupones de TODAS las páginas
 */
  private seleccionarTodosLosCupones(): void {
    const dialogRef = this.dialog.open(CustomMessageBoxComponent, {
      width: '450px',
      data: {
        title: 'Seleccionar registros',
        message: `¿Deseas seleccionar los ${this.cuponesData.length} cupones de la página actual?`,
        type: 'question',
        showCancel: true,
        confirmText: 'Sí, seleccionar',
        cancelText: 'Cancelar'
      }
    });

    dialogRef.afterClosed().subscribe((confirmar: boolean) => {
      if (confirmar) {
        // Solo seleccionar página actual
        this.seleccionandoTodo = false;

        // Agregar IDs de página actual al Set
        this.cuponesData.forEach(cupon => {
          this.todosLosIdsSeleccionados.add(cupon.id);
        });

        // Seleccionar todos visualmente en el grid
        this.gridApi.selectAll();

        // Actualizar selectedRows
        this.selectedRows = this.gridApi.getSelectedRows();
      }
    });
  }

  /**
   * Carga todos los IDs disponibles según los filtros actuales
   */
  private cargarTodosLosIds(): void {
    const cliente = this.clienteSeleccionadoService.obtenerClienteActual();
    if (!cliente) return;

    console.log('🔍 Iniciando carga de TODOS los IDs. Total esperado:', this.totalItems);

    const loadingDialog = this.dialog.open(CustomMessageBoxComponent, {
      disableClose: true,
      data: {
        title: 'Cargando...',
        message: `Seleccionando ${this.totalItems} cupones...`,
        type: 'info',
        isLoading: true,
        showCancel: false
      }
    });

    // Preparar filtros actuales
    const filtros = {
      page: 1,
      pageSize: this.totalItems, // Traer TODOS
      idCliente: cliente.clientes_codigo,
      ...(this.filtroPrefijo && { idPrefijo: this.filtroPrefijo }),
      ...(this.filtroBusqueda?.trim() && { busqueda: this.filtroBusqueda.trim() }),
      ...(this.filtroSerialDesde?.trim() && { serial: parseInt(this.filtroSerialDesde) }),
      ...(this.formReporte.value.estado === 'Activo' && { estado: true }),
      ...(this.formReporte.value.estado === 'Inactivo' && { estado: false }),
      ...(this.formReporte.value.desde && { fechaDesde: this.formReporte.value.desde }),
      ...(this.formReporte.value.hasta && { fechaHasta: this.formReporte.value.hasta })
    };

    console.log('📤 Enviando solicitud con filtros:', filtros);

    this.cuponService.buscarCupones(filtros)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('📥 Respuesta recibida:', response);
          console.log('📊 Items recibidos:', response.data?.items?.length);

          loadingDialog.close();

          if (response.type === 'SUCCESS' && response.data) {
            //  Limpiar antes de agregar
            this.todosLosIdsSeleccionados.clear();
            console.log('🗑️ Set limpiado. Size:', this.todosLosIdsSeleccionados.size);

            //  Agregar todos los IDs
            response.data.items.forEach((item: CuponResponse) => {
              this.todosLosIdsSeleccionados.add(item.idCupon);
            });

            console.log(' IDs agregados al Set. Size final:', this.todosLosIdsSeleccionados.size);
            console.log('📋 Primeros 10 IDs:', Array.from(this.todosLosIdsSeleccionados).slice(0, 10));

            //  Restaurar la selección visual
            this.restaurarSeleccionVisual();

            this.mostrarMensaje({
              title: 'Selección completa',
              message: `Se han seleccionado ${this.todosLosIdsSeleccionados.size} cupones de todas las páginas.`,
              type: 'success'
            });
          } else {
            console.error('❌ Respuesta no exitosa:', response);
          }
        },
        error: (err) => {
          loadingDialog.close();
          this.seleccionandoTodo = false;
          console.error('❌ Error al cargar todos los IDs:', err);
          this.mostrarMensaje({
            title: 'Error',
            message: 'No se pudieron cargar todos los registros.',
            type: 'error'
          });
        }
      });
  }

  /**
   * Deselecciona todos los cupones
   */
  private deseleccionarTodosLosCupones(): void {
    this.todosLosIdsSeleccionados.clear();
    this.seleccionandoTodo = false;
    this.gridApi.deselectAll();
    this.selectedRows = [];
    if (this.gridApi) {
      this.gridApi.deselectAll();
    }
  }

  cambiarTab(tab: string): void {
    if (this.activeTab === tab) {
      return;
    }

    this.activeTab = tab;

    //  Limpiar TODA la selección al cambiar de tab
    this.todosLosIdsSeleccionados.clear();
    this.seleccionandoTodo = false;
    this.selectedRows = [];

    if (this.gridApi) {
      this.gridApi.deselectAll();
    }

    if (tab === 'Listado') {
      this.limpiarFiltrosSinMensaje();
      if (this.cuponesData.length === 0) {
        this.cargarCuponesActual();
      }
    } else {
      this.limpiarFiltrosSinMensaje();
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
    // Limpiar formulario de generación
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

    // Limpiar también los filtros de reportes
    this.limpiarFiltros();
  }


  cancelar(): void {
    this.nuevo();
  }

  compararIds = (o1: any, o2: any): boolean => Number(o1) === Number(o2);

  onEstadoChangedConConfirmacion(params: any): void {
    const { data, newValue, oldValue } = params;

    if (newValue === oldValue) return;

    // Mostrar diálogo de confirmación
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirmar cambio de estado',
        message: `¿Estás seguro de cambiar el estado del cupón ${data.cupon} a ${newValue}?`,
        confirmText: 'Confirmar',
        cancelText: 'Cancelar'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        // Proceder con el cambio
        const nuevoEstado = newValue === 'Activo';

        this.cuponService.updateEstado(data.id, nuevoEstado)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              if (response.type === 'SUCCESS') {
                this.mostrarMensaje({
                  title: 'Estado actualizado',
                  message: `El cupón ${data.cupon} ahora está ${newValue}`,
                  type: 'success'
                });
                data.estado = newValue;
              } else {
                this.revertirCambioEstado(params, oldValue);
              }
            },
            error: () => {
              this.mostrarMensaje({
                title: 'Error',
                message: 'No se pudo actualizar el estado',
                type: 'error'
              });
              this.revertirCambioEstado(params, oldValue);
            }
          });
      } else {
        // Usuario canceló - revertir
        this.revertirCambioEstado(params, oldValue);
      }
    });
  }


  //  Método auxiliar para revertir cambios en caso de error
  private revertirCambioEstado(params: any, valorAnterior: string): void {
    // Revertir el valor en el grid
    params.node.setDataValue('estado', valorAnterior);

    // Refrescar la celda
    this.gridApi.refreshCells({
      rowNodes: [params.node],
      columns: ['estado'],
      force: true
    });
  }
  private initFiltroBusquedaListener(): void {
    this.buscarCuponControl.valueChanges.pipe(
      debounceTime(800),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
      // Agregar filtro para evitar búsquedas con valores vacíos muy seguidos
      filter(value => {
        const trimmed = (value || '').trim();
        return trimmed.length === 0 || trimmed.length >= 3; // Solo buscar si hay 3+ caracteres o está vacío
    })
    ).subscribe(value => {
      this.filtroBusqueda = value ?? '';
      // Evitar llamada si ya estamos en otra tab
      if (this.activeTab !== 'Listado') {
        return;
      }
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
    const formValues = this.formReporte.value;

    return !!(
      this.filtroBusqueda?.trim() ||
      this.filtroPrefijo !== null ||
      this.filtroSerialDesde?.trim() ||
      this.filtroSerialHasta?.trim() ||
      (formValues.estado && formValues.estado !== '') ||
      formValues.desde ||
      formValues.hasta ||
      (formValues.operadorFecha && formValues.operadorFecha !== '=')
    );
  }

  private formatFecha(fecha: Date | string): string {
    if (!fecha) return '';
    return moment(fecha).format('YYYY-MM-DD');
  }

  public cargarCuponesActual(): void {
     const ahora = Date.now();

    // Evitar recargas muy frecuentes de la página
    if (ahora - this.ultimaCarga < this.CACHE_DURATION && this.cuponesData.length > 0) {
      console.log('🚫 Evitando recarga innecesaria - datos recientes');
      return;
    }

    this.ultimaCarga = ahora;
    this.pageIndex = 0;
    this.cargarCupones(0, this.pageSize);
  }

  /**
   * Método para manejar cambios de página
   */
  onPageChange(event: any): void {
    console.log('📄 Cambiando a página:', event.pageIndex);
    console.log('🔢 IDs en Set antes de cambio:', this.todosLosIdsSeleccionados.size);

    //  Guardar estado antes de cargar
    const teníaSeleccionGlobal = this.seleccionandoTodo;

    if (this.tieneFiltrosActivos()) {
      this.buscarCuponesConFiltros(event.pageIndex, event.pageSize);
    } else {
      this.cargarCupones(event.pageIndex, event.pageSize);
    }

    //  Restaurar flag si había selección global
    if (teníaSeleccionGlobal) {
      this.seleccionandoTodo = true;
    }
  }

  /**
   * Método para limpiar filtros y cargar todos los cupones
   */
  limpiarFiltros(): void {
    //Verificar si realmente hay filtros que limpiar
    if (!this.tieneFiltrosActivos()) {
      this.mostrarMensaje({
        title: 'Sin filtros',
        message: 'No hay filtros activos para limpiar.',
        type: 'info',
        showCancel: false
      });
      return;
    }
    // Resetear filtros de búsqueda
    this.filtroBusqueda = '';
    this.filtroPrefijo = null;
    this.filtroSerialDesde = '';
    this.filtroSerialHasta = '';
    this.buscarCuponControl.setValue('', { emitEvent: false });

    // Resetear formulario de reportes completamente
    this.formReporte.reset({
      prefijo: '',
      estado: null,
      desde: null,
      hasta: null,
      operadorFecha: '='
    });

    this.limpiarFiltrosSinMensaje();

    // Limpiar selección del grid
    this.selectedRows = [];
    if (this.gridApi) {
      this.gridApi.deselectAll();
    }

    //Solo recargar si estamos en el tab correcto
    if (this.activeTab === 'Listado') {
      this.cargarCuponesActual();
    }

    this.todosLosIdsSeleccionados.clear();
    this.seleccionandoTodo = false;
    this.selectedRows = [];

    if (this.activeTab === 'Listado') {
      this.cargarCuponesActual();
    }
  }

  /**
 * Método para limpiar filtros sin mostrar mensaje
 * (útil para cuando se cambia de tab)
 */
  private limpiarFiltrosSinMensaje(): void {
    // Resetear filtros de búsqueda
    this.filtroBusqueda = '';
    this.filtroPrefijo = null;
    this.filtroSerialDesde = '';
    this.filtroSerialHasta = '';
    this.buscarCuponControl.setValue('', { emitEvent: false }); // emitEvent: false para evitar trigger del listener

    // Resetear formulario de reportes completamente
    this.formReporte.reset({
      prefijo: '',
      estado: null,
      desde: null,
      hasta: null,
      operadorFecha: '='
    });

    // Limpiar selección del grid
    this.selectedRows = [];
    if (this.gridApi) {
      this.gridApi.deselectAll();
    }
  }


  /**
 * Verifica si hay al menos un filtro activo en el formulario de reportes
 */
  get tieneFiltrosReporte(): boolean {
    const valores = this.formReporte.value;
    return !!(
      valores.prefijo && valores.prefijo !== '' && valores.prefijo !== 'todos' ||
      valores.estado && valores.estado !== '' && valores.estado !== 'todos' ||
      valores.desde ||
      valores.hasta ||
      valores.operadorFecha && valores.operadorFecha !== '='
    );
  }

  /**
   * Getter para habilitar/deshabilitar el botón de exportar
   */
  get puedeExportar(): boolean {
    return this.tieneFiltrosReporte;
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

  // get tieneSeleccion(): boolean {
  //   return this.selectedRows.length > 0;
  // }
  get tieneSeleccion(): boolean {
    return this.todosLosIdsSeleccionados.size > 0;
  }

  // get textoSeleccion(): string {
  //   return `${this.selectedRows.length} registro(s) seleccionado(s)`;
  // }
  get textoSeleccion(): string {
    return `${this.todosLosIdsSeleccionados.size} registro(s) seleccionado(s)`;
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
