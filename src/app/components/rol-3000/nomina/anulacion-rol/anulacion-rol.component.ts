import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  NativeDateAdapter
} from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { concatMap, of, throwError } from 'rxjs';

import {
  AnularRolMensualRequest,
  AnularRolMensualService
} from 'src/app/services/rol/anular-rol-mensual.service';

import {
  CierrePeriodoService,
  EliminarCierrePeriodoRequest
} from 'src/app/services/rol/cierre-periodo.service';

import { CustomMessageBoxComponent } from 'src/app/components/utils/messages/custom-message-box.component';

export const MY_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY'
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'DD/MM/YYYY',
    monthYearA11yLabel: 'MMMM YYYY'
  }
};

export class CustomDateAdapter extends NativeDateAdapter {
  override format(date: Date, displayFormat: Object): string {
    if (!date) {
      return '';
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  }

  override parse(value: any): Date | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return value;
    }

    if (typeof value === 'string') {
      const partes = value.split('/');

      if (partes.length === 3) {
        const day = Number(partes[0]);
        const month = Number(partes[1]) - 1;
        const year = Number(partes[2]);

        return new Date(year, month, day);
      }
    }

    return null;
  }
}

@Component({
  selector: 'app-anulacion-rol',
  templateUrl: './anulacion-rol.component.html',
  styleUrls: ['./anulacion-rol.component.css'],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'es-EC' },
    { provide: DateAdapter, useClass: CustomDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS }
  ]
})
export class AnulacionRolComponent implements OnInit {
  form!: FormGroup;
  procesando = false;

  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private anularRolMensualService: AnularRolMensualService,
    private cierrePeriodoService: CierrePeriodoService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      fechaRol: [null, Validators.required]
    });
  }

  soloUltimoDiaMes = (fecha: Date | null): boolean => {
    if (!fecha) {
      return false;
    }

    const ultimoDiaMes = new Date(
      fecha.getFullYear(),
      fecha.getMonth() + 1,
      0
    ).getDate();

    return fecha.getDate() === ultimoDiaMes;
  };

  generar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const fechaRol: Date = this.form.value.fechaRol;

    if (!this.soloUltimoDiaMes(fechaRol)) {
      this.form.get('fechaRol')?.setErrors({ fechaInvalida: true });
      return;
    }

    const fechaPantalla = this.formatearFechaDDMMYYYY(fechaRol);

    const dialogRef = this.dialog.open(CustomMessageBoxComponent, {
      width: '420px',
      disableClose: true,
      data: {
        type: 'warning',
        title: 'Confirmar anulación',
        message:
          `¿Está seguro de anular la nómina del periodo ${fechaPantalla}?\n\n` +
          `Esta acción eliminará el cierre del periodo y todos los registros de nómina generados para esa fecha.`,
        confirmText: 'Sí, anular',
        cancelText: 'Cancelar',
        showCancel: true
      }
    });

    dialogRef.afterClosed().subscribe(confirmado => {
      if (confirmado === true) {
        this.anularCierreYLuegoNomina(fechaRol);
      }
    });
  }

  private anularCierreYLuegoNomina(fechaRol: Date): void {
    const fechaBackend = this.formatearFechaYYYYMMDD(fechaRol);

    const requestEliminarCierre: EliminarCierrePeriodoRequest = {
      fecha: fechaBackend,
      tipo: 'M'
    };

    const requestAnularNomina: AnularRolMensualRequest = {
      fechaRol: fechaBackend
    };

    this.procesando = true;

    this.cierrePeriodoService.eliminar(requestEliminarCierre).pipe(
      concatMap(respCierre => {
        /*
         * Success: eliminó cierre.
         * Warning: no existía cierre, pero igual se permite anular nómina.
         * Error: no continuar.
         */
        if (respCierre.type === 'Success' || respCierre.type === 'Warning') {
          return this.anularRolMensualService.anularRolMensual(requestAnularNomina);
        }

        return throwError(() => new Error(respCierre.message ?? 'No se pudo eliminar el cierre del periodo.'));
      })
    ).subscribe({
      next: respNomina => {
        this.procesando = false;

        if (respNomina.type === 'Success') {
          this.mostrarExito(respNomina.message ?? 'Se anuló la nómina correctamente.');
          this.cancelar();
          return;
        }

        if (respNomina.type === 'Warning') {
          this.mostrarAdvertencia(respNomina.message ?? 'No existen registros de nómina para anular.');
          return;
        }

        this.mostrarError(respNomina.message ?? 'No se pudo anular la nómina.');
      },
      error: err => {
        this.procesando = false;
        console.error('Error anulando cierre y nómina:', err);
        this.mostrarError(err?.message ?? 'Error al anular el cierre y la nómina.');
      }
    });
  }

  cancelar(): void {
    this.form.reset();
    this.procesando = false;
  }

  private mostrarExito(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 4000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['snackbar-success']
    });
  }

  private mostrarAdvertencia(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 5000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['snackbar-warning']
    });
  }

  private mostrarError(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 6000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['snackbar-error']
    });
  }

  private formatearFechaYYYYMMDD(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private formatearFechaDDMMYYYY(fecha: Date): string {
    const day = String(fecha.getDate()).padStart(2, '0');
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const year = fecha.getFullYear();

    return `${day}/${month}/${year}`;
  }
}