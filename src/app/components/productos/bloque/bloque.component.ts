import { Component, HostListener, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ColDef, GridApi, ModuleRegistry, GridOptions } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PrefijoService } from 'src/app/services/prefijo.service';
import { ClienteSeleccionadoService } from 'src/app/services/cliente-seleccionado.service';
import { Cliente } from 'src/app/interfaces/cliente';
import { GeneracionCodigosService, SecuenciaResponse } from 'src/app/services/generacion-codigos.service';
import { CheckboxRendererComponent } from '../checkbox-renderer/checkbox-renderer.component';

ModuleRegistry.registerModules([AllCommunityModule]);

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

  private gridApi!: GridApi;
  gridOptions: GridOptions = {
    components: {
      checkboxRenderer: CheckboxRendererComponent
    }
  };

  public frameworkComponents = {
    checkboxRenderer: CheckboxRendererComponent
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
    private clienteSeleccionadoService: ClienteSeleccionadoService
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
    this.cargarCliente();
    this.columnDefs = [
      { headerName: '#', valueGetter: 'node.rowIndex + 1', width: 60 },
      { field: 'gtinUv', headerName: 'GTIN UV', editable: true, cellStyle: { backgroundColor: 'yellow' } },
      {
        field: 'descripcion',
        headerName: 'Descripción',
        editable: true,
        cellStyle: this.estiloDescripcionVacia
      },
      { field: 'categoria', headerName: 'Categoría', cellStyle: this.estiloDescripcionVacia },
      { field: 'marca', headerName: 'Marca', editable: true, cellStyle: this.estiloDescripcionVacia },
      { field: 'contenidoNeto', headerName: 'Contenido Neto', editable: true, cellStyle: this.estiloDescripcionVacia,valueParser: this.validarNumeroConUnPunto },
      { field: 'contenidoUM', headerName: 'Contenido UM', editable: true, cellStyle: this.estiloDescripcionVacia },
      { field: 'gcpBrick', headerName: 'GCP Brick', cellStyle: this.estiloDescripcionVacia },
      { field: 'pais', headerName: 'País', cellStyle: this.estiloDescripcionVacia },
      {
        field: 'activo',
        headerName: 'GTIN 14',
        cellRenderer: 'checkboxRenderer',
        editable: false,
        width: 100
      },
      { field: 'factor', headerName: 'Factor', cellStyle: this.estiloDescripcionVacia },
      { field: 'indicador', headerName: 'Indicador', cellStyle: this.estiloDescripcionVacia },
      { field: 'descripciong', headerName: 'Descripción', cellStyle: this.estiloDescripcionVacia },
      { field: 'gtin14', headerName: 'CODIGO GTIN 14', cellStyle: this.estiloDescripcionVacia },
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
        categoria: 'AL_CONF',
        marca: '',
        contenidoNeto: '9',
        contenidoUM: '',
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
      alert('⚠️ Ingresa un prefijo de 5 dígitos');
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
    if (!prefijo || prefijo.length !== 5) {
      alert('⚠️ Ingresa un prefijo válido de 5 dígitos');
      return;
    }

    this.npais = '786';

    this.generacionCodigosService.obtenerSecuencia(prefijo, this.npais).subscribe({
      next: (resp: SecuenciaResponse) => {
        this.secuencia = serie !== '' ? parseInt(serie, 10) : resp.data;
        if (!this.validarAfiliacion(this.secuencia)) return;

        this.mensaje = resp.message;

        for (let i = 0; i < this.rowData.length; i++) {
          const secuenciaActual = (this.secuencia + i).toString().padStart(4, '0');
          const gtin13 = '786' + prefijo + secuenciaActual;
          const dv = this.calcularDigitoVerificador(gtin13);
          this.rowData[i].gtinUv = gtin13 + dv;
        }

        const primerGtin = '786' + prefijo + this.secuencia.toString().padStart(4, '0');
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
      alert('⚠️ No hay datos para pegar.');
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

}
