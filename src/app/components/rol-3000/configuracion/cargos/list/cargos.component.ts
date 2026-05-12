import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ApiResponse } from 'src/app/interfaces/responses/api-response';

import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
import { RpCargosResponse } from 'src/app/interfaces/responses/cargos-rol-response';
import { RpCargosService } from 'src/app/services/cargos.service';
import { RpCargosFormComponent } from '../form/cargos-form.component';

@Component({
  selector: 'app-rp-cargos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cargos.component.html',
  styleUrls: ['./cargos.component.css']
})
export class RpCargosComponent implements OnInit {

  // Estado UI
  loading = false;

  // Datos
  cargos: RpCargosResponse[] = [];
  filtered: RpCargosResponse[] = [];

  // Búsqueda
  searchTerm = '';

  // Skeleton: filas fantasma mientras carga
  readonly skeletonRows = Array(6).fill(0);

  constructor(
    private rpCargosService: RpCargosService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.obtenerCargos();
  }

  obtenerCargos(): void {
    this.loading = true;

    this.rpCargosService.getAll().subscribe({
      next: (resp: ApiResponse<RpCargosResponse[]>) => {
        this.cargos = resp?.data ?? [];
        this.filtered = [...this.cargos];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al obtener los cargos:', err);
        this.loading = false;
        this.mostrarMensaje({
          type: 'error',
          title: 'Error al cargar',
          message: err?.error?.message ?? err?.message ?? 'No se pudo obtener la lista de cargos.',
          showCancel: false,
          confirmText: 'Aceptar'
        });
      }
    });
  }

  buscar(): void {
    const term = (this.searchTerm ?? '').trim().toLowerCase();
    if (!term) {
      this.filtered = [...this.cargos];
      return;
    }
    this.filtered = this.cargos.filter(c =>
      (c.descargo ?? '').toLowerCase().includes(term) ||
      (c.codsec ?? '').toLowerCase().includes(term)
    );
  }

  abrirCrear(): void {
    const dialogRef = this.dialog.open(RpCargosFormComponent, {
      width: '600px',
      data: {}
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.obtenerCargos();
    });
  }

  abrirEditar(id: number): void {
    const dialogRef = this.dialog.open(RpCargosFormComponent, {
      width: '600px',
      data: { id }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.obtenerCargos();
    });
  }

  trackById = (_: number, it: RpCargosResponse) => it?.idCargo ?? _;

  private mostrarMensaje(data: MessageBoxData) {
    return this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: { confirmText: 'Aceptar', cancelText: 'Cancelar', ...data }
    });
  }
}