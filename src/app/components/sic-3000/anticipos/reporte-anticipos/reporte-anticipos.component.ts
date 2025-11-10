import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ReactiveFormsModule,
  FormsModule
} from '@angular/forms';

interface TipoAnticipo {
  id: number;
  descripcion: string;
}

@Component({
  standalone: true, // ✅ lo hace independiente del módulo
  selector: 'app-reporte-anticipos',
  templateUrl: './reporte-anticipos.component.html',
  styleUrls: ['./reporte-anticipos.component.css'],
  imports: [
    CommonModule,        // ✅ necesario para directivas *ngIf, *ngFor, etc.
    ReactiveFormsModule, // ✅ para [formGroup], formControlName, etc.
    FormsModule          // ✅ para [ngValue]
  ]
})
export class ReporteAnticiposComponent implements OnInit {
  form!: FormGroup;

  // Datos de ejemplo
  tiposAnticipo: TipoAnticipo[] = [
    { id: 1, descripcion: 'Anticipo General' },
    { id: 2, descripcion: 'Anticipo xxx' },
    { id: 3, descripcion: 'Anticipo yyy' }
  ];

  loading = false;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group(
      {
        fechaInicio: [null, Validators.required],
        fechaFin: [null, Validators.required],
        tipoAnticipo: [null],
        estado: this.fb.group({
          utilizado: [false],
          sinUtilizar: [false],
          todos: [true]
        })
      },
      { validators: [this.rangoFechasValidator()] }
    );

    // Lógica de exclusión de checkboxes
    this.form.get('estado.todos')!.valueChanges.subscribe(v => {
      if (v) {
        this.form.patchValue(
          { estado: { utilizado: false, sinUtilizar: false } },
          { emitEvent: false }
        );
      }
    });

    this.form.get('estado.utilizado')!.valueChanges.subscribe(v => {
      if (v) this.form.get('estado.todos')!.setValue(false, { emitEvent: false });
    });

    this.form.get('estado.sinUtilizar')!.valueChanges.subscribe(v => {
      if (v) this.form.get('estado.todos')!.setValue(false, { emitEvent: false });
    });
  }

  // ===== Validador personalizado =====
  private rangoFechasValidator() {
    return (group: AbstractControl) => {
      const a = group.get('fechaInicio')?.value as Date | null;
      const b = group.get('fechaFin')?.value as Date | null;
      if (a && b && a > b) return { rangoInvalido: true };
      return null;
    };
  }

  // ===== Getters =====
  get f() {
    return this.form.controls;
  }

  // ===== Acciones =====
  onGenerar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { fechaInicio, fechaFin, tipoAnticipo, estado } = this.form.value;
    const estadoFiltro =
      estado.todos
        ? 'TODOS'
        : estado.utilizado
        ? 'UTILIZADO'
        : estado.sinUtilizar
        ? 'SIN_UTILIZAR'
        : 'TODOS';

    const payload = {
      fechaInicio,
      fechaFin,
      idTipoAnticipo: tipoAnticipo,
      estado: estadoFiltro
    };

    console.log('Payload reporte:', payload);
  }

  onCancelar(): void {
    this.form.reset({
      fechaInicio: null,
      fechaFin: null,
      tipoAnticipo: null,
      estado: { utilizado: false, sinUtilizar: false, todos: true }
    });
  }
}
