import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ProyectoResponse } from 'src/app/interfaces/responses/proyecto-response';
import { ProyectoService } from 'src/app/services/proyecto.service';

@Component({
  selector: 'app-proyecto-list',
  templateUrl: './proyecto-list.component.html',
  styleUrls: ['./proyecto-list.component.css']
})
export class ProyectoListComponent implements OnInit {
  proyectos: ProyectoResponse[] = [];
  filteredProyectos: ProyectoResponse[] = [];
  searchTerm: string = '';

  constructor(
    private projectService: ProyectoService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.obtenerProyectos();
  }

  obtenerProyectos(): void {
    this.projectService.getAll().subscribe({
      next: (response) => {
        this.proyectos = response.data;
        this.filteredProyectos = response.data;
      },
      error: (err) => {
        console.error('Error al obtener proyectos:', err);
      }
    });
  }

  search(): void {
    const term = this.searchTerm.toLowerCase();
    this.filteredProyectos = this.proyectos.filter(p =>
      p.descripcion.toLowerCase().includes(term)
    );
  }

  nuevoProyecto(): void {
    this.router.navigate(['/seguridades/proyectos/crear']);
  }

  editarProyecto(id: number): void {
    this.router.navigate(['/seguridades/proyectos/editar', id]);
  }
}
