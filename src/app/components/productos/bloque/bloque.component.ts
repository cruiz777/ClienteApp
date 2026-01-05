import { Component, HostListener, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ColDef, GridApi, ModuleRegistry, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { Observable } from 'rxjs';
import { firstValueFrom } from 'rxjs';
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
import { JsonBloqueService } from 'src/app/services/json-bloque.service';
import { ParametrosFacturaService } from 'src/app/services/parametros-factura.service';
@Component({
  selector: 'app-bloque',
  templateUrl: './bloque.component.html',
  styleUrls: ['./bloque.component.css']
})
export class BloqueComponent implements OnInit {
  @ViewChild('pasteCatcher') pasteCatcher!: ElementRef<HTMLTextAreaElement>;



  defaultColDef: ColDef = { editable: true, resizable: true, sortable: false, flex: 1 ,
  headerClass: 'header-uv' };
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
  checkIndicador: boolean = false;

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
  onCellValueChanged: this.onCellValueChanged.bind(this),

  // 👇 forzamos event: any para evitar problemas de tipos con AG Grid
  onCellKeyDown: (event: any) => {
    const kb = event.event as KeyboardEvent;
    if (!kb) { return; }

    // Sacamos el field de forma segura
    const colDef = event.colDef || event.column?.getColDef?.();
    const field: string | null = colDef?.field ?? null;

    if (!field) {
      return; // nada que validar si no hay field
    }

    // ✅ Teclas de control que siempre se permiten
    const allowedControlKeys = [
      'Backspace', 'Tab', 'ArrowLeft', 'ArrowRight',
      'ArrowUp', 'ArrowDown', 'Delete', 'Home', 'End', 'Enter'
    ];

    // Ctrl + C / V / X / A → permitir
    if (kb.ctrlKey && ['c', 'v', 'x', 'a'].includes(kb.key.toLowerCase())) {
      return;
    }

    // ==============================
    // 🔹 C.Neto → solo número + 1 punto
    // ==============================
    if (field === 'contenidoNeto') {
      const key = kb.key;

      // dígitos → OK
      if (/^\d$/.test(key)) { return; }

      // permitir un solo punto
      if (key === '.') {
        const data = event.data || {};
        const current = (data['contenidoNeto'] ?? '').toString();
        if (!current.includes('.')) {
          return; // aún no tiene punto → lo dejamos pasar
        }
      }

      // teclas de control → OK
      if (allowedControlKeys.includes(key)) { return; }

      // todo lo demás (coma, letras, signos, etc.) se bloquea
      kb.preventDefault();
      return;
    }

    // ==============================
    // 🔹 factor / indicador → solo enteros
    // ==============================
    if (field === 'factor' || field === 'indicador') {
      const key = kb.key;

      // dígitos 0–9 → OK
      if (/^\d$/.test(key)) { return; }

      // teclas de control → OK
      if (allowedControlKeys.includes(key)) { return; }

      // bloquear punto, coma, letras, etc.
      kb.preventDefault();
      return;
    }

    // otras columnas → sin restricciones
  },

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
  api: string = '';
  claveApi: string = '';
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
    private jsonBloqueService: JsonBloqueService,
    private parametrosFacturaService: ParametrosFacturaService

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
    this.cargarParametroFacturaPorId(98);
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
        tooltipValueGetter: this.tooltipRepetido, // si usas tooltip
        cellClassRules: {
          'celda-repetida': (params) => {
            const descripcion = (params.data?.descripcion || '').trim().toUpperCase();
            const marca = (params.data?.marca || '').trim().toUpperCase();
            const contenido = (params.data?.contenidoNeto || '').toString().trim().toUpperCase();
            const unidad = (params.data?.contenidoUM || '').trim().toUpperCase();
            const clave = `${descripcion}~${marca}~${contenido}~${unidad}`;
            return this.descripcionesRepetidas.has(clave);
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
        editable: true,
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
onPasteExcelToGrid(event: ClipboardEvent): void {
  // 1️⃣ Si no tenemos gridApi todavía, salimos
  if (!this.gridApi) {
    return;
  }

  // 2️⃣ Detectar si el foco está dentro del grid
  const activeElement = document.activeElement as HTMLElement | null;
  const target = (event.target as HTMLElement | null) ?? activeElement;

  const estaDentroDelGrid =
    !!target &&
    !!target.closest('.ag-root');

  // 3️⃣ Si NO está dentro del grid y tampoco tenemos columna seleccionada,
  //    no hacemos nada. Pero si hay selectedColKey, sí permitimos pegar.
  if (!estaDentroDelGrid && !this.selectedColKey) {
    return;
  }

  const clipboardData = event.clipboardData || (window as any).clipboardData;
  if (!clipboardData) {
    return;
  }

  const text: string = clipboardData.getData('text/plain');
  if (!text) {
    return;
  }

  event.preventDefault();

  const rows: string[] = text
    .split(/\r?\n/)
    .filter((r: string) => r.trim() !== '');

  if (!rows.length) {
    return;
  }

  // 🔎 Si hay celda con foco, usamos esa.
  //    Si no, usamos la columna seleccionada desde el encabezado.
  const focus = this.gridApi.getFocusedCell();

  let startRowIndex: number;
  let startField: string | null;

  if (focus) {
    startRowIndex = focus.rowIndex ?? 0;
    startField = focus.column.getColDef().field ?? null;
  } else if (this.selectedColKey) {
    startRowIndex = 0;
    startField = this.selectedColKey;
  } else {
    this.mostrarAlerta(
      '⚠️ Seleccione primero una celda o encabezado de columna en la grilla.',
      'Info'
    );
    return;
  }

  if (!startField) {
    this.mostrarAlerta('⚠️ La columna seleccionada no admite pegado.', 'Info');
    return;
  }

  // 🔹 columnas que permiten pegado
  const allowedPasteFields: string[] = [
    'gtinUv',
    'descripcion',
    'categoria',
    'gcpBrick',
    'marca',
    'contenidoNeto',
    'contenidoUM',
    'factor',
    'indicador'
  ];

  const pasteableFields: string[] = this.columnDefs
    .filter(col => !!col.field && allowedPasteFields.includes(col.field as string))
    .map(col => col.field!) as string[];

  const startColIndex: number = pasteableFields.indexOf(startField);
  if (startColIndex === -1) {
    this.mostrarAlerta('⚠️ La columna seleccionada no admite pegado.', 'Info');
    return;
  }

  // 🔹 listas de valores válidos
  const unidadesValidas = this.unidadesDisponibles; // UM
  const categoriasValidas = this.gcpBricksDisponibles.map(g => g.codigo + ''); // Categoria (código)

  const updated = [...this.rowData];

  rows.forEach((rowText: string, rIdx: number) => {
    const cells: string[] = rowText.split('\t');
    const rowIndex: number = startRowIndex + rIdx;

    if (rowIndex >= updated.length) {
      return;
    }

    const row: any = updated[rowIndex] ?? (updated[rowIndex] = {});

    cells.forEach((cellValue: string, cIdx: number) => {
      const colIndex: number = startColIndex + cIdx;
      if (colIndex >= pasteableFields.length) {
        return;
      }

      const field: string = pasteableFields[colIndex];
      const raw = (cellValue ?? '').trim();

      switch (field) {
        case 'contenidoNeto': {
          // Solo números con punto: 12 o 12.3 (NO coma)
          const regexNumero = /^\d+(\.\d+)?$/;
          if (raw !== '' && regexNumero.test(raw)) {
            row[field] = parseFloat(raw);
          }
          // Si no cumple, NO se asigna nada (mantiene lo que tenía)
          break;
        }

        case 'factor':
        case 'indicador':
          // Solo enteros positivos
          if (/^\d+$/.test(raw)) {
            row[field] = parseInt(raw, 10);
          }
          break;

        case 'contenidoUM':
          // Solo unidades que EXISTEN en el combo
          if (unidadesValidas.includes(raw)) {
            row[field] = raw;
          }
          break;

        case 'categoria':
          // Solo categorías que EXISTEN en el combo (código)
          if (categoriasValidas.includes(raw)) {
            row[field] = raw;
          }
          break;

        default:
          // Otras columnas se pegan tal cual
          row[field] = raw;
          break;
      }
    });
  });

  this.rowData = updated;
  this.gridApi.refreshCells({ force: true });
  this.gridApi.redrawRows();
}


  async generarFilas(): Promise<void> {

    if (!this.cantidadFilas || this.cantidadFilas <= 0) return;
    // const cantidad = Number(this.formUV.get('cantidadFilas')?.value) || 0;
     const idSeleccionado = this.formUV.value.gcp;
    const objeto = this.prefijos.find(p => p.id_prefijos === idSeleccionado);
    const prefijo = objeto?.codpre || '';
    debugger
  const ok = await firstValueFrom(this.validarCantidadPorPrefijo(prefijo, this.cantidadFilas));
  if (!ok) return
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
  const gtin = this.formUV.get('gtinNacionalSeleccionado')?.value; // GTIN-13 | GTIN-8 | UPC
  const gcpId = this.formUV.get('gcp')?.value;

  const prefijo = this.prefijos.find(p => p.id_prefijos === gcpId);
  if (!prefijo) return;
  debugger
  // Ecuador = 786 solo para GTIN-13
  const pais = gtin === 'GTIN-13' ? '786' : '';

  // Si no usa serie → limpiar y salir
  if (!usarSerie) {
    this.formUV.get('serie')?.reset();
    return;
  }

  // LÓGICA DE GTIN
  if (gtin === 'UPC') {
    // UPC = GTIN-12 → usar secuencia UPC
    this.generacionCodigosService.obtenerSecuenciaUpc(prefijo.codpre, pais).subscribe({
      next: (resp: SecuenciaResponse) => {
        this.formUV.get('serie')?.setValue(resp.data);
      },
      error: (err) => console.error('Error secuencia UPC:', err)
    });
    return;
  }

  if (gtin === 'GTIN-13') {
    // GTIN-13 nacional → secuencia normal
    this.generacionCodigosService.obtenerSecuencia(prefijo.codpre, pais).subscribe({
      next: (resp: SecuenciaResponse) => {
        this.formUV.get('serie')?.setValue(resp.data);
      },
      error: (err) => console.error('Error secuencia GTIN-13:', err)
    });
    return;
  }

  // Otros GTIN → no generan serie
  this.formUV.get('serie')?.reset();
}


  generar(): void {
    debugger
    this.commitGridChanges(); 
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

    if (this.tipoGtin === 'GTIN-13' && checkExiste === false && this.bandera === 0) {
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
    } else if (this.tipoGtin === 'GTIN-12I' && checkExiste === false) {
      console.log('✅ GTIN-12 y checkExiste es verdadero');
      this.generar12i();
    } else if (this.tipoGtin === 'GTIN-13' && checkExiste === false && this.bandera === 2) {
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
    debugger
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
          console.log('📦 Producto recibido del backend:', producto);
          if (producto) {
            fila.descripcion = fila.descripcion?.trim() || producto.Despro || '';
            fila.marca = fila.marca?.trim() || producto.marca || '';
            fila.contenidoNeto =  producto.contenido || '';
            fila.contenidoUM = producto.unidad || 'g';
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

      // if (camposIncompletos) {
      //   this.mostrarAlerta('⚠️ Algunos productos tienen campos vacíos. Revise las filas antes de continuar.', 'Advertencia');
      //   return;
      // }

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
            fila.contenidoNeto =  producto.contenido || '';
            fila.contenidoUM = producto.unidad || 'g';
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

      // if (camposIncompletos) {
      //   this.mostrarAlerta('⚠️ Algunos productos tienen campos vacíos. Revise las filas antes de continuar.', 'Advertencia');
      //   return;
      // }

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
            fila.contenidoNeto =  producto.contenido || '';
            fila.contenidoUM = producto.unidad || 'g';
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

      // if (camposIncompletos) {
      //   this.mostrarAlerta('⚠️ Algunos productos tienen campos vacíos. Revise las filas antes de continuar.', 'Advertencia');
      //   return;
      // }

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

/** Lee el prefijo (codpre) según el id seleccionado en el form */
private getPrefijoSeleccionado(): string {
  const idPrefijo = this.formUV.get('gcp')?.value;
  const prefijo = this.prefijos.find(p => p.id_prefijos === idPrefijo);
  return (prefijo?.codpre ?? '').toString().trim();
}

/** Valida que la cantidad de filas (this.rowData.length) no supere el máximo
 *  permitido según bandera y longitud del prefijo. Solo recibe el prefijo.
 *  - bandera === 0  (GTIN-13 con país 786):
 *      len 8 → máx 10, len 7 → 100, len 6 → 1000, len 5 → 10000
 *  - bandera === 2  (UPC-12 sin país):
 *      secLen = 11 - len  → máx = 10^secLen   (len permitido: 5..7)
 */
/** Valida que 'cantidad' no supere el máximo permitido según bandera y longitud del prefijo.
 *  - bandera === 0  (GTIN-13 con país 786):
 *      len=8 → máx 10, len=7 → 100, len=6 → 1000, len=5 → 10000
 *  - bandera === 2  (UPC-12 sin país):
 *      secLen = 11 - len  → máx = 10^secLen   (len permitido: 5..7)
 */
private validarCantidadPorPrefijo(prefijo: string, cantidad: number) {
  const limpio = (prefijo ?? '').trim();
  const len = limpio.length;

  if (!limpio) {
    this.mostrarAlerta('⚠️ Debe ingresar un prefijo.', 'Error');
    return of(false);
  }
  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    this.mostrarAlerta('⚠️ Ingrese una cantidad válida de productos a codificar.', 'Error');
    return of(false);
  }

  // País según bandera
  const pais = this.bandera === 0 ? '786' : (this.bandera === 2 ? '' : null);
  if (pais === null) {
    this.mostrarAlerta('⚠️ Bandera desconocida para validar cantidad.', 'Error');
    return of(false);
  }

  // Regla de longitudes y máximo teórico por prefijo
  let maxTeorico = 0;
  debugger
  if (this.bandera === 0) {            // GTIN-13 (con 786)
    if (len < 5 || len > 8) {
      this.mostrarAlerta('⚠️ Para GTIN-13 el prefijo debe tener entre 5 y 8 dígitos.', 'Error');
      return of(false);
    }
    const maxPorLen: Record<number, number> = { 8: 10, 7: 100, 6: 1000, 5: 10000 };
    maxTeorico = maxPorLen[len];
  }

  if (this.bandera === 2) {            // UPC-12 (sin 786)
    if (len < 5 || len > 8) {
      this.mostrarAlerta('⚠️ Para UPC el prefijo debe tener entre 5 y 7 dígitos.', 'Error');
      return of(false);
    }
    const secLen = 11 - len;           // 11 = dígitos útiles sin DV en UPC-A
    if (secLen <= 0) {
      this.mostrarAlerta('⚠️ Prefijo demasiado largo: no queda espacio para secuencia.', 'Error');
      return of(false);
    }
    maxTeorico = Math.pow(10, secLen); // ej. len=7 → 10^4 = 10000
  }

  // 1) Consultar cuántos ya existen para ese prefijo (y país si aplica)
  return this.productoService.getConteoPorPrefijo(limpio, pais).pipe(
    map(existentes => {
      const restantes = Math.max(0, maxTeorico - existentes);

      // 👉 Ejemplo: si existen 1000 y pides 500000, aquí comparamos 500000 vs (maxTeorico-1000)
      if (restantes === 0) {
        this.mostrarAlerta(
          `⚠️ Ya no hay cupos disponibles para el prefijo ${pais ? pais : ''}${limpio}. Máximo: ${maxTeorico}, existentes: ${existentes}.`,
          'Error'
        );
        return false;
      }

      if (cantidad > restantes) {
        this.mostrarAlerta(
          `⚠️ Solicitas ${cantidad} códigos pero solo puedes generar ${restantes} más con el prefijo ${pais ? pais : ''}${limpio} (máx ${maxTeorico}, existentes ${existentes}).`,
          'Error'
        );
        return false;
      }

      return true;
    }),
    catchError(err => {
      console.error('Error al obtener conteo por prefijo', err);
      this.mostrarAlerta('❌ No se pudo validar el conteo actual del prefijo.', 'Error');
      return of(false);
    })
  );
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

    // ✅ Forzar mayúsculas para 'descripcion' y 'marca'
    if ((field === 'descripcion' || field === 'marca') && typeof newValue === 'string') {
      event.data[field] = newValue.toUpperCase();
    }

    // ✅ Log especial para 'activo'
    if (field === 'activo') {
      console.log(`Checkbox cambiado en fila ${event.rowIndex}:`, newValue);
    }

    // ✅ Limpiar errores si se corrige
    if (event.data[`_error_${field}`]) {
      if (newValue !== null && newValue !== undefined && newValue.toString().trim() !== '') {
        event.data[`_error_${field}`] = false;
      }
    }

    // ✅ Refrescar celda visual
    this.gridApi?.refreshCells({ rowNodes: [event.node], columns: [field] });
  }


  grabar(): void {
    this.mensaje = ''; // Limpia mensaje
    this.commitGridChanges(); 
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
      mergeMap(fila => this.guardarProductoPromise(fila, dialogRef), 5), // hasta 5 en paralelo
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

        // ✅ Productos grabados exitosamente
        this.botonGenerarDeshabilitado = true;
        this.botonGrabarDeshabilitado = true;
        this.botonGenerar14Deshabilitado = false;
        this.botonGrabar14Deshabilitado = true;
        this.checkboxMaestroDeshabilitado = false;
        this.factorDeshabilitado = false;

        this.gridApi.ensureIndexVisible(0);
        this.gridApi.setFocusedCell(0, 'factor');

        this.mostrarAlerta('✅ Todos los productos fueron grabados correctamente.', 'Éxito');

        // ❓ Preguntar si desea enviar a Verified
        this.dialog.open(CustomMessageBoxComponent, {
          width: '400px',
          data: {
            title: '¿Desea enviar a Verified?',
            message: 'Todos los productos fueron grabados. ¿Desea generar y enviar el JSON a Verified ahora mismo?',
            type: 'question',
            confirmText: 'Sí, enviar',
            cancelText: 'No, luego',
            showCancel: true
          }
        }).afterClosed().subscribe(enviar => {
          if (enviar && (this.tipoGtin === 'GTIN-13' || this.tipoGtin === 'UPC')) {
            this.enviarAJsonVerified();
          }


          // ❓ Luego preguntar por GTIN-14
          this.dialog.open(CustomMessageBoxComponent, {
            width: '400px',
            data: {
              title: '¿Desea continuar?',
              message: '¿Desea generar los códigos GTIN-14 ahora?',
              type: 'info',
              confirmText: 'Sí, generar',
              cancelText: 'Cancelar',
              showCancel: true
            }
          }).afterClosed().subscribe(generar14 => {
            if (generar14) {
              this.botonGenerar14Deshabilitado = false;
              this.botonGrabar14Deshabilitado = true;
              this.mostrarAlerta('✅ Puede continuar con GTIN-14.', 'Información');
            } else {
              this.mostrarAlerta('⚠️ Puede generar GTIN-14 luego desde el botón correspondiente.', 'Info');
            }
          });
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
    debugger
    this.commitGridChanges(); 
    this.rowData = [...this.rowData];
    this.gridApi.setFocusedCell(0, 'factor');

    const algunSeleccionado = this.rowData.some(fila => fila.activo === true);
    if (!algunSeleccionado) {
      this.mostrarAlerta('⚠️ Debe seleccionar al menos un producto (checkbox).', 'Error');
      return;
    }

    if (!this.verificarFactor()) return;

    const filasMarcadas = this.rowData.filter(f => f.activo);

    // 🕓 Mostrar cuadro de espera
    const dialogRef = this.dialog.open(DialogProcesoComponent, {
      disableClose: true,
      width: '400px',
      data: {
        procesados: 0,
        total: filasMarcadas.length
      }
    });

    // ✅ Si el checkIndicador está ACTIVADO (true), asumimos que el usuario llenó el campo manualmente
    if (this.checkIndicador === true) {
      dialogRef.close();

      const hayIndicadoresVacios = filasMarcadas.some(f =>
        !f.indicador || f.indicador.toString().trim() === ''
      );

      if (hayIndicadoresVacios) {
        this.mostrarAlerta('❌ Existen productos marcados sin indicador. Verifique antes de continuar.', 'Error');
        return;
      }

      this.generarDescripcionCompuesta();
      this.generarGtin14();

      this.botonGenerar14Deshabilitado = false;
      this.botonGrabar14Deshabilitado = false;

      return;
    }

    // ✅ Si el checkIndicador está DESACTIVADO (false), calcular automáticamente
    this.verificarExistenciaCodbar().then(() => {
      dialogRef.close();

      const hayIndicadoresVacios = filasMarcadas.some(f =>
        !f.indicador || f.indicador.toString().trim() === ''
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
    this.commitGridChanges(); 
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
    this.router.navigate(['/productos/nuevo-producto']);
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
    const filasRepetidas: Record<string, number[]> = {};
    const listaMensajes: string[] = [];

    this.gridApi.forEachNode((node) => {
      const descripcion = (node.data?.descripcion || '').trim().toUpperCase();
      const marca = (node.data?.marca || '').trim().toUpperCase();
      const contenido = (node.data?.contenidoNeto || '').toString().trim().toUpperCase();
      const unidad = (node.data?.contenidoUM || '').trim().toUpperCase();

      const clave = `${descripcion}~${marca}~${contenido}~${unidad}`;
      if (!descripcion) return;

      contador[clave] = (contador[clave] || 0) + 1;

      if (!filasRepetidas[clave]) {
        filasRepetidas[clave] = [];
      }

      // Validar que rowIndex no sea null
      if (node.rowIndex !== null && node.rowIndex !== undefined) {
        filasRepetidas[clave].push(node.rowIndex + 1); // Fila visible (1-based)
      }
    });

    const repetidas = new Set<string>();

    Object.keys(contador).forEach(clave => {
      const veces = contador[clave];
      if (veces > 1) {
        repetidas.add(clave);
        const partes = clave.split('~');
        const filas = filasRepetidas[clave].join(', ');
        const mensaje = `"${partes[0]}" (marca: ${partes[1]}, contenido: ${partes[2]}, unidad: ${partes[3]}) se repite ${veces} veces en las filas: ${filas}`;
        listaMensajes.push(mensaje);
      }
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
      var ean13
      var base12
      if (gtinUv.length === 13) {
         base12 = gtinUv.substring(0, 12);
         ean13 = indicador + base12; // ⚠️ sin dígito verificador
      }

      if (gtinUv.length === 12) {
         base12 = gtinUv.substring(0, 11);
        ean13 = indicador + '0' + base12; // ⚠️ sin dígito verificador
      }


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
    this.commitGridChanges(); 
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
    // Validaciones mínimas antes de armar payload
    const presentacion = Number((fila.indicador ?? '').toString().trim());
    const unidad = Number((fila.factor ?? '').toString().trim());
    const g14 = (fila.gtin14 ?? '').toString().trim();

    if (!Number.isInteger(presentacion) || presentacion < 1 || presentacion > 8) {
      console.error(`❌ Presentación/indicador inválido para ${fila.gtinUv}:`, fila.indicador);
      this.procesadosFallidos++;
      dialogRef.componentInstance.data.procesados = this.procesadosExitosos + this.procesadosFallidos;
      return resolve();
    }
    if (!Number.isInteger(unidad) || unidad <= 0) {
      console.error(`❌ Factor (unidad) inválido para ${fila.gtinUv}:`, fila.factor);
      this.procesadosFallidos++;
      dialogRef.componentInstance.data.procesados = this.procesadosExitosos + this.procesadosFallidos;
      return resolve();
    }
    if (g14.length !== 14) {
      console.error(`❌ GTIN-14 mal formado para ${fila.gtinUv}:`, g14);
      this.procesadosFallidos++;
      dialogRef.componentInstance.data.procesados = this.procesadosExitosos + this.procesadosFallidos;
      return resolve();
    }

    const nuevoCodigo14: Codigos14Request = {
      id_codigos14: 0,
      codbar: (fila.gtinUv ?? '').toString().trim(),
      id_prefijos: this.formUV.get('gcp')?.value || 0,
      clientes_codigo: this.clienteSeleccionado?.clientes_codigo ?? 0,
      presentacion,                    // ✅ numérico
      unidad,                          // ✅ numérico (si tu API espera 'factor', cambia el nombre aquí)
      descripcion: ((fila.descripciong ?? '') + '').toUpperCase(),  // ✅ a prueba de undefined
      g14,
      largo: 0,
      ancho: 0,
      profundidad: 0,
      peso: 0,
      fecha: new Date().toISOString().slice(0, 10),
      foto: (fila.urlFoto ?? '').toString(),
      activo: true,
      id_usuario: this.usuarioActual?.id_usuario ?? 1,  // ✅ nunca 0
      codpro: (fila.gtinUv ?? '').toString().trim(),
      facturar: '',
      nombre: 'PRESENTACION:',
      gtin: 'GTIN14',
      target: '',
      marca: ((fila.marca ?? '') + '').toUpperCase(),
      sector: 'Retail',
      referencia: '',
      abrevia: '',
      id_producto: fila.idProducto || 0
    };

    this.codigos14Service.createCodigo14(nuevoCodigo14).subscribe({
      next: (resp) => {
        // Ideal: validar resp.type === 'OK' si tu API lo envía
        this.procesadosExitosos++;
        dialogRef.componentInstance.data.procesados = this.procesadosExitosos + this.procesadosFallidos;
        resolve();
      },
      error: (err) => {
        this.procesadosFallidos++;
        console.error(`❌ Error al guardar GTIN-14 para ${fila.gtinUv}:`, err);
        console.warn('➡️ Payload enviado:', nuevoCodigo14);
        dialogRef.componentInstance.data.procesados = this.procesadosExitosos + this.procesadosFallidos;
        resolve();
      }
    });
  });
}

  generar12(): void {
    const idSeleccionado = this.formUV.value.gcp;
    const objeto = this.prefijos.find(p => p.id_prefijos === idSeleccionado);
    const prefijo = objeto?.codpre || '';
    const serie = this.formUV.get('serie')?.value || '';
    this.npais = ''; // nacional, sin prefijo país

    if (this.tipoGtin !== 'UPC' || this.bandera !== 2) return;
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
    const soloCopiarGtin = this.tipoGtin === 'UPC' && this.formUV.get('checkExiste')?.value;
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
            fila.contenidoNeto =  producto.contenido || '';
            fila.contenidoUM = producto.unidad || 'g';
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

      // if (camposIncompletos) {
      //   this.mostrarAlerta('⚠️ Algunos productos tienen campos vacíos. Revise las filas antes de continuar.', 'Advertencia');
      //   return;
      // }

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

  enviarAJsonVerified(): void {
    const datos = this.rowData;

    if (!datos.length) {
      this.mostrarAlerta('⚠️ No hay productos para enviar a Verified.', 'Advertencia');
      return;
    }

    const prefijoSeleccionado = this.prefijos.find(p => p.id_prefijos === this.formUV.value.gcp);
    const dapiP = this.api || '';
    const capiP = this.claveApi || '';
    const prefijo = prefijoSeleccionado?.codpre || '';

    // if (!dapiP || !capiP) {
    //   this.mostrarAlerta('❌ No se encontraron los parámetros de API para el envío.', 'Error');
    //   return;
    // }

    this.jsonBloqueService.inicializarUnidades().then(() => {
      this.jsonBloqueService.generarJsonLote(this.rowData, prefijo, dapiP, capiP);
    });


    this.mostrarAlerta('📦 JSON generado y enviado en lote a Verified.', 'Información');
  }

  cargarParametroFacturaPorId(id: number): void {
    this.parametrosFacturaService.getById(id).subscribe({
      next: (parametro) => {
        // Aquí asignas el resultado a una variable del componente
        this.api = parametro.texto ?? '';
        this.claveApi = parametro.obs ?? ''; // si `valor` puede ser undefined

        console.log('✅ Parámetro cargado:', parametro);
      },
      error: (error) => {
        console.error('❌ Error al obtener el parámetro:', error);
        // Puedes mostrar un mensaje de error si deseas
      }
    });
  }

  tooltipRepetido = (params: any): string | null => {
    const descripcion = (params.data?.descripcion || '').trim().toUpperCase();
    const marca = (params.data?.marca || '').trim().toUpperCase();
    const contenido = (params.data?.contenidoNeto || '').toString().trim().toUpperCase();
    const unidad = (params.data?.contenidoUM || '').trim().toUpperCase();
    const clave = `${descripcion}~${marca}~${contenido}~${unidad}`;

    if (this.descripcionesRepetidas?.has(clave)) {
      return '⚠️ Esta combinación está repetida';
    }
    return null;
  };

  convertirAMayusculas(controlName: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const valor = input.value.toUpperCase();
    this.formUV.get(controlName)?.setValue(valor);
  }
  private commitGridChanges(): void {
  if (!this.gridApi) { return; }

  this.gridApi.stopEditing();                 // guarda lo que está editando
  this.gridApi.refreshCells({ force: true }); // repinta estilos
}

}
