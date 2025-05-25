import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { ClienteService } from 'src/app/services/cliente.service';
import { ClienteSummary } from 'src/app/interfaces/responses/cliente-summary-response';

@Component({
  selector: 'app-traspaso-prefijos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatButtonModule,

  ],
  templateUrl: './traspaso-prefijos.component.html',
  styleUrls: ['./traspaso-prefijos.component.css']
})
export class TraspasoPrefijosComponent {



  activeTab: string = 'Transferir';
  filtroBusqueda: string = '';
  filtroCliente: string = '';
  botonActivo: string = '';

  clienteSummaryRespose: ClienteSummary[] = [];


  constructor(
    private clienteService: ClienteService
  ) { }

  transferencias = [
    { prefijo: '12062', fecha: '22/05/2017', estado: 'Activo', tipo: 'Nacional' },
    { prefijo: '12212', fecha: '14/10/2022', estado: 'Activo', tipo: 'Nacional' },
    { prefijo: '212441', fecha: '10/05/2017', estado: 'Activo', tipo: 'Nacional' }
  ];

  listado = [
    {
      prefijo: '211292',
      empresaAnterior: 'Pacheco Mantilla M',
      rucAnterior: '1706814421001',
      empresaActual: 'UNICDESIGN S.A.',
      rucActual: '1792584175001',
      fecha: '15/04/2020'
    },
    {
      prefijo: '211712',
      empresaAnterior: 'Urcupac Trading S.',
      rucAnterior: '1792377471001',
      empresaActual: 'Montrade S.A.',
      rucActual: '1792596203001',
      fecha: '20/07/2019'
    },
    {
      prefijo: '211547',
      empresaAnterior: 'Alvarez Vasco Mari',
      rucAnterior: '1700044462001',
      empresaActual: 'Grijalvarez S.C.C.',
      rucActual: '1792566908001',
      fecha: '03/02/2022'
    }
  ];

  asignaciones = [
    { prefijo: '12062', fecha: '22/05/2017', estado: 'Activo', seleccionar: 'Activo' },
    { prefijo: '12212', fecha: '14/10/2022', estado: 'Activo', seleccionar: 'Activo' },
    { prefijo: '212441', fecha: '10/05/2017', estado: 'Activo', seleccionar: 'Activo' }
  ];

  cambiarTab(tab: string) {
    this.activeTab = tab;
  }

  exportarPDF() {
    console.log('Exportar a PDF');
    // lógica de exportación con jsPDF
  }

  exportarExcel() {
    console.log('Exportar a Excel');
    // lógica de exportación con XLSX
  }
  seleccionarBoton(nombre: string): void {
    this.botonActivo = nombre;
  }

  // Ejemplo de métodos
  onBuscar(nomcli: string): void {
    this.clienteService.getClientesSummary(nomcli).subscribe(resp => { this.clienteSummaryRespose = resp.data; });
  }

  onNuevaBusqueda(): void {
    // lógica para limpiar filtros
  }

  onAsignar(): void {
    // lógica para asignar
  }

}


