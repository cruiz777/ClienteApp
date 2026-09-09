import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
import { RpFormaPagoResponse } from 'src/app/interfaces/responses/forma-pago-rol-response';
import { RpFormaPagoService } from 'src/app/services/rol/forma-pago-rol.service';
import { RpFormaPagoRolFormComponent } from '../form/forma-pago-form-rol.component';

@Component({
  selector: 'app-forma-pago',
  standalone: true,
  imports: [CommonModule, FormsModule, MatPaginatorModule],
  templateUrl: './forma-pago-rol.component.html',
  styleUrls: ['./forma-pago-rol.component.css']
})
export class RpFormaPagoRolComponent implements OnInit {

  loading = false;

  formasPago: RpFormaPagoResponse[] = [];
  filtered: RpFormaPagoResponse[] = [];

  searchTerm = '';

  currentPage = 0;
  pageSize = 10;
  totalItems = 0;
  paginated: RpFormaPagoResponse[] = [];
  pageSizeOptions = [10, 25, 50];
  private reseteandoPagina = false;

  readonly skeletonRows = Array(6).fill(0);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private rpFormaPagoService: RpFormaPagoService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.obtenerFormasPago();
  }

  obtenerFormasPago(): void {
    this.loading = true;

    this.rpFormaPagoService.getAll().subscribe({
      next: (resp: ApiResponse<RpFormaPagoResponse[]>) => {
        this.formasPago = resp?.data ?? [];
        this.filtered = [...this.formasPago];
        this.currentPage = 0;
        this.actualizarPaginacion();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al obtener formas de pago:', err);
        this.loading = false;
        this.mostrarMensaje({
          type: 'error',
          title: 'Error al cargar',
          message: err?.error?.message ?? err?.message ?? 'No se pudo obtener la lista de formas de pago.',
          showCancel: false,
          confirmText: 'Aceptar'
        });
      }
    });
  }

  buscar(): void {
    const term = (this.searchTerm ?? '').trim().toLowerCase();
    if (!term) {
      this.filtered = [...this.formasPago];
    } else {
      this.filtered = this.formasPago.filter(f =>
        (f.descripcion ?? '').toLowerCase().includes(term)
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
    const dialogRef = this.dialog.open(RpFormaPagoRolFormComponent, {
      width: '600px',
      data: {}
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.obtenerFormasPago();
    });
  }

  abrirEditar(id: number): void {
    const dialogRef = this.dialog.open(RpFormaPagoRolFormComponent, {
      width: '600px',
      data: { id }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.obtenerFormasPago();
    });
  }

  trackById = (_: number, it: RpFormaPagoResponse) => it?.idFormaPago ?? _;

  private mostrarMensaje(data: MessageBoxData) {
    return this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: { confirmText: 'Aceptar', cancelText: 'Cancelar', ...data }
    });
  }
}