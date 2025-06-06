import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { ClienteSeleccionadoService } from 'src/app/services/cliente-seleccionado.service';
import { Cliente } from 'src/app/interfaces/cliente';
import { Router } from '@angular/router';
import { ProductoService, Producto } from 'src/app/services/producto.service';
import { Codigos14Service, Codigos14Response } from 'src/app/services/codigos14.service';

@Component({
  selector: 'app-nuevo-producto',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatTableModule
  ],
  templateUrl: './nuevo-producto.component.html',
  styleUrl: './nuevo-producto.component.css'
})
export class NuevoProductoComponent implements OnInit {
  activeTab: string = 'Listado';
  clienteSeleccionado: Cliente | null = null;
  filtroPrefijo: string = '';
  busqueda: string = '';
  cantidadMostrar: number = 10;
  registroSeleccionado: any = null;
  codigoSeleccionado: string = '';
  columnasUV: string[] = [
    'id',
    'empresa',
    'prefijo',
    'tipogtin',
    'estado',
    'codbar',
    'presentacion',
    'descripcion',
    'fecha',
    'marca',
    'contenido',
    'unidad',
    'categoria',
    'gcp_brick',
    'pais',
  ];

  registros: any[] = [];
  registrosGtin14: any[] = [];
  bandera:number=0;

  columnasGTIN14: string[] = [
    'id',
    'g14',
    'codbar',
    'prefijo',
    'presentacion',
    'factor',
    'descripcion',
    'fecha',
    'estado'

  ];



  constructor(
    private clienteSeleccionadoService: ClienteSeleccionadoService,
    private router: Router,
    private productoService: ProductoService,
    private codigos14Service: Codigos14Service
  ) { }

  ngOnInit(): void {
    this.clienteSeleccionadoService.clienteSeleccionado$.subscribe(cliente => {
      this.clienteSeleccionado = cliente;
      console.log('Cliente cargado en NuevoProductoComponent:', cliente);
      if (cliente?.clientes_codigo) {
        this.cargarProductos(cliente.clientes_codigo);
      }
    });
  }

  cambiarTab(tab: string) {
    this.activeTab = tab;
  }

  filtrarRegistros() {
    return this.registros.filter(r =>
      (!this.filtroPrefijo || r.prefijo.includes(this.filtroPrefijo)) &&
      (!this.busqueda || r.descripcion?.toLowerCase().includes(this.busqueda.toLowerCase()))
    );
  }

  seleccionarRegistro(registro: any) {
    this.registroSeleccionado = registro;
    this.codigoSeleccionado = registro.codbar;
    this.cargarCodigos14PorGtin(registro.codbar);  // <- campo correcto
  }

  irAUvIndividual(): void {
    this.router.navigate(['/menuProductos/uvIndividual']);
  }
   irBloque(): void {
    this.router.navigate(['/menuProductos/bloque']);
  }

  salir(): void {
    this.router.navigate(['/pages/clientes']);
  }

  cargarProductos(codigoCliente: number): void {

    this.productoService.getProductosPorCliente(codigoCliente).subscribe({
      next: (productos: Producto[]) => {
        this.registros = productos.map(p => ({
          id: p.IdProducto,
          empresa: p.clienteNombres || '',
          prefijo: p.codpre || '',
          tipogtin: p.tgin || '',
          estado: p.Activo ? 'ACTIVO' : 'INACTIVO',
          codbar: p.codbar || '',
          presentacion: p.p || '',
          descripcion: p.Despro || '',
          fecha: (() => {
            const fecha = new Date(p.Fecing);
            const dia = String(fecha.getDate()).padStart(2, '0');
            const mes = String(fecha.getMonth() + 1).padStart(2, '0');
            const anio = fecha.getFullYear();
            return `${dia}/${mes}/${anio}`;
          })(),

          marca: p.marca || '',
          contenido: p.contenido || '',
          unidad: p.unidad || '',
          categoria: p.dbrick || '',
          gcp_brick: p.brick || '',
          pais: p.pais || '',

        }));
      },
      error: err => {
        console.error('Error al cargar productos:', err);
      }
    });
  }

  cargarCodigos14PorGtin(gtin: string): void {
     this.codigos14Service.getPorGtin(gtin).subscribe({
      next: (codigos) => {
        this.registrosGtin14 = codigos.map(c => ({
          id: c.id_codigos14,
          g14: c.g14 || '',
          codbar: c.codbar || '',
          prefijo: c.codpre || '',
          presentacion: c.presentacion || 0,
          factor: c.unidad || '',
          descripcion: c.descripcion || '',
          fecha: (() => {
            const fecha = new Date(c.fecha);
            const dia = String(fecha.getDate()).padStart(2, '0');
            const mes = String(fecha.getMonth() + 1).padStart(2, '0');
            const anio = fecha.getFullYear();
            return `${dia}/${mes}/${anio}`;
          })(),
          estado: c.activo ? 'ACTIVO' : 'INACTIVO'
        }));
      },
      error: err => {
        console.error('Error al cargar códigos14:', err);
      }
    });
  }





}
