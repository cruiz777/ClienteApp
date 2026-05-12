import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';

import { SectorialService } from 'src/app/services/sectorial.service';
import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
import { SectorialResponse } from 'src/app/interfaces/responses/sectorial-response';
import { SectorialFormComponent } from '../form/sectorial-form.component';

@Component({
  selector: 'app-sectorial',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sectorial.component.html',
  styleUrls: ['./sectorial.component.css']
})
export class SectorialComponent implements OnInit {

  loading = false;

  sectoriales: SectorialResponse[] = [];
  filtered: SectorialResponse[] = [];

  searchTerm = '';

  readonly skeletonRows = Array(6).fill(0);

  constructor(
    private sectorialService: SectorialService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.obtenerSectoriales();
  }

  obtenerSectoriales(): void {
    this.loading = true;

    this.sectorialService.getAll().subscribe({
      next: (resp: ApiResponse<SectorialResponse[]>) => {
        this.sectoriales = resp?.data ?? [];
        this.filtered = [...this.sectoriales];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al obtener sectoriales:', err);
        this.loading = false;
        this.mostrarMensaje({
          type: 'error',
          title: 'Error al cargar',
          message: err?.error?.message ?? err?.message ?? 'No se pudo obtener la lista de sectoriales.',
          showCancel: false,
          confirmText: 'Aceptar'
        });
      }
    });
  }

  buscar(): void {
    const term = (this.searchTerm ?? '').trim().toLowerCase();
    if (!term) {
      this.filtered = [...this.sectoriales];
      return;
    }
    this.filtered = this.sectoriales.filter(s =>
      (s.desSectorial ?? '').toLowerCase().includes(term) ||
      (s.estructuraOcupacional ?? '').toLowerCase().includes(term) ||
      (s.codigoIess ?? '').toLowerCase().includes(term)
    );
  }

  abrirCrear(): void {
    const dialogRef = this.dialog.open(SectorialFormComponent, {
      width: '650px',
      data: {}
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.obtenerSectoriales();
    });
  }

  abrirEditar(id: number): void {
    const dialogRef = this.dialog.open(SectorialFormComponent, {
      width: '650px',
      data: { id }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.obtenerSectoriales();
    });
  }

  trackById = (_: number, it: SectorialResponse) => it?.idSectorial ?? _;

  private mostrarMensaje(data: MessageBoxData) {
    return this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: { confirmText: 'Aceptar', cancelText: 'Cancelar', ...data }
    });
  }
}