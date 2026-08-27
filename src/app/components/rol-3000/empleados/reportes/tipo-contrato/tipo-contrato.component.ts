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
  debounceTime,
  distinctUntilChanged
} from 'rxjs/operators';

import {
  ColDef,
  GridApi,
  GridReadyEvent
} from 'ag-grid-community';

import * as XLSX from 'xlsx';

import {
  ReportesEmpleadosService,
  EmpleadoTipoContratoResponse,
  ContratoEmpleadoResponse
} from 'src/app/services/rol/reportes-empleados.service';


/* ============================================================
   FILA AG GRID
============================================================ */

interface TipoContratoEmpleadoFila {

  secuencia: number;

  idEmpleado: number;

  cedula: string;

  nombre: string;

  cargo: string;

  nroContrato: number;

  tipoContrato: string;

  fechaIngreso: string | null;

  fechaSalida: string | null;

  fechaTerminacion: string | null;
}


@Component({

  selector: 'app-tipo-contrato',

  templateUrl:
    './tipo-contrato.component.html',

  styleUrls: [
    './tipo-contrato.component.css'
  ]

})
export class TipoContratoComponent
  implements OnInit {

  form!: FormGroup;

  cargando = false;

  private gridApi!: GridApi;


  /* ============================================================
     DATOS
  ============================================================ */

  empleados:
    EmpleadoTipoContratoResponse[] = [];

  filas:
    TipoContratoEmpleadoFila[] = [];


  /* ============================================================
     COLUMNAS AG GRID
  ============================================================ */

  columnDefs:
    ColDef<TipoContratoEmpleadoFila>[] = [

    {
      headerName: '#',
      field: 'secuencia',
      width: 65,
      minWidth: 65,
      maxWidth: 75,
      pinned: 'left'
    },

    {
      headerName: 'Código',
      field: 'idEmpleado',
      width: 90,
      minWidth: 90
    },

    {
      headerName: 'Cédula',
      field: 'cedula',
      width: 120,
      minWidth: 120
    },

    {
      headerName: 'Nombre',
      field: 'nombre',
      minWidth: 260,
      flex: 2
    },

    {
      headerName: 'Cargo',
      field: 'cargo',
      minWidth: 220,
      flex: 1.5
    },

    {
      headerName: 'Nro.',
      field: 'nroContrato',
      width: 80,
      minWidth: 80
    },

    {
      headerName: 'Tipo de Contrato',
      field: 'tipoContrato',
      minWidth: 250,
      flex: 1.6
    },

    {
      headerName: 'Fecha Ingreso',
      field: 'fechaIngreso',
      width: 130,

      valueFormatter: params =>
        this.formatearFecha(
          params.value
        )
    },

    {
      headerName: 'Fecha Salida',
      field: 'fechaSalida',
      width: 130,

      valueFormatter: params =>
        this.formatearFecha(
          params.value
        )
    },

    {
      headerName: 'Terminación',
      field: 'fechaTerminacion',
      width: 130,

      valueFormatter: params =>
        this.formatearFecha(
          params.value
        )
    }

  ];


  /* ============================================================
     CONFIGURACIÓN GENERAL COLUMNAS
  ============================================================ */

  defaultColDef:
    ColDef<TipoContratoEmpleadoFila> = {

      sortable: true,

      filter: true,

      resizable: true,

      suppressMovable: false

    };


  constructor(

    private readonly fb:
      FormBuilder,

    private readonly reportesService:
      ReportesEmpleadosService

  ) {}


  /* ============================================================
     INIT
  ============================================================ */

  ngOnInit(): void {

    this.form =
      this.fb.group({

        buscarNombre: ['']

      });


    /* ==========================================================
       CARGA INICIAL
    ========================================================== */

    this.cargar();


    /* ==========================================================
       BÚSQUEDA AUTOMÁTICA
    ========================================================== */

    this.form
      .get('buscarNombre')
      ?.valueChanges
      .pipe(

        debounceTime(400),

        distinctUntilChanged()

      )
      .subscribe(
        valor => {

          this.cargar(
            valor
          );

        }
      );
  }


  /* ============================================================
     GRID READY
  ============================================================ */

  onGridReady(
    event: GridReadyEvent
  ): void {

    this.gridApi =
      event.api;

    this.gridApi.sizeColumnsToFit();
  }


  /* ============================================================
     CARGAR API
  ============================================================ */

  cargar(
    nombre?: string | null
  ): void {

    this.cargando = true;


    this.reportesService
      .consultarTiposContratoEmpleados(
        nombre
      )
      .subscribe({

        next: (
          response:
            EmpleadoTipoContratoResponse[]
        ) => {

          this.empleados =
            response ?? [];


          this.construirFilas();


          this.cargando = false;

        },


        error: (
          error:
            HttpErrorResponse
        ) => {

          this.cargando = false;

          this.empleados = [];

          this.filas = [];


          console.error(
            'Error consultando tipos de contrato:',
            error
          );

        }

      });
  }


  /* ============================================================
     CONSTRUIR FILAS

     1 empleado con 3 contratos
     =
     3 filas AG Grid
  ============================================================ */

  private construirFilas(): void {

    const resultado:
      TipoContratoEmpleadoFila[] = [];


    let secuencia = 1;


    for (
      const empleado
      of this.empleados
    ) {

      if (
        !empleado.contratos ||
        empleado.contratos.length === 0
      ) {

        continue;

      }


      for (
        const contrato
        of empleado.contratos
      ) {

        resultado.push(
          this.crearFila(

            secuencia++,

            empleado,

            contrato

          )
        );

      }

    }


    this.filas =
      resultado;

  }


  /* ============================================================
     CREAR FILA
  ============================================================ */

  private crearFila(

    secuencia: number,

    empleado:
      EmpleadoTipoContratoResponse,

    contrato:
      ContratoEmpleadoResponse

  ): TipoContratoEmpleadoFila {

    return {

      secuencia:
        secuencia,

      idEmpleado:
        empleado.idEmpleado,

      cedula:
        empleado.cedula ?? '',

      nombre:
        empleado.empleado ?? '',

      cargo:
        empleado.cargo ?? '',

      nroContrato:
        contrato.nroContrato,

      tipoContrato:
        contrato.tipoContrato ?? '',

      fechaIngreso:
        contrato.fechaIngreso,

      fechaSalida:
        contrato.fechaSalida,

      fechaTerminacion:
        contrato.fechaTerminacionContrato

    };

  }


  /* ============================================================
     BUSCAR
  ============================================================ */

  buscar(): void {

    const nombre =
      this.form
        .get('buscarNombre')
        ?.value;


    this.cargar(
      nombre
    );
  }


  /* ============================================================
     LIMPIAR
  ============================================================ */

  limpiar(): void {

    this.form.reset({
      buscarNombre: ''
    });

  }


  /* ============================================================
     EXPORTAR EXCEL

     Exporta lo que está actualmente visible en AG Grid,
     respetando filtros y ordenamiento.
  ============================================================ */

  exportarExcel(): void {

    if (
      !this.gridApi
    ) {

      return;

    }


    const datos: any[] = [];


    /* ==========================================================
       OBTENER FILAS DESPUÉS DE FILTROS Y ORDENAMIENTO
    ========================================================== */

    this.gridApi
      .forEachNodeAfterFilterAndSort(
        node => {

          if (!node.data) {
            return;
          }


          const fila =
            node.data as
              TipoContratoEmpleadoFila;


          datos.push({

            'Nro.':
              fila.secuencia,

            'Código':
              fila.idEmpleado,

            'Cédula':
              fila.cedula,

            'Nombre':
              fila.nombre,

            'Cargo':
              fila.cargo,

            'Nro. Contrato':
              fila.nroContrato,

            'Tipo de Contrato':
              fila.tipoContrato,

            'Fecha Ingreso':
              this.formatearFecha(
                fila.fechaIngreso
              ),

            'Fecha Salida':
              this.formatearFecha(
                fila.fechaSalida
              ),

            'Terminación':
              this.formatearFecha(
                fila.fechaTerminacion
              )

          });

        }
      );


    if (
      datos.length === 0
    ) {

      alert(
        'No existen datos para exportar.'
      );

      return;

    }


    /* ==========================================================
       CREAR HOJA
    ========================================================== */

    const worksheet =
      XLSX.utils.json_to_sheet(
        datos
      );


    /* ==========================================================
       ANCHO COLUMNAS
    ========================================================== */

    worksheet['!cols'] = [

      { wch: 7 },

      { wch: 10 },

      { wch: 14 },

      { wch: 38 },

      { wch: 32 },

      { wch: 14 },

      { wch: 38 },

      { wch: 15 },

      { wch: 15 },

      { wch: 15 }

    ];


    /* ==========================================================
       CREAR LIBRO
    ========================================================== */

    const workbook =
      XLSX.utils.book_new();


    XLSX.utils.book_append_sheet(

      workbook,

      worksheet,

      'TIPO_CONTRATO'

    );


    /* ==========================================================
       NOMBRE ARCHIVO
    ========================================================== */

    const hoy =
      new Date();


    const fechaArchivo =
      (
        hoy.getFullYear()
        +
        String(
          hoy.getMonth() + 1
        ).padStart(
          2,
          '0'
        )
        +
        String(
          hoy.getDate()
        ).padStart(
          2,
          '0'
        )
      );


    XLSX.writeFile(

      workbook,

      `REPORTE_TIPO_CONTRATO_${fechaArchivo}.xlsx`

    );
  }


  /* ============================================================
     FORMATEAR FECHA

     API:
     2026-08-27

     Pantalla / Excel:
     27/08/2026
  ============================================================ */

  formatearFecha(
    fecha:
      string |
      null |
      undefined
  ): string {

    if (!fecha) {

      return '';

    }


    /*
     * Si viene:
     *
     * 2026-08-27
     *
     * evitamos:
     * new Date(...)
     *
     * para no tener problemas de zona horaria.
     */

    const valor =
      fecha.substring(
        0,
        10
      );


    const partes =
      valor.split('-');


    if (
      partes.length !== 3
    ) {

      return fecha;

    }


    return (
      `${partes[2]}/` +
      `${partes[1]}/` +
      `${partes[0]}`
    );

  }

}