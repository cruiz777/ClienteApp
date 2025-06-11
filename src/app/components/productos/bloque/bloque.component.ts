import { Component, HostListener, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ColDef, GridApi, ModuleRegistry, GridOptions } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PrefijoService } from 'src/app/services/prefijo.service';
import { ClienteSeleccionadoService } from 'src/app/services/cliente-seleccionado.service';
import { Cliente } from 'src/app/interfaces/cliente';
import { GeneracionCodigosService, SecuenciaResponse } from 'src/app/services/generacion-codigos.service';
import { CheckboxRendererComponent } from '../checkbox-renderer/checkbox-renderer.component';
import { GcpBrickAutocompleteEditorComponent } from '../gcp-brick-autocomplete-editor/gcp-brick-autocomplete-editor.component';
import { UmedidaService } from 'src/app/services/umedida.service';
import { GrupoProductoService } from 'src/app/services/grupo-producto.service';
ModuleRegistry.registerModules([AllCommunityModule]);
import { MatSnackBar } from '@angular/material/snack-bar';

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

  constructor(
    private fb: FormBuilder,
    private generacionCodigosService: GeneracionCodigosService,
    private prefijoService: PrefijoService,
    private clienteSeleccionadoService: ClienteSeleccionadoService,
    private umedidaService: UmedidaService,
    private grupoProductoService: GrupoProductoService,
    private _snackBar: MatSnackBar,
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
      gln: ['']
    });
  }

  ngOnInit(): void {
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
        cellStyle: this.estiloDescripcionVacia,width: 100,  minWidth: 100
       
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
        cellStyle: this.estiloDescripcionVacia, width: 95, minWidth:95
      },

      {
        field: 'gcpBrick',
        headerName: 'GCP Brick',
        editable: false,
        cellStyle: this.estiloDescripcionVacia,width: 100,  minWidth: 100
       
      }


      ,
      { field: 'pais', headerName: 'País', cellStyle: this.estiloDescripcionVacia,width: 70, minWidth: 70 },
      {
        field: 'activo',
        headerName: 'GTIN 14',
        cellRenderer: 'checkboxRenderer',
        editable: false
        , width: 80, minWidth: 80
      },
      { field: 'factor', headerName: 'Factor', cellStyle: this.estiloDescripcionVacia, width: 80, minWidth: 80 },
      { field: 'indicador', headerName: 'Indicador', cellStyle: this.estiloDescripcionVacia , width: 100, minWidth: 100},
      { field: 'descripciong', headerName: 'Descripción', cellStyle: this.estiloDescripcionVacia , width: 200, minWidth: 200},
      { field: 'gtin14', headerName: 'CODIGO GTIN 14', cellStyle: this.estiloDescripcionVacia, width: 150, minWidth: 150 },
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
    debugger
    if (!this.cantidadFilas || this.cantidadFilas <= 0) return;

    const nuevasFilas = [];
    for (let i = 0; i < this.cantidadFilas; i++) {
      nuevasFilas.push({
        gtinUv: '',
        descripcion: '',
        categoria: 'AL_CONF',
        marca: '',
        contenidoNeto: '0',
        contenidoUM: 'g',
        gcpBrick: '10006848',
        pais: 'EC',
        activo: false
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
    if (cliente) {
      this.clienteSeleccionado = cliente;
      this.formUV.patchValue({
        codigoCliente: cliente.clientes_codigo || '',
        cliente: cliente.nomcli || '',
        ruc: cliente.ruc || '',
      });
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
  const idSeleccionado = this.formUV.value.gcp;
  let prefijo: string = '';
  const objeto = this.prefijos.find(p => p.id_prefijos === idSeleccionado);
  if (objeto?.gln) {
    prefijo = objeto.codpre;
  }

  const serie = this.formUV.get('serie')?.value || '';
  if (!prefijo) {
    alert('⚠️ Ingresa un prefijo válido');
    return;
  }

  this.verificarUnidad();
  this.npais = '786';

  this.generacionCodigosService.obtenerSecuencia(prefijo, this.npais).subscribe({
    next: (resp: SecuenciaResponse) => {
      this.secuencia = serie !== '' ? parseInt(serie, 10) : resp.data;
      if (!this.validarAfiliacion(this.secuencia)) return;

      this.mensaje = resp.message;

      const longitudPrefijo = prefijo.length;
      const longitudSecuencia = 12 - this.npais.length - longitudPrefijo;

      if (longitudSecuencia <= 0) {
        alert(`⚠️ Prefijo demasiado largo (${longitudPrefijo} dígitos). No se puede generar GTIN-13 válido.`);
        return;
      }

      const maxCodigos = Math.pow(10, longitudSecuencia); // Ej: 10, 100, 1000...
      if (this.rowData.length > maxCodigos) {
        alert(`⚠️ Solo se pueden generar ${maxCodigos} códigos con prefijo de ${longitudPrefijo} dígitos. Se recortarán automáticamente.`);
        this.rowData = this.rowData.slice(0, maxCodigos);
      }

      for (let i = 0; i < this.rowData.length; i++) {
        const secuenciaActual = (this.secuencia + i).toString().padStart(longitudSecuencia, '0');
        const gtin12 = this.npais + prefijo + secuenciaActual;
        const dv = this.calcularDigitoVerificador(gtin12);
        this.rowData[i].gtinUv = gtin12 + dv;
      }

      const secuenciaActual = this.secuencia.toString().padStart(longitudSecuencia, '0');
      const primerGtin = this.npais + prefijo + secuenciaActual;
      const primerDv = this.calcularDigitoVerificador(primerGtin);
      this.formUV.get('gtinUv')?.setValue(primerGtin + primerDv);

      this.rowData = [...this.rowData];
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
      fila.categoria = 'AL_CONF';
      fila.gcpBrick = '10006848';
      fila.pais = 'EC';
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

  onCellValueChanged(event: any): void {
    if (event.colDef.field === 'activo') {
      console.log(`Checkbox cambiado en fila ${event.rowIndex}:`, event.newValue);
    }
  }

  simularPegado(): void {
    debugger
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
  verificarUnidad(): void {
    const promesas: Promise<void>[] = [];

    this.gridApi.forEachNode((node, index) => {
      const unidad = node.data['contenidoUM'];

      if (unidad) {
        const p = new Promise<void>((resolve) => {
          this.umedidaService.obtenerUnidadPorNombre(unidad).subscribe({
            next: () => {
              console.log(`✅ Fila ${index}: Unidad válida → ${unidad}`);
            },
            error: () => {
              console.warn(`⛔ Fila ${index}: Unidad inválida → "${unidad}"`);
              node.setDataValue('contenidoUM', '');
            }
          });

        });

        promesas.push(p);
      }
    });

    Promise.all(promesas).then(() => {
      this.gridApi.refreshCells({ force: true });
    });
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
          brick:g.brick
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

}
