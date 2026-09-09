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
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  NativeDateAdapter
} from '@angular/material/core';

import {
  MatSnackBar
} from '@angular/material/snack-bar';

import {
  AvisoNuevoSueldoIessService,
  GenerarAvisoNuevoSueldoIessRequest
} from 'src/app/services/rol/aviso-nuevo-sueldo-iess.service';


export const DD_MM_YYYY_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY'
  },
  display: {
    dateInput: 'dd/MM/yyyy',
    monthYearLabel: 'MMMM yyyy',
    dateA11yLabel: 'dd/MM/yyyy',
    monthYearA11yLabel: 'MMMM yyyy'
  }
};


export class CustomDateAdapter
  extends NativeDateAdapter {

  override format(
    date: Date,
    displayFormat: Object
  ): string {

    if (!date) {
      return '';
    }

    const dia =
      String(
        date.getDate()
      ).padStart(
        2,
        '0'
      );

    const mes =
      String(
        date.getMonth() + 1
      ).padStart(
        2,
        '0'
      );

    const anio =
      date.getFullYear();

    return `${dia}/${mes}/${anio}`;
  }
}


@Component({
  selector:
    'app-generacion-aviso-nuevo-sueldo-iess',

  templateUrl:
    './generacion-aviso-nuevo-sueldo-iess.component.html',

  styleUrls: [
    './generacion-aviso-nuevo-sueldo-iess.component.css'
  ],

  providers: [
    {
      provide:
        MAT_DATE_LOCALE,

      useValue:
        'es-EC'
    },
    {
      provide:
        DateAdapter,

      useClass:
        CustomDateAdapter
    },
    {
      provide:
        MAT_DATE_FORMATS,

      useValue:
        DD_MM_YYYY_FORMATS
    }
  ]
})
export class GeneracionAvisoNuevoSueldoIessComponent
  implements OnInit {

  form!: FormGroup;

  generandoArchivo = false;
  generandoReporte = false;


  constructor(
    private readonly fb:
      FormBuilder,

    private readonly avisoNuevoSueldoService:
      AvisoNuevoSueldoIessService,

    private readonly snackBar:
      MatSnackBar
  ) {}


  ngOnInit(): void {

    this.form =
      this.fb.group({

        periodo: [
          this.obtenerUltimoDiaMesActual(),
          Validators.required
        ]

      });
  }


  /*
   * GENERAR TXT IESS
   */
  generarArchivo(): void {

    if (
      !this.validarFormulario()
    ) {
      return;
    }

    if (
      this.generandoArchivo
    ) {
      return;
    }

    const request =
      this.construirRequest();

    this.generandoArchivo =
      true;

    this.avisoNuevoSueldoService
      .generarArchivoIess(
        request
      )
      .subscribe({

        next: response => {

          this.generandoArchivo =
            false;

          if (
            response.type !==
              'Success' ||
            !response.data?.procesado
          ) {

            this.mostrarAdvertencia(

              response.data?.mensaje ??

              response.message ??

              'No se pudo generar el archivo IESS.'

            );

            return;
          }


          if (
            !response.data
              .contenidoBase64 ||

            !response.data
              .nombreArchivo
          ) {

            this.mostrarAdvertencia(
              'El backend no devolvió el archivo generado.'
            );

            return;
          }


          this.descargarArchivoBase64(

            response.data
              .contenidoBase64,

            response.data
              .nombreArchivo,

            response.data
              .contentType ??
              'text/plain'

          );


          this.mostrarExito(

            response.data
              .mensaje ??

            'Archivo IESS generado correctamente.'

          );
        },


        error: (
          error: any
        ) => {

          this.generandoArchivo =
            false;

          console.error(
            'Error generando archivo IESS:',
            error
          );


          this.mostrarError(

            error?.error?.message ??

            'Error al generar el archivo de nuevo sueldo IESS.'

          );
        }
      });
  }


  /*
   * REPORTE PDF
   */
  generarReporte(): void {

    if (
      !this.validarFormulario()
    ) {
      return;
    }

    if (
      this.generandoReporte
    ) {
      return;
    }


    const request =
      this.construirRequest();


    this.generandoReporte =
      true;


    this.avisoNuevoSueldoService
      .generarReporteModificacionSueldos(
        request
      )
      .subscribe({

        next: (
          blob: Blob
        ) => {

          this.generandoReporte =
            false;


          if (
            !blob ||
            blob.size === 0
          ) {

            this.mostrarAdvertencia(
              'El reporte generado está vacío.'
            );

            return;
          }


          const url =
            window.URL
              .createObjectURL(
                blob
              );


          const ventana =
            window.open(
              url,
              '_blank'
            );


          if (
            !ventana
          ) {

            const link =
              document
                .createElement(
                  'a'
                );


            link.href =
              url;


            link.download =
              this.construirNombreReporte();


            document.body
              .appendChild(
                link
              );


            link.click();


            document.body
              .removeChild(
                link
              );
          }


          setTimeout(
            () => {

              window.URL
                .revokeObjectURL(
                  url
                );

            },
            30000
          );

        },


        error: (
          error: any
        ) => {

          this.generandoReporte =
            false;


          console.error(
            'Error generando reporte:',
            error
          );


          this.mostrarError(
            'No se pudo generar el reporte de modificación de sueldos.'
          );
        }
      });
  }


  /*
   * CANCELAR
   */
  cancelar(): void {

    this.form.reset({

      periodo:
        this.obtenerUltimoDiaMesActual()

    });

  }


  /*
   * VALIDAR FORMULARIO
   */
  private validarFormulario():
    boolean {

    if (
      this.form.invalid
    ) {

      this.form
        .markAllAsTouched();


      this.mostrarAdvertencia(
        'Debe seleccionar el período.'
      );


      return false;
    }


    return true;
  }


  /*
   * CONSTRUIR REQUEST
   */
  private construirRequest():
    GenerarAvisoNuevoSueldoIessRequest {

    const periodo =
      this.form
        .get('periodo')
        ?.value;


    return {

      fechaPeriodo:
        this.normalizarFechaPeriodo(
          periodo
        ),


      idEmpresa:
        null,


      idLocal:
        null
    };
  }


  /*
   * CONVERTIR DATE
   *
   * Angular Material DatePicker
   * devuelve Date.
   *
   * Backend DateOnly espera:
   *
   * yyyy-MM-dd
   */
  private normalizarFechaPeriodo(
    valor: any
  ): string {

    if (
      !valor
    ) {
      return '';
    }


    /*
     * Por seguridad,
     * si algún día llega string.
     */
    if (
      typeof valor ===
      'string'
    ) {

      return valor.substring(
        0,
        10
      );
    }


    const fecha =
      valor as Date;


    const anio =
      fecha.getFullYear();


    const mes =
      String(
        fecha.getMonth() + 1
      )
        .padStart(
          2,
          '0'
        );


    const dia =
      String(
        fecha.getDate()
      )
        .padStart(
          2,
          '0'
        );


    return `${anio}-${mes}-${dia}`;
  }


  /*
   * FECHA INICIAL
   *
   * IMPORTANTE:
   *
   * Ahora devuelve Date,
   * porque MatDatepicker utiliza Date.
   */
  private obtenerUltimoDiaMesActual():
    Date {

    const hoy =
      new Date();


    return new Date(

      hoy.getFullYear(),

      hoy.getMonth() + 1,

      0

    );
  }


  /*
   * DESCARGAR ARCHIVO BASE64
   */
  private descargarArchivoBase64(
    contenidoBase64: string,
    nombreArchivo: string,
    contentType: string
  ): void {

    const byteCharacters =
      atob(
        contenidoBase64
      );


    const byteNumbers =
      new Array(
        byteCharacters.length
      );


    for (
      let i = 0;
      i <
        byteCharacters.length;
      i++
    ) {

      byteNumbers[i] =
        byteCharacters
          .charCodeAt(
            i
          );
    }


    const byteArray =
      new Uint8Array(
        byteNumbers
      );


    const blob =
      new Blob(
        [
          byteArray
        ],
        {
          type:
            contentType ||
            'text/plain'
        }
      );


    const url =
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


    window.URL
      .revokeObjectURL(
        url
      );
  }


  /*
   * NOMBRE REPORTE
   */
  private construirNombreReporte():
    string {

    const periodo =
      this.normalizarFechaPeriodo(

        this.form
          .get('periodo')
          ?.value

      );


    const fecha =
      periodo.replace(
        /-/g,
        ''
      );


    return (
      `REPORTE_MODIFICACION_SUELDOS_${fecha}.pdf`
    );
  }


  /*
   * MENSAJE EXITO
   */
  private mostrarExito(
    mensaje: string
  ): void {

    this.snackBar.open(

      mensaje,

      'Cerrar',

      {
        duration:
          5000,

        horizontalPosition:
          'end',

        verticalPosition:
          'top',

        panelClass: [
          'snackbar-success'
        ]
      }

    );
  }


  /*
   * MENSAJE ADVERTENCIA
   */
  private mostrarAdvertencia(
    mensaje: string
  ): void {

    this.snackBar.open(

      mensaje,

      'Cerrar',

      {
        duration:
          6000,

        horizontalPosition:
          'end',

        verticalPosition:
          'top',

        panelClass: [
          'snackbar-warning'
        ]
      }

    );
  }


  /*
   * MENSAJE ERROR
   */
  private mostrarError(
    mensaje: string
  ): void {

    this.snackBar.open(

      mensaje,

      'Cerrar',

      {
        duration:
          7000,

        horizontalPosition:
          'end',

        verticalPosition:
          'top',

        panelClass: [
          'snackbar-error'
        ]
      }

    );
  }

}