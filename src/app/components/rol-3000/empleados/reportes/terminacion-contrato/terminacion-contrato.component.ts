import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import {
  ReportesEmpleadosService,
  EmpleadoTerminacionContratoResponse
} from 'src/app/services/rol/reportes-empleados.service'; // AJUSTA ESTA RUTA

import {
  RpTipoContratoService,
  RpTipoContrato
} from 'src/app/services/rol/rp-tipo-contrato.service.service'; // AJUSTA ESTA RUTA
@Component({
  selector: 'app-terminacion-contrato',
  templateUrl: './terminacion-contrato.component.html',
  styleUrls: ['./terminacion-contrato.component.css']
})
export class TerminacionContratoComponent implements OnInit {

  form!: FormGroup;

  cargando = false;
  cargandoTiposContrato = false;

  tiposContrato: RpTipoContrato[] = [];

  meses = [
    { id: 1, nombre: 'Enero' },
    { id: 2, nombre: 'Febrero' },
    { id: 3, nombre: 'Marzo' },
    { id: 4, nombre: 'Abril' },
    { id: 5, nombre: 'Mayo' },
    { id: 6, nombre: 'Junio' },
    { id: 7, nombre: 'Julio' },
    { id: 8, nombre: 'Agosto' },
    { id: 9, nombre: 'Septiembre' },
    { id: 10, nombre: 'Octubre' },
    { id: 11, nombre: 'Noviembre' },
    { id: 12, nombre: 'Diciembre' }
  ];

  anios: number[] = [];

  constructor(
    private readonly fb: FormBuilder,
    private readonly reportesService: ReportesEmpleadosService,
    private readonly tipoContratoService: RpTipoContratoService
  ) { }

  ngOnInit(): void {

    const fechaActual = new Date();

    this.generarAnios();

    this.form = this.fb.group({
      mes: [
        fechaActual.getMonth() + 1,
        Validators.required
      ],

      anio: [
        fechaActual.getFullYear(),
        Validators.required
      ],

      idTipoContrato: [null]
    });

    this.cargarTiposContrato();
  }

  // ============================================================
  // AÑOS
  // ============================================================

  private generarAnios(): void {

    const anioActual = new Date().getFullYear();

    this.anios = [];

    // Permito también consultar el siguiente año
    for (
      let anio = anioActual + 1;
      anio >= 2000;
      anio--
    ) {
      this.anios.push(anio);
    }
  }

  // ============================================================
  // TIPOS DE CONTRATO
  // ============================================================

  cargarTiposContrato(): void {

    this.cargandoTiposContrato = true;

    this.tipoContratoService
      .getTiposContrato()
      .subscribe({

        next: response => {

          this.tiposContrato =
            response.data ?? [];

          this.cargandoTiposContrato = false;
        },

        error: (error: HttpErrorResponse) => {

          this.cargandoTiposContrato = false;

          console.error(
            'Error cargando tipos de contrato:',
            error
          );
        }

      });
  }

  // ============================================================
  // ACEPTAR
  // ============================================================

aceptar(): void {

  if (this.form.invalid) {
    this.form.markAllAsTouched();
    return;
  }

  const mes =
    Number(this.form.value.mes);

  const anio =
    Number(this.form.value.anio);

  const valorTipo =
    this.form.value.idTipoContrato;

  const idTipoContrato: number | null =
    valorTipo === null ||
    valorTipo === undefined ||
    valorTipo === ''
      ? null
      : Number(valorTipo);

  this.cargando = true;

  this.reportesService
    .consultarTerminacionContrato(
      mes,
      anio,
      idTipoContrato
    )
    .subscribe({

      next: (
        response: EmpleadoTerminacionContratoResponse[]
      ) => {

        const empleados:
          EmpleadoTerminacionContratoResponse[] =
          response ?? [];

        if (empleados.length === 0) {

          this.cargando = false;

          alert(
            'No existen empleados con terminación de contrato para el período seleccionado.'
          );

          return;
        }

        this.generarPdf(
          mes,
          anio,
          idTipoContrato
        );
      },

      error: (error: HttpErrorResponse) => {

        this.cargando = false;

        console.error(
          'Error consultando terminación de contrato:',
          error
        );

        alert(
          'Ocurrió un error al consultar las terminaciones de contrato.'
        );
      }

    });
}

  // ============================================================
  // GENERAR PDF
  // ============================================================

  private generarPdf(
    mes: number,
    anio: number,
    idTipoContrato: number | null
  ): void {

    this.reportesService
      .generarTerminacionContratoPdf(
        mes,
        anio,
        idTipoContrato
      )
      .subscribe({

        next: (blob: Blob) => {

          this.cargando = false;

          const url =
            window.URL.createObjectURL(blob);

          const link =
            document.createElement('a');

          const mesTexto =
            String(mes).padStart(2, '0');

          link.href = url;

          link.download =
            `REPORTE_TERMINACION_CONTRATO_${mesTexto}_${anio}.pdf`;

          document.body.appendChild(link);

          link.click();

          document.body.removeChild(link);

          window.URL.revokeObjectURL(url);
        },

        error: (error: HttpErrorResponse) => {

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

  // ============================================================
  // CANCELAR
  // ============================================================

  cancelar(): void {

    const fechaActual = new Date();

    this.form.reset({
      mes: fechaActual.getMonth() + 1,
      anio: fechaActual.getFullYear(),
      idTipoContrato: null
    });
  }
}