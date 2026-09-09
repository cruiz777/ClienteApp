import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ZonaRequest } from 'src/app/interfaces/requests/zona-request';
import { ZonaResponse } from 'src/app/interfaces/responses/zona-response';
import { ZonaService } from 'src/app/services/zona.service';


@Component({
  selector: 'app-zona-list',
  templateUrl: './zona-list.component.html',
  styleUrls: ['./zona-list.component.css']
})
export class ZonaListComponent implements OnInit {
  zonas: ZonaResponse[] = [];
  filteredZonas: ZonaResponse[] = [];
  searchTerm: string = '';
  mostrarFormulario: boolean = false;
  zonaSeleccionada?: ZonaRequest;
  constructor(private zonaService: ZonaService,
              private router: Router
  ) {}

  ngOnInit(): void {
    this.obtenerZonas();
  }

  obtenerZonas(): void {
    this.zonaService.getAll().subscribe({
      next: (zonas) => {
        this.zonas = zonas;
        this.filteredZonas = zonas;
      },
      error: (err) => {
        console.error('Error al obtener zonas:', err);
      }
    });
  }

  search(): void {
    const term = this.searchTerm.toLowerCase();
    this.filteredZonas = this.zonas.filter(z =>
      z.referencia.toLowerCase().includes(term) ||
      z.nombre.toLowerCase().includes(term)
    );
  }
  nuevaZona(): void {
    this.router.navigate(['/seguridades/zonas/crear']);
  }

  editarZona(idZona: number): void {
    this.router.navigate(['/seguridades/zonas/editar', idZona]);
  }
}
