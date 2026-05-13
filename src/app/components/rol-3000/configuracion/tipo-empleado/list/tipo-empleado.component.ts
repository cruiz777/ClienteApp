import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ApiResponse } from 'src/app/interfaces/responses/api-response';

import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
import { RpTipEmpResponse } from 'src/app/interfaces/responses/tipo-empleado-response';
import { RpTipEmpService } from 'src/app/services/tipo-empleado.service';
import { TipoEmpleadoFormComponent } from '../form/tipo-empleado-form.component';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-rp-tipemp',
  standalone: true,
  imports: [CommonModule, FormsModule, MatPaginatorModule],
  templateUrl: './tipo-empleado.component.html',
  styleUrls: ['./tipo-empleado.component.css']
})
export class RpTipEmpComponent implements OnInit {

  // Estado UI
  loading = false;

  // Datos
  tipEmps: RpTipEmpResponse[] = [];
  filtered: RpTipEmpResponse[] = [];

  // Búsqueda
  searchTerm = '';

  // Skeleton: filas fantasma mientras carga
  readonly skeletonRows = Array(6).fill(0);
  currentPage = 0;
  pageSize = 10;
  totalItems = 0;
  paginated: RpTipEmpResponse[] = [];
  pageSizeOptions = [10, 25, 50];
  private reseteandoPagina = false;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private rpTipEmpService: RpTipEmpService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.obtenerTipEmps();
  }

  obtenerTipEmps(): void {
    this.loading = true;

    this.rpTipEmpService.getAll().subscribe({
      next: (resp: ApiResponse<RpTipEmpResponse[]>) => {
        this.tipEmps = resp?.data ?? [];
        this.filtered = [...this.tipEmps];
        this.currentPage = 0;
        this.actualizarPaginacion();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al obtener los tipos de empleado:', err);
        this.loading = false;
        this.mostrarMensaje({
          type: 'error',
          title: 'Error al cargar',
          message: err?.error?.message ?? err?.message ?? 'No se pudo obtener la lista de tipos de empleado.',
          showCancel: false,
          confirmText: 'Aceptar'
        });
      }
    });
  }

  buscar(): void {
    const term = (this.searchTerm ?? '').trim().toLowerCase();
    if (!term) {
      this.filtered = [...this.tipEmps];
    } else {
      this.filtered = this.tipEmps.filter(t =>
        (t.desTipemp ?? '').toLowerCase().includes(term)
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
    const dialogRef = this.dialog.open(TipoEmpleadoFormComponent, {
      width: '600px',
      data: {}
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.obtenerTipEmps();
    });
  }

  abrirEditar(id: number): void {
    const dialogRef = this.dialog.open(TipoEmpleadoFormComponent, {
      width: '600px',
      data: { id }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.obtenerTipEmps();
    });
  }

  trackById = (_: number, it: RpTipEmpResponse) => it?.idTipemp ?? _;

  private mostrarMensaje(data: MessageBoxData) {
    return this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: { confirmText: 'Aceptar', cancelText: 'Cancelar', ...data }
    });
  }
}