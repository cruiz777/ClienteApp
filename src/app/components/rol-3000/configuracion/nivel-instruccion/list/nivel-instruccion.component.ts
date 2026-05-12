import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';

import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
import { RpNivelInstruccionResponse } from 'src/app/interfaces/responses/nivel-instruccion.response';
import { RpNivelInstruccionService } from 'src/app/services/nivel-instruccion.service';
import { RpNivelInstruccionFormComponent } from '../form/nivel-instruccion-form.component';

@Component({
  selector: 'app-rp-nivel-instruccion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './nivel-instruccion.component.html',
  styleUrls: ['./nivel-instruccion.component.css']
})
export class RpNivelInstruccionComponent implements OnInit {

  loading = false;

  niveles: RpNivelInstruccionResponse[] = [];
  filtered: RpNivelInstruccionResponse[] = [];

  searchTerm = '';

  readonly skeletonRows = Array(6).fill(0);

  constructor(
    private rpNivelInstruccionService: RpNivelInstruccionService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.obtenerNiveles();
  }

  obtenerNiveles(): void {
    this.loading = true;

    this.rpNivelInstruccionService.getAll().subscribe({
      next: (resp: ApiResponse<RpNivelInstruccionResponse[]>) => {
        this.niveles = resp?.data ?? [];
        this.filtered = [...this.niveles];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al obtener niveles de instrucción:', err);
        this.loading = false;
        this.mostrarMensaje({
          type: 'error',
          title: 'Error al cargar',
          message: err?.error?.message ?? err?.message ?? 'No se pudo obtener la lista de niveles de instrucción.',
          showCancel: false,
          confirmText: 'Aceptar'
        });
      }
    });
  }

  buscar(): void {
    const term = (this.searchTerm ?? '').trim().toLowerCase();
    if (!term) {
      this.filtered = [...this.niveles];
      return;
    }
    this.filtered = this.niveles.filter(n =>
      (n.descripcion ?? '').toLowerCase().includes(term)
    );
  }

  abrirCrear(): void {
    const dialogRef = this.dialog.open(RpNivelInstruccionFormComponent, {
      width: '600px',
      data: {}
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.obtenerNiveles();
    });
  }

  abrirEditar(id: number): void {
    const dialogRef = this.dialog.open(RpNivelInstruccionFormComponent, {
      width: '600px',
      data: { id }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.obtenerNiveles();
    });
  }

  trackById = (_: number, it: RpNivelInstruccionResponse) => it?.id_nivel_instruccion ?? _;

  private mostrarMensaje(data: MessageBoxData) {
    return this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: { confirmText: 'Aceptar', cancelText: 'Cancelar', ...data }
    });
  }
}