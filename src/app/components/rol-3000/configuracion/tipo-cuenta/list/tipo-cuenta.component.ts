import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';

import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
import { TipoCuentaBancoResponse } from 'src/app/interfaces/responses/tipo-cuenta-response';
import { TipoCuentaBancoService } from 'src/app/services/rol/tipo-cuenta.service';
import { TipoCuentaBancoFormComponent } from '../form/tipo-cuenta-form.component';

@Component({
  selector: 'app-tipo-cuenta-banco',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tipo-cuenta.component.html',
  styleUrls: ['./tipo-cuenta.component.css']
})
export class TipoCuentaBancoComponent implements OnInit {

  loading = false;

  tiposCuentaBanco: TipoCuentaBancoResponse[] = [];
  filtered: TipoCuentaBancoResponse[] = [];

  searchTerm = '';

  readonly skeletonRows = Array(6).fill(0);

  constructor(
    private tipoCuentaBancoService: TipoCuentaBancoService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.obtenerTiposCuentaBanco();
  }

  obtenerTiposCuentaBanco(): void {
    this.loading = true;

    this.tipoCuentaBancoService.getAll().subscribe({
      next: (resp: ApiResponse<TipoCuentaBancoResponse[]>) => {
        this.tiposCuentaBanco = resp?.data ?? [];
        this.filtered = [...this.tiposCuentaBanco];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al obtener tipos de cuenta banco:', err);
        this.loading = false;
        this.mostrarMensaje({
          type: 'error',
          title: 'Error al cargar',
          message: err?.error?.message ?? err?.message ?? 'No se pudo obtener la lista de tipos de cuenta banco.',
          showCancel: false,
          confirmText: 'Aceptar'
        });
      }
    });
  }

  buscar(): void {
    const term = (this.searchTerm ?? '').trim().toLowerCase();
    if (!term) {
      this.filtered = [...this.tiposCuentaBanco];
      return;
    }
    this.filtered = this.tiposCuentaBanco.filter(t =>
      (t.desCuentaBanco ?? '').toLowerCase().includes(term)
    );
  }

  abrirCrear(): void {
    const dialogRef = this.dialog.open(TipoCuentaBancoFormComponent, {
      width: '600px',
      data: {}
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.obtenerTiposCuentaBanco();
    });
  }

  abrirEditar(id: number): void {
    const dialogRef = this.dialog.open(TipoCuentaBancoFormComponent, {
      width: '600px',
      data: { id }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.obtenerTiposCuentaBanco();
    });
  }

  trackById = (_: number, it: TipoCuentaBancoResponse) => it?.idCuentaBanco ?? _;

  private mostrarMensaje(data: MessageBoxData) {
    return this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: { confirmText: 'Aceptar', cancelText: 'Cancelar', ...data }
    });
  }
}