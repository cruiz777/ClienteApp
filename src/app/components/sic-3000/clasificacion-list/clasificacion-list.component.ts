// src/app/components/sic-3000/clasificacion/clasificacion-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

import {
  ClasificacionService,
  ClasificacionResponse,
  ApiResponse,
  PagedData
} from 'src/app/services/clasificacion.service';

import { ClasificacionFormComponent, ClasificacionFormData } from '../clasificacion-form/clasificacion-form.component';

@Component({
  selector: 'app-clasificacion-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule
  ],
  templateUrl: './clasificacion-list.component.html',
  styleUrls: ['./clasificacion-list.component.css']
})
export class ClasificacionListComponent implements OnInit {

  loading = false;
  error: string | null = null;

  // datos
  clasificaciones: ClasificacionResponse[] = [];
  filtered: ClasificacionResponse[] = [];

  // búsqueda
  searchTerm = '';

  // paginación simple
  page = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;

  constructor(
    private clasificacionService: ClasificacionService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.cargarClasificaciones();
  }

  cargarClasificaciones(page: number = 1): void {
    this.loading = true;
    this.error = null;

    this.clasificacionService.getPaged(page, this.pageSize).subscribe({
      next: (resp: ApiResponse<PagedData<ClasificacionResponse>>) => {
        if (resp.type === 'Success') {
          const data = resp.data;
          this.clasificaciones = data.items ?? [];
          this.filtered = [...this.clasificaciones];

          this.page = data.page;
          this.pageSize = data.pageSize;
          this.totalItems = data.totalItems;
          this.totalPages = data.totalPages;
        } else {
          this.error = resp.message || 'Error al cargar clasificaciones';
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('[ClasificacionList] Error al obtener clasificaciones:', err);
        this.error = err?.message ?? 'Error al cargar clasificaciones';
        this.loading = false;
      }
    });
  }

  buscar(): void {
    const term = (this.searchTerm ?? '').trim().toLowerCase();
    if (!term) {
      this.filtered = [...this.clasificaciones];
      return;
    }

    this.filtered = this.clasificaciones.filter(c =>
      (c.descripcion ?? '').toLowerCase().includes(term) ||
      (c.codigoCuenta ?? '').toLowerCase().includes(term)
    );
  }

  // paginación básica
  paginaAnterior(): void {
    if (this.page > 1) {
      this.cargarClasificaciones(this.page - 1);
    }
  }

  paginaSiguiente(): void {
    if (this.page < this.totalPages) {
      this.cargarClasificaciones(this.page + 1);
    }
  }

  abrirCrear(): void {
    const data: ClasificacionFormData = {
      modo: 'crear',
      clasificacion: null
    };

    const dialogRef = this.dialog.open(ClasificacionFormComponent, {
      width: '520px',
      data
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.cargarClasificaciones(this.page);
      }
    });
  }

  abrirEditar(item: ClasificacionResponse): void {
    const data: ClasificacionFormData = {
      modo: 'editar',
      clasificacion: item
    };

    const dialogRef = this.dialog.open(ClasificacionFormComponent, {
      width: '520px',
      data
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.cargarClasificaciones(this.page);
      }
    });
  }

  trackById = (_: number, it: ClasificacionResponse) =>
    it?.idClasificacion ?? _;
}
