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

  columnasUV: string[] = ['empresa',
    'prefijo',
    'tipogtin',
    'estado',
    'gtinuv',
    'presentacion',
    'descripcion',
    'fecha',
    'Marca',
    'contenido',
    'Unidad Medida',
    'categoria',
    'gcp_brick',
    'pais',
  ];
  columnasGTIN14: string[] = ['codigo', 'empresa', 'presentacion', 'descripcion'];

  registros = [
    {
      empresa: 'EMIHANA',
      prefijo: '80009840',
      tipoGtin: 'GTIN 13',
      estado: 'ACTIVO',
      gtinUv: '7868000984002',
      presentacion:'P',
      descripcion: 'ROSA ROJA TALLO LARGO',
      fecha:'26/05/2025',
      marca:'ROSEAMOR',
      contenido:'1',
      unidadMedida:'UNIDAD',
      categoria:'',
      gcpbrick:'AL_ROSE',
      pais:'EC'

    },
    {
      empresa: 'EMIHANA',
      prefijo: '80009840',
      tipoGtin: 'GTIN 13',
      estado: 'ACTIVO',
      gtinUv: '7868000984003',
      presentacion:'',
      descripcion: 'ROSA ROJA TALLO CORTO',
      fecha:'26/05/2025',
      marca:'ROSEAMOR',
      contenido:'1',
      unidadMedida:'UNIDAD',
      categoria:'',
      gcpbrick:'AL_ROSE',
      pais:'EC'

    }
  ];

  gtin14 = [
    {
      codigo: '17868000984009',
      empresa: 'ABAD CONDE JIMMY STALIN',
      presentacion: '1',
      descripcion: 'CAFÉ LAVADO TOSTADO/MOLIDO CAFÉ'
    }
  ];

  constructor(
  private clienteSeleccionadoService: ClienteSeleccionadoService,
  private router: Router
) {}

  ngOnInit(): void {
    this.clienteSeleccionadoService.clienteSeleccionado$.subscribe(cliente => {
      this.clienteSeleccionado = cliente;
      console.log('Cliente cargado en NuevoProductoComponent:', cliente);
    });
  }

  cambiarTab(tab: string) {
    this.activeTab = tab;
  }

  filtrarRegistros() {
    return this.registros.filter(r =>
      (!this.filtroPrefijo || r.prefijo.includes(this.filtroPrefijo)) &&
      (!this.busqueda || r.descripcion.toLowerCase().includes(this.busqueda.toLowerCase()))
    );
  }

  seleccionarRegistro(registro: any) {
    this.registroSeleccionado = registro;
  }
  salir(): void {
  this.router.navigate(['/pages/clientes']);
}
}

