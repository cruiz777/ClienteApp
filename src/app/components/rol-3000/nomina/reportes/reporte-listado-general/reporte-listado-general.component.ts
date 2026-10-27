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
  forkJoin,
  of
} from 'rxjs';

import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize
} from 'rxjs/operators';

import {
  ReportesEmpleadosService
} from 'src/app/services/rol/reportes-empleados.service';

import {
  EmpleadoFichaService,
  EmpleadoBusquedaResponse
} from 'src/app/services/rol/empleado-ficha.service';

import {
  DepartamentosService
} from 'src/app/services/departamentos.service';

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

  // =============================================================
  // FORMULARIO
  // =============================================================

  form!: FormGroup;


  // =============================================================
  // ESTADOS
  // =============================================================

  cargandoCatalogos = false;

  cargandoEmpleados = false;

  generando = false;


  // =============================================================
  // EMPRESA
  //
  // TEMPORAL:
  // después reemplazar por empresa de sesión.
  // =============================================================

  idEmpresa = 1;


  // =============================================================
  // CATÁLOGOS
  // =============================================================

  locales: OpcionFiltro[] = [];

  departamentos: OpcionFiltro[] = [];

  empleadosFiltrados: EmpleadoBusquedaResponse[] = [];


  // =============================================================
  // CONSTRUCTOR
  // =============================================================

  constructor(
    private readonly fb: FormBuilder,

    private readonly reporteNominaService:
      ReporteNominaService,

    private readonly reportesEmpleadosService:
      ReportesEmpleadosService,

    private readonly departamentosService:
      DepartamentosService,

    private readonly empleadoFichaService:
      EmpleadoFichaService
  ) {}


  // =============================================================
  // INIT
  // =============================================================

  ngOnInit(): void {

    this.crearFormulario();

    this.configurarEventos();

    this.cargarCatalogos();
  }


  // =============================================================
  // FORMULARIO
  // =============================================================

  private crearFormulario(): void {

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


        // =======================================================
        // EMPLEADO
        // =======================================================

        empleadoBusqueda: [
          ''
        ],

        idEmpleado: [
          null
        ],


        // =======================================================
        // RANGO ÁREA / DEPARTAMENTO
        // =======================================================

        idInicial: [
          null
        ],

        idFinal: [
          null
        ],


        // =======================================================
        // TIPO LISTADO
        // =======================================================

        tipoListado: [
          'areas',
          Validators.required
        ]

      });
  }


  // =============================================================
  // EVENTOS
  // =============================================================

  private configurarEventos(): void {

    // ===========================================================
    // CAMBIAR ENTRE ÁREAS Y DEPARTAMENTOS
    // ===========================================================

    this.form
      .get('tipoListado')
      ?.valueChanges
      .subscribe(() => {

        this.form.patchValue(
          {
            idInicial: null,
            idFinal: null
          },
          {
            emitEvent: false
          }
        );

      });


    // ===========================================================
    // BUSCADOR DE EMPLEADOS
    // ===========================================================

    this.form
      .get('empleadoBusqueda')
      ?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(valor => {

        // =======================================================
        // Si Angular colocó el objeto seleccionado,
        // no volver a ejecutar la búsqueda.
        // =======================================================

        if (
          valor
          &&
          typeof valor === 'object'
        ) {
          return;
        }


        // =======================================================
        // Si escribe nuevamente se elimina el empleado anterior.
        // =======================================================

        this.form.patchValue(
          {
            idEmpleado: null
          },
          {
            emitEvent: false
          }
        );


        this.buscarEmpleados(
          valor ?? ''
        );

      });
  }


  // =============================================================
  // CARGAR LOCALES Y DEPARTAMENTOS
  // =============================================================

  private cargarCatalogos(): void {

    if (this.cargandoCatalogos) {
      return;
    }


    this.cargandoCatalogos =
      true;


    forkJoin({

      // =========================================================
      // LOCALES
      // =========================================================

      locales:
        this.reportesEmpleadosService
          .obtenerLocales()
          .pipe(

            catchError(
              (
                error:
                  HttpErrorResponse
              ) => {

                console.error(
                  'ERROR CARGANDO LOCALES:',
                  error
                );

                return of(null);
              }
            )

          ),


      // =========================================================
      // DEPARTAMENTOS
      // =========================================================

      departamentos:
        this.departamentosService
          .getDepartamentos()
          .pipe(

            catchError(
              (
                error:
                  HttpErrorResponse
              ) => {

                console.error(
                  'ERROR CARGANDO DEPARTAMENTOS:',
                  error
                );

                return of(null);
              }
            )

          )

    })

      .pipe(

        finalize(() => {

          this.cargandoCatalogos =
            false;

        })

      )

      .subscribe({

        next: response => {

          // =====================================================
          // LOCALES
          // =====================================================

          const respuestaLocales:
            any =
              response.locales;


          const localesData:
            any[] =

            Array.isArray(
              respuestaLocales
            )
              ?
              respuestaLocales

              :

              Array.isArray(
                respuestaLocales?.data
              )
                ?
                respuestaLocales.data

                :
                [];


          this.locales =
            localesData

              .filter(
                x =>
                  x.estado !== false
              )

              .map(
                x => ({

                  id:
                    Number(
                      x.id
                      ??
                      x.idLocal
                      ??
                      x.id_local
                    ),

                  nombre:
                    (
                      x.nombre
                      ??
                      x.nomloc
                      ??
                      x.descripcion
                      ??
                      ''
                    )
                      .toString()
                      .trim()

                })
              )

              .filter(
                x =>
                  x.id > 0
                  &&
                  x.nombre !== ''
              )

              .sort(
                (a, b) =>
                  a.nombre.localeCompare(
                    b.nombre
                  )
              );


          // =====================================================
          // DEPARTAMENTOS
          // =====================================================

          const respuestaDepartamentos:
            any =
              response.departamentos;


          const departamentosData:
            any[] =

            Array.isArray(
              respuestaDepartamentos
            )
              ?
              respuestaDepartamentos

              :

              Array.isArray(
                respuestaDepartamentos?.data
              )
                ?
                respuestaDepartamentos.data

                :
                [];


          this.departamentos =
            departamentosData

              .filter(
                x =>
                  x.estado !== false
              )

              .map(
                x => ({

                  id:
                    Number(
                      x.idDepartamento
                      ??
                      x.id_departamento
                      ??
                      x.id
                    ),

                  nombre:
                    (
                      x.nombre
                      ??
                      ''
                    )
                      .toString()
                      .trim()

                })
              )

              .filter(
                x =>
                  x.id > 0
                  &&
                  x.nombre !== ''
              )

              .sort(
                (a, b) =>
                  a.nombre.localeCompare(
                    b.nombre
                  )
              );


          console.log(
            'LOCALES:',
            this.locales
          );

          console.log(
            'DEPARTAMENTOS:',
            this.departamentos
          );

        }

      });
  }


  // =============================================================
  // BUSCAR EMPLEADOS
  //
  // MISMO SERVICIO UTILIZADO EN GASTOS PERSONALES.
  // =============================================================

  buscarEmpleados(
    texto: string = ''
  ): void {

    if (this.cargandoEmpleados) {
      return;
    }


    this.cargandoEmpleados =
      true;


    this.empleadoFichaService
      .getBusqueda(
        texto ?? ''
      )

      .pipe(

        finalize(() => {

          this.cargandoEmpleados =
            false;

        })

      )

      .subscribe({

        next: resp => {

          this.empleadosFiltrados =
            resp.data ?? [];

        },


        error: (
          error:
            HttpErrorResponse
        ) => {

          console.error(
            'ERROR BUSCANDO EMPLEADOS:',
            error
          );


          this.empleadosFiltrados =
            [];

        }

      });
  }


  // =============================================================
  // AL ABRIR EL CAMPO EMPLEADO
  //
  // Trae los empleados aunque todavía no escriba.
  // =============================================================

  abrirBusquedaEmpleado(): void {

    const valor =
      this.form
        .get('empleadoBusqueda')
        ?.value;


    if (
      !valor
      ||
      typeof valor === 'string'
    ) {

      this.buscarEmpleados(
        typeof valor === 'string'
          ? valor
          : ''
      );

    }
  }


  // =============================================================
  // SELECCIONAR EMPLEADO
  // =============================================================

  seleccionarEmpleadoBusqueda(
    empleado:
      EmpleadoBusquedaResponse
  ): void {

    if (!empleado) {
      return;
    }


    this.form.patchValue(
      {

        idEmpleado:
          Number(
            empleado.idEmpleado
          ),

        empleadoBusqueda:
          empleado

      },
      {
        emitEvent: false
      }
    );
  }


  // =============================================================
  // DISPLAY AUTOCOMPLETE
  // =============================================================

  displayEmpleado(
    empleado:
      EmpleadoBusquedaResponse
      |
      string
      |
      null
      |
      undefined
  ): string {

    if (!empleado) {
      return '';
    }


    if (
      typeof empleado === 'string'
    ) {
      return empleado;
    }


    return (
      empleado.nombreCompleto
      ??
      ''
    );
  }


  // =============================================================
  // LIMPIAR EMPLEADO
  // =============================================================

  limpiarBusquedaEmpleado(
    event?: MouseEvent
  ): void {

    if (event) {

      event.preventDefault();

      event.stopPropagation();
    }


    this.form.patchValue(
      {

        empleadoBusqueda:
          '',

        idEmpleado:
          null

      },
      {
        emitEvent: false
      }
    );


    this.empleadosFiltrados =
      [];
  }


  // =============================================================
  // OPCIONES DEL COMBO
  // =============================================================

  get opcionesFiltro():
    OpcionFiltro[] {

    if (this.esDepartamentos) {

      return this.departamentos;
    }


    return this.locales;
  }


  // =============================================================
  // ES DEPARTAMENTO
  // =============================================================

  get esDepartamentos():
    boolean {

    return (
      this.form
        ?.get('tipoListado')
        ?.value
      ===
      'departamentos'
    );
  }


  // =============================================================
  // LABEL INICIAL
  // =============================================================

  get labelInicial():
    string {

    return this.esDepartamentos

      ?
      'Departamento Inicial'

      :
      'Área Inicial';
  }


  // =============================================================
  // LABEL FINAL
  // =============================================================

  get labelFinal():
    string {

    return this.esDepartamentos

      ?
      'Departamento Final'

      :
      'Área Final';
  }


  // =============================================================
  // ACEPTAR
  // =============================================================

  aceptar(): void {

    if (this.form.invalid) {

      this.form.markAllAsTouched();

      return;
    }


    const raw =
      this.form.getRawValue();


    // ===========================================================
    // VALIDAR FECHAS
    // ===========================================================

    if (
      !raw.periodoInicial
      ||
      !raw.periodoFinal
    ) {

      alert(
        'Debe seleccionar el período inicial y final.'
      );

      return;
    }


    if (
      raw.periodoInicial
      >
      raw.periodoFinal
    ) {

      alert(
        'El período inicial no puede ser mayor al período final.'
      );

      return;
    }


    // ===========================================================
    // VALIDAR RANGO
    // ===========================================================

    if (
      raw.idInicial !== null
      &&
      raw.idInicial !== undefined
      &&
      raw.idFinal !== null
      &&
      raw.idFinal !== undefined
      &&
      Number(
        raw.idInicial
      )
      >
      Number(
        raw.idFinal
      )
    ) {

      alert(
        this.esDepartamentos

          ?
          'El Departamento Inicial no puede ser mayor al Departamento Final.'

          :
          'El Área Inicial no puede ser mayor al Área Final.'
      );

      return;
    }


    // ===========================================================
    // REQUEST
    // ===========================================================

    const query:
      ReporteListadoGeneralQuery =
      {

        idEmpresa:
          this.idEmpresa,

        periodoInicial:
          raw.periodoInicial,

        periodoFinal:
          raw.periodoFinal,

        tipoListado:
          this.esDepartamentos

            ?
            'DEPARTAMENTOS'

            :
            'AREAS',

        idInicial:
          raw.idInicial
          ??
          null,

        idFinal:
          raw.idFinal
          ??
          null,

        idEmpleado:
          raw.idEmpleado
          ??
          null

      };


    console.log(
      'REQUEST LISTADO GENERAL:',
      query
    );


    // ===========================================================
    // GENERAR
    // ===========================================================

    this.generando =
      true;


    forkJoin({

      // =========================================================
      // REPORTE RESUMEN
      // =========================================================

      resumen:
        this.reporteNominaService
          .generarResumenPdf(
            query
          ),


      // =========================================================
      // REPORTE DETALLE
      // =========================================================

      detalle:
        this.reporteNominaService
          .generarDetallePdf(
            query
          )

    })

      .pipe(

        finalize(() => {

          this.generando =
            false;

        })

      )

      .subscribe({

        next: response => {

          // =====================================================
          // RESUMEN GENERAL
          // =====================================================

          this.descargarArchivo(
            response.resumen,

            `Resumen_General_Nomina_` +
            `${raw.periodoInicial}_` +
            `${raw.periodoFinal}.pdf`
          );


          // =====================================================
          // DETALLE
          // =====================================================

          this.descargarArchivo(
            response.detalle,

            `Listado_General_Nomina_` +
            `${raw.periodoInicial}_` +
            `${raw.periodoFinal}.pdf`
          );

        },


        error: (
          error:
            HttpErrorResponse
        ) => {

          console.error(
            'ERROR GENERANDO LISTADO GENERAL:',
            error
          );


          this.mostrarErrorBlob(
            error
          );

        }

      });
  }


  // =============================================================
  // DESCARGAR PDF
  // =============================================================

  private descargarArchivo(
    archivo: Blob,
    nombre: string
  ): void {

    if (
      !archivo
      ||
      archivo.size === 0
    ) {

      console.warn(
        'El archivo generado está vacío.'
      );

      return;
    }


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
      nombre;


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
  // ERROR BLOB
  // =============================================================

  private mostrarErrorBlob(
    error:
      HttpErrorResponse
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
              'No se pudo generar el reporte.'
            );

          }
          catch {

            alert(
              'No se pudo generar el reporte.'
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
      'No se pudo generar el reporte.'
    );
  }


  // =============================================================
  // CANCELAR
  // =============================================================

  cancelar(): void {

    this.form.reset(
      {

        periodoInicial:
          '',

        periodoFinal:
          '',

        empleadoBusqueda:
          '',

        idEmpleado:
          null,

        idInicial:
          null,

        idFinal:
          null,

        tipoListado:
          'areas'

      }
    );


    this.empleadosFiltrados =
      [];
  }
}