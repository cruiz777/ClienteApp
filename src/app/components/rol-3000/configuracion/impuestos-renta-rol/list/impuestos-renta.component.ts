import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';

import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
import { ImpuestoRentaResponse } from 'src/app/interfaces/responses/impuesto-renta-rol-request';
import { ImpuestoRentaService } from 'src/app/services/impuestos-renta-rol.service';
import { ImpuestoRentaFormComponent } from '../form/impuestos-renta-form.component';

@Component({
  selector: 'app-impuesto-renta',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './impuestos-renta.component.html',
  styleUrls: ['./impuestos-renta.component.css']
})
export class ImpuestoRentaComponent implements OnInit {

  loading = false;

  impuestosRenta: ImpuestoRentaResponse[] = [];
  filtered: ImpuestoRentaResponse[] = [];

  searchTerm = '';

  readonly skeletonRows = Array(6).fill(0);

  constructor(
    private impuestoRentaService: ImpuestoRentaService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.obtenerImpuestosRenta();
  }

  obtenerImpuestosRenta(): void {
    this.loading = true;

    this.impuestoRentaService.getAll().subscribe({
      next: (resp: ApiResponse<ImpuestoRentaResponse[]>) => {
        this.impuestosRenta = resp?.data ?? [];
        this.filtered = [...this.impuestosRenta];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al obtener impuestos de renta:', err);
        this.loading = false;
        this.mostrarMensaje({
          type: 'error',
          title: 'Error al cargar',
          message: err?.error?.message ?? err?.message ?? 'No se pudo obtener la lista de impuestos de renta.',
          showCancel: false,
          confirmText: 'Aceptar'
        });
      }
    });
  }

  buscar(): void {
    const term = (this.searchTerm ?? '').trim().toLowerCase();
    if (!term) {
      this.filtered = [...this.impuestosRenta];
      return;
    }
    this.filtered = this.impuestosRenta.filter(i =>
      i.idImpRenta?.toString().includes(term) ||
      i.frabas1Ir?.toString().includes(term) ||
      i.frabas2Ir?.toString().includes(term)
    );
  }

  abrirCrear(): void {
    const dialogRef = this.dialog.open(ImpuestoRentaFormComponent, {
      width: '600px',
      data: {}
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.obtenerImpuestosRenta();
    });
  }

  abrirEditar(id: number): void {
    const dialogRef = this.dialog.open(ImpuestoRentaFormComponent, {
      width: '600px',
      data: { id }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.obtenerImpuestosRenta();
    });
  }

  trackById = (_: number, it: ImpuestoRentaResponse) => it?.idImpRenta ?? _;

  private mostrarMensaje(data: MessageBoxData) {
    return this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: { confirmText: 'Aceptar', cancelText: 'Cancelar', ...data }
    });
  }
}