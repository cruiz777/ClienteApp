import {
  Component,
  OnInit
} from '@angular/core';

import {
  FormBuilder,
  FormGroup
} from '@angular/forms';

import {
  HttpErrorResponse
} from '@angular/common/http';

import {
  ReportesEmpleadosService
} from 'src/app/services/rol/reportes-empleados.service';


@Component({

  selector: 'app-personas-discapacidad',

  templateUrl:
    './personas-discapacidad.component.html',

  styleUrls: [
    './personas-discapacidad.component.css'
  ]

})
export class PersonasDiscapacidadComponent
  implements OnInit {

  form!: FormGroup;

  cargando = false;


  constructor(

    private readonly fb:
      FormBuilder,

    private readonly reportesService:
      ReportesEmpleadosService

  ) {}


  ngOnInit(): void {

    this.form =
      this.fb.group({

        activos: [
          true
        ],

        exEmpleados: [
          false
        ]

      });

  }


  // ============================================================
  // ACEPTAR
  // ============================================================

  aceptar(): void {

    const activos =
      Boolean(
        this.form.value.activos
      );

    const exEmpleados =
      Boolean(
        this.form.value.exEmpleados
      );


    // Igual que el VB6:
    // debe existir al menos una selección.

    if (
      !activos &&
      !exEmpleados
    ) {

      alert(
        'Debe seleccionar al menos un ítem.'
      );

      return;

    }


    this.generarPdf(
      activos,
      exEmpleados
    );

  }


  // ============================================================
  // GENERAR PDF
  // ============================================================

  private generarPdf(

    activos: boolean,

    exEmpleados: boolean

  ): void {

    this.cargando = true;


    this.reportesService
      .generarEmpleadosDiscapacidadPdf(

        activos,

        exEmpleados

      )
      .subscribe({

        next: (
          blob: Blob
        ) => {

          this.cargando = false;


          const url =
            window.URL
              .createObjectURL(
                blob
              );


          const link =
            document.createElement(
              'a'
            );


          let tipoReporte =
            'TODOS';


          if (
            activos &&
            !exEmpleados
          ) {

            tipoReporte =
              'ACTIVOS';

          }
          else if (
            !activos &&
            exEmpleados
          ) {

            tipoReporte =
              'EXEMPLEADOS';

          }


          link.href =
            url;


          link.download =
            `REPORTE_PERSONAS_DISCAPACIDAD_${tipoReporte}.pdf`;


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

        },


        error: (
          error:
            HttpErrorResponse
        ) => {

          this.cargando = false;


          console.error(
            'Error generando reporte de discapacidad:',
            error
          );


          if (
            error.status === 404
          ) {

            alert(
              'No existen empleados con discapacidad para los filtros seleccionados.'
            );

            return;

          }


          alert(
            'Ocurrió un error al generar el reporte.'
          );

        }

      });

  }


  // ============================================================
  // CANCELAR
  // ============================================================

  cancelar(): void {

    this.form.reset({

      activos:
        true,

      exEmpleados:
        false

    });

  }

}