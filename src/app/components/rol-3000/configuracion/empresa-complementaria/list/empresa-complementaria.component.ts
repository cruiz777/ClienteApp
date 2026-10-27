import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';

import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
import { RpEmpresaComplementariaResponse } from 'src/app/interfaces/responses/empresa-complementaria-response';
import { RpEmpresaComplementariaService } from 'src/app/services/rol/empresa complementaria.service';
import { RpEmpresaComplementariaFormComponent } from '../form/empresa-complementaria-form.component';

@Component({
  selector: 'app-rp-empresa-complementaria',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './empresa-complementaria.component.html',
  styleUrls: ['./empresa-complementaria.component.css']
})
export class RpEmpresaComplementariaComponent implements OnInit {

  loading = false;
  empresas: RpEmpresaComplementariaResponse[] = [];
  filtered: RpEmpresaComplementariaResponse[] = [];
  searchTerm = '';
  readonly skeletonRows = Array(6).fill(0);

  constructor(
    private rpEmpresaComplementariaService: RpEmpresaComplementariaService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.obtenerEmpresas();
  }

  obtenerEmpresas(): void {
    this.loading = true;
    this.rpEmpresaComplementariaService.getAll().subscribe({
      next: (resp: ApiResponse<RpEmpresaComplementariaResponse[]>) => {
        this.empresas = resp?.data ?? [];
        this.filtered = [...this.empresas];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al obtener empresas complementarias:', err);
        this.loading = false;
        this.mostrarMensaje({
          type: 'error',
          title: 'Error al cargar',
          message: err?.error?.message ?? err?.message ?? 'No se pudo obtener la lista de empresas complementarias.',
          showCancel: false,
          confirmText: 'Aceptar'
        });
      }
    });
  }

  buscar(): void {
    const term = (this.searchTerm ?? '').trim().toLowerCase();
    if (!term) { this.filtered = [...this.empresas]; return; }
    this.filtered = this.empresas.filter(e =>
      (e.empresa ?? '').toLowerCase().includes(term) ||
      (e.ruc ?? '').toLowerCase().includes(term)
    );
  }

  abrirCrear(): void {
    this.dialog.open(RpEmpresaComplementariaFormComponent, { width: '600px', data: {} })
      .afterClosed().subscribe(result => { if (result) this.obtenerEmpresas(); });
  }

  abrirEditar(id: number): void {
    this.dialog.open(RpEmpresaComplementariaFormComponent, { width: '600px', data: { id } })
      .afterClosed().subscribe(result => { if (result) this.obtenerEmpresas(); });
  }

  trackById = (_: number, it: RpEmpresaComplementariaResponse) => it?.idEmpresaComplementaria ?? _;

  private mostrarMensaje(data: MessageBoxData) {
    return this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: { confirmText: 'Aceptar', cancelText: 'Cancelar', ...data }
    });
  }
}