import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-estructura-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './estructura-list.component.html',
  styleUrl: './estructura-list.component.css'
})
export class EstructuraListComponent {
  opcionSeleccionada: any = null;

  // Datos jerárquicos (nivel 1 → nivel 3)
  modulos = [
    {
      nombre: 'Noción Imprenta',
      expandido: true,
      hijos: [
        {
          nombre: 'Materia Prima',
          expandido: false,
          hijos: [
            {
              nombre: 'Insumos',
              expandido: false,
              hijos: [
                { nombre: 'Papel Bond', tipo: 'hoja' },
                { nombre: 'Cartón Corrugado', tipo: 'hoja' }
              ]
            },
            {
              nombre: 'Materiales',
              expandido: false,
              hijos: [
                { nombre: 'Tintas', tipo: 'hoja' },
                { nombre: 'Pegamentos', tipo: 'hoja' }
              ]
            }
          ]
        },
        {
          nombre: 'Servicios',
          expandido: false,
          hijos: [
            {
              nombre: 'Diseño Gráfico',
              expandido: false,
              hijos: [
                { nombre: 'Maquetación', tipo: 'hoja' }
              ]
            }
          ]
        }
      ]
    }
  ];


  // Lista completa de productos
  productos = [
    { codigo: 'P001', codigoBarras: '123456', descripcion: 'Resma Papel Bond A4', proveedor: 'IMPRESO S.A.', costo: 3.20, pvp: 5.00, abreviacion: 'PB-A4', referencia: 'PAP-BOND', existencia: 45, categoria: 'Papel Bond' },
    { codigo: 'P002', codigoBarras: '123457', descripcion: 'Cartón Corrugado 1.2mm', proveedor: 'Cartopel', costo: 1.50, pvp: 2.10, abreviacion: 'CC-1.2', referencia: 'CART-COR', existencia: 22, categoria: 'Cartón Corrugado' },
    { codigo: 'P003', codigoBarras: '123458', descripcion: 'Tinta Negra 500ml', proveedor: 'Quimicol', costo: 8.90, pvp: 11.50, abreviacion: 'TINT-N', referencia: 'TINTA-NG', existencia: 0, categoria: 'Tintas' },
    { codigo: 'P004', codigoBarras: '123459', descripcion: 'Pegamento Industrial', proveedor: '3M', costo: 6.00, pvp: 9.00, abreviacion: 'PEG-IND', referencia: 'PEG-3M', existencia: 12, categoria: 'Pegamentos' },
    { codigo: 'P005', codigoBarras: '123460', descripcion: 'Servicio Maquetación Editorial', proveedor: 'DiseñoYA', costo: 20.00, pvp: 30.00, abreviacion: 'MAQ-EDIT', referencia: 'SERV-DISE', existencia: 1, categoria: 'Maquetación' }
  ];


  // Productos filtrados que se muestran en la tabla
  productosFiltrados = this.productos;

  /**
   * Expande/cierra carpetas o selecciona hojas.
   */
  toggleExpand(nodo: any): void {
    if (nodo.hijos) {
      nodo.expandido = !nodo.expandido;
    } else {
      this.opcionSeleccionada = nodo;
      this.productosFiltrados = this.productos.filter(p => p.categoria === nodo.nombre);
    }
  }

}
