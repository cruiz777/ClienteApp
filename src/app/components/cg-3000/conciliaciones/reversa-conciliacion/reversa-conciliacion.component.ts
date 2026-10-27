import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { CustomMessageBoxComponent } from 'src/app/util/messages/custom-message-box.component';
import { MatDialog ,MatDialogModule } from '@angular/material/dialog';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormsModule,
  FormControl,
} from '@angular/forms';
import { finalize, startWith } from 'rxjs/operators';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';

import { UsuarioService } from 'src/app/services/usuario.service';
import { ConciliacionesService, ApiResponse } from 'src/app/services/conciliaciones.service';
import { PlanCuentasService, PlanCuenta } from 'src/app/services/plan-cuentas.service';

@Component({
  selector: 'app-reversa-conciliacion',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatSnackBarModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './reversa-conciliacion.component.html',
  styleUrls: ['./reversa-conciliacion.component.css'],
})
export class ReversaConciliacionComponent implements OnInit {
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);
  private svc = inject(ConciliacionesService);
  private planSvc = inject(PlanCuentasService);
  private usuarioService = inject(UsuarioService);
  private dialog = inject(MatDialog);
  usuarioActual: any = null;
  loading = false;
  loadingPlan = false;

  planCuentas: PlanCuenta[] = [];
  planCuentasFiltradas: PlanCuenta[] = [];

  planForm: FormGroup = this.fb.group({
    planCuentaBuscar: new FormControl<any>(null),
  });

  form: FormGroup = this.fb.group({
    idPlanCuentas: [null],
    codprePc: [null, [Validators.required]],
    descripcion: [{ value: null, disabled: true }],
    anio: [new Date().getFullYear(), [Validators.required, Validators.min(2000)]],
    mes: [new Date().getMonth() + 1, [Validators.required, Validators.min(1), Validators.max(12)]],
  });

  displayPlanCuenta = (p: PlanCuenta | null): string => {
    if (!p) return '';
    const nombre = (p.NombreCuenta ?? p.Descripcion ?? '').toString();
    return `#${p.IdPlanCuentas} • ${p.CuentaPresentacion} — ${nombre}`;
  };

  ngOnInit(): void {
    this.usuarioActual = this.usuarioService.getUsuarioActual();

    this.cargarPlanCuentas();

    this.planForm.get('planCuentaBuscar')?.valueChanges
      .pipe(startWith(''))
      .subscribe((val) => {
        const txt = val && typeof val === 'object'
          ? this.displayPlanCuenta(val)
          : String(val ?? '');
        this.filtrarPlan(txt);
      });
  }

  private notify(
    message: string,
    type: 'success' | 'error' | 'warn' | 'info' = 'info',
    durationMs = 3500
  ) {
    this.snack.open(message, 'OK', {
      duration: durationMs,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: [`snack-${type}`],
    });
  }

  private cargarPlanCuentas() {
    const idEmpresa = this.getIdEmpresaActual();

    this.loadingPlan = true;

    this.planSvc.getByCodigoEspecial4({ idEmpresa })
      .pipe(finalize(() => (this.loadingPlan = false)))
      .subscribe({
        next: (items: PlanCuenta[]) => {
          this.planCuentas = items ?? [];
          this.planCuentasFiltradas = this.planCuentas.slice(0, 50);
        },
        error: () => {
          this.planCuentas = [];
          this.planCuentasFiltradas = [];
          this.notify('No se pudo cargar el Plan de Cuentas.', 'error', 5000);
        },
      });
  }

  private filtrarPlan(texto: string) {
    const q = (texto ?? '').toString().trim().toLowerCase();

    if (!q) {
      this.planCuentasFiltradas = this.planCuentas.slice(0, 50);
      return;
    }

    this.planCuentasFiltradas = this.planCuentas
      .filter((x) => {
        const id = String(x.IdPlanCuentas ?? '');
        const cuenta = String(x.CuentaPresentacion ?? '').toLowerCase();
        const nombre = String(x.NombreCuenta ?? x.Descripcion ?? '').toLowerCase();
        return id.includes(q) || cuenta.includes(q) || nombre.includes(q);
      })
      .slice(0, 50);
  }

  onPlanCuentaSelected(item: PlanCuenta) {
    if (!item?.IdPlanCuentas) return;

    this.planForm.patchValue(
      { planCuentaBuscar: item },
      { emitEvent: false }
    );

    this.form.patchValue({
      idPlanCuentas: Number(item.IdPlanCuentas),
      codprePc: item.CuentaPresentacion ?? null,
      descripcion: item.NombreCuenta ?? item.Descripcion ?? null,
    });
  }

onReversar(): void {
  if (this.form.invalid) {
    this.form.markAllAsTouched();
    this.notify('Complete los datos requeridos.', 'warn');
    return;
  }

  const raw = this.form.getRawValue();

  const codprePc = String(raw.codprePc ?? '').trim();
  const anio = Number(raw.anio ?? 0);
  const mes = Number(raw.mes ?? 0);
  const descripcion = String(raw.descripcion ?? '').trim();

  if (!codprePc) {
    this.notify('Seleccione Banco.', 'warn');
    return;
  }

  if (!anio) {
    this.notify('Ingrese Año.', 'warn');
    return;
  }

  if (!mes) {
    this.notify('Ingrese Mes.', 'warn');
    return;
  }

  const periodo = `${anio}-${String(mes).padStart(2, '0')}`;

  this.dialog.open(CustomMessageBoxComponent, {
    width: '420px',
    data: {
      title: '¿Desea reversar la conciliación?',
      message:
  `Se procederá a reversar la conciliación bancaria.\n\n` +
  `Cuenta: ${codprePc}\n` +
  `Descripción: ${descripcion || 'N/A'}\n` +
  `Período: ${periodo}\n\n` +
  `¿Desea continuar?`,
      type: 'info',
      confirmText: 'Sí, reversar',
      cancelText: 'Cancelar',
      showCancel: true
    }
  }).afterClosed().subscribe(confirmado => {
    if (!confirmado) {
      console.log('❌ Reversa cancelada por el usuario');
      return;
    }

    const payload = {
      codprePc,
      anio,
      mes,
    };

    this.loading = true;

    this.svc.reversarConciliacion(payload)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res: ApiResponse<boolean>) => {
          if (res.type === 'success') {
            this.dialog.open(CustomMessageBoxComponent, {
              width: '400px',
              data: {
                title: 'Proceso exitoso',
                message: res.message ?? 'La conciliación fue reversada correctamente.',
                type: 'success',
                confirmText: 'Aceptar',
                showCancel: false
              }
            });

            this.onNuevo();
          } else {
            this.dialog.open(CustomMessageBoxComponent, {
              width: '400px',
              data: {
                title: 'No se pudo reversar',
                message: res.message ?? 'Ocurrió un problema al reversar la conciliación.',
                type: 'error',
                confirmText: 'Aceptar',
                showCancel: false
              }
            });
          }
        },
        error: () => {
          this.dialog.open(CustomMessageBoxComponent, {
            width: '400px',
            data: {
              title: 'Error',
              message: 'Ocurrió un error al reversar la conciliación.',
              type: 'error',
              confirmText: 'Aceptar',
              showCancel: false
            }
          });
        }
      });
  });
}

  onNuevo(): void {
    this.planForm.reset(
      { planCuentaBuscar: null },
      { emitEvent: false }
    );

    this.form.reset({
      idPlanCuentas: null,
      codprePc: null,
      descripcion: null,
      anio: new Date().getFullYear(),
      mes: new Date().getMonth() + 1,
    });
  }

  onSalir(): void {
    window.history.back();
  }

  private getIdEmpresaActual(): number {
    return Number(this.usuarioActual?.id_empresa ?? 1);
  }
}