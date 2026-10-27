// src/app/components/sic-3000/forma-pago/forma-pago-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import {
  FormaPagoService,
  FormaPagoResponse,
  ApiResponse,
  PagedData
} from 'src/app/services/forma-pago.service';

import { FormaPagoFormComponent } from '../forma-pago-form/forma-pago-form.component';

@Component({
  selector: 'app-forma-pago-list',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule],
  templateUrl: './forma-pago-list.component.html',
  styleUrls: ['./forma-pago-list.component.css']
})
export class FormaPagoListComponent implements OnInit {

  loading = false;
  error: string | null = null;

  formasPago: FormaPagoResponse[] = [];
  filtered: FormaPagoResponse[] = [];

  searchTerm = '';

  page = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;

  constructor(
    private formaPagoService: FormaPagoService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.obtenerFormasPago();
  }

  obtenerFormasPago(): void {
    this.loading = true;
    this.error = null;

    this.formaPagoService
      .getPagedLite(this.page, this.pageSize)
      .subscribe({
        next: (resp: ApiResponse<PagedData<FormaPagoResponse>>) => {
          if (resp.type !== 'Success') {
            this.error = resp.message || 'Error al obtener formas de pago';
            this.formasPago = [];
            this.filtered = [];
            this.loading = false;
            return;
          }

          const data = resp.data;
          this.formasPago = data.items ?? [];
          this.filtered = [...this.formasPago];

          this.totalItems = data.totalItems;
          this.totalPages = data.totalPages;

          this.loading = false;
        },
        error: err => {
          console.error('[FormaPagoList] Error al obtener formas de pago:', err);
          this.error = err?.message ?? 'Error al cargar formas de pago';
          this.loading = false;
        }
      });
  }

  buscar(): void {
    const term = (this.searchTerm ?? '').trim().toLowerCase();
    if (!term) {
      this.filtered = [...this.formasPago];
      return;
    }

    this.filtered = this.formasPago.filter(it =>
      (it.descripcionPago ?? '').toLowerCase().includes(term) ||
      (it.codigo_cuenta ?? '').toLowerCase().includes(term)
    );
  }

  // 🔹 Nuevo
  abrirCrear(): void {
    const dialogRef = this.dialog.open(FormaPagoFormComponent, {
      width: '700px',
      data: {
        modo: 'crear' as const
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.obtenerFormasPago();
      }
    });
  }

  // 🔹 Editar (paso el objeto completo)
  abrirEditar(forma: FormaPagoResponse): void {
    const dialogRef = this.dialog.open(FormaPagoFormComponent, {
      width: '700px',
      data: {
        modo: 'editar' as const,
        forma
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.obtenerFormasPago();
      }
    });
  }

  trackById = (_: number, it: FormaPagoResponse) =>
    it?.idFormaPago ?? _;
}
