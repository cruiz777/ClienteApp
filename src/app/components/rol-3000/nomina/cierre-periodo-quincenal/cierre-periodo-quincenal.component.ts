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

import {
  CierrePeriodoService,
  CrearCierrePeriodoRequest
} from 'src/app/services/rol/cierre-periodo.service';

import { CustomMessageBoxComponent } from 'src/app/components/utils/messages/custom-message-box.component';

export const MY_DATE_FORMATS_QUINCENAL = {
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

export class CustomDateAdapterQuincenal extends NativeDateAdapter {
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
  selector: 'app-cierre-periodo-quincenal',
  templateUrl: './cierre-periodo-quincenal.component.html',
  styleUrls: ['./cierre-periodo-quincenal.component.css'],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'es-EC' },
    { provide: DateAdapter, useClass: CustomDateAdapterQuincenal },
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS_QUINCENAL }
  ]
})
export class CierrePeriodoQuincenalComponent implements OnInit {
  form!: FormGroup;
  procesando = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
    private readonly cierrePeriodoService: CierrePeriodoService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      fecha: [null, Validators.required]
    });
  }

  soloDiaQuince = (fecha: Date | null): boolean => {
    if (!fecha) {
      return false;
    }

    return fecha.getDate() === 15;
  };

  cierre(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const fecha: Date = this.form.value.fecha;

    if (!this.soloDiaQuince(fecha)) {
      this.form.get('fecha')?.setErrors({ fechaInvalida: true });
      return;
    }

    const fechaPantalla = this.formatearFechaDDMMYYYY(fecha);

    const dialogRef = this.dialog.open(CustomMessageBoxComponent, {
      width: '420px',
      disableClose: true,
      data: {
        type: 'warning',
        title: 'Confirmar cierre',
        message:
          `¿Está seguro de cerrar la quincena ${fechaPantalla}?\n\n` +
          `Después del cierre, la quincena de este periodo solo podrá consultarse.`,
        confirmText: 'Sí, cerrar',
        cancelText: 'Cancelar',
        showCancel: true
      }
    });

    dialogRef.afterClosed().subscribe(confirmado => {
      if (confirmado === true) {
        this.crearCierrePeriodoQuincenal(fecha);
      }
    });
  }

private crearCierrePeriodoQuincenal(fecha: Date): void {
  const fechaPeriodo = this.formatearFechaYYYYMMDD(fecha);
  const idUsuario = 1;

  this.procesando = true;

  this.cierrePeriodoService.cerrarQuincena(
    fechaPeriodo,
    idUsuario,
    1
  ).subscribe({
    next: resp => {
      this.procesando = false;

      if (resp.type === 'Success') {
        this.mostrarExito(resp.message ?? 'Quincena cerrada correctamente.');
        this.cancelar();
        return;
      }

      if (resp.type === 'Warning') {
        this.mostrarAdvertencia(resp.message ?? 'La quincena ya se encuentra cerrada.');
        return;
      }

      this.mostrarError(resp.message ?? 'No se pudo cerrar la quincena.');
    },
    error: err => {
      this.procesando = false;
      console.error('Error cerrando periodo quincenal:', err);
      this.mostrarError('Error al cerrar el periodo quincenal.');
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