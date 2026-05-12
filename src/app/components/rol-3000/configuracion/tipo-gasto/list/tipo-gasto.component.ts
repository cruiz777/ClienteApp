import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';

import { TipoGastoService } from 'src/app/services/tipo-gasto.service';
import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
import { TipoGastoResponse } from 'src/app/interfaces/responses/tipo-gasto-response';
import { TipoGastoFormComponent } from '../form/tipo-gasto-form.component';

@Component({
  selector: 'app-tipo-gasto',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tipo-gasto.component.html',
  styleUrls: ['./tipo-gasto.component.css']
})
export class TipoGastoComponent implements OnInit {

  loading = false;

  tipoGastos: TipoGastoResponse[] = [];
  filtered: TipoGastoResponse[] = [];

  searchTerm = '';

  readonly skeletonRows = Array(6).fill(0);

  constructor(
    private tipoGastoService: TipoGastoService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.obtenerTipoGastos();
  }

  obtenerTipoGastos(): void {
    this.loading = true;

    this.tipoGastoService.getAll().subscribe({
      next: (resp: ApiResponse<TipoGastoResponse[]>) => {
        this.tipoGastos = resp?.data ?? [];
        this.filtered = [...this.tipoGastos];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al obtener los tipos de gasto:', err);
        this.loading = false;
        this.mostrarMensaje({
          type: 'error',
          title: 'Error al cargar',
          message: err?.error?.message ?? err?.message ?? 'No se pudo obtener la lista de tipos de gasto.',
          showCancel: false,
          confirmText: 'Aceptar'
        });
      }
    });
  }

  buscar(): void {
    const term = (this.searchTerm ?? '').trim().toLowerCase();
    if (!term) {
      this.filtered = [...this.tipoGastos];
      return;
    }
    this.filtered = this.tipoGastos.filter(t =>
      (t.descripcion ?? '').toLowerCase().includes(term)
    );
  }

  abrirCrear(): void {
    const dialogRef = this.dialog.open(TipoGastoFormComponent, {
      width: '600px',
      data: {}
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.obtenerTipoGastos();
    });
  }

  abrirEditar(id: number): void {
    const dialogRef = this.dialog.open(TipoGastoFormComponent, {
      width: '600px',
      data: { id }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.obtenerTipoGastos();
    });
  }

  trackById = (_: number, it: TipoGastoResponse) => it?.idTipoGasto ?? _;

  private mostrarMensaje(data: MessageBoxData) {
    return this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: { confirmText: 'Aceptar', cancelText: 'Cancelar', ...data }
    });
  }
}