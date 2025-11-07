// src/app/components/.../tipo-cuenta-form.component.ts
import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { firstValueFrom, map } from 'rxjs';

import { TipoCuentaService, TipoCuenta } from 'src/app/services/tipocuenta.service';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';

@Component({
  selector: 'app-tipocuenta-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tipo-cuenta-form.component.html',
  styleUrls: ['./tipo-cuenta-form.component.css'],
})
export class TipocuentaFormComponent implements OnInit {
  isEditMode = false;

  model: TipoCuenta = {
    Tipcue: '',
    Destip: '',
    Tranban: '',
    IdTipoCuenta: 0
  };

  loading = false;
  message: string | null = null;
  error: string | null = null;

  @ViewChild('tipcue') tipcueField!: NgModel; // referencia al ngModel del input

  constructor(
    private svc: TipoCuentaService,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<TipocuentaFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id?: number }
  ) {
    this.isEditMode = !!data?.id;
  }

  ngOnInit(): void {
    if (this.isEditMode && this.data.id) {
      this.cargarRegistro(this.data.id);
    }
  }

  private cargarRegistro(id: number): void {
    this.loading = true;
    this.error = null;

    this.svc.getById(id)
      .pipe(
        map((res: any) => res?.data ?? res),
        map((r: any) => {
          const registro: TipoCuenta = {
            IdTipoCuenta: Number(r.IdTipoCuenta ?? r.id ?? r.Id ?? 0) || 0,
            Tipcue: (r.Tipcue ?? r.tipcue ?? '').toString(),
            Destip: (r.Destip ?? r.destip ?? '').toString(),
            Tranban: (r.Tranban ?? r.tranban ?? '').toString().toUpperCase(),
          };
          return registro;
        })
      )
      .subscribe({
        next: (registro) => {
          this.model = registro;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.mostrarMensaje({
            type: 'error',
            title: 'Error',
            message: 'No se pudo cargar el tipo de cuenta.',
            showCancel: false
          });
        }
      });
  }

  private normalize(m: TipoCuenta): TipoCuenta {
    const trim = (s: string) => (s ?? '').trim();
    return {
      Tipcue: trim(m.Tipcue).toUpperCase(),
      Destip: trim(m.Destip),
      Tranban: trim(m.Tranban).substring(0, 1).toUpperCase(),
      IdTipoCuenta: Number(m.IdTipoCuenta || 0),
    };
  }

  /** Validación en blur para nuevos registros: setea error 'duplicate' en el control. */
  async validarDuplicadoTipcueOnBlur(): Promise<void> {
    if (this.isEditMode) return; // en edición no se valida duplicado de Tipcue
    const val = (this.model.Tipcue ?? '').trim().toUpperCase();
    if (!val) return;

    try {
      const exists = await firstValueFrom(this.svc.existsByTipcue(val));
      if (exists) {
        this.tipcueField.control?.setErrors({ ...(this.tipcueField.control?.errors || {}), duplicate: true });
      } else {
        // limpia el error duplicate si ya no aplica
        const errs = { ...(this.tipcueField.control?.errors || {}) };
        delete errs['duplicate'];
        this.tipcueField.control?.setErrors(Object.keys(errs).length ? errs : null);
      }
    } catch {
      // En caso de error de red, no bloqueamos, pero podrías mostrar aviso si quieres.
    }
  }

  async onSubmit(form: NgForm) {
    if (form.invalid) {
      this.mostrarMensajeAdvertencia('Complete todos los campos antes de grabar.');
      return;
    }

    this.loading = true;
    this.message = this.error = null;

    const data = this.normalize(this.model);

    // Bloqueo adicional en submit si es nuevo
    if (!this.isEditMode && data.IdTipoCuenta === 0) {
      try {
        const exists = await firstValueFrom(this.svc.existsByTipcue(data.Tipcue));
        if (exists) {
          this.loading = false;
          this.tipcueField.control?.setErrors({ ...(this.tipcueField.control?.errors || {}), duplicate: true });
          this.mostrarMensaje({
            type: 'warning',
            title: 'Duplicado',
            message: `El código Tipcue "${data.Tipcue}" ya existe. Ingrese otro.`,
            showCancel: false
          });
          return;
        }
      } catch (e) {
        this.loading = false;
        this.error = 'No se pudo validar duplicado. Intente nuevamente.';
        return;
      }
    }

    const req$ = data.IdTipoCuenta > 0
      ? this.svc.update(data.IdTipoCuenta, {
          Tipcue: data.Tipcue,
          Destip: data.Destip,
          Tranban: data.Tranban
        })
      : this.svc.create({
          Tipcue: data.Tipcue,
          Destip: data.Destip,
          Tranban: data.Tranban
        });

    req$
      .pipe(
        map(res => {
          const accion = data.IdTipoCuenta > 0 ? 'actualizado' : 'creado';
          this.mostrarMensaje({
            type: 'warning',
            title: 'Grabar',
            message: `Registro  "${data.Tipcue}" registrado correctamente.`,
            showCancel: false
          });
          return { res, msg: `Registro ${accion} correctamente` };
        })
      )
      .subscribe({
        next: ({ res, msg }) => {
          this.message = msg;
          this.loading = false;

          if (this.model.IdTipoCuenta === 0 && (res as any)?.IdTipoCuenta) {
            this.model.IdTipoCuenta = (res as any).IdTipoCuenta;
          }

          this.dialogRef.close(true);
        },
        error: (e) => {
          this.error = e?.message ?? 'Error al guardar';
          this.loading = false;
        }
      });
  }

  onReset(form: NgForm) {
    form.resetForm({
      Tipcue: '',
      Destip: '',
      Tranban: '',
      IdTipoCuenta: 0
    } as TipoCuenta);
    this.message = this.error = null;
  }

  private mostrarMensaje(data: MessageBoxData) {
    return this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: {
        confirmText: 'Aceptar',
        cancelText: 'Cancelar',
        ...data
      }
    });
  }

  cerrar(): void {
    this.dialogRef.close(true);
  }

  private mostrarMensajeAdvertencia(mensaje: string): void {
    this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: {
        title: 'Campos obligatorios',
        message: mensaje,
        type: 'warning',
        confirmText: 'Entendido',
        showCancel: false
      }
    });
  }
}
