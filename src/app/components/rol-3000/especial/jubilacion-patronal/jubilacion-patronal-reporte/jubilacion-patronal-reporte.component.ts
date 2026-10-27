import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges
} from '@angular/core';

import {
  JubilacionPatronalDetalleResponse,
  JubilacionPatronalResponse
} from 'src/app/services/rol/jubilacion-patronal.service';


// ==========================================================
// PERIODO SERVICIO
// ==========================================================

interface PeriodoServicioReporte {

  fechaIngreso?: string | null;

  fechaSalida?: string | null;
}


// ==========================================================
// DATOS ADICIONALES
//
// Estos datos todavía NO forman parte del response principal.
// ==========================================================

interface ResultadoReporteAdicional {

  personaResponsableInformacion?: string;

  seAcogeJubilacionIess?: boolean | null;

  periodosServicio?: PeriodoServicioReporte[];
}


// ==========================================================
// RESUMEN ANUAL
// ==========================================================

interface ResumenAnualReporte {

  anio: number;

  sueldoAportadoIess: number;

  remuneracionTotal: number;

  fondoReserva: number;
}


// ==========================================================
// COMPONENT
// ==========================================================

@Component({
  selector: 'app-jubilacion-patronal-reporte',
  templateUrl: './jubilacion-patronal-reporte.component.html',
  styleUrls: [
    './jubilacion-patronal-reporte.component.css'
  ]
})
export class JubilacionPatronalReporteComponent
  implements OnChanges {

  // ========================================================
  // INPUT
  // ========================================================

  @Input()
  resultado!: JubilacionPatronalResponse;


  // ========================================================
  // OUTPUT
  // ========================================================

  @Output()
  cerrar =
    new EventEmitter<void>();


  // ========================================================
  // DATOS ADICIONALES
  // ========================================================

  datosAdicionales: ResultadoReporteAdicional = {

    personaResponsableInformacion: '',

    seAcogeJubilacionIess: null,

    periodosServicio: []
  };


  // ========================================================
  // AÑOS
  // ========================================================

  anios: number[] = [];


  // ========================================================
  // RESUMEN ANUAL
  // ========================================================

  resumenAnual: ResumenAnualReporte[] = [];


  // ========================================================
  // MESES
  // ========================================================

  readonly meses = [

    {
      numero: 1,
      nombre: 'ENERO'
    },

    {
      numero: 2,
      nombre: 'FEBRERO'
    },

    {
      numero: 3,
      nombre: 'MARZO'
    },

    {
      numero: 4,
      nombre: 'ABRIL'
    },

    {
      numero: 5,
      nombre: 'MAYO'
    },

    {
      numero: 6,
      nombre: 'JUNIO'
    },

    {
      numero: 7,
      nombre: 'JULIO'
    },

    {
      numero: 8,
      nombre: 'AGOSTO'
    },

    {
      numero: 9,
      nombre: 'SEPTIEMBRE'
    },

    {
      numero: 10,
      nombre: 'OCTUBRE'
    },

    {
      numero: 11,
      nombre: 'NOVIEMBRE'
    },

    {
      numero: 12,
      nombre: 'DICIEMBRE'
    }
  ];


  // ========================================================
  // ON CHANGES
  // ========================================================

  ngOnChanges(
    changes: SimpleChanges
  ): void {

    if (
      changes['resultado']
      &&
      this.resultado
    ) {

      this.construirReporte();
    }
  }


  // ========================================================
  // CONSTRUIR REPORTE
  // ========================================================

  private construirReporte():
    void {

    const detalle =
      this.resultado.detalle
      ??
      [];


    let ultimoAnio =
      new Date().getFullYear();


    // ======================================================
    // PRIORIDAD:
    //
    // 1. Fecha cálculo
    // 2. Último año del detalle
    // 3. Fecha salida
    // 4. Año actual
    // ======================================================

    if (
      this.resultado.fechaCalculo
    ) {

      const anioFechaCalculo =
        Number(
          this.resultado
            .fechaCalculo
            .substring(
              0,
              4
            )
        );


      if (
        Number.isFinite(
          anioFechaCalculo
        )
      ) {

        ultimoAnio =
          anioFechaCalculo;
      }
    }
    else if (
      detalle.length > 0
    ) {

      const aniosDetalle =
        detalle
          .map(
            item =>
              Number(
                item.anio
              )
          )
          .filter(
            anio =>
              Number.isFinite(
                anio
              )
          );


      if (
        aniosDetalle.length > 0
      ) {

        ultimoAnio =
          Math.max(
            ...aniosDetalle
          );
      }
    }
    else if (
      this.resultado.fechaSalida
    ) {

      const anioSalida =
        Number(
          this.resultado
            .fechaSalida
            .substring(
              0,
              4
            )
        );


      if (
        Number.isFinite(
          anioSalida
        )
      ) {

        ultimoAnio =
          anioSalida;
      }
    }


    // ======================================================
    // CREAR 6 AÑOS
    // ======================================================

    this.anios =
      [];


    for (
      let i = 5;
      i >= 0;
      i--
    ) {

      this.anios.push(
        ultimoAnio - i
      );
    }


    // ======================================================
    // RESUMEN ANUAL
    // ======================================================

    this.resumenAnual =
      this.anios.map(
        anio => {

          return {

            anio:
              anio,

            sueldoAportadoIess:
              this.totalAnual(
                anio,
                'sueldoAportadoIess'
              ),

            remuneracionTotal:
              this.totalAnual(
                anio,
                'remuneracion'
              ),

            fondoReserva:
              this.totalAnual(
                anio,
                'fondoReserva'
              )
          };
        }
      );


    // ======================================================
    // PERIODOS
    //
    // Por ahora tenemos únicamente el periodo principal.
    // ======================================================

    this.datosAdicionales.periodosServicio =
      [
        {
          fechaIngreso:
            this.resultado.fechaIngreso
            ??
            null,

          fechaSalida:
            this.resultado.fechaSalida
            ??
            null
        }
      ];
  }


  // ========================================================
  // OBTENER REGISTRO MES/AÑO
  // ========================================================

  private obtenerDetalle(
    anio: number,
    mes: number
  ): JubilacionPatronalDetalleResponse | undefined {

    const detalle =
      this.resultado.detalle
      ??
      [];


    return detalle.find(
      registro =>
        Number(
          registro.anio
        )
        ===
        anio
        &&
        Number(
          registro.mes
        )
        ===
        mes
    );
  }


  // ========================================================
  // REMUNERACIÓN TOTAL
  // ========================================================

  remuneracion(
    anio: number,
    mes: number
  ): number {

    const item =
      this.obtenerDetalle(
        anio,
        mes
      );


    if (!item) {
      return 0;
    }


    return Number(
      item.remuneracion
      ??
      0
    );
  }


  // ========================================================
  // REMUNERACIÓN APORTABLE
  // ========================================================

  remuneracionAportable(
    anio: number,
    mes: number
  ): number {

    const item =
      this.obtenerDetalle(
        anio,
        mes
      );


    if (!item) {
      return 0;
    }


    return Number(
      item.remuneracionAportable
      ??
      0
    );
  }


  // ========================================================
  // SUELDO APORTADO AL IESS
  //
  // Si el backend devuelve sueldoAportadoIess usamos ese
  // valor.
  //
  // Si todavía no existe, usamos temporalmente
  // remuneracionAportable.
  // ========================================================

  sueldoAportadoIess(
    anio: number,
    mes: number
  ): number {

    const item =
      this.obtenerDetalle(
        anio,
        mes
      );


    if (!item) {
      return 0;
    }


    if (
      item.sueldoAportadoIess !== undefined
      &&
      item.sueldoAportadoIess !== null
    ) {

      return Number(
        item.sueldoAportadoIess
      );
    }


    return Number(
      item.remuneracionAportable
      ??
      0
    );
  }


  // ========================================================
  // FONDO DE RESERVA
  // ========================================================

  fondoReserva(
    anio: number,
    mes: number
  ): number {

    const item =
      this.obtenerDetalle(
        anio,
        mes
      );


    if (!item) {
      return 0;
    }


    return Number(
      item.fondoReserva
      ??
      0
    );
  }


  // ========================================================
  // TOTAL ANUAL
  // ========================================================

  totalAnual(
    anio: number,
    campo:
      'remuneracion'
      |
      'remuneracionAportable'
      |
      'sueldoAportadoIess'
      |
      'fondoReserva'
  ): number {

    let total =
      0;


    for (
      const mes of this.meses
    ) {

      switch (
        campo
      ) {

        case 'remuneracion':

          total +=
            this.remuneracion(
              anio,
              mes.numero
            );

          break;


        case 'remuneracionAportable':

          total +=
            this.remuneracionAportable(
              anio,
              mes.numero
            );

          break;


        case 'sueldoAportadoIess':

          total +=
            this.sueldoAportadoIess(
              anio,
              mes.numero
            );

          break;


        case 'fondoReserva':

          total +=
            this.fondoReserva(
              anio,
              mes.numero
            );

          break;
      }
    }


    return Number(
      total.toFixed(
        2
      )
    );
  }


  // ========================================================
  // PERIODOS SERVICIO
  // ========================================================

  get periodosServicio():
    PeriodoServicioReporte[] {

    const periodos =
      this.datosAdicionales
        .periodosServicio
      ??
      [];


    if (
      periodos.length > 0
    ) {

      return periodos.slice(
        0,
        3
      );
    }


    return [
      {
        fechaIngreso:
          this.resultado
            ?.fechaIngreso
          ??
          null,

        fechaSalida:
          this.resultado
            ?.fechaSalida
          ??
          null
      }
    ];
  }


  // ========================================================
  // FORMATO NUMÉRICO
  // ========================================================

  numero(
    value:
      number
      |
      null
      |
      undefined
  ): string {

    const valor =
      Number(
        value
        ??
        0
      );


    if (
      !Number.isFinite(
        valor
      )
    ) {

      return '';
    }


    if (
      valor === 0
    ) {

      return '';
    }


    return valor.toLocaleString(
      'en-US',
      {
        minimumFractionDigits:
          2,

        maximumFractionDigits:
          2
      }
    );
  }


  // ========================================================
  // FORMATO FECHA
  // ========================================================

  fecha(
    value:
      string
      |
      null
      |
      undefined
  ): string {

    if (!value) {
      return '';
    }


    const valor =
      value.substring(
        0,
        10
      );


    const partes =
      valor.split(
        '-'
      );


    if (
      partes.length !== 3
    ) {

      return value;
    }


    return (
      `${partes[2]} / ` +
      `${partes[1]} / ` +
      `${partes[0]}`
    );
  }


  // ========================================================
  // IMPRIMIR
  // ========================================================

  imprimir():
    void {

    window.print();
  }


  // ========================================================
  // VOLVER
  // ========================================================

  volver():
    void {

    this.cerrar.emit();
  }
}