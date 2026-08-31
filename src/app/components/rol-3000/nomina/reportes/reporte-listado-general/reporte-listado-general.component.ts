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
  HttpErrorResponse
} from '@angular/common/http';

import {
  forkJoin
} from 'rxjs';

import {
  ReporteNominaService,
  ReporteListadoGeneralQuery
} from 'src/app/services/rol/reporte-nomina.service';


interface OpcionFiltro {
  id: number;
  nombre: string;
}


@Component({
  selector: 'app-reporte-listado-general',
  templateUrl: './reporte-listado-general.component.html',
  styleUrls: ['./reporte-listado-general.component.css']
})
export class ReporteListadoGeneralComponent
  implements OnInit {

  form!: FormGroup;

  generando = false;


  // =============================================================
  // EMPRESA
  //
  // TEMPORAL.
  // Luego debe obtenerse de la sesión.
  // =============================================================

  idEmpresa = 1;


  // =============================================================
  // AREAS / LOCALES
  //
  // Estos son ejemplos.
  // Luego podemos cargarlos desde el backend.
  // =============================================================

  areas: OpcionFiltro[] = [
    {
      id: 1,
      nombre: 'Principal'
    }
  ];


  // =============================================================
  // DEPARTAMENTOS
  //
  // Según seguridades.departamentos
  // =============================================================

  departamentos: OpcionFiltro[] = [
    {
      id: 1,
      nombre: 'SISTEMAS'
    },
    {
      id: 2,
      nombre: 'CONTABILIDAD'
    },
    {
      id: 8,
      nombre: 'ADMINISTRADOR'
    },
    {
      id: 11,
      nombre: 'GERENCIA'
    },
    {
      id: 12,
      nombre: 'MARKETING'
    },
    {
      id: 13,
      nombre: 'COBRANZAS'
    },
    {
      id: 14,
      nombre: 'ESTANDARES'
    }
  ];


  constructor(
    private readonly fb: FormBuilder,
    private readonly reporteNominaService:
      ReporteNominaService
  ) { }


  ngOnInit(): void {

    this.form =
      this.fb.group({

        periodoInicial: [
          '',
          Validators.required
        ],

        periodoFinal: [
          '',
          Validators.required
        ],

        empleado: [
          ''
        ],

        areaInicial: [
          null
        ],

        areaFinal: [
          null
        ],

        tipoListado: [
          'areas',
          Validators.required
        ]

      });


    // ===========================================================
    // CAMBIO AREAS / DEPARTAMENTOS
    // ===========================================================

    this.form
      .get('tipoListado')
      ?.valueChanges
      .subscribe(() => {

        this.form.patchValue(
          {
            areaInicial: null,
            areaFinal: null
          },
          {
            emitEvent: false
          }
        );

      });
  }


  // =============================================================
  // OPCIONES SEGUN RADIO
  // =============================================================

  get opcionesFiltro(): OpcionFiltro[] {

    const tipo =
      this.form
        ?.get('tipoListado')
        ?.value;


    if (tipo === 'departamentos') {

      return this.departamentos;
    }


    return this.areas;
  }


  // =============================================================
  // LABEL INICIAL
  // =============================================================

  get labelInicial(): string {

    return this.esDepartamentos
      ? 'Departamento Inicial'
      : 'Área Inicial';
  }


  // =============================================================
  // LABEL FINAL
  // =============================================================

  get labelFinal(): string {

    return this.esDepartamentos
      ? 'Departamento Final'
      : 'Área Final';
  }


  // =============================================================
  // TIPO ACTUAL
  // =============================================================

  get esDepartamentos(): boolean {

    return (
      this.form
        ?.get('tipoListado')
        ?.value
      ===
      'departamentos'
    );
  }


  // =============================================================
  // ACEPTAR
  //
  // GENERA LOS DOS PDF.
  // =============================================================

  aceptar(): void {

    if (this.form.invalid) {

      this.form.markAllAsTouched();

      return;
    }


    const periodoInicial =
      this.form
        .get('periodoInicial')
        ?.value;

    const periodoFinal =
      this.form
        .get('periodoFinal')
        ?.value;


    if (
      !periodoInicial
      ||
      !periodoFinal
    ) {

      return;
    }


    if (
      periodoInicial >
      periodoFinal
    ) {

      alert(
        'El período final debe ser mayor o igual al período inicial.'
      );

      return;
    }


    const query =
      this.construirQuery();


    this.generando =
      true;


    // ===========================================================
    // LLAMAR LOS DOS REPORTES
    // ===========================================================

    forkJoin({

      resumen:
        this.reporteNominaService
          .generarResumenPdf(
            query
          ),

      detalle:
        this.reporteNominaService
          .generarDetallePdf(
            query
          )

    })
      .subscribe({

        next: response => {

          this.generando =
            false;


          // ===============================================
          // PDF RESUMEN
          // ===============================================

          this.descargarArchivo(
            response.resumen,
            `Resumen_General_Nomina_${periodoInicial}_${periodoFinal}.pdf`
          );


          // ===============================================
          // PDF DETALLE
          // ===============================================

          this.descargarArchivo(
            response.detalle,
            `Listado_General_Nomina_${periodoInicial}_${periodoFinal}.pdf`
          );

        },


        error: (
          error: HttpErrorResponse
        ) => {

          this.generando =
            false;

          console.error(
            'Error generando reportes:',
            error
          );


          this.mostrarError(
            error
          );
        }

      });
  }


  // =============================================================
  // CONSTRUIR REQUEST
  // =============================================================

  private construirQuery():
    ReporteListadoGeneralQuery {

    const values =
      this.form.value;


    const tipoListado:
      'AREAS' | 'DEPARTAMENTOS' =

      values.tipoListado ===
      'departamentos'

        ? 'DEPARTAMENTOS'

        : 'AREAS';


    const empleado =
      values.empleado
        ? Number(
            values.empleado
          )
        : null;


    return {

      idEmpresa:
        this.idEmpresa,

      periodoInicial:
        values.periodoInicial,

      periodoFinal:
        values.periodoFinal,

      tipoListado:
        tipoListado,

      idInicial:
        values.areaInicial
        ?? null,

      idFinal:
        values.areaFinal
        ?? null,

      idEmpleado:
        empleado
        &&
        !isNaN(empleado)

          ? empleado

          : null
    };
  }


  // =============================================================
  // DESCARGAR ARCHIVO
  // =============================================================

  private descargarArchivo(
    blob: Blob,
    nombreArchivo: string
  ): void {

    if (
      !blob
      ||
      blob.size === 0
    ) {

      console.error(
        'El archivo generado está vacío.'
      );

      return;
    }


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


  // =============================================================
  // ERROR
  //
  // Como responseType es blob, el error también puede venir
  // como Blob JSON.
  // =============================================================

  private mostrarError(
    error: HttpErrorResponse
  ): void {

    if (
      error.error
      instanceof Blob
    ) {

      const reader =
        new FileReader();


      reader.onload =
        () => {

          try {

            const respuesta =
              JSON.parse(
                reader.result as string
              );


            alert(
              respuesta.message
              ??
              'Error generando el reporte.'
            );

          }
          catch {

            alert(
              'Error generando el reporte.'
            );
          }

        };


      reader.readAsText(
        error.error
      );


      return;
    }


    alert(
      error.error?.message
      ??
      error.message
      ??
      'Error generando el reporte.'
    );
  }


  // =============================================================
  // CANCELAR
  // =============================================================

  cancelar(): void {

    this.form.reset(
      {
        periodoInicial: '',
        periodoFinal: '',
        empleado: '',
        areaInicial: null,
        areaFinal: null,
        tipoListado: 'areas'
      }
    );
  }
}