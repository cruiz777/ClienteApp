import { Component, OnInit, ViewChild } from '@angular/core';
import { GrupoClienteService } from 'src/app/services/grupo-cliente.service';
import { Router } from '@angular/router';
import { GrupoCliente } from 'src/app/interfaces/responses/grupo-cliente-response';
import { MatPaginator } from '@angular/material/paginator';

@Component({
  selector: 'app-grupo-cliente-list',
  templateUrl: './grupo-cliente-list.component.html',
  styleUrls: ['./grupo-cliente-list.component.css']
})
export class GrupoClienteListComponent implements OnInit {
  grupos: GrupoCliente[] = [];
  gruposFiltrados: GrupoCliente[] = [];
  filtro: string = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private grupoClienteService: GrupoClienteService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarGrupos();
  }

  cargarGrupos(): void {
    this.grupoClienteService.getAll().subscribe({
      next: (res) => {
        this.grupos = res.data;
        this.aplicarFiltro();
      },
      error: () => {
        console.error('Error al cargar grupos de cliente.');
      }
    });
  }

  aplicarFiltro(): void {
    const value = this.filtro.toLowerCase();
    this.gruposFiltrados = this.grupos.filter(g =>
      g.nombre.toLowerCase().includes(value) ||
      g.codigo.toLowerCase().includes(value)
    );
    if (this.paginator) {
      this.paginator.firstPage();
    }
  }

  get paginatedData(): GrupoCliente[] {
    if (!this.paginator) return this.gruposFiltrados;

    const start = this.paginator.pageIndex * this.paginator.pageSize;
    return this.gruposFiltrados.slice(start, start + this.paginator.pageSize);
  }

  nuevo(): void {
    this.router.navigate(['/menus/grupocliente/crear']);
  }

  editar(id: number): void {
    this.router.navigate(['/menus/grupocliente/editar', id]);
  }

  exportar(): void {
    alert('Exportación no implementada aún.');
  }
}
