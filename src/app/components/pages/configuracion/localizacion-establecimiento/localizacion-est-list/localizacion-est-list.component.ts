import { Component, OnInit, ViewChild } from '@angular/core';
import { TipoLocalizacionService } from 'src/app/services/tipo-localizacion.service';
import { TipoLocalizacionResponse } from 'src/app/interfaces/responses/tipo-localizacion-response';
import { Router } from '@angular/router';
import { MatPaginator, PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-localizacion-est-list',
  templateUrl: './localizacion-est-list.component.html',
  styleUrls: ['./localizacion-est-list.component.css']
})
export class TipoLocalizacionListComponent implements OnInit {
  tipoLocalizaciones: TipoLocalizacionResponse[] = [];
  paginatedLocalizaciones: TipoLocalizacionResponse[] = [];
  pageSize: number = 5;
  filteredLength: number = 0;
  searchTerm: string = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private tipoLocalizacionService: TipoLocalizacionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarLocalizaciones();
  }

  cargarLocalizaciones(): void {
    this.tipoLocalizacionService.getAll().subscribe({
      next: (res) => {
        this.tipoLocalizaciones = res.data;
        this.applyFilter();
      }
    });
  }

  applyFilter(): void {
    const filtered = this.tipoLocalizaciones.filter(t =>
      t.descripcion.toLowerCase().includes(this.searchTerm.toLowerCase())
    );

    this.filteredLength = filtered.length;
    this.setPage(0, filtered); // se inicia desde la primera página
  }

  setPage(pageIndex: number, source?: TipoLocalizacionResponse[]): void {
    const baseList = source || this.tipoLocalizaciones;
    const start = pageIndex * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedLocalizaciones = baseList.slice(start, end);
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.setPage(event.pageIndex, this.tipoLocalizaciones.filter(t =>
      t.descripcion.toLowerCase().includes(this.searchTerm.toLowerCase())
    ));
  }

  crearLocalizacion(): void {
    this.router.navigate(['/menus/localizacion/crear']);
  }

  editarLocalizacion(id: number): void {
    this.router.navigate(['/menus/localizacion/editar', id]);
  }
}
