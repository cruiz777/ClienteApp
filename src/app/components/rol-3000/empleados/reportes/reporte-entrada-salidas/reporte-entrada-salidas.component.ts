import { Component, OnInit } from '@angular/core';

import {
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';

import {
  HttpErrorResponse
} from '@angular/common/http';

import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  MatDateFormats
} from '@angular/material/core';

import {
  ReportesEmpleadosService,
  EmpleadoIngresoSalidaResponse
} from 'src/app/services/rol/reportes-empleados.service';


/* ============================================================
   FORMATO DE FECHA ANGULAR MATERIAL

   Pantalla:
   27/08/2026

   Backend:
   2026-08-27
============================================================ */

export const FORMATO_FECHA_EC: MatDateFormats = {

  parse: {
    dateInput: null
  },

  display: {

    dateInput: {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    },

    monthYearLabel: {
      year: 'numeric',
      month: 'long'
    },

    dateA11yLabel: {
      year: 'numeric',
      month: 'long',
      day: '2-digit'
    },

    monthYearA11yLabel: {
      year: 'numeric',
      month: 'long'
    }

  }

};


@Component({

  selector: 'app-reporte-entrada-salidas',

  templateUrl:
    './reporte-entrada-salidas.component.html',

  styleUrls: [
    './reporte-entrada-salidas.component.css'
  ],

  providers: [

    {
      provide: MAT_DATE_LOCALE,
      useValue: 'es-EC'
    },

    {
      provide: MAT_DATE_FORMATS,
      useValue: FORMATO_FECHA_EC
    }

  ]

})
export class ReporteEntradaSalidasComponent
  implements OnInit {

  form!: FormGroup;

  cargando = false;


  constructor(

    private readonly fb: FormBuilder,

    private readonly reportesService:
      ReportesEmpleadosService,

    private readonly dateAdapter:
      DateAdapter<Date>

  ) {

    /*
     * Hace que Angular Material utilice
     * formato de fecha de Ecuador.
     */
    this.dateAdapter.setLocale('es-EC');

  }


  /* ============================================================
     INICIO
  ============================================================ */

  ngOnInit(): void {

    const hoy =
      new Date();


    this.form =
      this.fb.group({

        fechaInicial: [
          hoy,
          Validators.required
        ],

        fechaFinal: [
          hoy,
          Validators.required
        ],

        /*
         * 1 = Fecha de Entrada
         * 2 = Fecha de Salida
         */
        tipoFecha: [
          1,
          Validators.required
        ]

      });

  }


  /* ============================================================
     ACEPTAR
  ============================================================ */

  aceptar(): void {

    if (this.form.invalid) {

      this.form.markAllAsTouched();

      return;

    }


    const fechaInicial =
      this.form.value.fechaInicial;


    const fechaFinal =
      this.form.value.fechaFinal;


    const tipoFecha =
      Number(
        this.form.value.tipoFecha
      );


    /* ==========================================================
       CONVERTIR PARA API

       Pantalla:
       27/08/2026

       Backend:
       2026-08-27
    ========================================================== */

    const fechaDesde =
      this.formatearFechaApi(
        fechaInicial
      );


    const fechaHasta =
      this.formatearFechaApi(
        fechaFinal
      );


    if (
      !fechaDesde ||
      !fechaHasta
    ) {

      alert(
        'Las fechas ingresadas no son válidas.'
      );

      return;

    }


    /* ==========================================================
       VALIDAR RANGO

       yyyy-MM-dd permite comparación directa.
    ========================================================== */

    if (
      fechaDesde >
      fechaHasta
    ) {

      alert(
        'La fecha final debe ser mayor o igual a la fecha inicial.'
      );

      return;

    }


    this.cargando = true;


    /* ==========================================================
       CONSULTAR EMPLEADOS
    ========================================================== */

    this.reportesService
      .consultarEmpleadosIngresoSalida(

        fechaDesde,

        fechaHasta,

        tipoFecha

      )
      .subscribe({

        next: (
          empleados:
            EmpleadoIngresoSalidaResponse[]
        ) => {

          if (
            !empleados ||
            empleados.length === 0
          ) {

            this.cargando = false;

            alert(
              'No existen empleados en el rango seleccionado.'
            );

            return;

          }


          /*
           * Si existen empleados,
           * generamos el PDF.
           */

          this.generarPdf(

            fechaDesde,

            fechaHasta,

            tipoFecha

          );

        },


        error: (
          error:
            HttpErrorResponse
        ) => {

          this.cargando = false;


          console.error(
            'Error consultando empleados:',
            error
          );


          alert(
            'Ocurrió un error al consultar los empleados.'
          );

        }

      });

  }


  /* ============================================================
     GENERAR PDF
  ============================================================ */

  private generarPdf(

    fechaDesde: string,

    fechaHasta: string,

    tipoFecha: number

  ): void {

    this.reportesService
      .generarEmpleadosIngresoSalidaPdf(

        fechaDesde,

        fechaHasta,

        tipoFecha

      )
      .subscribe({

        next: (
          blob: Blob
        ) => {

          this.cargando = false;


          const url =
            window.URL.createObjectURL(
              blob
            );


          const link =
            document.createElement(
              'a'
            );


          const tipoTexto =
            tipoFecha === 1

              ? 'INGRESO'

              : 'SALIDA';


          link.href =
            url;


          link.download =
            `REPORTE_EMPLEADOS_${tipoTexto}_${fechaDesde}_${fechaHasta}.pdf`;


          document.body.appendChild(
            link
          );


          link.click();


          document.body.removeChild(
            link
          );


          window.URL.revokeObjectURL(
            url
          );

        },


        error: (
          error:
            HttpErrorResponse
        ) => {

          this.cargando = false;


          console.error(
            'Error generando PDF:',
            error
          );


          alert(
            'Ocurrió un error al generar el reporte PDF.'
          );

        }

      });

  }


  /* ============================================================
     CANCELAR
  ============================================================ */

  cancelar(): void {

    const hoy =
      new Date();


    this.form.reset({

      fechaInicial:
        hoy,

      fechaFinal:
        hoy,

      tipoFecha:
        1

    });

  }


  /* ============================================================
     FORMATO PARA BACKEND

     Puede recibir:

     Date
     27/08/2026
     2026-08-27

     Siempre devuelve:

     2026-08-27
  ============================================================ */

  private formatearFechaApi(

    valor:
      Date |
      string |
      null |
      undefined

  ): string {

    if (!valor) {

      return '';

    }


    /* ==========================================================
       DATE
    ========================================================== */

    if (
      valor instanceof Date
    ) {

      if (
        isNaN(
          valor.getTime()
        )
      ) {

        return '';

      }


      return this.convertirDateAApi(
        valor
      );

    }


    /* ==========================================================
       STRING
    ========================================================== */

    const fecha =
      String(
        valor
      ).trim();


    /* ----------------------------------------------------------
       YA VIENE yyyy-MM-dd
    ---------------------------------------------------------- */

    if (
      /^\d{4}-\d{2}-\d{2}$/
        .test(
          fecha
        )
    ) {

      const partes =
        fecha
          .split('-')
          .map(Number);


      const anio =
        partes[0];

      const mes =
        partes[1];

      const dia =
        partes[2];


      if (
        !this.fechaValida(
          anio,
          mes,
          dia
        )
      ) {

        return '';

      }


      return (
        `${anio}-` +
        `${String(mes).padStart(2, '0')}-` +
        `${String(dia).padStart(2, '0')}`
      );

    }


    /* ----------------------------------------------------------
       VIENE dd/MM/yyyy
    ---------------------------------------------------------- */

    if (
      /^\d{1,2}\/\d{1,2}\/\d{4}$/
        .test(
          fecha
        )
    ) {

      const partes =
        fecha
          .split('/')
          .map(Number);


      const dia =
        partes[0];

      const mes =
        partes[1];

      const anio =
        partes[2];


      if (
        !this.fechaValida(
          anio,
          mes,
          dia
        )
      ) {

        return '';

      }


      return (
        `${anio}-` +
        `${String(mes).padStart(2, '0')}-` +
        `${String(dia).padStart(2, '0')}`
      );

    }


    return '';

  }


  /* ============================================================
     DATE -> yyyy-MM-dd

     IMPORTANTE:
     no usamos toISOString()
     para evitar cambios de día por zona horaria.
  ============================================================ */

  private convertirDateAApi(
    fecha: Date
  ): string {

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


    return (
      `${anio}-${mes}-${dia}`
    );

  }


  /* ============================================================
     VALIDAR FECHA REAL

     Evita:
     31/04/2026
     31/02/2026
  ============================================================ */

  private fechaValida(

    anio: number,

    mes: number,

    dia: number

  ): boolean {

    const fecha =
      new Date(
        anio,
        mes - 1,
        dia
      );


    return (

      fecha.getFullYear() ===
        anio

      &&

      fecha.getMonth() ===
        mes - 1

      &&

      fecha.getDate() ===
        dia

    );

  }

}