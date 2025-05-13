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
activeTab: string = 'eliminar';
filtroBusqueda: string = '';

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
