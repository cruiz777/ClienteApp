import { Component, OnInit } from '@angular/core';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

import {
  ColDef,
  GridApi,
  GridReadyEvent,
  ValueFormatterParams
} from 'ag-grid-community';

import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

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

import { LocalesService } from 'src/app/services/locales.service';
import { UsuarioService } from 'src/app/services/usuario.service';

import {
  GenerarRolQuincenaRequest,
  RolNominaService,
  RolQuincenaRequest,
  RolQuincenaResponse
} from 'src/app/services/rol/rol-nomina.service';

import { CierrePeriodoService } from 'src/app/services/rol/cierre-periodo.service';

import {
  DialogBancoNominaComponent,
  DialogBancoNominaResult
} from '../dialog-banco-nomina/dialog-banco-nomina.component';

import { CustomMessageBoxComponent } from 'src/app/components/utils/messages/custom-message-box.component';

interface NodoRol {
  id: number | null;
  nombre: string;
  tipo: 'GENERAL' | 'LOCAL' | 'DEPARTAMENTO';
  expandido?: boolean;
  hijos?: NodoRol[];
}

export const DD_MM_YYYY_FORMATS_QUINCENA = {
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

export class CustomDateAdapterQuincenal extends NativeDateAdapter {
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
  selector: 'app-rol-quincenal',
  templateUrl: './rol-quincenal.component.html',
  styleUrls: ['./rol-quincenal.component.css'],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'es-EC' },
    { provide: DateAdapter, useClass: CustomDateAdapterQuincenal },
    { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY_FORMATS_QUINCENA }
  ]
})
export class RolQuincenalComponent implements OnInit {
  form!: FormGroup;

  nodos: NodoRol[] = [];
  nodoSeleccionado: NodoRol | null = null;

  detalleRol: any[] = [];

  private gridApi!: GridApi;

  columnDefs: ColDef[] = [];
  pinnedBottomRowData: any[] = [];

  generando = false;
  cargando = false;
  actualizando = false;
  exportandoExcel = false;

  periodoExiste = false;
  periodoCerrado = false;
  validandoCierre = false;
  modoEdicionPeriodo = false;

  procesandoModificar = false;
  modificarBloqueado = false;

  usuarioActual = this.usuarioService.getUsuarioActual();

  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true
  };

  constructor(
    private readonly fb: FormBuilder,
    private readonly rolNominaService: RolNominaService,
    private readonly dialog: MatDialog,
    private readonly localesService: LocalesService,
    private readonly snackBar: MatSnackBar,
    private readonly cierrePeriodoService: CierrePeriodoService,
    private readonly usuarioService: UsuarioService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      fechaPeriodo: [
        this.obtenerDiaQuincenaActual(),
        [Validators.required, this.validarDiaQuincena.bind(this)]
      ],
      numeroQuincena: [1, Validators.required]
    });

    this.form.get('numeroQuincena')?.valueChanges.subscribe(() => {
      const fechaBase = this.form.value.fechaPeriodo ?? new Date();

      this.form.patchValue({
        fechaPeriodo: this.obtenerFechaSegunQuincena(fechaBase)
      }, { emitEvent: false });

      this.form.get('fechaPeriodo')?.updateValueAndValidity();
      this.limpiarDatosPeriodo();
    });

    this.cargarInicial();
  }

  cargarInicial(): void {
    this.nodos = [
      {
        id: null,
        nombre: 'Emisión de Quincenas',
        tipo: 'GENERAL',
        expandido: false,
        hijos: []
      }
    ];

    this.nodoSeleccionado = this.nodos[0];
    this.detalleRol = [];
    this.columnDefs = this.construirColumnasGrid();
    this.pinnedBottomRowData = [];

    this.cargarLocalesArbol();
  }

  seleccionarNodo(nodo: NodoRol): void {
    this.nodoSeleccionado = nodo;
    this.cargarQuincena();
  }

  toggleNodo(nodo: NodoRol, event: MouseEvent): void {
    event.stopPropagation();
    nodo.expandido = !nodo.expandido;
  }

  accionPrincipalPeriodo(): void {
    if (
      this.generando ||
      this.cargando ||
      this.validandoCierre ||
      this.procesandoModificar ||
      this.modificarBloqueado ||
      (this.periodoExiste && this.periodoCerrado)
    ) {
      return;
    }

    if (this.periodoExiste) {
      this.modificarPeriodo();
      return;
    }

    this.nuevo();
  }

nuevo(): void {
  if (!this.form.value.fechaPeriodo) {
    this.mostrarAdvertencia('Debe ingresar el periodo.');
    return;
  }

  if (this.form.invalid) {
    this.form.markAllAsTouched();
    this.mostrarAdvertencia('La fecha de quincena no es válida.');
    return;
  }

  this.periodoCerrado = false;
  this.modificarBloqueado = false;
  this.procesandoModificar = false;

  this.validarEstadoCierreQuincena(() => {
    if (this.periodoCerrado) {
      this.mostrarAdvertencia(
        'La quincena ya se encuentra cerrada. Solo se cargará la información.'
      );

      this.cargarQuincena();
      return;
    }

    this.periodoExiste = false;
    this.modoEdicionPeriodo = false;
    this.modificarBloqueado = false;

    this.generarQuincena(false);
  });
}

  modificarPeriodo(): void {
    if (!this.periodoExiste) {
      this.mostrarAdvertencia('Primero debe crear o consultar el periodo.');
      return;
    }

    if (this.periodoCerrado) {
      this.mostrarAdvertencia(
        'El periodo está cerrado. No se puede modificar la quincena.'
      );
      return;
    }

    this.modoEdicionPeriodo = true;
    this.mostrarExito('Periodo habilitado para modificación.');
  }

actualizarQuincena(): void {
  if (!this.form.value.fechaPeriodo) {
    this.mostrarAdvertencia('Debe ingresar el periodo.');
    return;
  }

  if (this.form.invalid) {
    this.form.markAllAsTouched();
    this.mostrarAdvertencia('La fecha de quincena no es válida.');
    return;
  }

  this.validarEstadoCierreQuincena(() => {
    if (this.periodoCerrado) {
      this.modoEdicionPeriodo = false;
      this.modificarBloqueado = true;

      this.mostrarAdvertencia(
        'La quincena está cerrada. No se puede actualizar.'
      );

      this.cargarQuincena();
      return;
    }

    this.confirmarAccion(
      'Actualizar quincena',
      'Se volverá a generar la quincena seleccionada y se sobrescribirá la información existente. ¿Desea continuar?',
      'Sí, actualizar',
      'Cancelar'
    ).subscribe((confirmado: boolean) => {
      if (confirmado !== true) {
        return;
      }

      this.generarQuincena(true);
    });
  });
}
private generarQuincena(sobrescribir: boolean): void {
  if (this.periodoCerrado) {
    this.modoEdicionPeriodo = false;
    this.modificarBloqueado = true;

    this.mostrarAdvertencia(
      'La quincena está cerrada. No se puede generar ni modificar.'
    );

    return;
  }

  const request = this.construirRequestGenerar(sobrescribir);

  this.generando = true;
  this.procesandoModificar = true;

  this.rolNominaService.generarRolQuincena(request).subscribe({
    next: resp => {
      this.generando = false;
      this.procesandoModificar = false;

      if (resp.type === 'Success') {
        this.mostrarExito(resp.message ?? 'Quincena generada correctamente.');

        this.periodoExiste = true;
        this.periodoCerrado = false;
        this.modificarBloqueado = false;
        this.modoEdicionPeriodo = true;

        this.cargarQuincena();
        return;
      }

      if (resp.type === 'Warning') {
        this.mostrarAdvertencia(
          resp.message ?? 'La quincena ya existe. Use Modificar o Actualizar.'
        );

        this.periodoExiste = true;
        this.modoEdicionPeriodo = !this.periodoCerrado;
        this.modificarBloqueado = this.periodoCerrado;

        this.cargarQuincena();
        return;
      }

      this.mostrarError(resp.message ?? 'No se pudo generar la quincena.');
    },
    error: err => {
      this.generando = false;
      this.procesandoModificar = false;

      console.error('Error generando quincena:', err);
      this.mostrarError('Error al generar la quincena.');
    }
  });
}

cargarQuincena(): void {
  if (!this.form.value.fechaPeriodo) {
    this.mostrarAdvertencia('Debe ingresar el periodo.');
    return;
  }

  if (this.form.invalid) {
    this.form.markAllAsTouched();
    this.mostrarAdvertencia('La fecha de quincena no es válida.');
    return;
  }

  this.validarEstadoCierreQuincena(() => {
    this.cargarQuincenaDespuesDeValidarCierre();
  });
}
private construirColumnasGrid(): ColDef[] {
  const columnaSeleccion: ColDef = {
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
    checkboxSelection: params => !params.node?.rowPinned,
    headerCheckboxSelection: true,
    cellClass: 'cell-check-rol',
    headerClass: 'header-check-rol'
  };

  const columnaCodigo: ColDef = {
    headerName: 'Código',
    field: 'codigoEmpleado',
    width: 90,
    minWidth: 90,
    pinned: 'left',
    lockPinned: true,
    filter: true
  };

  const columnaEmpleado: ColDef = {
    headerName: 'Empleado',
    field: 'nombreEmpleado',
    width: 330,
    minWidth: 280,
    pinned: 'left',
    lockPinned: true,
    filter: true
  };

  const columnaIngresoQuincena: ColDef = {
    headerName: 'Valor',
    field: 'ingresoQuincena',
    width: 120,
    type: 'numericColumn',
    headerClass: 'header-ingreso',
    cellClass: params =>
      params.node?.rowPinned
        ? 'cell-ingreso cell-total-row'
        : 'cell-ingreso',
    cellStyle: {
      backgroundColor: '#f0fdf4',
      color: '#065f46',
      fontWeight: '600'
    },
    valueFormatter: (params: ValueFormatterParams) =>
      this.formatearDecimalValor(params.value)
  };

 const columnaDescuentoQuincena: ColDef = {
  headerName: 'Anticipo I Quincena',
  field: 'descuentoQuincena',
  colId: 'descuentoQuincena',
  width: 180,
  type: 'numericColumn',
  editable: params =>
    !params.node?.rowPinned &&
    this.modoEdicionPeriodo &&
    !this.periodoCerrado,
  valueParser: params => this.toNumber(params.newValue),
  valueSetter: params => {
    if (!params.data) {
      return false;
    }

    const nuevoValor = this.toNumber(params.newValue);
    const valorAnterior = this.toNumber(params.oldValue);

    params.data.descuentoQuincena = nuevoValor;
    params.data.totalDescuentos = nuevoValor;
    params.data.liquidoRecibir = nuevoValor;

    return nuevoValor !== valorAnterior;
  },
  headerClass: 'header-descuento',
  cellClass: params =>
    params.node?.rowPinned
      ? 'cell-descuento cell-total-row'
      : 'cell-descuento celda-editable-quincena',
  cellStyle: {
    backgroundColor: '#fefce8',
    color: '#854d0e',
    fontWeight: '600'
  },
  valueFormatter: (params: ValueFormatterParams) =>
    this.formatearDecimalValor(params.value)
};

  const columnaTotalIngresos: ColDef = {
    headerName: 'Total Ingresos',
    field: 'totalIngresos',
    width: 145,
    type: 'numericColumn',
    pinned: 'right',
    headerClass: 'header-total-ingresos',
    cellClass: params =>
      params.node?.rowPinned
        ? 'cell-total-row cell-total-ingresos'
        : 'cell-total-ingresos',
    cellStyle: {
      backgroundColor: '#dcfce7',
      color: '#166534',
      fontWeight: '800'
    },
    valueFormatter: (params: ValueFormatterParams) =>
      this.formatearDecimalValor(params.value)
  };

  const columnaTotalDescuentos: ColDef = {
    headerName: 'Total Descuentos',
    field: 'totalDescuentos',
    width: 165,
    type: 'numericColumn',
    pinned: 'right',
    headerClass: 'header-total-descuentos',
    cellClass: params =>
      params.node?.rowPinned
        ? 'cell-total-row cell-total-descuentos'
        : 'cell-total-descuentos',
    cellStyle: {
      backgroundColor: '#fef9c3',
      color: '#854d0e',
      fontWeight: '800'
    },
    valueFormatter: (params: ValueFormatterParams) =>
      this.formatearDecimalValor(params.value)
  };

  const columnaLiquido: ColDef = {
    headerName: 'Líquido a Recibir',
    field: 'liquidoRecibir',
    width: 165,
    type: 'numericColumn',
    pinned: 'right',
    headerClass: 'header-total-liquido',
    cellClass: params =>
      params.node?.rowPinned
        ? 'cell-total-row cell-total-liquido'
        : 'cell-total-liquido',
    cellStyle: {
      backgroundColor: '#dbeafe',
      color: '#1d4ed8',
      fontWeight: '900'
    },
    valueFormatter: (params: ValueFormatterParams) =>
      this.formatearDecimalValor(params.value)
  };

  return [
    columnaSeleccion,
    columnaCodigo,
    columnaEmpleado,

    {
      headerName: 'INGRESOS',
      headerClass: 'grupo-ingresos',
      marryChildren: true,
      children: [
        columnaIngresoQuincena
      ]
    } as any,

    {
      headerName: 'DESCUENTOS',
      headerClass: 'grupo-descuentos',
      marryChildren: true,
      children: [
        columnaDescuentoQuincena
      ]
    } as any,

    columnaTotalIngresos,
    columnaTotalDescuentos,
    columnaLiquido
  ];
}

 private construirFilaTotales(): any {
  const totalIngresos = this.detalleRol.reduce(
    (acc, item) => acc + this.toNumber(item.totalIngresos),
    0
  );

  const totalDescuentos = this.detalleRol.reduce(
    (acc, item) => acc + this.toNumber(item.totalDescuentos),
    0
  );

  const liquidoRecibir = this.detalleRol.reduce(
    (acc, item) => acc + this.toNumber(item.liquidoRecibir),
    0
  );

  return {
    idEmpleado: null,
    codigoEmpleado: '',
    nombreEmpleado: 'TOTALES',
    cedula: '',
    idLocal: null,
    local: '',
    ingresoQuincena: totalIngresos,
    descuentoQuincena: totalDescuentos,
    totalIngresos,
    totalDescuentos,
    liquidoRecibir
  };
}
  abrirModalBanco(): void {
    if (!this.periodoExiste) {
      this.mostrarAdvertencia('Primero debe generar o consultar la quincena.');
      return;
    }

    const fechaPeriodo = this.formatearFechaYYYYMMDD(
      this.form.value.fechaPeriodo
    );

    const dialogRef = this.dialog.open(DialogBancoNominaComponent, {
      width: '470px',
      disableClose: true,
      data: {
        fechaPeriodo,
        idUsuario: this.usuarioActual?.id_usuario ?? 1,
        origen: 'QUINCENA'
      }
    });

    dialogRef.componentInstance.archivoSolicitado.subscribe(
      (result: DialogBancoNominaResult) => {
        this.generarArchivoBancoQuincenaDesdeModal(result);
      }
    );

    dialogRef.afterClosed().subscribe(
      (result: DialogBancoNominaResult | null) => {
        if (!result) {
          return;
        }

        if (result.accion === 'REPORTE') {
          this.imprimirReporteFormaPagoQuincenaDesdeModal(result);
        }
      }
    );
  }

  private generarArchivoBancoQuincenaDesdeModal(
    result: DialogBancoNominaResult
  ): void {
    const request = {
      fechaPeriodo: result.fechaPeriodo,
      codBanco: result.codBanco,
      descripcionPago: result.descripcionPago,
      idLocal: this.nodoSeleccionado?.tipo === 'LOCAL'
        ? this.nodoSeleccionado.id
        : null,
      idDepartamento: this.nodoSeleccionado?.tipo === 'DEPARTAMENTO'
        ? this.nodoSeleccionado.id
        : null,
      idUsuario: result.idUsuario,
      numeroQuincena: this.toNumber(this.form.value.numeroQuincena) || 1
    };

    this.actualizando = true;

    this.rolNominaService.generarArchivoBancoQuincena(request).subscribe({
      next: resp => {
        this.actualizando = false;

        if (resp.type !== 'Success' || !resp.data?.procesado) {
          this.mostrarAdvertencia(
            resp.message ?? 'No se pudo generar el archivo banco de quincena.'
          );
          return;
        }

        this.descargarArchivoBancoBase64(
          resp.data.contenidoBase64,
          resp.data.nombreArchivo,
          resp.data.contentType
        );

        this.mostrarExito(
          resp.data.mensaje ?? 'Archivo banco de quincena generado correctamente.'
        );
      },
      error: err => {
        this.actualizando = false;

        console.error(err);
        this.mostrarError('Error al generar el archivo banco de quincena.');
      }
    });
  }

  private imprimirReporteFormaPagoQuincenaDesdeModal(
    result: DialogBancoNominaResult
  ): void {
    const request = {
      fechaPeriodo: result.fechaPeriodo,
      codBanco: result.codBanco,
      descripcionPago: result.descripcionPago,
      idLocal: this.nodoSeleccionado?.tipo === 'LOCAL'
        ? this.nodoSeleccionado.id
        : null,
      idDepartamento: this.nodoSeleccionado?.tipo === 'DEPARTAMENTO'
        ? this.nodoSeleccionado.id
        : null,
      idUsuario: result.idUsuario,
      numeroQuincena: this.toNumber(this.form.value.numeroQuincena) || 1
    };

    this.actualizando = true;

    this.rolNominaService.imprimirReporteFormaPagoQuincena(request).subscribe({
      next: blob => {
        this.actualizando = false;

        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');

        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 30000);
      },
      error: err => {
        this.actualizando = false;

        console.error(err);
        this.mostrarError('Error al imprimir el reporte de forma de pago de quincena.');
      }
    });
  }

  async exportarQuincenaExcel(): Promise<void> {
    if (!this.detalleRol || this.detalleRol.length === 0) {
      this.mostrarAdvertencia('No existen datos para exportar.');
      return;
    }

    this.exportandoExcel = true;

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Rol Quincena');

      const fechaPeriodo = this.formatearFechaYYYYMMDD(
        this.form.value.fechaPeriodo
      );

      const totalColumnas = 9;

      worksheet.mergeCells(1, 1, 1, totalColumnas);
      worksheet.getCell(1, 1).value = 'GENERACIÓN DE ROLES QUINCENALES';
      worksheet.getCell(1, 1).font = { bold: true, size: 14 };
      worksheet.getCell(1, 1).alignment = {
        horizontal: 'center',
        vertical: 'middle'
      };

      worksheet.mergeCells(2, 1, 2, totalColumnas);
      worksheet.getCell(2, 1).value =
        `Periodo: ${fechaPeriodo} - Quincena ${this.form.value.numeroQuincena}`;
      worksheet.getCell(2, 1).font = { bold: true, size: 10 };
      worksheet.getCell(2, 1).alignment = {
        horizontal: 'center',
        vertical: 'middle'
      };

      worksheet.addRow([]);

      const headers = [
        'Código',
        'Cédula',
        'Empleado',
        'Local',
        'Forma Pago',
        'Banco',
        'Cuenta',
        'Valor Quincena',
        'Estado'
      ];

      const headerRow = worksheet.addRow(headers);

      headerRow.eachCell(cell => {
        cell.font = { bold: true, size: 9 };
        cell.border = this.bordeExcel();
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF1F5F9' }
        };
      });

      this.detalleRol.forEach(item => {
        const row = worksheet.addRow([
          item.codigoEmpleado ?? '',
          item.cedula ?? '',
          item.nombreEmpleado ?? '',
          item.local ?? '',
          item.formaPago ?? '',
          item.banco ?? '',
          item.cuenta ?? '',
          this.toNumber(item.valorQuincena),
          item.estado ?? ''
        ]);

        row.eachCell((cell, colNumber) => {
          cell.border = this.bordeExcel();
          cell.font = { size: 9 };
          cell.alignment = {
            vertical: 'middle',
            horizontal: colNumber === 8 ? 'right' : 'left'
          };

          if (colNumber === 8) {
            cell.numFmt = '#,##0.00';
          }
        });
      });

      const total = this.detalleRol.reduce(
        (acc, item) => acc + this.toNumber(item.valorQuincena),
        0
      );

      const totalRow = worksheet.addRow([
        '',
        '',
        'TOTALES',
        '',
        '',
        '',
        '',
        total,
        ''
      ]);

      totalRow.eachCell((cell, colNumber) => {
        cell.border = this.bordeExcel();
        cell.font = { bold: true, size: 9 };
        cell.alignment = {
          vertical: 'middle',
          horizontal: colNumber === 8 ? 'right' : 'left'
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE2E8F0' }
        };

        if (colNumber === 8) {
          cell.numFmt = '#,##0.00';
        }
      });

      worksheet.getColumn(1).width = 12;
      worksheet.getColumn(2).width = 16;
      worksheet.getColumn(3).width = 38;
      worksheet.getColumn(4).width = 22;
      worksheet.getColumn(5).width = 18;
      worksheet.getColumn(6).width = 24;
      worksheet.getColumn(7).width = 20;
      worksheet.getColumn(8).width = 18;
      worksheet.getColumn(9).width = 16;

      worksheet.views = [
        {
          state: 'frozen',
          ySplit: 4,
          xSplit: 2
        }
      ];

      worksheet.autoFilter = {
        from: { row: 4, column: 1 },
        to: { row: 4, column: totalColumnas }
      };

      const buffer = await workbook.xlsx.writeBuffer();

      const nombreArchivo =
        `Rol_Quincena_${fechaPeriodo}_Q${this.form.value.numeroQuincena}.xlsx`;

      saveAs(
        new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }),
        nombreArchivo
      );

      this.mostrarExito('Archivo Excel generado correctamente.');
    } catch (error) {
      console.error(error);
      this.mostrarError('No se pudo exportar la quincena a Excel.');
    } finally {
      this.exportandoExcel = false;
    }
  }

  cancelar(): void {
    this.limpiarDatosPeriodo();

    const nodoRaiz = this.nodos.find(x =>
      x.nombre === 'Emisión de Quincenas' ||
      x.tipo === 'GENERAL'
    );

    if (nodoRaiz) {
      nodoRaiz.expandido = false;
      this.nodoSeleccionado = nodoRaiz;
    }

    this.periodoCerrado = false;
    this.validandoCierre = false;
    this.generando = false;
    this.cargando = false;
    this.actualizando = false;
    this.procesandoModificar = false;
    this.modificarBloqueado = false;

    this.gridApi?.deselectAll();
    this.gridApi?.refreshCells({ force: true });

    this.mostrarAdvertencia('Operación cancelada.');
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;

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

  onCellDoubleClicked(event: any): void {
    if (event?.node?.rowPinned) {
      return;
    }
  }

  private construirRequestGenerar(
    sobrescribir: boolean
  ): GenerarRolQuincenaRequest {
    const tipoNodo = this.nodoSeleccionado?.tipo ?? 'GENERAL';

    return {
      fechaPeriodo: this.formatearFechaYYYYMMDD(this.form.value.fechaPeriodo),

      numeroQuincena: this.toNumber(this.form.value.numeroQuincena) || 1,

      idLocal: tipoNodo === 'LOCAL'
        ? this.nodoSeleccionado!.id
        : null,

      idDepartamento: tipoNodo === 'DEPARTAMENTO'
        ? this.nodoSeleccionado!.id
        : null,

      idUsuario: this.usuarioActual?.id_usuario ?? 1,

      sobrescribir
    };
  }

  private construirRequestConsulta(): RolQuincenaRequest {
    const tipoNodo = this.nodoSeleccionado?.tipo ?? 'GENERAL';

    return {
      fechaPeriodo: this.formatearFechaYYYYMMDD(this.form.value.fechaPeriodo),

      numeroQuincena: this.toNumber(this.form.value.numeroQuincena) || 1,

      idLocal: tipoNodo === 'LOCAL'
        ? this.nodoSeleccionado!.id
        : null,

      idDepartamento: tipoNodo === 'DEPARTAMENTO'
        ? this.nodoSeleccionado!.id
        : null
    };
  }

  private cargarLocalesArbol(): void {
    this.localesService.getAll().subscribe({
      next: response => {
        const locales = response.data ?? [];

        const raiz = this.nodos[0];

        raiz.hijos = locales.map((local: any) => ({
          id: Number(local.id),
          nombre: local.nombre ?? `Local ${local.id}`,
          tipo: 'LOCAL' as const,
          expandido: false,
          hijos: []
        }));
      },
      error: err => {
        console.error(err);
        this.mostrarError('No se pudieron cargar los locales.');
      }
    });
  }
private validarEstadoCierreQuincena(callback?: () => void): void {
  if (!this.form.value.fechaPeriodo) {
    this.periodoCerrado = false;
    this.modificarBloqueado = false;

    if (callback) {
      callback();
    }

    return;
  }

  const request: any = {
    fecha: this.formatearFechaYYYYMMDD(this.form.value.fechaPeriodo),
    tipo: 'Q'
  };

  this.validandoCierre = true;

  this.cierrePeriodoService.validar(request).subscribe({
    next: resp => {
      this.validandoCierre = false;

      this.periodoCerrado =
        resp.type === 'Success' &&
        resp.data?.existe === true;

      this.modificarBloqueado = this.periodoCerrado;

      if (!this.periodoCerrado) {
        this.modificarBloqueado = false;
      }

      if (callback) {
        callback();
      }
    },
    error: err => {
      this.validandoCierre = false;
      this.periodoCerrado = false;
      this.modificarBloqueado = false;

      console.error(err);

      if (callback) {
        callback();
      }
    }
  });
}
private limpiarDatosPeriodo(): void {
  this.detalleRol = [];
  this.pinnedBottomRowData = [];

  this.periodoExiste = false;
  this.periodoCerrado = false;
  this.validandoCierre = false;
  this.modoEdicionPeriodo = false;

  this.procesandoModificar = false;
  this.modificarBloqueado = false;

  this.gridApi?.deselectAll();

  this.gridApi?.setGridOption?.('rowData', []);
  this.gridApi?.setGridOption?.('pinnedBottomRowData', []);

  this.gridApi?.refreshCells({ force: true });
  this.gridApi?.refreshHeader();
}

  private ajustarGrid(): void {
    if (!this.gridApi) {
      return;
    }

    setTimeout(() => {
      this.gridApi.refreshHeader();
      this.gridApi.refreshCells({ force: true });
    }, 50);
  }

  soloFechaQuincena = (fecha: Date | null): boolean => {
    if (!fecha) {
      return false;
    }

    const numeroQuincena = this.toNumber(this.form?.value?.numeroQuincena) || 1;

    if (numeroQuincena === 2) {
      const ultimoDia = new Date(
        fecha.getFullYear(),
        fecha.getMonth() + 1,
        0
      ).getDate();

      return fecha.getDate() === ultimoDia;
    }

    return fecha.getDate() === 15;
  };

  validarDiaQuincena(control: AbstractControl): ValidationErrors | null {
    const fecha = control.value;

    if (!fecha) {
      return null;
    }

    const date = fecha instanceof Date
      ? fecha
      : new Date(fecha);

    if (isNaN(date.getTime())) {
      return { fechaInvalida: true };
    }

    const numeroQuincena = this.toNumber(this.form?.value?.numeroQuincena) || 1;

    if (numeroQuincena === 2) {
      const ultimoDia = new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0
      ).getDate();

      return date.getDate() === ultimoDia
        ? null
        : { fechaInvalida: true };
    }

    return date.getDate() === 15
      ? null
      : { fechaInvalida: true };
  }

 private obtenerDiaQuincenaActual(): Date {
  const hoy = new Date();

  return new Date(
    hoy.getFullYear(),
    hoy.getMonth(),
    15
  );
}

  private obtenerFechaSegunQuincena(fechaBase: any): Date {
    const fecha = fechaBase instanceof Date
      ? fechaBase
      : new Date(fechaBase);

    const numeroQuincena = this.toNumber(this.form?.value?.numeroQuincena) || 1;

    if (numeroQuincena === 2) {
      return new Date(
        fecha.getFullYear(),
        fecha.getMonth() + 1,
        0
      );
    }

    return new Date(
      fecha.getFullYear(),
      fecha.getMonth(),
      15
    );
  }

  private formatearFechaYYYYMMDD(value: any): string {
    if (!value) {
      return '';
    }

    if (typeof value === 'string') {
      if (value.includes('/')) {
        const partes = value.split('/');

        if (partes.length === 3) {
          const dia = partes[0].padStart(2, '0');
          const mes = partes[1].padStart(2, '0');
          const anio = partes[2];

          return `${anio}-${mes}-${dia}`;
        }
      }

      return value.substring(0, 10);
    }

    const fecha = value as Date;

    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;
  }

  private toNumber(value: any): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }

    const n = Number(value);

    return isNaN(n) ? 0 : n;
  }

  private formatearDecimalValor(value: any): string {
    const n = this.toNumber(value);

    return n.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  private descargarArchivoBancoBase64(
    contenidoBase64: string,
    nombreArchivo: string,
    contentType: string = 'text/plain'
  ): void {
    const byteCharacters = atob(contenidoBase64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);

    const blob = new Blob([byteArray], {
      type: contentType
    });

    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    link.click();

    window.URL.revokeObjectURL(url);
  }

  private bordeExcel(): Partial<ExcelJS.Borders> {
    return {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  }

  private confirmarAccion(
    titulo: string,
    mensaje: string,
    textoConfirmar: string = 'Sí, confirmar',
    textoCancelar: string = 'Cancelar'
  ) {
    return this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      disableClose: true,
      data: {
        title: titulo,
        message: mensaje,
        type: 'info',
        confirmText: textoConfirmar,
        cancelText: textoCancelar,
        showCancel: true
      }
    }).afterClosed();
  }

  private mostrarExito(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['snackbar-success']
    });
  }

  private mostrarError(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 7000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['snackbar-error']
    });
  }

  private mostrarAdvertencia(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 6000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['snackbar-warning']
    });
  }
  onCellValueChanged(event: any): void {
  const colId =
    event?.column?.getColId?.() ??
    event?.colDef?.colId ??
    '';

  if (colId !== 'descuentoQuincena') {
    return;
  }

  if (event?.node?.rowPinned) {
    return;
  }

  const empleado = event.data;

  if (!empleado || !empleado.idEmpleado) {
    this.mostrarAdvertencia('No se encontró el empleado de la fila.');
    return;
  }

  if (this.periodoCerrado) {
    this.mostrarAdvertencia('La quincena está cerrada. No se puede modificar.');
    this.revertirValorQuincena(event);
    return;
  }

  if (!this.modoEdicionPeriodo) {
    this.mostrarAdvertencia('Debe habilitar el periodo en modo modificación.');
    this.revertirValorQuincena(event);
    return;
  }

  const valorQuincena = this.toNumber(empleado.descuentoQuincena);

  if (valorQuincena < 0) {
    this.mostrarAdvertencia('El valor de la quincena no puede ser negativo.');
    this.revertirValorQuincena(event);
    return;
  }

  this.recalcularFilaQuincena(empleado);
  this.recalcularTotalesQuincena();

  const request = {
    fechaPeriodo: this.formatearFechaYYYYMMDD(this.form.value.fechaPeriodo),
    numeroQuincena: this.toNumber(this.form.value.numeroQuincena) || 1,
    idEmpleado: Number(empleado.idEmpleado),
    valorQuincena,
    idUsuario: this.usuarioActual?.id_usuario ?? 1
  };

  this.actualizando = true;

  this.rolNominaService.actualizarValorQuincena(request).subscribe({
    next: resp => {
      this.actualizando = false;

      if (resp.type !== 'Success') {
        this.mostrarAdvertencia(
          resp.message ?? 'No se pudo actualizar el valor de la quincena.'
        );

        this.revertirValorQuincena(event);
        return;
      }

      this.mostrarExito(resp.message ?? 'Valor de quincena actualizado correctamente.');

      event.api.refreshCells({
        force: true,
        rowNodes: [event.node]
      });

      this.recalcularTotalesQuincena();
    },
    error: err => {
      this.actualizando = false;

      console.error(err);
      this.mostrarError('Error al actualizar el valor de la quincena.');

      this.revertirValorQuincena(event);
    }
  });
}
private recalcularFilaQuincena(empleado: any): void {
  const valorQuincena = this.toNumber(empleado.descuentoQuincena);

  empleado.ingresoQuincena = 0;
  empleado.descuentoQuincena = valorQuincena;
  empleado.totalIngresos = 0;
  empleado.totalDescuentos = valorQuincena;

  /*
   * En esta pantalla el líquido representa el valor a pagar de la quincena.
   * Aunque contablemente luego se descuente en el mensual como D-02.
   */
  empleado.liquidoRecibir = valorQuincena;
}

private recalcularTotalesQuincena(): void {
  this.pinnedBottomRowData = this.detalleRol.length > 0
    ? [this.construirFilaTotales()]
    : [];

  this.gridApi?.refreshCells({
    force: true
  });
}

private revertirValorQuincena(event: any): void {
  const empleado = event?.data;

  if (!empleado) {
    return;
  }

  const valorAnterior = this.toNumber(event.oldValue);

  empleado.descuentoQuincena = valorAnterior;
  empleado.totalDescuentos = valorAnterior;
  empleado.liquidoRecibir = valorAnterior;

  event.api.refreshCells({
    force: true,
    rowNodes: event.node ? [event.node] : undefined
  });

  this.recalcularTotalesQuincena();
}
private cargarQuincenaDespuesDeValidarCierre(): void {
  const request = this.construirRequestConsulta();

  this.cargando = true;

  this.rolNominaService.getRolQuincena(request).subscribe({
    next: resp => {
      this.cargando = false;

      if (resp.type !== 'Success') {
        this.detalleRol = [];
        this.pinnedBottomRowData = [];
        this.periodoExiste = false;
        this.modoEdicionPeriodo = false;
        this.modificarBloqueado = false;

        this.mostrarAdvertencia(
          resp.message ?? 'No se pudo cargar la quincena.'
        );
        return;
      }

      const data = resp.data as RolQuincenaResponse;

      this.detalleRol = (data?.empleados ?? []).map((x: any) => {
        const valorQuincena = this.toNumber(x.valorQuincena);

        return {
          idEmpleado: x.idEmpleado,
          codigoEmpleado: x.codigoEmpleado,
          nombreEmpleado: x.nombreEmpleado || `Empleado ${x.codigoEmpleado ?? x.idEmpleado}`,
          cedula: x.cedula ?? '',
          idLocal: x.idLocal,
          local: x.local ?? '',
          formaPago: x.formaPago ?? '',
          banco: x.banco ?? '',
          cuenta: x.cuenta ?? '',
          estado: x.estado ?? '',

          ingresoQuincena: 0,
          descuentoQuincena: valorQuincena,
          totalIngresos: 0,
          totalDescuentos: valorQuincena,
          liquidoRecibir: valorQuincena
        };
      });

      this.periodoExiste = this.detalleRol.length > 0;

      /*
       * Si existe cierre en rol.cierre_periodo con tipo Q,
       * la quincena queda solo consulta.
       */
      this.modoEdicionPeriodo = this.periodoExiste && !this.periodoCerrado;
      this.modificarBloqueado = this.periodoCerrado;

      this.columnDefs = this.construirColumnasGrid();

      this.pinnedBottomRowData = this.detalleRol.length > 0
        ? [this.construirFilaTotales()]
        : [];

      if (this.periodoCerrado) {
        this.mostrarAdvertencia(
          'La quincena está cerrada. La información queda solo para consulta.'
        );
      }

      setTimeout(() => {
        this.gridApi?.setGridOption?.('rowData', this.detalleRol);
        this.gridApi?.setGridOption?.('pinnedBottomRowData', this.pinnedBottomRowData);
        this.gridApi?.refreshCells({ force: true });
        this.gridApi?.refreshHeader();
      }, 50);
    },
    error: err => {
      this.cargando = false;

      console.error(err);
      this.mostrarError('Error al cargar la quincena.');

      this.detalleRol = [];
      this.pinnedBottomRowData = [];
      this.periodoExiste = false;
      this.modoEdicionPeriodo = false;
      this.modificarBloqueado = false;
    }
  });
}
}