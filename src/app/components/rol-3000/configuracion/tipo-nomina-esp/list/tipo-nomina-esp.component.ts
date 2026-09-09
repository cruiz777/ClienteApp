import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';

import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
import { TipoNominaEspResponse } from 'src/app/interfaces/responses/tipo-nomina-esp-response';
import { TipoNominaEspService } from 'src/app/services/rol/tipo-nomina-esp.service';
import { TipoNominaEspFormComponent } from '../form/tipo-nomina-esp-form.component';

@Component({
  selector: 'app-tipo-nomina-esp',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tipo-nomina-esp.component.html',
  styleUrls: ['./tipo-nomina-esp.component.css']
})
export class TipoNominaEspComponent implements OnInit {

  loading = false;
  tiposNomina: TipoNominaEspResponse[] = [];
  filtered: TipoNominaEspResponse[] = [];
  searchTerm = '';
  readonly skeletonRows = Array(6).fill(0);

  constructor(
    private tipoNominaEspService: TipoNominaEspService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.obtenerTiposNomina();
  }

  obtenerTiposNomina(): void {
    this.loading = true;
    this.tipoNominaEspService.getAll().subscribe({
      next: (resp: ApiResponse<TipoNominaEspResponse[]>) => {
        this.tiposNomina = resp?.data ?? [];
        this.filtered = [...this.tiposNomina];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al obtener tipos de nómina especial:', err);
        this.loading = false;
        this.mostrarMensaje({
          type: 'error',
          title: 'Error al cargar',
          message: err?.error?.message ?? err?.message ?? 'No se pudo obtener la lista de tipos de nómina especial.',
          showCancel: false,
          confirmText: 'Aceptar'
        });
      }
    });
  }

  buscar(): void {
    const term = (this.searchTerm ?? '').trim().toLowerCase();
    if (!term) { this.filtered = [...this.tiposNomina]; return; }
    this.filtered = this.tiposNomina.filter(t =>
      (t.descripcion ?? '').toLowerCase().includes(term)
    );
  }

  abrirCrear(): void {
    this.dialog.open(TipoNominaEspFormComponent, { width: '600px', data: {} })
      .afterClosed().subscribe(result => { if (result) this.obtenerTiposNomina(); });
  }

  abrirEditar(id: number): void {
    this.dialog.open(TipoNominaEspFormComponent, { width: '600px', data: { id } })
      .afterClosed().subscribe(result => { if (result) this.obtenerTiposNomina(); });
  }

  trackById = (_: number, it: TipoNominaEspResponse) => it?.idTipoNomEsp ?? _;

  private mostrarMensaje(data: MessageBoxData) {
    return this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: { confirmText: 'Aceptar', cancelText: 'Cancelar', ...data }
    });
  }
}