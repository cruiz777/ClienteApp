import { Component, OnInit } from '@angular/core';
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
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
import { SimplePrefijoResponse } from 'src/app/interfaces/responses/prefijo-simple';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { SsccRequest } from 'src/app/interfaces/requests/sscc-request';
import { ColDef, SelectionChangedEvent } from 'ag-grid-community';
import { ButtonRendererComponent } from '../../utils/grid/button-renderer.component';
import { CheckboxRendererComponents } from '../../utils/grid/checkbox-renderer.component';
import { AgGridModule } from 'ag-grid-angular';
import { ConfirmDialogComponent } from '../../reusable/confirm-dialog/confirm-dialog.component';
import { StatusRendererComponent } from '../../utils/grid/status-renderer.component';
import type { GridApi, GridReadyEvent } from 'ag-grid-community';
import { ObservacionDialogComponent } from './observacion-dialog.component';
import { extraerSerialDinamico } from '../../utils/filters/extraer-serial.function';
import { ExportService } from 'src/app/services/export.service';
import { MatMenuModule } from '@angular/material/menu';
import { MatRadioButton } from '@angular/material/radio';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { MY_DATE_FORMATS } from '../../seguridades/usuarios/usuarios-form/usuarios-form.component';

interface SsccTablaView { //Interfaz auxiliar para poder mapear solamente lo que se requiere
  id: number;
  empresa: string;
  idPrefijo: number;
  prefijo: string;
  identificadorEmpaque: string;
  sscc: string;
  fecha: string;
  estado: string;
  usuario: string;
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
    CheckboxRendererComponents
  ],
  providers: [
    { provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS }
  ]
})
export class NuevoSsccComponent implements OnInit {
  // Variables del grid
  private gridApi!: GridApi<SsccTablaView>; // define con tipo explícito
  
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
      cellRenderer: StatusRendererComponent, // Componente personalizado para estado
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
    floatingFiltersHeight: 35,
    onSelectionChanged: (event: SelectionChangedEvent) => this.onSelectionChanged(event)
  };

  activeTab: string = 'Listado';
  isHandset: boolean = false;
  isExpanded: boolean = true;
  currentDateTime: string = '';
  prefijosCliente: SimplePrefijoResponse[] = [];
  // LISTADO
  columnas: string[] = ['indice', 'empresa', 'prefijo', 'identificadorEmpaque', 'sscc', 'fecha', 'estado', 'usuario', 'opcion', 'seleccionar'];
  registros = [
    { empresa: 'Empresa A', prefijo: '12345', identificadorEmpaque: 'EMPK001', sscc: 'SSCC001', fecha: new Date(), estado: 'Activo', usuario: 'admin', seleccionado: false },
    { empresa: 'Empresa B', prefijo: '67890', identificadorEmpaque: 'EMPK002', sscc: 'SSCC002', fecha: new Date(), estado: 'Inactivo', usuario: 'usuario1', seleccionado: false }
  ];
  // dataFiltrada = new MatTableDataSource(this.registros);
  prefijosDisponibles: { id: number, codpre: string }[] = [];
  filtroTexto = '';
  filtroPrefijo: number | null = null;
  filtroBusqueda = '';
  filtroEmpaque: string | null = null;
  filtroSerialDesde: string = '';
  filtroSerialHasta: string = '';
  buscarSsccControl = new FormControl('');

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
    { simbolo: '=<', control: 'opMenorIgual' },
    { simbolo: '>', control: 'opMayor' },
    { simbolo: 'Entre', control: 'opEntre' }
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
      producto: [''],
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
      operadorFecha: ['entre'] // valores: 'igual', 'menor', 'mayor', 'entre'
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

    if (!cliente) {
      this.mostrarMensaje({
        title: 'Cliente no seleccionado',
        message: 'Debes seleccionar al menos un cliente para continuar.',
        type: 'warning'
      });
      this.router.navigate(['/pages/clientes']);
      return;
    }
    //Busca por filtro y muestra en la pagina encontrada
    this.initFiltroBusquedaListener();
    this.filtroBusquedaControl.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(value => {
      this.filtroBusqueda = value ?? '';
      this.cargarSSCCs();
    });

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
    this.cargarSSCCs();
  }

  // ========== LISTADO ==========
  filtrar(): void {
    this.dataFiltrada.data = this.ssccsData.filter(r => {
      const coincideTexto = this.filtroTexto
        ? JSON.stringify(r).toLowerCase().includes(this.filtroTexto.toLowerCase())
        : true;

      const coincidePrefijo = this.filtroPrefijo !== null
        ? Number(r.idPrefijo) === Number(this.filtroPrefijo)
        : true;

      const coincideBusqueda = this.filtroBusqueda
        ? JSON.stringify(r).toLowerCase().includes(this.filtroBusqueda.toLowerCase())
        : true;

      const coincideEmpaque = this.filtroEmpaque
        ? String(r.identificadorEmpaque) === this.filtroEmpaque
        : true;

      const serial = extraerSerialDinamico(r.sscc, r.prefijo);
      const desde = this.filtroSerialDesde ? parseInt(this.filtroSerialDesde) : null;
      const hasta = this.filtroSerialHasta ? parseInt(this.filtroSerialHasta) : null;

      const coincideRango = (desde !== null && hasta !== null && serial !== null)
        ? serial >= desde && serial <= hasta
        : true;

      return coincideTexto &&
        coincidePrefijo &&
        coincideBusqueda &&
        coincideEmpaque &&
        coincideRango;
    });
    // Reinicia a la primera página para que el resultado filtrado se muestre
    this.pageIndex = 0;
    this.dataFiltrada.paginator?.firstPage();
  }
  
  //Carga todos los datos desde el backend
  cargarSSCCs(page: number = 0, size: number = 500): void {
    const cliente = this.clienteSeleccionadoService.obtenerClienteActual();
    if (!cliente) return;
    // Generar clave de caché con estado actual de filtros
    const key = this.getCacheKey(page, size, this.filtroPrefijo, this.filtroBusqueda);

    // Si ya existe en cache, lo usamos directamente
    if (this.ssccCache.has(key)) {
      console.log('✅ Usando datos de caché para:', key);
      this.ssccsData = this.ssccCache.get(key)!;
      this.pageIndex = page;
      this.pageSize = size;
      this.filtrar(); // si quieres aplicar algún filtro adicional visual
      return;
    }

    // Paso 1: cargar prefijos
    this.prefijoService.obtenerPrefijosUnicosPorCliente(cliente.clientes_codigo).subscribe({
      next: (prefijos) => {
        this.prefijosDisponibles = prefijos.map(p => ({
          id: p.idPrefijos,
          codpre: p.codpre
        }));

        // Si no se ha seleccionado prefijo aún, seleccionamos el primero por defecto
        // if (!this.filtroPrefijo && this.prefijosDisponibles.length > 0) {
        //   this.filtroPrefijo = this.prefijosDisponibles[0].id;
        // }
        this.filtroPrefijo = null;

        // Paso 2: cargar SSCCs desde backend
        this.ssccService.getByCliente(cliente.clientes_codigo, page + 1, size).subscribe({
          next: (response) => {
            const mappedData = response.data.items.map((item: any) => {
              const codpre = this.prefijosDisponibles.find(p => Number(p.id) === Number(item.id_prefijo))?.codpre || 'N/A';

              return {
                id: item.id_sscc,
                empresa: cliente?.nomcli || 'ECOP',
                idPrefijo: item.id_prefijo,
                prefijo: codpre,
                identificadorEmpaque: item.indicador,
                sscc: item.sscc_completo,
                fecha: item.fecha_creacion,
                estado: item.estado ? 'Activo' : 'Inactivo',
                usuario: item.usuario,
                seleccionado: false
              };
            });

            // Guardar en caché
            this.ssccCache.set(key, mappedData);
            console.log('📦 Datos guardados en caché para:', key);

            // Actualizar la tabla
            this.ssccsData = mappedData;
            this.totalItems = response.data.totalItems;
            this.pageIndex = response.data.page - 1;
            this.pageSize = response.data.pageSize;
            this.filtrar();
          },
          error: (err) => console.error('❌ Error al cargar SSCCs:', err)
        });
      },
      error: (err) => console.error('❌ Error al cargar prefijos:', err)
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

  cambiarTab(tab: string): void {
    this.activeTab = tab;
    // Resetear selección del grid
    this.selectedRows = [];

    // Se limpia el grid completamente
    if (this.gridApi) {
      this.gridApi.deselectAll();
    }
  }

  salir(): void {
    this.router.navigate(['/pages/clientes']);
  }

  // ========== GENERAR ==========
  nuevo(): void {
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
  }

  generar(): void {
    const inicio = parseInt(this.formSSCC.get('inicio')?.value || '1', 10);
    const cantidad = parseInt(this.formSSCC.get('producto')?.value || '0', 10); // default en 0

    if (isNaN(cantidad) || cantidad <= 0) {
      this.mostrarMensaje({
        title: 'Cantidad inválida',
        message: '⚠️ Debes ingresar un número válido de productos a codificar.',
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
      secuencia_inicio: inicio,
      cantidad_codigos: cantidad,
      usuario: usuario.nombre_usuario
    };

    this.ssccService.generate(payload).subscribe({
       next: (res) => {
          const lista = res.data.map((codigo: string, index: number) => ({
            ia: index + 1,
            sscc: codigo
          }));

          this.dataGenerada.data = lista;
          this.formSSCC.patchValue({ codigosGenerados: lista.length });

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
        message: '⚠️ No hay códigos generados para guardar.',
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

    const request: SsccRequest = {
      id_prefijo: Number(this.formSSCC.get('prefijo')?.value),
      id_cliente: cliente.clientes_codigo,
      indicador: Number(this.formSSCC.get('empaque')?.value),
      serie: this.formSSCC.get('serie')?.value || false,
      cantidad_codigos: codigos.length,
      secuencia_inicio: parseInt(this.formSSCC.get('inicio')?.value || '1', 10),
      usuario: usuario.nombre_usuario
    };

    this.ssccService.create(request).subscribe({
      next: (res) => {
        // Mostrar el mensaje del backend tal como viene
        const mensajeDelBackend = res?.message || 'Los códigos se generaron y guardaron correctamente.';

        this.mostrarMensaje({
          title: 'Guardado exitoso',
          message: mensajeDelBackend,
          type: 'success'
        });

        // Limpiar después del guardado
        this.dataGenerada.data = [];
        this.formSSCC.patchValue({ codigosGenerados: 0 });
        this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
            this.router.navigate(['/menuProductos/nuevoSscc']);
        });
      },
      error: (err) => {
        const backendMsg = err?.error?.message || 'Error al guardar los códigos.';
        this.mostrarMensaje({
          title: 'Error al guardar',
          message: `${backendMsg}`,
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
  }
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

    this.ssccService.getByNumeroSscc(numeroSscc).subscribe({
      next: (res) => {
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
        this.mostrarMensaje({
          title: 'Error',
          message: err?.error?.message || 'Error al buscar el SSCC.',
          type: 'error'
        });
      }
    });
  }

  // ========== REPORTES ==========
  exportar(): void {
    const filtros = this.formReporte.value;
    console.log('Exportando con filtros:', filtros);
  }
  reportes(formato: 'excel' | 'pdf' = 'excel'): void {
    const { prefijo, estado, desde, hasta, operadorFecha } = this.formReporte.value;

    const datosFiltrados = this.ssccsData.filter(item => {
      const fechaItem = new Date(item.fecha);

      const cumplePrefijo = prefijo ? item.idPrefijo == prefijo : true;
      const cumpleEstado = estado ? item.estado === estado : true;

      const fechaDesde = desde ? new Date(desde) : null;
      const fechaHasta = hasta ? new Date(hasta) : null;

      let cumpleFecha = true;
      switch (operadorFecha) {
        case 'igual':
          cumpleFecha = fechaDesde ? fechaItem.toDateString() === fechaDesde.toDateString() : true;
          break;
        case 'menor':
          cumpleFecha = fechaDesde ? fechaItem <= fechaDesde : true;
          break;
        case 'mayor':
          cumpleFecha = fechaDesde ? fechaItem > fechaDesde : true;
          break;
        case 'entre':
          cumpleFecha = (fechaDesde && fechaHasta) ? fechaItem >= fechaDesde && fechaItem <= fechaHasta : true;
          break;
      }

      return cumplePrefijo && cumpleEstado && cumpleFecha;
    });

    if (datosFiltrados.length === 0) {
      this.mostrarMensaje({
        title: 'Sin resultados',
        message: 'No se encontraron registros que coincidan con los filtros.',
        type: 'warning'
      });
      return;
    }

    const headers = ['Empresa', 'Prefijo', 'ID Empaque', 'SSCC', 'Fecha', 'Estado', 'Usuario'];
    const columns: (keyof SsccTablaView)[] = ['empresa', 'prefijo', 'identificadorEmpaque', 'sscc', 'fecha', 'estado', 'usuario'];

    const options = {
      data: datosFiltrados,
      columns,
      headers,
      filename: 'reporte_sscc',
      title: 'Reporte de SSCC',
      logoUrl: '/assets/logo.png'
    };

    if (formato === 'excel') {
      this.exportService.exportarExcel(options);
    } else {
      this.exportService.exportarPDF(options);
    }
  }

  //Paginador
  onPageChange(event: any): void {
    this.cargarSSCCs(event.pageIndex, event.pageSize);
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
          this.cargarSSCCs();
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
  private initFiltroBusquedaListener(): void {
    this.filtroBusquedaControl.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(value => {
      this.filtroBusqueda = value ?? '';
      this.cargarSSCCs(); // ya llama a filtrar() internamente

      // Espera un poco a que los datos se filtren antes de moverte de página
      setTimeout(() => {
        this.goToPageForFilteredResult();
      }, 100);
    });
  }

  private aplicarEstilosGrid(): void {
    // Aplicar estilos personalizados al grid
    const gridElement = document.querySelector('.ag-theme-alpine');
    if (gridElement) {
      gridElement.classList.add('custom-grid-styles');
    }
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
  goToPageForFilteredResult(): void {
    const allData = this.dataFiltrada.data;
    const filtro = this.filtroBusqueda.toLowerCase();

    // Encuentra el índice del primer resultado coincidente
    const index = allData.findIndex(item =>
      JSON.stringify(item).toLowerCase().includes(filtro)
    );

    if (index !== -1) {
      // Calcula a qué página pertenece ese índice
      const pageNumber = Math.floor(index / this.pageSize);
      this.pageIndex = pageNumber;

      // Recarga los datos visibles para esa página
      setTimeout(() => {
        this.gridApi.paginationGoToPage(pageNumber);
      }, 0);
    }
  }

}