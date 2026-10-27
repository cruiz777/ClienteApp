import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { CajaService, AutorizacionCaja, PaginationResponse } from 'src/app/services/caja.service';
import { EditarCajaComponent, EditarCajaData } from '../editar-caja/editar-caja.component';
import { NuevaCajaComponent } from '../nueva-caja/nueva-caja.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CustomMessageBoxComponent } from 'src/app/components/utils/messages/custom-message-box.component';

@Component({
  selector: 'app-caja',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatSnackBarModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './caja.component.html',
  styleUrls: ['./caja.component.css']
})
export class CajaComponent implements OnInit {
  private svc = inject(CajaService);
  private snack = inject(MatSnackBar);

  constructor(private dialog: MatDialog) {}

  catalogoAutorizaciones: AutorizacionCaja[] = [];
  loading = false;
  error: string | null = null;
    eliminandoId: number | null = null;
  page = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.error = null;

    this.svc.getAll(this.page, this.pageSize).subscribe({
      next: (data: PaginationResponse<AutorizacionCaja>) => {
        this.catalogoAutorizaciones = data.items ?? [];
        this.page = data.page;
        this.pageSize = data.pageSize;
        this.totalItems = data.totalItems;
        this.totalPages = data.totalPages;
        this.loading = false;
      },
      error: (err: unknown) => {
        this.error = 'No se pudo cargar AutorizacionCaja';
        console.error(err);
        this.loading = false;
      }
    });
  }

  formatFecha(v?: string) {
    if (!v) return '';
    return v.split('T')[0];
  }

  editar(a: AutorizacionCaja) {
    const data: EditarCajaData = {
      id_autorizacion_caja: a.id_autorizacion_caja,
      caja: a.caja,
      numero_autorizacion: a.numero_autorizacion,
      numero_factura: a.numero_factura,
      estado_factura: a.estado_factura,
      num_establecimiento: a.num_establecimiento,
      direccion: a.direccion,
      ruc: a.ruc,
      nombre_comercial: a.nombre_comercial,
      generar_xml: a.generar_xml,
      numero_ncredito: a.numero_ncredito,
      estado_ncredito: a.estado_ncredito,
    };

    this.dialog.open(EditarCajaComponent, {
      width: '920px',
      data,
      disableClose: true
    })
    .afterClosed()
    .subscribe((updated?: boolean) => {
      if (!updated) return;        // cancelado/no cambios
      this.cargar();               // ✅ recarga la grilla
      this.snack.open('Registro actualizado', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top',
        panelClass: ['snack-ok']   // opcional: define esta clase en tu CSS global
      });
    });
  }


  nuevo() {
    this.dialog.open(NuevaCajaComponent, {
      width: '960px',
      disableClose: true
    })
    .afterClosed()
    .subscribe((created?: boolean) => {
      if (!created) return;
      this.cargar();
      this.snack.open('Registro creado', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top',
        panelClass: ['snack-ok']
      });
    });
  }

// 👇 agrega esto en la clase
trackById = (_: number, row: AutorizacionCaja) => row.id_autorizacion_caja;

// 👇 reemplaza tu eliminar por este
eliminar(a: AutorizacionCaja) {
  if (this.eliminandoId !== null) return;

  // ❄️ Congelar snapshot de valores (evita que cambie la ref)
  const id  = Number(a.id_autorizacion_caja);
  const caja = a.caja;
  const estab = a.num_establecimiento;

  const dialogRef = this.dialog.open(CustomMessageBoxComponent, {
    width: '400px',
    data: {
      title: '¿Desea confirmar?',
      message: `¿Eliminar la autorización <b>ID ${id}</b> de la caja <b>${caja}</b> (Establecimiento <b>${estab}</b>)?`,
      type: 'warning',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      showCancel: true
    }
  });

  dialogRef.afterClosed().subscribe((ok: boolean) => {
    if (!ok) return;

    this.eliminandoId = id;

    this.svc.delete(id).subscribe({
      next: () => {
        // remover por id (no por objeto)
        this.catalogoAutorizaciones = this.catalogoAutorizaciones.filter(x => x.id_autorizacion_caja !== id);
        if (this.totalItems > 0) this.totalItems--;

        this.eliminandoId = null;
        this.snack.open(`Autorización ID ${id} eliminada`, 'Cerrar', {
          duration: 3000, horizontalPosition: 'right', verticalPosition: 'top', panelClass: ['snack-ok']
        });

        this.cargar(); // si hay paginación
      },
      error: (err) => {
        console.error(err);
        this.eliminandoId = null;
        this.snack.open(`No se pudo eliminar ID ${id}: ${err?.message ?? 'Error desconocido'}`, 'Cerrar', {
          duration: 4500, horizontalPosition: 'right', verticalPosition: 'top', panelClass: ['snack-error']
        });
      }
    });
  });
}

}
