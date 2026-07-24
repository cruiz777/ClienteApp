import { CommonModule } from '@angular/common';
import {
  Component,
  Inject,
  OnInit
} from '@angular/core';

import {
    EventEmitter,
   Output
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

export interface DialogBancoNominaData {
  fechaPeriodo: string;
  idUsuario: number;
  origen?: 'NOMINA' | 'QUINCENA' | 'DECIMO_CUARTO' | 'DECIMO_TERCERO';
}
export interface DialogBancoNominaResult {
  accion: 'ARCHIVO' | 'REPORTE';
  fechaPeriodo: string;
  codBanco: number;
  descripcionPago: string;
  idUsuario: number;
}

interface Banco {
  codBanco: number;
  nombre: string;
}

@Component({
  selector: 'app-dialog-banco-nomina',
  standalone: true,
  templateUrl: './dialog-banco-nomina.component.html',
  styleUrls: ['./dialog-banco-nomina.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule
  ]
})
export class DialogBancoNominaComponent implements OnInit {
  form!: FormGroup;
  @Output()
readonly archivoSolicitado = new EventEmitter<DialogBancoNominaResult>();
  readonly bancos: Banco[] = [
    {
      codBanco: 1,
      nombre: 'PICHINCHA'
    },
    {
      codBanco: 2,
      nombre: 'PRODUBANCO'
    },
    {
      codBanco: 3,
      nombre: 'PICHINCHA TERCEROS'
    },
    {
      codBanco: 4,
      nombre: 'PRODUBANCO TERCEROS'
    }
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<
      DialogBancoNominaComponent,
      DialogBancoNominaResult | null
    >,
    @Inject(MAT_DIALOG_DATA)
    public readonly data: DialogBancoNominaData
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      codBanco: [2, Validators.required],
      descripcionPago: [
        this.generarDescripcionDefault(),
        Validators.required
      ]
    });
  }

generarArchivo(): void {
  if (!this.formularioValido()) {
    return;
  }

  const result = this.construirResultado('ARCHIVO');

  /*
   * IMPORTANTE:
   * Aquí NO se cierra el modal.
   * Solo se emite el resultado al componente padre.
   */
  this.archivoSolicitado.emit(result);
}

imprimirReporte(): void {
  if (!this.formularioValido()) {
    return;
  }

  /*
   * El reporte sí puede cerrar el modal.
   */
  this.dialogRef.close(
    this.construirResultado('REPORTE')
  );
}

salir(): void {
  this.dialogRef.close(null);
}

  private formularioValido(): boolean {
    if (!this.form) {
      return false;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return false;
    }

    return true;
  }

  private construirResultado(
    accion: 'ARCHIVO' | 'REPORTE'
  ): DialogBancoNominaResult {
    return {
      accion,
      fechaPeriodo: this.data.fechaPeriodo,
      codBanco: Number(this.form.get('codBanco')?.value),
      descripcionPago: (
        this.form.get('descripcionPago')?.value ?? ''
      ).toString(),
      idUsuario: this.data.idUsuario
    };
  }

private generarDescripcionDefault(): string {
  const fecha = this.data.fechaPeriodo?.substring(0, 10);

  if (!fecha) {
    return this.obtenerDescripcionSinFecha();
  }

  const partes = fecha.split('-');

  if (partes.length !== 3) {
    return this.obtenerDescripcionSinFecha();
  }

  const anio = Number(partes[0]);
  const mes = Number(partes[1]);

  const meses = [
    '',
    'ENERO',
    'FEBRERO',
    'MARZO',
    'ABRIL',
    'MAYO',
    'JUNIO',
    'JULIO',
    'AGOSTO',
    'SEPTIEMBRE',
    'OCTUBRE',
    'NOVIEMBRE',
    'DICIEMBRE'
  ];

  if (!anio || mes < 1 || mes > 12) {
    return this.obtenerDescripcionSinFecha();
  }

  switch (this.data.origen) {
    case 'DECIMO_CUARTO':
      return `DÉCIMO CUARTO ${anio}`;

    case 'QUINCENA':
      return `QUINCENA ${meses[mes]} ${anio}`;

    case 'NOMINA':
    default:
      return `NÓMINA ${meses[mes]} ${anio}`;
  }
}

private obtenerDescripcionSinFecha(): string {
  switch (this.data.origen) {
    case 'DECIMO_CUARTO':
      return 'DÉCIMO CUARTO';

    case 'DECIMO_TERCERO':
      return 'DÉCIMO TERCERO';

    case 'QUINCENA':
      return 'QUINCENA';

    case 'NOMINA':
    default:
      return 'NÓMINA';
  }
}
}