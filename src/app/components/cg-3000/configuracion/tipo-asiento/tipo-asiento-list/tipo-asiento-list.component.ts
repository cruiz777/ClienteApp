import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // necesario para [(ngModel)]
import { MatDialog } from '@angular/material/dialog';

import { TipoAsientoService } from 'src/app/services/tipoasiento.service';
import { TipoAsientoResponse } from 'src/app/interfaces/responses/tipo-asiento-response';

import { ApiListResponse } from 'src/app/interfaces/responses/ApiListResponse';

//import { TipoComprobanteSriFormComponent } from '../tipo-comprobante-sri-form/tipo-comprobante-sri-form.component';
import { TipoAsientoFormComponent } from '../tipo-asiento-form/tipo-asiento-form.component';

@Component({
  selector: 'app-tipo-asiento',
  standalone: true,
  imports: [CommonModule, FormsModule], // ✅ importa FormsModule aquí
  templateUrl: './tipo-asiento-list.component.html',
  styleUrls: ['./tipo-asiento-list.component.css']
})
export class TipoAsientoComponent implements OnInit {

  // Estado UI
  loading = false;
  error: string | null = null;

  // Datos
  tipoAsiento: TipoAsientoResponse[] = [];
  filtered: TipoAsientoResponse[] = [];

  // Búsqueda
  searchTerm = '';

  constructor(
    private tipoAsientoService: TipoAsientoService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.obtenerAsientos();
  }

  obtenerAsientos(): void {
    this.loading = true;
    this.error = null;

    this.tipoAsientoService.getAll().subscribe({
      next: (resp: ApiListResponse<TipoAsientoResponse[]>) => {
        this.tipoAsiento = resp?.data ?? [];
        this.filtered = [...this.tipoAsiento]; // copiar para mostrar inicialmente
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al obtener los tipos de Documentos:', err);
        this.error = err?.message ?? 'Error al cargar';
        this.loading = false;
      }
    });
  }

  buscar(): void {
    const term = (this.searchTerm ?? '').trim().toLowerCase();
    if (!term) {
      this.filtered = [...this.tipoAsiento];
      return;
    }
    this.filtered = this.tipoAsiento.filter(t =>
      (t.TipAsiento ?? '').toLowerCase().includes(term) ||
      (t.Descripcion ?? '').toLowerCase().includes(term)
    );
  }

    
  abrirCrear(): void {
      const dialogRef = this.dialog.open(TipoAsientoFormComponent, {
        width: '600px',
        data: {}
      });
  
      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.obtenerAsientos();
        }
      });
    }
  
    abrirEditar(id: number): void {
      const dialogRef = this.dialog.open(TipoAsientoFormComponent, {
        width: '600px',
        data: { id }
      });
  
      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.obtenerAsientos();
        }
      });
    }


  // Para *ngFor trackBy
  trackById = (_: number, it: TipoAsientoResponse) =>
    it?.IdTipoAsiento ?? it?.TipAsiento ?? _;

  // Ejemplo abrir modal (si luego activas el formulario)
  // abrirCrear(): void { ... }
  // abrirEditar(id: number): void { ... }
}
