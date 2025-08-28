import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatMomentDateModule, MAT_MOMENT_DATE_ADAPTER_OPTIONS } from '@angular/material-moment-adapter';
import { MAT_DATE_FORMATS } from '@angular/material/core';
export interface FacturacionMesesData {
  anioActual: number;
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
    MatDatepickerModule, MatMomentDateModule
  ],
  templateUrl: './facturacion-meses-modal.component.html',
  styleUrls: ['./facturacion-meses-modal.component.css'],
  providers: [
    { provide: MAT_DATE_FORMATS, useValue: ES_FORMATS },
    { provide: MAT_MOMENT_DATE_ADAPTER_OPTIONS, useValue: { useUtc: true } },
  ]
})
export class FacturacionMesesModalComponent {
  form: FormGroup;
    aplicado = false;
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: FacturacionMesesData,
    public ref: MatDialogRef<FacturacionMesesModalComponent>,
    private fb: FormBuilder
  ){
    const y = data?.anioActual ?? new Date().getFullYear();
    const f1 = new Date(y, 0, 1);   // 01/01/y
    const f2 = new Date(y, 11, 31); // 31/12/y

    this.form = this.fb.group({
      fchUltimaPago: [f1],
      fchHastaPaga: [f2],
      numMeses: [0],
      mesFinNombre: [''],
      anioFin: [f2.getFullYear()]
    });

    this.recalcular(); // inicializa cálculos
  }

  /** Bloquea escritura; sólo Tab/Shift para accesibilidad */
  bloquearTeclado(e: KeyboardEvent) {
    if (e.key !== 'Tab' && e.key !== 'Shift') e.preventDefault();
  }

  /** Convierte Moment | string | Date -> Date */
  private asDate(v: any): Date | null {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (typeof v === 'object' && typeof v.toDate === 'function') return v.toDate(); // Moment
    if (typeof v === 'string') {
      const [dd, mm, yyyy] = v.split(/[/-]/).map(Number);
      if (yyyy && mm && dd) return new Date(yyyy, mm - 1, dd);
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
  /** Diferencia de meses inclusiva (Ene..Dic = 12) */
  private diffMeses(a: Date, b: Date, inclusive = true): number {
    let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
    if (inclusive) m += 1;
    return Math.max(0, m);
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

  aceptar(): void {
    if (this.aplicado) return; // evita doble click

    const d1 = this.asDate(this.form.get('fchUltimaPago')?.value);
    const d2 = this.asDate(this.form.get('fchHastaPaga')?.value);
    if (!d1 || !d2 || d2 < d1) {
      alert('Debe ingresar una fecha mayor o igual a la del Último Pago.');
      return;
    }

    const numeroMeses = this.diffMeses(d1, d2, true);
    const periodo = `${this.mesNombre(d1)} ${d1.getFullYear()} -- ${this.mesNombre(d2)} ${d2.getFullYear()}`;

    const res: FacturacionMesesResult = {
      anio: d2.getFullYear(),
      fechaUltimaPago: this.format(d1),
      fechaHastaPaga: this.format(d2),
      numeroMeses,
      periodo
    };

    this.data.onAceptar?.(res); // envía al padre SIN cerrar
    this.aplicado = true;       // 👈 deshabilita el botón Aceptar
  }

  salir(): void {
    this.ref.close();
  }
  
}
