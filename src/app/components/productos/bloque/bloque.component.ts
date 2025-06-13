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
@Component({
  selector: 'app-bloque',
  templateUrl: './bloque.component.html',
  styleUrls: ['./bloque.component.css']
})
export class BloqueComponent implements OnInit {
  @ViewChild('pasteCatcher') pasteCatcher!: ElementRef<HTMLTextAreaElement>;



  defaultColDef: ColDef = { editable: true, resizable: true, flex: 1 };
  rowData: any[] = [];
  columnDefs: ColDef[] = [];

  cantidadFilas = 0;
  textoPegado: string = '';
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

  private gridApi!: GridApi;


  gridOptions: GridOptions = {
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


  ) {
    this.formUV = this.fb.group({
      gcp: ['', Validators.required],
      serie: [''],
      gtinUv: [''],
      codigoCliente: [''],
      cliente: [''],
      ruc: [''],
      gtinNacionalSeleccionado: ['gtin13'],
      gtinInternacionalSeleccionado: [''],
      usarSerie: [false],
      gln: [''],
      categoria: [''],
      t: ['CAJA'],
      u: ['UNIDADES']
    });
  }

  ngOnInit(): void {
    window.onerror = function (message, source, lineno, colno, error) {
      console.error("🔴 Uncaught Error:", message, "at", source + ':' + lineno + ':' + colno);
    };

    this.gridOptions.context = {
      componentParent: this
    };
    this.cargarCliente();
    this.cargarUnidades();
    this.cargarGrupos();
    this.columnDefs = [
      { headerName: '#', valueGetter: 'node.rowIndex + 1', width: 60 },
      { field: 'gtinUv', headerName: 'GTIN UV', editable: true, cellStyle: { backgroundColor: 'yellow' }, width: 150, minWidth: 150 },
      {
        field: 'descripcion',
        headerName: 'Descripción',
        editable: true,
        cellStyle: this.estiloDescripcionVacia, width: 300, minWidth: 300
      },
      {
        field: 'categoria',
        headerName: 'Categoría',
        editable: true,
        cellEditor: 'gcpBrickAutocompleteEditor',
        cellEditorPopup: true, // ✅ Este es el más importante
        cellStyle: this.estiloDescripcionVacia, width: 100, minWidth: 100

      },
      { field: 'marca', headerName: 'Marca', editable: true, cellStyle: this.estiloDescripcionVacia, width: 100, minWidth: 100 },
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
      { field: 'factor', headerName: 'Factor', cellStyle: this.estiloDescripcionVacia, width: 80, minWidth: 80, colId: 'factor' },
      { field: 'indicador', headerName: 'Indicador', cellStyle: this.estiloDescripcionVacia, width: 100, minWidth: 100, colId: 'indicador' },
      { field: 'descripciong', headerName: 'Descripción', cellStyle: this.estiloDescripcionVacia, width: 200, minWidth: 200, colId: 'descripciong' },
      { field: 'grupo', headerName: 'grupo', cellStyle: this.estiloDescripcionVacia, width: 150, minWidth: 150, colId: 'grupo' },

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
        pais: 'EC',
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
    this.mensaje = '';
    this.formUV.get('gtinNacionalSeleccionado')?.setValue('gtin13');
    this.botonGenerarDeshabilitado = false;
    this.botonGrabarDeshabilitado = true;
    this.botonGenerar14Deshabilitado = true;
    this.botonGrabar14Deshabilitado = true;
    this.checkboxMaestroDeshabilitado = true;
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

    const pais = gtin === 'gtin13' ? '786' : '';

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

    const serie = this.formUV.get('serie')?.value || '';

    if (!this.validarCeldasObligatorias()) return;


    this.npais = '786';

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




  pegarColumnaGtinUv(): void {
    if (!this.textoPegado.trim()) {
      this.mostrarAlerta('⚠️ No hay datos para pegar.', 'Error');

      return;
    }

    const lineas = this.textoPegado.trim().split('\n');
    const limite = Math.min(lineas.length, this.rowData.length);

    for (let i = 0; i < limite; i++) {
      const columnas = lineas[i].split('\t').map(c => c.trim());
      const fila = this.rowData[i];
      let idx = 0;

      if (!this.copiarDesdeColumna2) {
        fila.gtinUv = columnas[idx++] || '';
      }

      fila.descripcion = columnas[idx++] || '';
      fila.marca = columnas[idx++] || '';
      fila.contenidoNeto = columnas[idx++] || '';
      fila.contenidoUM = columnas[idx++] || 'g';
      fila.categoria = this.codigoGrupo;
      fila.gcpBrick = this.brick;
      fila.pais = 'EC';
      fila.grupo = this.id_grupo_producto;
    }

    this.rowData = [...this.rowData];
    this.textoPegado = '';
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
    }
    return {}; // sin estilo si tiene valor
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
        type: 'question',
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
  const total = filas.length;

  if (total === 0) return;

  this.totalAProcesar = total;
  this.procesadosExitosos = 0;
  this.procesadosFallidos = 0;
  this.loadingMasivo = true;

  const dialogRef = this.dialog.open(DialogProcesoComponent, {
    disableClose: true,
    width: '400px',
    data: {
      procesados: 0,
      total: total
    }
  });

  const tareas: Promise<void>[] = filas.map(fila => {
    return new Promise<void>((resolve) => {
      this.guardarProducto(fila, resolve, dialogRef);
    });
  });

  Promise.all(tareas).then(() => {
    this.loadingMasivo = false;

    dialogRef.close(); // ✅ Cerrar el dialogo de progreso al finalizar

    const msg = this.modoEdicion ? 'actualizados' : 'generar';

    this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: {
        title: '¿Desea confirmar?',
        message: `Quiere ${msg} GTIN 14. ¿Está seguro?`,
        type: 'question',
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
      } else {
        console.log('❌ Usuario canceló generación GTIN-14');
      }
    });
  });
}


  generar14() {

  }
  grabar14() {

  }

guardarProducto(fila: any, onFinish: () => void, dialogRef: MatDialogRef<DialogProcesoComponent>): void {

    const cliente = this.clienteSeleccionado;

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
        const idSeleccionado = this.formUV.value.gcp;
        const objeto = this.prefijos.find(p => p.id_prefijos === idSeleccionado);

        const adicionales: ProductoDatosAdicionalesRequest = {
          IdProductoDatosAdicionales: 0,
          ClientesCodigo: cliente?.clientes_codigo || 0,
          IdPrefijos: objeto?.id_prefijos || 0,
          IdTipoCodigoGs1: 1,
          IdGrupoProducto: fila.grupo || 0,
          Peso1: fila.peso || 0,
          IdUsuario: this.usuarioActual?.id_usuario ?? 1,
          Facturar: '',
          Nombre: fila.descripcion || '',
          Gtin: fila.gtinUv || '',
          Target: '',
          Marca: fila.marca || '',
          Autfuncion: '',
          Registros: '',
          Obsc: '',
          IdSector: 2,
          Contenido: fila.contenidoNeto || '',
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

        this.productoAdicionalService.crearProductoDatosAdicionales(adicionales).subscribe({
          next: () => {
            this.procesadosExitosos++;
            dialogRef.componentInstance.data.procesados = this.procesadosExitosos + this.procesadosFallidos;
            this.verificarFinalizacionProceso();
            onFinish();

          },
          error: (err) => {
            // ❌ Falla en datos adicionales → eliminar producto base
            this.productoService.eliminarProducto(nuevoId).subscribe({
              next: () => {
                console.warn(`🧹 Producto ${nuevoId} eliminado por error en datos adicionales.`);
              },
              error: () => {
                console.error(`❌ Falló intento de eliminar producto ${nuevoId} luego del error.`);
              },
              complete: () => {
                this.procesadosFallidos++;
                this.verificarFinalizacionProceso();
                onFinish();
              }
            });
          }
        });
      },
      error: (err) => {
        console.error('❌ Error al crear producto:', err);
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



}
