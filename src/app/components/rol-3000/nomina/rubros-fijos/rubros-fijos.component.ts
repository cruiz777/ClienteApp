import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import * as ExcelJS from 'exceljs';
import {
  CargaGlobalRubrosFijosResult,
  DialogCargaGlobalRubrosFijosComponent
} from './dialog-carga-global-rubros-fijo/dialog-carga-global-rubros-fijo.component';

import {
  CellValueChangedEvent,
  ColDef,
  GridApi,
  GridReadyEvent,
  ValueFormatterParams
} from 'ag-grid-community';

import { LocalesService } from 'src/app/services/locales.service';
import { UsuarioService } from 'src/app/services/usuario.service';

import {
  RubroFijoEmpleadoResponse,
  RubroFijoRubroResponse,
  RubrosFijosService
} from 'src/app/services/rol/rubros-fijos.service';

interface TreeNode {
  id: number;
  label: string;
  tipo?: 'ROOT_LOCAL' | 'LOCAL' | 'ROOT_RUBRO' | 'RUBRO';
  tipoPago?: string;
  codigo?: string;
  descripcion?: string;
  children?: TreeNode[];
  expanded?: boolean;
  checked?: boolean;
  selected?: boolean;
}
interface FilaRubroFijoExcel {
  codigoEmpleado: string;
  nombreEmpleado: string;
  numeroCedula: string;
  local: string;
  valor: number | null;
}
@Component({
  selector: 'app-rubros-fijos',
  templateUrl: './rubros-fijos.component.html',
  styleUrls: ['./rubros-fijos.component.css']
})
export class RubrosFijosComponent implements OnInit {
  localesTree: TreeNode[] = [];
  rubrosTree: TreeNode[] = [];

  dataSource: RubroFijoEmpleadoResponse[] = [];

  columnDefs: ColDef[] = [];
  pinnedBottomRowData: any[] = [];

  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true
  };

  private gridApi!: GridApi;

  rubroSeleccionado: RubroFijoRubroResponse | null = null;

  cargandoLocales = false;
  cargandoRubros = false;
  cargandoEmpleados = false;
  guardando = false;

  reemplazarRubro = false;
  fechaPeriodoOrigen: string | null = null;
  idLocalOrigen: number | null = null;
  origen: string | null = null;

  totalValor = 0;
  totalCobrado = 0;
  totalPendiente = 0;

  usuarioActual: any;

  constructor(
    private readonly localesService: LocalesService,
    private readonly rubrosFijosService: RubrosFijosService,
    private readonly usuarioService: UsuarioService,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {
    this.usuarioActual = this.usuarioService.getUsuarioActual();
  }

  ngOnInit(): void {
    this.columnDefs = this.construirColumnasGrid();

    this.route.queryParams.subscribe(params => {
      this.fechaPeriodoOrigen = params['fechaPeriodo'] ?? null;
      this.idLocalOrigen = params['idLocal']
        ? Number(params['idLocal'])
        : null;
      this.origen = params['origen'] ?? null;

      this.cargarLocales();
      this.cargarRubros();
    });
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;

    setTimeout(() => {
      this.gridApi?.sizeColumnsToFit();
      this.actualizarGrid();
    }, 100);
  }

  onGridSizeChanged(): void {
    this.gridApi?.sizeColumnsToFit();
  }

  private construirColumnasGrid(): ColDef[] {
    return [
      {
        headerName: '',
        field: 'secuencial',
        width: 70,
        minWidth: 60,
        maxWidth: 80,
        pinned: 'left',
        cellClass: params =>
          params.node?.rowPinned ? 'cell-total-row' : ''
      },
      {
        headerName: 'Código',
        field: 'codigoEmpleado',
        width: 110,
        minWidth: 100,
        pinned: 'left',
        filter: true
      },
      {
        headerName: 'Número de Cédula',
        field: 'numeroCedula',
        hide: true,
        suppressColumnsToolPanel: false,
        filter: true
      },
      {
        headerName: 'Local',
        field: 'local',
        hide: true,
        suppressColumnsToolPanel: false,
        filter: true
      },
      {
        headerName: 'Nombre',
        field: 'nombreEmpleado',
        width: 360,
        minWidth: 280,
        pinned: 'left',
        filter: true,
        cellClass: params =>
          params.node?.rowPinned ? 'cell-total-row' : ''
      },
      {
        headerName: 'Valor',
        field: 'valor',
        width: 130,
        minWidth: 120,
        type: 'numericColumn',
        editable: params => !params.node?.rowPinned,
        valueParser: params => this.toNumber(params.newValue),
        valueFormatter: (params: ValueFormatterParams) =>
          this.formatearDecimal(params.value),
        cellClass: params =>
          params.node?.rowPinned
            ? 'cell-total-row cell-number'
            : 'cell-number cell-editable'
      },
      {
        headerName: 'No. Cuotas',
        field: 'numCuotas',
        width: 135,
        minWidth: 120,
        type: 'numericColumn',
        editable: params => !params.node?.rowPinned,
        valueParser: params => this.toNumber(params.newValue),
        valueFormatter: (params: ValueFormatterParams) =>
          this.formatearDecimal(params.value),
        cellClass: params =>
          params.node?.rowPinned
            ? 'cell-total-row cell-number'
            : 'cell-number cell-editable'
      },
      {
        headerName: 'Cuotas Pagadas',
        field: 'cuotasPagadas',
        width: 165,
        minWidth: 145,
        type: 'numericColumn',
        editable: params => !params.node?.rowPinned,
        valueParser: params => this.toNumber(params.newValue),
        valueFormatter: (params: ValueFormatterParams) =>
          this.formatearDecimal(params.value),
        cellClass: params =>
          params.node?.rowPinned
            ? 'cell-total-row cell-number'
            : 'cell-number cell-editable'
      },
      {
        headerName: 'Observaciones',
        field: 'observacion',
        width: 300,
        minWidth: 220,
        editable: params => !params.node?.rowPinned,
        cellClass: params =>
          params.node?.rowPinned ? 'cell-total-row' : 'cell-editable'
      },
      {
        headerName: 'Observaciones Internas',
        field: 'observacionInterna',
        width: 360,
        minWidth: 260,
        editable: params => !params.node?.rowPinned,
        cellClass: params =>
          params.node?.rowPinned ? 'cell-total-row' : 'cell-editable'
      }
    ];
  }
  cargarLocales(): void {
    this.cargandoLocales = true;

    this.localesService.getAll().subscribe({
      next: resp => {
        this.cargandoLocales = false;

        const locales = resp.data ?? [];

        const localesMapeados: TreeNode[] = locales.map((x: any) => {
          const idLocal = Number(
            x.id ??
            x.idLocal ??
            x.id_local ??
            x.codloc ??
            x.codLoc
          );

          const nombreLocal = (
            x.nombre ??
            x.nomloc ??
            x.nomLoc ??
            x.descripcion ??
            `Local ${idLocal}`
          ).toString();

          return {
            id: idLocal,
            label: nombreLocal,
            tipo: 'LOCAL',
            // checked: this.idLocalOrigen
            //   ? idLocal === this.idLocalOrigen
            //   : nombreLocal.trim().toUpperCase() === 'ADMINISTRATIVO'
          };
        });

        this.localesTree = [
          {
            id: 0,
            label: 'Listado de Locales',
            tipo: 'ROOT_LOCAL',
            expanded: true,
            checked: false,
            children: localesMapeados
          }
        ];

        this.actualizarCheckPadreLocales();
      },
      error: err => {
        this.cargandoLocales = false;
        console.error(err);
        this.mostrarError('No se pudieron cargar los locales.');
      }
    });
  }

  cargarRubros(): void {
    this.cargandoRubros = true;

    this.rubrosFijosService.getRubros().subscribe({
      next: resp => {
        this.cargandoRubros = false;

        if (resp.type !== 'Success') {
          this.mostrarAdvertencia(
            resp.message ?? 'No se pudieron cargar los rubros.'
          );
          return;
        }

        const rubros = resp.data ?? [];

        const ingresos = rubros
          .filter(x => (x.tipoPago ?? '').toUpperCase() === 'I')
          .map(x => this.rubroToNode(x));

        const egresos = rubros
          .filter(x => (x.tipoPago ?? '').toUpperCase() === 'D')
          .map(x => this.rubroToNode(x));

        this.rubrosTree = [
          {
            id: 100000,
            label: 'Ingresos',
            tipo: 'ROOT_RUBRO',
            expanded: false,
            children: ingresos
          },
          {
            id: 200000,
            label: 'Egresos',
            tipo: 'ROOT_RUBRO',
            expanded: false,
            children: egresos
          }
        ];
      },
      error: err => {
        this.cargandoRubros = false;
        console.error(err);
        this.mostrarError('No se pudieron cargar los rubros.');
      }
    });
  }

  private rubroToNode(rubro: RubroFijoRubroResponse): TreeNode {
    return {
      id: rubro.idIngDesc,
      label: `${rubro.codigo} - ${rubro.descripcion}`,
      tipo: 'RUBRO',
      tipoPago: rubro.tipoPago,
      codigo: rubro.codigo,
      descripcion: rubro.descripcion,
      selected: false
    };
  }

  toggleNode(node: TreeNode): void {
    node.expanded = !node.expanded;
  }

  toggleCheck(node: TreeNode): void {
    node.checked = !node.checked;

    if (node.tipo === 'ROOT_LOCAL') {
      node.children?.forEach(child => {
        child.checked = node.checked;
      });
    }

    this.actualizarCheckPadreLocales();
  }

  seleccionarRubro(node: TreeNode): void {
    if (node.tipo !== 'RUBRO') {
      return;
    }

    this.limpiarSeleccionRubros();

    node.selected = true;

    this.rubroSeleccionado = {
      idIngDesc: node.id,
      tipoPago: node.tipoPago ?? '',
      codigo: node.codigo ?? '',
      descripcion: node.descripcion ?? node.label
    };

    if (this.localesSeleccionados().length > 0) {
      this.cargarEmpleados();
    }
  }

  cargarEmpleados(): void {
    if (!this.rubroSeleccionado) {
      this.mostrarAdvertencia('Debe seleccionar un rubro.');
      return;
    }

    const idLocales = this.localesSeleccionados();

    if (idLocales.length === 0) {
      this.mostrarAdvertencia('Debe seleccionar al menos un local.');
      return;
    }

    this.cargandoEmpleados = true;

    this.rubrosFijosService.cargar({
      idLocales,
      idIngDesc: this.rubroSeleccionado.idIngDesc
    }).subscribe({
      next: resp => {
        this.cargandoEmpleados = false;

        if (resp.type !== 'Success') {
          this.dataSource = [];
          this.recalcularTotales();
          this.actualizarGrid();

          this.mostrarAdvertencia(
            resp.message ?? 'No se pudo cargar la información.'
          );
          return;
        }

        this.dataSource = [...(resp.data?.empleados ?? [])];

        this.totalValor = this.toNumber(resp.data?.totalValor);
        this.totalCobrado = this.toNumber(resp.data?.totalCobrado);
        this.totalPendiente = this.toNumber(resp.data?.totalPendiente);

        this.reemplazarRubro = false;

        this.actualizarGrid();

        if (this.dataSource.length === 0) {
          this.mostrarAdvertencia(
            'No existen empleados para los locales seleccionados.'
          );
        }
      },
      error: err => {
        this.cargandoEmpleados = false;
        console.error(err);
        this.mostrarError('Error al cargar empleados.');
      }
    });
  }

  cargarGlobal(): void {
    if (this.dataSource.length === 0) {
      this.mostrarAdvertencia('Primero debe cargar empleados.');
      return;
    }

    const dialogRef = this.dialog.open(DialogCargaGlobalRubrosFijosComponent, {
      width: '600px',
      maxWidth: '95vw',
      disableClose: true,
      autoFocus: false,
      panelClass: 'carga-global-panel'
    });
    dialogRef.afterClosed().subscribe((result: CargaGlobalRubrosFijosResult | null) => {
      if (!result) {
        return;
      }

      const tieneValor = result.valor !== null && result.valor !== undefined;
      const tieneNumCuotas = result.numCuotas !== null && result.numCuotas !== undefined;
      const tieneCuotasPagadas = result.cuotasPagadas !== null && result.cuotasPagadas !== undefined;

      if (!tieneValor && !tieneNumCuotas && !tieneCuotasPagadas) {
        this.mostrarAdvertencia('No se ingresó ningún valor para aplicar.');
        return;
      }

      this.dataSource = this.dataSource.map(item => ({
        ...item,
        valor: tieneValor
          ? this.toNumber(result.valor)
          : this.toNumber(item.valor),

        numCuotas: tieneNumCuotas
          ? this.toNumber(result.numCuotas)
          : this.toNumber(item.numCuotas),

        cuotasPagadas: tieneCuotasPagadas
          ? this.toNumber(result.cuotasPagadas)
          : this.toNumber(item.cuotasPagadas)
      }));

      this.reemplazarRubro = true;
      this.recalcularTotales();
      this.actualizarGrid();

      this.mostrarExito('Carga global aplicada. Presione Grabar para guardar.');
    });
  }
  nuevo(): void {
    this.localesTree.forEach(root => {
      root.checked = false;

      root.children?.forEach(child => {
        child.checked = false;
      });
    });

    this.limpiarSeleccionRubros();

    this.rubroSeleccionado = null;
    this.dataSource = [];
    this.reemplazarRubro = false;

    this.recalcularTotales();
    this.actualizarGrid();
  }

  grabar(): void {
    if (!this.rubroSeleccionado) {
      this.mostrarAdvertencia('Debe seleccionar un rubro.');
      return;
    }

    if (this.dataSource.length === 0) {
      this.mostrarAdvertencia('No existen empleados para grabar.');
      return;
    }

    const request = {
      idIngDesc: this.rubroSeleccionado.idIngDesc,
      reemplazarRubro: this.reemplazarRubro,
      idUsuario:
        this.usuarioActual?.id_usuario ??
        this.usuarioActual?.idUsuario ??
        this.usuarioActual?.id ??
        1,
      empleados: this.dataSource.map(x => ({
        idEmpleado: x.idEmpleado,
        idLocal: x.idLocal ?? null,
        valor: this.toNumber(x.valor),
        cantiIe: this.toNumber(x.cantiIe),
        numCuotas: this.toNumber(x.numCuotas),
        cuotasPagadas: this.toNumber(x.cuotasPagadas),
        observacion: x.observacion ?? null,
        observacionInterna: x.observacionInterna ?? null
      }))
    };

    this.guardando = true;

    this.rubrosFijosService.guardar(request).subscribe({
      next: resp => {
        this.guardando = false;

        if (resp.type === 'Success') {
          this.mostrarExito(
            resp.message ?? 'La información ha sido grabada con éxito.'
          );

          this.reemplazarRubro = false;
          this.cargarEmpleados();
          return;
        }

        if (resp.type === 'Warning') {
          this.mostrarAdvertencia(resp.message ?? 'No se pudo grabar.');
          return;
        }

        this.mostrarError(resp.message ?? 'No se pudo grabar.');
      },
      error: err => {
        this.guardando = false;
        console.error(err);
        this.mostrarError('Error al grabar rubros fijos.');
      }
    });
  }

  exportar(): void {
    this.mostrarAdvertencia('Exportación pendiente de implementar.');
  }

  cancelar(): void {
    this.nuevo();
    this.mostrarAdvertencia('Operación cancelada.');
  }

  onCellValueChanged(event: CellValueChangedEvent): void {
    if (event.node?.rowPinned) {
      return;
    }

    this.recalcularTotales();
    this.actualizarFilaTotales();
  }

  private localesSeleccionados(): number[] {
    const root = this.localesTree[0];

    return root?.children
      ?.filter(x => x.checked === true)
      .map(x => x.id) ?? [];
  }

  private actualizarCheckPadreLocales(): void {
    const root = this.localesTree[0];

    if (!root?.children?.length) {
      return;
    }

    root.checked = root.children.every(x => x.checked === true);
  }

  private limpiarSeleccionRubros(): void {
    this.rubrosTree.forEach(root => {
      root.children?.forEach(child => {
        child.selected = false;
      });
    });
  }

  private recalcularTotales(): void {
    this.totalValor = this.dataSource.reduce(
      (acc, x) => acc + this.toNumber(x.valor),
      0
    );

    this.totalCobrado = this.dataSource.reduce(
      (acc, x) =>
        acc + this.toNumber(x.valor) * this.toNumber(x.cuotasPagadas),
      0
    );

    this.totalPendiente = this.dataSource.reduce((acc, x) => {
      const numCuotas = this.toNumber(x.numCuotas);
      const cuotasPagadas = this.toNumber(x.cuotasPagadas);

      if (numCuotas <= 0) {
        return acc;
      }

      return acc + this.toNumber(x.valor) * (numCuotas - cuotasPagadas);
    }, 0);
  }

  private construirFilaTotales(): any {
    return {
      secuencial: '',
      codigoEmpleado: '',
      nombreEmpleado: 'TOTALES',
      valor: this.totalValor,
      numCuotas: '',
      cuotasPagadas: '',
      observacion: `Cobrado: ${this.formatearDecimal(this.totalCobrado)}`,
      observacionInterna: `Pendiente: ${this.formatearDecimal(this.totalPendiente)}`
    };
  }

  private actualizarFilaTotales(): void {
    this.pinnedBottomRowData = this.dataSource.length > 0
      ? [this.construirFilaTotales()]
      : [];

    this.gridApi?.setGridOption(
      'pinnedBottomRowData',
      this.pinnedBottomRowData
    );
  }

  private actualizarGrid(): void {
    this.recalcularTotales();

    this.pinnedBottomRowData = this.dataSource.length > 0
      ? [this.construirFilaTotales()]
      : [];

    setTimeout(() => {
      this.gridApi?.setGridOption('rowData', this.dataSource);
      this.gridApi?.setGridOption(
        'pinnedBottomRowData',
        this.pinnedBottomRowData
      );
      this.gridApi?.refreshCells({ force: true });
    }, 50);
  }

  private toNumber(value: any): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }

    const n = Number(String(value).replace(',', '.'));

    return isNaN(n) ? 0 : n;
  }

  private formatearDecimal(value: any): string {
    return this.toNumber(value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  private mostrarExito(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 4000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['snackbar-success']
    });
  }

  private mostrarAdvertencia(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 5000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['snackbar-warning']
    });
  }

  private mostrarError(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 6000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['snackbar-error']
    });
  }
  volverRolMensual(): void {
    this.router.navigate(['/rol-3000/rol-mensual'], {
      queryParams: {
        fechaPeriodo: this.fechaPeriodoOrigen,
        idLocal: this.idLocalOrigen,
        autoActualizar: true,
        origen: 'rubros-fijos'
      }
    });
  }
  abrirSelectorArchivoRubros(inputArchivo: HTMLInputElement): void {
    if (!this.rubroSeleccionado) {
      this.mostrarAdvertencia('Debe seleccionar un rubro.');
      return;
    }

    if (!this.dataSource || this.dataSource.length === 0) {
      this.mostrarAdvertencia('Primero debe cargar empleados.');
      return;
    }

    inputArchivo.value = '';
    inputArchivo.click();
  }

  async onArchivoRubrosSeleccionado(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];

    if (!archivo) {
      return;
    }

    const extension = archivo.name.split('.').pop()?.toLowerCase();

    if (extension !== 'xlsx') {
      this.mostrarAdvertencia('Debe seleccionar un archivo Excel .xlsx.');
      return;
    }

    try {
      this.guardando = true;

      const filasExcel = await this.leerArchivoRubrosExcel(archivo);

      if (filasExcel.length === 0) {
        this.mostrarAdvertencia('El archivo no contiene empleados para procesar.');
        this.guardando = false;
        return;
      }

      this.aplicarRubrosExcelAlGrid(filasExcel);

      this.guardando = false;

      this.mostrarExito(
        'Archivo procesado correctamente. Revise los valores y presione Grabar.'
      );
    } catch (error: any) {
      this.guardando = false;
      console.error(error);
      this.mostrarError(error?.message ?? 'No se pudo procesar el archivo.');
    }
  }

  private async leerArchivoRubrosExcel(archivo: File): Promise<FilaRubroFijoExcel[]> {
    const buffer = await archivo.arrayBuffer();

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet =
      workbook.getWorksheet('FORMATO') ??
      workbook.getWorksheet('Formato') ??
      workbook.worksheets[0];

    if (!worksheet) {
      throw new Error('No se encontró una hoja válida en el archivo.');
    }

    const filas: FilaRubroFijoExcel[] = [];

    /*
     * Formato esperado:
     * Fila 4: Código | Nombre | Cédula | Local | VALOR
     * Fila 5: filtros / Cant.
     * Fila 6 en adelante: datos
     */
    for (let rowNumber = 6; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);

      const codigoEmpleado = this.obtenerTextoCelda(row.getCell(1).value);
      const nombreEmpleado = this.obtenerTextoCelda(row.getCell(2).value);
      const numeroCedula = this.obtenerTextoCelda(row.getCell(3).value);
      const local = this.obtenerTextoCelda(row.getCell(4).value);
      const valor = this.obtenerNumeroCeldaONull(row.getCell(5).value);

      if (!codigoEmpleado && !numeroCedula) {
        continue;
      }

      filas.push({
        codigoEmpleado,
        nombreEmpleado,
        numeroCedula,
        local,
        valor
      });
    }

    return filas;
  }

  private aplicarRubrosExcelAlGrid(filasExcel: FilaRubroFijoExcel[]): void {
    const empleadosPorCodigo = new Map<string, any>();
    const empleadosPorCedula = new Map<string, any>();

    this.dataSource.forEach(emp => {
      const codigo = String(emp.codigoEmpleado ?? '').trim();

      const cedula = String(
        (emp as any).numeroCedula ??
        (emp as any).cedula ??
        ''
      ).trim();

      if (codigo) {
        empleadosPorCodigo.set(codigo, emp);
      }

      if (cedula) {
        empleadosPorCedula.set(cedula, emp);
      }
    });

    let registrosProcesados = 0;
    const empleadosNoEncontrados: string[] = [];

    for (const fila of filasExcel) {
      const empleado =
        empleadosPorCodigo.get(fila.codigoEmpleado) ??
        empleadosPorCedula.get(fila.numeroCedula);

      if (!empleado) {
        empleadosNoEncontrados.push(
          fila.codigoEmpleado ||
          fila.numeroCedula ||
          fila.nombreEmpleado
        );
        continue;
      }

      if (fila.valor === null || fila.valor === undefined) {
        continue;
      }

      if (fila.valor < 0) {
        throw new Error(
          `El empleado ${fila.nombreEmpleado || fila.codigoEmpleado} tiene un valor negativo.`
        );
      }

      empleado.valor = this.toNumber(fila.valor);

      /*
       * Regla visual igual al formato:
       * Si viene valor, se marca 1 cuota por defecto,
       * salvo que el usuario ya tenga otro número de cuotas.
       */
      if (this.toNumber(empleado.numCuotas) <= 0) {
        empleado.numCuotas = 1;
      }

      if (empleado.cuotasPagadas === null || empleado.cuotasPagadas === undefined) {
        empleado.cuotasPagadas = 0;
      }

      registrosProcesados++;
    }

    if (registrosProcesados === 0) {
      throw new Error('No se procesó ningún valor del archivo.');
    }

    this.reemplazarRubro = true;
    this.recalcularTotales();
    this.actualizarGrid();

    if (empleadosNoEncontrados.length > 0) {
      this.mostrarAdvertencia(
        `Archivo procesado, pero algunos empleados no se encontraron: ${empleadosNoEncontrados
          .slice(0, 5)
          .join(', ')}`
      );
    }
  }

  private obtenerTextoCelda(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'object') {
      if (value.text) {
        return String(value.text).trim();
      }

      if (value.result !== undefined) {
        return String(value.result).trim();
      }

      if (value.richText) {
        return value.richText
          .map((x: any) => x.text)
          .join('')
          .trim();
      }
    }

    return String(value).trim();
  }

  private obtenerNumeroCeldaONull(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    let valor = value;

    if (typeof value === 'object') {
      if (value.result !== undefined) {
        valor = value.result;
      } else if (value.text !== undefined) {
        valor = value.text;
      }
    }

    const numero = Number(String(valor).replace(',', '.'));

    if (isNaN(numero)) {
      return null;
    }

    return numero;
  }
}