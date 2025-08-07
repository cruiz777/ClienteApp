import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, MatOptionModule } from '@angular/material/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDatepickerModule } from '@angular/material/datepicker';

import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { SsccResponse } from 'src/app/interfaces/responses/sscc-response';
import { SsccService } from 'src/app/services/sscc.service';
import { ClienteSeleccionadoService } from 'src/app/services/cliente-seleccionado.service';
import { PrefijoService } from 'src/app/services/prefijo.service';
import { MatPaginatorModule } from '@angular/material/paginator';
import { GenerateSsccRequest } from 'src/app/interfaces/requests/generate-sscc-request';
import { UsuarioService } from 'src/app/services/usuario.service';
import { MatDialog } from '@angular/material/dialog';
import { SimplePrefijoResponse } from 'src/app/interfaces/responses/prefijo-simple';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { SsccRequest } from 'src/app/interfaces/requests/sscc-request';
import { ColDef, SelectionChangedEvent } from 'ag-grid-community';
import { ButtonRendererComponent } from '../../utils/grid/button-renderer.component';
import { CheckboxRendererComponents } from '../../utils/grid/checkbox-renderer.component';
import { AgGridModule } from 'ag-grid-angular';
import { ConfirmDialogComponent } from '../../reusable/confirm-dialog/confirm-dialog.component';
import { StatusRendererComponent } from '../../utils/grid/status-renderer.component';
import type { GridApi, GridReadyEvent } from 'ag-grid-community';
import { extraerSerialDinamico } from '../../utils/filters/extraer-serial.function';
import { ExportService } from 'src/app/services/export.service';
import { MatMenuModule } from '@angular/material/menu';
import { MatRadioButton } from '@angular/material/radio';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { MY_DATE_FORMATS } from '../../seguridades/usuarios/usuarios-form/usuarios-form.component';
import { Cliente } from 'src/app/interfaces/cliente';
import { MatTooltip } from '@angular/material/tooltip';
import { isValid, parse, setHours, setMilliseconds, setMinutes, setSeconds } from 'date-fns';
import { ObservacionDialogComponent } from './observacion-dialog.component';
import * as moment from 'moment';
import { CustomMessageBoxComponent, MessageBoxData } from '../../utils/messages/custom-message-box.component';
import { CustomValidators } from '../../utils/validators/validator.util';

interface SsccTablaView { //Interfaz auxiliar para poder mapear solamente lo que se requiere
  id: number;
  empresa: string;
  idPrefijo: number;
  prefijo: string;
  identificadorEmpaque: string;
  sscc: string;
  fecha: string;
  estado: string;
  usuario?: string;
  seleccionado: boolean;
}

@Component({
  selector: 'app-nuevo-sscc',
  standalone: true,
  templateUrl: './nuevo-sscc.component.html',
  styleUrls: ['./nuevo-sscc.component.css'],
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
    MatRadioButton,
    MatTableModule,
    MatSortModule,
    MatOptionModule,
    MatDatepickerModule,
    MatPaginatorModule,
    AgGridModule,
    ButtonRendererComponent,
    CheckboxRendererComponents,
    MatTooltip
  ],
  providers: [
    { provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS }
  ]
})
export class NuevoSsccComponent implements OnInit, OnDestroy {
  public CustomValidators = CustomValidators;
  // Variables del grid
  private gridApi!: GridApi<SsccTablaView>; // define con tipo explícito
  private destroy$ = new Subject<void>();
  private updatingStatus = false; // Esta ya la tienes
  isSearching = false;
  selectedRows: SsccTablaView[] = [];
  usuario: any;
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
      field: 'prefijo', 
      headerName: 'Prefijo', 
      filter: 'agTextColumnFilter',
      width: 120,
      cellClass: 'text-center font-mono bg-blue-50'
    },
    {
      field: 'identificadorEmpaque',
      headerName: 'ID Empaque',
      filter: 'agTextColumnFilter',
      width: 140,
      cellClass: 'text-center font-mono',
      valueFormatter: (params) => {
        const value = params.value;
        return (value !== null && value !== undefined && !isNaN(Number(value)))
          ? String(value)
          : 'N/A';
      }
    },
    { 
      field: 'sscc', 
      headerName: 'SSCC', 
      filter: 'agTextColumnFilter',
      width: 200,
      cellClass: 'font-mono text-sm',
      tooltipField: 'sscc' // Mostrar tooltip completo
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
      pinned: 'right', //Mantener fija a la derecha como en cupones
      cellRenderer: StatusRendererComponent, // USAR EL COMPONENT RENDERER
      cellClass: 'text-center',
      
      // Configuración para edición
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['Activo', 'Inactivo']
      },
      
      //Se manejan los cambios con confirmación
      onCellValueChanged: (params) => this.onEstadoChangedConConfirmacion(params)
    
    },

    { 
      field: 'usuario', 
      headerName: 'Usuario', 
      filter: 'agTextColumnFilter',
      width: 140,
      cellClass: 'text-gray-700'
    }
  ];
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  defaultColDef: ColDef = {
    sortable: true,
    resizable: true,
    filter: true,
    floatingFilter: true, // Filtros flotantes para mejor UX
    menuTabs: ['filterMenuTab', 'generalMenuTab'],
    cellClass: 'ag-cell-focus'
  };
  //DEPRECADO 
  // frameworkComponents = {
  //   checkboxRenderer: CheckboxRendererComponents,
  //   buttonRenderer: ButtonRendererComponent
  // };

   onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
  }


  
  // Configuración del grid
  gridOptions = {
    animateRows: true,
    enableRangeSelection: true,
    suppressRowClickSelection: true, // Solo selección por checkbox
    rowSelection: 'multiple',
    suppressCellFocus: false,
    enableCellTextSelection: true,
    pagination: true,
    paginationPageSize: 50,
    paginationPageSizeSelector: [50, 100, 200, 500],
    overlayLoadingTemplate: '<span class="ag-overlay-loading-center">Cargando datos...</span>',
    overlayNoRowsTemplate: '<span class="ag-overlay-no-rows-center">No hay datos para mostrar</span>',
    rowHeight: 48, // Altura de fila más cómoda
    headerHeight: 50,
    singleClickEdit: true, 
    stopEditingWhenCellsLoseFocus: true,
    floatingFiltersHeight: 35,
    onSelectionChanged: (event: SelectionChangedEvent) => this.onSelectionChanged(event)
  };

  codigoGenerado: boolean = false;
  activeTab: string = 'Listado';
  isHandset: boolean = false;
  isExpanded: boolean = true;
  currentDateTime: string = '';
  prefijosCliente: SimplePrefijoResponse[] = [];
  // LISTADO
  columnas: string[] = ['indice', 'empresa', 'prefijo', 'identificadorEmpaque', 'sscc', 'fecha', 'estado', 'usuario', 'opcion', 'seleccionar'];

  // dataFiltrada = new MatTableDataSource(this.registros);
  prefijosDisponibles: { id: number, codpre: string, prefijosgs1: string }[] = [];
  prefijosgs1: {  id: number, prefijosgs1: string }[] = [];
  filtroTexto = '';
  filtroPrefijo: number | null = null;
  filtroBusqueda = '';
  filtroEmpaque: string | null = null;
  filtroSerialDesde: string = '';
  filtroSerialHasta: string = '';
  buscarSsccControl = new FormControl('');
  clienteSeleccionadoObj: Cliente | null = null;

  ssccsData: SsccTablaView[] = [];
  dataFiltrada = new MatTableDataSource<SsccTablaView>([]);
  totalItems = 0;
  pageIndex = 0;
  pageSize = 500;
  pageSizeOptions = [50, 100, 200, 500];

  // GENERAR
  formSSCC: FormGroup;
  eliminacionForm: FormGroup;
  columnasGeneradas: string[] = ['ia', 'sscc'];
  empaques = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  dataGenerada = new MatTableDataSource<any>([]);
  filtroBusquedaControl = new FormControl('');

  // REPORTES
  formReporte: FormGroup;
  estados = ['Activo', 'Inactivo'];
  operadores = [
    { simbolo: '=', control: 'opIgual' },
    { simbolo: '<=', control: 'opMenorIgual' },
    { simbolo: '>', control: 'opMayor' },
    { simbolo: 'entre', control: 'opEntre' }
  ];

  constructor(
    private router: Router,
    private breakpointObserver: BreakpointObserver,
    private fb: FormBuilder,
    private ssccService: SsccService,
    private clienteSeleccionadoService: ClienteSeleccionadoService,
    private prefijoService: PrefijoService,
    private usuarioService: UsuarioService,
    private dialog: MatDialog,
    private exportService: ExportService
    ) {
    // FORM GENERAR
    this.formSSCC = this.fb.group({
      codigoCliente: [''],
      cliente: [''],
      ruc: [''],
      prefijo: [null],
      producto: [1, [Validators.required, Validators.min(1), Validators.max(5000)]],
      empaque: [''],
      serie: [false],
      inicio: [''],
      codigosGenerados: ['']
    });
    this.eliminacionForm = this.fb.group({
      prefijo: [null, Validators.required],
      empaque: [null, Validators.required],
      usarRango: [false],
      rangoDesde: [{ value: null, disabled: true }],
      rangoHasta: [{ value: null, disabled: true }],
      observacion: [null, Validators.required]
    });

    // FORM REPORTES
    this.formReporte = this.fb.group({
      prefijo: [''],
      estado: [''],
      desde: [null],
      hasta: [null],
      operadorFecha: ['='] // valores: 'igual', 'menor', 'mayor', 'entre'
    });

    // RESPONSIVE
    this.breakpointObserver.observe([Breakpoints.Handset])
      .subscribe(result => {
        this.isHandset = result.matches;
        this.isExpanded = !this.isHandset;
      });
  }
 
  ngOnInit(): void {
     this.usuarioService.currentUser$.subscribe(usuario => {
      this.usuario = usuario;
      console.log('Usuario: ', this.usuario)
      
    });
    const cliente = this.clienteSeleccionadoService.obtenerClienteActual();
    console.warn('Usuario no encontrado');
    this.clienteSeleccionadoObj = cliente;
    this.formReporte.get('operadorFecha')?.valueChanges.subscribe(valor => {
      console.log('📻 operadorFecha cambiado a:', valor);
    });
    if (!cliente) {
      this.mostrarMensaje({
        title: 'Cliente no seleccionado',
        message: 'Debes seleccionar al menos un cliente para continuar.',
        type: 'warning'
      });
      this.router.navigate(['/pages/clientes']);
      return;
    }
    this.cargarPrefijosPorCliente();
    this.cargarPrefijosGs1();
    //Busca por filtro y muestra en la pagina encontrada
    // this.initFiltroBusquedaListener();
    // this.filtroBusquedaControl.valueChanges.pipe(
    //   debounceTime(400),
    //   distinctUntilChanged()
    // ).subscribe(value => {
    //   this.filtroBusqueda = value ?? '';
    //   this.cargarSSCCsActual();
    // });

    // Setea campos cliente en el formulario de generación
    this.formSSCC.patchValue({
      codigoCliente: cliente.clientes_codigo,
      cliente: cliente.nomcli,
      ruc: cliente.ruc
    });
    this.formSSCC.get('serie')?.valueChanges.subscribe((checked: boolean) => {
      const secuenciaInicioControl = this.formSSCC.get('inicio');
      const secuenciaFinControl = this.formSSCC.get('fin');

      if (checked) {
        secuenciaInicioControl?.enable();
        secuenciaFinControl?.enable();
      } else {
        secuenciaInicioControl?.disable();
        secuenciaFinControl?.disable();
      }
    });

    // Deshabilitar al inicio (si lo deseas)
    this.formSSCC.get('inicio')?.disable();
    this.formSSCC.get('fin')?.disable();
    // Cargar SSCCs y prefijos de ese cliente
    this.cargarSSCCsActual();
  }

  // ========== LISTADO ==========

  //Carga todos los datos desde el backend
  //Carga todos los datos desde el backend
  cargarSSCCs(page: number = 0, size: number = 10): void {
    const cliente = this.clienteSeleccionadoService.obtenerClienteActual();
    if (!cliente) return;
    this.isSearching = true;
    console.log('📌 Prefijos disponibles:', this.prefijosDisponibles);
    console.log('🎯 Valor seleccionado en filtroPrefijo:', this.filtroPrefijo);

    const idPrefijoSeleccionado = this.filtroPrefijo;
    
    const filtros = {
      page: page + 1,
      pageSize: size,
      idPrefijo: idPrefijoSeleccionado ?? undefined,
      busqueda: this.filtroBusqueda?.trim() || undefined,
      empaque: this.filtroEmpaque || undefined,
      serialDesde: this.filtroSerialDesde ? parseInt(this.filtroSerialDesde) : undefined,
      serialHasta: this.filtroSerialHasta ? parseInt(this.filtroSerialHasta) : undefined,
      estado: this.formReporte.value.estado || undefined,
      fechaDesde: this.formReporte.value.desde || undefined,
      fechaHasta: this.formReporte.value.hasta || undefined
    };

    console.log('Filtros enviados:', filtros);

    //Mostrar loading antes de la petición
    const loadingDialog = this.dialog.open(CustomMessageBoxComponent, {
      disableClose: true,
      data: {
        title: 'Cargando datos...',
        message: 'Por favor espere mientras se cargan los códigos SSCC.',
        type: 'info',
        isLoading: true,
        loadingText: 'Obteniendo registros...',
        showCancel: false
      }
    });

    this.ssccService.getByClienteConFiltros(cliente.clientes_codigo, filtros).subscribe({
      next: (response) => {
        this.isSearching = false;
        //Cerrar loading en éxito
        loadingDialog.close();

        const mappedData = response.data.items.map((item: any) => {
          const codpre = this.prefijosDisponibles.find(p => p.id === item.id_prefijo)?.codpre || 'N/A';

          return {
            id: item.id_sscc,
            idPrefijo: item.id_prefijo,
            empresa: cliente?.nomcli || 'ECOP',
            prefijo: codpre,
            identificadorEmpaque: item.indicador,
            sscc: item.sscc_completo,
            fecha: item.fecha_creacion,
            estado: item.estado ? 'Activo' : 'Inactivo',
            usuario: item.usuario,
            seleccionado: false
          };
        });

        this.ssccsData = mappedData;
        this.dataFiltrada.data = mappedData;

        this.totalItems = response.data.totalItems;
        this.pageIndex = response.data.page - 1;
        this.pageSize = response.data.pageSize;
      },
      error: (err) => {
        //Cerrar loading en error
        loadingDialog.close();
        this.isSearching = false;
        console.error('❌ Error al cargar SSCCs:', err);
        
        // Mostrar mensaje de error
        this.dialog.open(CustomMessageBoxComponent, {
          width: '420px',
          data: {
            title: 'Error al cargar datos',
            message: err?.error?.message || 'No se pudieron cargar los códigos SSCC. Intente nuevamente.',
            type: 'error'
          }
        });
      }
    });
  }

  cargarPrefijosPorCliente(): void {
    const cliente = this.clienteSeleccionadoService.obtenerClienteActual();
    if (!cliente) return;
         
    this.prefijoService.obtenerPrefijosUnicosPorCliente(cliente.clientes_codigo).subscribe({
      next: (res) => {
        this.prefijosDisponibles = res.map(p => ({
          id: p.idPrefijos,
          codpre: p.codpre,
          prefijosgs1: p.prefijosgs1
        }));
      },
      error: (err) => console.error('❌ Error al cargar prefijos:', err)
    });
  }

  cargarPrefijosGs1(): void {
    const cliente = this.clienteSeleccionadoService.obtenerClienteActual();
    if (!cliente) return;
         
    this.prefijoService.obtenerPorClienteCodigo(cliente.clientes_codigo).subscribe({
      next: (res) => {
        this.prefijosgs1 = res.map(p => ({
          id: p.id_prefijos,
          prefijosgs1: p.prefijosgs1
        }));
      },
      error: (err) => console.error('❌ Error al cargar prefijos:', err)
    });
  }

  verDetalle(row: any): void {
    this.mostrarMensaje({
      title: 'Detalle',
      message: `Mostrando detalle para: ${row.empresa}`,
      type: 'info'
    });

  }
  private operadorFechaSuscrito = false;
  cambiarTab(tab: string): void {
    this.activeTab = tab;
    
    // Resetear selección del grid
    this.selectedRows = [];

    // Limpiar selección del grid
    if (this.gridApi) {
      this.gridApi.deselectAll();
    }

    // Limpiar todos los filtros al cambiar de tab
    this.limpiarFiltrosSinMensaje();
    
    // Si cambiamos al tab de "Listado", recargar los SSCCs
    if (tab === 'Listado') {
      this.cargarSSCCsActual();
    }

    // Configurar suscripción para operador de fecha solo una vez
    if (tab === 'Reportes' && !this.operadorFechaSuscrito) {
      this.formReporte.get('operadorFecha')?.valueChanges.subscribe(valor => {
        console.log('📻 operadorFecha cambiado a:', valor);
      });
      this.operadorFechaSuscrito = true;
    }
  }


  salir(): void {
    this.router.navigate(['/pages/clientes']);
  }

  // ========== GENERAR ==========
  nuevo(): void {
    // Dependiendo del tab activo, limpiar diferentes elementos
    if (this.activeTab === 'Generar') {
      // Limpiar campos específicos del formulario de generación
      this.formSSCC.patchValue({
        prefijo: null,
        producto: '',
        empaque: '',
        serie: false,
        inicio: '',
        fin: '',
        codigosGenerados: ''
      });

      // Asegurarse de desactivar los campos de secuencia
      this.formSSCC.get('inicio')?.disable();
      this.formSSCC.get('fin')?.disable();

      // Limpiar la tabla de códigos generados
      this.dataGenerada.data = [];

      // Permite generar los códigos nuevamente
      this.codigoGenerado = false;
    } else if (this.activeTab === 'Reportes') {
      // Limpiar solo los filtros de reportes
      this.formReporte.reset({
        prefijo: '',
        estado: '',
        desde: null,
        hasta: null,
        operadorFecha: '='
      });
    } else if (this.activeTab === 'Listado') {
      // Limpiar filtros de listado
      this.limpiarFiltros();
    }
  }

  generar(): void {
    const inicio = parseInt(this.formSSCC.get('inicio')?.value || '1', 10);
    const cantidad = parseInt(this.formSSCC.get('producto')?.value || '0', 10); // default en 0

    if (isNaN(cantidad) || cantidad <= 0) {
      this.mostrarMensaje({
        title: 'Cantidad inválida',
        message: ' Debes ingresar un número válido de productos a codificar.',
        type: 'warning'
      });
      return;
    }

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

    const payload: GenerateSsccRequest = {
      id_prefijo: Number(this.formSSCC.get('prefijo')?.value),
      id_cliente: cliente.clientes_codigo,
      indicador: this.formSSCC.get('empaque')?.value,
      producto_codificado: this.formSSCC.get('producto')?.value.toString(),
      serie: this.formSSCC.get('serie')?.value || false,
      cantidad_codigos: cantidad,
      usuario: usuario.nombre_usuario
    };
    // Solo incluir secuencia_inicio si la casilla "serie" está marcada
    if (payload.serie) {
      payload.secuencia_inicio = inicio;
    }
    this.ssccService.generate(payload).subscribe({
       next: (res) => {
          const lista = res.data.map((codigo: string, index: number) => ({
            ia: index + 1,
            sscc: codigo
          }));

          this.dataGenerada.data = lista;
          this.formSSCC.patchValue({ codigosGenerados: lista.length });
          this.codigoGenerado = true;
          const cantidadSolicitada = payload.cantidad_codigos;
          const cantidadGenerada = lista.length;

          if (cantidadGenerada < cantidadSolicitada) {
            this.mostrarMensaje({
              title: 'Códigos parcialmente generados',
              message: `Solo se generaron ${cantidadGenerada} de ${cantidadSolicitada} códigos solicitados. Es posible que algunos ya existan.`,
              type: 'warning'
            });
          } else {
            this.mostrarMensaje({
              title: 'Códigos generados',
              message: `Se generaron ${lista.length} códigos correctamente.`,
              type: 'success'
            });
          }
       },
      error: (err) => {
        console.error('Error al generar SSCCs:', err);

        const backendMsg = err?.error?.message || 'Error al generar los códigos.';

        this.mostrarMensaje({
          title: 'Error al generar',
          message: `${backendMsg}`,
          type: 'error'
        });
      }
    });
  }

  grabar(): void {
    const codigos = this.dataGenerada.data;

    if (!codigos || codigos.length === 0) {
      this.mostrarMensaje({
        title: 'Sin códigos',
        message: ' No hay códigos generados para guardar.',
        type: 'warning'
      });
      return;
    }
    const codigosUnicos = new Set(codigos.map(c => c.sscc));
    if (codigosUnicos.size < codigos.length) {
      this.mostrarMensaje({
        title: 'Códigos duplicados',
        message: 'Hay códigos SSCC duplicados. Revisa la generación.',
        type: 'error'
      });
      return;
    }

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
    const serie = this.formSSCC.get('serie')?.value;
    const inicio = serie ? parseInt(this.formSSCC.get('inicio')?.value || '1', 10) : undefined;

    const request: SsccRequest = {
      id_prefijo: Number(this.formSSCC.get('prefijo')?.value),
      id_cliente: cliente.clientes_codigo,
      indicador: Number(this.formSSCC.get('empaque')?.value),
      serie: serie,
      cantidad_codigos: codigos.length,
      secuencia_inicio: inicio,
      usuario: usuario.nombre_usuario
    };

    // Mostrar message-box de carga
    const dialogRef = this.dialog.open(CustomMessageBoxComponent, {
      disableClose: true,
      data: {
        title: 'Guardando códigos...',
        message: 'Por favor espere mientras se procesan los códigos.',
        type: 'info',
        isLoading: true,
        showCancel: false
      }
    });

    this.ssccService.create(request).subscribe({
      next: (res) => {
        dialogRef.close(); // Cierra el modal de carga

        const mensajeDelBackend = res?.message || 'Los códigos se generaron y guardaron correctamente.';

        this.mostrarMensaje({
          title: 'Guardado exitoso',
          message: mensajeDelBackend,
          type: 'success'
        });

        // Limpiar
        this.dataGenerada.data = [];
        this.formSSCC.patchValue({ codigosGenerados: 0 });
        this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
          this.router.navigate(['/menuProductos/nuevoSscc']);
        });
      },
      error: (err) => {
        dialogRef.close(); // Cierra el modal también en error

        const backendMsg = err?.error?.message || 'Error al guardar los códigos.';
        this.mostrarMensaje({
          title: 'Error al guardar',
          message: backendMsg,
          type: 'error'
        });
      }
    });
  }

  cancelar(): void{
    // Limpiar campos específicos
    this.formSSCC.patchValue({
      prefijo: null,
      producto: '',
      empaque: '',
      serie: false,
      inicio: '',
      fin: '',
      codigosGenerados: ''
    });

    // Asegurarse de desactivar los campos de secuencia
    this.formSSCC.get('inicio')?.disable();
    this.formSSCC.get('fin')?.disable();

    // Limpiar la tabla de códigos generados
    this.dataGenerada.data = [];
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate(['/menuProductos/nuevoSscc']);
    });

    //Permite generar codigos nuevamente
    this.codigoGenerado = false;
  }

  //====== BUSQUEDAS AL BACKEND ============//
  buscarSSCC(): void {
    const numeroSscc = this.buscarSsccControl.value?.trim();
    const cliente = this.clienteSeleccionadoService.obtenerClienteActual();

    if (!numeroSscc) {
      this.mostrarMensaje({
        title: 'Campo vacío',
        message: 'Por favor, ingresa un número SSCC.',
        type: 'warning'
      });
      return;
    }
    const loadingDialog = this.dialog.open(CustomMessageBoxComponent, {
      disableClose: true,
      data: {
        title: 'Buscando SSCC...',
        message: 'Consultando código específico.',
        type: 'info',
        isLoading: true,
        showCancel: false
      }
    });
    this.ssccService.getByNumeroSscc(numeroSscc).subscribe({
      next: (res) => {
        loadingDialog.close();
        if (res.type === 'ERROR' || !res.data) {
          this.mostrarMensaje({
            title: 'No encontrado',
            message: res.message || 'El número SSCC no existe.',
            type: 'warning'
          });
          return;
        }

        const item = res.data;
        const codpre = this.prefijosDisponibles.find(p => Number(p.id) === Number(item.id_prefijo))?.codpre || 'N/A';

        const nuevoRegistro: SsccTablaView = {
          id: item.id_sscc,
          empresa: cliente?.nomcli || 'ECOP',
          idPrefijo: item.id_prefijo,
          prefijo: codpre,
          identificadorEmpaque: (item.indicador != null && !isNaN(item.indicador)) ? String(item.indicador) : 'N/A',
          sscc: item.sscc_completo,
          fecha: item.fecha_creacion ?? '',
          estado: item.estado ? 'Activo' : 'Inactivo',
          usuario: item.usuario ?? '',
          seleccionado: false
        };

        // Mostrar solo ese SSCC en la grilla
        this.dataFiltrada.data = [nuevoRegistro];
        this.pageIndex = 0;
        this.totalItems = 1;
      },
      error: (err) => {
        loadingDialog.close();
        this.mostrarMensaje({
          title: 'Error',
          message: err?.error?.message || 'Error al buscar el SSCC.',
          type: 'error'
        });
      }
    });
  }

  buscarConFiltros(): void {
    // Obtener valores actuales de los controles antes de buscar
    this.filtroBusqueda = this.filtroBusquedaControl.value?.trim() || '';
  
    this.pageIndex = 0;
    this.cargarSSCCs(0, this.pageSize);
  }


  // ========== REPORTES ==========
  exportar(): void {
    const filtros = this.formReporte.value;
    console.log('Exportando con filtros:', filtros);
  }

  // Para tu componente de SSCC (nuevo-sscc.component.ts)
  reportes(formato: 'excel' | 'pdf' = 'excel'): void {
    const { prefijo, estado, desde, hasta, operadorFecha } = this.formReporte.value;

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

    const filtros = {
      idPrefijo: prefijo ? Number(prefijo) : undefined,
      estado: estado === 'Activo' ? true : estado === 'Inactivo' ? false : undefined,
      operadorFecha: operadorFecha || undefined,
      fechaDesde: fechaDesde?.toISOString(),
      fechaHasta: fechaHasta?.toISOString()
    };

    console.log('Filtros enviados:', filtros);

    // ✅ Mostrar loading durante la generación del reporte
    const loadingDialog = this.dialog.open(CustomMessageBoxComponent, {
      disableClose: true,
      data: {
        title: 'Generando reporte...',
        message: `Preparando reporte de códigos SSCC en formato ${formato.toUpperCase()}.`,
        type: 'info',
        isLoading: true,
        loadingText: 'Consultando base de datos y procesando archivo...',
        showCancel: false
      }
    });

    this.ssccService.getReporte(filtros).subscribe({
      next: (res) => {
        const cliente = this.clienteSeleccionadoObj;

        if (!res.data || res.data.length === 0) {
          // ✅ Cerrar loading antes de mostrar mensaje
          loadingDialog.close();
          
          this.mostrarMensaje({
            title: 'Sin resultados',
            message: 'No se encontraron registros que coincidan con los filtros.',
            type: 'warning'
          });
          return;
        }

        const data = res.data.map((item): SsccTablaView => {
          const codpre = this.prefijosDisponibles.find(p => p.id === item.id_prefijo)?.codpre || 'N/A';

          return {
            id: item.id_sscc,
            idPrefijo: item.id_prefijo,
            empresa: cliente?.nomcli || 'ECOP',
            prefijo: codpre,
            identificadorEmpaque: item.indicador?.toString() ?? '',
            sscc: item.sscc_completo,
            fecha: item.fecha_creacion ? moment(item.fecha_creacion).format('DD/MM/YYYY') : '',
            estado: item.estado ? 'Activo' : 'Inactivo',
            usuario: item.usuario,
            seleccionado: false
          };
        });

        const headers = [ 'SSCC', 'Fecha'];
        const columns: (keyof SsccTablaView)[] = [ 'sscc', 'fecha'];

        const options = {
          data,
          columns,
          headers,
          filename: 'reporte_sscc',
          title: 'Reporte de SSCC',
          logoUrl: '/assets/logo/GS1-logo.png',
          // Headers del encabezado de los reportes
          headerInfo: {
            codigoEmpresa: this.prefijosgs1.find(p => p.id === Number(prefijo))?.prefijosgs1 || 'SIN PREFIJO',
            nombreEmpresa: cliente?.nomcli || 'NOMBRE DE LA EMPRESA',
            emisor: 'GS1 Ecuador',
            fechaEmision: moment().format('DD/MM/YYYY'),
            pagina: '1',
            ruc: cliente?.ruc || '1234567890123',
          }
        };
        
        console.log('Exportando con headers:', headers);
        console.log('Exportando con columns:', columns);
        console.log('Primer objeto en data:', data[0]);

        try {
          // Exportar según el formato solicitado
          if (formato === 'excel') {
            this.exportService.exportarExcel(options);
          } else {
            this.exportService.exportarPDF(options);
          }

          // ✅ Cerrar loading después de la exportación exitosa
          loadingDialog.close();

          // Mostrar mensaje de éxito
          this.mostrarMensaje({
            title: 'Reporte generado',
            message: `El reporte de SSCC en formato ${formato.toUpperCase()} se ha generado exitosamente.`,
            type: 'success'
          });

        } catch (exportError) {
          // ✅ Cerrar loading en error de exportación
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
        // ✅ Cerrar loading en error de servicio
        loadingDialog.close();
        
        this.mostrarMensaje({
          title: 'Error al generar reporte',
          message: err?.error?.message || 'Ocurrió un error al generar el reporte.',
          type: 'error'
        });
        console.error('❌ Error en reporte:', err);
      }
    });
  }


  //Paginador
  onPageChange(event: any): void {
    // Decidir si usar filtros o cargar todos según el estado actual
    if (this.tieneFiltrosActivos()) {
      // Si hay filtros activos, usar el método con filtros
      this.cargarSSCCs(event.pageIndex, event.pageSize);
    } else {
      // Si no hay filtros, cargar todos
      this.cargarSSCCs(event.pageIndex, event.pageSize);
    }
  }

  // ========== UTILIDADES ==========
  capitalizeFirstLetter(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  updateDateTime(): void {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('es-EC', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = now.toLocaleTimeString('es-EC', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    this.currentDateTime = `${this.capitalizeFirstLetter(formattedDate)}, ${formattedTime}`;
  }

  mostrarMensaje(data: MessageBoxData): void {
  this.dialog.open(CustomMessageBoxComponent, {
      width: '420px',
      data
    });
  }
  compararIds = (o1: any, o2: any): boolean => {
    return Number(o1) === Number(o2);
  };
  ssccCache = new Map<string, SsccTablaView[]>();

  getCacheKey(page: number, size: number, prefijo: number | null, busqueda: string): string {
    return `${page}_${size}_${prefijo ?? 'all'}_${busqueda.trim().toLowerCase()}`;
  }


  onSerieChange(event: MatCheckboxChange): void {
    if (!event.checked) {
      this.formSSCC.get('inicio')?.setValue('');
      this.formSSCC.get('fin')?.setValue('');
    }
  }
  get puedeGrabar(): boolean {
    return this.dataGenerada.data.length > 0;
  }
  editarRegistro(row: SsccTablaView): void {
    console.log('Editando registro:', row);
    // Implementar lógica de edición
    this.mostrarMensaje({
      title: 'Editar SSCC',
      message: `Editando código: ${row.sscc}`,
      type: 'info'
    });
  }

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

      const payload = {
        ids: this.selectedRows.map(row => row.id).filter(id => id != null),
        observacion,
        usuario: this.usuario.id_usuario,
      
      };
      console.log('Usuario:', this.usuario.id);
      if (payload.ids.length === 0) {
        this.mostrarMensaje({
          title: 'Error',
          message: 'No hay registros válidos para eliminar.',
          type: 'error'
        });
        return;
      }

      this.ssccService.deleteMultiple(payload).subscribe({
        next: (response) => {
          this.mostrarMensaje({
            title: 'Eliminación exitosa',
            message: response.message || 'Registros eliminados correctamente.',
            type: 'success'
          });
          this.cargarSSCCsActual();
          this.selectedRows = [];
          this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
            this.router.navigate(['/menuProductos/nuevoSscc']);
          });
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


   seleccionarTodos(): void {
    this.gridApi.selectAll();
  }

  limpiarSeleccion(): void {
    this.gridApi.deselectAll();
  }

  exportarSeleccionados(): void {
    if (this.selectedRows.length === 0) {
      this.mostrarMensaje({
        title: 'Sin selección',
        message: 'Selecciona al menos un registro para exportar.',
        type: 'warning'
      });
      return;
    }

    // Implementar exportación
    console.log('Exportando:', this.selectedRows);
  }

  //============METODOS AUXILIARES ================
  onEstadoChangedConConfirmacion(params: any): void {
    const { data, newValue, oldValue } = params;
    
    // Evitar cambios innecesarios
    if (newValue === oldValue) return;
    
    // Prevenir múltiples actualizaciones simultáneas
    if (this.updatingStatus) {
      this.revertirCambioEstado(params, oldValue);
      return;
    }
    
    // Mostrar diálogo de confirmación
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirmar cambio de estado',
        message: `¿Estás seguro de cambiar el estado del SSCC ${data.sscc} a ${newValue}?`,
        confirmText: 'Confirmar',
        cancelText: 'Cancelar'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.ejecutarCambioEstado(params, data, newValue, oldValue);
      } else {
        // Usuario canceló - revertir
        this.revertirCambioEstado(params, oldValue);
      }
    });
  }

  private ejecutarCambioEstado(params: any, data: any, newValue: string, oldValue: string): void {
    this.updatingStatus = true;
    const nuevoEstado = newValue === 'Activo';
    
    // Aquí debes crear o usar un método en tu SsccService para actualizar el estado
    // Asumiendo que tienes un método updateEstado en tu servicio
    this.ssccService.updateStatus(data.id, nuevoEstado)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.updatingStatus = false;
          
          if (response.type === 'SUCCESS') {
            this.mostrarMensaje({
              title: 'Estado actualizado',
              message: `El SSCC ${data.sscc} ahora está ${newValue}`,
              type: 'success'
            });
            
            // Actualizar el dato local
            data.estado = newValue;
            
            // Opcional: Refrescar la fila en el grid
            this.gridApi.refreshCells({ 
              rowNodes: [params.node], 
              columns: ['estado'],
              force: true 
            });
          } else {
            this.mostrarMensaje({
              title: 'Error',
              message: response.message || 'No se pudo actualizar el estado',
              type: 'error'
            });
            this.revertirCambioEstado(params, oldValue);
          }
        },
        error: (err) => {
          this.updatingStatus = false;
          console.error('Error al actualizar estado SSCC:', err);
          
          this.mostrarMensaje({
            title: 'Error al actualizar',
            message: err?.error?.message || 'No se pudo actualizar el estado del SSCC',
            type: 'error'
          });
          
          this.revertirCambioEstado(params, oldValue);
        }
      });
  }
  private revertirCambioEstado(params: any, valorAnterior: string): void {
    // Revertir el valor en el grid
    params.node.setDataValue('estado', valorAnterior);
    
    // Refrescar la celda para asegurar que se muestre el valor correcto
    this.gridApi.refreshCells({ 
      rowNodes: [params.node], 
      columns: ['estado'],
      force: true 
    });
  }
  // private initFiltroBusquedaListener(): void {
  //   this.filtroBusquedaControl.valueChanges.pipe(
  //     debounceTime(400),
  //     distinctUntilChanged()
  //   ).subscribe(value => {
  //     this.filtroBusqueda = value ?? '';
  //     this.cargarSSCCsActual(); // ahora filtra directamente desde el backend
  //   });
  // }

  private aplicarEstilosGrid(): void {
    // Aplicar estilos personalizados al grid
    const gridElement = document.querySelector('.ag-theme-alpine');
    if (gridElement) {
      gridElement.classList.add('custom-grid-styles');
    }
  }
  //Método auxiliar para poder parametrizar una sola vez el metodo cargarSSCCs
  public cargarSSCCsActual(): void {
    this.pageIndex = 0;
    this.cargarSSCCs(0, this.pageSize);
  }
  
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
    // Usar el método privado para limpiar
    this.limpiarFiltrosSinMensaje();
    
    //Solo recargar si estamos en el tab correcto
    if (this.activeTab === 'Listado') {
      this.cargarSSCCsActual();
    }
  }
  private limpiarFiltrosSinMensaje(): void {
    // Resetear filtros de búsqueda del listado
    this.filtroBusqueda = '';
    this.filtroPrefijo = null;
    this.filtroEmpaque = null;
    this.filtroSerialDesde = '';
    this.filtroSerialHasta = '';
    this.buscarSsccControl.setValue('', { emitEvent: false }); // emitEvent: false para evitar trigger del listener
    this.filtroBusquedaControl.setValue('', { emitEvent: false });
    
    // Resetear formulario de reportes completamente
    this.formReporte.reset({
      prefijo: '',
      estado: '',
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
  private tieneFiltrosActivos(): boolean {
    return !!(
      this.filtroBusqueda?.trim() ||
      this.filtroPrefijo !== null ||
      this.filtroEmpaque ||
      this.filtroSerialDesde?.trim() ||
      this.filtroSerialHasta?.trim() ||
      this.formReporte.value.estado ||
      this.formReporte.value.desde ||
      this.formReporte.value.hasta
    );
  }

  clienteSeleccionado(cliente: Cliente): void {
    this.clienteSeleccionadoObj = cliente;
    this.ssccsData = [];
    this.cargarSSCCsActual();
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
  
  get puedeBuscar(): boolean {
    return !!(
      this.filtroBusqueda?.trim() ||
      this.filtroPrefijo !== null ||
      this.filtroEmpaque ||
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

  onSelectionChanged(event: SelectionChangedEvent): void {
    this.selectedRows = this.gridApi.getSelectedRows();
    console.log('➡️ Registros seleccionados:', this.selectedRows);
  }
  onQuickFilterChanged(event: any): void {
    (this.gridApi as any).setQuickFilter(event.target.value);
  }

}