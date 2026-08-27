import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ApiResponse } from 'src/app/interfaces/responses/api-response';

import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
import { RpCargosResponse } from 'src/app/interfaces/responses/cargos-rol-response';
import { RpCargosService } from 'src/app/services/cargos.service';
import { RpCargosFormComponent } from '../form/cargos-form.component';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-rp-cargos',
  standalone: true,
  imports: [CommonModule, FormsModule, MatPaginatorModule],
  templateUrl: './cargos.component.html',
  styleUrls: ['./cargos.component.css']
})
export class RpCargosComponent implements OnInit {

  // Estado UI
  loading = false;

  // Datos
  cargos: RpCargosResponse[] = [];
  filtered: RpCargosResponse[] = [];

  // Búsqueda
  searchTerm = '';

  // Skeleton: filas fantasma mientras carga
  readonly skeletonRows = Array(6).fill(0);
  currentPage = 0;
  pageSize = 10;
  totalItems = 0;
  paginated: RpCargosResponse[] = [];
  pageSizeOptions = [10, 25, 50];
  private reseteandoPagina = false;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  constructor(
    private rpCargosService: RpCargosService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.obtenerCargos();
  }

  obtenerCargos(): void {
    this.loading = true;

    this.rpCargosService.getAll().subscribe({
      next: (resp: ApiResponse<RpCargosResponse[]>) => {
        this.cargos = resp?.data ?? [];
        this.filtered = [...this.cargos];
        this.currentPage = 0;
        this.actualizarPaginacion();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al obtener los cargos:', err);
        this.loading = false;
        this.mostrarMensaje({
          type: 'error',
          title: 'Error al cargar',
          message: err?.error?.message ?? err?.message ?? 'No se pudo obtener la lista de cargos.',
          showCancel: false,
          confirmText: 'Aceptar'
        });
      }
    });
  }

  buscar(): void {
    const term = (this.searchTerm ?? '').trim().toLowerCase();
    if (!term) {
      this.filtered = [...this.cargos];
    } else {
      this.filtered = this.cargos.filter(c =>
        (c.descargo ?? '').toLowerCase().includes(term) ||
        (c.codsec ?? '').toLowerCase().includes(term)
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
    const dialogRef = this.dialog.open(RpCargosFormComponent, {
      width: '600px',
      data: {}
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.obtenerCargos();
    });
  }

  abrirEditar(id: number): void {
    const dialogRef = this.dialog.open(RpCargosFormComponent, {
      width: '600px',
      data: { id }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.obtenerCargos();
    });
  }

  trackById = (_: number, it: RpCargosResponse) => it?.idCargo ?? _;

  private mostrarMensaje(data: MessageBoxData) {
    return this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: { confirmText: 'Aceptar', cancelText: 'Cancelar', ...data }
    });
  }
}