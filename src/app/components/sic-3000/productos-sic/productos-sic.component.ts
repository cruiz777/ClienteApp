import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RequiredFieldsToastService } from 'src/app/components/utils/messages/required-fields-toast.service';
import { GridApi, GridReadyEvent, CellValueChangedEvent, CellClickedEvent } from 'ag-grid-community';
import { ProductoRequest, sanitizeProductoPayload } from 'src/app/interfaces/requests/producto-request';
import { CreateProductoConEstructuraRequest, ProductoEstructuraComercialRequest } from 'src/app/interfaces/requests/create-producto-estructura-request';
import { ProductoUbicacionBodegaService } from 'src/app/services/producto-ubicacion-bodega.service';
import { ProductoUbicacionBodegaResponse } from 'src/app/interfaces/responses/producto-ubicacion-bodega-response';
import { ProductoUbicacionBodegaRequest } from 'src/app/interfaces/requests/producto-ubicacion-bodega-request';


import { ProductoService } from 'src/app/services/productos.service';
import { PresentacionService } from 'src/app/services/presentacion.service';
import { UnidadVentaService } from 'src/app/services/unidad-venta.service';
import { UnidadVentaResponse } from 'src/app/interfaces/responses/unidad-venta-response';
import { PresentacionResponse } from '../../../interfaces/responses/presentacion-response';
import { ProductoResponse } from 'src/app/interfaces/responses/producto-response';
import { IvaService, Iva } from 'src/app/services/iva.service';
import { LocalesResponse } from 'src/app/interfaces/responses/local-response';
import { LocalesService } from 'src/app/services/locales.service';
import { StockRequest } from 'src/app/interfaces/requests/stocks-request';
import { BodegaService } from 'src/app/services/bodega.service';
import { StocksService } from 'src/app/services/stocks.service';

import { ColorService } from 'src/app/services/color.service';
import { SaborService } from 'src/app/services/sabor.service';
import { FabricanteService } from 'src/app/services/fabricante.service';
import { ColorResponse } from 'src/app/interfaces/responses/color-response';
import { SaborResponse } from 'src/app/interfaces/responses/sabor-response';
import { FabricanteResponse } from 'src/app/interfaces/responses/fabricante-response';

import { ProveedorService } from 'src/app/services/proveedor.service';
import { ProductoProveedorService } from 'src/app/services/producto-proveedor.service';
import { ProveedorResponse } from 'src/app/interfaces/responses/proveedor-response';
import { ProductoProveedorResponse } from 'src/app/interfaces/responses/producto-proveedor-response';
import { ProductoProveedorRequest } from 'src/app/interfaces/requests/producto-proveedor-request';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { CustomMessageBoxComponent, MessageBoxData } from '../../utils/messages/custom-message-box.component';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { AgregarUbicacionDialogComponent } from '../ubicaciones/dialogs/agregar-ubicacion-dialog.component';
import { UbicacionAreaResponse } from 'src/app/interfaces/responses/ubicacion-area-response';
import { UbicacionColumnaResponse } from 'src/app/interfaces/responses/ubicacion-columna-response';
import { UbicacionNivelResponse } from 'src/app/interfaces/responses/ubicacion-nivel-response';
import { UbicacionAreaService } from 'src/app/services/ubicacion-area.service';
import { UbicacionNivelService } from 'src/app/services/ubicacion-nivel.service';
import { UbicacionColumnaService } from 'src/app/services/ubicacion-columna.service';
import { PreviewConfig } from 'src/app/util/preview/file-preview.component';
import { ConfiguracionPDF, ProductoExtraTabs, ProductoPDF, ProductoPDFService } from 'src/app/reports/producto-pdf.service';
import { PreviewDialogService } from 'src/app/services/preview-dialog.service';


interface BodegaConfig {
  idLocal: number;
  nombreLocal: string;
  seleccionado: boolean;
  existenciaInicial: number;
  stockMin: number | null;
  stockMax: number | null;
  alertaStockBajo: boolean;
}
@Component({
  selector: 'app-productos-sic',
  templateUrl: './productos-sic.component.html',
  styleUrls: ['./productos-sic.component.css']
})
export class ProductosSicComponent implements OnInit, AfterViewInit {

  selectedTab = 0;
  idEstructura!: number;
  mostrarBuscador: boolean = false;
  paginaActual: number = 1;
  totalPaginas: number = 0;
  totalResultados: number = 0;
  cargandoBusqueda: boolean = false;
  proveedoresEnMemoria: any[] = [];
  proveedoresGridApi!: GridApi;
  columnDefsProveedores: any[] = [];
  defaultColDefProveedores: any = {};
  unidadesVenta: UnidadVentaResponse[] = [];
  tiposProducto = ['Bien', 'Servicio'];
  presentaciones: PresentacionResponse[] = [];
  clasesProducto = ['A', 'B', 'C'];
  esNuevoProducto: boolean = true;
  idProductoActual: number = 0;
  iva = 0;
  ivaVigente: Iva | null = null;
  tipoEstructura: string = 'grupo';
  terminoBusqueda: string = '';
  resultadosBusqueda: ProductoResponse[] = [];
  mostrarResultados: boolean = false;
  form!: FormGroup;
  adicionalForm!: FormGroup;
  preciosForm!: FormGroup;
  locales: LocalesResponse[] = [];
  bodegasConfig: BodegaConfig[] = [];
  filtroBodega: string = '';
  jerarquiaEstructura: any = null;
  modoEdicion: boolean = false; // Para saber si estamos editando
  mostrarSoloConExistencia: boolean = false; // Checkbox de filtro
  productoOriginal: any = null;
  estructuraProducto: any = null;
  cargandoEstructura: boolean = false;
  //Ubicaciones
  ubicaciones: ProductoUbicacionBodegaResponse[] = [];
  bodegaSeleccionadaUbicacion: number | null = null;
  areas: UbicacionAreaResponse[] = [];
  columnas: UbicacionColumnaResponse[] = [];
  niveles: UbicacionNivelResponse[] = [];
  mostrarPreview: boolean = false;
  cargandoPreview: boolean = false;
  previewConfig: PreviewConfig = {};
  private busquedaSubject$ = new Subject<string>();
  get descripcionProductoHeader(): string {
      if (this.esNuevoProducto && this.idEstructura > 0) {
        return 'Nuevo producto';
      }
      
      if (!this.esNuevoProducto && this.idProductoActual > 0) {
        const descripcion = this.form.get('descripcion1')?.value;
        return descripcion || 'Producto sin descripción';
      }
      
      if (this.mostrarBuscador) {
        return 'Buscar y editar productos';
      }
      
      return 'Descripción del producto';
    }

  //Catalogos
  colores: ColorResponse[] = [];
  sabores: SaborResponse[] = [];
  fabricantes: FabricanteResponse[] = [];
  //Proveedores 
  proveedores: ProveedorResponse[] = [];
  proveedoresProducto: ProductoProveedorResponse[] = [];
  proveedorSeleccionado: ProveedorResponse | null = null;

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    private productoService: ProductoService,
    private presentacionService: PresentacionService,
    private unidadVentaService: UnidadVentaService,
    private ivaService: IvaService,
    private route: ActivatedRoute,
    private localesService: LocalesService,
    private toastCampos: RequiredFieldsToastService,
    private bodegaService: BodegaService,
    private stocksService: StocksService,
    private colorService: ColorService,
    private saborService: SaborService,
    private fabricanteService: FabricanteService,
    private proveedorService: ProveedorService,
    private productoProveedorService: ProductoProveedorService,
    private productoUbicacionService: ProductoUbicacionBodegaService,
    private areaService: UbicacionAreaService,
    private nivelService: UbicacionNivelService,
    private columnaService: UbicacionColumnaService,
    private productoPDFService: ProductoPDFService,
    private previewDialogService: PreviewDialogService
  ) { }

  ngOnInit(): void {
    this.selectedTab = 0;
    this.cargarIvaVigente();
    this.cargarPresentacion();
    this.cargarLocales(); 
    this.cargarUnidadesVenta();
    this.cargarColores();
    this.cargarSabores();
    this.cargarFabricantes();
    this.cargarProveedores();
    this.cargarCatalogosUbicacion();

    // CREAR FORMULARIOS PRIMERO
    this.form = this.fb.group({
      descripcion: ['', [Validators.required, Validators.maxLength(500)]],
      codigoInterno: ['', Validators.required],
      descripcion1: ['', [Validators.required, Validators.maxLength(500)]],
      unidadVenta: [null, Validators.required],
      existenciaGlobal: [{ value: 0, disabled: true }],
      abreviacion: ['', Validators.required],

      pagaIva: [false],
      productoEnVenta: [false],
      cargarInventarios: [false],
      productoConPeso: [false],
      consumoInterno: [false],

      codigoBarras: ['', Validators.required],
      generarCodigo: [false],
      descripcionPOS: ['', Validators.required],
      cantidad: [null],
      canCov: [''],
      referencia: [''],
      manejaDecimales: [false],
      psicotropico: [false],
      estupefaciente: [false],
      activo: [true],
      altoRiesgo: [false],

      tipoProducto: [null],
      presentacion: [null, Validators.required],
      claseProducto: [null],
      urlFoto: [''],

      fechaCreacion: [null],
      fechaModificacion: [null],
    });

    this.adicionalForm = this.fb.group({
      color: [null],
      sabor: [null],
      fabricante: [null],
      tamanoTalla1: [''],
      medida1: [''],
      medida2: [''],
      medida3: [''],
      pasillo: [''],
      columna: [''],
      nivel: [''],
      tamanoTalla2: [''],
      observacion: [''],
      registroSanitario: [''],
      ctaVentas: [''],
      ctaInventarios: [''],
      ctaCostos: [''],
      ctaDevolucion: [''],
      productoGasto: [false],
      ctaGastos: [''],
    });

    this.preciosForm = this.fb.group({
      precioOficial: [0],
      precioRedMsp: [0],
      pvpActualIva: [0, [Validators.min(0)]],
      pvpAnteriorMasIva: [0],
      fechaAnteriorModificarPrecio: [null],
      pvpActualMasIva: [0],
      fechaModificarPrecio: [null],
      margenUtilidad: [0],

      costoSuministro: [0],
      costoProducto: [0],
      costoPromedio: [0],
      precioCompraAnterior: [0],
      fechaAnteriorModificarCompra: [null],
      precioCompraActual: [0],
      fechaModificarCompra: [null],
      recepcionPorcentaje: [0]
    });

    // CONFIGURAR LISTENERS (después de crear los forms)
    this.form.get('pagaIva')!.valueChanges.subscribe(() => {
      this.recalcularPvpConIva();
    });
        // ✅ Listener para el checkbox "Generar Código"
    this.form.get('generarCodigo')!.valueChanges.subscribe((generar: boolean) => {
      if (generar) {
        // Generar EAN-13 cuando se marca el checkbox
        this.generarCodigoEAN13();
      } else {
        // Restaurar código interno cuando se desmarca
        this.restaurarCodigoInterno();
      }
    });

    // ✅ Listener para copiar código interno a código de barras cuando cambie
    this.form.get('codigoInterno')!.valueChanges.subscribe((codigo) => {
      const generarChecked = this.form.get('generarCodigo')?.value;
      if (!generarChecked && codigo) {
        // Solo copiar si NO está generando código automático
        this.form.patchValue({ 
          codigoBarras: codigo 
        }, { emitEvent: false });
      }
    });
    this.preciosForm.get('pvpActualIva')!.valueChanges
      .subscribe(() => {
        this.recalcularPvpConIva();
      });

    this.preciosForm.get('pvpActualMasIva')!.valueChanges
      .subscribe(() => {
        const ctrl = this.preciosForm.get('pvpActualMasIva')!;
        if (ctrl.touched) {
          this.recalcularPvpSinIva();
        }
      });

    this.preciosForm.get('costoProducto')!.valueChanges
      .subscribe(() => this.recalcularMargen());
    this.preciosForm.get('costoPromedio')!.valueChanges
      .subscribe(() => this.recalcularMargen());
    this.preciosForm.get('precioCompraActual')!.valueChanges  
      .subscribe(() => this.recalcularMargen());

    this.configurarGridProveedores();

    // ✅ 3. LEER PARÁMETROS DE RUTA (al final)
    this.route.paramMap.subscribe(params => {
      console.log('🔍 === DEBUG PARÁMETROS ===');
      
      const idProducto = Number(params.get('idProducto') || params.get('id')) || 0;
      this.idEstructura = Number(params.get('idEstructura')) || 0;
      
      const jerarquiaStr = params.get('jerarquia');
      this.tipoEstructura = params.get('tipo') || 'grupo';
      
      if (jerarquiaStr) {
        try {
          this.jerarquiaEstructura = JSON.parse(jerarquiaStr);
          console.log('🏗️ Jerarquía recibida:', this.jerarquiaEstructura);
        } catch (error) {
          console.error('Error al parsear jerarquía:', error);
        }
      }
      
      this.modoEdicion = idProducto > 0;
      this.esNuevoProducto = idProducto === 0;
      
      console.log('🔍 === MODO DE OPERACIÓN ===');
      console.log('🔍 Modo edición:', this.modoEdicion);
      console.log('🔍 ID Producto final:', idProducto);
      console.log('🔍 Es nuevo producto:', this.esNuevoProducto);
      
      if (idProducto > 0) {
        // MODO EDICIÓN
        console.log('✅ Entrando en MODO EDICIÓN');
        this.idProductoActual = idProducto;
        
        this.cargarProducto(idProducto);
        this.cargarBodegasProducto(idProducto);
        this.cargarProveedoresProducto(idProducto);
      } else {
        // MODO CREACIÓN O BÚSQUEDA
        this.idProductoActual = 0;
        
        if (jerarquiaStr) {
          // ✅ CON ESTRUCTURA: Modo creación
          this.mostrarBuscador = false;
          this.cargarSiguienteId();
        } else {
          // ✅ SIN ESTRUCTURA: Solo búsqueda/edición
          this.mostrarBuscador = true;
          console.log('⚠️ Sin estructura comercial - Solo modo búsqueda/edición');
          
          // ✅ Cargar el primer producto por defecto
          this.cargarPrimerProducto();
        }
      }
    });
    this.busquedaSubject$
      .pipe(
        debounceTime(500), // Espera 500ms después de que el usuario deje de escribir
        distinctUntilChanged() // Solo busca si el valor cambió
      )
      .subscribe(termino => {
        this.ejecutarBusqueda(termino);
      });
  }
  cargarCatalogosUbicacion(): void {
    // Cargar áreas
    this.areaService.getAll(true).subscribe({
      next: (resp) => {
        if (resp.type === 'Success' && resp.data) {
          this.areas = resp.data;
        }
      },
      error: (err) => console.error('Error cargando áreas:', err)
    });

    // Cargar columnas
    this.columnaService.getAll(true).subscribe({
      next: (resp) => {
        if (resp.type === 'Success' && resp.data) {
          this.columnas = resp.data;
        }
      },
      error: (err) => console.error('Error cargando columnas:', err)
    });

    // Cargar niveles
    this.nivelService.getAll(true).subscribe({
      next: (resp) => {
        if (resp.type === 'Success' && resp.data) {
          this.niveles = resp.data;
        }
      },
      error: (err) => console.error('Error cargando niveles:', err)
    });
  }
  cargarColores(): void {
    this.colorService.getAll().subscribe({
      next: (resp) => {
        this.colores = resp.data || [];
        console.log('✅ Colores cargados:', this.colores.length);
      },
      error: (err) => {
        console.error('❌ Error al cargar colores:', err);
        alert('Error al cargar colores');
      }
    });
  }
  cargarPrimerProducto(): void {
    
    this.productoService.getPrimerProducto().subscribe({
      next: (resp) => {
        if (resp.type === 'SUCCESS' && resp.data) {
          const primerProducto = resp.data;
          console.log('✅ Primer producto cargado:', primerProducto.idproducto);
          
          // Cargar todo el producto
          this.idProductoActual = primerProducto.idproducto;
          this.modoEdicion = true;
          this.esNuevoProducto = false;
          
          this.cargarProducto(primerProducto.idproducto);
          this.cargarBodegasProducto(primerProducto.idproducto);
          this.cargarProveedoresProducto(primerProducto.idproducto);
        }
      },
      error: (err) => {
        console.error('❌ Error al cargar primer producto:', err);
        // No hacer nada, dejar el formulario vacío
      }
    });
  }
  cargarSabores(): void {
    this.saborService.getAll().subscribe({
      next: (resp) => {
        this.sabores = resp.data || [];
        console.log('✅ Sabores cargados:', this.sabores.length);
      },
      error: (err) => {
        console.error('❌ Error al cargar sabores:', err);
        alert('Error al cargar sabores');
      }
    });
  }

  cargarFabricantes(): void {
    this.fabricanteService.getAll().subscribe({
      next: (resp) => {
        this.fabricantes = resp.data || [];
        console.log('✅ Fabricantes cargados:', this.fabricantes.length);
      },
      error: (err) => {
        console.error('❌ Error al cargar fabricantes:', err);
        alert('Error al cargar fabricantes');
      }
    });
  }
  ngAfterViewInit(): void { this.cdr.detectChanges(); }
  
  get ubicacionesFiltradas(): any[] {
    let ubicaciones = this.ubicaciones.filter(u => !u._markedForDeletion);
    
    if (!this.bodegaSeleccionadaUbicacion) {
      return ubicaciones;
    }
    
    return ubicaciones.filter(u => u.idLocal === this.bodegaSeleccionadaUbicacion);
  }
  eliminarUbicacion(ubicacion: any): void {
    const nombreLocal = ubicacion.nombreLocal || 'esta ubicación';
    
    this.dialog.open(CustomMessageBoxComponent, {
      data: {
        title: '¿Eliminar Ubicación?',
        message: `¿Está seguro de eliminar la ubicación en ${nombreLocal}?`,
        type: 'warning',
        confirmText: 'Sí, eliminar',
        cancelText: 'Cancelar',
        showCancel: true
      } as MessageBoxData,
      width: '400px'
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;

      if (ubicacion._isNew) {
        // ✅ Si es nueva (no guardada), simplemente quitarla de la lista
        this.ubicaciones = this.ubicaciones.filter(u => u._tempId !== ubicacion._tempId);
        
        console.log('🗑️ Ubicación nueva eliminada de memoria');
      } else {
        // ✅ Si ya existe en BD, marcarla para eliminar
        ubicacion._markedForDeletion = true;
        
        console.log('🗑️ Ubicación marcada para eliminar al guardar');
      }
      
      // Mensaje de confirmación
      this.dialog.open(CustomMessageBoxComponent, {
        data: {
          title: 'Ubicación Eliminada',
          message: ubicacion._isNew 
            ? 'La ubicación fue removida de la lista' 
            : 'La ubicación se eliminará cuando haga clic en "Grabar"',
          type: 'success',
          showCancel: false
        } as MessageBoxData,
        width: '400px'
      });
    });
  }
  agregarUbicacion(): void {
    // PERMITIR agregar ubicaciones incluso en nuevo producto
    // if (this.esNuevoProducto) {
    //   this.dialog.open(CustomMessageBoxComponent, {
    //     data: {
    //       title: 'Producto no creado',
    //       message: '⚠️ Debe crear el producto primero antes de agregar ubicaciones',
    //       type: 'warning',
    //       showCancel: false
    //     } as MessageBoxData,
    //     width: '400px'
    //   });
    //   return;
    // }

    // Abrir diálogo (funciona para nuevo producto y edición)
    const dialogRef = this.dialog.open(AgregarUbicacionDialogComponent, {
      width: '600px',
      disableClose: true,
      data: {
        idProducto: this.idProductoActual || 0, // 0 si es nuevo
        locales: this.locales,
        nombreProducto: this.form.get('descripcion1')?.value || 'Nuevo producto'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // ✅ Agregar a memoria, NO guardar todavía
        this.agregarUbicacionEnMemoria(result);
      }
    });
  }
  private agregarUbicacionEnMemoria(request: any): void {
    console.log('🔍 Request recibido:', request);
    console.log('🔍 Catálogos disponibles:', {
      areas: this.areas.length,
      columnas: this.columnas.length,
      niveles: this.niveles.length
    });
    
    // Buscar nombres para mostrar en la tabla
    const local = this.locales.find(l => l.id === request.id_local);
    
    // ✅ BUSCAR CÓDIGOS REALES (no usar IDs directamente)
    const area = this.areas.find(a => a.idarea === request.idarea);
    const columna = this.columnas.find(c => c.idcolumna === request.idcolumna);
    const nivel = this.niveles.find(n => n.idnivel === request.idnivel);
    
    console.log('🔍 Búsqueda de códigos:', {
      areaEncontrada: area,
      columnaEncontrada: columna,
      nivelEncontrado: nivel
    });
    
    const nuevaUbicacion = {
      _tempId: `temp_${Date.now()}`,
      _isNew: true,
      _markedForDeletion: false, // ✅ IMPORTANTE: agregar esta propiedad
      idProducto: request.id_producto,
      idLocal: request.id_local,
      idArea: request.idarea,
      idColumna: request.idcolumna,
      idNivel: request.idnivel,
      nombreLocal: local?.nombre || '',
      // ✅ Usar códigos reales de los catálogos
      codigoArea: area?.codigo || '-',
      codigoColumna: columna?.codigo || '-',
      codigoNivel: nivel?.codigo || '-'
    };

    // ✅ AGREGAR SOLO A this.ubicaciones (eliminar ubicacionesEnMemoria)
    this.ubicaciones.push(nuevaUbicacion);
    
    console.log('📍 Ubicación agregada:', nuevaUbicacion);
    console.log('📍 Total ubicaciones:', this.ubicaciones.length);
    console.log('📍 Ubicaciones filtradas:', this.ubicacionesFiltradas.length);
    
    // ✅ FORZAR DETECCIÓN DE CAMBIOS
    this.cdr.detectChanges();
    
    // Mostrar mensaje de confirmación
    this.dialog.open(CustomMessageBoxComponent, {
      data: {
        title: 'Ubicación Agregada',
        message: 'La ubicación se guardará cuando haga clic en "Grabar"',
        type: 'info',
        showCancel: false
      } as MessageBoxData,
      width: '400px'
    });
  }

  private guardarUbicaciones(idProducto: number, loadingDialog?: MatDialogRef<CustomMessageBoxComponent>): void {
    console.log('📍 Guardando ubicaciones...');
    
    const nuevas = this.ubicaciones.filter(u => u._isNew && !u._markedForDeletion);
    const modificadas = this.ubicaciones.filter(u => u._modificado && !u._isNew && !u._markedForDeletion);
    const paraEliminar = this.ubicaciones.filter(u => u._markedForDeletion && u.idProductoUbicacion);
    
    let operacionesCompletadas = 0;
    const totalOperaciones = nuevas.length + paraEliminar.length + modificadas.length;
    
    console.log('📍 Total operaciones:', {
      nuevas: nuevas.length,
      paraEliminar: paraEliminar.length,
      modificadas: modificadas.length,
      total: totalOperaciones
    });
    
    // Si no hay nada que hacer
    if (totalOperaciones === 0) {
      console.log('📍 No hay ubicaciones para guardar/editar/eliminar');
      
      // Continuar con proveedores si hay
      if (this.proveedoresEnMemoria.length > 0) {
        if (loadingDialog) {
          loadingDialog.componentInstance.updateLoadingState(true, 'Guardando proveedores...');
        }
        this.guardarProveedores(idProducto, loadingDialog);
      } else {
        if (loadingDialog) {
          loadingDialog.close();
        }
        
        this.dialog.open(CustomMessageBoxComponent, {
          data: {
            title: '¡Completado!',
            message: 'Producto actualizado correctamente',
            type: 'success',
            showCancel: false
          } as MessageBoxData,
          width: '400px'
        });
        
        this.saving = false;
      }
      return;
    }
    
    // Función para verificar si terminamos
    const verificarFinalizacion = () => {
      operacionesCompletadas++;
      console.log(`📍 Operaciones completadas: ${operacionesCompletadas}/${totalOperaciones}`);
      
      if (operacionesCompletadas === totalOperaciones) {
        // ✅ RECARGAR ubicaciones desde el backend
        console.log('📍 Recargando ubicaciones desde el backend...');
        this.cargarUbicacionesProducto(idProducto);
        
        // ✅ Esperar un poco para que se complete la recarga
        setTimeout(() => {
          // Continuar con proveedores si hay
          if (this.proveedoresEnMemoria.length > 0) {
            if (loadingDialog) {
              loadingDialog.componentInstance.updateLoadingState(true, 'Guardando proveedores...');
            }
            this.guardarProveedores(idProducto, loadingDialog);
          } else {
            if (loadingDialog) {
              loadingDialog.close();
            }
            
            this.dialog.open(CustomMessageBoxComponent, {
              data: {
                title: '¡Completado!',
                message: 'Producto y ubicaciones guardados exitosamente',
                type: 'success',
                showCancel: false
              } as MessageBoxData,
              width: '400px'
            }).afterClosed().subscribe(() => {
              this.saving = false;
            });
          }
        }, 500); // Pequeño delay para asegurar que la recarga termine
      }
    };
    
    // ✅ GUARDAR NUEVAS UBICACIONES
    nuevas.forEach(ubicacion => {
      const request: ProductoUbicacionBodegaRequest = {
        id_producto: idProducto,
        id_local: ubicacion.idLocal,
        id_area: ubicacion.idArea || 0,
        id_columna: ubicacion.idColumna || 0,
        id_nivel: ubicacion.idNivel || 0
      };
      
      console.log('💾 Guardando ubicación:', request);
      
      this.productoUbicacionService.create(request).subscribe({
        next: (res) => {
          if (res.type === 'SUCCESS') {
            console.log('✅ Ubicación guardada:', ubicacion.nombreLocal);
          }
          verificarFinalizacion();
        },
        error: (err) => {
          console.error('❌ Error al guardar ubicación:', err);
          verificarFinalizacion();
        }
      });
    });
    
    modificadas.forEach(ubicacion => {
      const request: ProductoUbicacionBodegaRequest = {
        id_producto: idProducto,
        id_local: ubicacion.idLocal,
        id_area: ubicacion.idArea || 0,
        id_columna: ubicacion.idColumna || 0,
        id_nivel: ubicacion.idNivel || 0
      };
      
      this.productoUbicacionService.update(ubicacion.idProductoUbicacion!, request).subscribe({
        next: (res) => {
          if (res.type === 'SUCCESS') {
            console.log('✅ Ubicación actualizada:', ubicacion.nombreLocal);
          }
          verificarFinalizacion();
        },
        error: (err) => {
          console.error('❌ Error al actualizar ubicación:', err);
          verificarFinalizacion();
        }
      });
    });
    // ✅ ELIMINAR UBICACIONES MARCADAS
    paraEliminar.forEach(ubicacion => {
      this.productoUbicacionService.delete(ubicacion.idProductoUbicacion!).subscribe({
        next: (res) => {
          if (res.type === 'SUCCESS') {
            console.log('✅ Ubicación eliminada:', ubicacion.nombreLocal);
          }
          verificarFinalizacion();
        },
        error: (err) => {
          console.error('❌ Error al eliminar ubicación:', err);
          verificarFinalizacion();
        }
      });
    });
  }
  cargarUbicacionesPorBodega(): void {
    if (!this.bodegaSeleccionadaUbicacion) {
      // Si no hay bodega seleccionada, cargar todas
      this.cargarUbicacionesProducto(this.idProductoActual);
      return;
    }

    this.productoUbicacionService
      .getAll(this.idProductoActual, this.bodegaSeleccionadaUbicacion)
      .subscribe({
        next: (resp) => {
          if (resp.type === 'SUCCESS' && resp.data) {
            this.ubicaciones = resp.data;
          }
        },
        error: (err) => {
          console.error('❌ Error al filtrar ubicaciones:', err);
        }
      });
  }
  cargarUbicacionesProducto(idProducto: number): void {
    if (!idProducto || idProducto === 0) {
      this.ubicaciones = [];
      return;
    }

    this.productoUbicacionService.getByProductoId(idProducto).subscribe({
      next: (resp) => {
        if (resp.type === 'Success' && resp.data) {
          this.ubicaciones = resp.data.map(u => ({
            ...u,
            _isNew: false,
            _markedForDeletion: false
          }));
          
          console.log('✅ Ubicaciones cargadas:', this.ubicaciones.length);
        }
      },
      error: (err) => {
        console.error('❌ Error al cargar ubicaciones:', err);
        this.ubicaciones = [];
      }
    });
  }

  editarUbicacion(ubicacion: any): void {
    // Abrir el mismo diálogo pero con datos pre-cargados
    const dialogRef = this.dialog.open(AgregarUbicacionDialogComponent, {
      width: '600px',
      disableClose: true,
      data: {
        idProducto: this.idProductoActual,
        locales: this.locales,
        nombreProducto: this.form.get('descripcion1')?.value || 'Producto',
        // ✅ PASAR DATOS EXISTENTES PARA EDITAR
        ubicacionExistente: {
          idProductoUbicacion: ubicacion.idProductoUbicacion,
          id_local: ubicacion.idLocal,
          idarea: ubicacion.idArea,
          idcolumna: ubicacion.idColumna,
          idnivel: ubicacion.idNivel
        }
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Si es una ubicación existente (tiene idProductoUbicacion), actualizar
        if (result.idProductoUbicacion) {
          this.actualizarUbicacionEnMemoria(result);
        } else {
          this.agregarUbicacionEnMemoria(result);
        }
      }
    });
  }

  // ✅ NUEVO método para actualizar ubicación existente
  private actualizarUbicacionEnMemoria(result: any): void {
    console.log('🔍 Actualizando ubicación:', result);
    
    // Buscar la ubicación en el array
    const index = this.ubicaciones.findIndex(u => 
      u.idProductoUbicacion === result.idProductoUbicacion
    );
    
    if (index !== -1) {
      const local = this.locales.find(l => l.id === result.id_local);
      const area = this.areas.find(a => a.idarea === result.idarea);
      const columna = this.columnas.find(c => c.idcolumna === result.idcolumna);
      const nivel = this.niveles.find(n => n.idnivel === result.idnivel);
      
      // Actualizar la ubicación existente
      this.ubicaciones[index] = {
        ...this.ubicaciones[index],
        idLocal: result.id_local,
        idArea: result.idarea,
        idColumna: result.idcolumna,
        idNivel: result.idnivel,
        nombreLocal: local?.nombre || '',
        codigoArea: area?.codigo || '-',
        codigoColumna: columna?.codigo || '-',
        codigoNivel: nivel?.codigo || '-',
        _modificado: true // Marcar como modificado
      };
      
      console.log('✅ Ubicación actualizada en memoria');
      
      // Forzar detección de cambios
      this.cdr.detectChanges();
      
      this.dialog.open(CustomMessageBoxComponent, {
        data: {
          title: 'Ubicación Actualizada',
          message: 'Los cambios se guardarán cuando haga clic en "Grabar"',
          type: 'info',
          showCancel: false
        } as MessageBoxData,
        width: '400px'
      });
    }
  }

  isInvalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!c && c.invalid && (c.touched || c.dirty);
  }
  cargarIvaVigente(): void {
    this.ivaService.getVigentes().subscribe({
      next: (ivas) => {
        // Buscar el IVA principal y vigente
        this.ivaVigente = ivas.find(i => i.principal && i.esta_vigente) || ivas[0] || null;
        
        if (this.ivaVigente) {
          // Convertir porcentaje a decimal (15% → 0.15)
          this.iva = this.ivaVigente.porcentaje / 100;
          console.log('✅ IVA vigente cargado:', this.ivaVigente.porcentaje + '%', '→', this.iva);
        } else {
          console.warn('⚠️ No se encontró IVA vigente, usando 12% por defecto');
          this.iva = 0.12;
        }
      },
      error: (err) => {
        console.error('❌ Error al cargar IVA vigente:', err);
        this.iva = 0.12; // Fallback al 12%
        alert('No se pudo cargar el IVA vigente, usando 12% por defecto');
      }
    });
  }

  cargarBodegasProducto(idProducto: number): void {
    console.log('📦 Cargando bodegas del producto:', idProducto);
    
    this.productoService.getBodegasByProducto(idProducto).subscribe({
      next: (response) => {
        console.log('📦 Respuesta del backend:', response);
        
        if (response.data && response.data.length > 0) {
          // ✅ MAPEAR correctamente los datos del backend
          response.data.forEach(bodegaBackend => {
            // Buscar la bodega en bodegasConfig
            const bodegaExistente = this.bodegasConfig.find(
              b => b.idLocal === bodegaBackend.id_local
            );
            
            if (bodegaExistente) {
              // ✅ Actualizar datos existentes
              bodegaExistente.existenciaInicial = bodegaBackend.existencia || 0;
              bodegaExistente.stockMin = bodegaBackend.stock_min;
              bodegaExistente.stockMax = bodegaBackend.stock_max;
              
              // Marcar como seleccionada si tiene configuración
              bodegaExistente.seleccionado = true; // Tiene datos en BD
              
              // Verificar alerta de stock bajo
              bodegaExistente.alertaStockBajo = 
                !this.esNuevoProducto && //Solo si no es nuevo
                bodegaExistente.stockMin !== null && 
                bodegaExistente.existenciaInicial < bodegaExistente.stockMin;

              console.log('✅ Bodega actualizada:', {
                id: bodegaExistente.idLocal,
                nombre: bodegaExistente.nombreLocal,
                existencia: bodegaExistente.existenciaInicial,
                min: bodegaExistente.stockMin,
                max: bodegaExistente.stockMax
              });
            } else {
              // ⚠️ Si la bodega no existe en la lista, agregarla
              console.warn('⚠️ Bodega no encontrada en bodegasConfig:', bodegaBackend.id_local);
              this.bodegasConfig.push({
                idLocal: bodegaBackend.id_local,
                nombreLocal: bodegaBackend.nombre_local || `Bodega ${bodegaBackend.id_local}`,
                seleccionado: false,
                existenciaInicial: bodegaBackend.existencia || 0,
                stockMin: bodegaBackend.stock_min,
                stockMax: bodegaBackend.stock_max,
                alertaStockBajo: false
              });
            }
          });
          
          // ✅ Verificar alertas después de cargar
          this.verificarAlertasStock();
          
          console.log('✅ bodegasConfig final:', this.bodegasConfig);
          console.log('✅ Total bodegas:', this.bodegasConfig.length);
          
          // ✅ Forzar detección de cambios
          this.cdr.detectChanges();
          this.actualizarExistenciaGlobal();
        } else {
          console.warn('⚠️ No hay bodegas en la respuesta o respuesta vacía');
        }
      },
      error: (err) => {
        console.error('❌ Error al cargar bodegas:', err);
        alert('No se pudieron cargar las bodegas del producto');
      }
    });
  }
  cargarLocales(): void {
    this.localesService.getAll().subscribe({
      next: (resp) => {        
        this.locales = (resp.data || []).filter((l: LocalesResponse) => l.estado === true);
        
        // Inicializar configuración de bodegas
        this.bodegasConfig = this.locales.map((local: LocalesResponse) => ({
          idLocal: local.id, 
          nombreLocal: local.nombre || '', // Fallback para evitar undefined
          seleccionado: false,
          existenciaInicial: 0,
          stockMin: null,
          stockMax: null,
          alertaStockBajo: false
        }));
        this.actualizarExistenciaGlobal();
      },
      error: (err) => {
        console.error('Error al cargar locales:', err);
        alert('Error al cargar bodegas disponibles');
      }
    });
  }

    toggleSeleccionBodega(bodega: BodegaConfig): void {
    bodega.seleccionado = !bodega.seleccionado;
  }

  seleccionarTodasBodegas(seleccionar: boolean): void {
    this.bodegasConfig.forEach(b => b.seleccionado = seleccionar);
  }

  validarStocks(bodega: BodegaConfig): void {
    // ✅ Si ambos están vacíos, no hacer nada (es válido)
    if (bodega.stockMin === null && bodega.stockMax === null) {
      return;
    }
    
    // ✅ Si solo uno está configurado, también es válido
    if (bodega.stockMin === null || bodega.stockMax === null) {
      return;
    }
    
    // ✅ Si ambos están configurados, validar que min <= max
    if (bodega.stockMin > bodega.stockMax) {
      console.warn('⚠️ Stock mínimo mayor al máximo, ajustando...');
      bodega.stockMin = bodega.stockMax;
    }
  }

  verificarAlertasStock(): void {
    // 🚫 No validar alertas en productos nuevos
    if (this.esNuevoProducto) {
      this.bodegasConfig.forEach(b => {
        b.alertaStockBajo = false;
      });
      return;
    }

    // ✅ Solo validar en productos existentes
    this.bodegasConfig.forEach(b => {
      if (b.seleccionado && b.stockMin !== null) {
        b.alertaStockBajo = b.existenciaInicial < b.stockMin;
      }
    });
  }

  get bodegasSeleccionadas(): BodegaConfig[] {
    return this.bodegasConfig.filter(b => b.seleccionado);
  }

  get bodegasFiltradas(): BodegaConfig[] {
    let bodegas = this.bodegasConfig;
    
    // Filtro por búsqueda
    if (this.filtroBodega.trim()) {
      const filtro = this.filtroBodega.toLowerCase();
      bodegas = bodegas.filter(b => 
        b.nombreLocal.toLowerCase().includes(filtro)
      );
    }
    
    // Filtro por existencias
    if (this.mostrarSoloConExistencia) {
      bodegas = bodegas.filter(b => b.existenciaInicial > 0);
    }
    
    return bodegas;
  }
  get existenciaGlobalCalculada(): number {
    return this.bodegasConfig.reduce((total, bodega) => {
      return total + (bodega.existenciaInicial || 0);
    }, 0);
  }
  private actualizarExistenciaGlobal(): void {
    const total = this.existenciaGlobalCalculada;
    this.form.patchValue({ existenciaGlobal: total }, { emitEvent: false });
  }
  // Método para verificar si se puede editar stocks
  puedeEditarStocks(bodega: BodegaConfig): boolean {
      return this.esNuevoProducto || this.modoEdicion;
  }
  
  cargarPresentacion(): void {
    this.presentacionService.getPresentacion().subscribe({
      next: (resp) => {
        this.presentaciones = resp.data;
      },
      error: () => {
        alert('Error al cargar presentaciones');
      }
    })
  }
  cargarSiguienteId(): void {
    this.productoService.getSiguienteId().subscribe({
      next: (resp) => {
        if (resp.type === 'SUCCESS' && resp.data) {
          this.form.patchValue({
            codigoInterno: resp.data.siguienteId.toString()
          });
          
          console.log('✅ Siguiente código interno:', resp.data.siguienteId);
          console.log('✅ idProductoActual sigue en:', this.idProductoActual); // Debe ser 0
        }
      },
      error: (err) => {
        console.error('Error al obtener siguiente ID:', err);
        alert('No se pudo obtener el código del producto');
      }
    });
  }
  cargarUnidadesVenta(): void {
    this.unidadVentaService.getUnidadVenta().subscribe({
      next: (resp) => {
        this.unidadesVenta = resp.data;
        this.configurarGridProveedores();
      },
      error: () => {
        alert('Error al cargar unidades de venta')
      }
    })
  }

  get currentForm(): FormGroup | null {
    switch (this.selectedTab) {
      case 0: return this.form;
      case 1: return this.adicionalForm;
      case 2: return this.preciosForm;
      default: return null;
    }
  }
  get currentFormInvalid(): boolean { return !(this.currentForm && this.currentForm.valid); }

  private fix(n: number, d = 3): number {
    return Number((Math.round(n * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d));
  }

  onNumericInput(controlName: string): void {
    const ctrl = this.preciosForm.get(controlName);
    if (!ctrl) return;
    let val = (ctrl.value ?? '').toString();

    val = val.replace(',', '.').replace(/[^0-9.]/g, '');
    val = val.replace(/(\..*)\./g, '$1');

    ctrl.setValue(val, { emitEvent: false });
  }

  formatDecimal(controlName: string, dec = 3): void {
    const ctrl = this.preciosForm.get(controlName);
    if (!ctrl) return;

    const raw = (ctrl.value ?? '').toString().replace(',', '.');
    const n = parseFloat(raw);
    ctrl.setValue(this.fix(isFinite(n) ? n : 0, dec), { emitEvent: true });
  }

  recalcularPvpConIva(): void {
    const base = Number(this.preciosForm.getRawValue().pvpActualIva) || 0;
    const pagaIva = this.form.get('pagaIva')?.value ?? false;

    const conIva = pagaIva 
      ? this.fix(base * (1 + this.iva), 3) 
      : base; 
    
    const ctrlPvpConIva = this.preciosForm.get('pvpActualMasIva')!;
    const ctrlPvpAntIva = this.preciosForm.get('pvpAnteriorMasIva')!;

    // ✅ Actualizar sin emitir evento
    ctrlPvpConIva.setValue(conIva, { emitEvent: false });
    
    if (!ctrlPvpAntIva.dirty) {
      const anterior = Number(ctrlPvpAntIva.value) || 0;
      if (anterior <= 0) {
        ctrlPvpAntIva.setValue(conIva, { emitEvent: false });
      }
    }
    
    this.recalcularMargen();
  }

  recalcularPvpSinIva(): void {
    const conIva = Number(this.preciosForm.getRawValue().pvpActualMasIva) || 0;
    const pagaIva = this.form.get('pagaIva')?.value ?? false;

    const sinIva = pagaIva 
      ? this.fix(conIva / (1 + this.iva), 3)
      : conIva; 

    const ctrlPvpSinIva = this.preciosForm.get('pvpActualIva')!;
    
    // ✅ Actualizar sin emitir evento
    ctrlPvpSinIva.setValue(sinIva, { emitEvent: false });
    
    this.recalcularMargen();
  }

  recalcularMargen(): void {
    const pvpConIva = Number(this.preciosForm.getRawValue().pvpActualMasIva) || 0;
    const costoCompra = Number(this.preciosForm.getRawValue().precioCompraActual) || 0;
    const margen = pvpConIva > 0 ? ((pvpConIva - costoCompra) / pvpConIva) * 100 : 0;

    const ctrlMargen = this.preciosForm.get('margenUtilidad')!;
    ctrlMargen.setValue(this.fix(margen, 3), { emitEvent: false });
  }

  onNuevo(): void {
    switch (this.selectedTab) {
      case 0:
        this.form.reset({ activo: true });
        break;
      case 1:
        this.adicionalForm.reset({ productoGasto: false });
        break;
      case 2:
        const hoy = null;
        this.preciosForm.reset({
          precioOficial: 0,
          precioRedMsp: 0,
          pvpActualIva: 0,
          pvpAnteriorMasIva: 0,
          fechaAnteriorModificarPrecio: hoy,
          pvpActualMasIva: 0,
          fechaModificarPrecio: hoy,
          margenUtilidad: 0,
          costoSuministro: 0,
          costoProducto: 0,
          costoPromedio: 0,
          precioCompraAnterior: 0,
          fechaAnteriorModificarCompra: hoy,
          precioCompraActual: 0,
          fechaModificarCompra: hoy,
          recepcionPorcentaje: 0
        });
        break;
    }
  }

  saving = false;

  private buildCreatePERequest(): CreateProductoConEstructuraRequest {
    const f1 = this.form.getRawValue();
    const f2 = this.adicionalForm.value;
    const f3 = this.preciosForm.getRawValue();
    
    let clasprod = f1.claseProducto;
    if (!clasprod) {
      clasprod = f1.tipoProducto === 'Bien' ? 'B' : (f1.tipoProducto === 'Servicio' ? 'S' : 'B');
    }
    
    const producto = sanitizeProductoPayload({
      despro: f1.descripcion1,
      despro2: f1.descripcionPOS,
      codbar: f1.codigoBarras,
      tippro: f1.tipoProducto === 'Bien' ? 'B' : (f1.tipoProducto === 'Servicio' ? 'S' : ''),
      uniman: this.unidadesVenta.find(u => u.idUnidadVenta === f1.unidadVenta)?.descripcion || '',
      abrevia: f1.abreviacion,
      referencia: f1.referencia,
      activo: f1.activo,
      pagaiva: f1.pagaIva,
      inv: f1.cargarInventarios,
      peso: f1.productoConPeso,
      pgasto: f2?.productoGasto ?? false,
      altoriesgo: f1.altoRiesgo,
      clasprod: clasprod, 
      foto: f1.urlFoto,
      idempresa: 1,
      feccre: f1.fechaCreacion,
      fechamod: f1.fechaModificacion,
      exiqty: f1.existenciaGlobal || 0,
      // ✅ AGREGAR CAMPOS NUEVOS DEL TAB 1
      cantidad: f1.cantidad,
      productoventa: f1.productoEnVenta,
      consumointerno: f1.consumoInterno,
      psicotropico: f1.psicotropico,
      estupefaciente: f1.estupefaciente,
      cantconv: f1.canCov || 0,
      cantdecimal: f1.manejaDecimales,
      
      // ✅ AGREGAR NUEVAS FK DEL TAB 2
      idcolor: f2?.color || null,
      idsabor: f2?.sabor || null,
      idfabricante: f2?.fabricante || null,
      idpresentacion: f1.presentacion || null,
      
      // TAB 2: Campos existentes
      colsab: '', // Ya no se usa, ahora es idcolor/idsabor
      talla: f2.tamanoTalla1,
      espesor: Number(f2.medida1) || 0.0,
      largo: Number(f2.medida2) || 0.0,
      ancho: Number(f2.medida3) || 0.0,
      obs: f2.observacion,
      regsanitario: f2.registroSanitario,
      codcuedeb: f2.ctaVentas,
      codcuehab: f2.ctaInventarios,
      codcuedes: f2.ctaCostos,
      codcuedev: f2.ctaDevolucion,
      ctaprodgasto: f2.ctaGastos,
      
      // TAB 3: Precios y costos
      preven2: f3.precioOficial,        
      prepormayor: f3.precioRedMsp,        
      preven: f3.pvpActualMasIva,          
      prevensiniva: f3.pvpActualIva,
      preanterior: 0,
      feccosact: null,
      fecpremod: new Date().toISOString(),
      margenutilidad: f3.margenUtilidad,
      costsuminis: f3.costoSuministro,
      cospro: f3.costoProducto,
      precos: f3.costoPromedio,
      cosanterior: 0,
      fecpreact: null,
      preuni: f3.precioCompraActual?.toString(),
      feccosmod: new Date().toISOString(), 
      // feccosmod: f3.fechaModificarCompra,
      porcenrecepcion: f3.recepcionPorcentaje,
      
      // ✅ AGREGAR CAMPOS HISTÓRICOS DEL TAB 3
      margenantes: 0,
      fecmarantes: null,
    });

    const estructura: ProductoEstructuraComercialRequest = {
      iddivision: this.jerarquiaEstructura?.iddivision ?? null,
      idsubdivision: this.jerarquiaEstructura?.idsubdivision ?? null,
      iddepartamento: this.jerarquiaEstructura?.iddepartamento ?? null,
      idseccion: this.jerarquiaEstructura?.idseccion ?? null,
      idgrupo: this.jerarquiaEstructura?.idgrupo ?? null
    };

    const bodegasConStockConfigurado = this.bodegasConfig.filter(b => 
      b.stockMin !== null || b.stockMax !== null
    );

    let stocks = null;

    if (bodegasConStockConfigurado.length > 0) {
      stocks = bodegasConStockConfigurado.map(bodega => ({
        idlocal: bodega.idLocal,
        stockmin: bodega.stockMin,
        stockmax: bodega.stockMax,
        cantidad: bodega.existenciaInicial // Siempre 0 en creación
      }));
      
      console.log('📦 Stocks configurados a enviar:', stocks.length);
      console.log('📦 Detalle de stocks:', stocks);
    } else {
      console.log('📦 No hay stocks configurados, se enviará null');
    }
    return {
      Producto: producto,
      Estructura: estructura,
      Stocks: stocks
    };
  }
  
  private buildUpdateRequest(): any {
    const f1 = this.form.getRawValue();
    const f2 = this.adicionalForm.value;
    const f3 = this.preciosForm.getRawValue();
    
    let clasprod = f1.claseProducto;
    if (!clasprod) {
      clasprod = f1.tipoProducto === 'Bien' ? 'B' : (f1.tipoProducto === 'Servicio' ? 'S' : 'B');
    }
    
    // ✅ NORMALIZAR VALORES para comparación precisa (2 decimales)
    const normalizarPrecio = (valor: any): number => {
      return parseFloat((Number(valor) || 0).toFixed(2));
    };

    // ✅ VALORES ACTUALES (del formulario)
    const pvpSinIvaActual = normalizarPrecio(f3.pvpActualIva);
    const pvpConIvaActual = normalizarPrecio(f3.pvpActualMasIva);
    const precioCompraActual = normalizarPrecio(f3.precioCompraActual);
    const margenActual = normalizarPrecio(f3.margenUtilidad);

    // ✅ VALORES ORIGINALES (de la BD)
    const pvpSinIvaOriginal = normalizarPrecio(this.productoOriginal?.prevensiniva);
    const pvpConIvaOriginal = normalizarPrecio(this.productoOriginal?.preven);
    const precioCompraOriginal = normalizarPrecio(this.productoOriginal?.preuni);
    const margenOriginal = normalizarPrecio(this.productoOriginal?.margenutilidad);

    // ✅ DETECTAR CAMBIOS REALES
    const pvpCambio = pvpSinIvaActual !== pvpSinIvaOriginal;
    const precioCompraCambio = precioCompraActual !== precioCompraOriginal;
    const margenCambio = margenActual !== margenOriginal;

    // 🔍 DEBUG
    console.log('🔍 ========== VALIDACIÓN DE CAMBIOS ==========');
    console.log('📊 PVP Sin IVA:', { actual: pvpSinIvaActual, original: pvpSinIvaOriginal, cambio: pvpCambio });
    console.log('📊 PVP Con IVA:', { actual: pvpConIvaActual, original: pvpConIvaOriginal });
    console.log('📊 Precio Compra:', { actual: precioCompraActual, original: precioCompraOriginal, cambio: precioCompraCambio });
    console.log('📊 Margen:', { actual: margenActual, original: margenOriginal, cambio: margenCambio });
    
    const producto = {
      ...this.productoOriginal,
      
      // TAB 1: DATOS GENERALES (sin cambios)
      codpro: String(f1.codigoInterno || ''),
      despro: f1.descripcion1 || '',
      despro2: f1.descripcionPOS || '',
      codbar: String(f1.codigoBarras || ''),
      tippro: f1.tipoProducto === 'Bien' ? 'B' : (f1.tipoProducto === 'Servicio' ? 'S' : ''),
      uniman: this.unidadesVenta.find(u => u.idUnidadVenta === f1.unidadVenta)?.descripcion || '',
      abrevia: f1.abreviacion || '',
      referencia: f1.referencia || '',
      activo: f1.activo ?? true,
      pagaiva: f1.pagaIva ?? false,
      inv: f1.cargarInventarios ?? false,
      peso: f1.productoConPeso ?? false,
      altoriesgo: f1.altoRiesgo ?? false,
      cantdecimal: f1.manejaDecimales ?? false,
      clasprod: clasprod,
      foto: f1.urlFoto || '',
      fechamod: new Date().toISOString(),
      exiqty: f1.existenciaGlobal || 0, 
      cantidad: f1.cantidad || 0,
      productoventa: f1.productoEnVenta ?? false,
      consumointerno: f1.consumoInterno ?? false,
      psicotropico: f1.psicotropico ?? false,
      estupefaciente: f1.estupefaciente ?? false,
      cantconv: f1.canCov || 0,
      
      idcolor: f2?.color || null,
      idsabor: f2?.sabor || null,
      idfabricante: f2?.fabricante || null,
      idpresentacion: f1.presentacion || null,
      
      // TAB 2: ADICIONALES
      colsab: '',
      talla: f2?.tamanoTalla1 || '',
      espesor: Number(f2?.medida1) || null,
      largo: Number(f2?.medida2) || null,
      ancho: Number(f2?.medida3) || null,
      obs: f2?.observacion || '',
      regsanitario: f2?.registroSanitario || '',
      codcuedeb: f2?.ctaVentas || '',
      codcuehab: f2?.ctaInventarios || '',
      codcuedes: f2?.ctaCostos || '',
      codcuedev: f2?.ctaDevolucion || '',
      pgasto: f2?.productoGasto ?? false,
      ctaprodgasto: f2?.ctaGastos || '',
      
      // ✅ TAB 3: PRECIOS - Solo actualizar historial si HAY CAMBIO REAL
      preven2: Number(f3.precioOficial) || 0,        
      prepormayor: Number(f3.precioRedMsp) || 0,     
      
      // PVP Con IVA (siempre el actual)
      preven: pvpConIvaActual,
      
      // PVP Sin IVA (siempre el actual)
      prevensiniva: pvpSinIvaActual,
      
      // ✅ HISTORIAL DE PVP: Solo si cambió
      preanterior: pvpCambio 
        ? pvpConIvaOriginal  // El anterior precio CON iva se convierte en histórico
        : (this.productoOriginal.preanterior || 0), // Mantener el histórico existente
      
      feccosact: pvpCambio 
        ? (this.productoOriginal.fecpremod || new Date().toISOString()) // La fecha actual se vuelve anterior
        : (this.productoOriginal.feccosact || null), // Mantener fecha anterior existente
      
      fecpremod: pvpCambio 
        ? new Date().toISOString() // Nueva fecha de modificación
        : (this.productoOriginal.fecpremod || null), // Mantener fecha existente
      
      // ✅ MARGEN: Solo si cambió
      margenutilidad: margenActual,
      
      margenantes: margenCambio
        ? margenOriginal
        : (this.productoOriginal.margenantes || null),
      
      fecmarantes: margenCambio
        ? new Date().toISOString()
        : (this.productoOriginal.fecmarantes || null),
      
      // ✅ TAB 3: COSTOS
      costsuminis: Number(f3.costoSuministro) || 0,
      cospro: Number(f3.costoProducto) || 0,
      precos: Number(f3.costoPromedio) || 0,
      preuni: String(precioCompraActual),
      porcenrecepcion: Number(f3.recepcionPorcentaje) || 0,
      
      // ✅ HISTORIAL DE PRECIO DE COMPRA: Solo si cambió
      cosanterior: precioCompraCambio
        ? precioCompraOriginal
        : (Number(this.productoOriginal.cosanterior) || 0),
      
      fecpreact: precioCompraCambio
        ? (this.productoOriginal.feccosmod || new Date().toISOString())
        : (this.productoOriginal.fecpreact || null),
      
      feccosmod: precioCompraCambio
        ? new Date().toISOString()
        : (this.productoOriginal.feccosmod || null)
    };

    // 🔍 DEBUG FINAL
    console.log('📦 HISTORIAL DE PRECIOS que se enviará:', {
      // PVP
      pvpCambio: pvpCambio,
      preven: producto.preven,
      prevensiniva: producto.prevensiniva,
      preanterior: producto.preanterior,
      feccosact: producto.feccosact,
      fecpremod: producto.fecpremod,
      // COMPRA
      precioCompraCambio: precioCompraCambio,
      preuni: producto.preuni,
      cosanterior: producto.cosanterior,
      fecpreact: producto.fecpreact,
      feccosmod: producto.feccosmod,
      // MARGEN
      margenCambio: margenCambio,
      margenutilidad: producto.margenutilidad,
      margenantes: producto.margenantes,
      fecmarantes: producto.fecmarantes
    });
    console.log('🔍 ========== FIN VALIDACIÓN ==========');

    const sanitized = sanitizeProductoPayload(producto);
    return sanitized;
  }

  onBuscarProducto(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    this.terminoBusqueda = input.value.trim();
    
    if (this.terminoBusqueda.length < 2) {
      this.resultadosBusqueda = [];
      this.mostrarResultados = false;
      return;
    }

    // Emitir al Subject en lugar de buscar directamente
    this.busquedaSubject$.next(this.terminoBusqueda);
  }
  private ejecutarBusqueda(termino: string): void {
    if (termino.length < 2) return;
    
    this.cargandoBusqueda = true;

    this.productoService.buscarProductosGlobal(termino).subscribe({
      next: (resp) => {
        if (resp.type === 'SUCCESS' && resp.data) {
          this.resultadosBusqueda = resp.data.items || resp.data;
          this.mostrarResultados = true;
        }
        this.cargandoBusqueda = false;
      },
      error: (err) => {
        console.error('Error en búsqueda global:', err);
        this.resultadosBusqueda = [];
        this.mostrarResultados = false;
        this.cargandoBusqueda = false;
      }
    });
  }

  // ✅ NUEVO método para limpiar búsqueda de productos
  limpiarBusquedaProducto(): void {
    this.terminoBusqueda = '';
    this.resultadosBusqueda = [];
    this.mostrarResultados = false;
  }

  // ✅ NUEVO método para limpiar filtro de bodega
  limpiarFiltroBodega(): void {
    this.filtroBodega = '';
  }
  ngOnDestroy(): void {
    // ✅ Limpiar subscripción
    this.busquedaSubject$.complete();
  }
  seleccionarProducto(producto: ProductoResponse): void {
    this.mostrarResultados = false;
    const idProducto = producto.idproducto ?? producto.id_producto;
    
    if (idProducto) {
      this.idProductoActual = idProducto;
      this.modoEdicion = true;
      this.esNuevoProducto = false;
      
      console.log('📦 Cargando producto completo:', idProducto);
      
      // Carga todo para poder editarlo
      this.cargarProducto(idProducto);
      this.cargarBodegasProducto(idProducto);
      this.cargarProveedoresProducto(idProducto);
    }
  }
  cargarProductoCompleto(idProducto: number): void {
    this.productoService.getById(idProducto).subscribe({
      next: (res) => {
        if (!res?.data) return;
        const prod = res.data;

        // ✅ Tab 1: datos generales
        this.form.patchValue({
          codigoInterno: prod.codpro,
          descripcion1: prod.despro,
          descripcionPOS: prod.despro2,
          codigoBarras: prod.codbar,
          tipoProducto: prod.tippro === 'B' ? 'Bien' : (prod.tippro === 'S' ? 'Servicio' : null),
          unidadVenta: this.unidadesVenta.find(u => u.descripcion === prod.uniman)?.idUnidadVenta || null,
          abreviacion: prod.abrevia,
          referencia: prod.referencia,
          activo: prod.activo,
          pagaIva: prod.pagaiva,
          cargarInventarios: prod.inv,
          productoConPeso: prod.peso,
          altoRiesgo: prod.altoriesgo,
          claseProducto: prod.clasprod,
          urlFoto: prod.foto,
          fechaCreacion: prod.feccre ? prod.feccre.substring(0, 10) : null,
          fechaModificacion: prod.fechamod ? prod.fechamod.substring(0, 10) : null,
        });

        // ✅ Tab 2: adicionales
        this.adicionalForm.patchValue({
          color: prod.colsab,
          tamanoTalla1: prod.talla,
          observacion: prod.obs,
          registroSanitario: prod.regsanitario,
          ctaVentas: prod.codcuedeb,
          ctaInventarios: prod.codcuehab,
          ctaCostos: prod.codcuedes,
          ctaDevolucion: prod.codcuedev,
          productoGasto: prod.pgasto,
          ctaGastos: prod.ctaprodgasto,
        });

        // ✅ Tab 3: precios / costos
        this.preciosForm.patchValue({
          precioOficial: prod.preven,
          precioRedMsp: prod.preven2,
          pvpActualIva: prod.pvpsiniva,
          pvpAnteriorMasIva: prod.preanterior,
          fechaAnteriorModificarPrecio: prod.feccosact ? this.formatearFecha(prod.feccosact) : null, // ✅ AGREGAR formateo
          fechaModificarPrecio: prod.fecpremod ? this.formatearFecha(prod.fecpremod) : null, // ✅ AGREGAR formateo
          margenUtilidad: prod.margenutilidad,
          costoSuministro: prod.costsuminis,
          costoProducto: prod.cospro,
          costoPromedio: prod.precos,
          precioCompraAnterior: prod.cosanterior,
          fechaAnteriorModificarCompra: prod.fecpreact ? this.formatearFecha(prod.fecpreact) : null, // ✅ AGREGAR formateo
          precioCompraActual: prod.preuni,
          fechaModificarCompra: prod.feccosmod ? this.formatearFecha(prod.feccosmod) : null, // ✅ AGREGAR (estaba faltando)
          recepcionPorcentaje: prod.porcenrecepcion
        });
      },
      error: (err) => console.error('❌ Error cargando producto', err)
    });
  }

  onGrabar(): void {
    const controles = this.form.controls;
    const camposFaltantes: string[] = [];
    
    if (!controles['descripcion1'].value?.trim()) {
      camposFaltantes.push('Descripción');
      controles['descripcion1'].markAsTouched();
    }
    if (!controles['unidadVenta'].value) {
      camposFaltantes.push('Unidad de Venta');
      controles['unidadVenta'].markAsTouched();
    }
    if (!controles['abreviacion'].value?.trim()) {
      camposFaltantes.push('Abreviación');
      controles['abreviacion'].markAsTouched();
    }
    if (!controles['descripcionPOS'].value?.trim()) {
      camposFaltantes.push('Descripción POS');
      controles['descripcionPOS'].markAsTouched();
    }
    if (!controles['presentacion'].value) {
      camposFaltantes.push('Presentación');
      controles['presentacion'].markAsTouched();
    }
    if (!controles['codigoInterno'].value) {
      camposFaltantes.push('Código Interno');
      controles['codigoInterno'].markAsTouched();
    }
    if (!controles['codigoBarras'].value) {
      camposFaltantes.push('Código de Barras');
      controles['codigoBarras'].markAsTouched();
    }

    if (camposFaltantes.length > 0) {
      this.toastCampos.mostrar(camposFaltantes);
      return;
    }
    
    if (this.selectedTab === 0 && this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.selectedTab === 1 && this.adicionalForm.invalid) {
      this.adicionalForm.markAllAsTouched();
      return;
    }
    if (this.selectedTab === 2 && this.preciosForm.invalid) {
      this.preciosForm.markAllAsTouched();
      return;
    }
    
    this.saving = true;

    if (this.esNuevoProducto) {
      // ========== CREAR NUEVO PRODUCTO ==========
      const confirmDialog = this.dialog.open(CustomMessageBoxComponent, {
        data: {
          title: '¿Crear Producto?',
          message: '¿Está seguro de crear este nuevo producto?',
          type: 'info',
          confirmText: 'Sí, crear',
          cancelText: 'Cancelar',
          showCancel: true
        } as MessageBoxData,
        width: '400px'
      });

      confirmDialog.afterClosed().subscribe(confirmed => {
        if (!confirmed) {
          this.saving = false;
          return;
        }

        const loadingDialog = this.dialog.open(CustomMessageBoxComponent, {
          data: {
            title: 'Creando Producto',
            message: 'Por favor espere...',
            isLoading: true,
            loadingText: 'Guardando información...'
          } as MessageBoxData,
          disableClose: true,
          width: '400px'
        });

        const request = this.buildCreatePERequest();
        
        this.productoService.createConEstructura(request).subscribe({
          next: (res) => {
            console.log('✅ Respuesta del servidor:', res);
            
            if (res?.type?.toUpperCase() === 'SUCCESS') {
              const idProductoCreado = res.data;
              // Asignar el ID para usar en actualizarStocks
              this.idProductoActual = idProductoCreado;
              
              // Actualizar stocks PRIMERO
              const tieneStocksConfigurados = this.bodegasConfig.some(
                b => b.stockMin !== null || b.stockMax !== null
              );
              
              if (tieneStocksConfigurados) {
                loadingDialog.componentInstance.updateLoadingState(true, 'Guardando stocks...');
                this.actualizarStocks();
              }
              // ✅ Verificar ubicaciones nuevas
              const tieneUbicacionesNuevas = this.ubicaciones.some(u => u._isNew);
              
              // ✅ FLUJO: Ubicaciones → Proveedores → Éxito
              if (tieneUbicacionesNuevas) {
                loadingDialog.componentInstance.updateLoadingState(true, 'Guardando ubicaciones...');
                this.guardarUbicaciones(idProductoCreado, loadingDialog);
              } else if (this.proveedoresEnMemoria.length > 0) {
                loadingDialog.componentInstance.updateLoadingState(true, 'Guardando proveedores...');
                this.guardarProveedores(idProductoCreado, loadingDialog);
              } else {
                loadingDialog.close();
                
                this.dialog.open(CustomMessageBoxComponent, {
                  data: {
                    title: '¡Éxito!',
                    message: 'Producto creado correctamente',
                    type: 'success',
                    showCancel: false
                  } as MessageBoxData,
                  width: '400px'
                }).afterClosed().subscribe(() => {
                  history.back();
                });
              }
            } else {
              loadingDialog.close();
              this.dialog.open(CustomMessageBoxComponent, {
                data: {
                  title: 'Error',
                  message: 'Error al crear: ' + (res?.message || 'Error desconocido'),
                  type: 'error',
                  showCancel: false
                } as MessageBoxData,
                width: '400px'
              });
              this.saving = false;
            }
          },
          error: (err) => {
            console.error('❌ Error HTTP:', err);
            loadingDialog.close();
            
            this.dialog.open(CustomMessageBoxComponent, {
              data: {
                title: 'Error de Conexión',
                message: 'Error al crear producto: ' + (err.error?.message || err.message),
                type: 'error',
                showCancel: false
              } as MessageBoxData,
              width: '400px'
            });
            
            this.saving = false;
          }
        });
      });
      
    } else {
      // ========== ACTUALIZAR PRODUCTO EXISTENTE ==========
      const confirmDialog = this.dialog.open(CustomMessageBoxComponent, {
        data: {
          title: '¿Guardar Cambios?',
          message: '¿Está seguro de actualizar este producto?',
          type: 'warning',
          confirmText: 'Sí, actualizar',
          cancelText: 'Cancelar',
          showCancel: true
        } as MessageBoxData,
        width: '400px'
      });

      confirmDialog.afterClosed().subscribe(confirmed => {
        if (!confirmed) {
          this.saving = false;
          return;
        }

        const loadingDialog = this.dialog.open(CustomMessageBoxComponent, {
          data: {
            title: 'Actualizando Producto',
            message: 'Por favor espere...',
            isLoading: true,
            loadingText: 'Guardando cambios...'
          } as MessageBoxData,
          disableClose: true,
          width: '400px'
        });

        const request = this.buildUpdateRequest();
        
        this.productoService.update(this.idProductoActual, request).subscribe({
          next: (res) => {
            if (res?.type?.toUpperCase() === 'SUCCESS') {
              console.log('✅ Producto actualizado correctamente');
              
              // ✅ FLUJO: Stocks → Ubicaciones → Proveedores → Éxito
              loadingDialog.componentInstance.updateLoadingState(true, 'Actualizando stocks...');
              this.actualizarStocks();
              
              // ✅ AGREGAR: Verificar también ubicaciones MODIFICADAS
              const tieneUbicacionesNuevas = this.ubicaciones.some(u => u._isNew);
              const tieneUbicacionesModificadas = this.ubicaciones.some(u => u._modificado);
              const tieneUbicacionesEliminadas = this.ubicaciones.some(u => u._markedForDeletion);
              
              console.log('🔍 Verificación de ubicaciones:', {
                nuevas: tieneUbicacionesNuevas,
                modificadas: tieneUbicacionesModificadas,
                eliminadas: tieneUbicacionesEliminadas
              });
              
              if (tieneUbicacionesNuevas || tieneUbicacionesModificadas || tieneUbicacionesEliminadas) {
                loadingDialog.componentInstance.updateLoadingState(true, 'Guardando ubicaciones...');
                this.guardarUbicaciones(this.idProductoActual, loadingDialog);
              } else if (this.proveedoresEnMemoria.length > 0) {
                loadingDialog.componentInstance.updateLoadingState(true, 'Guardando proveedores...');
                this.guardarProveedores(this.idProductoActual, loadingDialog);
              } else {
                loadingDialog.close();
                
                this.dialog.open(CustomMessageBoxComponent, {
                  data: {
                    title: '¡Actualizado!',
                    message: 'Producto actualizado correctamente',
                    type: 'success',
                    showCancel: false
                  } as MessageBoxData,
                  width: '400px'
                });
                
                this.saving = false;
              }
            } else {
              console.error('❌ Error:', res?.message || res);
              loadingDialog.close();
              
              this.dialog.open(CustomMessageBoxComponent, {
                data: {
                  title: 'Error',
                  message: 'Error al actualizar: ' + (res?.message || 'Error desconocido'),
                  type: 'error',
                  showCancel: false
                } as MessageBoxData,
                width: '400px'
              });
              
              this.saving = false;
            }
          },
          error: (err) => {
            console.error('❌ Error HTTP:', err);
            loadingDialog.close();
            
            this.dialog.open(CustomMessageBoxComponent, {
              data: {
                title: 'Error de Conexión',
                message: 'Error al actualizar producto',
                type: 'error',
                showCancel: false
              } as MessageBoxData,
              width: '400px'
            });
            
            this.saving = false;
          }
        });
      });
    }
  }
  private formatearFecha(fecha: string | Date | null): string | null {
    if (!fecha) return null;
    
    try {
      // ✅ Tomar solo la parte de la fecha (YYYY-MM-DD)
      const fechaStr = fecha.toString();
      const match = fechaStr.match(/(\d{4})-(\d{2})-(\d{2})/);
      
      if (match) {
        return `${match[1]}-${match[2]}-${match[3]}`;
      }
      
      return null;
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return null;
    }
  }
  private actualizarStocks(): void {
    const stocksParaActualizar = this.bodegasConfig
      .filter(b => b.stockMin !== null || b.stockMax !== null) // Solo bodegas con existencia
      .map(b => ({
        idlocal: b.idLocal,
        stockmin: b.stockMin,
        stockmax: b.stockMax,
        cantidad: b.existenciaInicial
      }));

    if (stocksParaActualizar.length === 0) {
      console.log('⚠️ No hay stocks para actualizar');
      return;
    }

    console.log('📦 Actualizando stocks:', stocksParaActualizar);

    this.stocksService.actualizarStocks(this.idProductoActual, stocksParaActualizar).subscribe({
      next: (res) => {
        console.log('✅ Stocks actualizados:', res.message);
      },
      error: (err) => {
        console.error('❌ Error al actualizar stocks:', err);
        // No mostrar error al usuario, solo loguearlo
      }
    });
  }

  cargarEstructuraProducto(idProducto: number): void {
    this.cargandoEstructura = true;
    
    this.productoService.getEstructuraByProducto(idProducto).subscribe({
      next: (response) => {
        if (response.type === 'SUCCESS' && response.data) {
          this.estructuraProducto = response.data;
          console.log(' Estructura cargada:', this.estructuraProducto);
        }
        this.cargandoEstructura = false;
      },
      error: (err) => {
        console.error('❌ Error al cargar estructura:', err);
        this.estructuraProducto = null;
        this.cargandoEstructura = false;
      }
    });
  }
  cargarProducto(id: number): void {
    const dialogRef = this.dialog.open(CustomMessageBoxComponent, {
      data: {
        title: 'Cargando Producto',
        message: 'Obteniendo información del producto...',
        isLoading: true,
        loadingText: 'Cargando datos...'
      } as MessageBoxData,
      disableClose: true,
      width: '400px'
    });
    this.productoService.getById(id).subscribe({
      next: (res) => {
        const prod = res?.data;
        if (!prod) {
          dialogRef.close();
          this.dialog.open(CustomMessageBoxComponent, {
            data: {
              title: 'Error',
              message: 'No se encontró el producto',
              type: 'error',
              showCancel: false
            } as MessageBoxData,
            width: '400px'
          });
          return;
        }
        this.productoOriginal = { ...prod };
        
        // Tab 1: datos generales
        this.form.patchValue({
          codigoInterno: prod.idproducto,
          descripcion1: prod.despro,
          descripcionPOS: prod.despro2,
          codigoBarras: prod.codbar,
          tipoProducto: prod.tippro === 'B' ? 'Bien' : (prod.tippro === 'S' ? 'Servicio' : null),
          unidadVenta: this.unidadesVenta.find(u => u.descripcion === prod.uniman)?.idUnidadVenta || null,
          abreviacion: prod.abrevia,
          referencia: prod.referencia,
          activo: prod.activo,
          pagaIva: prod.pagaiva,
          cargarInventarios: prod.inv,
          productoConPeso: prod.peso,
          manejaDecimales: prod.cantdecimal,
          altoRiesgo: prod.altoriesgo,
          claseProducto: prod.clasprod,
          urlFoto: prod.foto,
          fechaCreacion: prod.feccre ? this.formatearFecha(prod.feccre) : null,
          fechaModificacion: prod.fechamod ? this.formatearFecha(prod.fechamod) : null,
          existenciaGlobal: prod.exiqty || 0,
          // ✅ AGREGAR CAMPOS NUEVOS
          cantidad: prod.cantidad,
          productoEnVenta: prod.productoventa,
          consumoInterno: prod.consumointerno,
          psicotropico: prod.psicotropico,
          estupefaciente: prod.estupefaciente,
          canCov: prod.cantconv || 0,
          presentacion: prod.idpresentacion,
        });

        // Tab 2: adicionales
        this.adicionalForm.patchValue({
          // ✅ CAMBIAR A IDs
          color: prod.idcolor,
          sabor: prod.idsabor,
          fabricante: prod.idfabricante,
          
          tamanoTalla1: prod.talla,
          medida1: prod.espesor,
          medida2: prod.largo,
          medida3: prod.ancho,
          observacion: prod.obs,
          registroSanitario: prod.regsanitario,
          ctaVentas: prod.codcuedeb,
          ctaInventarios: prod.codcuehab,
          ctaCostos: prod.codcuedes,
          ctaDevolucion: prod.codcuedev,
          productoGasto: prod.pgasto,
          ctaGastos: prod.ctaprodgasto,
        });

        // Tab 3: precios / costos (sin cambios)
        const fechasFormateadas = {
          fechaAnteriorModificarPrecio: this.formatearFecha(prod.feccosact),
          fechaModificarPrecio: this.formatearFecha(prod.fecpremod),
          fechaAnteriorModificarCompra: this.formatearFecha(prod.fecpreact),
          fechaModificarCompra: this.formatearFecha(prod.feccosmod)
        };
        
        console.log('📅 Fechas formateadas:', fechasFormateadas);
        
        this.preciosForm.patchValue({
          precioOficial: prod.preven2,              
          precioRedMsp: prod.prepormayor,          
          pvpActualIva: prod.prevensiniva,          
          pvpActualMasIva: prod.preven,  
          pvpAnteriorMasIva: prod.preanterior,
          fechaAnteriorModificarPrecio: fechasFormateadas.fechaAnteriorModificarPrecio,
          fechaModificarPrecio: fechasFormateadas.fechaModificarPrecio,
          margenUtilidad: prod.margenutilidad,
          costoSuministro: prod.costsuminis,
          costoProducto: prod.cospro,
          costoPromedio: prod.precos,
          precioCompraAnterior: prod.cosanterior,
          fechaAnteriorModificarCompra: fechasFormateadas.fechaAnteriorModificarCompra,
          precioCompraActual: prod.preuni,
          fechaModificarCompra: fechasFormateadas.fechaModificarCompra,
          recepcionPorcentaje: prod.porcenrecepcion
        });
        
        // ✅ Verificar qué quedó en el form
        console.log('📅 Valores en el FormControl:', {
          fechaAnteriorModificarPrecio: this.preciosForm.get('fechaAnteriorModificarPrecio')?.value,
          fechaModificarPrecio: this.preciosForm.get('fechaModificarPrecio')?.value,
          fechaAnteriorModificarCompra: this.preciosForm.get('fechaAnteriorModificarCompra')?.value,
          fechaModificarCompra: this.preciosForm.get('fechaModificarCompra')?.value
        });
        this.cargarEstructuraProducto(id);
        dialogRef.close();
        this.cargarProveedoresProducto(id);
        this.cargarUbicacionesProducto(id);
      },
      error: (err) => {
        console.error('❌ Error cargando producto', err);
        dialogRef.close();
      
        this.dialog.open(CustomMessageBoxComponent, {
          data: {
            title: 'Error al Cargar',
            message: 'No se pudo cargar el producto. Por favor intente nuevamente.',
            type: 'error',
            showCancel: false
          } as MessageBoxData,
          width: '400px'
        });
      }
    });
  }
  //EAN13
  private generarCodigoEAN13(): void {
    const codigoInterno = this.form.get('codigoInterno')?.value;
    
    if (!codigoInterno) {
      alert('⚠️ Debe tener un código interno antes de generar el código de barras');
      this.form.patchValue({ generarCodigo: false }, { emitEvent: false });
      return;
    }

    // Generar código único
    this.generarYValidarEAN13();
  }

  // ✅ Generar y validar que no exista en BD
  private generarYValidarEAN13(): void {
    const prefijo = '786'; // Ecuador
    
    // Generar 9 dígitos aleatorios
    const digitosAleatorios = this.generarDigitosAleatorios(9);
    
    // Construir código sin dígito verificador (12 dígitos)
    const codigoSinDigito = prefijo + digitosAleatorios;
    
    // Calcular dígito verificador
    const digitoVerificador = this.calcularDigitoVerificadorEAN13(codigoSinDigito);
    
    // Código completo
    const codigoEAN13 = codigoSinDigito + digitoVerificador;
    
    console.log('🔢 EAN-13 generado:', codigoEAN13);
    
    // ✅ Validar que no exista en BD
    this.validarCodigoBarrasUnico(codigoEAN13);
  }

  // ✅ Generar dígitos aleatorios
  private generarDigitosAleatorios(cantidad: number): string {
    let digitos = '';
    for (let i = 0; i < cantidad; i++) {
      digitos += Math.floor(Math.random() * 10).toString();
    }
    return digitos;
  }

  // ✅ Calcular dígito verificador EAN-13
  private calcularDigitoVerificadorEAN13(codigo12Digitos: string): string {
    let suma = 0;
    
    // Multiplicar posiciones impares por 1 y pares por 3 (desde la derecha)
    for (let i = 0; i < 12; i++) {
      const digito = parseInt(codigo12Digitos[i]);
      // Posiciones impares (0, 2, 4...) multiplicar por 1
      // Posiciones pares (1, 3, 5...) multiplicar por 3
      suma += (i % 2 === 0) ? digito : digito * 3;
    }
    
    // Calcular el dígito verificador
    const modulo = suma % 10;
    const digitoVerificador = modulo === 0 ? 0 : 10 - modulo;
    
    return digitoVerificador.toString();
  }

  // ✅ Validar que el código no exista en la BD
  private validarCodigoBarrasUnico(codigoEAN13: string): void {
    this.productoService.validarCodigoBarras(codigoEAN13).subscribe({
      next: (resp: any) => {
        if (resp.type === 'SUCCESS') {
          if (resp.data.existe) {
            // El código ya existe, generar otro
            console.warn('⚠️ Código ya existe, generando uno nuevo...');
            this.generarYValidarEAN13(); // Recursivo hasta encontrar uno único
          } else {
            // Código único, asignarlo
            this.form.patchValue({ 
              codigoBarras: codigoEAN13 
            }, { emitEvent: false });
            
            console.log('✅ Código de barras único generado:', codigoEAN13);
          }
        }
      },
      error: (err: any) => {
        console.error('❌ Error al validar código de barras:', err);
        alert('Error al validar código de barras. Intente nuevamente.');
        this.form.patchValue({ generarCodigo: false }, { emitEvent: false });
      }
    });
  }

  // ✅ Restaurar código interno cuando se desmarca el checkbox
  private restaurarCodigoInterno(): void {
    const codigoInterno = this.form.get('codigoInterno')?.value;
    
    if (codigoInterno) {
      this.form.patchValue({ 
        codigoBarras: codigoInterno 
      }, { emitEvent: false });
      
      console.log('🔄 Código de barras restaurado al código interno:', codigoInterno);
    }
  }
  //Proveedores
  cargarProveedores(): void {
    this.proveedorService.getAll().subscribe({
      next: (resp) => {
        this.proveedores = resp.data || [];
        console.log('✅ Proveedores cargados:', this.proveedores.length);
      },
      error: (err) => {
        console.error('❌ Error al cargar proveedores:', err);
        alert('Error al cargar proveedores');
      }
    });
  }

  cargarProveedoresProducto(idProducto: number): void {
    if (!idProducto || idProducto === 0) {
      this.proveedoresEnMemoria = [];
      return;
    }

    this.productoProveedorService.getProveedoresByProducto(idProducto).subscribe({
      next: (resp) => {
        this.proveedoresEnMemoria = (resp.data || []).map(p => {
          // ✅ Buscar el ID de unidad de venta por su descripción
          const unidad = this.unidadesVenta.find(u => u.descripcion === p.unidad_compra);
          
          return {
            ...p,
            _isNew: false,
            id_unidad_venta: unidad?.idUnidadVenta || null // ✅ Agregar ID para el grid
          };
        });
        
        console.log('✅ Proveedores cargados en memoria:', this.proveedoresEnMemoria.length);
      },
      error: (err) => {
        console.error('❌ Error al cargar proveedores:', err);
        this.proveedoresEnMemoria = [];
      }
    });
  }

  private guardarProveedores(idProducto: number, loadingDialog?: MatDialogRef<CustomMessageBoxComponent>): void {
    console.log('💾 Guardando proveedores en memoria...');
    
    // Validar que todos los proveedores tengan los campos obligatorios
    const proveedoresInvalidos = this.proveedoresEnMemoria.filter(p => 
      !p.id_proveedor || !p.costo_compra || p.costo_compra === 0
    );

    if (proveedoresInvalidos.length > 0) {
      alert('Algunos proveedores no tienen proveedor o costo compra definido. Por favor complete los datos.');
      this.saving = false;
      return;
    }
      // Validar proveedor duplicado
    const proveedoresIds = this.proveedoresEnMemoria.map(p => p.id_proveedor);
    const duplicados = proveedoresIds.filter((id, index) => proveedoresIds.indexOf(id) !== index);
    
    if (duplicados.length > 0) {
      const nombresDuplicados = duplicados.map(id => {
        const prov = this.proveedores.find(p => p.id_proveedor === id);
        return prov?.nombre_proveedor || 'Desconocido';
      });
      
      alert(`⚠️ Hay proveedores duplicados:\n${nombresDuplicados.join('\n')}\n\nPor favor elimine los duplicados antes de guardar.`);
      this.saving = false;
      return;
    }
    // Separar proveedores nuevos de existentes
    const nuevos = this.proveedoresEnMemoria.filter(p => p._isNew && !p.id_producto_proveedor);
    const existentes = this.proveedoresEnMemoria.filter(p => p.id_producto_proveedor);

    let operacionesCompletadas = 0;
    const totalOperaciones = nuevos.length + existentes.length;

    // Si no hay nada que guardar
    if (totalOperaciones === 0) {
      alert('Producto guardado exitosamente');
      this.saving = false;
      history.back();
      return;
    }

    // Función para verificar si terminamos
    const verificarFinalizacion = () => {
      operacionesCompletadas++;
      if (operacionesCompletadas === totalOperaciones) {
        if (loadingDialog) {
          loadingDialog.close();
        }
        
        this.dialog.open(CustomMessageBoxComponent, {
          data: {
            title: '¡Completado!',
            message: 'Producto y proveedores guardados exitosamente',
            type: 'success',
            showCancel: false
          } as MessageBoxData,
          width: '400px'
        }).afterClosed().subscribe(() => {
          this.saving = false;
          history.back();
        });
      }
    };

    // Guardar proveedores nuevos
    nuevos.forEach(prov => {
      const request: ProductoProveedorRequest = {
        id_producto: idProducto,
        id_proveedor: prov.id_proveedor,
        costo_compra: Number(prov.costo_compra) || 0,
        descuento_general: Number(prov.descuento_general) || 0,
        descuento_1: Number(prov.descuento_1) || 0,
        descuento_2: Number(prov.descuento_2) || 0,
        descuento_3: Number(prov.descuento_3) || 0,
        descuento_4: Number(prov.descuento_4) || 0,
        porcentaje_pvp: Number(prov.porcentaje_pvp) || 0,
        producto_consignacion: prov.producto_consignacion || false,
        unidad_compra: prov.unidad_compra || '',
        valor_unidad_compra: Number(prov.valor_unidad_compra) || 0,
        es_proveedor_principal: true // ✅ TODOS SON PRINCIPALES
      };

      this.productoProveedorService.create(request).subscribe({
        next: (res) => {
          if (res.type === 'SUCCESS') {
            console.log('✅ Proveedor guardado:', prov.nombre_proveedor);
            verificarFinalizacion();
          }
        },
        error: (err) => {
          console.error('❌ Error al guardar proveedor:', err);
          verificarFinalizacion();
        }
      });
    });

    // Actualizar proveedores existentes
    existentes.forEach(prov => {
      const request: ProductoProveedorRequest = {
        id_producto: idProducto,
        id_proveedor: prov.id_proveedor,
        costo_compra: Number(prov.costo_compra) || 0,
        descuento_general: Number(prov.descuento_general) || 0,
        descuento_1: Number(prov.descuento_1) || 0,
        descuento_2: Number(prov.descuento_2) || 0,
        descuento_3: Number(prov.descuento_3) || 0,
        descuento_4: Number(prov.descuento_4) || 0,
        porcentaje_pvp: Number(prov.porcentaje_pvp) || 0,
        producto_consignacion: prov.producto_consignacion || false,
        unidad_compra: prov.unidad_compra || '',
        valor_unidad_compra: Number(prov.valor_unidad_compra) || 0,
        es_proveedor_principal: true // ✅ TODOS SON PRINCIPALES
      };

      this.productoProveedorService.update(prov.id_producto_proveedor, request).subscribe({
        next: (res) => {
          if (res.type === 'SUCCESS') {
            console.log('✅ Proveedor actualizado:', prov.nombre_proveedor);
            verificarFinalizacion();
          }
        },
        error: (err) => {
          console.error('❌ Error al actualizar proveedor:', err);
          verificarFinalizacion();
        }
      });
    });
  }


  eliminarProveedor(proveedor: ProductoProveedorResponse): void {
    if (!confirm(`¿Está seguro de eliminar el proveedor "${proveedor.nombre_proveedor}"?`)) {
      return;
    }

    this.productoProveedorService.delete(proveedor.id_producto_proveedor).subscribe({
      next: (resp) => {
        if (resp.type === 'SUCCESS') {
          alert('Proveedor eliminado correctamente');
          this.cargarProveedoresProducto(this.idProductoActual);
        } else {
          alert('Error: ' + resp.message);
        }
      },
      error: (err) => {
        console.error('❌ Error al eliminar proveedor:', err);
        alert('Error al eliminar proveedor');
      }
    });
  }

  agregarFilaProveedor(): void {
    const tempId = `temp_${Date.now()}`;
    
    const nuevaFila = {
      _tempId: tempId,
      _isNew: true,
      id_proveedor: null,
      codigo_proveedor: '',
      nombre_proveedor: '',
      costo_compra: 0,
      descuento_general: 0,
      descuento_1: 0,
      descuento_2: 0,
      descuento_3: 0,
      descuento_4: 0,
      costo_neto: 0,
      id_unidad_venta: null, // ✅ Cambiar a ID
      unidad_compra: '', // ✅ Mantener para guardar el nombre
      valor_unidad_compra: 0,
      porcentaje_pvp: 0,
      producto_consignacion: false,
      es_proveedor_principal: true
    };

    this.proveedoresEnMemoria = [nuevaFila, ...this.proveedoresEnMemoria];
    
    if (this.proveedoresGridApi) {
      this.proveedoresGridApi.applyTransaction({ add: [nuevaFila], addIndex: 0 });
      
      setTimeout(() => {
        this.proveedoresGridApi.setFocusedCell(0, 'id_proveedor');
        this.proveedoresGridApi.startEditingCell({
          rowIndex: 0,
          colKey: 'id_proveedor'
        });
      }, 100);
    }
    
    console.log('➕ Nueva fila agregada en memoria');
  }

  // AG GRID
  configurarGridProveedores(): void {
    this.columnDefsProveedores = [
      {
        headerName: 'Acciones',
        field: 'acciones',
        width: 90,
        pinned: 'left',
        cellRenderer: (params: any) => {
          return `
            <button 
              class="btn-grid-delete" 
              data-action="delete" 
              title="Eliminar">
              🗑️
            </button>
          `;
        },
        cellStyle: { 'text-align': 'center', 'padding': '4px' }
      },
      {
        headerName: '*Proveedor',
        field: 'id_proveedor',
        width: 280,
        editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: (params: any) => {
          const proveedoresUsados = this.proveedoresEnMemoria
            .filter(p => {
              const esElMismo = p._tempId ? 
                p._tempId === params.data._tempId : 
                p.id_producto_proveedor === params.data.id_producto_proveedor;
              return !esElMismo && p.id_proveedor;
            })
            .map(p => p.id_proveedor);
          
          const proveedoresDisponibles = this.proveedores
            .filter(p => !proveedoresUsados.includes(p.id_proveedor))
            .map(p => p.id_proveedor);
          
          return {
            values: proveedoresDisponibles
          };
        },
        valueFormatter: (params: any) => {
          if (!params.value) return '⚠️ Seleccione proveedor...';
          const prov = this.proveedores.find(p => p.id_proveedor === params.value);
          return prov ? `${prov.codigo_proveedor} - ${prov.nombre_proveedor}` : '';
        },
        cellStyle: (params: any) => {
          if (!params.value) {
            return { 'background-color': '#fff3cd', 'font-style': 'italic' };
          }
          return {};
        }
      },
      {
        headerName: '*Costo Compra',
        field: 'costo_compra',
        width: 140,
        editable: true,
        cellEditor: 'agNumberCellEditor',
        cellEditorParams: {
          min: 0,
          precision: 2
        },
        valueFormatter: (params: any) => {
          return params.value != null ? '$ ' + Number(params.value).toFixed(2) : '$ 0.00';
        },
        cellStyle: (params: any) => {
          const style: any = { 'text-align': 'right' };
          if (!params.value || params.value === 0) {
            style['background-color'] = '#fff3cd';
          }
          return style;
        }
      },
      {
        headerName: 'Desc. en Producto',
        field: 'descuento_general',
        width: 160,
        editable: true,
        cellEditor: 'agNumberCellEditor',
        cellEditorParams: {
          min: 0,
          max: 100,
          precision: 2
        },
        valueFormatter: (params: any) => {
          return params.value != null ? Number(params.value).toFixed(2) + '' : '0.00';
        },
        cellStyle: { 'text-align': 'right' }
      },
      {
        headerName: 'Desc. 1 %',
        field: 'descuento_1',
        width: 110,
        editable: true,
        cellEditor: 'agNumberCellEditor',
        cellEditorParams: { min: 0, max: 100, precision: 2 },
        valueFormatter: (params: any) => {
          return params.value != null ? Number(params.value).toFixed(2) + '%' : '0.00%';
        },
        cellStyle: { 'text-align': 'right' }
      },
      {
        headerName: 'Desc. 2 %',
        field: 'descuento_2',
        width: 110,
        editable: true,
        cellEditor: 'agNumberCellEditor',
        cellEditorParams: { min: 0, max: 100, precision: 2 },
        valueFormatter: (params: any) => {
          return params.value != null ? Number(params.value).toFixed(2) + '%' : '0.00%';
        },
        cellStyle: { 'text-align': 'right' }
      },
      {
        headerName: 'Desc. 3 %',
        field: 'descuento_3',
        width: 110,
        editable: true,
        cellEditor: 'agNumberCellEditor',
        cellEditorParams: { min: 0, max: 100, precision: 2 },
        valueFormatter: (params: any) => {
          return params.value != null ? Number(params.value).toFixed(2) + '%' : '0.00%';
        },
        cellStyle: { 'text-align': 'right' }
      },
      {
        headerName: 'Desc. 4 %',
        field: 'descuento_4',
        width: 110,
        editable: true,
        cellEditor: 'agNumberCellEditor',
        cellEditorParams: { min: 0, max: 100, precision: 2 },
        valueFormatter: (params: any) => {
          return params.value != null ? Number(params.value).toFixed(2) + '%' : '0.00%';
        },
        cellStyle: { 'text-align': 'right' }
      },
      {
        headerName: 'Costo Neto',
        field: 'costo_neto',
        width: 140,
        editable: false,
        valueFormatter: (params: any) => {
          return params.value != null ? '$ ' + Number(params.value).toFixed(2) : '$ 0.00';
        },
        cellStyle: { 
          'text-align': 'right', 
          'font-weight': 'bold', 
          'background-color': '#e8f5e9',
          'color': '#2e7d32'
        }
      },
      // Unidad Compra
      {
        headerName: 'Unidad Compra',
        field: 'id_unidad_venta', // ✅ Campo para guardar el ID (temporal, solo para el grid)
        width: 150,
        editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: (params: any) => {
          console.log('📋 Opciones del select:', this.unidadesVenta.length);
          return {
            values: this.unidadesVenta.map(u => u.idUnidadVenta) // IDs para el select
          };
        },
        valueFormatter: (params: any) => {
          if (!params.value) return 'Seleccionar...';
          // Buscar por ID y mostrar descripción
          const unidad = this.unidadesVenta.find(u => u.idUnidadVenta === params.value);
          return unidad ? unidad.descripcion : 'Seleccionar...';
        },
        cellStyle: (params: any) => {
          if (!params.value) {
            return { 'background-color': '#fff3cd', 'font-style': 'italic' };
          }
          return {};
        }
      },
      // Cantidad
      {
        headerName: 'Cantidad',
        field: 'valor_unidad_compra',
        width: 110,
        editable: true,
        cellEditor: 'agNumberCellEditor',
        cellEditorParams: { min: 0, precision: 2 },
        valueFormatter: (params: any) => {
          return params.value != null ? Number(params.value).toFixed(2) : '0.00';
        },
        cellStyle: { 'text-align': 'right' }
      },
      // ❌ OCULTAR columna % PVP
      // Se elimina completamente o se oculta con hide: true
      // OPCIÓN 1: Eliminarlo completamente (comentar o borrar)
      /*
      {
        headerName: '% PVP',
        field: 'porcentaje_pvp',
        ...
      },
      */
      // OPCIÓN 2: Ocultarlo pero mantenerlo en los datos (recomendado)
      {
        headerName: '% PVP',
        field: 'porcentaje_pvp',
        width: 110,
        editable: true,
        hide: true, // ✅ OCULTAR columna
        cellEditor: 'agNumberCellEditor',
        cellEditorParams: { precision: 2 },
        valueFormatter: (params: any) => {
          return params.value != null ? Number(params.value).toFixed(2) + '%' : '0.00%';
        },
        cellStyle: { 'text-align': 'right' }
      },
      {
        headerName: 'Consignación',
        field: 'producto_consignacion',
        width: 130,
        editable: true,
        cellEditor: 'agCheckboxCellEditor',
        cellRenderer: (params: any) => {
          return params.value ? '✅ Sí' : '❌ No';
        },
        cellStyle: { 'text-align': 'center' }
      }
    ];

    this.defaultColDefProveedores = {
      sortable: true,
      filter: false,
      resizable: true,
      suppressMovable: true
    };
  }
  onProveedoresGridReady(params: GridReadyEvent): void {
    this.proveedoresGridApi = params.api;
    console.log('✅ Grid de proveedores listo');
  }


  onProveedoresCellClicked(event: CellClickedEvent): void {
    const target = event.event?.target as HTMLElement;
    const action = target.getAttribute('data-action');
    
    if (action === 'delete') {
      this.eliminarProveedorDeMemoria(event.data);
    }
  }
  eliminarProveedorDeMemoria(proveedor: any): void {
    const nombreProv = proveedor.nombre_proveedor || 'este proveedor';
    
    // ✅ Confirmación con MessageBox
    this.dialog.open(CustomMessageBoxComponent, {
      data: {
        title: '¿Eliminar Proveedor?',
        message: `¿Está seguro de eliminar "${nombreProv}"?`,
        type: 'warning',
        confirmText: 'Sí, eliminar',
        cancelText: 'Cancelar',
        showCancel: true
      } as MessageBoxData,
      width: '400px'
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;

      // Eliminar del array en memoria
      this.proveedoresEnMemoria = this.proveedoresEnMemoria.filter(p => {
        if (proveedor._tempId) {
          return p._tempId !== proveedor._tempId;
        }
        return p.id_producto_proveedor !== proveedor.id_producto_proveedor;
      });

      // Actualizar grid
      if (this.proveedoresGridApi) {
        this.proveedoresGridApi.applyTransaction({ remove: [proveedor] });
      }

      console.log('🗑️ Proveedor eliminado de memoria');
    });
  }



  onProveedoresCellValueChanged(event: CellValueChangedEvent): void {
    const proveedor = event.data;
    const campo = event.colDef.field;
    
    console.log(`📝 Campo modificado en memoria: ${campo}`, event.newValue);

    // ✅ VALIDAR PROVEEDOR DUPLICADO
    if (campo === 'id_proveedor') {
      const proveedorDuplicado = this.proveedoresEnMemoria.filter(p => {
        // Excluir el actual
        const esElMismo = p._tempId ? 
          p._tempId === proveedor._tempId : 
          p.id_producto_proveedor === proveedor.id_producto_proveedor;
        
        if (esElMismo) return false;
        
        // Verificar si hay otro con el mismo id_proveedor
        return p.id_proveedor === event.newValue;
      });

      if (proveedorDuplicado.length > 0) {
        alert('⚠️ Este proveedor ya está agregado. No se permiten proveedores duplicados.');
        
        // Revertir el cambio
        proveedor.id_proveedor = event.oldValue || null;
        proveedor.codigo_proveedor = '';
        proveedor.nombre_proveedor = '';
        
        // Actualizar visualmente
        event.node.setData(proveedor);
        return;
      }

      // Si no está duplicado, actualizar código y nombre
      const provSeleccionado = this.proveedores.find(p => p.id_proveedor === event.newValue);
      if (provSeleccionado) {
        proveedor.codigo_proveedor = provSeleccionado.codigo_proveedor;
        proveedor.nombre_proveedor = provSeleccionado.nombre_proveedor;
        
        console.log('✅ Proveedor seleccionado:', provSeleccionado.nombre_proveedor);
      }
    }
      // Unidad de venta
    if (campo === 'id_unidad_venta') {
      const unidadSeleccionada = this.unidadesVenta.find(u => u.idUnidadVenta === event.newValue);
      if (unidadSeleccionada) {
        proveedor.unidad_compra = unidadSeleccionada.descripcion; // ✅ Guardar descripción
        console.log('✅ Unidad seleccionada:', unidadSeleccionada.descripcion);
        console.log('✅ Se guardará en BD como:', proveedor.unidad_compra);
      }
    }
    // Recalcular costo neto si cambió algún valor relacionado
    if (
      campo === 'costo_compra' ||
      campo === 'descuento_general' ||
      campo === 'descuento_1' ||
      campo === 'descuento_2' ||
      campo === 'descuento_3' ||
      campo === 'descuento_4'
    ) {
      proveedor.costo_neto = this.calcularCostoNetoProveedor(proveedor);
    }

    // Actualizar el array en memoria
    const index = this.proveedoresEnMemoria.findIndex(p => 
      p._tempId === proveedor._tempId || p.id_producto_proveedor === proveedor.id_producto_proveedor
    );
    
    if (index !== -1) {
      this.proveedoresEnMemoria[index] = proveedor;
    }

    // Actualizar la fila visualmente
    event.node.setData(proveedor);
  }

  // Metodos auxiliares para usar aggrid
  private calcularCostoNetoProveedor(proveedor: ProductoProveedorResponse): number {
    let costo = Number(proveedor.costo_compra) || 0;
    
    if (proveedor.descuento_1 && proveedor.descuento_1 > 0) {
      costo -= (costo * proveedor.descuento_1 / 100);
    }
    if (proveedor.descuento_2 && proveedor.descuento_2 > 0) {
      costo -= (costo * proveedor.descuento_2 / 100);
    }
    if (proveedor.descuento_3 && proveedor.descuento_3 > 0) {
      costo -= (costo * proveedor.descuento_3 / 100);
    }
    if (proveedor.descuento_4 && proveedor.descuento_4 > 0) {
      costo -= (costo * proveedor.descuento_4 / 100);
    }
    
    return this.fix(costo, 3);
  }

  private marcarProveedorPrincipal(proveedorPrincipal: ProductoProveedorResponse): void {
    this.proveedoresGridApi.forEachNode((node) => {
      if (node.data.id_producto_proveedor !== proveedorPrincipal.id_producto_proveedor) {
        node.data.es_proveedor_principal = false;
        node.setData(node.data);
      }
    });
  }

  obtenerUltimoNivelEstructura(): string | null {
    if (!this.estructuraProducto) return null;
    
    if (this.estructuraProducto.nombre_grupo) return 'grupo';
    if (this.estructuraProducto.nombre_seccion) return 'seccion';
    if (this.estructuraProducto.nombre_departamento) return 'departamento';
    if (this.estructuraProducto.nombre_subdivision) return 'subdivision';
    if (this.estructuraProducto.nombre_division) return 'division';
    
    return null;
  }

  // ✅ Método auxiliar para saber si es el último nivel
  esUltimoNivel(nivel: string): boolean {
    return this.obtenerUltimoNivelEstructura() === nivel;
  }

  async onImprimir(): Promise<void> {
    if (this.idProductoActual === 0) {
      alert('Guarde el producto primero');
      return;
    }

    this.cargandoPreview = true;
    try {
      const idEmpresa = parseInt(localStorage.getItem('idEmpresa') || '1', 10);
      const cfgEmpresa = await this.productoPDFService.obtenerConfiguracionEmpresa(idEmpresa);

      const cfg: ConfiguracionPDF = {
        ...cfgEmpresa,
        titulo: 'Ficha de Producto',
        colorPrimario: '#1f2937',
        colorSecundario: '#f3f4f6',
        mostrarFechaHora: true,
        mostrarDatosGenerales: true,
        mostrarPrecios: true,
        mostrarBodegas: true,
        mostrarProveedores: true,
        mostrarObservaciones: true
      };

      // Arma el ProductoPDF con tus forms (ya lo tienes hecho).
      const productoPDF: ProductoPDF = {
        codigoInterno: this.form.value.codigoInterno || '',
        codigoBarras: this.form.value.codigoBarras || '',
        descripcion1: this.form.value.descripcion1 || '',
        descripcionPOS: this.form.value.descripcionPOS || '',
        unidadVenta: (this.form.value.unidadVenta ?? '').toString(),
        unidadVentaDescripcion: this.obtenerDescripcionUnidadVenta(this.form.value.unidadVenta),
        marca: undefined,
        presentacion: this.presentaciones?.find(p => p.idPresentacion === this.form.value.presentacion)?.descripcion,
        unidadMedida: undefined,

        precioSinIVA: this.preciosForm?.value.pvpActualIva ?? 0,
        precioConIVA: this.preciosForm?.value.pvpActualMasIva ?? 0,
        precioCompra: this.preciosForm?.value.precioCompraActual ?? 0,
        utilidad: this.preciosForm?.value.margenUtilidad ?? 0,

        aplicaIVA: this.form.value.pagaIva ?? false,
        porcentajeIVA: this.iva ?? 15,

        categoria: this.estructuraProducto?.nombre_division ?? '',
        subcategoria: this.estructuraProducto?.nombre_subdivision ?? '',
        grupo: this.estructuraProducto?.nombre_grupo ?? '',

        controlaStock: this.form.value.cargarInventarios ?? false,

        bodegas: this.bodegasConfig.map(b => ({
          nombreBodega: b.nombreLocal,
          existencia: b.existenciaInicial,
          stockMin: b.stockMin,
          stockMax: b.stockMax,
          alertaStock: b.alertaStockBajo
        })),

        proveedores: this.proveedoresEnMemoria.map(p => ({
          nombreProveedor: p.nombre_proveedor ?? '',
          codigoProveedor: p.codigo_proveedor ?? '',
          precioCompra: p.costo_compra ?? 0,
          descuento: p.descuento_general ?? 0,
          plazoEntrega: p.tiempo_entrega ?? 0,
          productoProveedor: p.producto_proveedor ?? ''
        })),

        observaciones: this.adicionalForm?.value?.observacion ?? '',
        estado: this.form.value.activo ? 'Activo' : 'Inactivo',
        fechaCreacion: this.form.value.fechaCreacion,
        ultimaModificacion: this.form.value.fechaModificacion
      };

      const extras: ProductoExtraTabs = {
        cantidad: this.form.value.cantidad,
        tipoProducto: this.form.value.tipoProducto,
        existenciaGlobal: this.form.value.existenciaGlobal,
        canCov: this.form.value.canCov,
        abreviacion: this.form.value.abreviacion,
        referencia: this.form.value.referencia,
        fechaCreacion: this.form.value.fechaCreacion,
        fechaModificacion: this.form.value.fechaModificacion,

        pagaIva: this.form.value.pagaIva,
        productoEnVenta: this.form.value.productoEnVenta,
        cargarInventarios: this.form.value.cargarInventarios,
        productoConPeso: this.form.value.productoConPeso,
        consumoInterno: this.form.value.consumoInterno,
        manejaDecimales: this.form.value.manejaDecimales,
        psicotropico: this.form.value.psicotropico,
        estupefaciente: this.form.value.estupefaciente,
        activo: this.form.value.activo,
        altoRiesgo: this.form.value.altoRiesgo,

        urlFoto: this.form.value.urlFoto,

        color: this.adicionalForm?.value?.colorDesc,   // o mapea por id a descripción
        sabor: this.adicionalForm?.value?.saborDesc,
        fabricante: this.adicionalForm?.value?.fabricanteDesc,
        tamanoTalla1: this.adicionalForm?.value?.tamanoTalla1,
        medida1: this.adicionalForm?.value?.medida1,
        medida2: this.adicionalForm?.value?.medida2,
        medida3: this.adicionalForm?.value?.medida3,
        observacion: this.adicionalForm?.value?.observacion,
        registroSanitario: this.adicionalForm?.value?.registroSanitario,

        ctaVentas: this.adicionalForm?.value?.ctaVentas,
        ctaInventarios: this.adicionalForm?.value?.ctaInventarios,
        ctaCostos: this.adicionalForm?.value?.ctaCostos,
        ctaDevolucion: this.adicionalForm?.value?.ctaDevolucion,
        productoGasto: this.adicionalForm?.value?.productoGasto,
        ctaGastos: this.adicionalForm?.value?.ctaGastos,

        ubicaciones: this.ubicacionesFiltradas,
        estructura: this.estructuraProducto,

        precios: {
          precioOficial: this.preciosForm?.value.precioOficial,
          precioRedMsp: this.preciosForm?.value.precioRedMsp,
          pvpActualIva: this.preciosForm?.value.pvpActualIva,
          pvpAnteriorMasIva: this.preciosForm?.value.pvpAnteriorMasIva,
          fechaAnteriorModificarPrecio: this.preciosForm?.value.fechaAnteriorModificarPrecio,
          pvpActualMasIva: this.preciosForm?.value.pvpActualMasIva,
          fechaModificarPrecio: this.preciosForm?.value.fechaModificarPrecio,
          margenUtilidad: this.preciosForm?.value.margenUtilidad,
          costoSuministro: this.preciosForm?.value.costoSuministro,
          costoProducto: this.preciosForm?.value.costoProducto,
          costoPromedio: this.preciosForm?.value.costoPromedio,
          precioCompraAnterior: this.preciosForm?.value.precioCompraAnterior,
          fechaAnteriorModificarCompra: this.preciosForm?.value.fechaAnteriorModificarCompra,
          precioCompraActual: this.preciosForm?.value.precioCompraActual,
          fechaModificarCompra: this.preciosForm?.value.fechaModificarCompra,
          recepcionPorcentaje: this.preciosForm?.value.recepcionPorcentaje
        }
      };

      const pdfBlob = await this.productoPDFService.generarPDFBlob(productoPDF, cfg, extras);

      // Muestra en tu dialog de solo-PDF:
      this.previewDialogService.abrirPreview({
        file: new File([pdfBlob], `producto-${productoPDF.codigoInterno}.pdf`, { type: 'application/pdf' }),
        showPrintButton: true,
        showDownloadButton: true,
        title: `Producto - ${productoPDF.codigoInterno}`
      });

    } catch (e) {
      console.error(e);
      alert('Error al generar el PDF');
    } finally {
      this.cargandoPreview = false;
    }
  }

  // MÉTODO AUXILIAR PARA OBTENER DESCRIPCIÓN DE UNIDAD
  private obtenerDescripcionUnidadVenta(idUnidad: number): string {
    if (!this.unidadesVenta || !idUnidad) return '';
    const unidad = this.unidadesVenta.find(u => u.idUnidadVenta === idUnidad);
    return unidad?.descripcion || '';
  }
  onAdjuntar(): void { history.back(); }

  trackByValue = (_: number, v: string) => v;
}
