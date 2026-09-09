import {
  Component,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  MatButtonModule
} from '@angular/material/button';

import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  NativeDateAdapter
} from '@angular/material/core';

import {
  MatDatepickerModule
} from '@angular/material/datepicker';

import {
  MatFormFieldModule
} from '@angular/material/form-field';

import {
  MatIconModule
} from '@angular/material/icon';

import {
  MatInputModule
} from '@angular/material/input';

import {
  MatSnackBar,
  MatSnackBarModule
} from '@angular/material/snack-bar';

import {
  ExtrasIessService,
  GenerarExtrasIessRequest
} from 'src/app/services/rol/extras-iess.service';


export const DD_MM_YYYY_FORMATS_EXTRAS = {

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


export class ExtrasDateAdapter
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
    'app-aviso-valores-extras',

  standalone:
    true,

  imports: [
    CommonModule,
    ReactiveFormsModule,

    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ],

  templateUrl:
    './aviso-valores-extras.component.html',

  styleUrl:
    './aviso-valores-extras.component.css',

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
        ExtrasDateAdapter
    },

    {
      provide:
        MAT_DATE_FORMATS,

      useValue:
        DD_MM_YYYY_FORMATS_EXTRAS
    }
  ]
})
export class AvisoValoresExtrasComponent
  implements OnInit {

  form!: FormGroup;

  generandoArchivo =
    false;

  generandoDetalle =
    false;

  generandoTotales =
    false;


  constructor(
    private readonly fb:
      FormBuilder,

    private readonly extrasIessService:
      ExtrasIessService,

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
   * =====================================================
   * GENERAR ARCHIVO TXT IESS
   * =====================================================
   */
  generarArchivo(): void {

    if (
      !this.validarFormulario()
    ) {
      return;
    }


    if (
      this.hayProcesoEnCurso()
    ) {
      return;
    }


    const request =
      this.construirRequest();


    this.generandoArchivo =
      true;


    this.extrasIessService
      .generarArchivo(
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

              'No existe información para generar el archivo de Extras IESS.'

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

            `Archivo generado correctamente. Registros: ${response.data.totalEmpleados}.`

          );

        },


        error: (
          error: any
        ) => {

          this.generandoArchivo =
            false;


          console.error(
            'Error generando archivo Extras IESS:',
            error
          );


          this.mostrarError(
            this.obtenerMensajeError(
              error,
              'Error al generar el archivo de Extras IESS.'
            )
          );

        }

      });

  }


  /*
   * =====================================================
   * REPORTE DETALLADO
   * =====================================================
   */
  generarReporteDetallado(): void {

    if (
      !this.validarFormulario()
    ) {
      return;
    }


    if (
      this.hayProcesoEnCurso()
    ) {
      return;
    }


    const request =
      this.construirRequest();


    this.generandoDetalle =
      true;


    this.extrasIessService
      .generarReporteDetallado(
        request
      )
      .subscribe({

        next: (
          blob: Blob
        ) => {

          this.generandoDetalle =
            false;


          if (
            !blob ||
            blob.size === 0
          ) {

            this.mostrarAdvertencia(
              'El reporte detallado generado está vacío.'
            );

            return;
          }


          this.abrirPdf(

            blob,

            'EXTRAS_IESS_DETALLADO'

          );

        },


        error: (
          error: any
        ) => {

          this.generandoDetalle =
            false;


          console.error(
            'Error generando reporte detallado Extras IESS:',
            error
          );


          this.mostrarError(
            'No se pudo generar el reporte detallado de Extras IESS.'
          );

        }

      });

  }


  /*
   * =====================================================
   * REPORTE TOTALES
   * =====================================================
   */
  generarReporteTotales(): void {

    if (
      !this.validarFormulario()
    ) {
      return;
    }


    if (
      this.hayProcesoEnCurso()
    ) {
      return;
    }


    const request =
      this.construirRequest();


    this.generandoTotales =
      true;


    this.extrasIessService
      .generarReporteTotales(
        request
      )
      .subscribe({

        next: (
          blob: Blob
        ) => {

          this.generandoTotales =
            false;


          if (
            !blob ||
            blob.size === 0
          ) {

            this.mostrarAdvertencia(
              'El reporte de totales generado está vacío.'
            );

            return;
          }


          this.abrirPdf(

            blob,

            'EXTRAS_IESS_TOTALES'

          );

        },


        error: (
          error: any
        ) => {

          this.generandoTotales =
            false;


          console.error(
            'Error generando reporte totales Extras IESS:',
            error
          );


          this.mostrarError(
            'No se pudo generar el reporte de totales de Extras IESS.'
          );

        }

      });

  }


  /*
   * =====================================================
   * CANCELAR / LIMPIAR
   * =====================================================
   */
  cancelar(): void {

    if (
      this.hayProcesoEnCurso()
    ) {
      return;
    }


    this.form.reset({

      periodo:
        this.obtenerUltimoDiaMesActual()

    });

  }


  /*
   * =====================================================
   * REQUEST
   * =====================================================
   */
  private construirRequest():
    GenerarExtrasIessRequest {

    const periodo =
      this.form
        .get('periodo')
        ?.value;


    return {

      fechaPeriodo:
        this.normalizarFechaPeriodo(
          periodo
        ),

      /*
       * Por ahora esta pantalla
       * genera para todas las empresas/locales
       * según soporte del backend.
       *
       * Si luego deseas obtener la empresa
       * del usuario autenticado, se cambia aquí.
       */
      idEmpresa:
        null,

      idLocal:
        null

    };

  }


  /*
   * =====================================================
   * VALIDACIONES
   * =====================================================
   */
  private validarFormulario():
    boolean {

    if (
      this.form.invalid
    ) {

      this.form
        .markAllAsTouched();


      this.mostrarAdvertencia(
        'Debe seleccionar el período a generar.'
      );


      return false;

    }


    const periodo =
      this.form
        .get('periodo')
        ?.value;


    if (
      !periodo
    ) {

      this.mostrarAdvertencia(
        'Debe seleccionar el período a generar.'
      );

      return false;

    }


    return true;

  }


  private hayProcesoEnCurso():
    boolean {

    return (
      this.generandoArchivo ||
      this.generandoDetalle ||
      this.generandoTotales
    );

  }


  /*
   * =====================================================
   * FECHAS
   * =====================================================
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
   * MatDatepicker devuelve Date.
   *
   * Backend DateOnly necesita:
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
     * Respaldo por si alguna vez
     * el formulario entrega string.
     */
    if (
      typeof valor ===
      'string'
    ) {

      /*
       * yyyy-MM-dd
       */
      if (
        /^\d{4}-\d{2}-\d{2}$/
          .test(
            valor
          )
      ) {
        return valor;
      }


      /*
       * dd/MM/yyyy
       */
      if (
        valor.includes('/')
      ) {

        const partes =
          valor.split('/');


        if (
          partes.length ===
          3
        ) {

          const dia =
            partes[0]
              .padStart(
                2,
                '0'
              );

          const mes =
            partes[1]
              .padStart(
                2,
                '0'
              );

          const anio =
            partes[2];


          return `${anio}-${mes}-${dia}`;

        }

      }


      return valor.substring(
        0,
        10
      );

    }


    const fecha =
      valor as Date;


    if (
      isNaN(
        fecha.getTime()
      )
    ) {
      return '';
    }


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
   * =====================================================
   * DESCARGAR TXT
   * =====================================================
   */
  private descargarArchivoBase64(
    contenidoBase64:
      string,

    nombreArchivo:
      string,

    contentType:
      string
  ): void {

    try {

      const byteCharacters =
        atob(
          contenidoBase64
        );


      const byteNumbers =
        new Array<number>(
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
        nombreArchivo ||
        this.construirNombreArchivoTxt();


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
    catch (
      error
    ) {

      console.error(
        'Error descargando archivo Base64:',
        error
      );


      this.mostrarError(
        'No se pudo descargar el archivo generado.'
      );

    }

  }


  /*
   * =====================================================
   * ABRIR PDF
   * =====================================================
   */
  private abrirPdf(
    blob: Blob,
    nombreBase: string
  ): void {

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


    /*
     * Si el navegador bloquea
     * la apertura de pestañas,
     * descargamos el PDF.
     */
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
        this.construirNombrePdf(
          nombreBase
        );


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


    /*
     * No revocamos inmediatamente,
     * porque la pestaña nueva necesita
     * seguir leyendo el Blob.
     */
    setTimeout(
      () => {

        window.URL
          .revokeObjectURL(
            url
          );

      },
      30000
    );

  }


  /*
   * =====================================================
   * NOMBRES ARCHIVOS
   * =====================================================
   */
  private construirNombreArchivoTxt():
    string {

    const periodo =
      this.obtenerPeriodoNombreArchivo();


    return (
      `EXTRAS_IESS_${periodo}.txt`
    );

  }


  private construirNombrePdf(
    nombreBase: string
  ): string {

    const periodo =
      this.obtenerPeriodoNombreArchivo();


    return (
      `${nombreBase}_${periodo}.pdf`
    );

  }


  private obtenerPeriodoNombreArchivo():
    string {

    const periodo =
      this.normalizarFechaPeriodo(

        this.form
          .get('periodo')
          ?.value

      );


    if (
      !periodo
    ) {
      return '';
    }


    /*
     * 2026-08-31
     *
     * =>
     *
     * 202608
     */
    const partes =
      periodo.split('-');


    if (
      partes.length >=
      2
    ) {

      return (
        `${partes[0]}${partes[1]}`
      );

    }


    return periodo.replace(
      /-/g,
      ''
    );

  }


  /*
   * =====================================================
   * MENSAJES
   * =====================================================
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


  /*
   * Cuando un endpoint normal devuelve JSON,
   * intenta obtener el mensaje del backend.
   */
  private obtenerMensajeError(
    error: any,
    mensajeDefault: string
  ): string {

    return (

      error?.error?.data?.mensaje ??

      error?.error?.message ??

      error?.message ??

      mensajeDefault

    );

  }

}