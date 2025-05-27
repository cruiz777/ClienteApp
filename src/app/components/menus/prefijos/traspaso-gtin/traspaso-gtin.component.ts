import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-traspaso-gtin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatButtonModule
  ],
  templateUrl: './traspaso-gtin.component.html',
  styleUrl: './traspaso-gtin.component.css'
})
export class TraspasoGtinComponent {
  activeTab: string = 'Transferir';
  filtroBusqueda: string = '';
   botonActivo: string = '';

  transferir = [
    {
      UnidadVenta:'7861206229380',
      Descripcion:'stems stf50red',
      Prefijo:'12062',
      Gtin:'GTIN-13',
      Marca: 'RoseAmor',
      Contenido:'1',
      UMedida:'Unidad',
      Estado:'activo',
      FechaCreacion:'15/05/2025',
      Presentacion:'P',
      },
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
onBuscar(): void {
  // lógica de búsqueda
}

onNuevaBusqueda(): void {
  // lógica para limpiar filtros
}

ontransferir(): void {
  // lógica para asignar
}
}
