import { Component, HostListener } from '@angular/core';
import { ColDef, GridApi, ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';

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

  defaultColDef: ColDef = {
    editable: true,
    resizable: true,
    flex: 1
  };

  cantidadFilas = 0;
  textoPegado: string = '';
  copiarDesdeColumna2: boolean = false;
  textoGtinUv: string = '';
  prefijo: string = '';

  private gridApi!: GridApi;

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
    if (!this.prefijo || this.prefijo.length !== 5) {
      alert('⚠️ Ingresa un prefijo de 5 dígitos');
      return;
    }

    for (let i = 0; i < this.rowData.length; i++) {
      const secuencia = (i + 1).toString().padStart(4, '0');
      const gtin12 = '786' + this.prefijo + secuencia;
      const dv = this.calcularDigitoVerificador(gtin12);
      this.rowData[i].gtinUv = gtin12 + dv;
    }

    this.rowData = [...this.rowData]; // fuerza refresco
  }

  pegarColumnaGtinUv() {
    if (!this.textoPegado.trim()) {
      alert('⚠️ No hay datos para pegar.');
      return;
    }

    const lineas = this.textoPegado.trim().split('\n');
    const desde = this.copiarDesdeColumna2 ? 1 : 0;
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

  @HostListener('document:keydown', ['$event'])
  handlePasteShortcut(event: KeyboardEvent) {
    if (event.ctrlKey && event.key.toLowerCase() === 'v') {
      console.log('📋 Se presionó Ctrl + V');
    }
  }
}
