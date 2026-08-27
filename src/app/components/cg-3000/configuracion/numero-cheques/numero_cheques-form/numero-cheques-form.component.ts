import { Component, Inject, Input, Output, EventEmitter, OnInit, computed, signal, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Observable, of } from 'rxjs';
import { map, distinctUntilChanged, first, startWith } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';

import { NumeroChequesService } from 'src/app/services/numeracion-cheques.service';
import { PlanCuentasService, PlanCuenta } from 'src/app/services/plan-cuentas.service';
import { UsuarioService } from 'src/app/services/usuario.service';

export interface NumeroChequesResponse {
  IdNroCheque: number;
  CuentaBanco: string;
  NumCheque: number;
  NumTra: number;
  Estado: string;
  Ocupado: boolean;
  NumTragGlobal: number;
  IdEmpresa: number;
  IdPlanCuentas: number;
}
export interface NumeroChequesRequest extends NumeroChequesResponse {}
type DialogData = { initial?: Partial<NumeroChequesResponse> | null; id?: number | null };

@Component({
  selector: 'app-numero-cheques-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatAutocompleteModule,
    MatCheckboxModule, MatButtonModule, MatIconModule, MatSnackBarModule, MatDialogModule
  ],
  templateUrl: './numero-cheques-form.component.html',
  styleUrls: ['./numero-cheques-form.component.css']
})
export class NumeroChequesFormComponent implements OnInit {
  @Input() initial: Partial<NumeroChequesResponse> | null = null;
  @Output() saved = new EventEmitter<NumeroChequesResponse>();
  @Output() canceled = new EventEmitter<void>();

  private auth = inject(UsuarioService);

  constructor(
    private fb: FormBuilder,
    private svc: NumeroChequesService,
    private planSvc: PlanCuentasService,
    private snack: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: DialogData | null = null,
    private dialogRef?: MatDialogRef<NumeroChequesFormComponent>
  ) {}

  @ViewChild('planInput', { static: false }) planInput?: ElementRef<HTMLInputElement>;

  loading = signal(false);
  editing = signal(false);

  // ---------- Form ----------
  form = this.fb.group({
    IdNroCheque: [0],
    CuentaBanco: ['', [Validators.maxLength(100)]],
    NumCheque: [null as number | null, [Validators.required, Validators.min(1)]],
    NumTra: [0, [Validators.required, Validators.min(0)]],
    Estado: ['A', [Validators.required]],
    Ocupado: [false],
    NumTragGlobal: [0, [Validators.required, Validators.min(0)]],
    IdEmpresa: [this.auth.getUsuarioActual()?.id_empresa ?? 1, [Validators.required, Validators.min(1)]],
    IdPlanCuentas: [null as number | null, {
      validators: [Validators.required, Validators.min(1)],
      asyncValidators: [],                 // validación async se añade en ngOnInit
    }],
  });
  get f() { return this.form.controls; }

  // Botón solo se desactiva mientras guarda/carga
  disableSave = computed(() => this.loading());

  // ---------- Plan de cuentas ----------
  allPlanCtas = signal<PlanCuenta[]>([]);
  planFilterCtrl = this.fb.control<PlanCuenta | string>('');
  private empresaSig = signal<number | null>(this.auth.getUsuarioActual()?.id_empresa ?? null);
  private querySig = toSignal(
    this.planFilterCtrl.valueChanges.pipe(
      startWith(this.planFilterCtrl.value ?? ''),
      map(v => (typeof v === 'string' ? v : ''))
    ),
    { initialValue: '' }
  );

  filteredPlanCtas = computed(() => {
    const q = (this.querySig() ?? '').toLowerCase().trim();
    const empresa = Number(this.empresaSig() || 0);

    const base = this.allPlanCtas()
      .filter(x => (x as any).EsMovimiento === 1 || x.EsMovimiento === true)
      .filter(x => !empresa || x.IdEmpresa === empresa);

    if (!q) return base.slice(0, 100);

    return base.filter(x => {
      const codigo  = (x.CodigoCompleto ?? '').toLowerCase();
      const nombre  = (x.NombreCuenta ?? '').toLowerCase();
      const present = (x.CuentaPresentacion ?? '').toLowerCase();
      return codigo.includes(q) || nombre.includes(q) || present.includes(q);
    }).slice(0, 100);
  });

  ngOnInit(): void {
    // Garantiza empresa válida
    const emp = this.auth.getUsuarioActual()?.id_empresa ?? 1;
    if (!this.f.IdEmpresa.value || Number(this.f.IdEmpresa.value) < 1) {
      this.f.IdEmpresa.setValue(emp);
    }

    this.f.IdEmpresa.valueChanges
      .pipe(startWith(this.f.IdEmpresa.value))
      .subscribe(v => this.empresaSig.set(v as number | null));

    this.planSvc.getAll().pipe(first()).subscribe(list => {
      this.allPlanCtas.set(list ?? []);
      this.f.IdPlanCuentas.addValidators(this.planMovimientoValidator());
      const idSel = Number(this.f.IdPlanCuentas.value || 0);
      if (idSel) {
        const p = this.allPlanCtas().find(x => x.IdPlanCuentas === idSel);
        if (p) this.planFilterCtrl.setValue(p, { emitEvent: false });
      }
    });

    const passedInitial = this.data?.initial ?? this.initial ?? null;
    const passedId = this.data?.id ?? null;

    if (passedInitial && (passedInitial.IdNroCheque ?? 0) > 0) {
      this.editing.set(true);
      this.form.patchValue(passedInitial as any);
      this.togglePlanDisabled(true);
    } else if (passedId && passedId > 0) {
      this.editing.set(true);
      this.loading.set(true);
      this.svc.getById(passedId).pipe(first()).subscribe({
        next: res => {
          const item = (res as any)?.data ?? res;
          this.form.patchValue(item);
          this.loading.set(false);
          const p = this.allPlanCtas().find(x => x.IdPlanCuentas === item?.IdPlanCuentas);
          if (p) this.planFilterCtrl.setValue(p, { emitEvent: false });
          this.togglePlanDisabled(true);
        },
        error: _ => {
          this.loading.set(false);
          this.snack.open('No se pudo cargar el registro.', 'Cerrar', { duration: 3000, horizontalPosition: 'right', verticalPosition: 'top' });
        }
      });
    } else {
      this.editing.set(false);
      this.togglePlanDisabled(false);
    }

    // Async validator de duplicado
    const asyncDupValidator = this.planPorEmpresaDuplicadoValidator(
      () => Number(this.f.IdEmpresa.value || 0),
      () => Number(this.f.IdPlanCuentas.value || 0),
      () => Number(this.f.IdNroCheque.value || 0)
    );
    this.f.IdPlanCuentas.addAsyncValidators(asyncDupValidator);

    // Si escribe en el buscador, limpia el IdPlanCuentas
    this.planFilterCtrl.valueChanges.pipe(distinctUntilChanged()).subscribe(v => {
      if (typeof v === 'string') {
        this.f.IdPlanCuentas.setValue(null, { emitEvent: false });
        this.f.IdPlanCuentas.updateValueAndValidity({ onlySelf: true, emitEvent: false });
      }
    });
  }

  private planMovimientoValidator() {
    return (ctrl: AbstractControl): ValidationErrors | null => {
      const id = Number(ctrl.value || 0);
      if (!id) return null;
      const p = this.allPlanCtas().find(x => x.IdPlanCuentas === id);
      const esMov = p && (((p as any).EsMovimiento === 1) || p.EsMovimiento === true);
      return esMov ? null : { noMovimiento: true };
    };
  }

  private planPorEmpresaDuplicadoValidator(
    getEmpresa: () => number,
    getPlan: () => number,
    getIdActual: () => number
  ): AsyncValidatorFn {
    return (_ctrl: AbstractControl): Observable<ValidationErrors | null> => {
      const empresa = getEmpresa();
      const plan = getPlan();
      if (!empresa || !plan) return of(null);
      return this.svc.getAll().pipe(
        map(resp => {
          const items: NumeroChequesResponse[] = (resp as any)?.data ?? (Array.isArray(resp) ? resp : []);
          const actual = getIdActual();
          const duplicado = items?.some(x =>
            x.IdEmpresa === empresa && x.IdPlanCuentas === plan && x.IdNroCheque !== actual
          );
          return duplicado ? { planDuplicadoEmpresa: true } : null;
        }),
        first()
      );
    };
  }

  displayPlanOpt = (v?: PlanCuenta | string | null): string => {
    if (!v) return '';
    if (typeof v === 'string') return v;
    const present = (v.CuentaPresentacion ?? '').toString().trim();
    const nombre  = (v.NombreCuenta ?? '').toString().trim();
    return [present, nombre].filter(Boolean).join(' — ');
  };

  private focusPlan() {
    setTimeout(() => this.planInput?.nativeElement?.focus(), 0);
  }

  submit(): void {
    // ——— Validación especial para NUEVO ———
    if (!this.editing()) {
      const planCtrl = this.f.IdPlanCuentas;

      // 1) Debe tener plan seleccionado
      if (!planCtrl.value) {
        planCtrl.setErrors({ ...(planCtrl.errors ?? {}), required: true });
        this.snack.open('Seleccione un Plan de Cuentas.', 'OK', { duration: 2500, horizontalPosition: 'right', verticalPosition: 'top' });
        this.focusPlan();
        return;
      }

      // 2) Fuerza validaciones (incluye async)
      planCtrl.updateValueAndValidity({ onlySelf: true });

      const afterAsync = () => {
        // 2.a) Duplicado
        if (planCtrl.hasError('planDuplicadoEmpresa')) {
          this.snack.open('Cuenta duplicada: ya existe para la empresa seleccionada.', 'Cerrar', {
            duration: 3500, horizontalPosition: 'right', verticalPosition: 'top'
          });
          this.focusPlan();
          return;
        }
        // 2.b) No es de movimiento
        if (planCtrl.hasError('noMovimiento')) {
          this.snack.open('Seleccione una cuenta de movimiento.', 'Cerrar', {
            duration: 3000, horizontalPosition: 'right', verticalPosition: 'top'
          });
          this.focusPlan();
          return;
        }

        // 3) Validación general del formulario
        if (this.form.invalid) {
          this.form.markAllAsTouched();
          this.snack.open('Completa los campos obligatorios.', 'OK', { duration: 3000,horizontalPosition: 'right', verticalPosition: 'top' });
          return;
        }

        // 4) Guardar
        this.proceedSave();
      };

      if ((planCtrl as any).pending) {
        planCtrl.statusChanges.pipe(first(s => s !== 'PENDING')).subscribe(afterAsync);
        return;
      }
      afterAsync();
      return;
    }

    // ——— Edición ———
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snack.open('Completa los campos obligatorios.', 'OK', { duration: 3000, horizontalPosition: 'right', verticalPosition: 'top' });
      return;
    }
    this.proceedSave();
  }

  private proceedSave() {
    this.loading.set(true);
    // por si justo quedó en pending
    this.f.IdPlanCuentas.updateValueAndValidity({ onlySelf: true });
    if ((this.f.IdPlanCuentas as any).pending) {
      this.f.IdPlanCuentas.statusChanges.pipe(first(s => s !== 'PENDING')).subscribe(() => this._doSave());
    } else {
      this._doSave();
    }
  }

  private _doSave(): void {
    const payload = this.form.getRawValue() as NumeroChequesRequest;
    const obs = this.editing()
      ? this.svc.update(payload.IdNroCheque!, payload)
      : this.svc.create(payload);

    obs.pipe(first()).subscribe({
      next: (res: any) => {
        this.loading.set(false);
        this.snack.open('Guardado correctamente.', 'OK', { duration: 2500 ,horizontalPosition: 'right', verticalPosition: 'top' });
        const value: NumeroChequesResponse = (res?.data ?? payload) as any;
        this.saved.emit(value);
        if (this.dialogRef) this.dialogRef.close(value);
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.message || err?.message || 'Error al guardar.';
        this.snack.open(msg, 'Cerrar', { duration: 4000,horizontalPosition: 'right', verticalPosition: 'top' });
      }
    });
  }

  cancel(): void {
    this.canceled.emit();
    if (this.dialogRef) this.dialogRef.close();
  }

  onPlanSelected(p: PlanCuenta): void {
    if (this.editing()) return;     // bloqueado en edición
    if (!p) return;

    const esMov = ((p as any).EsMovimiento === 1) || p.EsMovimiento === true;
    if (!esMov) {
      this.snack.open('Seleccione una cuenta de movimiento.', 'Cerrar', { duration: 2500, horizontalPosition: 'right', verticalPosition: 'top' });
      return;
    }

    this.planFilterCtrl.setValue(p);
    this.f.IdPlanCuentas.setValue(p.IdPlanCuentas);

    const texto = (p.CuentaPresentacion?.toString().trim())
      || `${p.CuentaPresentacion ?? ''} — ${p.NombreCuenta ?? ''}`.trim();
    this.f.CuentaBanco.setValue(texto);

    this.f.IdPlanCuentas.updateValueAndValidity({ onlySelf: true });
  }

  private togglePlanDisabled(disabled: boolean) {
    const opts = { emitEvent: false };
    if (disabled) {
      this.planFilterCtrl.disable(opts);
      this.f.IdPlanCuentas.disable(opts);
    } else {
      this.planFilterCtrl.enable(opts);
      this.f.IdPlanCuentas.enable(opts);
    }
  }
}
