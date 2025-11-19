import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, MAT_DATE_LOCALE, MAT_DATE_FORMATS, DateAdapter } from '@angular/material/core';
import { NativeDateAdapter } from '@angular/material/core';

// ✅ FORMATO PERSONALIZADO dd/MM/yyyy
export const MY_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'DD/MM/YYYY',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

// ✅ ADAPTER PERSONALIZADO para parsear dd/MM/yyyy
export class CustomDateAdapter extends NativeDateAdapter {
  override parse(value: any): Date | null {
    if (typeof value === 'string') {
      const parts = value.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Mes es 0-indexed
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day);
      }
    }
    return super.parse(value);
  }

  override format(date: Date, displayFormat: Object): string {
    if (displayFormat === 'input') {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return super.format(date, displayFormat);
  }
}

export interface MotivoAnulacionData {
  motivo: string;
  fecha: Date;
}

@Component({
  selector: 'app-motivo-anulacion-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  providers: [
    // ✅ CONFIGURAR LOCALE ESPAÑOL Y FORMATO PERSONALIZADO
    { provide: MAT_DATE_LOCALE, useValue: 'es-EC' },
    { provide: DateAdapter, useClass: CustomDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS }
  ],
  template: `
    <h2 mat-dialog-title>Motivo de anulación</h2>
    <mat-dialog-content>
      <p style="margin-bottom: 15px; color: #666;">
        Por favor indique el motivo y fecha de anulación de este anticipo:
      </p>

      <form [formGroup]="form" style="display: flex; flex-direction: column; gap: 15px;">
        <!-- ✅ CAMPO DE FECHA -->
        <mat-form-field appearance="outline" style="width: 100%;">
          <mat-label>Fecha de anulación</mat-label>
          <input
            matInput
            [matDatepicker]="picker"
            formControlName="fecha"
            placeholder="dd/mm/aaaa">
          <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-datepicker #picker></mat-datepicker>
          <mat-error *ngIf="form.get('fecha')?.hasError('required')">
            La fecha es obligatoria
          </mat-error>
        </mat-form-field>

        <!-- CAMPO DE MOTIVO -->
        <mat-form-field appearance="outline" style="width: 100%;">
          <mat-label>Motivo</mat-label>
          <textarea
            matInput
            formControlName="motivo"
            rows="4"
            placeholder="Ejemplo: Error en el monto ingresado"
            maxlength="200"
            style="resize: vertical;">
          </textarea>
          <mat-hint align="end">{{form.get('motivo')?.value?.length || 0}}/200</mat-hint>
          <mat-error *ngIf="form.get('motivo')?.hasError('required')">
            El motivo es obligatorio
          </mat-error>
          <mat-error *ngIf="form.get('motivo')?.hasError('minlength')">
            Ingrese al menos 10 caracteres
          </mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button
        mat-raised-button
        color="warn"
        (click)="onConfirm()"
        [disabled]="form.invalid">
        Anular anticipo
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 450px;
      padding: 20px 24px;
    }
  `]
})
export class MotivoAnulacionDialogComponent {
  form = new FormGroup({
    fecha: new FormControl(new Date(), [Validators.required]),
    motivo: new FormControl('', [
      Validators.required,
      Validators.minLength(10),
      Validators.maxLength(200)
    ])
  });

  constructor(
    public dialogRef: MatDialogRef<MotivoAnulacionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onConfirm(): void {
    if (this.form.valid) {
      const result: MotivoAnulacionData = {
        fecha: this.form.get('fecha')?.value || new Date(),
        motivo: this.form.get('motivo')?.value?.trim() || ''
      };
      this.dialogRef.close(result);
    }
  }
}
