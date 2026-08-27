import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  MatDateFormats,
  MatNativeDateModule,
  NativeDateAdapter,
} from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import * as XLSX from 'xlsx';

import {
  EstadoEmpleadoReporte,
  ReporteEmpleadoResponse,
  ReporteEmpleadosRequest,
  ReporteEmpleadosService,
} from 'src/app/services/rol/reporte-empleados.service';

interface CampoReporte {
  field: string;
  headerName: string;
  seleccionado: boolean;
  tipo: 'text' | 'number' | 'date' | 'boolean';
  minWidth?: number;
}

interface OpcionSeleccionable {
  id: number;
  descripcion: string;
  seleccionado: boolean;
}

export const REPORTE_DATE_FORMATS: MatDateFormats = {
  parse: { dateInput: 'DD/MM/YYYY' },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMMM YYYY',
    dateA11yLabel: 'DD/MM/YYYY',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

export class DdMmYyyyDateAdapter extends NativeDateAdapter {
  override parse(value: unknown): Date | null {
    if (typeof value === 'string') {
      const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
      if (match) {
        const day = Number(match[1]);
        const month = Number(match[2]) - 1;
        const year = Number(match[3]);
        const date = new Date(year, month, day);
        return date.getFullYear() === year &&
          date.getMonth() === month &&
          date.getDate() === day
          ? date
          : null;
      }
    }
    return super.parse(value);
  }

  override format(date: Date): string {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    return `${String(date.getDate()).padStart(2, '0')}/${String(
      date.getMonth() + 1
    ).padStart(2, '0')}/${date.getFullYear()}`;
  }
}

@Component({
  selector: 'app-explorador-empleado',
  standalone: true,
  templateUrl: './explorador-empleado.component.html',
  styleUrls: ['./explorador-empleado.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatRadioModule,
    MatSnackBarModule,
    AgGridModule,
  ],
  providers: [
    {
      provide: MAT_DATE_LOCALE,
      useValue: 'es-EC'
    },
    {
      provide: DateAdapter,
      useClass: DdMmYyyyDateAdapter,
      deps: [MAT_DATE_LOCALE]
    },
    {
      provide: MAT_DATE_FORMATS,
      useValue: REPORTE_DATE_FORMATS
    },
  ],
})
export class ExploradorEmpleadosComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ReporteEmpleadosService);
  private readonly snack = inject(MatSnackBar);
  private gridApi?: GridApi;

  loading = false;
  rowData: Record<string, unknown>[] = [];
  columnDefs: ColDef[] = [];

  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    minWidth: 120,
  };

  form: FormGroup = this.fb.group({
    estado: new FormControl<EstadoEmpleadoReporte>('TODOS', { nonNullable: true }),
    fechaInicio: new FormControl<Date | null>(null),
    fechaFin: new FormControl<Date | null>(null),
  });

  zonas: OpcionSeleccionable[] = [];
  tiposEmpleado: OpcionSeleccionable[] = [];

  camposReporte: CampoReporte[] = [
    { field: 'codigoEmpleado', headerName: 'Código empleado', seleccionado: true, tipo: 'number', minWidth: 130 },
    { field: 'documento', headerName: 'Cédula/Identidad', seleccionado: true, tipo: 'text', minWidth: 150 },
    { field: 'nombres', headerName: 'Nombres', seleccionado: true, tipo: 'text', minWidth: 180 },
    { field: 'apellidos', headerName: 'Apellidos', seleccionado: true, tipo: 'text', minWidth: 180 },
    { field: 'nombreCompleto', headerName: 'Nombre completo', seleccionado: false, tipo: 'text', minWidth: 260 },
    { field: 'estadoCivil', headerName: 'Estado civil', seleccionado: false, tipo: 'text' },
    { field: 'genero', headerName: 'Sexo', seleccionado: false, tipo: 'text' },
    { field: 'ciudad', headerName: 'Ciudad', seleccionado: false, tipo: 'text' },
    { field: 'direccion', headerName: 'Dirección', seleccionado: false, tipo: 'text', minWidth: 250 },
    { field: 'telefono', headerName: 'Teléfono', seleccionado: false, tipo: 'text' },
    { field: 'mail', headerName: 'Correo', seleccionado: false, tipo: 'text', minWidth: 220 },
    { field: 'localidad', headerName: 'Localidad', seleccionado: false, tipo: 'text', minWidth: 180 },
    { field: 'departamento', headerName: 'Departamento', seleccionado: false, tipo: 'text', minWidth: 180 },
    { field: 'cargo', headerName: 'Cargo', seleccionado: false, tipo: 'text', minWidth: 180 },
    { field: 'tipoEmpleado', headerName: 'Tipo empleado', seleccionado: false, tipo: 'text', minWidth: 160 },
    { field: 'zona', headerName: 'Zona', seleccionado: false, tipo: 'text' },
    { field: 'fechaIngreso', headerName: 'Fecha ingreso', seleccionado: false, tipo: 'date', minWidth: 140 },
    { field: 'fechaSalida', headerName: 'Fecha salida', seleccionado: false, tipo: 'date', minWidth: 140 },
    { field: 'fechaNacimiento', headerName: 'Fecha nacimiento', seleccionado: false, tipo: 'date', minWidth: 155 },
    { field: 'edad', headerName: 'Edad', seleccionado: false, tipo: 'number', minWidth: 90 },
    { field: 'sueldo', headerName: 'Sueldo', seleccionado: false, tipo: 'number', minWidth: 120 },
    {
  field: 'banco',
  headerName: 'Banco',
  seleccionado: false,
  tipo: 'text',
  minWidth: 210
},
{
  field: 'cuentaBanco',
  headerName: 'Cuenta bancaria',
  seleccionado: false,
  tipo: 'text',
  minWidth: 170
},
    { field: 'tipoSangre', headerName: 'Tipo sangre', seleccionado: false, tipo: 'text' },
    { field: 'discapacidad', headerName: 'Discapacidad', seleccionado: false, tipo: 'boolean' },
    { field: 'terceraEdad', headerName: 'Tercera edad', seleccionado: false, tipo: 'boolean' },
    { field: 'libretaMilitar', headerName: 'Libreta militar', seleccionado: false, tipo: 'text', minWidth: 140 },
    { field: 'ciudadTrabajo', headerName: 'Ciudad trabajo', seleccionado: false, tipo: 'text', minWidth: 160 },
    { field: 'fondoReserva', headerName: 'Pago fondo reserva', seleccionado: false, tipo: 'boolean', minWidth: 160 },
    { field: 'decimos', headerName: 'Pago décimos', seleccionado: false, tipo: 'boolean', minWidth: 140 },
    { field: 'sectorial', headerName: 'Código sectorial', seleccionado: false, tipo: 'text', minWidth: 150 },
    { field: 'retencionJudicial', headerName: 'Retención judicial', seleccionado: false, tipo: 'boolean', minWidth: 160 },
    
  ];

  ngOnInit(): void {
    this.construirColumnas();
  }

  onGridReady(event: GridReadyEvent): void {
    this.gridApi = event.api;
    this.setRowData(this.rowData);
    setTimeout(() => this.ajustarColumnas());
  }

  seleccionarTodosLosCampos(): void {
    this.camposReporte.forEach(c => (c.seleccionado = true));
    this.construirColumnas();
  }

  limpiarCampos(): void {
    this.camposReporte.forEach(c => (c.seleccionado = false));
    this.rowData = [];
    this.construirColumnas();
    this.setRowData([]);
  }

  onCampoChange(): void {
    this.construirColumnas();
  }

  generarReporte(): void {
    const campos = this.camposReporte.filter(c => c.seleccionado).map(c => c.field);
    if (!campos.length) {
      this.notify('Seleccione al menos un campo para generar el reporte.', 'warn');
      return;
    }

    const fechaInicio = this.form.get('fechaInicio')?.value as Date | null;
    const fechaFin = this.form.get('fechaFin')?.value as Date | null;
    if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
      this.notify('La fecha inicial no puede ser mayor que la fecha final.', 'warn');
      return;
    }

    const request: ReporteEmpleadosRequest = {
      campos,
      estado: this.form.get('estado')?.value ?? 'TODOS',
      fechaInicio: this.toYmdOrNull(fechaInicio),
      fechaFin: this.toYmdOrNull(fechaFin),
      idZonas: this.zonas.filter(x => x.seleccionado).map(x => x.id),
      idTiposEmpleado: this.tiposEmpleado.filter(x => x.seleccionado).map(x => x.id),
    };

    this.loading = true;
    this.service.generarReporte(request)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: response => {
          if (response.type !== 'LIST' || !Array.isArray(response.data)) {
            this.rowData = [];
            this.setRowData([]);
            this.notify(response.message || 'No se pudo generar el reporte.', 'error');
            return;
          }

          this.construirColumnas();
          this.rowData = response.data.map((item: ReporteEmpleadoResponse) => item.valores ?? {});
          this.setRowData(this.rowData);
          setTimeout(() => this.ajustarColumnas(), 50);
          this.notify(response.message || `Se cargaron ${this.rowData.length} registros.`, 'success');
        },
        error: error => {
          console.error('Error generando reporte de empleados:', error);
          this.rowData = [];
          this.setRowData([]);
          this.notify('Error al consultar el reporte de empleados.', 'error');
        },
      });
  }

  limpiarReporte(): void {
    this.form.reset({ estado: 'TODOS', fechaInicio: null, fechaFin: null });
    this.zonas.forEach(x => (x.seleccionado = false));
    this.tiposEmpleado.forEach(x => (x.seleccionado = false));
    this.rowData = [];
    this.setRowData([]);
  }

  exportarExcel(): void {
    if (!this.rowData.length) {
      this.notify('No existen datos para exportar.', 'warn');
      return;
    }

    const seleccionadas = this.camposReporte.filter(c => c.seleccionado);
    const filas = this.rowData.map(fila => {
      const salida: Record<string, unknown> = {};
      for (const campo of seleccionadas) {
        const valor = fila[campo.field];
        salida[campo.headerName] = campo.tipo === 'date' ? this.formatearFecha(valor) : valor ?? '';
      }
      return salida;
    });

    const hoja = XLSX.utils.json_to_sheet(filas);
    hoja['!cols'] = seleccionadas.map(campo => ({ wch: this.anchoExcel(campo) }));
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Empleados');
    XLSX.writeFile(libro, `Explorador_Empleados_${this.fechaArchivo()}.xlsx`);
  }

  private construirColumnas(): void {
    this.columnDefs = this.camposReporte
      .filter(c => c.seleccionado)
      .map(c => this.crearColumna(c));

    const api = this.gridApi as any;
    if (api) {
      if (typeof api.setGridOption === 'function') api.setGridOption('columnDefs', this.columnDefs);
      else if (typeof api.setColumnDefs === 'function') api.setColumnDefs(this.columnDefs);
      setTimeout(() => this.ajustarColumnas());
    }
  }

  private crearColumna(campo: CampoReporte): ColDef {
    const columna: ColDef = {
      field: campo.field,
      headerName: campo.headerName,
      minWidth: campo.minWidth ?? 120,
      tooltipField: campo.field,
      filter: true,
      sortable: true,
      resizable: true,
    };

    if (campo.tipo === 'number') {
      columna.filter = 'agNumberColumnFilter';
      columna.cellStyle = { textAlign: 'right', justifyContent: 'flex-end', fontVariantNumeric: 'tabular-nums' };
      if (campo.field === 'sueldo') columna.valueFormatter = p => this.formatearNumero(p.value);
    }

    if (campo.tipo === 'date') {
      columna.valueFormatter = p => this.formatearFecha(p.value);
      columna.filterValueGetter = p => this.formatearFecha(p.data?.[campo.field]);
    }

    return columna;
  }

  private setRowData(rowData: Record<string, unknown>[]): void {
    if (!this.gridApi) return;
    const api = this.gridApi as any;
    if (typeof api.setGridOption === 'function') api.setGridOption('rowData', rowData);
    else if (typeof api.setRowData === 'function') api.setRowData(rowData);
  }

  private ajustarColumnas(): void {
    if (!this.gridApi || !this.columnDefs.length) return;
    this.gridApi.autoSizeAllColumns(false);
    const disponible = document.querySelector('.grid-explorador')?.clientWidth ?? 0;
    const requerido = this.columnDefs.reduce((t, c) => t + Number(c.minWidth ?? 120), 0);
    if (disponible > 0 && requerido <= disponible) this.gridApi.sizeColumnsToFit();
  }

  private toYmdOrNull(fecha: Date | null): string | null {
    if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) return null;
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(
      fecha.getDate()
    ).padStart(2, '0')}`;
  }

  private formatearFecha(value: unknown): string {
    if (value == null || value === '') return '';
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) return '';
      return `${String(value.getDate()).padStart(2, '0')}/${String(value.getMonth() + 1).padStart(2, '0')}/${value.getFullYear()}`;
    }
    const texto = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(texto)) {
      const [y, m, d] = texto.substring(0, 10).split('-');
      return `${d}/${m}/${y}`;
    }
    return texto;
  }

  private formatearNumero(value: unknown): string {
    const numero = Number(value ?? 0);
    return Number.isFinite(numero)
      ? numero.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '0,00';
  }

  private anchoExcel(campo: CampoReporte): number {
    if (campo.tipo === 'date') return 16;
    if (campo.tipo === 'number') return 14;
    if (campo.field === 'direccion' || campo.field === 'nombreCompleto') return 35;
    return 22;
  }

  private fechaArchivo(): string {
    const f = new Date();
    return `${f.getFullYear()}${String(f.getMonth() + 1).padStart(2, '0')}${String(f.getDate()).padStart(2, '0')}_${String(
      f.getHours()
    ).padStart(2, '0')}${String(f.getMinutes()).padStart(2, '0')}`;
  }

  private notify(message: string, type: 'success' | 'error' | 'warn' | 'info'): void {
    this.snack.open(message, 'OK', {
      duration: 4000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: [`snack-${type}`],
    });
  }
}
