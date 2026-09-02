import {
  Component,
  OnInit
} from '@angular/core';

import {
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';

import {
  from
} from 'rxjs';

import {
  concatMap,
  finalize
} from 'rxjs/operators';

import {
  MatSnackBar
} from '@angular/material/snack-bar';

import {
  CierrePeriodoService,
  ContabilizarMensualRequest,
  ReportesContablesMensualesResponse
} from 'src/app/services/rol/cierre-periodo.service';

import {
  environment
} from 'src/environments/environment';

@Component({
  selector: 'app-impresion-contabilidad',
  templateUrl: './impresion-contabilidad.component.html',
  styleUrls: ['./impresion-contabilidad.component.css']
})
export class ImpresionContabilidadComponent
  implements OnInit {

  form!: FormGroup;

  procesando = false;
  consultado = false;

  reportes:
    ReportesContablesMensualesResponse | null =
      null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly cierrePeriodoService: CierrePeriodoService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.form =
      this.fb.group({
        periodo: [
          '',
          Validators.required
        ]
      });
  }

  // ============================================================
  // HAY REPORTES
  // ============================================================

  get tieneReportes(): boolean {
    return !!(
      this.reportes?.reporteProvision
      ||
      this.reportes?.reporteResumenMensual
      ||
      this.reportes?.reporteAsientoMensual
    );
  }

  // ============================================================
  // ACEPTAR
  //
  // GENERA LOS REPORTES DIRECTAMENTE DESDE rol.rol_nomina.
  //
  // NO BUSCA ASIENTOS.
  // NO CREA ASIENTOS.
  // ============================================================

  aceptar(): void {
    if (this.procesando) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();

      this.mostrarAdvertencia(
        'Debe seleccionar el período.'
      );

      return;
    }

    const periodo =
      String(
        this.form
          .get('periodo')
          ?.value
        ??
        ''
      )
      .trim();

    if (!periodo) {
      this.mostrarAdvertencia(
        'Debe seleccionar el período.'
      );

      return;
    }

    if (!this.esUltimoDiaMes(periodo)) {
      this.mostrarAdvertencia(
        'Debe seleccionar el último día del mes.'
      );

      return;
    }

    /*
     * Se usan los mismos valores que ya usa actualmente
     * la pantalla de cierre/contabilización mensual.
     */
    const request:
      ContabilizarMensualRequest = {

      fechaPeriodo:
        periodo,

      idUsuario:
        1,

      idEmpresa:
        1,

      idZona:
        1,

      recalcularAntes:
        false
    };

    this.procesando =
      true;

    this.consultado =
      false;

    this.reportes =
      null;

    console.log(
      'GENERANDO REPORTES SIN ASIENTOS:',
      request
    );

    this.cierrePeriodoService
      .generarReportes(
        request
      )
      .pipe(
        finalize(
          () => {
            this.procesando =
              false;
          }
        )
      )
      .subscribe({
        next:
          response => {

            console.log(
              'RESPUESTA GENERAR REPORTES:',
              response
            );

            this.consultado =
              true;

            if (
              response?.type ===
              'Success'
              &&
              response.data
            ) {
              this.reportes =
                response.data;

              if (this.tieneReportes) {
                this.mostrarExito(
                  response.message
                  ??
                  'Reportes generados correctamente.'
                );
              }
              else {
                this.reportes =
                  null;

                this.mostrarAdvertencia(
                  'El proceso terminó, pero no se recibieron rutas de reportes.'
                );
              }

              return;
            }

            this.reportes =
              null;

            this.mostrarAdvertencia(
              response?.message
              ??
              'No se pudieron generar los reportes.'
            );
          },

        error:
          error => {

            console.error(
              'ERROR GENERANDO REPORTES:',
              error
            );

            this.consultado =
              true;

            this.reportes =
              null;

            this.mostrarError(
              error?.error?.message
              ??
              error?.error?.Message
              ??
              error?.message
              ??
              'No se pudieron generar los reportes.'
            );
          }
      });
  }

  // ============================================================
  // IMPRIMIR / DESCARGAR
  // ============================================================

  imprimir(): void {
    if (this.procesando) {
      return;
    }

    if (!this.reportes) {
      this.mostrarAdvertencia(
        'Primero debe generar los reportes.'
      );

      return;
    }

    const reportes:
      string[] = [

      this.reportes
        .reporteProvision,

      this.reportes
        .reporteResumenMensual,

      this.reportes
        .reporteAsientoMensual

    ]
      .filter(
        (x): x is string =>
          typeof x === 'string'
          &&
          x.trim().length > 0
      );

    if (reportes.length === 0) {
      this.mostrarAdvertencia(
        'No existen reportes para descargar.'
      );

      return;
    }

    this.procesando =
      true;

    from(
      reportes
    )
      .pipe(
        concatMap(
          ruta => {

            const url =
              this.construirUrlReporte(
                ruta
              );

            return this
              .cierrePeriodoService
              .descargarReportePdf(
                url
              )
              .pipe(
                concatMap(
                  (
                    blob:
                      Blob
                  ) => {

                    this.descargarBlob(
                      blob,
                      this.obtenerNombreArchivo(
                        ruta
                      )
                    );

                    return from(
                      [true]
                    );
                  }
                )
              );
          }
        ),

        finalize(
          () => {
            this.procesando =
              false;
          }
        )
      )
      .subscribe({
        error:
          error => {

            console.error(
              'Error descargando reportes:',
              error
            );

            this.mostrarError(
              'No se pudieron descargar los reportes.'
            );
          },

        complete:
          () => {

            this.mostrarExito(
              'Reportes descargados correctamente.'
            );
          }
      });
  }

  // ============================================================
  // CANCELAR
  // ============================================================

  cancelar(): void {
    this.form.reset({
      periodo:
        ''
    });

    this.reportes =
      null;

    this.consultado =
      false;

    this.procesando =
      false;
  }

  // ============================================================
  // VALIDAR ÚLTIMO DÍA DEL MES
  // ============================================================

  private esUltimoDiaMes(
    periodo: string
  ): boolean {
    const partes =
      periodo.split(
        '-'
      );

    if (partes.length !== 3) {
      return false;
    }

    const anio =
      Number(
        partes[0]
      );

    const mes =
      Number(
        partes[1]
      );

    const dia =
      Number(
        partes[2]
      );

    if (
      !anio
      ||
      !mes
      ||
      !dia
    ) {
      return false;
    }

    const ultimoDia =
      new Date(
        anio,
        mes,
        0
      )
      .getDate();

    return dia ===
      ultimoDia;
  }

  // ============================================================
  // CONSTRUIR URL DEL PDF
  // ============================================================

  private construirUrlReporte(
    ruta: string
  ): string {
    if (
      ruta.startsWith(
        'http://'
      )
      ||
      ruta.startsWith(
        'https://'
      )
    ) {
      return ruta;
    }

    const baseBackend =
      this.obtenerBaseBackend();

    if (
      ruta.startsWith(
        '/'
      )
    ) {
      return `${baseBackend}${ruta}`;
    }

    return `${baseBackend}/${ruta}`;
  }

  private obtenerBaseBackend():
    string {
    let base =
      environment.nominaUrl;

    base =
      base.replace(
        /\/CierrePeriodo\/?$/i,
        ''
      );

    base =
      base.replace(
        /\/nomina\/api\/?$/i,
        ''
      );

    base =
      base.replace(
        /\/api\/?$/i,
        ''
      );

    return base.replace(
      /\/$/,
      ''
    );
  }

  private obtenerNombreArchivo(
    ruta: string
  ): string {
    const rutaSinQuery =
      ruta.split(
        '?'
      )[0];

    const partes =
      rutaSinQuery.split(
        '/'
      );

    return (
      partes[
        partes.length - 1
      ]
      ||
      'reporte.pdf'
    );
  }

  private descargarBlob(
    blob: Blob,
    nombreArchivo: string
  ): void {
    if (
      !blob
      ||
      blob.size === 0
    ) {
      this.mostrarError(
        'El servidor devolvió un archivo vacío.'
      );

      return;
    }

    const urlBlob =
      window.URL
        .createObjectURL(
          blob
        );

    const link =
      document
        .createElement(
          'a'
        );

    link.href =
      urlBlob;

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

    window.URL
      .revokeObjectURL(
        urlBlob
      );
  }

  private mostrarExito(
    mensaje: string
  ): void {
    this.snackBar.open(
      mensaje,
      'Cerrar',
      {
        duration:
          4000,

        horizontalPosition:
          'right',

        verticalPosition:
          'top',

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
        duration:
          5000,

        horizontalPosition:
          'right',

        verticalPosition:
          'top',

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
        duration:
          6000,

        horizontalPosition:
          'right',

        verticalPosition:
          'top',

        panelClass: [
          'snackbar-error'
        ]
      }
    );
  }
}
