import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

import {
  TipoDocumentoSriService,
  ApiResponse,
  PaginationResponse,
  TipoDocumentoSriResponse,
} from 'src/app/services/tipo-documento-sri.service';

import {
  TipoDocFormComponent,
  TipoDocFormData
} from '../tipo-doc-form/tipo-doc-form.component';

@Component({
  selector: 'app-tipo-doc-list',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule],
  templateUrl: './tipo-doc-list.component.html',
  styleUrls: ['./tipo-doc-list.component.css']
})
export class TipoDocListComponent implements OnInit {
  loading = false;
  error: string | null = null;

  items: TipoDocumentoSriResponse[] = [];
  filtered: TipoDocumentoSriResponse[] = [];

  searchTerm = '';

  page = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;

  constructor(
    private tipoDocService: TipoDocumentoSriService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(page: number = 1): void {
    this.loading = true;
    this.error = null;

    this.tipoDocService.getAll(page, this.pageSize).subscribe({
      next: (resp: ApiResponse<PaginationResponse<TipoDocumentoSriResponse>>) => {
        if ((resp.type || '').toLowerCase() === 'success') {
          const data = resp.data;

          // PaginationResponse típico
          this.items = data?.items ?? [];
          this.filtered = [...this.items];

          this.page = data?.page ?? page;
          this.pageSize = data?.pageSize ?? this.pageSize;
          this.totalItems = data?.totalItems ?? this.items.length;

          this.totalPages = this.totalItems > 0
            ? Math.ceil(this.totalItems / this.pageSize)
            : 1;

          if ((this.searchTerm ?? '').trim()) this.buscar();
        } else {
          this.error = resp.message || 'Error al cargar tipos de documento';
        }

        this.loading = false;
      },
      error: (err: any) => {
        console.error(err);
        this.error = err?.error?.message ?? err?.message ?? 'Error al cargar tipos de documento';
        this.loading = false;
      },
    });
  }

  buscar(): void {
    const term = (this.searchTerm ?? '').trim().toLowerCase();
    if (!term) {
      this.filtered = [...this.items];
      return;
    }

    this.filtered = this.items.filter(x => {
      return (
        (x.idTipoDocumento?.toString() ?? '').includes(term) ||
        (x.descripcion ?? '').toLowerCase().includes(term) ||
        (x.documentoSri ?? '').toLowerCase().includes(term)
      );
    });
  }

  paginaAnterior(): void {
    if (this.page > 1) this.cargar(this.page - 1);
  }

  paginaSiguiente(): void {
    if (this.page < this.totalPages) this.cargar(this.page + 1);
  }

  abrirCrear(): void {
    const data: TipoDocFormData = { modo: 'crear', item: null };

    this.dialog.open(TipoDocFormComponent, {
      width: '720px',
      data,
    }).afterClosed().subscribe((ok: boolean) => {
      if (ok) this.cargar(this.page);
    });
  }

  abrirEditar(it: TipoDocumentoSriResponse): void {
    const data: TipoDocFormData = { modo: 'editar', item: it };

    this.dialog.open(TipoDocFormComponent, {
      width: '720px',
      data,
    }).afterClosed().subscribe((ok: boolean) => {
      if (ok) this.cargar(this.page);
    });
  }

  trackById = (_: number, it: TipoDocumentoSriResponse) => it?.idTipoDocumento ?? _;
}
