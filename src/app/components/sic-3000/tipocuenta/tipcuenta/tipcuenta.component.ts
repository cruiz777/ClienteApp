// src/app/features/tipcuenta/tipcuenta.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TipoCuentaService, TipoCuenta } from 'src/app/services/tipocuenta.service';

@Component({
  selector: 'app-tipcuenta',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tipcuenta.component.html',
  styleUrls: ['./tipcuenta.component.css'],
})
export class TipcuentaComponent implements OnInit {
  private svc = inject(TipoCuentaService);

  lista: TipoCuenta[] = [];
  loading = false;
  error: string | null = null;

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.error = null;
    this.svc.getAll().subscribe({
      next: (data) => {
        this.lista = data ?? [];
        this.loading = false;
      },
      error: (e) => {
        this.error = e?.message ?? 'Error cargando Tipos de Cuenta';
        this.loading = false;
      }
    });
  }

  trackById = (_: number, row: TipoCuenta) => row.IdTipoCuenta;

  onEdit(row: TipoCuenta): void {
    // Ejemplo simple: pedir nueva descripción
    const nuevo = window.prompt('Editar descripción (Destip):', row.Destip ?? '');
    if (nuevo == null) return; // canceló
    this.loading = true;
    this.error = null;
    this.svc.update(row.IdTipoCuenta, { Destip: (nuevo || '').trim() }).subscribe({
      next: () => this.cargar(),
      error: (e) => {
        this.error = e?.message ?? 'Error actualizando el registro';
        this.loading = false;
      }
    });
  }

  onDelete(row: TipoCuenta): void {
    const ok = window.confirm(`¿Eliminar Id=${row.IdTipoCuenta} (${row.Destip})?`);
    if (!ok) return;
    this.loading = true;
    this.error = null;
    this.svc.delete(row.IdTipoCuenta).subscribe({
      next: () => this.cargar(),
      error: (e) => {
        this.error = e?.message ?? 'Error eliminando el registro';
        this.loading = false;
      }
    });
  }
}
