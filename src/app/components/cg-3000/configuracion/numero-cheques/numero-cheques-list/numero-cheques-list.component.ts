import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { NumeroChequesService } from 'src/app/services/numeracion-cheques.service';
import { NumeroChequesResponse } from 'src/app/interfaces/responses/numero-cheques-response';
import { ApiListResponse } from 'src/app/interfaces/responses/ApiListResponse';
import { NumeroChequesFormComponent } from '../numero_cheques-form/numero-cheques-form.component';
import { UsuarioService } from 'src/app/services/usuario.service';

@Component({
  selector: 'app-numero-cheques',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule],
  templateUrl: './numero-cheques-list.component.html',
  styleUrls: ['./numero-cheques-list.component.css']
})
export class NumeroChequesListComponent implements OnInit {

  // UI
  loading = false;
  error: string | null = null;

  // Datos
  numerocheques: (NumeroChequesResponse & { ocupado?: boolean })[] = [];
  filtered: (NumeroChequesResponse & { ocupado?: boolean })[] = [];

  // Búsqueda
  searchTerm = '';

  // Usuario/empresa
  private auth = inject(UsuarioService);
  usuarioActual = this.auth.getUsuarioActual();
  idEmpresaActual: number | null = this.usuarioActual?.id_empresa ?? null;

  // Filtro por estado (puede ser 'Activo' | 'Inactivo' | '')
  readonly estadoFiltro = 'A';

  constructor(
    private numerochequesservice: NumeroChequesService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.obtenerCheques();
  }

  // --- Helpers ---
  private toBool(v: any): boolean {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v === 1;
    const s = String(v ?? '').trim().toLowerCase();
    return s === '1' || s === 'true' || s === 'si' || s === 'sí';
  }

  private norm(v: any): string {
    return String(v ?? '').trim().toLowerCase();
  }

  private matchEmpresa(it: any): boolean {
    if (this.idEmpresaActual == null) return true;
    // cubre IdEmpresa, idEmpresa, id_empresa
    const emp: number | undefined =
      it.IdEmpresa ?? it.idEmpresa ?? it.id_empresa;
    return emp === this.idEmpresaActual;
  }

  private matchEstado(it: any): boolean {
    if (!this.estadoFiltro) return true;
    const estadoItem = this.norm(it.Estado ?? it.estado);
    const estadoFiltroNorm = this.norm(this.estadoFiltro);
    return estadoItem === estadoFiltroNorm;
  }

  // --- Carga ---
  obtenerCheques(): void {
    this.loading = true;
    this.error = null;

    this.numerochequesservice
      .getAll({
        idEmpresa: this.idEmpresaActual ?? undefined,
        estado: this.estadoFiltro || undefined
      })
      .subscribe({
        next: (resp: ApiListResponse<NumeroChequesResponse[]>) => {
          // Lista cruda del servidor
          const list = resp?.data ?? [];

          // Filtro defensivo por si el backend aún no filtra por empresa/estado
          const filtrados = list.filter(it => this.matchEmpresa(it) && this.matchEstado(it));

          // Normaliza "ocupado"
          this.numerocheques = filtrados.map(it => ({
            ...it,
            ocupado: this.toBool((it as any).Ocupado ?? (it as any).ocupado)
          }));

          // Inicializa la vista
          this.filtered = [...this.numerocheques];
          this.loading = false;
        },
        error: (err) => {
          console.error('Error al obtener numero de Cheques:', err);
          this.error = err?.message ?? 'Error al cargar';
          this.loading = false;
        }
      });
  }

  // --- Búsqueda local ---
  buscar(): void {
    const term = (this.searchTerm ?? '').trim().toLowerCase();
    if (!term) {
      this.filtered = [...this.numerocheques];
      return;
    }
    this.filtered = this.numerocheques.filter(t =>
      (t as any).CuentaBanco?.toString().toLowerCase().includes(term) ||
      (t as any).NumCheque?.toString().toLowerCase().includes(term)
    );
  }

  // --- Diálogos ---
  abrirCrear(): void {
    const dialogRef = this.dialog.open(NumeroChequesFormComponent, {
      width: '600px',
      maxWidth: '95vw',
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.obtenerCheques();
    });
  }

  abrirEditar(id: number): void {
    const dialogRef = this.dialog.open(NumeroChequesFormComponent, {
      width: '600px',
      maxWidth: '95vw',
      data: { id }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.obtenerCheques();
    });
  }

  // trackBy para *ngFor
  trackById = (_: number, it: NumeroChequesResponse) =>
    (it as any)?.IdNroCheque ?? (it as any)?.CuentaBanco ?? _;
}
