import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // necesario para [(ngModel)]
import { MatDialog } from '@angular/material/dialog';

import { BancosTercerosService } from 'src/app/services/bancosterceros.service';
import { BancosTercerosResponse } from 'src/app/interfaces/responses/bancos-terceros-response';

import { ApiListResponse } from 'src/app/interfaces/responses/ApiListResponse';

import { BancosTercerosFormComponent } from '../bancos-terceros-form/bancos-terceros-form.component';

@Component({
  selector: 'app-bancos-terceros',
  standalone: true,
  imports: [CommonModule, FormsModule], // ✅ importa FormsModule aquí
  templateUrl: './bancos-terceros-list.component.html',
  styleUrls: ['./bancos-terceros-list.component.css']
})
export class BancosTercerosComponent implements OnInit {

  // Estado UI
  loading = false;
  error: string | null = null;

  // Datos
  bancosterceros: BancosTercerosResponse[] = [];
  filtered: BancosTercerosResponse[] = [];

  // Búsqueda
  searchTerm = '';

  constructor(
    private bancostercerosservice: BancosTercerosService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.obtenerBancosTerceros();
  }

   obtenerBancosTerceros(): void {
      this.loading = true;
      this.error = null;
  
      this.bancostercerosservice.getAll().subscribe({
        next: (resp: ApiListResponse<BancosTercerosResponse[]>) => {
          this.bancosterceros = resp?.data ?? [];
          this.filtered = [...this.bancosterceros]; // copiar para mostrar inicialmente
          this.loading = false;
        },
        error: (err) => {
          console.error('Error al obtener fechas de control:', err);
          this.error = err?.message ?? 'Error al cargar';
          this.loading = false;
        }
      });
    }


  buscar(): void {
    const term = (this.searchTerm ?? '').trim().toLowerCase();
    if (!term) {
      this.filtered = [...this.bancosterceros];
      return;
    }
    this.filtered = this.bancosterceros.filter(t =>
      (t.Descripcion ?? '').toLowerCase().includes(term) ||
      (t.Codban ?? '').toString().includes(term)
    );
  }

  
  abrirCrear(): void {
      const dialogRef = this.dialog.open(BancosTercerosFormComponent, {
        width: '600px',
        data: {}
      });
  
      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.obtenerBancosTerceros();
        }
      });
    }
  
    abrirEditar(id: number): void {
      const dialogRef = this.dialog.open(BancosTercerosFormComponent, {
        width: '600px',
        data: { id }
      });
  
      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.obtenerBancosTerceros();
        }
      });
    }


  // Para *ngFor trackBy
  trackById = (_: number, it: BancosTercerosResponse) =>
    it?.IdBancosTerceros ?? it?.Codban ?? _;

  // Ejemplo abrir modal (si luego activas el formulario)
  // abrirCrear(): void { ... }
  // abrirEditar(id: number): void { ... }
}
