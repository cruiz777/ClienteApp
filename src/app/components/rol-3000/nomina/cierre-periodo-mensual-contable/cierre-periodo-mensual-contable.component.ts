import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { from } from 'rxjs';
import { concatMap, finalize } from 'rxjs/operators';

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
  ContabilizarMensualRequest,
  ContabilizarMensualResponse
} from 'src/app/services/rol/cierre-periodo.service';

import { CustomMessageBoxComponent } from 'src/app/components/utils/messages/custom-message-box.component';
import { environment } from 'src/environments/environment';

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
  selector: 'app-cierre-periodo-mensual-contable',
  templateUrl: './cierre-periodo-mensual-contable.component.html',
  styleUrls: ['./cierre-periodo-mensual-contable.component.css'],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'es-EC' },
    { provide: DateAdapter, useClass: CustomDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS }
  ]
})
export class CierrePeriodoMensualContableComponent implements OnInit {
  form!: FormGroup;
  procesando = false;

  resultadoContabilizacion: ContabilizarMensualResponse | null = null;

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

  get tieneReportes(): boolean {
    return !!(
      this.resultadoContabilizacion?.reporteProvision ||
      this.resultadoContabilizacion?.reporteResumenMensual ||
      this.resultadoContabilizacion?.reporteAsientoMensual
    );
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
        title: 'Confirmar contabilización',
        message:
          `¿Está seguro de contabilizar el periodo mensual ${fechaPantalla}?\n\n` +
          `Se generarán los asientos contables correspondientes.`,
        confirmText: 'Sí, contabilizar',
        cancelText: 'Cancelar',
        showCancel: true
      }
    });

    dialogRef.afterClosed().subscribe(confirmado => {
      if (confirmado === true) {
        this.contabilizarMensual(fecha);
      }
    });
  }

  private contabilizarMensual(fecha: Date): void {
    const request: ContabilizarMensualRequest = {
      fechaPeriodo: this.formatearFechaYYYYMMDD(fecha),
      idUsuario: 1,
      idEmpresa: 1,
      idZona: 1,
      recalcularAntes: true
    };

    this.procesando = true;
    this.resultadoContabilizacion = null;

    this.cierrePeriodoService.contabilizarMensual(request).subscribe({
      next: resp => {
        this.procesando = false;

        if (resp.type === 'Success') {
          this.resultadoContabilizacion = resp.data;

          const numDocNomina = resp.data?.numDocNomina;
          const numDocProvision = resp.data?.numDocProvision;

          let mensaje = resp.message ?? 'Contabilización generada correctamente.';

          if (numDocNomina || numDocProvision) {
            mensaje =
              `Contabilización generada correctamente. ` +
              `Nómina: AD ${numDocNomina ?? '-'} ` +
              `Provisión: AD ${numDocProvision ?? '-'}`;
          }

          this.mostrarExito(mensaje);
          return;
        }

        if (resp.type === 'Warning') {
          this.mostrarAdvertencia(
            resp.message ?? resp.data?.mensaje ?? 'No se pudo contabilizar el periodo.'
          );
          return;
        }

        this.mostrarError(
          resp.message ?? resp.data?.mensaje ?? 'No se pudo contabilizar el periodo.'
        );
      },
      error: err => {
        this.procesando = false;
        console.error('Error contabilizando periodo mensual:', err);

        this.mostrarError(
          err?.error?.message ??
          err?.error?.data?.mensaje ??
          'Error al contabilizar el periodo mensual.'
        );
      }
    });
  }

imprimir(): void {
  if (!this.resultadoContabilizacion) {
    this.mostrarAdvertencia('Primero debe generar la contabilización.');
    return;
  }

  const reportes = [
    this.resultadoContabilizacion.reporteProvision,
    this.resultadoContabilizacion.reporteResumenMensual,
    this.resultadoContabilizacion.reporteAsientoMensual
  ].filter((x): x is string => !!x && x.trim().length > 0);

  if (reportes.length === 0) {
    this.mostrarAdvertencia('No existen reportes para imprimir.');
    return;
  }

  this.procesando = true;

  from(reportes)
    .pipe(
      concatMap(ruta => {
        const url = this.construirUrlReporte(ruta);

        return this.cierrePeriodoService.descargarReportePdf(url).pipe(
          concatMap(blob => {
            this.descargarBlob(blob, this.obtenerNombreArchivo(ruta));
            return from([true]);
          })
        );
      }),
      finalize(() => {
        this.procesando = false;
      })
    )
    .subscribe({
      next: () => {},
      error: err => {
        console.error('Error descargando reportes:', err);
        this.mostrarError('No se pudieron descargar los reportes.');
      },
      complete: () => {
        this.mostrarExito('Reportes descargados correctamente.');
      }
    });
}

  private descargarPdf(ruta: string): void {
    const url = this.construirUrlReporte(ruta);

    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.download = this.obtenerNombreArchivo(ruta);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private construirUrlReporte(ruta: string): string {
    if (ruta.startsWith('http://') || ruta.startsWith('https://')) {
      return ruta;
    }

    const baseBackend = this.obtenerBaseBackend();

    if (ruta.startsWith('/')) {
      return `${baseBackend}${ruta}`;
    }

    return `${baseBackend}/${ruta}`;
  }

  private obtenerBaseBackend(): string {
    // Ejemplo environment.nominaUrl:
    // http://localhost:5093/nomina/api
    // Debemos convertirlo a:
    // http://localhost:5093

    let base = environment.nominaUrl;

    base = base.replace(/\/CierrePeriodo\/?$/i, '');
    base = base.replace(/\/nomina\/api\/?$/i, '');
    base = base.replace(/\/api\/?$/i, '');

    return base.replace(/\/$/, '');
  }

  private obtenerNombreArchivo(ruta: string): string {
    const partes = ruta.split('/');
    return partes[partes.length - 1] || 'reporte.pdf';
  }

  cancelar(): void {
    this.form.reset();
    this.procesando = false;
    this.resultadoContabilizacion = null;
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
  private descargarBlob(blob: Blob, nombreArchivo: string): void {
  const urlBlob = window.URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = urlBlob;
  link.download = nombreArchivo;

  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  window.URL.revokeObjectURL(urlBlob);
}




}