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
  MatSnackBar
} from '@angular/material/snack-bar';

import {
  AgrupacionReporte,
  CatalogoReporte,
  ReporteEmpleadoResponse,
  ReporteEmpleadosRequest,
  ReportesEmpleadosService
} from 'src/app/services/rol/reportes-empleados.service';


@Component({
  selector: 'app-reporte-empleados',

  templateUrl:
    './reporte-empleados.component.html',

  styleUrls: [
    './reporte-empleados.component.css'
  ]
})
export class ReporteEmpleadosComponent
  implements OnInit {

  form!: FormGroup;

  generando = false;
  cargandoCatalogos = false;


  empleadosReporte:
    ReporteEmpleadoResponse[] = [];


  locales:
    CatalogoReporte[] = [];

  cargos:
    CatalogoReporte[] = [];

  zonas:
    CatalogoReporte[] = [];

  tiposEmpleado:
    CatalogoReporte[] = [];


  agrupaciones: Array<{
    codigo: AgrupacionReporte;
    nombre: string;
  }> = [

    {
      codigo: 'ZONA',
      nombre: 'Zonas'
    },

    {
      codigo: 'DEPARTAMENTO',
      nombre: 'Dptos.'
    },

    {
      codigo: 'CARGO',
      nombre: 'Cargos'
    },

    {
      codigo: 'TIPO_EMPLEADO',
      nombre: 'Tipo de Empleados'
    },

    {
      codigo: 'RANGO_ANIOS',
      nombre: 'Rango Años'
    },

    {
      codigo: 'ENTRADA_SALIDA',
      nombre: 'Ent/Sal'
    }

  ];


  constructor(
    private readonly fb:
      FormBuilder,

    private readonly reportesEmpleadosService:
      ReportesEmpleadosService,

    private readonly snackBar:
      MatSnackBar
  ) {}


  ngOnInit(): void {

    this.crearFormulario();

    this.cargarCatalogos();
  }


  private crearFormulario():
    void {

    this.form =
      this.fb.group({

        areaInicial: [
          null
        ],

        areaFinal: [
          null
        ],

        cargoInicial: [
          null
        ],

        cargoFinal: [
          null
        ],

        agrupadoPor: [
          'DEPARTAMENTO',
          Validators.required
        ],

        idsZonas: [
          []
        ],

        idsTiposEmpleado: [
          []
        ]

      });
  }


  private cargarCatalogos():
    void {

    this.cargandoCatalogos =
      true;

    let pendientes =
      4;


    const finalizar = () => {

      pendientes--;

      if (
        pendientes <= 0
      ) {

        this.cargandoCatalogos =
          false;
      }
    };


    // =========================================================
    // LOCALES
    // =========================================================

    this.reportesEmpleadosService
      .obtenerLocales()
      .subscribe({

        next: response => {

          this.locales =
            response.data ?? [];

          finalizar();
        },

        error: error => {

          console.error(
            'Error cargando locales:',
            error
          );

          this.locales =
            [];

          finalizar();
        }

      });


    // =========================================================
    // CARGOS
    // =========================================================

    this.reportesEmpleadosService
      .obtenerCargos()
      .subscribe({

        next: response => {

          this.cargos =
            response.data ?? [];

          finalizar();
        },

        error: error => {

          console.error(
            'Error cargando cargos:',
            error
          );

          this.cargos =
            [];

          finalizar();
        }

      });


    // =========================================================
    // ZONAS
    // =========================================================

    this.reportesEmpleadosService
      .obtenerZonas()
      .subscribe({

        next: response => {

          this.zonas =
            response.data ?? [];

          /*
           * Si quieres que inicialmente
           * estén todas seleccionadas:
           */
          this.form.patchValue({
            idsZonas:
              this.zonas.map(
                x => x.id
              )
          });

          finalizar();
        },

        error: error => {

          console.error(
            'Error cargando zonas:',
            error
          );

          this.zonas =
            [];

          finalizar();
        }

      });


    // =========================================================
    // TIPOS EMPLEADO
    // =========================================================

    this.reportesEmpleadosService
      .obtenerTiposEmpleado()
      .subscribe({

        next: response => {

          this.tiposEmpleado =
            response.data ?? [];

          /*
           * Comportamiento similar
           * al sistema anterior:
           * inicialmente todos seleccionados.
           */
          this.form.patchValue({
            idsTiposEmpleado:
              this.tiposEmpleado.map(
                x => x.id
              )
          });

          finalizar();
        },

        error: error => {

          console.error(
            'Error cargando tipos de empleado:',
            error
          );

          this.tiposEmpleado =
            [];

          finalizar();
        }

      });

  }


aceptar(): void {

  if (this.form.invalid) {

    this.form.markAllAsTouched();

    this.mostrarAdvertencia(
      'Debe completar los datos requeridos.'
    );

    return;
  }


  if (!this.validarRangos()) {
    return;
  }


  if (this.generando) {
    return;
  }


  const request =
    this.construirRequest();


  console.log(
    'Request reporte empleados PDF:',
    request
  );


  this.generando = true;


  this.reportesEmpleadosService
    .generarReporteEmpleadosPdf(
      request
    )
    .subscribe({

      next: (blob: Blob) => {

        this.generando = false;


        if (
          !blob ||
          blob.size === 0
        ) {

          this.mostrarAdvertencia(
            'El reporte generado está vacío.'
          );

          return;
        }


        this.abrirPdf(
          blob
        );

      },


      error: (error: any) => {

        this.generando = false;


        console.error(
          'Error generando reporte PDF:',
          error
        );


        this.mostrarError(
          'No se pudo generar el reporte de empleados.'
        );

      }

    });
}

  cancelar():
    void {

    if (
      this.generando
    ) {

      return;
    }


    this.form.reset({

      areaInicial:
        null,

      areaFinal:
        null,

      cargoInicial:
        null,

      cargoFinal:
        null,

      agrupadoPor:
        'DEPARTAMENTO',

      idsZonas:
        this.zonas.map(
          x => x.id
        ),

      idsTiposEmpleado:
        this.tiposEmpleado.map(
          x => x.id
        )

    });


    this.empleadosReporte =
      [];
  }


  toggleZona(
    idZona: number,
    checked: boolean
  ): void {

    const actuales =
      this.obtenerArrayNumerico(
        'idsZonas'
      );


    let nuevos:
      number[];


    if (
      checked
    ) {

      nuevos = [
        ...new Set([
          ...actuales,
          idZona
        ])
      ];

    }
    else {

      nuevos =
        actuales.filter(
          x =>
            x !== idZona
        );
    }


    this.form.patchValue({

      idsZonas:
        nuevos

    });
  }


  zonaSeleccionada(
    idZona: number
  ): boolean {

    return this
      .obtenerArrayNumerico(
        'idsZonas'
      )
      .includes(
        idZona
      );
  }


  toggleTipoEmpleado(
    idTipoEmpleado: number,
    checked: boolean
  ): void {

    const actuales =
      this.obtenerArrayNumerico(
        'idsTiposEmpleado'
      );


    let nuevos:
      number[];


    if (
      checked
    ) {

      nuevos = [
        ...new Set([
          ...actuales,
          idTipoEmpleado
        ])
      ];

    }
    else {

      nuevos =
        actuales.filter(
          x =>
            x !== idTipoEmpleado
        );
    }


    this.form.patchValue({

      idsTiposEmpleado:
        nuevos

    });
  }


  tipoEmpleadoSeleccionado(
    idTipoEmpleado: number
  ): boolean {

    return this
      .obtenerArrayNumerico(
        'idsTiposEmpleado'
      )
      .includes(
        idTipoEmpleado
      );
  }


  private construirRequest():
    ReporteEmpleadosRequest {

    const raw =
      this.form
        .getRawValue();


    return {

      /*
       * Si luego manejas empresa
       * desde sesión, reemplaza null
       * por el IdEmpresa real.
       */
      idEmpresa:
        null,


      idLocalDesde:
        this.convertirNumeroNullable(
          raw.areaInicial
        ),


      idLocalHasta:
        this.convertirNumeroNullable(
          raw.areaFinal
        ),


      idCargoDesde:
        this.convertirNumeroNullable(
          raw.cargoInicial
        ),


      idCargoHasta:
        this.convertirNumeroNullable(
          raw.cargoFinal
        ),


      idsZonas:
        this.obtenerArrayNumerico(
          'idsZonas'
        ),


      idsTiposEmpleado:
        this.obtenerArrayNumerico(
          'idsTiposEmpleado'
        ),


      agrupadoPor:
        raw.agrupadoPor as
          AgrupacionReporte

    };
  }


  private validarRangos():
    boolean {

    // =========================================================
    // LOCAL
    // =========================================================

    const localDesde =
      this.convertirNumeroNullable(

        this.form
          .get('areaInicial')
          ?.value

      );


    const localHasta =
      this.convertirNumeroNullable(

        this.form
          .get('areaFinal')
          ?.value

      );


    if (
      localDesde !== null &&
      localHasta !== null &&
      localDesde > localHasta
    ) {

      this.mostrarAdvertencia(
        'El Área Inicial no puede ser mayor al Área Final.'
      );


      return false;
    }


    // =========================================================
    // CARGO
    // =========================================================

    const cargoDesde =
      this.convertirNumeroNullable(

        this.form
          .get('cargoInicial')
          ?.value

      );


    const cargoHasta =
      this.convertirNumeroNullable(

        this.form
          .get('cargoFinal')
          ?.value

      );


    if (
      cargoDesde !== null &&
      cargoHasta !== null &&
      cargoDesde > cargoHasta
    ) {

      this.mostrarAdvertencia(
        'El Cargo Inicial no puede ser mayor al Cargo Final.'
      );


      return false;
    }


    return true;
  }


  private obtenerArrayNumerico(
    control: string
  ): number[] {

    const valor =
      this.form
        .get(control)
        ?.value;


    if (
      !Array.isArray(
        valor
      )
    ) {

      return [];
    }


    return valor
      .map(
        x =>
          Number(x)
      )
      .filter(
        x =>
          !Number.isNaN(
            x
          )
      );
  }


  private convertirNumeroNullable(
    valor: any
  ): number | null {

    if (
      valor === null ||
      valor === undefined ||
      valor === ''
    ) {

      return null;
    }


    const numero =
      Number(
        valor
      );


    if (
      Number.isNaN(
        numero
      )
    ) {

      return null;
    }


    return numero;
  }


  private obtenerMensajeError(
    error: any
  ): string {

    if (
      error?.error?.message
    ) {

      return error.error.message;
    }


    if (
      error?.error?.title
    ) {

      return error.error.title;
    }


    if (
      error?.message
    ) {

      return error.message;
    }


    return (
      'No se pudo consultar el reporte de empleados.'
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
          5000,

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

  private abrirPdf(
  blob: Blob
): void {

  const url =
    window.URL.createObjectURL(
      blob
    );


  const ventana =
    window.open(
      url,
      '_blank'
    );


  if (!ventana) {

    const link =
      document.createElement(
        'a'
      );

    link.href =
      url;

    link.download =
      this.construirNombreReporte();

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );
  }


  setTimeout(() => {

    window.URL.revokeObjectURL(
      url
    );

  }, 30000);
}
private construirNombreReporte():
  string {

  const agrupadoPor =
    this.form
      .get('agrupadoPor')
      ?.value
      ?? 'EMPLEADOS';


  return (
    `REPORTE_EMPLEADOS_${agrupadoPor}.pdf`
  );
}
}