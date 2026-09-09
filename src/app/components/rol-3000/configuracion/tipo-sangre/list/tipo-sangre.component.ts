import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
import { RpTipoSangreResponse } from 'src/app/interfaces/responses/tipo-sangre-response';
import { RpTipoSangreService } from 'src/app/services/rol/tipo-sangre.service';
import { RpTipoSangreFormComponent } from '../form/tipo-sangre-form.component';

@Component({
  selector: 'app-tipo-sangre',
  standalone: true,
  imports: [CommonModule, FormsModule, MatPaginatorModule],
  templateUrl: './tipo-sangre.component.html',
  styleUrls: ['./tipo-sangre.component.css']
})
export class RpTipoSangreComponent implements OnInit {

  loading = false;

  tiposSangre: RpTipoSangreResponse[] = [];
  filtered: RpTipoSangreResponse[] = [];

  searchTerm = '';

  currentPage = 0;
  pageSize = 10;
  totalItems = 0;
  paginated: RpTipoSangreResponse[] = [];
  pageSizeOptions = [10, 25, 50];
  private reseteandoPagina = false;

  readonly skeletonRows = Array(6).fill(0);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private rpTipoSangreService: RpTipoSangreService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.obtenerTiposSangre();
  }

  obtenerTiposSangre(): void {
    this.loading = true;

    this.rpTipoSangreService.getAll().subscribe({
      next: (resp: ApiResponse<RpTipoSangreResponse[]>) => {
        this.tiposSangre = resp?.data ?? [];
        this.filtered = [...this.tiposSangre];
        this.currentPage = 0;
        this.actualizarPaginacion();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al obtener tipos de sangre:', err);
        this.loading = false;
        this.mostrarMensaje({
          type: 'error',
          title: 'Error al cargar',
          message: err?.error?.message ?? err?.message ?? 'No se pudo obtener la lista de tipos de sangre.',
          showCancel: false,
          confirmText: 'Aceptar'
        });
      }
    });
  }

  buscar(): void {
    const term = (this.searchTerm ?? '').trim().toLowerCase();
    if (!term) {
      this.filtered = [...this.tiposSangre];
    } else {
      this.filtered = this.tiposSangre.filter(t =>
        t.descripcion.toLowerCase().includes(term)
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
    const dialogRef = this.dialog.open(RpTipoSangreFormComponent, {
      width: '600px',
      data: {}
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.obtenerTiposSangre();
    });
  }

  abrirEditar(id: number): void {
    const dialogRef = this.dialog.open(RpTipoSangreFormComponent, {
      width: '600px',
      data: { id }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.obtenerTiposSangre();
    });
  }

  trackById = (_: number, it: RpTipoSangreResponse) => it?.idTipoSangre ?? _;

  private mostrarMensaje(data: MessageBoxData) {
    return this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: { confirmText: 'Aceptar', cancelText: 'Cancelar', ...data }
    });
  }
}