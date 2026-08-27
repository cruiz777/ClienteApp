// src/app/components/sic-3000/descuento/descuento-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

import { DescuentoService, Descuento } from 'src/app/services/descuento.service';
import {
  DescuentoFormComponent,
  DescuentoFormData
} from '../descuento-form/descuento-form.component';

@Component({
  selector: 'app-descuento-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule
  ],
  templateUrl: './descuento-list.component.html',
  styleUrls: ['./descuento-list.component.css']
})
export class DescuentoListComponent implements OnInit {

  loading = false;
  error: string | null = null;

  descuentos: Descuento[] = [];
  filtered: Descuento[] = [];

  searchTerm = '';

  constructor(
    private descuentoService: DescuentoService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.cargarDescuentos();
  }

  cargarDescuentos(): void {
    this.loading = true;
    this.error = null;

    this.descuentoService.getAll().subscribe({
      next: (list: Descuento[]) => {
        this.descuentos = list ?? [];
        this.filtered = [...this.descuentos];
        this.loading = false;
      },
      error: (err) => {
        console.error('[DescuentoList] Error al obtener descuentos:', err);
        this.error = err?.message ?? 'Error al cargar descuentos';
        this.loading = false;
      }
    });
  }

  buscar(): void {
    const term = (this.searchTerm ?? '').trim().toLowerCase();
    if (!term) {
      this.filtered = [...this.descuentos];
      return;
    }

    this.filtered = this.descuentos.filter(d =>
      (d.descripcion ?? '').toLowerCase().includes(term) ||
      String(d.valor ?? '').includes(term) ||
      (d.valorFormateado ?? '').toLowerCase().includes(term)
    );
  }

  abrirCrear(): void {
    const data: DescuentoFormData = {
      modo: 'crear',
      descuento: null
    };

    const dialogRef = this.dialog.open(DescuentoFormComponent, {
      width: '420px',
      data
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.cargarDescuentos();
      }
    });
  }

  abrirEditar(item: Descuento): void {
    const data: DescuentoFormData = {
      modo: 'editar',
      descuento: item
    };

    const dialogRef = this.dialog.open(DescuentoFormComponent, {
      width: '420px',
      data
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.cargarDescuentos();
      }
    });
  }

  trackById = (_: number, it: Descuento) =>
    it?.idDescuento ?? _;
}
