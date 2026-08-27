import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';

import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
import { RpBancosResponse } from 'src/app/interfaces/responses/bancos-rol-response';
import { RpBancosService } from 'src/app/services/rol/bancos-rol.service';
import { RpBancosFormComponent } from '../form/bancos-form-rol.component';

@Component({
  selector: 'app-rp-bancos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bancos-rol.component.html',
  styleUrls: ['./bancos-rol.component.css']
})
export class RpBancosComponent implements OnInit {

  loading = false;
  bancos: RpBancosResponse[] = [];
  filtered: RpBancosResponse[] = [];
  searchTerm = '';
  readonly skeletonRows = Array(6).fill(0);

  constructor(
    private rpBancosService: RpBancosService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.obtenerBancos();
  }

  obtenerBancos(): void {
    this.loading = true;
    this.rpBancosService.getAll().subscribe({
      next: (resp: ApiResponse<RpBancosResponse[]>) => {
        this.bancos = resp?.data ?? [];
        this.filtered = [...this.bancos];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al obtener bancos:', err);
        this.loading = false;
        this.mostrarMensaje({
          type: 'error',
          title: 'Error al cargar',
          message: err?.error?.message ?? err?.message ?? 'No se pudo obtener la lista de bancos.',
          showCancel: false,
          confirmText: 'Aceptar'
        });
      }
    });
  }

  buscar(): void {
    const term = (this.searchTerm ?? '').trim().toLowerCase();
    if (!term) { this.filtered = [...this.bancos]; return; }
    this.filtered = this.bancos.filter(b =>
      (b.desban ?? '').toLowerCase().includes(term) ||
      (b.desban2 ?? '').toLowerCase().includes(term) ||
      (b.codcue ?? '').toLowerCase().includes(term)
    );
  }

  abrirCrear(): void {
    this.dialog.open(RpBancosFormComponent, { width: '650px', data: {} })
      .afterClosed().subscribe(result => { if (result) this.obtenerBancos(); });
  }

  abrirEditar(id: number): void {
    this.dialog.open(RpBancosFormComponent, { width: '650px', data: { id } })
      .afterClosed().subscribe(result => { if (result) this.obtenerBancos(); });
  }

  trackById = (_: number, it: RpBancosResponse) => it?.codban ?? _;

  private mostrarMensaje(data: MessageBoxData) {
    return this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: { confirmText: 'Aceptar', cancelText: 'Cancelar', ...data }
    });
  }
}