import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';

import { FechasControlService } from 'src/app/services/fechascontrol.service';
import { FechasControlResponse } from 'src/app/interfaces/responses/fechas-control-response';
import { FechasControlFormComponent } from '../fechas-control-form/fechas-control-form.component';
import { UsuarioService } from 'src/app/services/usuario.service';

@Component({
  selector: 'app-fecha-control',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fechas-control-list.component.html',
  styleUrls: ['./fechas-control-list.component.css']
})
export class FechasControlComponent implements OnInit {
  loading = false;
  error: string | null = null;

  fechascontrol: (FechasControlResponse & { ocupado?: boolean })[] = [];
  filtered: (FechasControlResponse & { ocupado?: boolean })[] = [];

  private auth = inject(UsuarioService);
  usuarioActual = this.auth.getUsuarioActual();
  private idEmpresaActual = this.usuarioActual?.id_empresa ?? 0;

  searchTerm = '';

  constructor(
    private fechascontrolservice: FechasControlService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.obtenerFechas();
  }

  private toBool(v: any): boolean {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v === 1;
    const s = String(v ?? '').trim().toLowerCase();
    return s === '1' || s === 'true' || s === 'si' || s === 'sí';
  }

  obtenerFechas(): void {
    this.loading = true;
    this.error = null;

    // ✅ Filtro por empresa y estado activo (TipoCon='A')
    this.fechascontrolservice
      .getAll({ IdEmpresa: this.idEmpresaActual, TipoCon: 'A' })
      .subscribe({
        next: (list: FechasControlResponse[]) => {
          this.fechascontrol = (list ?? []).map(it => ({
            ...it,
            ocupado: this.toBool((it as any).Ocupado ?? (it as any).ocupado ?? (it as any).OCUPADO)
          }));
          this.filtered = [...this.fechascontrol];
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
      this.filtered = [...this.fechascontrol];
      return;
    }
    this.filtered = this.fechascontrol.filter(t =>
      (t as any)?.TipDoc?.toString().toLowerCase().includes(term) ||
      (t as any)?.NumDoc?.toString().toLowerCase().includes(term)
    );
  }

  abrirCrear(): void {
    const dialogRef = this.dialog.open(FechasControlFormComponent, { width: '600px', data: {} });
    dialogRef.afterClosed().subscribe(ok => ok && this.obtenerFechas());
  }

  abrirEditar(id: number): void {
    const dialogRef = this.dialog.open(FechasControlFormComponent, { width: '600px', data: { id } });
    dialogRef.afterClosed().subscribe(ok => ok && this.obtenerFechas());
  }

  trackById = (_: number, it: FechasControlResponse) => (it as any)?.IdFechaControl ?? (it as any)?.NumDoc ?? _;
}
