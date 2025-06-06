import { Component, HostListener,OnInit  } from '@angular/core';
import { ColDef, GridApi, ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatStepper } from '@angular/material/stepper';
import { ViewChild } from '@angular/core';
import { PrefijoService } from 'src/app/services/prefijo.service';
import { ClienteSeleccionadoService } from 'src/app/services/cliente-seleccionado.service';
import { Cliente } from 'src/app/interfaces/cliente';

import { GeneracionCodigosService, SecuenciaResponse } from 'src/app/services/generacion-codigos.service';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-bloque',
  templateUrl: './bloque.component.html',
  styleUrls: ['./bloque.component.css']
})
export class BloqueComponent {
  columnDefs: ColDef[] = [
    {
  headerName: '#',
  valueGetter: 'node.rowIndex + 1',
  width: 60,
  sortable: false,
  filter: false
},
    {
      field: 'gtinUv',
      headerName: 'GTIN UV',
      editable: true,
      cellStyle: { backgroundColor: 'yellow' }
    },
    { field: 'descripcion', headerName: 'Descripción', editable: true },
    { field: 'categoria', headerName: 'Categoría' },
    { field: 'marca', headerName: 'Marca' },
    { field: 'contenidoNeto', headerName: 'Contenido Neto', editable: true  },
    { field: 'contenidoUM', headerName: 'Contenido UM', editable: true  },
    { field: 'gcpBrick', headerName: 'GCP Brick' },
    { field: 'pais', headerName: 'País' }
  ];

  rowData: any[] = [];
  defaultColDef: ColDef = { editable: true, resizable: true, flex: 1 };

  cantidadFilas = 0;
  textoPegado: string = '';
  copiarDesdeColumna2: boolean = true;
  mensaje: string = '';
  npais: string = '';
  secuencia: number = 0;
  private gridApi!: GridApi;
  prefijos: any[] = [];
  clienteSeleccionado: Cliente | null = null;
  formUV: FormGroup;
    gtinNacionalActivo = false;
  gtinInternacionalActivo = false;
   bandera: number = 0;
  constructor(
    private fb: FormBuilder,
    private generacionCodigosService: GeneracionCodigosService,
    private prefijoService: PrefijoService,
    private clienteSeleccionadoService: ClienteSeleccionadoService,
  ) {
    this.formUV = this.fb.group({
      gcp: ['', [Validators.required]],
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
  }
  onGridReady(params: any) {
    this.gridApi = params.api;
  }

  generarFilas() {
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
        pais: 'EC'
      });
    }
    this.rowData = nuevasFilas;
  }

  limpiarTabla() {
    this.rowData = [];
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
    if (!prefijo ) {
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

  pegarColumnaGtinUv() {
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

  generar(): void {
    
    const idSeleccionado = this.formUV.value.gcp;
   var prefijo:string='';
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
        const continuar = this.validarAfiliacion(this.secuencia);
        if (!continuar) return;

        this.mensaje = resp.message;

        // Recorremos las filas y generamos códigos GTIN-13 distintos
        for (let i = 0; i < this.rowData.length; i++) {
          const secuenciaActual = (this.secuencia + i).toString().padStart(4, '0');
          const gtin13 = '786' + prefijo + secuenciaActual;
          const dv = this.calcularDigitoVerificador(gtin13);
          this.rowData[i].gtinUv = gtin13 + dv;
        }

        // Actualizamos el campo visual solo con el primer GTIN generado
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


  validarAfiliacion(secuencia: number): boolean {
    if (secuencia > 9999) {
      alert('⚠️ La secuencia ha superado el límite permitido.');
      return false;
    }
    return true;
  }

  @HostListener('document:keydown', ['$event'])
  handlePasteShortcut(event: KeyboardEvent) {
    if (event.ctrlKey && event.key.toLowerCase() === 'v') {
      console.log('📋 Se presionó Ctrl + V');
    }
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
  habilitarSerie(): void {
    const usarSerie = this.formUV.get('usarSerie')?.value;
    const gtin = this.formUV.get('gtinNacionalSeleccionado')?.value;

    if (usarSerie) {
      const gcpId = this.formUV.get('gcp')?.value;
      const prefijo = this.prefijos.find(p => p.id_prefijos === gcpId);

      if (!prefijo) {
        console.error('❌ Prefijo no encontrado');
        return;
      }

      if (gtin === 'gtin13') {
        this.npais = '786';
        this.generacionCodigosService.obtenerSecuencia(prefijo.codpre, this.npais).subscribe({
          next: (resp: SecuenciaResponse) => {
            this.formUV.get('serie')?.setValue(resp.data);
          },
          error: (err) => {
            console.error('Error al obtener secuencia GTIN-13:', err);
          }
        });

      } else if (gtin === 'gtin12') {
        this.npais = '';
        this.generacionCodigosService.obtenerSecuencia(prefijo.codpre, this.npais).subscribe({
          next: (resp: SecuenciaResponse) => {
            this.formUV.get('serie')?.setValue(resp.data);
          },
          error: (err) => {
            console.error('Error al obtener secuencia GTIN-12:', err);
          }
        });

      } else {
        this.formUV.get('serie')?.setValue('SERIE-GENERICA');
      }

    } else {
      this.formUV.get('serie')?.reset();
    }
    this.formUV.get('gtinInternacionalSeleccionado')?.valueChanges.subscribe(valor => {
      this.gtinNacionalActivo = !!valor;
      if (valor) {
        this.formUV.get('gtinNacionalSeleccionado')?.reset();
        

        // Activar campo y aplicar validador personalizado
        
      }
    });

  }

   onPrefijoBlur(): void {
  
    const idSeleccionado = this.formUV.value.gcp;
    const objeto = this.prefijos.find(p => p.id_prefijos === idSeleccionado);
    if (objeto?.gln) {
      this.formUV.patchValue({ gln: objeto.gln });
      this.bandera = objeto.bandera;
      //this.gestionarActivacionOpcionesUL(this.formUV.get('gtinNacionalSeleccionado')?.value, true);

    }
  }
}
