import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  inject,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { finalize } from 'rxjs/operators';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';

import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import {
  MatSnackBar,
  MatSnackBarModule,
} from '@angular/material/snack-bar';

import { AgGridModule } from 'ag-grid-angular';
import {
  ColDef,
  GridApi,
  GridReadyEvent,
} from 'ag-grid-community';

import * as XLSX from 'xlsx';

import { ExploradorNominaService } from
  'src/app/services/rol/explorador-nomina.service';

import type {
  DimensionColumna,
  DimensionExplorador,
  DimensionFila,
  EstadoEmpleadoExplorador,
  ExploradorCatalogoItem,
  ExploradorNominaCatalogosResponse,
  ExploradorNominaColumna,
  ExploradorNominaRequest,
  ExploradorNominaResponse,
  ExploradorPeriodo,
  OpcionExplorador,
} from 'src/app/services/rol/explorador-nomina.service';

interface Seleccionable<T> {
  item: T;
  seleccionado: boolean;
}

interface DimensionDisponible<T> {
  id: T;
  descripcion: string;
}

@Component({
  selector: 'app-explorador-nomina',
  standalone: true,
  templateUrl: './explorador-nomina.component.html',
  styleUrls: ['./explorador-nomina.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DragDropModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    MatSnackBarModule,
    AgGridModule,
  ],
})
export class ExploradorNominaComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service =
    inject(ExploradorNominaService);
  private readonly snack = inject(MatSnackBar);

  private gridApi?: GridApi;

  panelActivo:
    | 'LOCALES'
    | 'RUBROS'
    | 'PERIODOS'
    | 'DISENO' = 'DISENO';

  cargandoCatalogos = false;
  generando = false;

  locales:
    Seleccionable<ExploradorCatalogoItem>[] = [];

  rubrosIngresos:
    Seleccionable<ExploradorCatalogoItem>[] = [];

  rubrosDescuentos:
    Seleccionable<ExploradorCatalogoItem>[] = [];

  tiposEmpleado:
    Seleccionable<ExploradorCatalogoItem>[] = [];

  periodos:
    Seleccionable<ExploradorPeriodo>[] = [];

  filtroLocal = '';
  filtroIngreso = '';
  filtroDescuento = '';
  filtroTipo = '';

  /**
   * Distribución inicial idéntica a VB6:
   *
   * Filas: Empleado
   * Columnas: Rubros
   * Opciones: Locales y Períodos
   */
  filasConfigurables: DimensionExplorador[] = [];

  columnasSeleccionadas: DimensionColumna[] = [
    'RUBRO',
  ];

  opcionesSeleccionadas: OpcionExplorador[] = [
    'LOCAL',
    'PERIODO',
  ];

  readonly listasDisenoConectadas = [
    'listaFilas',
    'listaColumnas',
    'listaOpciones',
  ];

  get filasSeleccionadas(): DimensionFila[] {
    /*
     * VB6 mantiene EMPLEADO en Filas.
     * Cuando existe otra dimensión, EMPLEADO queda al final.
     */
    return [
      ...this.filasConfigurables,
      'EMPLEADO',
    ];
  }

  columnDefs: ColDef[] = [];
  rowData: Record<string, unknown>[] = [];
  pinnedBottomRowData:
    Record<string, unknown>[] = [];

  totalRegistros = 0;

  readonly defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    minWidth: 115,
  };

  readonly form: FormGroup = this.fb.group({
    estadoEmpleado:
      new FormControl<EstadoEmpleadoExplorador>(
        'TODOS',
        { nonNullable: true }
      ),

    descuentosNegativos:
      new FormControl<boolean>(
        true,
        { nonNullable: true }
      ),

    soloConValores:
      new FormControl<boolean>(
        true,
        { nonNullable: true }
      ),

    incluirCantidades:
      new FormControl<boolean>(
        false,
        { nonNullable: true }
      ),

    totalizarFilas:
      new FormControl<boolean>(
        true,
        { nonNullable: true }
      ),

    totalizarColumnas:
      new FormControl<boolean>(
        true,
        { nonNullable: true }
      ),
  });

  ngOnInit(): void {
    this.cargarCatalogos();
  }

  localesFiltrados:
    Seleccionable<ExploradorCatalogoItem>[] = [];

  ingresosFiltrados:
    Seleccionable<ExploradorCatalogoItem>[] = [];

  descuentosFiltrados:
    Seleccionable<ExploradorCatalogoItem>[] = [];

  tiposFiltrados:
    Seleccionable<ExploradorCatalogoItem>[] = [];

  actualizarFiltroLocales(): void {
    this.localesFiltrados = this.filtrarCatalogo(
      this.locales,
      this.filtroLocal
    );
  }

  actualizarFiltroIngresos(): void {
    this.ingresosFiltrados = this.filtrarCatalogo(
      this.rubrosIngresos,
      this.filtroIngreso
    );
  }

  actualizarFiltroDescuentos(): void {
    this.descuentosFiltrados = this.filtrarCatalogo(
      this.rubrosDescuentos,
      this.filtroDescuento
    );
  }

  actualizarFiltroTipos(): void {
    this.tiposFiltrados = this.filtrarCatalogo(
      this.tiposEmpleado,
      this.filtroTipo
    );
  }

  get totalLocalesSeleccionados(): number {
    return this.locales.filter(
      x => x.seleccionado
    ).length;
  }

  get totalRubrosSeleccionados(): number {
    return [
      ...this.rubrosIngresos,
      ...this.rubrosDescuentos,
    ].filter(
      x => x.seleccionado
    ).length;
  }

  get totalPeriodosSeleccionados(): number {
    return this.periodos.filter(
      x => x.seleccionado
    ).length;
  }

  get periodosPorAnio(): {
    anio: number;
    periodos: Seleccionable<ExploradorPeriodo>[];
  }[] {
    const mapa = new Map<
      number,
      Seleccionable<ExploradorPeriodo>[]
    >();

    this.periodos.forEach(item => {
      const lista =
        mapa.get(item.item.anio) ?? [];

      lista.push(item);
      mapa.set(item.item.anio, lista);
    });

    return Array.from(mapa.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([anio, periodos]) => ({
        anio,
        periodos: periodos.sort(
          (a, b) =>
            b.item.mes - a.item.mes
        ),
      }));
  }

  trackByCatalogo(
    _index: number,
    item: Seleccionable<ExploradorCatalogoItem>
  ): number {
    return item.item.id;
  }

  trackByPeriodo(
    _index: number,
    item: Seleccionable<ExploradorPeriodo>
  ): string {
    return item.item.fecha;
  }

  cambiarSeleccionRubro(
    rubro: Seleccionable<ExploradorCatalogoItem>,
    seleccionado: boolean
  ): void {
    rubro.seleccionado = seleccionado;
  }

  cambiarSeleccionCatalogo(
    item: Seleccionable<ExploradorCatalogoItem>,
    seleccionado: boolean
  ): void {
    item.seleccionado = seleccionado;
  }

  cambiarSeleccionPeriodo(
    item: Seleccionable<ExploradorPeriodo>,
    seleccionado: boolean
  ): void {
    item.seleccionado = seleccionado;
  }

  onGridReady(
    event: GridReadyEvent
  ): void {
    this.gridApi = event.api;
  }

  cargarCatalogos(): void {
    this.cargandoCatalogos = true;

    this.service
      .obtenerCatalogos()
      .pipe(
        finalize(() => {
          this.cargandoCatalogos = false;
        })
      )
      .subscribe({
        next: response => {
          if (
            !this.esExito(response.type) ||
            !response.data
          ) {
            this.notificar(
              response.message ||
                'No se pudieron cargar los catálogos.',
              'error'
            );
            return;
          }

          this.mapearCatalogos(
            response.data
          );
        },
        error: error => {
          console.error(error);

          this.notificar(
            'Error al cargar los catálogos.',
            'error'
          );
        },
      });
  }

  cambiarPanel(
    panel:
      | 'LOCALES'
      | 'RUBROS'
      | 'PERIODOS'
      | 'DISENO'
  ): void {
    this.panelActivo = panel;
  }

  dropDimension(
    event: CdkDragDrop<DimensionExplorador[]>,
    destino:
      | 'FILAS'
      | 'COLUMNAS'
      | 'OPCIONES'
  ): void {
    const mismoContenedor =
      event.previousContainer === event.container;

    if (mismoContenedor) {
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );

      this.limpiarResultado();
      return;
    }

    /*
     * VB6 exige al menos una dimensión en Columnas.
     * No dejamos sacar la última columna.
     */
    if (
      event.previousContainer.id === 'listaColumnas' &&
      event.previousContainer.data.length === 1
    ) {
      this.notificar(
        'Debe mantener al menos una dimensión en Columnas.',
        'warn'
      );
      return;
    }

    /*
     * VB6 admite como máximo una dimensión configurable
     * junto con EMPLEADO en Filas.
     */
    if (
      destino === 'FILAS' &&
      this.filasConfigurables.length >= 1
    ) {
      this.notificar(
        'Filas admite una sola dimensión adicional junto a Empleado.',
        'warn'
      );
      return;
    }

    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );

    this.limpiarResultado();
  }

  moverDimensionConTeclado(
    dimension: DimensionExplorador,
    origen:
      | 'FILAS'
      | 'COLUMNAS'
      | 'OPCIONES',
    destino:
      | 'FILAS'
      | 'COLUMNAS'
      | 'OPCIONES'
  ): void {
    if (origen === destino) {
      return;
    }

    const origenLista =
      this.obtenerListaDiseno(origen);

    const destinoLista =
      this.obtenerListaDiseno(destino);

    const indice =
      origenLista.indexOf(dimension);

    if (indice < 0) {
      return;
    }

    if (
      origen === 'COLUMNAS' &&
      origenLista.length === 1
    ) {
      this.notificar(
        'Debe mantener al menos una dimensión en Columnas.',
        'warn'
      );
      return;
    }

    if (
      destino === 'FILAS' &&
      destinoLista.length >= 1
    ) {
      this.notificar(
        'Filas admite una sola dimensión adicional junto a Empleado.',
        'warn'
      );
      return;
    }

    origenLista.splice(indice, 1);
    destinoLista.push(dimension);

    this.limpiarResultado();
  }

  private obtenerListaDiseno(
    zona:
      | 'FILAS'
      | 'COLUMNAS'
      | 'OPCIONES'
  ): DimensionExplorador[] {
    switch (zona) {
      case 'FILAS':
        return this.filasConfigurables;

      case 'COLUMNAS':
        return this.columnasSeleccionadas;

      default:
        return this.opcionesSeleccionadas;
    }
  }

  trackByDimension(
    _index: number,
    dimension: DimensionExplorador
  ): DimensionExplorador {
    return dimension;
  }


  seleccionarTodos(
    items: Seleccionable<unknown>[]
  ): void {
    items.forEach(item => {
      item.seleccionado = true;
    });
  }

  deseleccionarTodos(
    items: Seleccionable<unknown>[]
  ): void {
    items.forEach(item => {
      item.seleccionado = false;
    });
  }

  descripcionDimension(
    dimension:
      | DimensionFila
      | DimensionColumna
      | OpcionExplorador
  ): string {
    switch (dimension) {
      case 'EMPLEADO':
        return 'Empleado';

      case 'RUBRO':
        return 'Rubros';

      case 'PERIODO':
        return 'Períodos';

      case 'LOCAL':
        return 'Locales';

      default:
        return String(dimension);
    }
  }

  generar(): void {
    if (!this.validarDisenoVb6()) {
      return;
    }

    const periodos = this.periodos
      .filter(item => item.seleccionado)
      .map(item => item.item.fecha);

    if (periodos.length === 0) {
      this.notificar(
        'Debe seleccionar al menos un período.',
        'warn'
      );
      return;
    }

    const fechasOrdenadas = [
      ...periodos,
    ].sort();

    const request: ExploradorNominaRequest = {
      fechaInicio: fechasOrdenadas[0],

      fechaFin:
        fechasOrdenadas[
          fechasOrdenadas.length - 1
        ],

      periodos,

      idEmpleados: [],

      idRubros: [
        ...this.rubrosIngresos,
        ...this.rubrosDescuentos,
      ]
        .filter(item => item.seleccionado)
        .map(item => item.item.id),

      idLocales: this.locales
        .filter(item => item.seleccionado)
        .map(item => item.item.id),

      idTiposEmpleado: this.tiposEmpleado
        .filter(item => item.seleccionado)
        .map(item => item.item.id),

      filas: [
        ...this.filasSeleccionadas,
      ],

      columnas: [
        ...this.columnasSeleccionadas,
      ],

      opciones: [
        ...this.opcionesSeleccionadas,
      ],

      estadoEmpleado:
        this.form.get('estadoEmpleado')?.value ??
        'TODOS',

      descuentosNegativos:
        this.form.get('descuentosNegativos')?.value ??
        true,

      soloConValores:
        this.form.get('soloConValores')?.value ??
        true,

      incluirCantidades:
        this.form.get('incluirCantidades')?.value ??
        false,

      totalizarFilas:
        this.form.get('totalizarFilas')?.value ??
        true,

      totalizarColumnas:
        this.form.get('totalizarColumnas')?.value ??
        true,
    };

    this.generando = true;

    this.service
      .generarExplorador(request)
      .pipe(
        finalize(() => {
          this.generando = false;
        })
      )
      .subscribe({
        next: response => {
          if (
            !this.esExito(response.type) ||
            !response.data
          ) {
            this.limpiarResultado();

            this.notificar(
              response.message ||
                'No se pudo generar el reporte.',
              'error'
            );
            return;
          }

          this.aplicarResultado(
            response.data
          );

          this.notificar(
            response.message ||
              'Reporte generado correctamente.',
            'success'
          );
        },

        error: error => {
          console.error(
            'Error al generar el explorador:',
            error
          );

          this.limpiarResultado();

          this.notificar(
            'Error al generar el explorador.',
            'error'
          );
        },
      });
  }

  limpiar(): void {
    this.locales.forEach(item => {
      item.seleccionado = false;
    });

    this.rubrosIngresos.forEach(item => {
      item.seleccionado = false;
    });

    this.rubrosDescuentos.forEach(item => {
      item.seleccionado = false;
    });

    this.tiposEmpleado.forEach(item => {
      item.seleccionado = false;
    });

    this.periodos.forEach(item => {
      item.seleccionado = false;
    });

    /*
     * Distribución inicial equivalente a VB6:
     * Filas: Empleado
     * Columnas: Rubros
     * Opciones: Locales y Períodos
     */
    this.filasConfigurables = [];

    this.columnasSeleccionadas = [
      'RUBRO',
    ];

    this.opcionesSeleccionadas = [
      'LOCAL',
      'PERIODO',
    ];

    this.form.reset({
      estadoEmpleado: 'TODOS',
      descuentosNegativos: true,
      soloConValores: true,
      incluirCantidades: false,
      totalizarFilas: true,
      totalizarColumnas: true,
    });

    this.filtroLocal = '';
    this.filtroIngreso = '';
    this.filtroDescuento = '';
    this.filtroTipo = '';

    this.actualizarFiltroLocales();
    this.actualizarFiltroIngresos();
    this.actualizarFiltroDescuentos();
    this.actualizarFiltroTipos();

    this.panelActivo = 'DISENO';

    this.limpiarResultado();
  }

  exportarExcel(): void {
    if (this.rowData.length === 0) {
      this.notificar(
        'No existen datos para exportar.',
        'warn'
      );
      return;
    }

    const columnas = this.columnDefs.filter(
      columna => !!columna.field
    );

    const filasExportar = this.rowData.map(
      fila => {
        const salida:
          Record<string, unknown> = {};

        columnas.forEach(columna => {
          const field =
            String(columna.field);

          salida[
            columna.headerName || field
          ] = fila[field] ?? '';
        });

        return salida;
      }
    );

    if (
      this.pinnedBottomRowData.length > 0
    ) {
      const filaTotal =
        this.pinnedBottomRowData[0];

      const total:
        Record<string, unknown> = {};

      columnas.forEach(columna => {
        const field =
          String(columna.field);

        total[
          columna.headerName || field
        ] = filaTotal[field] ?? '';
      });

      filasExportar.push(total);
    }

    const hoja =
      XLSX.utils.json_to_sheet(
        filasExportar
      );

    hoja['!cols'] = columnas.map(
      columna => ({
        wch: this.calcularAnchoExcel(
          String(columna.field),
          columna.headerName ??
            String(columna.field)
        ),
      })
    );

    const libro =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      libro,
      hoja,
      'Explorador nómina'
    );

    XLSX.writeFile(
      libro,
      `Explorador_Nomina_${this.fechaArchivo()}.xlsx`
    );
  }

  private calcularAnchoExcel(
    field: string,
    headerName: string
  ): number {
    if (field === 'empleado') {
      return 38;
    }

    if (
      field === 'rubro' ||
      field === 'local'
    ) {
      return 28;
    }

    return Math.max(
      14,
      Math.min(
        32,
        headerName.length + 3
      )
    );
  }

  private fechaArchivo(): string {
    const fecha = new Date();

    return `${fecha.getFullYear()}${String(
      fecha.getMonth() + 1
    ).padStart(2, '0')}${String(
      fecha.getDate()
    ).padStart(2, '0')}_${String(
      fecha.getHours()
    ).padStart(2, '0')}${String(
      fecha.getMinutes()
    ).padStart(2, '0')}`;
  }

  private validarDisenoVb6(): boolean {
    if (
      this.columnasSeleccionadas.length === 0
    ) {
      this.notificar(
        'Debe existir al menos una dimensión en Columnas.',
        'warn'
      );
      return false;
    }

    if (
      this.filasConfigurables.length > 1
    ) {
      this.notificar(
        'Filas admite una sola dimensión adicional junto a Empleado.',
        'warn'
      );
      return false;
    }

    const distribucion:
      DimensionExplorador[] = [
        ...this.filasConfigurables,
        ...this.columnasSeleccionadas,
        ...this.opcionesSeleccionadas,
      ];

    const esperadas:
      DimensionExplorador[] = [
        'RUBRO',
        'LOCAL',
        'PERIODO',
      ];

    if (
      distribucion.length !==
      esperadas.length
    ) {
      this.notificar(
        'El diseño debe distribuir Rubros, Locales y Períodos una sola vez.',
        'warn'
      );
      return false;
    }

    for (const dimension of esperadas) {
      const cantidad =
        distribucion.filter(
          x => x === dimension
        ).length;

      if (cantidad !== 1) {
        this.notificar(
          `${this.descripcionDimension(dimension)} debe aparecer una sola vez en el diseño.`,
          'warn'
        );
        return false;
      }
    }

    return true;
  }

  private mapearCatalogos(
    data:
      ExploradorNominaCatalogosResponse
  ): void {
    this.locales =
      (data.locales ?? []).map(
        item => ({
          item,
          seleccionado: false,
        })
      );

    this.rubrosIngresos =
      (data.rubrosIngresos ?? []).map(
        item => ({
          item,
          seleccionado: false,
        })
      );

    this.rubrosDescuentos =
      (data.rubrosDescuentos ?? []).map(
        item => ({
          item,
          seleccionado: false,
        })
      );

    this.tiposEmpleado =
      (data.tiposEmpleado ?? []).map(
        item => ({
          item,
          seleccionado: false,
        })
      );

    this.periodos =
      (data.periodos ?? []).map(
        item => ({
          item,
          seleccionado: false,
        })
      );

    this.actualizarFiltroLocales();
    this.actualizarFiltroIngresos();
    this.actualizarFiltroDescuentos();
    this.actualizarFiltroTipos();
  }

  private aplicarResultado(
    data: ExploradorNominaResponse
  ): void {
    this.columnDefs =
      (data.columnas ?? []).map(
        x => this.crearColumna(x)
      );

    const tieneTotalFila =
      (data.filas ?? []).some(
        x =>
          Object.prototype
            .hasOwnProperty.call(
              x,
              'totalFila'
            )
      );

    if (
      tieneTotalFila &&
      !this.columnDefs.some(
        x => x.field === 'totalFila'
      )
    ) {
      this.columnDefs.push({
        field: 'totalFila',
        headerName: 'Total fila',
        filter: 'agNumberColumnFilter',
        minWidth: 130,
        valueFormatter: params =>
          this.formatearNumero(
            params.value
          ),
        cellStyle: {
          textAlign: 'right',
          fontWeight: '700',
        },
      });
    }

    this.rowData =
      data.filas ?? [];

    this.totalRegistros =
      data.totalRegistros ??
      this.rowData.length;

    this.pinnedBottomRowData =
      Object.keys(
        data.totales ?? {}
      ).length
        ? [
            {
              empleado: 'TOTALES',
              rubro: 'TOTALES',
              periodo: 'TOTALES',
              local: 'TOTALES',
              ...(data.totales ?? {}),
            },
          ]
        : [];

    setTimeout(() => {
      this.gridApi
        ?.autoSizeAllColumns(false);
    });
  }

  private crearColumna(
    col: ExploradorNominaColumna
  ): ColDef {
    const def: ColDef = {
      field: col.field,
      headerName: col.headerName,
      minWidth:
        col.fija ? 135 : 145,
      tooltipField: col.field,
      sortable: true,
      filter: true,
      resizable: true,
    };

    if (col.tipo === 'number') {
      def.filter =
        'agNumberColumnFilter';

      def.valueFormatter = params =>
        this.formatearNumero(
          params.value
        );

      def.cellStyle = {
        textAlign: 'right',
        fontVariantNumeric:
          'tabular-nums',
      };
    }

    if (
      [
        'empleado',
        'rubro',
        'periodo',
        'local',
      ].includes(col.field)
    ) {
      def.pinned = 'left';
    }

    if (col.field === 'empleado') {
      def.minWidth = 280;
    }

    if (
      [
        'totalIngresos',
        'totalDescuentos',
        'liquidoRecibir',
      ].includes(col.field)
    ) {
      def.pinned = 'right';

      def.cellStyle = {
        textAlign: 'right',
        fontWeight: '700',
      };
    }

    return def;
  }

  private filtrarCatalogo(
    items:
      Seleccionable<ExploradorCatalogoItem>[],
    texto: string
  ) {
    const filtro =
      this.normalizar(texto);

    if (!filtro) {
      return items;
    }

    return items.filter(x =>
      this.normalizar(
        `${x.item.codigo} ${x.item.descripcion}`
      ).includes(filtro)
    );
  }

  private normalizar(
    value: unknown
  ): string {
    return String(value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        ''
      )
      .trim();
  }

  private esExito(
    type:
      | string
      | null
      | undefined
  ): boolean {
    return [
      'success',
      'list',
      'ok',
    ].includes(
      String(type ?? '')
        .toLowerCase()
    );
  }

  private formatearNumero(
    value: unknown
  ): string {
    const numero =
      Number(value ?? 0);

    return Number.isFinite(numero)
      ? numero.toLocaleString(
          'es-EC',
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }
        )
      : '0,00';
  }

  private limpiarResultado(): void {
    this.columnDefs = [];
    this.rowData = [];
    this.pinnedBottomRowData = [];
    this.totalRegistros = 0;
  }

  private notificar(
    message: string,
    type:
      | 'success'
      | 'error'
      | 'warn'
  ): void {
    this.snack.open(
      message,
      'OK',
      {
        duration: 4500,
        horizontalPosition: 'right',
        verticalPosition: 'top',
        panelClass: [
          `snack-${type}`,
        ],
      }
    );
  }
}