import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TipoNegocioResponse } from 'src/app/interfaces/responses/tipo-negocio-response';
import { TipoNegocioService } from 'src/app/services/tipo-negocio.service';

@Component({
  selector: 'app-tipo-negocio-list',
  templateUrl: './tipo-negocio-list.component.html',
  styleUrls: ['./tipo-negocio-list.component.css']
})
export class TipoNegocioListComponent implements OnInit {
  tipoNegocios: TipoNegocioResponse[] = [];
  tipoNegociosFiltrados: TipoNegocioResponse[] = [];
  searchTerm: string = '';

  constructor(
    private tipoNegocioService: TipoNegocioService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.obtenerTipoNegocios();
  }

  obtenerTipoNegocios(): void {
    this.tipoNegocioService.getAll().subscribe({
      next: (resp) => {
        this.tipoNegocios = resp.data;
        this.tipoNegociosFiltrados = resp.data;
      },
      error: (err) => {
        console.error('Error al obtener los tipos de negocio:', err);
      }
    });
  }

  buscar(): void {
    const term = this.searchTerm.toLowerCase();
    this.tipoNegociosFiltrados = this.tipoNegocios.filter(t =>
      t.descripcion?.toLowerCase().includes(term)
    );
  }

  nuevoTipoNegocio(): void {
    this.router.navigate(['/seguridades/tipo-negocio/crear']);
  }

  editarTipoNegocio(id: number): void {
    this.router.navigate(['/seguridades/tipo-negocio/editar', id]);
  }
}
