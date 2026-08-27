// src/app/components/cg-3000/configuracion/tipcuenta/tipcuenta.component.ts
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // ✅ necesario para [(ngModel)]
import { TipoCuentaService, TipoCuenta } from 'src/app/services/tipocuenta.service';
import { TipocuentaFormComponent } from '../tipo-cuenta-form/tipo-cuenta-form.component';

@Component({
  selector: 'app-tipcuenta',
  standalone: true,
  imports: [CommonModule, FormsModule], // ✅ agrega FormsModule aquí
  templateUrl: './tipcuenta.component.html',
  styleUrls: ['./tipcuenta.component.css'],
})
export class TipcuentaComponent implements OnInit {
  constructor(private svc: TipoCuentaService, private dialog: MatDialog) {}

  // Mantén una copia original y otra para la vista
  listaAll: TipoCuenta[] = [];
  listaView: TipoCuenta[] = [];

  loading = false;
  error: string | null = null;

  // Para el buscador con [(ngModel)]
  searchTerm: string = '';

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.error = null;
    this.svc.getAll().subscribe({
      next: (data) => {
        this.listaAll = data ?? [];
        this.listaView = [...this.listaAll];
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
    const nuevo = window.prompt('Editar descripción (Destip):', row.Destip ?? '');
    if (nuevo == null) return;
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

  /// abre y crea nuevo tipo cuenta

 abrirCrear(): void {
    const dialogRef = this.dialog.open(TipocuentaFormComponent, {
      width: '600px',
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.cargar();
      }
    });
  }

  

abrirEditar(id:number): void {
    const dialogRef = this.dialog.open(TipocuentaFormComponent, {
      width: '600px',
      data: { id }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.cargar();
      }
    });
  }


 /*
  
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
*/
  // Buscar sin destruir la lista original
  buscar(): void {
    const q = (this.searchTerm || '').trim().toLowerCase();
    if (!q) {
      this.listaView = [...this.listaAll];
      return;
    }

    this.listaView = this.listaAll.filter(t =>
      (t.Destip ?? '').toLowerCase().includes(q) ||
      (t.Tipcue ?? '').toLowerCase().includes(q) ||
      String(t.IdTipoCuenta).includes(q) ||
      (t.Tranban ?? '').toLowerCase().includes(q)
    );
  }

  // Si Tranban viene como "S"/"N" (string), úsalo directo
  tranfBancaria(t: TipoCuenta): string {
    // Si fuera booleano, ajusta a: return t.Tranban ? 'S' : 'N';
    return (t.Tranban ?? '').toString();
  }
  
}
