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
  selector: 'app-cierre-periodo-mensual',
  templateUrl: './cierre-periodo-mensual.component.html',
  styleUrls: ['./cierre-periodo-mensual.component.css'],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'es-EC' },
    { provide: DateAdapter, useClass: CustomDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS }
  ]
})
export class CierrePeriodoMensualComponent implements OnInit {
  form!: FormGroup;
  procesando = false;

  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private cierrePeriodoService: CierrePeriodoService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      fecha: [null, Validators.required]
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

  cierre(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const fecha: Date = this.form.value.fecha;

    if (!this.soloUltimoDiaMes(fecha)) {
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
          `¿Está seguro de cerrar el periodo mensual ${fechaPantalla}?\n\n` +
          `Después del cierre, la nómina de este periodo solo podrá consultarse.`,
        confirmText: 'Sí, cerrar',
        cancelText: 'Cancelar',
        showCancel: true
      }
    });

    dialogRef.afterClosed().subscribe(confirmado => {
      if (confirmado === true) {
        this.crearCierrePeriodo(fecha);
      }
    });
  }

  private crearCierrePeriodo(fecha: Date): void {
    const request: CrearCierrePeriodoRequest = {
      fecha: this.formatearFechaYYYYMMDD(fecha),
      idUsuario: 1,
      tipo: 'M'
    };

    this.procesando = true;

    this.cierrePeriodoService.crear(request).subscribe({
      next: resp => {
        this.procesando = false;

        if (resp.type === 'Success') {
          this.mostrarExito(resp.message ?? 'Periodo cerrado correctamente.');
          this.cancelar();
          return;
        }

        if (resp.type === 'Warning') {
          this.mostrarAdvertencia(resp.message ?? 'El periodo ya se encuentra cerrado.');
          return;
        }

        this.mostrarError(resp.message ?? 'No se pudo cerrar el periodo.');
      },
      error: err => {
        this.procesando = false;
        console.error('Error cerrando periodo mensual:', err);
        this.mostrarError('Error al cerrar el periodo mensual.');
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