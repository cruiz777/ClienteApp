import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

import { CustomMessageBoxComponent } from 'src/app/util/messages/custom-message-box.component';
import { CierreContableService } from 'src/app/services/cierre-contable.service';

@Component({
  selector: 'app-cierre-mensual',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './cierre-mensual.component.html',
  styleUrls: ['./cierre-mensual.component.css']
})
export class CierreMensualComponent {
  mesSeleccionado: number = new Date().getMonth() + 1;
  anioSeleccionado: number = new Date().getFullYear();
  loading = false;

  meses = [
    { valor: 1, nombre: 'Enero' },
    { valor: 2, nombre: 'Febrero' },
    { valor: 3, nombre: 'Marzo' },
    { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' },
    { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' },
    { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Septiembre' },
    { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' },
    { valor: 12, nombre: 'Diciembre' }
  ];

  constructor(
    private dialog: MatDialog,
    private cierreContableService: CierreContableService
  ) {}

  obtenerNombreMes(): string {
    return this.meses.find(m => m.valor === this.mesSeleccionado)?.nombre || '';
  }

  confirmarCierre(): void {
    if (!this.mesSeleccionado || !this.anioSeleccionado) {
      this.dialog.open(CustomMessageBoxComponent, {
        width: '400px',
        data: {
          title: 'Validación',
          message: 'Debe seleccionar el mes y el año.',
          type: 'warning',
          confirmText: 'Aceptar',
          showCancel: false
        }
      });
      return;
    }

    const dialogRef = this.dialog.open(CustomMessageBoxComponent, {
      width: '420px',
      data: {
        title: 'Confirmar cierre',
        message:
          `Se actualizará fechas_control para el mes ${this.obtenerNombreMes()} del año ${this.anioSeleccionado}.\n\n` +
          `Esto pondrá en estado 'P' todos los tipos de documento del período.\n\n` +
          `¿Está seguro de continuar?`,
        type: 'warning',
        confirmText: 'Sí, ejecutar',
        cancelText: 'Cancelar',
        showCancel: true
      }
    });

    dialogRef.afterClosed().subscribe((confirmado: boolean) => {
      if (confirmado) {
        this.actualizarEstadoFechasControl();
      }
    });
  }

  actualizarEstadoFechasControl(): void {
    if (this.loading) {
      return;
    }

    this.loading = true;

    const fecVal = `${String(this.mesSeleccionado).padStart(2, '0')}/${this.anioSeleccionado}`;

    this.cierreContableService.actualizarEstadoFechasControl({ fecVal }).subscribe({
      next: (resp) => {
        this.loading = false;

        if (
          resp &&
          (resp.type === 'OK' || resp.type === 'UPDATED') &&
          resp.data !== null
        ) {
          this.dialog.open(CustomMessageBoxComponent, {
            width: '420px',
            data: {
              title: 'Proceso completado',
              message:
                `${resp.message || 'Estado actualizado correctamente.'}\n\n` +
                `Período: ${this.obtenerNombreMes()} ${this.anioSeleccionado}\n` +
                `Registros actualizados: ${resp.data}`,
              type: 'success',
              confirmText: 'Aceptar',
              showCancel: false
            }
          });
        } else {
          this.dialog.open(CustomMessageBoxComponent, {
            width: '420px',
            data: {
              title: 'Aviso',
              message: resp?.message || 'No se pudo actualizar fechas_control.',
              type: 'warning',
              confirmText: 'Aceptar',
              showCancel: false
            }
          });
        }
      },
      error: (error) => {
        this.loading = false;

        this.dialog.open(CustomMessageBoxComponent, {
          width: '420px',
          data: {
            title: 'Error',
            message: error?.error?.message || 'Error al actualizar fechas_control.',
            type: 'error',
            confirmText: 'Aceptar',
            showCancel: false
          }
        });
      }
    });
  }
}