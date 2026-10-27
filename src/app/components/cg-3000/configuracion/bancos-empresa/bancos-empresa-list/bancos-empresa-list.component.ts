import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // necesario para [(ngModel)]
import { MatDialog } from '@angular/material/dialog';

import { BancosEmpresaService } from 'src/app/services/bancosempresa.service';
import { BancosEmpresaResponse } from 'src/app/interfaces/responses/bancos-empresa-response';
import { ApiListResponse } from 'src/app/interfaces/responses/ApiListResponse';

//import { BancosTercerosFormComponent } from '../bancos-terceros-form/bancos-terceros-form.component';

@Component({
  selector: 'app-bancos-empresa',
  standalone: true,
  imports: [CommonModule, FormsModule], // ✅ importa FormsModule aquí
  templateUrl: './bancos-empresa-list.component.html',
  styleUrls: ['./bancos-empresa-list.component.css']
})
export class BancosEmpresaComponent implements OnInit {

  // Estado UI
  loading = false;
  error: string | null = null;

  // Datos
  bancosempresa: BancosEmpresaResponse[] = [];
  filtered: BancosEmpresaResponse[] = [];

  // Búsqueda
  searchTerm = '';

  constructor(
    private bancosempresaservice: BancosEmpresaService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.obtenerBancosEmpresa();
  }

   obtenerBancosEmpresa(): void {
      this.loading = true;
      this.error = null;
  
      this.bancosempresaservice.getAll().subscribe({
        next: (resp: ApiListResponse<BancosEmpresaResponse[]>) => {
          this.bancosempresa = resp?.data ?? [];
          this.filtered = [...this.bancosempresa]; // copiar para mostrar inicialmente
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
      this.filtered = [...this.bancosempresa];
      return;
    }
    this.filtered = this.bancosempresa.filter(t =>
      (t.Descripcio ?? '').toLowerCase().includes(term) ||
      (t.CtaCorriente ?? '').toString().includes(term)
    );
  }

  /*
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
*/

  // Para *ngFor trackBy
  trackById = (_: number, it: BancosEmpresaResponse) =>
    it?.IdBancosEmpresa ?? it?.CtaCble ?? _;

  // Ejemplo abrir modal (si luego activas el formulario)
  // abrirCrear(): void { ... }
  // abrirEditar(id: number): void { ... }
}
