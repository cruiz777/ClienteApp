import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatMomentDateModule, MAT_MOMENT_DATE_ADAPTER_OPTIONS } from '@angular/material-moment-adapter';
import { MAT_DATE_FORMATS } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { HttpClientModule } from '@angular/common/http';

import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';

import {
  FacturaDetallePrefijosService,
  FacturaDetallePrefijoResponse
} from 'src/app/services/factura-detalle-prefijos.service';

export interface FacturacionMesesData {
  anioActual: number;
  prefijos: { id_prefijos: number; codpre: string }[];
  idPrefijo: number | null;
  codpre: string | null;
  onAceptar?: (res: FacturacionMesesResult) => void;
}

export interface FacturacionMesesResult {
  anio: number;
  fechaUltimaPago: string; // dd/MM/yyyy
  fechaHastaPaga: string;  // dd/MM/yyyy
  numeroMeses: number;
  periodo: string;         // "MesInicio AñoInicio -- MesFin AñoFin"
  idPrefijo: number;       // obligatorio
  codpre: string;          // obligatorio
}

/** Formato dd/MM/yyyy para el datepicker */
export const ES_FORMATS = {
  parse:   { dateInput: 'DD/MM/YYYY' },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'DD/MM/YYYY',
    monthYearA11yLabel: 'MMMM YYYY',
  }
};

@Component({
  selector: 'app-facturacion-meses-modal',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule,
    MatDatepickerModule, MatMomentDateModule,
    MatSelectModule, MatOptionModule,
    HttpClientModule,          // 👉 asegura HttpClient disponible si el padre no lo importa
    AgGridModule
  ],
  templateUrl: './facturacion-meses-modal.component.html',
  styleUrls: ['./facturacion-meses-modal.component.css'],
  providers: [
    { provide: MAT_DATE_FORMATS, useValue: ES_FORMATS },
    { provide: MAT_MOMENT_DATE_ADAPTER_OPTIONS, useValue: { useUtc: true } },
  ]
})
export class FacturacionMesesModalComponent implements OnInit {
  form: FormGroup;
  aplicado = false;
  // dentro de tu componente
gridHeightPx = 150;   // ajusta a 200/240/300 según quieras
rowHeight = 28;       // filas compactas (opcional)

  // =======================
  // AG Grid
  // =======================
  rowData: FacturaDetallePrefijoResponse[] = [];

  // Define columnas (sin flex por-columna; lo ponemos en defaultColDef)
 defaultColDef: ColDef = {
  resizable: true,
  sortable: true
};

columnDefs: ColDef[] = [
  { headerName: 'Factura', field: 'numnota', width: 180 },
  { headerName: 'F.Factura', field: 'fechaFactura', width: 120, valueFormatter: p => this.formatISODate(p.value) },
  { headerName: '#Meses', field: 'cantidad', width: 70 },
  { headerName: 'Descripción', field: 'descripcion', minWidth: 280, flex: 2 ,  tooltipField: 'descripcion' ,cellClass: 'cell-ellipsis'   }, // ← flexible, crece
  { headerName: 'Desde', field: 'periodoDesde', width: 140, valueFormatter: p => this.formatISODate(p.value) },
  { headerName: 'Hasta', field: 'periodoHasta', width: 140, valueFormatter: p => this.formatISODate(p.value) },
];

  isLoading = false;
  private gridApi?: GridApi;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: FacturacionMesesData,
    public ref: MatDialogRef<FacturacionMesesModalComponent>,
    private fb: FormBuilder,
    private prefijosSrv: FacturaDetallePrefijosService
  ){
    const y = data?.anioActual ?? new Date().getFullYear();
    const f1 = new Date(y, 0, 1);
    const f2 = new Date(y, 11, 31);

    this.form = this.fb.group({
      idPrefijo: [data?.idPrefijo ?? null],
      fchUltimaPago: [f1],
      fchHastaPaga: [f2],
      numMeses: [0],
      mesFinNombre: [''],
      anioFin: [f2.getFullYear()]
    });

    // Al cambiar el prefijo, consultar
    this.form.get('idPrefijo')?.valueChanges.subscribe(v => {
      if (v) this.consultar();
      else this.rowData = [];
    });

    this.recalcular();
  }

  ngOnInit(): void {
    // Cuando el diálogo ya abrió, ajustar columnas (asegura contenedor con tamaño)
    this.ref.afterOpened().subscribe(() =>
      setTimeout(() => this.gridApi?.sizeColumnsToFit(), 0)
    );

    // Si ya viene seleccionado desde el padre, carga al iniciar
    if (this.form.get('idPrefijo')?.value) {
      this.consultar();
    }
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api as GridApi;
    setTimeout(() => this.gridApi?.sizeColumnsToFit(), 0);
  }

  // Reajustar al redimensionar ventana
  @HostListener('window:resize')
  onResize() {
    setTimeout(() => this.gridApi?.sizeColumnsToFit(), 0);
  }

  bloquearTeclado(e: KeyboardEvent) {
    if (e.key !== 'Tab' && e.key !== 'Shift') e.preventDefault();
  }

  private asDate(v: any): Date | null {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (typeof v === 'object' && typeof v.toDate === 'function') {
      try { return v.toDate(); } catch { /* ignore */ }
    }
    if (typeof v === 'string') {
      const isISO = /^\d{4}-\d{2}-\d{2}/.test(v);
      if (isISO) {
        const base = v.split('T')[0];
        const [y, m, d] = base.split('-').map(Number);
        if (y && m && d) return new Date(y, m - 1, d);
      } else {
        const parts = v.split(/[\/-]/).map(Number);
        if (parts.length === 3) {
          const [dd, mm, yyyy] = parts;
          if (yyyy && mm && dd) return new Date(yyyy, mm - 1, dd);
        }
      }
    }
    return null;
  }

  private pad(n: number){ return n < 10 ? `0${n}` : `${n}`; }

  private format(d: Date): string {
    return `${this.pad(d.getDate())}/${this.pad(d.getMonth()+1)}/${d.getFullYear()}`;
  }

  private mesNombre(d: Date): string {
    return d.toLocaleDateString('es-EC', { month: 'long' }).replace(/^\w/, c => c.toUpperCase());
  }

  private diffMeses(a: Date, b: Date, inclusive = true): number {
    let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
    if (inclusive) m += 1;
    return Math.max(0, m);
  }

  formatISODate(iso?: string | null): string {
    if (!iso) return '';
    const base = iso.split('T')[0];
    const [y, m, d] = base.split('-').map(Number);
    if (!y || !m || !d) return iso;
    const dd = d < 10 ? `0${d}` : `${d}`;
    const mm = m < 10 ? `0${m}` : `${m}`;
    return `${dd}/${mm}/${y}`;
  }

  recalcular(): void {
    const d1 = this.asDate(this.form.get('fchUltimaPago')?.value);
    const d2 = this.asDate(this.form.get('fchHastaPaga')?.value);
    if (!d1 || !d2) return;

    if (d2 < d1) {
      alert('Debe ingresar una fecha mayor o igual a la del Último Pago.');
      return;
    }

    this.form.patchValue({
      numMeses: this.diffMeses(d1, d2, true),
      mesFinNombre: this.mesNombre(d2),
      anioFin: d2.getFullYear()
    }, { emitEvent: false });
  }

  consultar(): void {
    const idPrefijo = Number(this.form.get('idPrefijo')?.value ?? 0);
    if (!idPrefijo) { this.rowData = []; return; }

    const codpre = this.data.prefijos.find(p => p.id_prefijos === idPrefijo)?.codpre ?? '';
    if (!codpre) { this.rowData = []; return; }

    this.isLoading = true;
    this.gridApi?.showLoadingOverlay();

    this.prefijosSrv.getByCodigo(codpre).subscribe({
      next: (rows) => {
        // Orden descendente por fecha (ISO)
        this.rowData = [...rows].sort((a, b) => (b.fechaFactura ?? '').localeCompare(a.fechaFactura ?? ''));
        this.isLoading = false;
        setTimeout(() => {
          this.gridApi?.hideOverlay();
          this.gridApi?.sizeColumnsToFit();
        }, 0);
      },
      error: (err) => {
        console.error('[FacturaDetallePrefijos] error', err);
        this.rowData = [];
        this.isLoading = false;
        this.gridApi?.hideOverlay();
      }
    });
  }

  aceptar(): void {
    if (this.aplicado) return;

    const d1 = this.asDate(this.form.get('fchUltimaPago')?.value);
    const d2 = this.asDate(this.form.get('fchHastaPaga')?.value);
    if (!d1 || !d2 || d2 < d1) {
      alert('Debe ingresar una fecha mayor o igual a la del Último Pago.');
      return;
    }

    const idPrefijo = Number(this.form.get('idPrefijo')?.value ?? 0);
    if (!idPrefijo) {
      alert('Seleccione un prefijo.');
      return;
    }
    const codpre = this.data.prefijos.find(p => p.id_prefijos === idPrefijo)?.codpre ?? '';

    const numeroMeses = this.diffMeses(d1, d2, true);
    const periodo = `${this.mesNombre(d1)} ${d1.getFullYear()} -- ${this.mesNombre(d2)} ${d2.getFullYear()}`;

    const res: FacturacionMesesResult = {
      anio: d2.getFullYear(),
      fechaUltimaPago: this.format(d1),
      fechaHastaPaga: this.format(d2),
      numeroMeses,
      periodo,
      idPrefijo,
      codpre
    };

    this.data.onAceptar?.(res);
    this.aplicado = true;
  }

  salir(): void {
    this.ref.close();
  }
}
