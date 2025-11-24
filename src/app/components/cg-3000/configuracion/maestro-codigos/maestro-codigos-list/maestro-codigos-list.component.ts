import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';

// 🔹 Angular Material para botón, menú e íconos
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';

import { CodigosContablesService } from 'src/app/services/codigoscontables.service';
import { CodigosContablesResponse } from 'src/app/interfaces/responses/codigos-contables-response';
import { UsuarioService } from 'src/app/services/usuario.service';

import { CodigosContablesFormComponent } from '../maestro-codigos-form/maestro-codigos-form.component';

@Component({
  selector: 'app-codigos-contables',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatMenuModule,
    MatIconModule
  ],
  templateUrl: './maestro-codigos-list.component.html',
  styleUrls: ['./maestro-codigos-list.component.css']
})
export class CodigosContablesComponent implements OnInit {

  loading = false;
  error: string | null = null;

  codigos: CodigosContablesResponse[] = [];
  filtered: CodigosContablesResponse[] = [];

  searchTerm = '';

  private auth = inject(UsuarioService);
  idEmpresaActual: number | null = this.auth.getUsuarioActual()?.id_empresa ?? null;

  constructor(
    private codigosservice: CodigosContablesService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.cargarCodigos();
  }

  private cargarCodigos(): void {
    this.loading = true;
    this.error = null;

    this.codigosservice
      .getAll({ idEmpresa: this.idEmpresaActual ?? undefined })
      .subscribe({
        next: (resp: any) => {
          const list = resp?.data as CodigosContablesResponse[] ?? [];
          this.codigos  = list;
          this.filtered = [...this.codigos];
          this.loading = false;
        },
        error: (err) => {
          console.error('Error al obtener códigos contables:', err);
          this.error = err?.message ?? 'Error al cargar';
          this.loading = false;
        }
      });
  }

  buscar(): void {
    const term = (this.searchTerm ?? '').trim().toLowerCase();
    if (!term) {
      this.filtered = [...this.codigos];
      return;
    }
    this.filtered = this.codigos.filter(t =>
      (t.Identificacionauxiliar ?? '').toLowerCase().includes(term) ||
      (t.Nombreauxiliar ?? '').toLowerCase().includes(term)
    );
  }

  limpiarBusqueda(): void {
    this.searchTerm = '';
    this.filtered = [...this.codigos];
  }

  // 🔹 Ahora recibe el tipo de identificación
  abrirCrear(tipoIdentificacion?: 'CEDULA' | 'RUC' | 'PASAPORTE'): void {
    const dialogRef = this.dialog.open(CodigosContablesFormComponent, {
      width: '1000px',
      maxHeight: '90vh',
      autoFocus: false,
      data: { tipoIdentificacion }   // 👈 se envía al form
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.cargarCodigos();
      }
    });
  }

  abrirEditar(id: number): void {
    const dialogRef = this.dialog.open(CodigosContablesFormComponent, {
      width: '1000px',
      maxHeight: '90vh',
      autoFocus: false,
      data: { id }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.cargarCodigos();
      }
    });
  }

  trackById = (_: number, it: CodigosContablesResponse) =>
    it?.IdCodContable ?? it?.Identificacionauxiliar ?? _;
}
