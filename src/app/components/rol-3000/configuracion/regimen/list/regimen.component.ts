import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';


import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
import { RpRegimenResponse } from 'src/app/interfaces/responses/regimen-response';
import { RpRegimenService } from 'src/app/services/rol/regimen.service';
import { RpRegimenFormComponent } from '../form/regimen-form.component';

@Component({
  selector: 'app-regimen',
  standalone: true,
  imports: [CommonModule, FormsModule, MatPaginatorModule],
  templateUrl: './regimen.component.html',
  styleUrls: ['./regimen.component.css']
})
export class RpRegimenComponent implements OnInit {

  loading = false;

  regimenes: RpRegimenResponse[] = [];
  filtered: RpRegimenResponse[] = [];

  searchTerm = '';

  currentPage = 0;
  pageSize = 10;
  totalItems = 0;
  paginated: RpRegimenResponse[] = [];
  pageSizeOptions = [10, 25, 50];
  private reseteandoPagina = false;

  readonly skeletonRows = Array(6).fill(0);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private rpRegimenService: RpRegimenService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.obtenerRegimenes();
  }

  obtenerRegimenes(): void {
    this.loading = true;

    this.rpRegimenService.getAll().subscribe({
      next: (resp: ApiResponse<RpRegimenResponse[]>) => {
        this.regimenes = resp?.data ?? [];
        this.filtered = [...this.regimenes];
        this.currentPage = 0;
        this.actualizarPaginacion();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al obtener regímenes:', err);
        this.loading = false;
        this.mostrarMensaje({
          type: 'error',
          title: 'Error al cargar',
          message: err?.error?.message ?? err?.message ?? 'No se pudo obtener la lista de regímenes.',
          showCancel: false,
          confirmText: 'Aceptar'
        });
      }
    });
  }

  buscar(): void {
    const term = (this.searchTerm ?? '').trim().toLowerCase();
    if (!term) {
      this.filtered = [...this.regimenes];
    } else {
      this.filtered = this.regimenes.filter(r =>
        r.descripcion.toLowerCase().includes(term)
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
    const dialogRef = this.dialog.open(RpRegimenFormComponent, {
      width: '600px',
      data: {}
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.obtenerRegimenes();
    });
  }

  abrirEditar(id: number): void {
    const dialogRef = this.dialog.open(RpRegimenFormComponent, {
      width: '600px',
      data: { id }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.obtenerRegimenes();
    });
  }

  trackById = (_: number, it: RpRegimenResponse) => it?.id_regimen ?? _;

  private mostrarMensaje(data: MessageBoxData) {
    return this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: { confirmText: 'Aceptar', cancelText: 'Cancelar', ...data }
    });
  }
}