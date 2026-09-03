import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  Validators
} from '@angular/forms';

import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  NativeDateAdapter
} from '@angular/material/core';

import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { RolNominaService } from 'src/app/services/rol/rol-nomina.service';
import { UsuarioService } from 'src/app/services/usuario.service';

import { CustomMessageBoxComponent } from 'src/app/components/utils/messages/custom-message-box.component';

export const DD_MM_YYYY_FORMATS_ANULACION_QUINCENA = {
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

export class CustomDateAdapterAnulacionQuincena extends NativeDateAdapter {
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
  selector: 'app-anulacion-rolq',
  templateUrl: './anulacion-rolq.component.html',
  styleUrls: ['./anulacion-rolq.component.css'],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'es-EC' },
    { provide: DateAdapter, useClass: CustomDateAdapterAnulacionQuincena },
    { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY_FORMATS_ANULACION_QUINCENA }
  ]
})
export class AnulacionRolqComponent implements OnInit {
  form!: FormGroup;
  procesando = false;

  usuarioActual = this.usuarioService.getUsuarioActual();

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
    private readonly rolNominaService: RolNominaService,
    private readonly usuarioService: UsuarioService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      fechaRol: [
        this.obtenerFechaInicial(),
        [Validators.required, this.validarFechaQuincena.bind(this)]
      ],
      numeroQuincena: [1, Validators.required]
    });

    this.form.get('numeroQuincena')?.valueChanges.subscribe(() => {
      const fechaBase = this.form.value.fechaRol ?? new Date();

      this.form.patchValue({
        fechaRol: this.obtenerFechaSegunQuincena(fechaBase)
      }, { emitEvent: false });

      this.form.get('fechaRol')?.updateValueAndValidity();
    });
  }

  soloFechaQuincena = (fecha: Date | null): boolean => {
    if (!fecha) {
      return false;
    }

    const numeroQuincena = this.toNumber(this.form?.value?.numeroQuincena) || 1;

    if (numeroQuincena === 2) {
      const ultimoDiaMes = new Date(
        fecha.getFullYear(),
        fecha.getMonth() + 1,
        0
      ).getDate();

      return fecha.getDate() === ultimoDiaMes;
    }

    return fecha.getDate() === 15;
  };

  validarFechaQuincena(control: AbstractControl): ValidationErrors | null {
    const fecha = control.value;

    if (!fecha) {
      return null;
    }

    const date = fecha instanceof Date
      ? fecha
      : new Date(fecha);

    if (isNaN(date.getTime())) {
      return { fechaInvalida: true };
    }

    const numeroQuincena = this.toNumber(this.form?.value?.numeroQuincena) || 1;

    if (numeroQuincena === 2) {
      const ultimoDiaMes = new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0
      ).getDate();

      return date.getDate() === ultimoDiaMes
        ? null
        : { fechaInvalida: true };
    }

    return date.getDate() === 15
      ? null
      : { fechaInvalida: true };
  }

  anular(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.mostrarAdvertencia('Debe ingresar una fecha válida de quincena.');
      return;
    }

    const fechaRol: Date = this.form.value.fechaRol;
    const numeroQuincena = this.toNumber(this.form.value.numeroQuincena) || 1;
    const fechaPantalla = this.formatearFechaDDMMYYYY(fechaRol);

    const dialogRef = this.dialog.open(CustomMessageBoxComponent, {
      width: '430px',
      disableClose: true,
      data: {
        type: 'warning',
        title: 'Confirmar anulación',
        message:
          `¿Está seguro de anular la quincena ${fechaPantalla}?\n\n` +
          `Esta acción eliminará los registros generados de la nómina quincenal.`,
        confirmText: 'Sí, anular',
        cancelText: 'Cancelar',
        showCancel: true
      }
    });

    dialogRef.afterClosed().subscribe(confirmado => {
      if (confirmado === true) {
        this.anularRolQuincena(fechaRol, numeroQuincena);
      }
    });
  }

  private anularRolQuincena(
    fechaRol: Date,
    numeroQuincena: number
  ): void {
    const request = {
      fechaPeriodo: this.formatearFechaYYYYMMDD(fechaRol),
      numeroQuincena,
      idLocal: null,
      idDepartamento: null,
      idUsuario: this.usuarioActual?.id_usuario ?? 1
    };

    this.procesando = true;

    this.rolNominaService.anularRolQuincena(request).subscribe({
      next: resp => {
        this.procesando = false;

        if (resp.type === 'Success') {
          this.mostrarExito(resp.message ?? 'Quincena anulada correctamente.');
          this.cancelar(false);
          return;
        }

        if (resp.type === 'Warning') {
          this.mostrarAdvertencia(resp.message ?? 'No se pudo anular la quincena.');
          return;
        }

        this.mostrarError(resp.message ?? 'No se pudo anular la quincena.');
      },
      error: err => {
        this.procesando = false;
        console.error('Error anulando quincena:', err);
        this.mostrarError('Error al anular la quincena.');
      }
    });
  }

  cancelar(mostrarMensaje: boolean = true): void {
    this.form.reset({
      fechaRol: this.obtenerFechaInicial(),
      numeroQuincena: 1
    });

    this.procesando = false;

    if (mostrarMensaje) {
      this.mostrarAdvertencia('Operación cancelada.');
    }
  }

  private obtenerFechaInicial(): Date {
    const hoy = new Date();

    if (hoy.getDate() <= 15) {
      return new Date(
        hoy.getFullYear(),
        hoy.getMonth(),
        15
      );
    }

    return new Date(
      hoy.getFullYear(),
      hoy.getMonth() + 1,
      0
    );
  }

  private obtenerFechaSegunQuincena(fechaBase: any): Date {
    const fecha = fechaBase instanceof Date
      ? fechaBase
      : new Date(fechaBase);

    const numeroQuincena = this.toNumber(this.form?.value?.numeroQuincena) || 1;

    if (numeroQuincena === 2) {
      return new Date(
        fecha.getFullYear(),
        fecha.getMonth() + 1,
        0
      );
    }

    return new Date(
      fecha.getFullYear(),
      fecha.getMonth(),
      15
    );
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

  private toNumber(value: any): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }

    const n = Number(value);

    return isNaN(n) ? 0 : n;
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
}