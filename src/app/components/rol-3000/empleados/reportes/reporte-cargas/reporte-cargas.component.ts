import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import {
  CatalogoReporte,
  ReporteCargasRequest,
  ReporteCargaDetalleResponse,
  ReporteCargaResumenResponse,
  ReportesEmpleadosService
} from 'src/app/services/rol/reportes-empleados.service';

@Component({
  selector: 'app-reporte-cargas',
  templateUrl: './reporte-cargas.component.html',
  styleUrls: ['./reporte-cargas.component.css']
})
export class ReporteCargasComponent implements OnInit {

  form!: FormGroup;

  cargandoCatalogos = false;
  generandoDetalle = false;
  generandoResumen = false;

  locales: CatalogoReporte[] = [];
  cargos: CatalogoReporte[] = [];
  zonas: CatalogoReporte[] = [];
  tiposEmpleado: CatalogoReporte[] = [];

  detalleCargas: ReporteCargaDetalleResponse[] = [];
  resumenCargas: ReporteCargaResumenResponse[] = [];

  constructor(
    private readonly fb: FormBuilder,
    private readonly reportesService: ReportesEmpleadosService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.crearFormulario();
    this.cargarCatalogos();
  }

  /* ============================================================
     FORMULARIO
  ============================================================ */

  private crearFormulario(): void {
    const anioActual = new Date().getFullYear();

    this.form = this.fb.group({
      anio: [
        anioActual,
        [
          Validators.required,
          Validators.min(1900),
          Validators.max(2200)
        ]
      ],
      areaInicial: [null],
      areaFinal: [null],
      cargoInicial: [null],
      cargoFinal: [null],
      idsZonas: [[]],
      idsTiposEmpleado: [[]]
    });
  }

  /* ============================================================
     CATÁLOGOS
  ============================================================ */

  private cargarCatalogos(): void {
    if (this.cargandoCatalogos) {
      return;
    }

    this.cargandoCatalogos = true;

    forkJoin({
      locales: this.reportesService.obtenerLocales(),
      cargos: this.reportesService.obtenerCargos(),
      zonas: this.reportesService.obtenerZonas(),
      tipos: this.reportesService.obtenerTiposEmpleado()
    })
    .pipe(
      finalize(() => {
        this.cargandoCatalogos = false;
      })
    )
    .subscribe({
      next: response => {
        this.locales = Array.isArray(response.locales?.data)
          ? response.locales.data
          : [];

        this.cargos = Array.isArray(response.cargos?.data)
          ? response.cargos.data
          : [];

        this.zonas = Array.isArray(response.zonas?.data)
          ? response.zonas.data
          : [];

        this.tiposEmpleado = Array.isArray(response.tipos?.data)
          ? response.tipos.data
          : [];

        /*
         * Igual que VB:
         * todas las zonas y tipos marcados inicialmente.
         */
        this.form.patchValue({
          idsZonas: this.zonas.map(x => x.id),
          idsTiposEmpleado: this.tiposEmpleado.map(x => x.id)
        });
      },

      error: error => {
        console.error(
          'Error cargando catálogos:',
          error
        );

        this.locales = [];
        this.cargos = [];
        this.zonas = [];
        this.tiposEmpleado = [];

        this.mostrarError(
          error?.error?.message ??
          error?.message ??
          'No se pudieron cargar los catálogos.'
        );
      }
    });
  }

  /* ============================================================
     ZONAS
  ============================================================ */

  toggleZona(
    idZona: number,
    checked: boolean
  ): void {
    const actuales =
      this.obtenerArrayNumerico(
        'idsZonas'
      );

    const nuevos = checked
      ? [
          ...new Set([
            ...actuales,
            idZona
          ])
        ]
      : actuales.filter(
          x => x !== idZona
        );

    this.form.patchValue({
      idsZonas: nuevos
    });
  }

  zonaSeleccionada(
    idZona: number
  ): boolean {
    return this.obtenerArrayNumerico(
      'idsZonas'
    ).includes(
      idZona
    );
  }

  /* ============================================================
     TIPOS EMPLEADO
  ============================================================ */

  toggleTipoEmpleado(
    idTipoEmpleado: number,
    checked: boolean
  ): void {
    const actuales =
      this.obtenerArrayNumerico(
        'idsTiposEmpleado'
      );

    const nuevos = checked
      ? [
          ...new Set([
            ...actuales,
            idTipoEmpleado
          ])
        ]
      : actuales.filter(
          x => x !== idTipoEmpleado
        );

    this.form.patchValue({
      idsTiposEmpleado: nuevos
    });
  }

  tipoEmpleadoSeleccionado(
    idTipoEmpleado: number
  ): boolean {
    return this.obtenerArrayNumerico(
      'idsTiposEmpleado'
    ).includes(
      idTipoEmpleado
    );
  }

  /* ============================================================
     ACEPTAR
     GENERA LOS DOS REPORTES
  ============================================================ */

  generarDetalle(): void {
    if (!this.validarFormulario()) {
      return;
    }

    if (
      this.generandoDetalle ||
      this.generandoResumen
    ) {
      return;
    }

    const request =
      this.construirRequest();

    this.generandoDetalle = true;
    this.generandoResumen = true;

    this.detalleCargas = [];
    this.resumenCargas = [];

    /*
     * Aquí consultamos LOS DOS reportes
     * utilizando tus endpoints existentes.
     *
     * NO requiere cambios en backend.
     */
    forkJoin({
      detalle:
        this.reportesService
          .consultarCargasDetalle(request),

      resumen:
        this.reportesService
          .consultarCargasResumen(request)
    })
    .pipe(
      finalize(() => {
        this.generandoDetalle = false;
        this.generandoResumen = false;
      })
    )
    .subscribe({
      next: response => {

        const tipoDetalle =
          (response.detalle?.type ?? '')
            .trim()
            .toUpperCase();

        const tipoResumen =
          (response.resumen?.type ?? '')
            .trim()
            .toUpperCase();

        this.detalleCargas =
          response.detalle?.data ?? [];

        this.resumenCargas =
          response.resumen?.data ?? [];

        const detalleValido =
          tipoDetalle === 'SUCCESS' &&
          this.detalleCargas.length > 0;

        const resumenValido =
          tipoResumen === 'SUCCESS' &&
          this.resumenCargas.length > 0;

        if (
          !detalleValido &&
          !resumenValido
        ) {
          this.mostrarAdvertencia(
            response.detalle?.message ??
            response.resumen?.message ??
            'No existen cargas familiares para los filtros seleccionados.'
          );

          return;
        }

        /*
         * DESCARGA REPORTE DETALLE
         */
        if (detalleValido) {
          this.descargarReporteDetalle(
            this.detalleCargas,
            request.anio
          );
        }

        /*
         * DESCARGA REPORTE TOTALIZADO
         *
         * Pequeño retraso para evitar
         * que Chrome ignore la segunda descarga.
         */
        if (resumenValido) {
          setTimeout(() => {

            this.descargarReporteResumen(
              this.resumenCargas,
              request.anio
            );

          }, 600);
        }

        if (
          detalleValido &&
          resumenValido
        ) {
          this.mostrarExito(
            'Los dos reportes fueron generados correctamente.'
          );
        }
        else if (detalleValido) {
          this.mostrarAdvertencia(
            'Se generó el reporte detallado, pero no existe información para el reporte totalizado.'
          );
        }
        else {
          this.mostrarAdvertencia(
            'Se generó el reporte totalizado, pero no existe información para el reporte detallado.'
          );
        }
      },

      error: error => {
        console.error(
          'Error generando reportes de cargas:',
          error
        );

        this.detalleCargas = [];
        this.resumenCargas = [];

        this.mostrarError(
          error?.error?.message ??
          'No se pudieron generar los reportes de cargas familiares.'
        );
      }
    });
  }

  /* ============================================================
     REPORTE RESUMEN INDIVIDUAL
     POR SI CONSERVAS UN BOTÓN SEPARADO
  ============================================================ */

  generarResumen(): void {
    if (!this.validarFormulario()) {
      return;
    }

    if (
      this.generandoDetalle ||
      this.generandoResumen
    ) {
      return;
    }

    const request =
      this.construirRequest();

    this.generandoResumen = true;
    this.resumenCargas = [];

    this.reportesService
      .consultarCargasResumen(
        request
      )
      .pipe(
        finalize(() => {
          this.generandoResumen = false;
        })
      )
      .subscribe({
        next: response => {

          const tipo =
            (response?.type ?? '')
              .trim()
              .toUpperCase();

          if (tipo !== 'SUCCESS') {
            this.mostrarAdvertencia(
              response?.message ??
              'No existe información para generar el reporte totalizado.'
            );

            return;
          }

          this.resumenCargas =
            response.data ?? [];

          if (
            this.resumenCargas.length === 0
          ) {
            this.mostrarAdvertencia(
              'No existen cargas familiares para los filtros seleccionados.'
            );

            return;
          }

          this.descargarReporteResumen(
            this.resumenCargas,
            request.anio
          );

          this.mostrarExito(
            'Reporte de cargas totalizadas generado correctamente.'
          );
        },

        error: error => {
          console.error(
            'Error generando reporte totalizado:',
            error
          );

          this.resumenCargas = [];

          this.mostrarError(
            error?.error?.message ??
            'No se pudo generar el reporte totalizado.'
          );
        }
      });
  }

  /* ============================================================
     REPORTE DETALLADO
  ============================================================ */

  private descargarReporteDetalle(
    datos:
      ReporteCargaDetalleResponse[],
    anio:
      number
  ): void {

    /*
     * Agrupamos las cargas
     * por empleado.
     */
    const empleados =
      new Map<
        number,
        ReporteCargaDetalleResponse[]
      >();

    datos.forEach(item => {

      if (
        !empleados.has(
          item.idEmpleado
        )
      ) {
        empleados.set(
          item.idEmpleado,
          []
        );
      }

      empleados
        .get(
          item.idEmpleado
        )!
        .push(
          item
        );
    });

    let contenido = '';

    empleados.forEach(cargas => {

      if (
        cargas.length === 0
      ) {
        return;
      }

      const empleado =
        cargas[0];

      contenido += `
        <div class="empleado-bloque">

          <table class="datos-empleado">

            <tr>

              <td class="label">
                CODIGO
              </td>

              <td>
                ${empleado.idEmpleado}
              </td>

              <td class="label">
                CEDULA
              </td>

              <td>
                ${this.escaparHtml(
                  empleado.cedulaEmpleado
                )}
              </td>

            </tr>

            <tr>

              <td class="label">
                EMPLEADO
              </td>

              <td colspan="3">
                ${this.escaparHtml(
                  empleado.empleado
                )}
              </td>

            </tr>

          </table>

          <div class="subtitulo">
            DESCRIPCION DE PERSONAS BAJO SU AMPARO
          </div>

          <table class="tabla-cargas">

            <thead>

              <tr>

                <th>
                  NOMBRES
                </th>

                <th>
                  APELLIDOS
                </th>

                <th>
                  DIRECCION
                </th>

                <th>
                  TELEFONO
                </th>

                <th>
                  PARENTESCO
                </th>

                <th>
                  FEC.NAC
                </th>

              </tr>

            </thead>

            <tbody>

              ${cargas.map(carga => `

                <tr>

                  <td>
                    ${this.escaparHtml(
                      carga.nombreCarga
                    )}
                  </td>

                  <td>
                    ${this.escaparHtml(
                      carga.apellidoCarga
                    )}
                  </td>

                  <td>
                    ${this.escaparHtml(
                      carga.direccion ||
                      'N/D'
                    )}
                  </td>

                  <td>
                    ${this.escaparHtml(
                      carga.telefono ||
                      'S/N'
                    )}
                  </td>

                  <td>
                    ${this.escaparHtml(
                      carga.parentesco
                    )}
                  </td>

                  <td>
                    ${this.formatearFechaReporte(
                      carga.fechaNacimiento
                    )}
                  </td>

                </tr>

              `).join('')}

            </tbody>

          </table>

        </div>
      `;
    });

    const html =
      this.construirHtmlReporte(
        'REPORTE DE CARGAS FAMILIARES-EMPLEADO',
        anio,
        contenido
      );

    this.descargarHtml(
      html,

      `REPORTE_CARGAS_FAMILIARES_EMPLEADO_${anio}.html`
    );
  }

  /* ============================================================
     REPORTE TOTALIZADO
  ============================================================ */

  private descargarReporteResumen(
    datos:
      ReporteCargaResumenResponse[],
    anio:
      number
  ): void {

    const filas =
      datos
        .map(item => {

          /*
           * Mientras terminas de unificar
           * el backend soportamos:
           *
           * hijos
           * hijosMenores18
           */
          const hijos =
            (item as any).hijos ??
            (item as any).hijosMenores18 ??
            0;

          return `

            <tr>

              <td>
                ${item.idEmpleado}
              </td>

              <td>
                ${this.escaparHtml(
                  item.cedulaEmpleado
                )}
              </td>

              <td>
                ${this.escaparHtml(
                  item.empleado
                )}
              </td>

              <td class="numero">
                ${item.conyuges ?? 0}
              </td>

              <td class="numero">
                ${hijos}
              </td>

            </tr>

          `;
        })
        .join('');

    const contenido = `

      <table class="tabla-cargas tabla-resumen">

        <thead>

          <tr>

            <th>
              Codigo
            </th>

            <th>
              Cedula
            </th>

            <th>
              Nombres
            </th>

            <th>
              Conyugue
            </th>

            <th>
              Hijos
            </th>

          </tr>

        </thead>

        <tbody>

          ${filas}

        </tbody>

      </table>

    `;

    const html =
      this.construirHtmlReporte(
        'REPORTE DE CARGAS TOTALIZADAS',
        anio,
        contenido
      );

    this.descargarHtml(
      html,

      `REPORTE_CARGAS_TOTALIZADAS_${anio}.html`
    );
  }

  /* ============================================================
     PLANTILLA HTML COMÚN
  ============================================================ */

  private construirHtmlReporte(
    titulo:
      string,
    anio:
      number,
    contenido:
      string
  ): string {

    return `
      <!DOCTYPE html>

      <html lang="es">

      <head>

        <meta charset="UTF-8">

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0">

        <title>
          ${titulo}
        </title>

        <style>

          @page {
            size: A4;
            margin: 15mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            font-family:
              "Times New Roman",
              Times,
              serif;

            font-size: 11px;

            color: #000;

            margin: 25px;
          }

          .titulo {
            text-align: center;

            font-size: 18px;

            font-weight: bold;

            margin-bottom: 14px;
          }

          .periodo {
            font-size: 12px;

            font-weight: bold;

            margin-bottom: 18px;
          }

          .empleado-bloque {
            margin-bottom: 20px;

            page-break-inside: avoid;

            break-inside: avoid;
          }

          .datos-empleado {
            width: 100%;

            border-collapse: collapse;

            margin-bottom: 8px;
          }

          .datos-empleado td {
            padding: 2px 5px;
          }

          .label {
            width: 90px;

            font-weight: bold;
          }

          .subtitulo {
            margin-top: 8px;

            margin-bottom: 5px;

            font-weight: bold;
          }

          .tabla-cargas {
            width: 100%;

            border-collapse: collapse;
          }

          .tabla-cargas th {
            padding: 4px;

            border-top:
              1px solid #000;

            border-bottom:
              1px solid #000;

            text-align: left;

            font-size: 10px;

            font-weight: bold;
          }

          .tabla-cargas td {
            padding: 4px;

            vertical-align: top;

            font-size: 10px;
          }

          .numero {
            text-align: center;
          }

          .tabla-resumen th:nth-child(1),
          .tabla-resumen td:nth-child(1) {
            width: 10%;
          }

          .tabla-resumen th:nth-child(2),
          .tabla-resumen td:nth-child(2) {
            width: 20%;
          }

          .tabla-resumen th:nth-child(3),
          .tabla-resumen td:nth-child(3) {
            width: 50%;
          }

          .tabla-resumen th:nth-child(4),
          .tabla-resumen td:nth-child(4),
          .tabla-resumen th:nth-child(5),
          .tabla-resumen td:nth-child(5) {
            width: 10%;

            text-align: center;
          }

        </style>

      </head>

      <body>

        <div class="titulo">
          ${titulo}
        </div>

        <div class="periodo">
          Periodo : ${anio}
        </div>

        ${contenido}

      </body>

      </html>
    `;
  }

  /* ============================================================
     DESCARGAR ARCHIVO HTML
  ============================================================ */

  private descargarHtml(
    contenido:
      string,
    nombreArchivo:
      string
  ): void {

    const blob =
      new Blob(
        [contenido],
        {
          type:
            'text/html;charset=utf-8'
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

    /*
     * Importante:
     * evita que Chrome lo abra.
     * Lo descarga directamente.
     */
    link.style.display =
      'none';

    document.body
      .appendChild(
        link
      );

    link.click();

    document.body
      .removeChild(
        link
      );

    /*
     * No revocar inmediatamente:
     * damos tiempo al navegador
     * para iniciar la descarga.
     */
    setTimeout(() => {

      window.URL
        .revokeObjectURL(
          url
        );

    }, 2000);
  }

  /* ============================================================
     FECHAS
  ============================================================ */

  private formatearFechaReporte(
    fecha:
      string | null
  ): string {

    if (!fecha) {
      return '';
    }

    const partes =
      fecha
        .substring(
          0,
          10
        )
        .split(
          '-'
        );

    if (
      partes.length !== 3
    ) {
      return fecha;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  /* ============================================================
     ESCAPAR HTML
  ============================================================ */

  private escaparHtml(
    valor:
      string | null | undefined
  ): string {

    if (!valor) {
      return '';
    }

    return valor
      .replace(
        /&/g,
        '&amp;'
      )
      .replace(
        /</g,
        '&lt;'
      )
      .replace(
        />/g,
        '&gt;'
      )
      .replace(
        /"/g,
        '&quot;'
      )
      .replace(
        /'/g,
        '&#039;'
      );
  }

  /* ============================================================
     CANCELAR
  ============================================================ */

  cancelar(): void {
    if (
      this.generandoDetalle ||
      this.generandoResumen
    ) {
      return;
    }

    this.form.reset({
      anio:
        new Date()
          .getFullYear(),

      areaInicial:
        null,

      areaFinal:
        null,

      cargoInicial:
        null,

      cargoFinal:
        null,

      idsZonas:
        this.zonas.map(
          x => x.id
        ),

      idsTiposEmpleado:
        this.tiposEmpleado.map(
          x => x.id
        )
    });

    this.detalleCargas = [];
    this.resumenCargas = [];
  }

  /* ============================================================
     VALIDACIÓN
  ============================================================ */

  private validarFormulario():
    boolean {

    if (
      this.form.invalid
    ) {
      this.form
        .markAllAsTouched();

      this.mostrarAdvertencia(
        'Debe ingresar un año válido.'
      );

      return false;
    }

    const localDesde =
      this.convertirNumeroNullable(
        this.form.get(
          'areaInicial'
        )?.value
      );

    const localHasta =
      this.convertirNumeroNullable(
        this.form.get(
          'areaFinal'
        )?.value
      );

    if (
      localDesde !== null &&
      localHasta !== null &&
      localDesde >
        localHasta
    ) {
      this.mostrarAdvertencia(
        'El Área Inicial no puede ser mayor al Área Final.'
      );

      return false;
    }

    const cargoDesde =
      this.convertirNumeroNullable(
        this.form.get(
          'cargoInicial'
        )?.value
      );

    const cargoHasta =
      this.convertirNumeroNullable(
        this.form.get(
          'cargoFinal'
        )?.value
      );

    if (
      cargoDesde !== null &&
      cargoHasta !== null &&
      cargoDesde >
        cargoHasta
    ) {
      this.mostrarAdvertencia(
        'El Cargo Inicial no puede ser mayor al Cargo Final.'
      );

      return false;
    }

    if (
      this.obtenerArrayNumerico(
        'idsZonas'
      ).length === 0
    ) {
      this.mostrarAdvertencia(
        'Debe seleccionar al menos una zona.'
      );

      return false;
    }

    if (
      this.obtenerArrayNumerico(
        'idsTiposEmpleado'
      ).length === 0
    ) {
      this.mostrarAdvertencia(
        'Debe seleccionar al menos un tipo de empleado.'
      );

      return false;
    }

    return true;
  }

  /* ============================================================
     REQUEST
  ============================================================ */

  private construirRequest():
    ReporteCargasRequest {

    const raw =
      this.form
        .getRawValue();

    return {
      anio:
        Number(
          raw.anio
        ),

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

      idTiposEmpleado:
        this.obtenerArrayNumerico(
          'idsTiposEmpleado'
        )
    };
  }

  private obtenerArrayNumerico(
    control:
      string
  ): number[] {

    const valor =
      this.form
        .get(
          control
        )
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
        x => Number(x)
      )
      .filter(
        x =>
          !Number.isNaN(x)
      );
  }

  private convertirNumeroNullable(
    valor:
      any
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

    return Number.isNaN(
      numero
    )
      ? null
      : numero;
  }

  /* ============================================================
     MENSAJES
  ============================================================ */

  private mostrarExito(
    mensaje:
      string
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
    mensaje:
      string
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
    mensaje:
      string
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