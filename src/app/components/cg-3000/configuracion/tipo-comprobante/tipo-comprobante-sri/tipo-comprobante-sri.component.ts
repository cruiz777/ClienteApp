import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // necesario para [(ngModel)]
import { MatDialog } from '@angular/material/dialog';

//borrar estos ahi me quedo
import { TipoComprobanteSriService } from 'src/app/services/tipocomprobantesri.service';
import { TipoComprobanteSriResponse } from 'src/app/interfaces/responses/tipo-comprobantesri-response';
import { ApiListResponse } from 'src/app/interfaces/responses/ApiListResponse';

import { TipoComprobanteSriFormComponent } from '../tipo-comprobante-sri-form/tipo-comprobante-sri-form.component';


@Component({
  selector: 'app-tipo-comprobantesri',
  standalone: true,
  imports: [CommonModule, FormsModule], // ✅ importa FormsModule aquí
  templateUrl: './tipo-comprobante-sri.component.html',
  styleUrls: ['./tipo-comprobante-sri.component.css']
})
export class TipoComprobanteSriComponent implements OnInit {

  // Estado UI
  loading = false;
  error: string | null = null;

  // Datos
  tipoComprobanteSri: TipoComprobanteSriResponse[] = [];
  filtered: TipoComprobanteSriResponse[] = [];

  // Búsqueda
  searchTerm = '';

  constructor(
    private tipoComprobanteSriService: TipoComprobanteSriService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.obtenerRetenciones();
  }

  obtenerRetenciones(): void {
    this.loading = true;
    this.error = null;

    this.tipoComprobanteSriService.getAll().subscribe({
      next: (resp: ApiListResponse<TipoComprobanteSriResponse[]>) => {
        this.tipoComprobanteSri = resp?.data ?? [];
        this.filtered = [...this.tipoComprobanteSri]; // copiar para mostrar inicialmente
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
      this.filtered = [...this.tipoComprobanteSri];
      return;
    }
    this.filtered = this.tipoComprobanteSri.filter(t =>
      (t.Destipcomp ?? '').toLowerCase().includes(term) ||
      (t.Codtipcomp ?? '').toLowerCase().includes(term)
    );
  }

  
  abrirCrear(): void {
      const dialogRef = this.dialog.open(TipoComprobanteSriFormComponent, {
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
      const dialogRef = this.dialog.open(TipoComprobanteSriFormComponent, {
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
  trackById = (_: number, it: TipoComprobanteSriResponse) =>
    it?.IdTipoCompSri ?? it?.Codtipcomp ?? _;

  // Ejemplo abrir modal (si luego activas el formulario)
  // abrirCrear(): void { ... }
  // abrirEditar(id: number): void { ... }
}
