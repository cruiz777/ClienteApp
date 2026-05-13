import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';

import { ParametrosCostosService } from 'src/app/services/parametros-costos.service';
import { ParametrosCostosResponse } from 'src/app/interfaces/responses/parametros-costos.response';
import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
import { ParametrosCostosFormComponent } from '../form/parametros-costos-form.component';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-parametros-costos',
  standalone: true,
  imports: [CommonModule, FormsModule, MatPaginatorModule],
  templateUrl: './parametros-costos.component.html',
  styleUrls: ['./parametros-costos.component.css']
})
export class ParametrosCostosComponent implements OnInit {

  loading = false;

  parametros: ParametrosCostosResponse[] = [];
  filtered: ParametrosCostosResponse[] = [];

  searchTerm = '';

  readonly skeletonRows = Array(6).fill(0);
  currentPage = 0;
  pageSize = 10;
  totalItems = 0;
  paginated: ParametrosCostosResponse[] = [];
  pageSizeOptions = [10, 25, 50];
  private reseteandoPagina = false;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private parametrosCostosService: ParametrosCostosService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.obtenerParametros();
  }

  obtenerParametros(): void {
    this.loading = true;

    this.parametrosCostosService.getAll().subscribe({
      next: (resp: ApiResponse<ParametrosCostosResponse[]>) => {
        this.parametros = resp?.data ?? [];
        this.filtered = [...this.parametros];
        this.currentPage = 0;
        this.actualizarPaginacion();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al obtener los parámetros de costos:', err);
        this.loading = false;
        this.mostrarMensaje({
          type: 'error',
          title: 'Error al cargar',
          message: err?.error?.message ?? err?.message ?? 'No se pudo obtener la lista de parámetros de costos.',
          showCancel: false,
          confirmText: 'Aceptar'
        });
      }
    });
  }

  buscar(): void {
    const term = (this.searchTerm ?? '').trim().toLowerCase();
    if (!term) {
      this.filtered = [...this.parametros];
    } else {
      this.filtered = this.parametros.filter(p =>
        (p.nombre ?? '').toLowerCase().includes(term) ||
        (p.descripcion ?? '').toLowerCase().includes(term)
      );
    }
    this.currentPage = 0;
    this.actualizarPaginacion();

    this.reseteandoPagina = true;
    this.paginator?.firstPage();
    this.reseteandoPagina = false;
  }
  private actualizarPaginacion(): void {
    this.totalItems = this.filtered.length;
    const start = this.currentPage * this.pageSize;
    this.paginated = this.filtered.slice(start, start + this.pageSize);
  }

  onPageChange(event: PageEvent): void {
    if (this.reseteandoPagina) return;
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.actualizarPaginacion();
  }
  abrirCrear(): void {
    const dialogRef = this.dialog.open(ParametrosCostosFormComponent, {
      width: '600px',
      data: {}
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.obtenerParametros();
    });
  }

  abrirEditar(id: number): void {
    const dialogRef = this.dialog.open(ParametrosCostosFormComponent, {
      width: '600px',
      data: { id }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.obtenerParametros();
    });
  }

  trackById = (_: number, it: ParametrosCostosResponse) => it?.idParCosto ?? _;

  private mostrarMensaje(data: MessageBoxData) {
    return this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: { confirmText: 'Aceptar', cancelText: 'Cancelar', ...data }
    });
  }
}