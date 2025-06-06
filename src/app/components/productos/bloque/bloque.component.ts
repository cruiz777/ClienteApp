import { Component, HostListener } from '@angular/core';
import { ColDef, GridApi, ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatStepper } from '@angular/material/stepper';
import { ViewChild } from '@angular/core';

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
      field: 'gtinUv',
      headerName: 'GTIN UV',
      editable: true,
      cellStyle: { backgroundColor: 'yellow' }
    },
    { field: 'descripcion', headerName: 'Descripción', editable: true },
    { field: 'categoria', headerName: 'Categoría' },
    { field: 'marca', headerName: 'Marca' },
    { field: 'contenidoNeto', headerName: 'Contenido Neto' },
    { field: 'contenidoUM', headerName: 'Contenido UM' },
    { field: 'gcpBrick', headerName: 'GCP Brick' },
    { field: 'pais', headerName: 'País de' }
  ];

  rowData: any[] = [];
  defaultColDef: ColDef = { editable: true, resizable: true, flex: 1 };

  cantidadFilas = 0;
  textoPegado: string = '';
  copiarDesdeColumna2: boolean = false;
  mensaje: string = '';
  npais: string = '';
  secuencia: number = 0;
  private gridApi!: GridApi;

  formUV: FormGroup;

  constructor(
    private fb: FormBuilder,
    private generacionCodigosService: GeneracionCodigosService
  ) {
    this.formUV = this.fb.group({
      prefijo: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(5)]],
      serie: [''],
      gtinUv: ['']
    });
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
    const prefijo = this.formUV.get('prefijo')?.value;
    if (!prefijo || prefijo.length !== 5) {
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
  const prefijo = this.formUV.get('prefijo')?.value;
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
}
