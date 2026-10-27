import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';

import {
  ReporteFondosReservaRequest,
  ReportesEmpleadosService
} from 'src/app/services/rol/reportes-empleados.service';

@Component({
  selector: 'app-listado-fondos-reserva',
  templateUrl: './listado-fondos-reserva.component.html',
  styleUrls: ['./listado-fondos-reserva.component.css']
})
export class ListadoFondosReservaComponent implements OnInit {

  form!: FormGroup;

  generando = false;

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

  anios: number[] = [];

  constructor(
    private readonly fb: FormBuilder,
    private readonly reportesService: ReportesEmpleadosService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.cargarAnios();
    this.crearFormulario();
  }

  private cargarAnios(): void {
    const anioActual = new Date().getFullYear();

    for (let anio = anioActual + 1; anio >= 2000; anio--) {
      this.anios.push(anio);
    }
  }

  private crearFormulario(): void {
    const fechaActual = new Date();

    this.form = this.fb.group({
      mes: [
        fechaActual.getMonth() + 1,
        Validators.required
      ],
      anio: [
        fechaActual.getFullYear(),
        Validators.required
      ]
    });
  }

  aceptar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();

      this.mostrarAdvertencia(
        'Debe seleccionar el mes y el año.'
      );

      return;
    }

    if (this.generando) {
      return;
    }

    const mes = Number(
      this.form.get('mes')?.value
    );

    const anio = Number(
      this.form.get('anio')?.value
    );

    const fechaPeriodo =
      this.obtenerUltimoDiaMes(
        anio,
        mes
      );

    const request: ReporteFondosReservaRequest = {
      fechaPeriodo,
      idEmpresa: null
    };

    console.log(
      'REQUEST FONDOS RESERVA:',
      request
    );

    this.generando = true;

    this.reportesService
      .generarFondosReservaPdf(request)
      .pipe(
        finalize(() => {
          this.generando = false;
        })
      )
      .subscribe({
        next: blob => {

          if (
            !blob ||
            blob.size === 0
          ) {
            this.mostrarAdvertencia(
              'El reporte generado está vacío.'
            );

            return;
          }

          const mesTexto =
            String(mes).padStart(2, '0');

          const nombreArchivo =
            `REPORTE_FONDOS_RESERVA_${anio}${mesTexto}.pdf`;

          this.descargarPdf(
            blob,
            nombreArchivo
          );

          this.mostrarExito(
            'Reporte de fondos de reserva generado correctamente.'
          );
        },

        error: error => {
          console.error(
            'Error generando reporte fondos reserva:',
            error
          );

          this.mostrarError(
            error?.error?.message ??
            'No se pudo generar el reporte de fondos de reserva.'
          );
        }
      });
  }

  cancelar(): void {
    if (this.generando) {
      return;
    }

    const fechaActual = new Date();

    this.form.reset({
      mes: fechaActual.getMonth() + 1,
      anio: fechaActual.getFullYear()
    });
  }

  get periodoSeleccionado(): string {
    const mes = Number(
      this.form?.get('mes')?.value
    );

    const anio = Number(
      this.form?.get('anio')?.value
    );

    if (!mes || !anio) {
      return '';
    }

    return `${String(mes).padStart(2, '0')}/${anio}`;
  }

  private obtenerUltimoDiaMes(
    anio: number,
    mes: number
  ): string {

    const ultimoDia =
      new Date(
        anio,
        mes,
        0
      ).getDate();

    const mesTexto =
      String(mes)
        .padStart(2, '0');

    const diaTexto =
      String(ultimoDia)
        .padStart(2, '0');

    return `${anio}-${mesTexto}-${diaTexto}`;
  }

  private descargarPdf(
    blob: Blob,
    nombreArchivo: string
  ): void {

    const archivo =
      new Blob(
        [blob],
        {
          type: 'application/pdf'
        }
      );

    const url =
      window.URL
        .createObjectURL(
          archivo
        );

    const link =
      document
        .createElement(
          'a'
        );

    link.href =
      url;

    link.download =
      nombreArchivo;

    document.body
      .appendChild(
        link
      );

    link.click();

    document.body
      .removeChild(
        link
      );

    setTimeout(() => {
      window.URL
        .revokeObjectURL(
          url
        );
    }, 1000);
  }

  private mostrarExito(
    mensaje: string
  ): void {

    this.snackBar.open(
      mensaje,
      'Cerrar',
      {
        duration: 5000,
        horizontalPosition: 'end',
        verticalPosition: 'top',
        panelClass: [
          'snackbar-success'
        ]
      }
    );
  }

  private mostrarAdvertencia(
    mensaje: string
  ): void {

    this.snackBar.open(
      mensaje,
      'Cerrar',
      {
        duration: 5000,
        horizontalPosition: 'end',
        verticalPosition: 'top',
        panelClass: [
          'snackbar-warning'
        ]
      }
    );
  }

  private mostrarError(
    mensaje: string
  ): void {

    this.snackBar.open(
      mensaje,
      'Cerrar',
      {
        duration: 7000,
        horizontalPosition: 'end',
        verticalPosition: 'top',
        panelClass: [
          'snackbar-error'
        ]
      }
    );
  }
}