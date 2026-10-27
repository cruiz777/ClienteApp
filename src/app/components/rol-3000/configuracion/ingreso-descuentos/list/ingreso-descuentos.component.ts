import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';

import { IngresoDescuentosService } from 'src/app/services/ingreso-descuentos.service';
import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
import { IngresoDescuentosResponse } from 'src/app/interfaces/responses/ingreso-descuentos-request';
import { IngresoDescuentosFormComponent } from '../form/ingreso-descuentos-form.component';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-ingreso-descuentos',
  standalone: true,
  imports: [CommonModule, FormsModule, MatPaginatorModule],
  templateUrl: './ingreso-descuentos.component.html',
  styleUrls: ['./ingreso-descuentos.component.css']
})
export class IngresoDescuentosComponent implements OnInit {

  loading = false;

  ingresoDescuentos: IngresoDescuentosResponse[] = [];
  filtered: IngresoDescuentosResponse[] = [];

  searchTerm = '';

  readonly skeletonRows = Array(6).fill(0);
  currentPage = 0;
  pageSize = 10;
  totalItems = 0;
  paginated: IngresoDescuentosResponse[] = [];
  pageSizeOptions = [10, 25, 50];
  private reseteandoPagina = false;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private ingresoDescuentosService: IngresoDescuentosService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.obtenerIngresoDescuentos();
  }

  obtenerIngresoDescuentos(): void {
    this.loading = true;

    this.ingresoDescuentosService.getAll().subscribe({
      next: (resp: ApiResponse<IngresoDescuentosResponse[]>) => {
        this.ingresoDescuentos = resp?.data ?? [];
        this.filtered = [...this.ingresoDescuentos];
        this.currentPage = 0;
        this.actualizarPaginacion();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al obtener ingresos/descuentos:', err);
        this.loading = false;
        this.mostrarMensaje({
          type: 'error',
          title: 'Error al cargar',
          message: err?.error?.message ?? err?.message ?? 'No se pudo obtener la lista de ingresos/descuentos.',
          showCancel: false,
          confirmText: 'Aceptar'
        });
      }
    });
  }

  buscar(): void {
    const term = (this.searchTerm ?? '').trim().toLowerCase();
    if (!term) {
      this.filtered = [...this.ingresoDescuentos];
    } else {
      this.filtered = this.ingresoDescuentos.filter(i =>
        (i.descripcion ?? '').toLowerCase().includes(term) ||
        (i.codigo ?? '').toLowerCase().includes(term) ||
        (i.tipoPago ?? '').toLowerCase().includes(term)
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
    const dialogRef = this.dialog.open(IngresoDescuentosFormComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: {}
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.obtenerIngresoDescuentos();
    });
  }

  abrirEditar(id: number): void {
    const dialogRef = this.dialog.open(IngresoDescuentosFormComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: { id }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.obtenerIngresoDescuentos();
    });
  }

  trackById = (_: number, it: IngresoDescuentosResponse) => it?.idIngDesc ?? _;

  private mostrarMensaje(data: MessageBoxData) {
    return this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: { confirmText: 'Aceptar', cancelText: 'Cancelar', ...data }
    });
  }
}