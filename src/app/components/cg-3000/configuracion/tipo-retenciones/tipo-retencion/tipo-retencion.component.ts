import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // necesario para [(ngModel)]
import { MatDialog } from '@angular/material/dialog';

import { TipoRetencionService } from 'src/app/services/tiporetencion.service';
import { TipoRetencionResponse } from 'src/app/interfaces/responses/tipo-retencion-response';
import { ApiListResponse } from 'src/app/interfaces/responses/ApiListResponse';
import { TipoRetencionFormComponent } from '../tipo-retencion-form/tipo-retencion-form.component';

@Component({
  selector: 'app-tipo-retencion',
  standalone: true,
  imports: [CommonModule, FormsModule], // ✅ importa FormsModule aquí
  templateUrl: './tipo-retencion.component.html',
  styleUrls: ['./tipo-retencion.component.css']
})
export class TipoRetencionComponent implements OnInit {

  // Estado UI
  loading = false;
  error: string | null = null;

  // Datos
  tipoRetenciones: TipoRetencionResponse[] = [];
  filtered: TipoRetencionResponse[] = [];

  // Búsqueda
  searchTerm = '';

  constructor(
    private tipoRetencionService: TipoRetencionService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.obtenerRetenciones();
  }

  obtenerRetenciones(): void {
    this.loading = true;
    this.error = null;

    this.tipoRetencionService.getAll().subscribe({
      next: (resp: ApiListResponse<TipoRetencionResponse[]>) => {
        this.tipoRetenciones = resp?.data ?? [];
        this.filtered = [...this.tipoRetenciones]; // copiar para mostrar inicialmente
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al obtener los tipos de retención:', err);
        this.error = err?.message ?? 'Error al cargar';
        this.loading = false;
      }
    });
  }

  buscar(): void {
    const term = (this.searchTerm ?? '').trim().toLowerCase();
    if (!term) {
      this.filtered = [...this.tipoRetenciones];
      return;
    }
    this.filtered = this.tipoRetenciones.filter(t =>
      (t.Descripcion ?? '').toLowerCase().includes(term) ||
      (t.CodigoTipoRet ?? '').toLowerCase().includes(term)
    );
  }

  abrirCrear(): void {
      const dialogRef = this.dialog.open(TipoRetencionFormComponent, {
        width: '600px',
        data: {}
      });
  
      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.obtenerRetenciones();
        }
      });
    }
  
    abrirEditar(id: number): void {
      const dialogRef = this.dialog.open(TipoRetencionFormComponent, {
        width: '600px',
        data: { id }
      });
  
      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.obtenerRetenciones();
        }
      });
    }


  // Para *ngFor trackBy
  trackById = (_: number, it: TipoRetencionResponse) =>
    it?.IdTipoRetencion ?? it?.CodigoTipoRet ?? _;

  // Ejemplo abrir modal (si luego activas el formulario)
  // abrirCrear(): void { ... }
  // abrirEditar(id: number): void { ... }
}
