import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { BancosService } from 'src/app/services/bancos.service';
import { BancosRequest } from 'src/app/interfaces/requests/bancos-request';

import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';

import { UsuarioService } from 'src/app/services/usuario.service';



@Component({
  selector: 'app-bancos-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './bancos-form.component.html',
  styleUrls: ['./bancos-form.component.css']
})
export class BancosFormComponent implements OnInit {
  form!: FormGroup;
  isEditMode = false;

    usuarioActual = this.usuarioService.getUsuarioActual();

  constructor(
    private fb: FormBuilder,
    private bancosservice: BancosService,
    private usuarioService: UsuarioService,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<BancosFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id?: number }
  ) {}

  ngOnInit(): void {


    this.form = this.fb.group({
      IdBanco: [0],
      Descripcion: ['', [Validators.required, Validators.maxLength(250)]],
      CodigoEspecial: ['', [Validators.required, Validators.maxLength(10)]],
      IdEmpresa:this.usuarioActual?.id_empresa,
    });

    // 🔹 Opcional: forzar mayúsculas en TipDoc mientras escribe (sin loop de eventos)
    this.form.get('CodigoEspecial')?.valueChanges.subscribe(v => {
      if (typeof v === 'string') {
        const up = v.toUpperCase();
        if (v !== up) this.form.get('CodigoEspecial')?.setValue(up, { emitEvent: false });
      }
    });

    this.isEditMode = !!this.data?.id;

    if (this.isEditMode && this.data.id) {
      this.bancosservice.getById(this.data.id).subscribe({
        next: (res) => {
          this.form.patchValue(res.data);
        },
        error: () => this.mostrarMensaje({
          type: 'error',
          title: 'Error',
          message: 'No se pudo cargar bancos.',
          showCancel: false
        })
      });
    } else {
    }
  }


  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.mostrarMensaje({
        type: 'warning',
        title: 'Formulario inválido',
        message: 'Completa todos los campos obligatorios.',
        showCancel: false
      });
      return;
    }

    // 🔹 Construye el payload asegurando MAYÚSCULAS
    const raw = this.form.getRawValue(); // por si luego deshabilitas campos
    const data: BancosRequest = {
      ...raw,
      FecVal:  String(raw.CodigoEspecial ?? '').trim().toUpperCase(),
    };

    const req$ = this.isEditMode
      ? this.bancosservice.update(data.IdBanco!, data)
      : this.bancosservice.create(data);

    req$.subscribe({
      next: () =>
        this.mostrarMensaje({
          type: 'success',
          title: 'Éxito',
          message: `Bancos ${this.isEditMode ? 'actualizado' : 'creado'} correctamente.`,
          showCancel: false
        }).afterClosed().subscribe(() => this.dialogRef.close(true)),
      error: () =>
        this.mostrarMensaje({
          type: 'error',
          title: 'Error',
          message: `No se pudo ${this.isEditMode ? 'actualizar' : 'crear'} Bancos.`,
          showCancel: false
        })
    });
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }

  private mostrarMensaje(data: MessageBoxData) {
    return this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: { confirmText: 'Aceptar', cancelText: 'Cancelar', ...data }
    });
  }

  soloNumeros(ev: KeyboardEvent) {
    const k = ev.key;
    if (!/[0-9]/.test(k) && k !== 'Backspace' && k !== 'Tab' &&
        k !== 'ArrowLeft' && k !== 'ArrowRight' && k !== 'Delete') {
      ev.preventDefault();
    }
  }
  soloLetras(ev: KeyboardEvent) {
    const k = ev.key;
    if (!/[A-Za-zÁÉÍÓÚáéíóúÑñüÜ\s]/.test(k) && k !== 'Backspace' && k !== 'Tab' &&
        k !== 'ArrowLeft' && k !== 'ArrowRight' && k !== 'Delete') {
      ev.preventDefault();
    }
  }
  bloquearPegadoSiSoloLectura(ev: ClipboardEvent | DragEvent) {
    if (this.isEditMode) ev.preventDefault();
  }
}
