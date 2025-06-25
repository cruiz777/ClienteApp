import { Component, HostListener, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ColDef, GridApi, ModuleRegistry, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PrefijoService } from 'src/app/services/prefijo.service';
import { ClienteSeleccionadoService } from 'src/app/services/cliente-seleccionado.service';
import { Cliente } from 'src/app/interfaces/cliente';
import { GeneracionCodigosService, SecuenciaResponse } from 'src/app/services/generacion-codigos.service';
import { CheckboxRendererComponent } from '../checkbox-renderer/checkbox-renderer.component';
import { GcpBrickAutocompleteEditorComponent } from '../gcp-brick-autocomplete-editor/gcp-brick-autocomplete-editor.component';
import { UmedidaService } from 'src/app/services/umedida.service';
import { GrupoProductoService, GrupoProducto } from 'src/app/services/grupo-producto.service';
ModuleRegistry.registerModules([AllCommunityModule]);
import { MatSnackBar } from '@angular/material/snack-bar';
import { ClienteService, ClienteIndividual } from 'src/app/services/cliente.service';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { CustomMessageBoxComponent } from 'src/app/util/messages/custom-message-box.component';
import { UsuarioService } from 'src/app/services/usuario.service';
import { ProductoService, ProductoRequest } from 'src/app/services/producto.service';
import { ProductoAdicionalService, ProductoDatosAdicionalesRequest } from 'src/app/services/producto-adicional.service';
import { Router } from '@angular/router';
import { DialogProcesoComponent } from '../dialog-proceso/dialog-proceso.component';
import { bootstrapAppScopedEarlyEventContract } from '@angular/core/primitives/event-dispatch';
import { Codigos14Service, Codigos14Request } from 'src/app/services/codigos14.service';
import { FilterManager } from '@ag-grid-community/all-modules';
import { map, catchError, concatMap } from 'rxjs/operators';
import { of, forkJoin } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { from } from 'rxjs';
import { mergeMap, toArray } from 'rxjs/operators';

@Component({
  selector: 'app-bloque',
  templateUrl: './bloque.component.html',
  styleUrls: ['./bloque.component.css']
})
export class BloqueComponent implements OnInit {
  @ViewChild('pasteCatcher') pasteCatcher!: ElementRef<HTMLTextAreaElement>;



  defaultColDef: ColDef = { editable: true, resizable: true, sortable: false, flex: 1 };
  rowData: any[] = [];
  columnDefs: ColDef[] = [];

  cantidadFilas = 0;
  textoPegado: string = '';
  textoPegadoF: string = '';
  copiarDesdeColumna2 = true;
  mensaje = '';
  npais = '';
  secuencia = 0;
  bandera = 0;
  selectedColKey: string | null = null;
  checkMaestro: boolean = false;

  unidadesDisponibles: string[] = [];
  mapaUnidades: { [unidad: string]: string } = {};  // código → descripción

  gcpBricksDisponibles: { codigo: string, descripcion: string }[] = [];
  clienteE!: ClienteIndividual;
  gruposProducto: GrupoProducto[] = [];
  id_grupo_producto: number = 0;
  idgrupo: number = 0;
  codigoGrupo: string = '';
  desGrugo: string = '';
  brick: string = '';
  botonGenerarDeshabilitado = false;
  botonGrabarDeshabilitado = true;
  botonGenerar14Deshabilitado: boolean = true;
  botonGrabar14Deshabilitado: boolean = true;
  modoEdicion = false;
  checkboxMaestroDeshabilitado = true;
  usuarioActual = this.usuarioService.getUsuarioActual();
  loadingMasivo: boolean = false;
  mensajeRepetidos: string = '';


  private gridApi!: GridApi;


  gridOptions: GridOptions = {
    suppressMovableColumns: true,
    components: {
      checkboxRenderer: CheckboxRendererComponent,
      gcpBrickAutocompleteEditor: GcpBrickAutocompleteEditorComponent
    }
  };




  public frameworkComponents = {
    checkboxRenderer: CheckboxRendererComponent,
    gcpBrickAutocompleteEditor: GcpBrickAutocompleteEditorComponent
  };

  prefijos: any[] = [];
  clienteSeleccionado: Cliente | null = null;
  formUV: FormGroup;
  gtinNacionalActivo = false;
  gtinInternacionalActivo = false;
  idProductoNuevo: number = 0;
  procesandoMasivo: boolean = false;
  totalAProcesar: number = 0;
  // Al inicio del componente
  procesadosExitosos: number = 0;
  procesadosFallidos: number = 0;
  totalRegistros: number = 0;

  descripcionesRepetidas = new Set<string>();
  repetidosDetectados = false;
  tipoGtin: string = 'GTIN-13';
  factorDeshabilitado: boolean = true; // o false, según tu lógica
  idsProductosCreados: number[] = [];
  huboError: boolean = false;
  constructor(
    private fb: FormBuilder,
    private generacionCodigosService: GeneracionCodigosService,
    private prefijoService: PrefijoService,
    private clienteSeleccionadoService: ClienteSeleccionadoService,
    private umedidaService: UmedidaService,
    private grupoProductoService: GrupoProductoService,
    private _snackBar: MatSnackBar,
    private clienteService: ClienteService,
    private dialog: MatDialog,
    private usuarioService: UsuarioService,
    private productoService: ProductoService,
    private productoAdicionalService: ProductoAdicionalService,
    private router: Router,
    private codigos14Service: Codigos14Service,


  ) {
    this.formUV = this.fb.group({
      gcp: ['', Validators.required],
      serie: [''],
      gtinUv: [''],
      codigoCliente: [''],
      cliente: [''],
      ruc: [''],
      gtinNacionalSeleccionado: ['GTIN-13'],
      gtinInternacionalSeleccionado: [''],
      usarSerie: [false],
      gln: [''],
      categoria: [''],
      t: ['CAJA'],
      u: ['UNIDADES'],
      checkExiste: [false]
    });
  }

  ngOnInit(): void {
    window.onerror = function (message, source, lineno, colno, error) {
      console.error("🔴 Uncaught Error:", message, "at", source + ':' + lineno + ':' + colno);
    };
    this.formUV.get('gtinNacionalSeleccionado')?.valueChanges.subscribe(val => {
      if (val) this.tipoGtin = val;
    });

    this.formUV.get('gtinInternacionalSeleccionado')?.valueChanges.subscribe(val => {
      if (val) this.tipoGtin = val;
    });
    this.gridOptions.context = {
      componentParent: this
    };
    this.cargarCliente();
    this.cargarUnidades();
    this.cargarGrupos();
    this.columnDefs = [
      {
        headerName: '#',
        valueGetter: 'node.rowIndex + 1',
        width: 100,
        minWidth: 100,
        maxWidth: 100,
        resizable: false,
        suppressSizeToFit: true
      },
      {
        field: 'gtinUv', headerName: 'GTIN UV', editable: true, cellStyle: (params) => {
          if (params.data?._duplicadoGtinUv) {
            return { backgroundColor: '#ffcccc' }; // rojo claro
          }
          return { backgroundColor: '#ffffff' }; // blanco normal
        }, width: 150, minWidth: 150
      },
      {
        field: 'descripcion',
        headerName: 'Descripción',
        editable: true,
        width: 300,
        minWidth: 300,
        cellStyle: this.estiloDescripcionVacia,
        cellClassRules: {
          'celda-repetida': (params) => {
            const valor = (params.value || '').trim();
            return this.descripcionesRepetidas.has(valor);
          }
        }
      }
      ,
      {
        field: 'categoria',
        headerName: 'Categoría',
        editable: true,
        cellEditor: 'gcpBrickAutocompleteEditor',
        cellEditorPopup: true, // ✅ Este es el más importante
        cellStyle: this.estiloDescripcionVacia, width: 100, minWidth: 100, resizable: true,

      },
      { field: 'marca', headerName: 'Marca', editable: true, cellStyle: this.estiloDescripcionVacia, width: 100, minWidth: 100, resizable: true },
      { field: 'contenidoNeto', headerName: 'C.Neto', editable: true, cellStyle: this.estiloDescripcionVacia, valueParser: this.validarNumeroConUnPunto, width: 90, minWidth: 90 },
      {
        field: 'contenidoUM',
        headerName: 'UM',
        editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: () => ({
          values: this.unidadesDisponibles
        }),
        cellStyle: this.estiloDescripcionVacia, width: 95, minWidth: 95
      },

      {
        field: 'gcpBrick',
        headerName: 'GCP Brick',
        editable: false,
        cellStyle: this.estiloDescripcionVacia, width: 100, minWidth: 100

      }


      ,
      { field: 'pais', headerName: 'País', cellStyle: this.estiloDescripcionVacia, width: 70, minWidth: 70 },
      {
        field: 'activo',
        headerName: 'GTIN 14',
        cellRenderer: 'checkboxRenderer',
        editable: false
        , width: 80, minWidth: 80,
        colId: 'activo'
      },
      {
        field: 'factor',
        headerName: 'Factor',
        width: 80,
        minWidth: 80,
        colId: 'factor',
        editable: true,
        cellStyle: this.estiloDescripcionVacia,
        cellEditor: 'agTextCellEditor',
        valueParser: (params: any) => {
          const val = params.newValue.trim();
          return /^\d+$/.test(val) ? parseInt(val, 10) : null;
        }
      },
      {
        field: 'indicador',
        headerName: 'Indicador',
        width: 100,
        minWidth: 100,
        colId: 'indicador',
        editable: true,
        cellStyle: this.estiloDescripcionVacia,
        cellEditor: 'agTextCellEditor',
        valueParser: (params: any) => {
          const val = params.newValue.trim();
          return /^\d+$/.test(val) ? parseInt(val, 10) : null;
        }
      },

      { field: 'descripciong', headerName: 'Descripción', cellStyle: this.estiloDescripcionVacia, width: 200, minWidth: 200, colId: 'descripciong', resizable: true },
      { field: 'gtin14', headerName: 'Código GTIN 14', cellStyle: this.estiloDescripcionVacia, width: 200, minWidth: 200, colId: 'gtin14', editable: false },
      { field: 'grupo', headerName: 'grupo', cellStyle: this.estiloDescripcionVacia, width: 150, minWidth: 150, colId: 'grupo', hide: true },
      { field: 'idProducto', headerName: 'idProducto', cellStyle: this.estiloDescripcionVacia, width: 150, minWidth: 150, colId: 'idProducto', hide: true },

    ];

  }
  onGridReady(params: any) {
    this.gridApi = params.api;



    params.api.addEventListener('cellClicked', (event: any) => {
      if (event.rowIndex == null) {
        const colKey = event.column.getColId();
        this.selectedColKey = colKey;
        console.log('🟢 Columna seleccionada desde encabezado:', colKey);
      }
    });
  }



  @HostListener('paste', ['$event'])
  manejarPegado(event: ClipboardEvent) {
    const data = event.clipboardData?.getData('text/plain');
    if (data) {
      this.textoPegado = data;
    }
  }


  generarFilas(): void {

    if (!this.cantidadFilas || this.cantidadFilas <= 0) return;

    const nuevasFilas = [];
    for (let i = 0; i < this.cantidadFilas; i++) {
      nuevasFilas.push({
        gtinUv: '',
        descripcion: '',
        categoria: this.codigoGrupo,
        marca: '',
        contenidoNeto: '0',
        contenidoUM: 'g',
        gcpBrick: this.brick,
        pais: 'ECUADOR',
        activo: false,
        grupo: this.id_grupo_producto,
      });
    }

    this.rowData = nuevasFilas;
  }


  limpiarTabla(): void {
    this.rowData = [];
    this.formUV.reset();
    this.cantidadFilas = 0;
    this.textoPegado = '';
    this.textoPegadoF = '';
    this.mensaje = '';
    this.formUV.get('gtinNacionalSeleccionado')?.setValue('GTIN-13');
    this.botonGenerarDeshabilitado = false;
    this.botonGrabarDeshabilitado = true;
    this.botonGenerar14Deshabilitado = true;
    this.botonGrabar14Deshabilitado = true;
    this.checkboxMaestroDeshabilitado = true;
    this.formUV.get('t')?.setValue('CAJA');
    this.formUV.get('u')?.setValue('UNIDADES');
    this.formUV.get('checkMaestro')?.setValue(false);
    this.formUV.get('checkExiste')?.setValue(false);
    this.factorDeshabilitado = true;
    this.cargarCliente();
    this.cargarUnidades();
    this.cargarGrupos();
    this.mensajeRepetidos = '';
  }


  calcularDigitoVerificador(gtin12: string): string {
    const suma = gtin12
      .split('')
      .reverse()
      .map((n, i) => parseInt(n) * (i % 2 === 0 ? 3 : 1))
      .reduce((a, b) => a + b, 0);
    const resto = suma % 10;
    return (resto === 0 ? 0 : 10 - resto).toString();
  }

  generarGtin13() {
    const prefijo = this.formUV.get('gcp')?.value;
    if (!prefijo) {
      alert('⚠️ Ingresa un prefijo ');
      return;
    }

    for (let i = 0; i < this.rowData.length; i++) {
      const secuencia = (i + 1).toString().padStart(4, '0');
      const gtin12 = '786' + prefijo + secuencia;
      const dv = this.calcularDigitoVerificador(gtin12);
      this.rowData[i].gtinUv = gtin12 + dv;
    }

    this.rowData = [...this.rowData];
  }

  cargarCliente(): void {
    const cliente = this.clienteSeleccionadoService.obtenerClienteActual();
    console.log(cliente);
    if (cliente) {
      this.clienteSeleccionado = cliente;
      this.formUV.patchValue({
        codigoCliente: cliente.clientes_codigo || '',
        cliente: cliente.nomcli || '',
        ruc: cliente.ruc || '',

      });
      this.cargarClientePorId(cliente.clientes_codigo);
      this.cargarPrefijos(cliente.clientes_codigo);
    }
  }

  cargarPrefijos(codigoCliente: number): void {
    this.prefijoService.obtenerPorClienteCodigo(codigoCliente).subscribe({
      next: (data) => {
        this.prefijos = data;
      },
      error: (err) => {
        console.error('Error al cargar prefijos:', err);
      }
    });
  }

  onPrefijoBlur(): void {
    const idSeleccionado = this.formUV.value.gcp;
    const objeto = this.prefijos.find(p => p.id_prefijos === idSeleccionado);
    if (objeto?.gln) {
      this.formUV.patchValue({ gln: objeto.gln });
      this.bandera = objeto.bandera;
    }
  }

  habilitarSerie(): void {
    const usarSerie = this.formUV.get('usarSerie')?.value;
    const gtin = this.formUV.get('gtinNacionalSeleccionado')?.value;
    const gcpId = this.formUV.get('gcp')?.value;
    const prefijo = this.prefijos.find(p => p.id_prefijos === gcpId);
    if (!prefijo) return;

    const pais = gtin === 'GTIN-13' ? '786' : '';

    if (usarSerie) {
      this.generacionCodigosService.obtenerSecuencia(prefijo.codpre, pais).subscribe({
        next: (resp: SecuenciaResponse) => {
          this.formUV.get('serie')?.setValue(resp.data);
        },
        error: (err) => {
          console.error('Error al obtener secuencia:', err);
        }
      });
    } else {
      this.formUV.get('serie')?.reset();
    }
  }

  generar(): void {
    debugger
    this.rowData = [...this.rowData]; // Refrescar AG-Grid visualmente
    this.gridApi.setFocusedCell(0, 'gtinUv');

    const idSeleccionado = this.formUV.value.gcp;
    const objeto = this.prefijos.find(p => p.id_prefijos === idSeleccionado);
    const prefijo = objeto?.codpre || '';

    if (!prefijo) {
      this.mostrarAlerta('⚠️ Seleccione Prefijo', 'Error');
      return;
    }


    if (this.rowData.length === 0) {
      this.mostrarAlerta('⚠️ Productos a codificar en Cero', 'Error');
      return;
    }
    const checkExiste = this.formUV.get('checkExiste')?.value;

    if (this.tipoGtin === 'GTIN-13' && checkExiste === false && this.bandera===0) {
      console.log('➡️ GTIN-13 y checkExiste es falso');
      this.generar13();
    } else if (this.tipoGtin === 'GTIN-13' && checkExiste === true) {
      console.log('✅ GTIN-13 y checkExiste es verdadero');
      this.recupera13();
    } else if (this.tipoGtin === 'GTIN-13I' && checkExiste === false) {
      console.log('✅ GTIN-13 y checkExiste es verdadero');
      this.generar13i();
    } else if (this.tipoGtin === 'GTIN-13I' && checkExiste === true) {
      console.log('✅ GTIN-13 y checkExiste es verdadero');
      this.recuperar13i();
    } else if (this.tipoGtin === 'GTIN-12I' && checkExiste === true) {
      console.log('✅ GTIN-13 y checkExiste es verdadero');
      this.recuperar12i();
    } else if (this.tipoGtin === 'UPC' && checkExiste === false && this.bandera === 2) {
      console.log('✅ GTIN-12 y checkExiste es verdadero');
      this.generar12();
    } else if (this.tipoGtin === 'UPC' && checkExiste === true && this.bandera === 2) {
      console.log('✅ GTIN-12 y checkExiste es verdadero');
      this.recupera12();
    }else if (this.tipoGtin === 'GTIN-12I' && checkExiste === false) {
      console.log('✅ GTIN-12 y checkExiste es verdadero');
      this.generar12i();
    }else if (this.tipoGtin === 'GTIN-13' && checkExiste === false && this.bandera===2) {
      this.mostrarAlerta('⚠️ No se puede generar este tipo de Codigo.', 'Error');
      return;
    }





  }

  generar13() {
    const idSeleccionado = this.formUV.value.gcp;
    const objeto = this.prefijos.find(p => p.id_prefijos === idSeleccionado);
    const prefijo = objeto?.codpre || '';
    const serie = this.formUV.get('serie')?.value || '';
    this.npais = '786';
    if (!this.validarCeldasObligatorias()) return;
    const sinRepetidos = this.validarDescripcionRepetida();
    if (!sinRepetidos) {
      this.mostrarAlerta('⚠️ Descripciones Repetidas.', 'Error');
      return; // Evita continuar
    }
    this.generacionCodigosService.obtenerSecuencia(prefijo, this.npais).subscribe({
      next: (resp: SecuenciaResponse) => {
        const longitudPrefijo = prefijo.length;
        const longitudSecuencia = 12 - this.npais.length - longitudPrefijo;

        if (longitudSecuencia <= 0) {
          alert(`⚠️ Prefijo demasiado largo (${longitudPrefijo} dígitos). No se puede generar GTIN-13 válido.`);
          return;
        }

        const secuenciaInicial = serie !== '' ? parseInt(serie, 10) : resp.data;

        if (!this.validarAfiliacion(secuenciaInicial)) return;

        const maxCodigos = Math.pow(10, longitudSecuencia);
        if (this.rowData.length > maxCodigos) {
          alert(`⚠️ Solo se pueden generar ${maxCodigos} códigos con prefijo de ${longitudPrefijo} dígitos. Se recortarán automáticamente.`);
          this.rowData = this.rowData.slice(0, maxCodigos);
        }

        for (let i = 0; i < this.rowData.length; i++) {
          const secuenciaActual = (secuenciaInicial + i).toString().padStart(longitudSecuencia, '0');
          const gtin12 = this.npais + prefijo + secuenciaActual;
          const dv = this.calcularDigitoVerificador(gtin12);
          this.rowData[i].gtinUv = gtin12 + dv;
        }

        // Asignar el primer GTIN generado al formulario
        const primerSecuencia = secuenciaInicial.toString().padStart(longitudSecuencia, '0');
        const primerGtin = this.npais + prefijo + primerSecuencia;
        const primerDv = this.calcularDigitoVerificador(primerGtin);
        this.formUV.get('gtinUv')?.setValue(primerGtin + primerDv);

        this.mensaje = resp.message;
        this.secuencia = secuenciaInicial; // Guardar para referencia futura
        this.rowData = [...this.rowData];

        this.botonGenerarDeshabilitado = true;
        this.botonGrabarDeshabilitado = false;

      },
      error: (err) => {
        console.error('❌ Error al obtener secuencia', err);
        this.mensaje = 'Error al generar la secuencia';
      }
    });
  }
  recupera13() {
    const soloCopiarGtin = this.tipoGtin === 'GTIN-13' && this.formUV.get('checkExiste')?.value;
    if (!soloCopiarGtin) return;

    const observables = [];
    const filaLimite = this.rowData.length;

    for (let i = 0; i < filaLimite; i++) {
      const fila = this.rowData[i];
      const codbar = fila.gtinUv?.trim();
      if (!codbar) continue;

      const obs$ = this.productoService.buscarPorCodbar(codbar).pipe(
        map((producto) => {
          if (producto) {
            fila.descripcion = fila.descripcion?.trim() || producto.Despro || '';
            fila.marca = fila.marca?.trim() || producto.marca || '';
            fila.contenidoNeto = fila.contenidoNeto?.toString().trim() || producto.contenido || '';
            fila.contenidoUM = fila.contenidoUM?.trim() || producto.unidad || 'g';
            fila.categoria = fila.categoria?.trim() || producto.codigoproducto || '';
            fila.gcpBrick = fila.gcpBrick?.trim() || producto.brick || '';
            fila.pais = fila.pais?.trim() || producto.pais || 'ECUADOR';
            fila.grupo = fila.grupo || (isNaN(Number(producto.idgrupoproducto)) ? 0 : Number(producto.idgrupoproducto));
            fila.idProducto = fila.idProducto || producto.IdProducto;
          } else {
            // Producto no encontrado: solo llenar si están vacíos
            fila.descripcion = fila.descripcion?.trim() || 'NO EXISTE';
            fila.marca = fila.marca?.trim() || 'NO EXISTE';
            fila.contenidoNeto = fila.contenidoNeto || '';
            fila.contenidoUM = fila.contenidoUM || 'g';
            fila.categoria = fila.categoria || '';
            fila.gcpBrick = fila.gcpBrick || '';
            fila.pais = fila.pais || 'ECUADOR';
            fila.grupo = fila.grupo || 0;
            fila.idProducto = fila.idProducto || null;
          }
          return true;
        }),
        catchError((err) => {
          console.warn(`⚠️ Error con codbar ${codbar}`, err);
          fila.descripcion = fila.descripcion?.trim() || 'NO EXISTE';
          fila.marca = fila.marca?.trim() || 'NO EXISTE';
          fila.contenidoNeto = fila.contenidoNeto || '';
          fila.contenidoUM = fila.contenidoUM || 'g';
          fila.categoria = fila.categoria || '';
          fila.gcpBrick = fila.gcpBrick || '';
          fila.pais = fila.pais || 'ECUADOR';
          fila.grupo = fila.grupo || 0;
          fila.idProducto = fila.idProducto || null;
          return of(false);
        })
      );

      observables.push(obs$);
    }

    forkJoin(observables).subscribe(() => {
      this.rowData = [...this.rowData]; // Refrescar AG-Grid

      const camposIncompletos = this.rowData.some(fila =>
        !fila.descripcion || !fila.marca || !fila.contenidoNeto || !fila.categoria
      );

      if (camposIncompletos) {
        this.mostrarAlerta('⚠️ Algunos productos tienen campos vacíos. Revise las filas antes de continuar.', 'Advertencia');
        return;
      }

      const msg = this.modoEdicion ? 'actualizados' : 'generar';

      this.dialog.open(CustomMessageBoxComponent, {
        width: '400px',
        data: {
          title: '¿Desea confirmar?',
          message: `Quiere ${msg} GTIN 14. ¿Está seguro?`,
          type: 'info',
          confirmText: 'Sí, confirmar',
          cancelText: 'Cancelar',
          showCancel: true
        }
      }).afterClosed().subscribe(resultado => {
        if (resultado === true) {
          this.botonGenerarDeshabilitado = true;
          this.botonGrabarDeshabilitado = true;
          this.botonGenerar14Deshabilitado = false;
          this.botonGrabar14Deshabilitado = true;

          this.gridApi.ensureIndexVisible(0);
          this.gridApi.ensureColumnVisible('factor');
          this.gridApi.setFocusedCell(0, 'factor');
          this.checkboxMaestroDeshabilitado = false;
          this.factorDeshabilitado = false;
        } else {
          console.log('❌ Usuario canceló generación GTIN-14');
        }
      });
    });
  }

  generar13i(): void {
    const filasValidas = this.rowData.map((fila, index) => {
      const gtinBase = (fila.gtinUv || '').toString().substring(0, 12).padStart(12, '0');
      if (gtinBase.length === 12 && /^\d{12}$/.test(gtinBase)) {
        const dv = this.calcularDigitoVerificador(gtinBase);
        const gtinCompleto = gtinBase + dv;
        fila.gtinUv = gtinCompleto;
        return { index, gtin: gtinCompleto };
      } else {
        console.warn(`❌ Fila ${index + 1}: GTIN base inválido →`, fila.gtinUv);
        return null;
      }
    }).filter(Boolean) as { index: number; gtin: string }[];

    if (filasValidas.length === 0) {
      this.mostrarAlerta('⚠️ No hay GTIN válidos para procesar.', 'Validación');
      return;
    }

    const dialogRef = this.dialog.open(DialogProcesoComponent, {
      disableClose: true,
      width: '400px',
      data: {
        procesados: 0,
        total: filasValidas.length
      }
    });

    let existeRepetido = false;
    const repetidos: string[] = [];

    from(filasValidas).pipe(
      concatMap((fila, i) =>
        this.productoService.buscarPorCodbar(fila.gtin).pipe(
          map(producto => {
            if (producto) {
              existeRepetido = true;
              repetidos.push(fila.gtin);
              this.rowData[fila.index]._duplicadoGtinUv = true;
            } else {
              this.rowData[fila.index]._duplicadoGtinUv = false;
            }

            // Actualiza el número de procesados visualmente en el diálogo
            dialogRef.componentInstance.data.procesados = i + 1;
          })
        )
      )
    ).subscribe({
      complete: () => {
        dialogRef.close(); // ⏹️ Cerrar diálogo de espera

        if (existeRepetido) {
          const lista = repetidos.map(r => `🔴 ${r}`).join('\n');
          this.mostrarAlerta(`⚠️ Existe GTIN ya existen en la base de datos`, 'Duplicados encontrados');
          this.botonGenerarDeshabilitado = false;
          this.botonGrabarDeshabilitado = true;
        } else {
          this.botonGenerarDeshabilitado = true;
          this.botonGrabarDeshabilitado = false;
        }

        this.rowData = [...this.rowData];
        this.gridApi.refreshCells({ force: true, columns: ['gtinUv'] });
      },
      error: (err) => {
        dialogRef.close(); // ⏹️ Cerrar también si hay error
        console.error('❌ Error durante validación en base', err);
        this.mostrarAlerta('Error al validar GTINs en la base de datos.', 'Error');
      }
    });
  }


  recuperar13i() {


    const soloCopiarGtin = this.tipoGtin === 'GTIN-13I' && this.formUV.get('checkExiste')?.value;
    if (!soloCopiarGtin) return;

    const observables = [];
    const filaLimite = this.rowData.length;

    for (let i = 0; i < filaLimite; i++) {
      const fila = this.rowData[i];
      const codbar = fila.gtinUv?.trim();
      if (!codbar) continue;

      const obs$ = this.productoService.buscarPorCodbar(codbar).pipe(
        map((producto) => {
          if (producto) {
            fila.descripcion = fila.descripcion?.trim() || producto.Despro || '';
            fila.marca = fila.marca?.trim() || producto.marca || '';
            fila.contenidoNeto = fila.contenidoNeto?.toString().trim() || producto.contenido || '';
            fila.contenidoUM = fila.contenidoUM?.trim() || producto.unidad || 'g';
            fila.categoria = fila.categoria?.trim() || producto.codigoproducto || '';
            fila.gcpBrick = fila.gcpBrick?.trim() || producto.brick || '';
            fila.pais = fila.pais?.trim() || producto.pais || 'ECUADOR';
            fila.grupo = fila.grupo || (isNaN(Number(producto.idgrupoproducto)) ? 0 : Number(producto.idgrupoproducto));
            fila.idProducto = fila.idProducto || producto.IdProducto;
          } else {
            // Producto no encontrado: solo llenar si están vacíos
            fila.descripcion = fila.descripcion?.trim() || 'NO EXISTE';
            fila.marca = fila.marca?.trim() || 'NO EXISTE';
            fila.contenidoNeto = fila.contenidoNeto || '';
            fila.contenidoUM = fila.contenidoUM || 'g';
            fila.categoria = fila.categoria || '';
            fila.gcpBrick = fila.gcpBrick || '';
            fila.pais = fila.pais || 'ECUADOR';
            fila.grupo = fila.grupo || 0;
            fila.idProducto = fila.idProducto || null;
          }
          return true;
        }),
        catchError((err) => {
          console.warn(`⚠️ Error con codbar ${codbar}`, err);
          fila.descripcion = fila.descripcion?.trim() || 'NO EXISTE';
          fila.marca = fila.marca?.trim() || 'NO EXISTE';
          fila.contenidoNeto = fila.contenidoNeto || '';
          fila.contenidoUM = fila.contenidoUM || 'g';
          fila.categoria = fila.categoria || '';
          fila.gcpBrick = fila.gcpBrick || '';
          fila.pais = fila.pais || 'ECUADOR';
          fila.grupo = fila.grupo || 0;
          fila.idProducto = fila.idProducto || null;
          return of(false);
        })
      );

      observables.push(obs$);
    }

    forkJoin(observables).subscribe(() => {
      this.rowData = [...this.rowData]; // Refrescar AG-Grid

      const camposIncompletos = this.rowData.some(fila =>
        !fila.descripcion || !fila.marca || !fila.contenidoNeto || !fila.categoria
      );

      if (camposIncompletos) {
        this.mostrarAlerta('⚠️ Algunos productos tienen campos vacíos. Revise las filas antes de continuar.', 'Advertencia');
        return;
      }

      const msg = this.modoEdicion ? 'actualizados' : 'generar';

      this.dialog.open(CustomMessageBoxComponent, {
        width: '400px',
        data: {
          title: '¿Desea confirmar?',
          message: `Quiere ${msg} GTIN 14. ¿Está seguro?`,
          type: 'info',
          confirmText: 'Sí, confirmar',
          cancelText: 'Cancelar',
          showCancel: true
        }
      }).afterClosed().subscribe(resultado => {
        if (resultado === true) {
          this.botonGenerarDeshabilitado = true;
          this.botonGrabarDeshabilitado = true;
          this.botonGenerar14Deshabilitado = false;
          this.botonGrabar14Deshabilitado = true;

          this.gridApi.ensureIndexVisible(0);
          this.gridApi.ensureColumnVisible('factor');
          this.gridApi.setFocusedCell(0, 'factor');
          this.checkboxMaestroDeshabilitado = false;
          this.factorDeshabilitado = false;
        } else {
          console.log('❌ Usuario canceló generación GTIN-14');
        }
      });
    });





  }
recuperar12i(): void {
  const soloCopiarGtin = this.tipoGtin === 'GTIN-12I' && this.formUV.get('checkExiste')?.value;
  if (!soloCopiarGtin) return;

  const observables = [];
  const filaLimite = this.rowData.length;

  for (let i = 0; i < filaLimite; i++) {
    const fila = this.rowData[i];
    const codbar = fila.gtinUv?.trim();
    if (!codbar) continue;

    const obs$ = this.productoService.buscarPorCodbar(codbar).pipe(
      map((producto) => {
        if (producto) {
          fila.descripcion = fila.descripcion?.trim() || producto.Despro || '';
          fila.marca = fila.marca?.trim() || producto.marca || '';
          fila.contenidoNeto = fila.contenidoNeto?.toString().trim() || producto.contenido || '';
          fila.contenidoUM = fila.contenidoUM?.trim() || producto.unidad || 'g';
          fila.categoria = fila.categoria?.trim() || producto.codigoproducto || '';
          fila.gcpBrick = fila.gcpBrick?.trim() || producto.brick || '';
          fila.pais = fila.pais?.trim() || producto.pais || 'ECUADOR';
          fila.grupo = fila.grupo || (isNaN(Number(producto.idgrupoproducto)) ? 0 : Number(producto.idgrupoproducto));
          fila.idProducto = fila.idProducto || producto.IdProducto;
        } else {
          fila.descripcion = fila.descripcion?.trim() || 'NO EXISTE';
          fila.marca = fila.marca?.trim() || 'NO EXISTE';
          fila.contenidoNeto = fila.contenidoNeto || '';
          fila.contenidoUM = fila.contenidoUM || 'g';
          fila.categoria = fila.categoria || '';
          fila.gcpBrick = fila.gcpBrick || '';
          fila.pais = fila.pais || 'ECUADOR';
          fila.grupo = fila.grupo || 0;
          fila.idProducto = fila.idProducto || null;
        }
        return true;
      }),
      catchError((err) => {
        console.warn(`⚠️ Error con codbar ${codbar}`, err);
        fila.descripcion = fila.descripcion?.trim() || 'NO EXISTE';
        fila.marca = fila.marca?.trim() || 'NO EXISTE';
        fila.contenidoNeto = fila.contenidoNeto || '';
        fila.contenidoUM = fila.contenidoUM || 'g';
        fila.categoria = fila.categoria || '';
        fila.gcpBrick = fila.gcpBrick || '';
        fila.pais = fila.pais || 'ECUADOR';
        fila.grupo = fila.grupo || 0;
        fila.idProducto = fila.idProducto || null;
        return of(false);
      })
    );

    observables.push(obs$);
  }

  forkJoin(observables).subscribe(() => {
    this.rowData = [...this.rowData]; // Refrescar AG Grid

    const camposIncompletos = this.rowData.some(fila =>
      !fila.descripcion || !fila.marca || !fila.contenidoNeto || !fila.categoria
    );

    if (camposIncompletos) {
      this.mostrarAlerta('⚠️ Algunos productos tienen campos vacíos. Revise las filas antes de continuar.', 'Advertencia');
      return;
    }

    const msg = this.modoEdicion ? 'actualizados' : 'generar';

    this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: {
        title: '¿Desea confirmar?',
        message: `Quiere ${msg} GTIN 14. ¿Está seguro?`,
        type: 'info',
        confirmText: 'Sí, confirmar',
        cancelText: 'Cancelar',
        showCancel: true
      }
    }).afterClosed().subscribe(resultado => {
      if (resultado === true) {
        this.botonGenerarDeshabilitado = true;
        this.botonGrabarDeshabilitado = true;
        this.botonGenerar14Deshabilitado = false;
        this.botonGrabar14Deshabilitado = true;

        this.gridApi.ensureIndexVisible(0);
        this.gridApi.ensureColumnVisible('factor');
        this.gridApi.setFocusedCell(0, 'factor');
        this.checkboxMaestroDeshabilitado = false;
        this.factorDeshabilitado = false;
      } else {
        console.log('❌ Usuario canceló generación GTIN-14');
      }
    });
  });
}



  pegarColumnaGtinUv(): void {
    debugger
    if (!this.textoPegado.trim()) {
      this.mostrarAlerta('⚠️ No hay datos para pegar.', 'Error');
      return;
    }

    const lineas = this.textoPegado.trim().split('\n');
    const limite = Math.min(lineas.length, this.rowData.length);
    const checkExiste = this.formUV.get('checkExiste')?.value;
    const tipo = this.tipoGtin;

    for (let i = 0; i < limite; i++) {
      const columnas = lineas[i].split('\t').map(c => c.trim());
      const fila = this.rowData[i];
      let idx = 0;

      // 🔷 GTIN internacionales con cálculo de DV (cuando checkExiste = true)
      if ((tipo === 'GTIN-13I' || tipo === 'GTIN-12I') && checkExiste === true) {
        const longitudEsperada = tipo === 'GTIN-13I' ? 12 : 11;
        const base = columnas[idx++]?.substring(0, longitudEsperada) || '';
        fila.gtinUv = base.length === longitudEsperada ? base + this.calcularDigitoVerificador(base) : '';
      }

      // 🔷 Casos donde se debe llenar desde la columna gtinUv
      const llenarDesdeGtin =
        (tipo === 'GTIN-13' && checkExiste === true) ||
        (tipo === 'UPC' && checkExiste === true) ||
        (tipo === 'GTIN-13I' && checkExiste === false) ||
        (tipo === 'GTIN-12I' && checkExiste === false);

      if (llenarDesdeGtin) {
        fila.gtinUv = columnas[idx++] || '';
      }

      // 🔷 Llenar campos adicionales desde el resto de columnas
      fila.descripcion = columnas[idx++] || '';
      fila.marca = columnas[idx++] || '';
      fila.contenidoNeto = columnas[idx++] || '';
      fila.contenidoUM = columnas[idx++] || 'g';
      fila.categoria = this.codigoGrupo;
      fila.gcpBrick = this.brick;
      fila.pais = 'ECUADOR';
      fila.grupo = this.id_grupo_producto;
    }

    this.rowData = [...this.rowData]; // Refrescar AG-Grid
    this.textoPegado = '';
  }


  pegarColumnaFactor(): void {
    if (!this.textoPegadoF.trim()) {
      this.mostrarAlerta('⚠️ No hay datos para pegar.', 'Error');
      return;
    }

    const lineas = this.textoPegadoF.trim().split('\n');
    const limite = Math.min(lineas.length, this.rowData.length);

    for (let i = 0; i < limite; i++) {
      const valor = lineas[i].trim();

      if (!valor) continue;

      const fila = this.rowData[i];
      fila.factor = valor; // ✅ Asignar directamente a la columna 'factor'
    }

    this.rowData = [...this.rowData]; // Refrescar Ag-Grid
    this.gridApi.refreshCells({ force: true, columns: ['factor'] });
    this.textoPegadoF = '';
  }

  validarAfiliacion(secuencia: number): boolean {
    if (secuencia > 9999) {
      alert('⚠️ La secuencia ha superado el límite permitido (9999).');
      return false;
    }
    return true;
  }

  onHeaderClicked(event: any): void {
    this.selectedColKey = event.column.getColId();
    console.log('🟢 Columna seleccionada:', this.selectedColKey);
  }



  simularPegado(): void {

    setTimeout(() => {
      const texto = this.textoPegado.trim();
      if (texto) {
        this.pegarColumnaGtinUv();
      }
    }, 50);
  }
  estiloDescripcionVacia(params: any): any {
    const valor = params.value;
    if (!valor || String(valor).trim() === '') {
      return { backgroundColor: '#ffcccc' }; // rojo claro si está vacía
    } else {
      return { backgroundColor: '#ffffff' };
    }

  }
  marcarTodosDesdeMaestro(): void {
    this.rowData = this.rowData.map(row => ({
      ...row,
      activo: this.checkMaestro
    }));

    if (this.gridApi) {
      this.gridApi.refreshCells({ force: true });
    }
  }
  validarNumeroConUnPunto(params: any): number | null {
    const value = String(params.newValue).trim();

    // Solo números con un punto
    const regex = /^\d*\.?\d*$/;

    if (regex.test(value)) {
      // Acepta solo un punto y dígitos
      const parsed = parseFloat(value);
      return isNaN(parsed) ? null : parsed;
    } else {
      return params.oldValue; // mantiene el valor anterior si no es válido
    }
  }


  cargarUnidades(): void {
    this.umedidaService.obtenerUnidades().subscribe({
      next: (data) => {
        this.unidadesDisponibles = data.map(u => u.unidad);
        this.mapaUnidades = Object.fromEntries(data.map(u => [u.unidad, u.descripcion]));
      },
      error: (err) => {
        console.error('Error al cargar unidades de medida:', err);
        this.unidadesDisponibles = [];
        this.mapaUnidades = {};
      }
    });

  }

  cargarGrupos(): void {
    this.grupoProductoService.obtenerGrupos().subscribe({
      next: (grupos) => {
        this.gcpBricksDisponibles = grupos.map(g => ({
          codigo: g.codigo,
          descripcion: g.desBrick,
          brick: g.brick,
          id_grupo_producto: g.id_grupo_producto
        }));
      },
      error: (err) => {
        console.error('Error al cargar GCP Bricks:', err);
        this.gcpBricksDisponibles = [];
      }
    });
  }

  mostrarAlerta(mensaje: string, tipo: string) {
    this._snackBar.open(mensaje, tipo, {
      horizontalPosition: "end",
      verticalPosition: "top",
      duration: 3000
    });
  }

  cargarClientePorId(id: number): void {
    this.clienteService.getClienteById(id).subscribe({
      next: (cliente) => {
        this.clienteE = cliente;
        this.id_grupo_producto = cliente.idGrupoProducto;
        console.log(this.id_grupo_producto);

        this.grupoProductoService.obtenerGrupoPorId(this.id_grupo_producto).subscribe(grupo => {
          this.codigoGrupo = grupo.codigo;
          this.desGrugo = grupo.desBrick;
          this.brick = grupo.brick;

          // ✅ Asignar al form correctamente
          this.formUV.get('categoria')?.setValue(this.desGrugo);

          console.log('Grupo producto:', grupo);
        });
      },
      error: (err) => {
        console.error('Error al obtener cliente:', err);
      }
    });
  }

  validarCeldasObligatorias(): boolean {

    let errorEncontrado = false;

    for (let i = 0; i < this.rowData.length; i++) {
      const fila = this.rowData[i];
      if (!fila) continue;

      const campos = ['descripcion', 'categoria', 'marca', 'contenidoNeto', 'contenidoUM', 'gcpBrick', 'pais'];


      for (const campo of campos) {
        const valor = fila[campo];

        if (!valor || valor.toString().trim() === '') {
          // Marca la celda como inválida (puedes usar una bandera en el objeto fila)
          fila[`_error_${campo}`] = true;

          if (!errorEncontrado) {
            this.botonGenerarDeshabilitado = false;
            this.botonGrabarDeshabilitado = true;
            this.mostrarAlerta('⚠️ Verifique, Campos en Blanco', 'Error');
            errorEncontrado = true;
          }

          break;
        } else {
          // Limpia errores anteriores si el valor es válido
          fila[`_error_${campo}`] = false;
        }
      }
    }

    this.rowData = [...this.rowData]; // Forzar refresco en la tabla si usas AG-Grid

    return !errorEncontrado;
  }

  onCellValueChanged(event: any): void {
    const field = event.colDef.field;
    const newValue = event.newValue;
    if (event.colDef.field === 'activo') {
      console.log(`Checkbox cambiado en fila ${event.rowIndex}:`, event.newValue);
    }
    // Si hay error y se corrige
    if (event.data[`_error_${field}`]) {
      if (newValue !== null && newValue !== undefined && newValue.toString().trim() !== '') {
        event.data[`_error_${field}`] = false;
      }
    }

    // Actualiza visual
    this.gridApi?.refreshCells({ rowNodes: [event.node], columns: [field] });
  }

  grabar(): void {
    this.mensaje = ''; // Limpia mensaje

    const msg = this.modoEdicion ? 'actualizado' : 'creados';

    this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: {
        title: '¿Desea confirmar?',
        message: `Los códigos seran ${msg}. ¿Está seguro?`,
        type: 'info',
        confirmText: 'Sí, confirmar',
        cancelText: 'Cancelar',
        showCancel: true
      }
    }).afterClosed().subscribe(resultado => {
      if (resultado === true) {
        // Aquí ejecutas el proceso real de grabado
        this.procesarGrabado();
        this.botonGrabarDeshabilitado = true;


      } else {
        console.log('❌ Usuario canceló grabado');
      }
    });
  }


  procesarGrabado(): void {
    const filas = this.rowData;
    if (filas.length === 0) return;

    this.totalAProcesar = filas.length;
    this.procesadosExitosos = 0;
    this.procesadosFallidos = 0;
    this.loadingMasivo = true;
    this.huboError = false;
    this.idsProductosCreados = [];

    const dialogRef = this.dialog.open(DialogProcesoComponent, {
      disableClose: true,
      width: '400px',
      data: {
        procesados: 0,
        total: this.totalAProcesar
      }
    });

    from(filas).pipe(
      mergeMap(fila => this.guardarProductoPromise(fila, dialogRef), 5), // ← máximo 5 procesos en paralelo
      toArray()
    ).subscribe({
      next: () => {
        this.loadingMasivo = false;
        dialogRef.close();

        if (this.huboError) {
          const eliminaciones = this.idsProductosCreados.map(id =>
            this.productoService.eliminarProducto(id).toPromise()
          );

          Promise.allSettled(eliminaciones).then(() => {
            this.dialog.open(CustomMessageBoxComponent, {
              width: '400px',
              data: {
                title: 'Error en procesamiento',
                message: '❌ Se detectaron errores. Todos los productos creados han sido eliminados para mantener la integridad.',
                type: 'error',
                confirmText: 'Aceptar'
              }
            });

            this.idsProductosCreados = [];
            this.rowData = [];
            this.formUV.reset();
          });

          return;
        }

        // Si todo fue exitoso, preparar para GTIN-14
        this.botonGenerarDeshabilitado = true;
        this.botonGrabarDeshabilitado = true;
        this.botonGenerar14Deshabilitado = false;
        this.botonGrabar14Deshabilitado = true;
        this.checkboxMaestroDeshabilitado = false;
        this.factorDeshabilitado = false;

        this.gridApi.ensureIndexVisible(0);
        this.gridApi.setFocusedCell(0, 'factor');

        this.mostrarAlerta('✅ Todos los productos fueron grabados correctamente.', 'Éxito');
        this.dialog.open(CustomMessageBoxComponent, {
          width: '400px',
          data: {
            title: '¿Desea continuar?',
            message: 'Todos los productos fueron grabados. ¿Desea generar los códigos GTIN-14 ahora?',
            type: 'info',
            confirmText: 'Sí, generar',
            cancelText: 'Cancelar',
            showCancel: true
          }
        }).afterClosed().subscribe(resultado => {
          if (resultado === true) {
            this.botonGenerar14Deshabilitado = false;
            this.botonGrabar14Deshabilitado = true;
            this.mostrarAlerta('✅ Puede continuar con GTIN-14.', 'Información');
          } else {
            this.mostrarAlerta('⚠️ Puede generar GTIN-14 luego desde el botón correspondiente.', 'Info');
          }
        });
      },
      error: () => {
        this.loadingMasivo = false;
        dialogRef.close();
        this.mostrarAlerta('❌ Error general durante el guardado.', 'Error');
      }
    });
  }




  guardarProductoPromise(fila: any, dialogRef: MatDialogRef<DialogProcesoComponent>): Promise<void> {
    return new Promise((resolve) => {
      this.guardarProducto(fila, () => {
        resolve();
      }, dialogRef);
    });
  }




generar14(): void {
  this.rowData = [...this.rowData];
  this.gridApi.setFocusedCell(0, 'factor');

  const algunSeleccionado = this.rowData.some(fila => fila.activo === true);
  if (!algunSeleccionado) {
    this.mostrarAlerta('⚠️ Debe seleccionar al menos un producto (checkbox).', 'Error');
    return;
  }

  if (!this.verificarFactor()) {
    return;
  }

  // 🕓 Mostrar cuadro de espera
  const dialogRef = this.dialog.open(DialogProcesoComponent, {
    disableClose: true,
    width: '400px',
    data: {
      procesados: 0,
      total: this.rowData.filter(f => f.activo).length
    }
  });

  this.verificarExistenciaCodbar().then(() => {
    dialogRef.close(); // ✅ Cerrar cuadro de espera

    const hayIndicadoresVacios = this.rowData.some(f =>
      f.activo === true && (!f.indicador || f.indicador.toString().trim() === '')
    );

    if (hayIndicadoresVacios) {
      this.mostrarAlerta('❌ Existen productos marcados sin indicador. Verifique antes de continuar.', 'Error');
      return;
    }

    this.generarDescripcionCompuesta();
    this.generarGtin14();

    this.botonGenerar14Deshabilitado = false;
    this.botonGrabar14Deshabilitado = false;
  }).catch(err => {
    dialogRef.close();
    console.error('❌ Error en verificarExistenciaCodbar', err);
    this.mostrarAlerta('Ocurrió un error durante la validación.', 'Error');
  });
}



  grabar14(): void {
    this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: {
        title: 'Confirmar',
        message: '¿Está seguro de generar los códigos GTIN-14?',
        type: 'info',
        confirmText: 'Sí, generar',
        cancelText: 'Cancelar',
        showCancel: true
      }
    }).afterClosed().subscribe(resultado => {
      if (resultado === true) {
        this.crearGtin14('Generando GTIN-14');
      } else {
        console.log('❌ Usuario canceló generación de GTIN-14');
      }
    });
  }

  guardarProducto(fila: any, onFinish: () => void, dialogRef: MatDialogRef<DialogProcesoComponent>): void {
    const cliente = this.clienteSeleccionado;
    const idPrefijo = this.formUV.value.gcp;
    const prefijo = this.prefijos.find(p => p.id_prefijos === idPrefijo);

    const nuevoProducto: ProductoRequest = {
      IdProducto: 0,
      Codpro: fila.gtinUv || '',
      Despro: fila.descripcion || '',
      Tippro: 'S',
      Codgru: 0,
      Codsec: 0,
      Coddep: 0,
      Codsub: 0,
      Coddiv: 0,
      Codmar: 0,
      Despro2: '',
      Uniman: fila.contenidoUM || '',
      Feccre: new Date().toISOString(),
      Colsab: '',
      Talla: '',
      Preven: 0,
      Preven2: 0,
      Precos: 0,
      Cospro: 0,
      Exiqty: 0,
      Exipdc: 0,
      Exipdv: 0,
      Exisic: 0,
      Fecsic: new Date().toISOString(),
      Refer: '',
      Codcuedeb: '',
      Codcuehab: '',
      Codcuedes: '',
      Codcuedev: '',
      Iva: '',
      Tipo: '',
      Preuni: '',
      Regalia: '',
      Inv: true,
      PrevenSinIva: 0,
      PagaIva: true,
      PagaRegalia: true,
      Desind: '',
      Codorigen: '',
      Codcol: 0,
      StockMax: 0,
      StockMin: 0,
      Espesor: 0,
      Largo: 0,
      Ancho: 0,
      Fechacad: '',
      Fechacad1: 0,
      Fabricante: 0,
      Obs: fila.observacion || '',
      Peso: false,
      Fecing: new Date().toISOString(),
      ValorUnidad: 0,
      Codsab: '',
      Fechamod: new Date().toISOString(),
      Tamanio: '',
      Modelo: '',
      Numserie: fila.serie || '',
      Coleccion: '',
      Temporada: '',
      Prepormayor: 0,
      PreAnterior: 0,
      CosAnterior: 0,
      DescCosto1: 0,
      DescCosto2: 0,
      DescCosto3: 0,
      DescCosto4: 0,
      Descuento: 0,
      PreRebaja: 0,
      PreRebajaAntes: 0,
      FecIniPro: new Date().toISOString(),
      FecFinPro: new Date().toISOString(),
      FecIniPro1: new Date().toISOString(),
      Codubi: '',
      FecFinPro1: new Date().toISOString(),
      FecPreAct: new Date().toISOString(),
      FecPreMod: new Date().toISOString(),
      FecCosAct: new Date().toISOString(),
      FecCosMod: new Date().toISOString(),
      CodNiv: '',
      CodColUbi: '',
      MargenUtilidad: 0,
      PvpSinIva: 0,
      PorcenRecepcion: 0,
      Stocks: true,
      Abrevia: '',
      Referencia: '',
      MargenAntes: 0,
      FecMarAntes: new Date().toISOString(),
      CantDecimal: true,
      CostSuminis: 0,
      CantConv: 0,
      CostHelado: 0,
      Receta: false,
      Activo: true,
      ClasProd: '',
      Foto: fila.urlFoto || '',
      AltoRiesgo: false,
      PGasto: false,
      CtaProdGasto: '',
      RegSanitario: '',
      IdEmpresa: this.usuarioActual?.id_empresa ?? 1,
      Codbar: fila.gtinUv || ''
    };

    this.productoService.crearProducto(nuevoProducto).subscribe({
      next: (productoCreado) => {
        const nuevoId = productoCreado.data;
        fila.idProducto = nuevoId;
        this.idsProductosCreados.push(nuevoId);

        const adicionales: ProductoDatosAdicionalesRequest = {
          IdProductoDatosAdicionales: 0,
          ClientesCodigo: cliente?.clientes_codigo || 0,
          IdPrefijos: prefijo?.id_prefijos || 0,
          IdTipoCodigoGs1: 1,
          IdGrupoProducto: fila.grupo || 0,
          Peso1: fila.peso || 0,
          IdUsuario: this.usuarioActual?.id_usuario ?? 1,
          Facturar: '',
          Nombre: 'CODIGO',
          Gtin: this.tipoGtin.toUpperCase() || '',
          Target: '',
          Marca: fila.marca.toUpperCase() || '',
          Autfuncion: '',
          Registros: '',
          Obsc: '',
          IdSector: 2,
          Contenido: (fila.contenidoNeto ?? '').toString(),
          Um: fila.contenidoUM || '',
          Brick: fila.brick || '',
          Pais: fila.pais || '',
          Url: '',
          Pum: '',
          Lum: '',
          Aum: '',
          Url2: '',
          Pais2: '',
          Pais3: '',
          Codint: '',
          Secto2: '',
          Sector3: '',
          SolFavorita: 0,
          SolRosado: 0,
          SolSantamaria: 0,
          SolTia: 0,
          SolAmazon: 0,
          SolGoogle: 0,
          SolEbay: 0,
          SolOtros: '',
          id_producto: nuevoId
        };
        console.log('📦 Datos adicionales a enviar:', adicionales);
        this.productoAdicionalService.crearProductoDatosAdicionales(adicionales).subscribe({
          next: () => {
            this.procesadosExitosos++;
            dialogRef.componentInstance.data.procesados = this.procesadosExitosos + this.procesadosFallidos;
            this.verificarFinalizacionProceso();
            onFinish();
          },
          error: (err) => {
            this.huboError = true;
            console.error(`❌ Error en datos adicionales para ${fila.gtinUv}:`, err);

            this.productoService.eliminarProducto(nuevoId).subscribe({
              complete: () => {
                console.warn(`🧹 Producto ${nuevoId} eliminado por fallo en datos adicionales.`);
                this.procesadosFallidos++;
                this.verificarFinalizacionProceso();
                onFinish();
              }
            });
          }
        });
      },
      error: (err) => {
        this.huboError = true;
        console.error(`❌ Error al crear producto ${fila.gtinUv}:`, err);
        this.procesadosFallidos++;
        this.verificarFinalizacionProceso();
        onFinish();
      }
    });
  }


  salir(): void {
    this.router.navigate(['/menuProductos/nuevoProducto']);
  }
  verificarFinalizacionProceso(): void {
    const total = this.procesadosExitosos + this.procesadosFallidos;
    if (total >= this.totalAProcesar) {
      this.procesandoMasivo = false;
      console.log(`✅ Proceso completado: ${this.procesadosExitosos} exitosos, ${this.procesadosFallidos} fallidos`);
      this.mostrarAlerta('Proceso masivo finalizado', '✔️');
    }
  }
  validarDescripcionRepetida(): boolean {
    const contador: Record<string, number> = {};
    const repetidas = new Set<string>();
    const listaMensajes: string[] = [];

    this.gridApi.forEachNode((node) => {
      const descripcion = (node.data?.descripcion || '').trim().toUpperCase();
      const marca = (node.data?.marca || '').trim().toUpperCase();
      const contenido = (node.data?.contenidoNeto || '').toString().trim().toUpperCase();
      const unidad = (node.data?.contenidoUM || '').trim().toUpperCase();

      const clave = `${descripcion}~${marca}~${contenido}~${unidad}`;
      if (!descripcion) return;

      contador[clave] = (contador[clave] || 0) + 1;
      if (contador[clave] > 1) {
        repetidas.add(clave);
      }
    });

    repetidas.forEach(clave => {
      const veces = contador[clave];
      const partes = clave.split('~');
      const mensaje = `"${partes[0]}" (marca: ${partes[1]}, contenido: ${partes[2]}, unidad: ${partes[3]}) se repite ${veces} veces`;
      listaMensajes.push(mensaje);
    });

    this.descripcionesRepetidas = repetidas;
    this.mensajeRepetidos = listaMensajes.join('\n');
    this.gridApi.redrawRows();

    return repetidas.size === 0;
  }

  verificarFactor(): boolean {
    let todoBien = true;

    this.gridApi.forEachNode((node) => {
      const data = node.data;
      const marcado = data.activo === true; // ← campo correcto
      const factor = (data.factor || '').toString().trim();

      if (marcado && !factor) {
        todoBien = false;
      }
    });

    if (!todoBien) {
      this.mostrarAlerta('❌ Debes ingresar el Factor para todos los productos marcados con GTIN 14.', 'Error');
    }

    return todoBien;
  }

  verificarExistenciaCodbar(): Promise<void> {
    const filas = this.rowData.filter(f => f.activo && f.gtinUv?.trim().length >= 12);

    return from(filas).pipe(
      mergeMap((fila) => {
        const codbar = fila.gtinUv.trim();

        return this.codigos14Service.contarPorCodbar(codbar).pipe(
          catchError(err => {
            console.error(`❌ Error al verificar GTIN ${codbar}:`, err);
            fila.indicador = '';
            return of(null);
          }),
          map((conteo: number | null) => {
            if (conteo === null) return;

            const total = conteo + 1;
            if (total >= 9) {
              this.mostrarAlerta(`❌ GTIN ${codbar}: ya existen 8 presentaciones.`, 'Error');
              fila.indicador = '';
            } else {
              fila.indicador = total;
            }
          })
        );
      }, 10) // ← ⚠️ Máximo 10 verificaciones en paralelo
    ).toPromise().then(() => {
      this.gridApi.refreshCells({ force: true, columns: ['indicador'] });
    });
  }


  generarDescripcionCompuesta(): void {
    this.gridApi.forEachNode((node) => {
      const data = node.data;
      if (data.activo !== true) return; // solo los marcados

      const descripcion = (data.descripcion || '').trim();
      const marca = (data.marca || '').trim();
      const contenido = (data.contenidoNeto || '').toString().trim();
      const unidad = (data.contenidoUM || '').trim();
      const factor = (data.factor || '').toString().trim();

      const t = this.formUV.get('t')?.value || '';
      const u = this.formUV.get('u')?.value || '';

      const texto = `${descripcion} ${marca} ${contenido} ${unidad} ${t} ${factor} ${u}`;

      node.setDataValue('descripciong', texto);
      this.gridApi.refreshCells({ rowNodes: [node], columns: ['descripciong'], force: true });
    });
  }

  generarGtin14(): void {
    this.gridApi.forEachNode((node) => {
      const data = node.data;
      if (!data.activo) return; // Solo genera para filas marcadas

      const indicador = (data.indicador || '').toString().trim();
      const gtinUv = (data.gtinUv || '').toString().trim();

      if (indicador.length !== 1 || gtinUv.length < 12) {
        console.warn(`❌ Datos inválidos en fila: indicador "${indicador}", gtinUv "${gtinUv}"`);
        return;
      }

      const base12 = gtinUv.substring(0, 12);
      const ean13 = indicador + base12;

      if (ean13.length !== 13) {
        console.warn(`❌ EAN13 mal formado: "${ean13}"`);
        return;
      }

      let iSum = 0;
      for (let i = 0; i < ean13.length; i++) {
        const digit = parseInt(ean13[i], 10);
        if (isNaN(digit)) continue;

        // 🔢 posiciones pares multiplican por 3 (empezando desde la izquierda en 0)
        iSum += (i % 2 === 0) ? digit * 3 : digit;
      }

      const checkDigit = (10 - (iSum % 10)) % 10;
      const gtin14 = ean13 + checkDigit.toString();

      node.setDataValue('gtin14', gtin14);
      this.gridApi.refreshCells({ rowNodes: [node], columns: ['gtin14'], force: true });
    });
  }

  private crearGtin14(msg: string): void {
    const filas = this.rowData.filter(f => f.activo === true);

    if (filas.length === 0) {
      this.mostrarAlerta('⚠️ No hay filas marcadas con GTIN 14 para guardar.', 'Advertencia');
      return;
    }

    this.totalAProcesar = filas.length;
    this.procesadosExitosos = 0;
    this.procesadosFallidos = 0;
    this.loadingMasivo = true;

    const dialogRef = this.dialog.open(DialogProcesoComponent, {
      disableClose: true,
      width: '400px',
      data: {
        procesados: 0,
        total: this.totalAProcesar
      }
    });

    from(filas).pipe(
      mergeMap(fila => this.guardarGtin14Promise(fila, dialogRef), 5), // máximo 5 en paralelo
      toArray()
    ).subscribe({
      next: () => {
        this.loadingMasivo = false;
        dialogRef.close();

        this.mostrarAlerta(
          `✅ GTIN-14 procesados: ${this.procesadosExitosos} exitosos, ${this.procesadosFallidos} fallidos.`,
          'Finalizado'
        );
        this.botonGenerar14Deshabilitado = true;
        this.botonGrabar14Deshabilitado = true;
      },
      error: (err) => {
        console.error('❌ Error inesperado al guardar GTIN-14:', err);
        this.loadingMasivo = false;
        dialogRef.close();
        this.mostrarAlerta('❌ Error general durante el guardado de GTIN-14.', 'Error');
      }
    });
  }

  private verificarFinalizacionProcesoGtin14(dialogRef: MatDialogRef<DialogProcesoComponent>): void {
    const total = this.procesadosExitosos + this.procesadosFallidos;

    if (total >= this.totalAProcesar) {
      this.loadingMasivo = false;
      dialogRef.close();

      this.mostrarAlerta(
        `✅ GTIN-14 procesados: ${this.procesadosExitosos} exitosos, ${this.procesadosFallidos} fallidos.`,
        'Finalizado'
      );

      // Aquí puedes deshabilitar botón si lo deseas:
      // this.botonGrabar14Deshabilitado = true;
    }
  }

  actualizarTipoGtin(valor: string, origen: 'nacional' | 'internacional'): void {
    this.tipoGtin = valor;

    // Opcional: limpiar el otro campo si se desea
    if (origen === 'internacional') {
      this.formUV.get('gtinNacionalSeleccionado')?.reset();
    } else {
      this.formUV.get('gtinInternacionalSeleccionado')?.reset();
    }
  }

  private guardarGtin14Promise(fila: any, dialogRef: MatDialogRef<DialogProcesoComponent>): Promise<void> {
    return new Promise((resolve) => {
      const nuevoCodigo14: Codigos14Request = {
        id_codigos14: 0,
        codbar: fila.gtinUv || '',
        id_prefijos: this.formUV.get('gcp')?.value || 0,
        clientes_codigo: this.clienteSeleccionado?.clientes_codigo ?? 0,
        presentacion: fila.indicador || '',
        unidad: fila.factor || 0,
        descripcion: fila.descripciong.toUpperCase() || '',
        g14: fila.gtin14 || '',
        largo: 0,
        ancho: 0,
        profundidad: 0,
        peso: 0,
        fecha: new Date().toISOString().slice(0, 10),
        foto: fila.urlFoto || '',
        activo: true,
        id_usuario: this.usuarioActual?.id_usuario ?? 0,
        codpro: fila.gtinUv || '',
        facturar: '',
        nombre: 'PRESENTACION:',
        gtin: 'GTIN14',
        target: '',
        marca: fila.marca || '',
        sector: 'Retail',
        referencia: '',
        abrevia: '',
        id_producto: fila.idProducto || 0
      };

      this.codigos14Service.createCodigo14(nuevoCodigo14).pipe(
        catchError(err => {
          console.error(`❌ Error al guardar GTIN-14 para ${fila.gtinUv}:`, err);
          console.warn('➡️ Objeto enviado:', nuevoCodigo14); // 👈 este muestra los datos enviados
          this.procesadosFallidos++;
          return of(null); // continúa el flujo
        })
      ).subscribe(() => {
        if (nuevoCodigo14.g14) this.procesadosExitosos++;
        dialogRef.componentInstance.data.procesados = this.procesadosExitosos + this.procesadosFallidos;
        resolve();
      });
    });
  }

  generar12(): void {
    const idSeleccionado = this.formUV.value.gcp;
    const objeto = this.prefijos.find(p => p.id_prefijos === idSeleccionado);
    const prefijo = objeto?.codpre || '';
    const serie = this.formUV.get('serie')?.value || '';
    this.npais = ''; // nacional, sin prefijo país

    if (this.tipoGtin !== 'upc' || this.bandera !== 2) return;
    if (!this.validarCeldasObligatorias()) return;

    const sinRepetidos = this.validarDescripcionRepetida();
    if (!sinRepetidos) {
      this.mostrarAlerta('⚠️ Descripciones Repetidas.', 'Error');
      return;
    }

    this.generacionCodigosService.obtenerSecuenciaUpc(prefijo, this.npais).subscribe({
      next: (resp: SecuenciaResponse) => {
        const longitudPrefijo = prefijo.length;
        const longitudSecuencia = 11 - longitudPrefijo;

        if (longitudSecuencia <= 0) {
          alert(`⚠️ Prefijo demasiado largo (${longitudPrefijo} dígitos). No se puede generar GTIN-12 válido.`);
          return;
        }

        const secuenciaInicial = serie !== '' ? parseInt(serie, 10) : resp.data;
        if (!this.validarAfiliacion(secuenciaInicial)) return;

        const maxCodigos = Math.pow(10, longitudSecuencia);
        if (this.rowData.length > maxCodigos) {
          alert(`⚠️ Solo se pueden generar ${maxCodigos} códigos con prefijo de ${longitudPrefijo} dígitos. Se recortarán automáticamente.`);
          this.rowData = this.rowData.slice(0, maxCodigos);
        }

        const filasValidas = this.rowData.map((fila, i) => {
          const secuencia = (secuenciaInicial + i).toString().padStart(longitudSecuencia, '0');
          const codigo11 = prefijo + secuencia;
          const dv = this.calcularDigitoVerificadorGtin12(codigo11);
          const gtinCompleto = codigo11 + dv;
          fila.gtinUv = gtinCompleto;
          return { index: i, gtin: gtinCompleto };
        });

        // Mostrar pantalla de espera
        const dialogRef = this.dialog.open(DialogProcesoComponent, {
          disableClose: true,
          width: '400px',
          data: {
            procesados: 0,
            total: filasValidas.length
          }
        });

        let existeRepetido = false;
        const repetidos: string[] = [];

        from(filasValidas).pipe(
          concatMap((fila, i) =>
            this.productoService.buscarPorCodbar(fila.gtin).pipe(
              map(producto => {
                if (producto) {
                  existeRepetido = true;
                  repetidos.push(fila.gtin);
                  this.rowData[fila.index]._duplicadoGtinUv = true;
                } else {
                  this.rowData[fila.index]._duplicadoGtinUv = false;
                }
                dialogRef.componentInstance.data.procesados = i + 1;
              })
            )
          )
        ).subscribe({
          complete: () => {
            dialogRef.close();

            if (existeRepetido) {
              const lista = repetidos.map(r => `🔴 ${r}`).join('\n');
              this.mostrarAlerta(`⚠️ Los siguientes GTIN ya existen en la base de datos:\n\n${lista}`, 'Duplicados encontrados');
              this.botonGenerarDeshabilitado = false;
              this.botonGrabarDeshabilitado = true;
            } else {
              // Asignar el primer GTIN al formulario
              const primerSecuencia = secuenciaInicial.toString().padStart(longitudSecuencia, '0');
              const primerCodigo11 = prefijo + primerSecuencia;
              const primerDv = this.calcularDigitoVerificadorGtin12(primerCodigo11);
              this.formUV.get('gtinUv')?.setValue(primerCodigo11 + primerDv);

              this.botonGenerarDeshabilitado = true;
              this.botonGrabarDeshabilitado = false;
            }

            this.mensaje = resp.message;
            this.secuencia = secuenciaInicial;
            this.rowData = [...this.rowData]; // Forzar actualización visual
            this.gridApi.refreshCells({ force: true, columns: ['gtinUv'] });
          },
          error: (err) => {
            dialogRef.close();
            console.error('❌ Error durante validación en base', err);
            this.mensaje = 'Error al validar GTINs en base de datos';
            this.mostrarAlerta('Error al validar GTINs en la base de datos.', 'Error');
          }
        });
      },
      error: (err) => {
        console.error('❌ Error al obtener secuencia', err);
        this.mensaje = 'Error al generar la secuencia';
      }
    });
  }




  calcularDigitoVerificadorGtin12(codigo11: string): string {
    let suma = 0;
    for (let i = 0; i < 11; i++) {
      const digito = parseInt(codigo11.charAt(i), 10);
      suma += i % 2 === 0 ? digito * 3 : digito;
    }
    const resto = suma % 10;
    const digitoVerificador = resto === 0 ? 0 : 10 - resto;
    return digitoVerificador.toString();
  }

  recupera12() {
    const soloCopiarGtin = this.tipoGtin === 'upc' && this.formUV.get('checkExiste')?.value;
    if (!soloCopiarGtin) return;

    const observables = [];
    const filaLimite = this.rowData.length;

    for (let i = 0; i < filaLimite; i++) {
      const fila = this.rowData[i];
      const codbar = fila.gtinUv?.trim();
      if (!codbar) continue;

      const obs$ = this.productoService.buscarPorCodbar(codbar).pipe(
        map((producto) => {
          if (producto) {
            fila.descripcion = fila.descripcion?.trim() || producto.Despro || '';
            fila.marca = fila.marca?.trim() || producto.marca || '';
            fila.contenidoNeto = fila.contenidoNeto?.toString().trim() || producto.contenido || '';
            fila.contenidoUM = fila.contenidoUM?.trim() || producto.unidad || 'g';
            fila.categoria = fila.categoria?.trim() || producto.codigoproducto || '';
            fila.gcpBrick = fila.gcpBrick?.trim() || producto.brick || '';
            fila.pais = fila.pais?.trim() || producto.pais || 'ECUADOR';
            fila.grupo = fila.grupo || (isNaN(Number(producto.idgrupoproducto)) ? 0 : Number(producto.idgrupoproducto));
            fila.idProducto = fila.idProducto || producto.IdProducto;
          } else {
            // Producto no encontrado: solo llenar si están vacíos
            fila.descripcion = fila.descripcion?.trim() || 'NO EXISTE';
            fila.marca = fila.marca?.trim() || 'NO EXISTE';
            fila.contenidoNeto = fila.contenidoNeto || '';
            fila.contenidoUM = fila.contenidoUM || 'g';
            fila.categoria = fila.categoria || '';
            fila.gcpBrick = fila.gcpBrick || '';
            fila.pais = fila.pais || 'ECUADOR';
            fila.grupo = fila.grupo || 0;
            fila.idProducto = fila.idProducto || null;
          }
          return true;
        }),
        catchError((err) => {
          console.warn(`⚠️ Error con codbar ${codbar}`, err);
          fila.descripcion = fila.descripcion?.trim() || 'NO EXISTE';
          fila.marca = fila.marca?.trim() || 'NO EXISTE';
          fila.contenidoNeto = fila.contenidoNeto || '';
          fila.contenidoUM = fila.contenidoUM || 'g';
          fila.categoria = fila.categoria || '';
          fila.gcpBrick = fila.gcpBrick || '';
          fila.pais = fila.pais || 'ECUADOR';
          fila.grupo = fila.grupo || 0;
          fila.idProducto = fila.idProducto || null;
          return of(false);
        })
      );

      observables.push(obs$);
    }

    forkJoin(observables).subscribe(() => {
      this.rowData = [...this.rowData]; // Refrescar AG-Grid

      const camposIncompletos = this.rowData.some(fila =>
        !fila.descripcion || !fila.marca || !fila.contenidoNeto || !fila.categoria
      );

      if (camposIncompletos) {
        this.mostrarAlerta('⚠️ Algunos productos tienen campos vacíos. Revise las filas antes de continuar.', 'Advertencia');
        return;
      }

      const msg = this.modoEdicion ? 'actualizados' : 'generar';

      this.dialog.open(CustomMessageBoxComponent, {
        width: '400px',
        data: {
          title: '¿Desea confirmar?',
          message: `Quiere ${msg} GTIN 14. ¿Está seguro?`,
          type: 'info',
          confirmText: 'Sí, confirmar',
          cancelText: 'Cancelar',
          showCancel: true
        }
      }).afterClosed().subscribe(resultado => {
        if (resultado === true) {
          this.botonGenerarDeshabilitado = true;
          this.botonGrabarDeshabilitado = true;
          this.botonGenerar14Deshabilitado = false;
          this.botonGrabar14Deshabilitado = true;

          this.gridApi.ensureIndexVisible(0);
          this.gridApi.ensureColumnVisible('factor');
          this.gridApi.setFocusedCell(0, 'factor');
          this.checkboxMaestroDeshabilitado = false;
          this.factorDeshabilitado = false;
        } else {
          console.log('❌ Usuario canceló generación GTIN-14');
        }
      });
    });
  }
generar12i(): void {
  const filasValidas = this.rowData.map((fila, index) => {
    const gtinBase = (fila.gtinUv || '').toString().substring(0, 11).padStart(11, '0');

    if (gtinBase.length === 11 && /^\d{11}$/.test(gtinBase)) {
      const dv = this.calcularDigitoVerificadorGtin12(gtinBase);
      const gtinCompleto = gtinBase + dv;
      fila.gtinUv = gtinCompleto;
      return { index, gtin: gtinCompleto };
    } else {
      console.warn(`❌ Fila ${index + 1}: GTIN-12 base inválido →`, fila.gtinUv);
      return null;
    }
  }).filter(Boolean) as { index: number; gtin: string }[];

  if (filasValidas.length === 0) {
    this.mostrarAlerta('⚠️ No hay GTIN-12 válidos para procesar.', 'Validación');
    return;
  }

  const dialogRef = this.dialog.open(DialogProcesoComponent, {
    disableClose: true,
    width: '400px',
    data: {
      procesados: 0,
      total: filasValidas.length
    }
  });

  let existeRepetido = false;
  const repetidos: string[] = [];

  from(filasValidas).pipe(
    concatMap((fila, i) =>
      this.productoService.buscarPorCodbar(fila.gtin).pipe(
        map(producto => {
          if (producto) {
            existeRepetido = true;
            repetidos.push(fila.gtin);
            this.rowData[fila.index]._duplicadoGtinUv = true;
          } else {
            this.rowData[fila.index]._duplicadoGtinUv = false;
          }

          dialogRef.componentInstance.data.procesados = i + 1;
        })
      )
    )
  ).subscribe({
    complete: () => {
      dialogRef.close();

      if (existeRepetido) {
        const lista = repetidos.map(r => `🔴 ${r}`).join('\n');
        this.mostrarAlerta(`⚠️ Los siguientes GTIN-12 ya existen en la base de datos:\n\n${lista}`, 'Duplicados encontrados');
        this.botonGenerarDeshabilitado = false;
        this.botonGrabarDeshabilitado = true;
      } else {
        this.botonGenerarDeshabilitado = true;
        this.botonGrabarDeshabilitado = false;
      }

      this.rowData = [...this.rowData];
      this.gridApi.refreshCells({ force: true, columns: ['gtinUv'] });
    },
    error: (err) => {
      dialogRef.close();
      console.error('❌ Error durante validación en base', err);
      this.mostrarAlerta('Error al validar GTIN-12 en la base de datos.', 'Error');
    }
  });
}

}
