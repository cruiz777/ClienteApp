import { CommonModule } from '@angular/common';
import {
  Component,
  HostListener,
  Inject,
  OnInit
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule
} from '@angular/forms';

import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';

import {
  MAT_MOMENT_DATE_ADAPTER_OPTIONS,
  MatMomentDateModule
} from '@angular/material-moment-adapter';

import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE
} from '@angular/material/core';

import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { HttpClientModule } from '@angular/common/http';

import { AgGridModule } from 'ag-grid-angular';
import {
  ColDef,
  GridApi,
  GridReadyEvent
} from 'ag-grid-community';

import {
  FacturaDetallePrefijoResponse,
  FacturaDetallePrefijosService
} from 'src/app/services/factura-detalle-prefijos.service';

/**
 * Prefijo recibido desde FacturacionIndividualComponent.
 *
 * fecha:
 *   valor original devuelto por el backend, por ejemplo "2022-05-19".
 *
 * fechaVista:
 *   valor ya formateado por el componente padre, por ejemplo "19/05/2022".
 */
export interface FacturacionMesesPrefijo {
  id_prefijos: number;
  codpre: string;
  fecha?: string | null;
  fechaVista?: string;
}

export interface FacturacionMesesData {
  anioActual: number;
  prefijos: FacturacionMesesPrefijo[];
  idPrefijo: number | null;
  codpre: string | null;
  onAceptar?: (res: FacturacionMesesResult) => void;
}

export interface FacturacionMesesResult {
  anio: number;
  fechaUltimaPago: string;
  fechaHastaPaga: string;
  numeroMeses: number;
  periodo: string;
  idPrefijo: number;
  codpre: string;
}

/**
 * Formato dd/MM/yyyy para los datepickers.
 */
export const ES_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY'
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'DD/MM/YYYY',
    monthYearA11yLabel: 'MMMM YYYY'
  }
};

@Component({
  selector: 'app-facturacion-meses-modal',
  standalone: true,
  templateUrl: './facturacion-meses-modal.component.html',
  styleUrls: ['./facturacion-meses-modal.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatMomentDateModule,
    MatSelectModule,
    MatOptionModule,
    HttpClientModule,
    AgGridModule
  ],
  providers: [
    {
      provide: MAT_DATE_FORMATS,
      useValue: ES_FORMATS
    },
    {
      provide: MAT_DATE_LOCALE,
      useValue: 'es-EC'
    },
    {
      provide: MAT_MOMENT_DATE_ADAPTER_OPTIONS,
      useValue: {
        useUtc: true
      }
    }
  ]
})
export class FacturacionMesesModalComponent implements OnInit {
  form: FormGroup;

  aplicado = false;
  isLoading = false;

  gridHeightPx = 150;
  rowHeight = 28;

  rowData: FacturaDetallePrefijoResponse[] = [];

  private gridApi?: GridApi;

  defaultColDef: ColDef = {
    resizable: true,
    sortable: true
  };

  columnDefs: ColDef[] = [
    {
      headerName: 'Factura',
      field: 'numnota',
      width: 180
    },
    {
      headerName: 'F.Factura',
      field: 'fechaFactura',
      width: 120,
      valueFormatter: params =>
        this.formatISODate(params.value)
    },
    {
      headerName: '#Meses',
      field: 'cantidad',
      width: 70
    },
    {
      headerName: 'Descripción',
      field: 'descripcion',
      minWidth: 280,
      flex: 2,
      tooltipField: 'descripcion',
      cellClass: 'cell-ellipsis'
    },
    {
      headerName: 'Desde',
      field: 'periodoDesde',
      width: 140,
      valueFormatter: params =>
        this.formatISODate(params.value)
    },
    {
      headerName: 'Hasta',
      field: 'periodoHasta',
      width: 140,
      valueFormatter: params =>
        this.formatISODate(params.value)
    }
  ];

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: FacturacionMesesData,

    public ref: MatDialogRef<FacturacionMesesModalComponent>,

    private fb: FormBuilder,

    private prefijosSrv: FacturaDetallePrefijosService,

    private dateAdapter: DateAdapter<any>
  ) {
    this.dateAdapter.setLocale('es-EC');

    const anio =
      data?.anioActual ?? new Date().getFullYear();

    const fechaDesde = new Date(anio, 0, 1);
    const fechaHasta = new Date(anio, 11, 31);

    this.form = this.fb.group({
      idPrefijo: [data?.idPrefijo ?? null],
      fchUltimaPago: [fechaDesde],
      fchHastaPaga: [fechaHasta],
      numMeses: [0],
      mesFinNombre: [''],
      anioFin: [fechaHasta.getFullYear()]
    });

    /*
     * Aquí se consulta cuando cambia el prefijo.
     * Por eso no hace falta usar selectionChange en el HTML.
     */
    this.form
      .get('idPrefijo')
      ?.valueChanges
      .subscribe(idPrefijo => {
        if (idPrefijo) {
          this.consultar();
        } else {
          this.rowData = [];
          this.gridApi?.setGridOption?.(
            'rowData',
            []
          );
        }
      });

    this.recalcular();
  }

  ngOnInit(): void {
    this.ref.afterOpened().subscribe(() => {
      setTimeout(
        () => this.gridApi?.sizeColumnsToFit(),
        0
      );
    });

    /*
     * Si el modal recibe un prefijo seleccionado,
     * se realiza la primera consulta.
     */
    if (this.form.get('idPrefijo')?.value) {
      this.consultar();
    }
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;

    setTimeout(
      () => this.gridApi?.sizeColumnsToFit(),
      0
    );
  }

  @HostListener('window:resize')
  onResize(): void {
    setTimeout(
      () => this.gridApi?.sizeColumnsToFit(),
      0
    );
  }

  bloquearTeclado(event: KeyboardEvent): void {
    if (
      event.key !== 'Tab' &&
      event.key !== 'Shift'
    ) {
      event.preventDefault();
    }
  }

  /**
   * Devuelve la fecha que se mostrará junto al prefijo.
   *
   * Primero utiliza fechaVista, porque el componente padre
   * ya la envía en formato dd/MM/yyyy.
   *
   * Si fechaVista no existe, intenta formatear fecha.
   */
  obtenerFechaPrefijo(
    prefijo: FacturacionMesesPrefijo
  ): string {
    if (prefijo.fechaVista) {
      return prefijo.fechaVista;
    }

    return this.formatISODate(prefijo.fecha);
  }

  private asDate(value: any): Date | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return value;
    }

    /*
     * Compatibilidad con objetos Moment.
     */
    if (
      typeof value === 'object' &&
      typeof value.toDate === 'function'
    ) {
      try {
        return value.toDate();
      } catch {
        return null;
      }
    }

    if (typeof value === 'string') {
      /*
       * Formato ISO: yyyy-MM-dd
       */
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
        const base = value.split('T')[0];
        const [anio, mes, dia] =
          base.split('-').map(Number);

        if (anio && mes && dia) {
          return new Date(anio, mes - 1, dia);
        }
      }

      /*
       * Formato ecuatoriano: dd/MM/yyyy
       */
      const partes = value
        .split(/[/-]/)
        .map(Number);

      if (partes.length === 3) {
        const [dia, mes, anio] = partes;

        if (anio && mes && dia) {
          return new Date(anio, mes - 1, dia);
        }
      }
    }

    return null;
  }

  private pad(numero: number): string {
    return numero < 10
      ? `0${numero}`
      : `${numero}`;
  }

  private format(fecha: Date): string {
    return (
      `${this.pad(fecha.getDate())}/` +
      `${this.pad(fecha.getMonth() + 1)}/` +
      `${fecha.getFullYear()}`
    );
  }

  private mesNombre(fecha: Date): string {
    const nombre = fecha.toLocaleDateString(
      'es-EC',
      {
        month: 'long'
      }
    );

    return nombre.replace(
      /^\w/,
      caracter => caracter.toUpperCase()
    );
  }

  private diffMeses(
    desde: Date,
    hasta: Date,
    inclusive = true
  ): number {
    let meses =
      (hasta.getFullYear() - desde.getFullYear()) * 12 +
      (hasta.getMonth() - desde.getMonth());

    if (inclusive) {
      meses += 1;
    }

    return Math.max(0, meses);
  }

  formatISODate(
    fecha?: string | null
  ): string {
    if (!fecha) {
      return '';
    }

    const valor = fecha.toString().trim();

    /*
     * Si ya viene en dd/MM/yyyy, se devuelve sin cambios.
     */
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) {
      return valor;
    }

    /*
     * Formato yyyy-MM-dd o yyyy-MM-ddTHH:mm:ss.
     */
    const resultado = valor.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

    if (!resultado) {
      return valor;
    }

    const anio = resultado[1];
    const mes = resultado[2];
    const dia = resultado[3];

    /*
     * El backend utiliza DateOnly.MinValue cuando no existe fecha.
     */
    if (anio === '0001') {
      return '';
    }

    return `${dia}/${mes}/${anio}`;
  }

  recalcular(): void {
    const fechaDesde = this.asDate(
      this.form.get('fchUltimaPago')?.value
    );

    const fechaHasta = this.asDate(
      this.form.get('fchHastaPaga')?.value
    );

    if (!fechaDesde || !fechaHasta) {
      return;
    }

    if (fechaHasta < fechaDesde) {
      alert(
        'Debe ingresar una fecha mayor o igual a la del Último Pago.'
      );
      return;
    }

    this.form.patchValue(
      {
        numMeses: this.diffMeses(
          fechaDesde,
          fechaHasta,
          true
        ),
        mesFinNombre: this.mesNombre(fechaHasta),
        anioFin: fechaHasta.getFullYear()
      },
      {
        emitEvent: false
      }
    );
  }

  consultar(): void {
    const idPrefijo = Number(
      this.form.get('idPrefijo')?.value ?? 0
    );

    if (!idPrefijo) {
      this.rowData = [];
      return;
    }

    const prefijo = this.data.prefijos.find(
      item => item.id_prefijos === idPrefijo
    );

    const codpre = prefijo?.codpre ?? '';

    if (!codpre) {
      this.rowData = [];
      return;
    }

    this.isLoading = true;
    this.gridApi?.showLoadingOverlay();

    this.prefijosSrv
      .getByCodigo(codpre)
      .subscribe({
        next: rows => {
          this.rowData = [...(rows ?? [])].sort(
            (a, b) =>
              (b.fechaFactura ?? '').localeCompare(
                a.fechaFactura ?? ''
              )
          );

          this.isLoading = false;

          setTimeout(() => {
            this.gridApi?.hideOverlay();
            this.gridApi?.sizeColumnsToFit();
          }, 0);
        },

        error: error => {
          console.error(
            '[FacturaDetallePrefijos] error',
            error
          );

          this.rowData = [];
          this.isLoading = false;
          this.gridApi?.hideOverlay();
        }
      });
  }

  aceptar(): void {
    if (this.aplicado) {
      return;
    }

    const fechaDesde = this.asDate(
      this.form.get('fchUltimaPago')?.value
    );

    const fechaHasta = this.asDate(
      this.form.get('fchHastaPaga')?.value
    );

    if (
      !fechaDesde ||
      !fechaHasta ||
      fechaHasta < fechaDesde
    ) {
      alert(
        'Debe ingresar una fecha mayor o igual a la del Último Pago.'
      );
      return;
    }

    const idPrefijo = Number(
      this.form.get('idPrefijo')?.value ?? 0
    );

    if (!idPrefijo) {
      alert('Seleccione un prefijo.');
      return;
    }

    const prefijo = this.data.prefijos.find(
      item => item.id_prefijos === idPrefijo
    );

    const codpre = prefijo?.codpre ?? '';

    if (!codpre) {
      alert('No fue posible obtener el código del prefijo.');
      return;
    }

    const numeroMeses = this.diffMeses(
      fechaDesde,
      fechaHasta,
      true
    );

    const periodo =
      `${this.mesNombre(fechaDesde).toUpperCase()} ` +
      `${fechaDesde.getFullYear()} - ` +
      `${this.mesNombre(fechaHasta).toUpperCase()} ` +
      `${fechaHasta.getFullYear()}`;

    const resultado: FacturacionMesesResult = {
      anio: fechaHasta.getFullYear(),
      fechaUltimaPago: this.format(fechaDesde),
      fechaHastaPaga: this.format(fechaHasta),
      numeroMeses,
      periodo,
      idPrefijo,
      codpre
    };

    this.data.onAceptar?.(resultado);

    this.aplicado = true;
  }

  salir(): void {
    this.ref.close();
  }
}