import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  Validators
} from '@angular/forms';

import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  NativeDateAdapter
} from '@angular/material/core';

import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import {
  ColDef,
  ColGroupDef,
  GridApi,
  GridReadyEvent,
  ValueFormatterParams
} from 'ag-grid-community';

import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

import { UsuarioService } from 'src/app/services/usuario.service';

import {
  EnviarRolesCorreoRequest,
  RolMensualRequest,
  RolMensualResponse,
  RolNominaService,
  RubroColumnaResponse
} from 'src/app/services/rol/rol-nomina.service';

import {
  CustomMessageBoxComponent
} from 'src/app/components/utils/messages/custom-message-box.component';

import {
  DialogProcesoComponent
} from 'src/app/components/productos/dialog-proceso/dialog-proceso.component';

export const DD_MM_YYYY_FORMATS = {
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

export class CustomDateAdapter extends NativeDateAdapter {
  override format(date: Date, displayFormat: Object): string {
    if (!date) {
      return '';
    }

    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const anio = date.getFullYear();

    return `${dia}/${mes}/${anio}`;
  }
}

@Component({
  selector: 'app-reporte-rol-nomina',
  templateUrl: './reporte-rol-nomina.component.html',
  styleUrls: ['./reporte-rol-nomina.component.css'],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'es-EC' },
    { provide: DateAdapter, useClass: CustomDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY_FORMATS }
  ]
})
export class ReporteRolNominaComponent implements OnInit {

  form!: FormGroup;

  detalleRol: any[] = [];
  columnasRubros: RubroColumnaResponse[] = [];
  columnDefs: Array<ColDef | ColGroupDef> = [];
  pinnedBottomRowData: any[] = [];

  cargando = false;
  enviandoCorreos = false;
  exportandoExcel = false;

  usuarioActual = this.usuarioService.getUsuarioActual();

  private gridApi!: GridApi;

  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    editable: false
  };

  constructor(
    private readonly fb: FormBuilder,
    private readonly rolNominaService: RolNominaService,
    private readonly usuarioService: UsuarioService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.form = this.fb.group({
      fechaPeriodo: [
        this.obtenerUltimoDiaMesActual(),
        [
          Validators.required,
          this.validarUltimoDiaMes
        ]
      ]
    });

    this.columnDefs = this.construirColumnasGrid([]);
  }

  consultar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.mostrarAdvertencia(
        'Debe seleccionar un periodo válido.'
      );
      return;
    }

    if (this.cargando) {
      return;
    }

    const request = this.construirRequestConsulta();

    this.cargando = true;

    this.rolNominaService
      .getRolMensual(request)
      .subscribe({
        next: resp => {
          this.cargando = false;

          if (resp.type !== 'Success' || !resp.data) {
            this.limpiarGrid();

            this.mostrarAdvertencia(
              resp.message ??
              'No existe una nómina para el periodo seleccionado.'
            );

            return;
          }

          const data = resp.data as RolMensualResponse;

          this.columnasRubros =
            data.columnasRubros ?? [];

          this.columnDefs =
            this.construirColumnasGrid(
              this.columnasRubros
            );

          this.detalleRol =
            (data.empleados ?? [])
              .map(e => ({
                idEmpleado:
                  e.idEmpleado,

                codigoEmpleado:
                  e.codigoEmpleado,

                nombreEmpleado:
                  e.nombreEmpleado,

                cedula:
                  e.cedula ?? '',

                cargo:
                  e.cargo ?? '',

                estado:
                  e.estado ?? '',

                idLocal:
                  e.idLocal,

                local:
                  e.local ?? '',

                diasTrabajados:
                  e.diasTrabajados ?? 0,

                rubros:
                  e.rubros ?? {},

                totalIngresos:
                  e.totalIngresos ?? 0,

                totalDescuentos:
                  e.totalDescuentos ?? 0,

                liquidoRecibir:
                  e.liquidoRecibir ?? 0
              }));

          this.pinnedBottomRowData =
            this.detalleRol.length > 0
              ? [this.construirFilaTotales()]
              : [];

          setTimeout(() => {
            this.ajustarGrid();
          }, 50);
        },

        error: err => {
          this.cargando = false;

          console.error(
            'Error consultando rol mensual:',
            err
          );

          this.limpiarGrid();

          this.mostrarError(
            'Error al consultar la nómina mensual.'
          );
        }
      });
  }

  cancelar(): void {
    this.limpiarGrid();

    this.form.patchValue({
      fechaPeriodo:
        this.obtenerUltimoDiaMesActual()
    });
  }

  enviarPdfEmpleadosSeleccionados(): void {
    if (
      !this.detalleRol ||
      this.detalleRol.length === 0
    ) {
      this.mostrarAdvertencia(
        'Primero debe consultar una nómina.'
      );
      return;
    }

    const empleados =
      this.obtenerEmpleadosSeleccionados();

    if (empleados.length === 0) {
      this.mostrarAdvertencia(
        'Debe seleccionar al menos un empleado.'
      );
      return;
    }

    const idsEmpleados = empleados
      .map((x: any) =>
        Number(x.idEmpleado)
      )
      .filter((x: number) =>
        x > 0
      );

    if (idsEmpleados.length === 0) {
      this.mostrarAdvertencia(
        'No se encontraron empleados válidos seleccionados.'
      );
      return;
    }

    const fechaPeriodo =
      this.formatearFechaYYYYMMDD(
        this.form.value.fechaPeriodo
      );

    this.confirmarAccion(
      'Confirmar envío de roles',
      `¿Está seguro de enviar los roles individuales por correo a ${idsEmpleados.length} empleado(s) seleccionado(s)?`,
      'Sí, enviar',
      'Cancelar'
    ).subscribe(
      (confirmado: boolean) => {

        if (confirmado !== true) {
          return;
        }

        const request:
          EnviarRolesCorreoRequest = {

          fechaPeriodo,

          idUsuario:
            this.usuarioActual?.id_usuario ??
            1,

          idsEmpleados
        };

        this.ejecutarEnvioRolesCorreo(
          request
        );
      }
    );
  }

  private ejecutarEnvioRolesCorreo(
    request: EnviarRolesCorreoRequest
  ): void {

    this.enviandoCorreos = true;

    const dialogProcesoRef =
      this.dialog.open<DialogProcesoComponent>(
        DialogProcesoComponent,
        {
          disableClose: true,
          width: '400px',
          data: {
            procesados: 0,
            total:
              request.idsEmpleados.length,
            titulo:
              'Enviando roles por correo',
            mensaje:
              'Generando PDFs y enviando correos...'
          }
        }
      );

    this.rolNominaService
      .enviarRolesPorCorreo(request)
      .subscribe({
        next: resp => {
          this.enviandoCorreos = false;

          const data = resp.data;

          const totalProcesados =
            (data?.totalEnviados ?? 0) +
            (data?.totalSinCorreo ?? 0) +
            (data?.errores?.length ?? 0);

          dialogProcesoRef
            .componentInstance
            .data
            .procesados =
              totalProcesados;

          setTimeout(() => {
            dialogProcesoRef.close();

            if (
              resp.type === 'Success' &&
              data?.procesado
            ) {
              this.mostrarExito(
                data.mensaje ??
                `Roles enviados correctamente. Enviados: ${data.totalEnviados}.`
              );

              this.gridApi?.deselectAll();
              return;
            }

            if (resp.type === 'Warning') {
              this.mostrarAdvertencia(
                data?.mensaje ??
                resp.message ??
                'El proceso terminó con advertencias.'
              );
              return;
            }

            this.mostrarError(
              data?.mensaje ??
              resp.message ??
              'No se pudieron enviar los roles por correo.'
            );
          }, 300);
        },

        error: err => {
          this.enviandoCorreos = false;
          dialogProcesoRef.close();

          console.error(
            'Error enviando roles:',
            err
          );

          this.mostrarError(
            err?.error?.message ??
            err?.error?.data?.mensaje ??
            'Error al enviar los roles por correo.'
          );
        }
      });
  }

  async exportarRolExcel(): Promise<void> {
    if (
      !this.detalleRol ||
      this.detalleRol.length === 0
    ) {
      this.mostrarAdvertencia(
        'No existen datos para exportar.'
      );
      return;
    }

    this.exportandoExcel = true;

    try {
      const workbook =
        new ExcelJS.Workbook();

      const worksheet =
        workbook.addWorksheet(
          'Rol Mensual'
        );

      const fechaPeriodo =
        this.formatearFechaYYYYMMDD(
          this.form.value.fechaPeriodo
        );

      const columnas =
        this.obtenerColumnasExcel();

      if (columnas.length === 0) {
        this.mostrarAdvertencia(
          'No existen columnas para exportar.'
        );
        return;
      }

      const totalColumnas =
        columnas.length;

      worksheet.mergeCells(
        1,
        1,
        1,
        totalColumnas
      );

      const titulo =
        worksheet.getCell(1, 1);

      titulo.value =
        'REPORTE DE ROLES MENSUALES';

      titulo.font = {
        bold: true,
        size: 14
      };

      titulo.alignment = {
        horizontal: 'center',
        vertical: 'middle'
      };

      worksheet.mergeCells(
        2,
        1,
        2,
        totalColumnas
      );

      const periodo =
        worksheet.getCell(2, 1);

      periodo.value =
        `Periodo: ${fechaPeriodo}`;

      periodo.font = {
        bold: true,
        size: 10
      };

      periodo.alignment = {
        horizontal: 'center',
        vertical: 'middle'
      };

      worksheet.addRow([]);

      const filaHeaderGrupo = 4;
      const filaHeaderDetalle = 5;

      columnas.forEach(
        (col, index) => {

          const numeroColumna =
            index + 1;

          const celdaGrupo =
            worksheet.getCell(
              filaHeaderGrupo,
              numeroColumna
            );

          celdaGrupo.value =
            col.grupoHeaderName ??
            col.headerName;

          celdaGrupo.font = {
            bold: true,
            size: 9
          };

          celdaGrupo.alignment = {
            horizontal: 'center',
            vertical: 'middle',
            wrapText: true
          };

          celdaGrupo.border =
            this.bordeExcel();

          const celdaDetalle =
            worksheet.getCell(
              filaHeaderDetalle,
              numeroColumna
            );

          celdaDetalle.value =
            col.subHeaderName ?? '';

          celdaDetalle.font = {
            bold: true,
            size: 9
          };

          celdaDetalle.alignment = {
            horizontal: 'center',
            vertical: 'middle'
          };

          celdaDetalle.border =
            this.bordeExcel();

          if (!col.subHeaderName) {
            worksheet.mergeCells(
              filaHeaderGrupo,
              numeroColumna,
              filaHeaderDetalle,
              numeroColumna
            );
          }
        }
      );

      this.detalleRol.forEach(
        (item: any) => {

          const valores =
            columnas.map(col =>
              this.obtenerValorColumnaExcel(
                item,
                col
              )
            );

          const row =
            worksheet.addRow(valores);

          row.eachCell(
            (cell, colNumber) => {

              const columna =
                columnas[colNumber - 1];

              cell.border =
                this.bordeExcel();

              cell.alignment = {
                vertical: 'middle',
                horizontal:
                  this.esColumnaNumericaExcel(
                    columna
                  )
                    ? 'right'
                    : 'left'
              };

              if (
                this.esColumnaNumericaExcel(
                  columna
                )
              ) {
                cell.numFmt =
                  columna.colId
                    ?.endsWith('_CANT')
                    ? '#,##0.##'
                    : '#,##0.00';
              }
            }
          );
        }
      );

      if (
        this.pinnedBottomRowData &&
        this.pinnedBottomRowData.length > 0
      ) {
        const totalData =
          this.pinnedBottomRowData[0];

        const valoresTotales =
          columnas.map(col =>
            this.obtenerValorColumnaExcel(
              totalData,
              col
            )
          );

        const totalRow =
          worksheet.addRow(
            valoresTotales
          );

        totalRow.font = {
          bold: true
        };
      }

      columnas.forEach(
        (col, index) => {

          const excelCol =
            worksheet.getColumn(
              index + 1
            );

          if (
            col.colId ===
            'nombreEmpleado'
          ) {
            excelCol.width = 36;
          } else if (
            col.colId ===
            'codigoEmpleado'
          ) {
            excelCol.width = 12;
          } else {
            excelCol.width = 15;
          }
        }
      );

      worksheet.views = [
        {
          state: 'frozen',
          ySplit: filaHeaderDetalle,
          xSplit: 2
        }
      ];

      const buffer =
        await workbook.xlsx
          .writeBuffer();

      saveAs(
        new Blob(
          [buffer],
          {
            type:
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          }
        ),
        `Reporte_Rol_Mensual_${fechaPeriodo}.xlsx`
      );

      this.mostrarExito(
        'Archivo Excel generado correctamente.'
      );
    }
    catch (error) {
      console.error(
        'Error exportando Excel:',
        error
      );

      this.mostrarError(
        'No se pudo exportar el rol a Excel.'
      );
    }
    finally {
      this.exportandoExcel = false;
    }
  }

  private construirRequestConsulta():
    RolMensualRequest {

    return {
      fechaPeriodo:
        this.formatearFechaYYYYMMDD(
          this.form.value.fechaPeriodo
        ),

      idLocal: null,
      idDepartamento: null,

      verLocales: true,
      areas: true,
      exEmpleados: true,
      departamentos: false,

      totalizados: false,
      porRubros: true,
      todosLosRubros: true,
      totalizar: true
    };
  }

  private construirColumnasGrid(
    columnasRubros:
      RubroColumnaResponse[]
  ): Array<ColDef | ColGroupDef> {

    const columnaSeleccion:
      ColDef = {

      headerName: '',
      colId: 'seleccion',

      width: 46,
      minWidth: 46,
      maxWidth: 46,

      pinned: 'left',
      lockPinned: true,
      lockPosition: true,

      sortable: false,
      filter: false,
      resizable: false,

      suppressSizeToFit: true,

      checkboxSelection:
        params =>
          !params.node?.rowPinned,

      headerCheckboxSelection: true,

      cellClass:
        'cell-check-rol',

      headerClass:
        'header-check-rol'
    };

    const columnaCodigo:
      ColDef = {

      headerName: 'Código',
      field: 'codigoEmpleado',

      width: 80,
      minWidth: 80,
      maxWidth: 90,

      pinned: 'left',
      lockPinned: true,

      suppressSizeToFit: true,

      filter: true
    };

    const columnaNombre:
      ColDef = {

      headerName: 'Nombre',
      field: 'nombreEmpleado',

      width: 230,
      minWidth: 230,

      pinned: 'left',
      lockPinned: true,

      suppressSizeToFit: true,

      filter: true
    };

    let columnasIngresos:
      Array<ColDef | ColGroupDef> =
        columnasRubros
          .filter(x =>
            x.tipoPago === 'I'
          )
          .map(col =>
            this.construirColumnaRubroFlexible(
              col,
              'INGRESO'
            )
          );

    columnasIngresos =
      this.ordenarColumnasIngresosConDias(
        columnasIngresos
      );

    const columnasDescuentos:
      Array<ColDef | ColGroupDef> =
        columnasRubros
          .filter(x =>
            x.tipoPago === 'D'
          )
          .map(col =>
            this.construirColumnaRubroFlexible(
              col,
              'DESCUENTO'
            )
          );

    const grupoIngresos:
      ColGroupDef = {

      headerName: 'INGRESOS',

      headerClass:
        'grupo-ingresos',

      marryChildren: true,

      children:
        columnasIngresos
    };

    const grupoDescuentos:
      ColGroupDef = {

      headerName: 'DESCUENTOS',

      headerClass:
        'grupo-descuentos',

      marryChildren: true,

      children:
        columnasDescuentos
    };

    const columnasTotales:
      ColDef[] = [

      {
        field: 'totalIngresos',
        headerName:
          'Total Ingresos',

        width: 150,

        type:
          'numericColumn',

        pinned: 'right',

        headerClass:
          'header-total-ingresos',

        cellClass:
          params =>
            params.node?.rowPinned
              ? 'cell-total-row cell-total-ingresos'
              : 'cell-total-ingresos',

        cellStyle: {
          backgroundColor:
            '#dcfce7',

          color:
            '#166534',

          fontWeight:
            '800'
        },

        valueFormatter:
          (params:
            ValueFormatterParams) =>
              this.formatearDecimalValor(
                params.value
              )
      },

      {
        field: 'totalDescuentos',
        headerName:
          'Total Descuentos',

        width: 165,

        type:
          'numericColumn',

        pinned: 'right',

        headerClass:
          'header-total-descuentos',

        cellClass:
          params =>
            params.node?.rowPinned
              ? 'cell-total-row cell-total-descuentos'
              : 'cell-total-descuentos',

        cellStyle: {
          backgroundColor:
            '#fef9c3',

          color:
            '#854d0e',

          fontWeight:
            '800'
        },

        valueFormatter:
          (params:
            ValueFormatterParams) =>
              this.formatearDecimalValor(
                params.value
              )
      },

      {
        field: 'liquidoRecibir',
        headerName:
          'Líquido a Recibir',

        width: 170,

        type:
          'numericColumn',

        pinned: 'right',

        headerClass:
          'header-total-liquido',

        cellClass:
          params =>
            params.node?.rowPinned
              ? 'cell-total-row cell-total-liquido'
              : 'cell-total-liquido',

        cellStyle: {
          backgroundColor:
            '#dbeafe',

          color:
            '#1d4ed8',

          fontWeight:
            '900'
        },

        valueFormatter:
          (params:
            ValueFormatterParams) =>
              this.formatearDecimalValor(
                params.value
              )
      }
    ];

    return [
      columnaSeleccion,
      columnaCodigo,
      columnaNombre,
      grupoIngresos,
      grupoDescuentos,
      ...columnasTotales
    ];
  }

  private construirColumnaRubroFlexible(
    col: RubroColumnaResponse,
    tipo:
      'INGRESO' |
      'DESCUENTO'
  ): ColDef | ColGroupDef {

    if (
      !this.debeMostrarCantidadRubro(
        col
      )
    ) {
      return this.construirColumnaRubro(
        col,
        tipo
      );
    }

    return this.construirGrupoColumnaRubro(
      col,
      tipo
    );
  }

  private construirColumnaRubro(
    col: RubroColumnaResponse,
    tipo:
      'INGRESO' |
      'DESCUENTO'
  ): ColDef {

    const key =
      this.obtenerKeyRubro(col);

    const esIngreso =
      tipo === 'INGRESO';

    const colDef: ColDef = {

      headerName:
        this.obtenerNombreColumnaRubro(
          col
        ),

      colId:
        key,

      width:
        this.obtenerAnchoColumnaRubro(
          col
        ),

      type:
        'numericColumn',

      filter: true,

      editable: false,

      headerClass:
        esIngreso
          ? 'header-ingreso'
          : 'header-descuento',

      cellClass:
        params => {

          const claseBase =
            esIngreso
              ? 'cell-ingreso'
              : 'cell-descuento';

          return params.node
            ?.rowPinned
              ? `${claseBase} cell-total-row`
              : claseBase;
        },

      cellStyle:
        esIngreso
          ? {
              backgroundColor:
                '#f0fdf4',

              color:
                '#065f46',

              fontWeight:
                '600'
            }
          : {
              backgroundColor:
                '#fefce8',

              color:
                '#854d0e',

              fontWeight:
                '600'
            },

      valueGetter:
        params => {

          const rubros =
            params.data?.rubros ??
            {};

          return this.toNumber(
            rubros[key]
          );
        },

      valueFormatter:
        (params:
          ValueFormatterParams) =>
            this.formatearDecimalValor(
              params.value
            )
    };

    (colDef as any)
      .rubroHeaderName =
        this.obtenerNombreColumnaRubro(
          col
        );

    (colDef as any)
      .rubroSubHeaderName =
        '';

    return colDef;
  }

  private construirGrupoColumnaRubro(
    col: RubroColumnaResponse,
    tipo:
      'INGRESO' |
      'DESCUENTO'
  ): ColGroupDef {

    const key =
      this.obtenerKeyRubro(col);

    const keyCantidad =
      `${key}_CANT`;

    const nombreRubro =
      this.obtenerNombreColumnaRubro(
        col
      );

    const esIngreso =
      tipo === 'INGRESO';

    const claseBase =
      esIngreso
        ? 'cell-ingreso'
        : 'cell-descuento';

    const headerClass =
      esIngreso
        ? 'header-ingreso'
        : 'header-descuento';

    const cellStyle =
      esIngreso
        ? {
            backgroundColor:
              '#f0fdf4',

            color:
              '#065f46',

            fontWeight:
              '600'
          }
        : {
            backgroundColor:
              '#fefce8',

            color:
              '#854d0e',

            fontWeight:
              '600'
          };

    const columnaCantidad:
      ColDef = {

      headerName: 'Cant.',
      colId: keyCantidad,

      width: 80,
      minWidth: 70,

      type:
        'numericColumn',

      filter: true,
      editable: false,

      headerClass,

      cellClass:
        params =>
          params.node?.rowPinned
            ? `${claseBase} cell-total-row`
            : claseBase,

      cellStyle,

      valueGetter:
        params => {

          const rubros =
            params.data?.rubros ??
            {};

          return this.toNumber(
            rubros[keyCantidad]
          );
        },

      valueFormatter:
        params => {

          const valor =
            this.toNumber(
              params.value
            );

          return valor === 0
            ? ''
            : valor.toString();
        }
    };

    const columnaValor:
      ColDef = {

      headerName: 'Valor',
      colId: key,

      width:
        this.obtenerAnchoColumnaRubro(
          col
        ),

      minWidth: 95,

      type:
        'numericColumn',

      filter: true,
      editable: false,

      headerClass,

      cellClass:
        params =>
          params.node?.rowPinned
            ? `${claseBase} cell-total-row`
            : claseBase,

      cellStyle,

      valueGetter:
        params => {

          const rubros =
            params.data?.rubros ??
            {};

          return this.toNumber(
            rubros[key]
          );
        },

      valueFormatter:
        (params:
          ValueFormatterParams) =>
            this.formatearDecimalValor(
              params.value
            )
    };

    (columnaCantidad as any)
      .rubroHeaderName =
        nombreRubro;

    (columnaCantidad as any)
      .rubroSubHeaderName =
        'Cant.';

    (columnaValor as any)
      .rubroHeaderName =
        nombreRubro;

    (columnaValor as any)
      .rubroSubHeaderName =
        'Valor';

    return {
      headerName:
        nombreRubro,

      headerClass,

      marryChildren: true,

      children: [
        columnaCantidad,
        columnaValor
      ]
    };
  }

  private construirFilaTotales():
    any {

    const rubrosTotales:
      Record<string, number> = {};

    this.columnasRubros
      .forEach(col => {

        const key =
          this.obtenerKeyRubro(
            col
          );

        const keyCantidad =
          `${key}_CANT`;

        rubrosTotales[key] =
          this.detalleRol
            .reduce(
              (acc, item) =>
                acc +
                this.toNumber(
                  item.rubros?.[key]
                ),
              0
            );

        rubrosTotales[keyCantidad] =
          this.detalleRol
            .reduce(
              (acc, item) =>
                acc +
                this.toNumber(
                  item.rubros
                    ?.[keyCantidad]
                ),
              0
            );
      });

    return {
      idEmpleado: null,
      codigoEmpleado: '',
      nombreEmpleado:
        'TOTALES',

      rubros:
        rubrosTotales,

      totalIngresos:
        this.detalleRol
          .reduce(
            (acc, item) =>
              acc +
              this.toNumber(
                item.totalIngresos
              ),
            0
          ),

      totalDescuentos:
        this.detalleRol
          .reduce(
            (acc, item) =>
              acc +
              this.toNumber(
                item.totalDescuentos
              ),
            0
          ),

      liquidoRecibir:
        this.detalleRol
          .reduce(
            (acc, item) =>
              acc +
              this.toNumber(
                item.liquidoRecibir
              ),
            0
          )
    };
  }

  onGridReady(
    params: GridReadyEvent
  ): void {

    this.gridApi =
      params.api;

    setTimeout(() => {
      this.ajustarGrid();
    }, 100);
  }

  onGridSizeChanged(): void {
    this.ajustarGrid();
  }

  onFirstDataRendered(): void {
    this.ajustarGrid();
  }

  private ajustarGrid(): void {
    if (!this.gridApi) {
      return;
    }

    setTimeout(() => {
      this.gridApi.refreshHeader();

      this.gridApi.refreshCells({
        force: true
      });
    }, 50);
  }

  private obtenerEmpleadosSeleccionados():
    any[] {

    if (!this.gridApi) {
      return [];
    }

    return this.gridApi
      .getSelectedRows() ??
      [];
  }

  private limpiarGrid(): void {
    this.detalleRol = [];
    this.columnasRubros = [];

    this.columnDefs =
      this.construirColumnasGrid(
        []
      );

    this.pinnedBottomRowData =
      [];

    if (this.gridApi) {
      this.gridApi.deselectAll();

      this.gridApi.refreshCells({
        force: true
      });
    }
  }

  private obtenerColumnasExcel():
    any[] {

    if (!this.gridApi) {
      return [];
    }

    return this.gridApi
      .getAllDisplayedColumns()
      .map(col => {

        const colDef:
          any =
            col.getColDef();

        return {
          colId:
            col.getColId(),

          field:
            colDef.field,

          headerName:
            colDef.headerName ??
            col.getColId(),

          grupoHeaderName:
            colDef.rubroHeaderName ??
            colDef.headerName ??
            col.getColId(),

          subHeaderName:
            colDef.rubroSubHeaderName ??
            ''
        };
      })
      .filter(col =>
        col.colId !==
        'seleccion'
      );
  }

  private obtenerValorColumnaExcel(
    item: any,
    columna: any
  ): any {

    if (!item || !columna) {
      return '';
    }

    const colId =
      columna.colId;

    const field =
      columna.field;

    if (
      colId ===
      'codigoEmpleado'
    ) {
      return item.codigoEmpleado ??
        '';
    }

    if (
      colId ===
      'nombreEmpleado'
    ) {
      return item.nombreEmpleado ??
        '';
    }

    if (
      field &&
      item[field] !== undefined
    ) {
      return item[field];
    }

    if (
      item.rubros &&
      item.rubros[colId] !==
      undefined
    ) {
      return this.toNumber(
        item.rubros[colId]
      );
    }

    if (
      item[colId] !== undefined
    ) {
      return item[colId];
    }

    return '';
  }

  private esColumnaNumericaExcel(
    columna: any
  ): boolean {

    return ![
      'codigoEmpleado',
      'nombreEmpleado'
    ].includes(
      columna.colId
    );
  }

  private bordeExcel():
    Partial<ExcelJS.Borders> {

    return {
      top: {
        style: 'thin',
        color: {
          argb: 'FFCBD5E1'
        }
      },

      left: {
        style: 'thin',
        color: {
          argb: 'FFCBD5E1'
        }
      },

      bottom: {
        style: 'thin',
        color: {
          argb: 'FFCBD5E1'
        }
      },

      right: {
        style: 'thin',
        color: {
          argb: 'FFCBD5E1'
        }
      }
    };
  }

  private obtenerNombreColumnaRubro(
    col: RubroColumnaResponse
  ): string {

    const descripcion =
      (col.descripcion ?? '')
        .trim();

    if (descripcion.length > 0) {
      return descripcion;
    }

    return `${col.tipoPago}-${col.codigo}`;
  }

  private obtenerAnchoColumnaRubro(
    col: RubroColumnaResponse
  ): number {

    const nombre =
      this.obtenerNombreColumnaRubro(
        col
      );

    if (nombre.length <= 8) {
      return 110;
    }

    if (nombre.length <= 16) {
      return 135;
    }

    return 160;
  }

  private obtenerKeyRubro(
    col: RubroColumnaResponse
  ): string {

    if (col.columnaKey) {
      return col.columnaKey;
    }

    return `${col.codigo}${col.tipoPago}`;
  }

  private debeMostrarCantidadRubro(
    col: RubroColumnaResponse
  ): boolean {

    const tipoPago =
      (col.tipoPago ?? '')
        .toString()
        .trim()
        .toUpperCase();

    const codigo =
      this.normalizarCodigoColumna(
        col.codigo
      );

    const descripcion =
      (col.descripcion ?? '')
        .toString()
        .trim()
        .toUpperCase();

    if (tipoPago !== 'I') {
      return false;
    }

    if (
      descripcion.includes(
        'SUELDO'
      ) &&
      !descripcion.includes(
        'DIAS'
      )
    ) {
      return false;
    }

    if (
      descripcion.includes(
        'RETROACTIVO'
      ) ||
      descripcion.includes(
        'BONO'
      ) ||
      descripcion.includes(
        'FONDO'
      ) ||
      descripcion.includes(
        'DECIMO'
      ) ||
      descripcion.includes(
        'DÉCIMO'
      )
    ) {
      return false;
    }

    if (
      codigo === '02' ||
      descripcion.includes(
        'DIAS TRABAJADOS'
      ) ||
      descripcion.includes(
        'DÍAS TRABAJADOS'
      ) ||
      descripcion.includes(
        'MATERNIDAD'
      ) ||
      descripcion.includes(
        'ENFERMEDAD'
      ) ||
      descripcion.includes(
        'ACCIDENTE'
      ) ||
      descripcion.includes(
        'HORAS'
      ) ||
      codigo === '07' ||
      codigo === '08' ||
      codigo === '09' ||
      codigo === '10'
    ) {
      return true;
    }

    return false;
  }

  private ordenarColumnasIngresosConDias(
    columnas:
      Array<ColDef | ColGroupDef>
  ): Array<ColDef | ColGroupDef> {

    const colSueldo =
      columnas.find(x =>
        this.textoColumnaGrupo(x)
          .includes('SUELDO')
      );

    const colDiasTrabajados =
      columnas.find(x =>
        this.textoColumnaGrupo(x)
          .includes(
            'DIAS TRABAJADOS'
          ) ||
        this.textoColumnaGrupo(x)
          .includes(
            'DÍAS TRABAJADOS'
          )
      );

    const otrasColumnas =
      columnas.filter(x =>
        x !== colSueldo &&
        x !== colDiasTrabajados
      );

    const resultado:
      Array<ColDef | ColGroupDef> =
        [];

    if (colSueldo) {
      resultado.push(
        colSueldo
      );
    }

    if (colDiasTrabajados) {
      resultado.push(
        colDiasTrabajados
      );
    }

    resultado.push(
      ...otrasColumnas
    );

    return resultado;
  }

  private textoColumnaGrupo(
    col: ColDef | ColGroupDef
  ): string {

    return (
      col.headerName ??
      ''
    )
      .toString()
      .trim()
      .toUpperCase();
  }

  private normalizarCodigoColumna(
    codigo: any
  ): string {

    const texto =
      (codigo ?? '')
        .toString()
        .trim();

    if (!texto) {
      return '';
    }

    const numero =
      Number(texto);

    if (!Number.isNaN(numero)) {
      return numero
        .toString()
        .padStart(
          2,
          '0'
        );
    }

    return texto;
  }

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

  validarUltimoDiaMes(
    control: AbstractControl
  ): ValidationErrors | null {

    const fecha =
      control.value;

    if (!fecha) {
      return null;
    }

    const date =
      fecha instanceof Date
        ? fecha
        : new Date(fecha);

    if (isNaN(date.getTime())) {
      return {
        fechaInvalida: true
      };
    }

    const ultimoDia =
      new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0
      ).getDate();

    return date.getDate() ===
      ultimoDia
        ? null
        : {
            fechaInvalida: true
          };
  }

  soloUltimoDiaMes =
    (fecha: Date | null):
      boolean => {

      if (!fecha) {
        return false;
      }

      const ultimoDia =
        new Date(
          fecha.getFullYear(),
          fecha.getMonth() + 1,
          0
        ).getDate();

      return fecha.getDate() ===
        ultimoDia;
    };

  private formatearFechaYYYYMMDD(
    value: any
  ): string {

    if (!value) {
      return '';
    }

    if (
      typeof value ===
      'string'
    ) {
      if (
        value.includes('/')
      ) {
        const partes =
          value.split('/');

        if (
          partes.length === 3
        ) {
          const dia =
            partes[0]
              .padStart(2, '0');

          const mes =
            partes[1]
              .padStart(2, '0');

          const anio =
            partes[2];

          return `${anio}-${mes}-${dia}`;
        }
      }

      return value.substring(
        0,
        10
      );
    }

    const fecha =
      value as Date;

    const anio =
      fecha.getFullYear();

    const mes =
      String(
        fecha.getMonth() + 1
      ).padStart(
        2,
        '0'
      );

    const dia =
      String(
        fecha.getDate()
      ).padStart(
        2,
        '0'
      );

    return `${anio}-${mes}-${dia}`;
  }

  private toNumber(
    value: any
  ): number {

    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return 0;
    }

    const n =
      Number(value);

    return isNaN(n)
      ? 0
      : n;
  }

  private formatearDecimalValor(
    value: any
  ): string {

    const n =
      this.toNumber(value);

    return n.toLocaleString(
      'en-US',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    );
  }

  private confirmarAccion(
    titulo: string,
    mensaje: string,
    textoConfirmar:
      string =
        'Sí, confirmar',
    textoCancelar:
      string =
        'Cancelar'
  ) {

    return this.dialog
      .open(
        CustomMessageBoxComponent,
        {
          width: '420px',
          disableClose: true,

          data: {
            title: titulo,
            message: mensaje,
            type: 'info',
            confirmText:
              textoConfirmar,
            cancelText:
              textoCancelar,
            showCancel: true
          }
        }
      )
      .afterClosed();
  }

  private mostrarExito(
    mensaje: string
  ): void {

    this.snackBar.open(
      mensaje,
      'Cerrar',
      {
        duration: 5000,
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
        duration: 6000,
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
        duration: 7000,
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