// src/app/components/sic-3000/autorizacion-caja-list/autorizacion-caja-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

import {
  AutorizacionCajaService,
  AutorizacionCaja,
  ApiResponse,
  PagedData
} from 'src/app/services/autorizacion-caja.service';

// ✅ IMPORT CORRECTO (NO ./)
import {
  AutorizacionCajaFormComponent,
  AutorizacionCajaFormData
} from '../autorizacion-caja-form/autorizacion-caja-form.component';

@Component({
  selector: 'app-autorizacion-caja-list',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule],
  templateUrl: './autorizacion-caja-list.component.html',
  styleUrls: ['./autorizacion-caja-list.component.css'],
})
export class AutorizacionCajaListComponent implements OnInit {
  loading = false;
  error: string | null = null;

  items: AutorizacionCaja[] = [];
  filtered: AutorizacionCaja[] = [];

  searchTerm = '';

  page = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;

  constructor(
    private autCajaService: AutorizacionCajaService,
    private dialog: MatDialog
  ) {}

 async ngOnInit(): Promise<void> {
  await this.autCajaService.ensureTiposDocumentoLoaded();
  this.cargar();
}


  cargar(page: number = 1): void {
    this.loading = true;
    this.error = null;

    this.autCajaService.getPaged(page, this.pageSize).subscribe({
      next: (resp: ApiResponse<PagedData<AutorizacionCaja>>) => {
        if (resp.type === 'Success') {
          const data = resp.data;
          this.items = data?.items ?? [];
          this.filtered = [...this.items];

          this.page = data?.page ?? page;
          this.pageSize = data?.pageSize ?? this.pageSize;
          this.totalItems = data?.totalItems ?? this.items.length;
          this.totalPages = data?.totalPages ?? 1;

          if ((this.searchTerm ?? '').trim()) this.buscar();
        } else {
          this.error = resp.message || 'Error al cargar autorizaciones';
        }
        this.loading = false;
      },
      error: (err: any) => {
        console.error(err);
        this.error = err?.message ?? 'Error al cargar autorizaciones';
        this.loading = false;
      }
    });
  }

  buscar(): void {
    const term = (this.searchTerm ?? '').trim().toLowerCase();
    if (!term) {
      this.filtered = [...this.items];
      return;
    }

    this.filtered = this.items.filter(x => {
      const tipo = this.fmtTipo(x).toLowerCase();
      return (
        (x.id_autorizacion_caja?.toString() ?? '').includes(term) ||
        (x.caja ?? '').toLowerCase().includes(term) ||
        (x.numero_autorizacion ?? '').toLowerCase().includes(term) ||
        (x.num_establecimiento ?? '').toLowerCase().includes(term) ||
        (x.direccion ?? '').toLowerCase().includes(term) ||
        (x.ruc ?? '').toLowerCase().includes(term) ||
        (x.nombre_comercial ?? '').toLowerCase().includes(term) ||
        (x.estado ?? '').toLowerCase().includes(term) ||
        (x.numero ?? '').toLowerCase().includes(term) ||
        tipo.includes(term)
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
    const data: AutorizacionCajaFormData = { modo: 'crear', item: null };

    this.dialog.open(AutorizacionCajaFormComponent, {
      width: '950px',
      data
    }).afterClosed().subscribe((ok: boolean) => {
      if (ok) this.cargar(this.page);
    });
  }

  abrirEditar(it: AutorizacionCaja): void {
    const data: AutorizacionCajaFormData = { modo: 'editar', item: it };

    this.dialog.open(AutorizacionCajaFormComponent, {
      width: '950px',
      data
    }).afterClosed().subscribe((ok: boolean) => {
      if (ok) this.cargar(this.page);
    });
  }

  fmtTipo(it: AutorizacionCaja): string {
    return (it.tipo_documento_descripcion ?? '').trim()
      ? (it.tipo_documento_descripcion ?? '').trim()
      : this.autCajaService.tipoDocumentoLabel(it.id_tipo_documento);
  }

  trackById = (_: number, it: AutorizacionCaja) => it?.id_autorizacion_caja ?? _;
}
