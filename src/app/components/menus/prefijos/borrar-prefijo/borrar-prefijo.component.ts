import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-borrar-prefijo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatButtonModule
  ],
  templateUrl: './borrar-prefijo.component.html',
  styleUrl: './borrar-prefijo.component.css'
})
export class BorrarPrefijoComponent {
  activeTab: string = 'eliminar';
  filtroBusqueda: string = '';

  eliminar = [

    { prefijo: '12062', cliente: 'ANDREA', ruc: '1724948045001', fecha: '22/05/2017'},
    { prefijo: '12062', cliente: 'ANDREA', ruc: '1724948045001', fecha: '22/05/2017'},
    { prefijo: '12062', cliente: 'ANDREA', ruc: '1724948045001', fecha: '22/05/2017'}
  ];
   listado = [

    { prefijo: '12062', cliente: 'ANDREA', ruc: '1724948045001', fecha: '22/05/2017', usuario:'allive'},
    { prefijo: '12062', cliente: 'ANDREA', ruc: '1724948045001', fecha: '22/05/2017',usuario:'allive'},
    { prefijo: '12062', cliente: 'ANDREA', ruc: '1724948045001', fecha: '22/05/2017',usuario:'allive'}
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

}
