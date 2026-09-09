import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';

import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
import { RpBanTerceroResponse } from 'src/app/interfaces/responses/bancos-terceros-rol-response';
import { RpBanTerceroService } from 'src/app/services/rol/bancos-terceros-rol.service';
import { RpBanTerceroFormComponent } from '../form/bancos-terceros-rol-form.component';

@Component({
  selector: 'app-rp-ban-tercero',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bancos-terceros-rol.component.html',
  styleUrls: ['./bancos-terceros-rol.component.css']
})
export class RpBanTerceroComponent implements OnInit {

  loading = false;
  banTerceros: RpBanTerceroResponse[] = [];
  filtered: RpBanTerceroResponse[] = [];
  searchTerm = '';
  readonly skeletonRows = Array(6).fill(0);

  constructor(
    private rpBanTerceroService: RpBanTerceroService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.obtenerBanTerceros();
  }

  obtenerBanTerceros(): void {
    this.loading = true;
    this.rpBanTerceroService.getAll().subscribe({
      next: (resp: ApiResponse<RpBanTerceroResponse[]>) => {
        this.banTerceros = resp?.data ?? [];
        this.filtered = [...this.banTerceros];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al obtener bancos terceros:', err);
        this.loading = false;
        this.mostrarMensaje({
          type: 'error',
          title: 'Error al cargar',
          message: err?.error?.message ?? err?.message ?? 'No se pudo obtener la lista de bancos terceros.',
          showCancel: false,
          confirmText: 'Aceptar'
        });
      }
    });
  }

  buscar(): void {
    const term = (this.searchTerm ?? '').trim().toLowerCase();
    if (!term) { this.filtered = [...this.banTerceros]; return; }
    this.filtered = this.banTerceros.filter(b =>
      (b.descripcion ?? '').toLowerCase().includes(term)
    );
  }

  abrirCrear(): void {
    this.dialog.open(RpBanTerceroFormComponent, { width: '600px', data: {} })
      .afterClosed().subscribe(result => { if (result) this.obtenerBanTerceros(); });
  }

  abrirEditar(id: number): void {
    this.dialog.open(RpBanTerceroFormComponent, { width: '600px', data: { id } })
      .afterClosed().subscribe(result => { if (result) this.obtenerBanTerceros(); });
  }

  trackById = (_: number, it: RpBanTerceroResponse) => it?.codBanTercero ?? _;

  private mostrarMensaje(data: MessageBoxData) {
    return this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: { confirmText: 'Aceptar', cancelText: 'Cancelar', ...data }
    });
  }
}