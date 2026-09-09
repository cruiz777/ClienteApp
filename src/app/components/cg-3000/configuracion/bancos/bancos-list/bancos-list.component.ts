import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // necesario para [(ngModel)]
import { MatDialog } from '@angular/material/dialog';

import { BancosService } from 'src/app/services/bancos.service';
import { BancosResponse } from 'src/app/interfaces/responses/bancos-response';

import { ApiListResponse } from 'src/app/interfaces/responses/ApiListResponse';

//import { FechasControlFormComponent } from '../fechas-control-form/fechas-control-form.component';
import { BancosFormComponent } from '../bancos-form/bancos-form.component';
import { UsuarioService } from 'src/app/services/usuario.service';


@Component({
  selector: 'app-bancos',
  standalone: true,
  imports: [CommonModule, FormsModule], // ✅ importa FormsModule aquí
  templateUrl: './bancos-list.component.html',
  styleUrls: ['./bancos-list.component.css']
})
export class BancosComponent implements OnInit {

  // Estado UI
  loading = false;
  error: string | null = null;

  // Datos
  bancos: BancosResponse[] = [];
  filtered: BancosResponse[] = [];

  // Búsqueda
  searchTerm = '';

  //empresa//
  private auth = inject(UsuarioService);
 idEmpresaActual: number | null = this.auth.getUsuarioActual()?.id_empresa ?? null;

  constructor(
    private bancosservice: BancosService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.obtenerBancos();
  }

  obtenerBancos(): void {
  this.loading = true;
  this.error = null;

  this.bancosservice
    .getAll({ idEmpresa: this.idEmpresaActual ?? undefined }) // ← enviar parámetro
    .subscribe({
      next: (resp: ApiListResponse<BancosResponse[]>) => {
        this.bancos  = resp?.data ?? [];
        this.filtered = [...this.bancos];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al obtener bancos:', err);
        this.error = err?.message ?? 'Error al cargar';
        this.loading = false;
      }
    });
}
  /*
   obtenerBancos(): void {
      this.loading = true;
      this.error = null;
  
      this.bancosservice.getAll().subscribe({
        next: (resp: ApiListResponse<BancosResponse[]>) => {
          this.bancos = resp?.data ?? [];
          this.filtered = [...this.bancos]; // copiar para mostrar inicialmente
          this.loading = false;
        },
        error: (err) => {
          console.error('Error al obtener fechas de control:', err);
          this.error = err?.message ?? 'Error al cargar';
          this.loading = false;
        }
      });
    }
*/

  buscar(): void {
    const term = (this.searchTerm ?? '').trim().toLowerCase();
    if (!term) {
      this.filtered = [...this.bancos];
      return;
    }
    this.filtered = this.bancos.filter(t =>
      (t.Descripcion ?? '').toLowerCase().includes(term) ||
      (t.CodigoEspecial ?? '').toString().includes(term)
    );
  }

  
  abrirCrear(): void {
      const dialogRef = this.dialog.open(BancosFormComponent, {
        width: '600px',
        data: {}
      });
  
      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.obtenerBancos();
        }
      });
    }
  
    abrirEditar(id: number): void {
      const dialogRef = this.dialog.open(BancosFormComponent, {
        width: '600px',
        data: { id }
      });
  
      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.obtenerBancos();
        }
      });
    }

  // Para *ngFor trackBy
  trackById = (_: number, it: BancosResponse) =>
    it?.IdBanco ?? it?.CodigoEspecial ?? _;

  // Ejemplo abrir modal (si luego activas el formulario)
  // abrirCrear(): void { ... }
  // abrirEditar(id: number): void { ... }
}
