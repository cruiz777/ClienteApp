import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';
import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
import { RpEmpresaComplementariaService } from 'src/app/services/rol/empresa complementaria.service';
import { RpEmpresaComplementariaResponse } from 'src/app/interfaces/responses/empresa-complementaria-response';
import { CreateRpEmpresaComplementariaRequest } from 'src/app/interfaces/requests/empresa-complementaria.request';

@Component({
  selector: 'app-rp-empresa-complementaria-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  templateUrl: './empresa-complementaria-form.component.html',
  styleUrls: ['./empresa-complementaria-form.component.css']
})
export class RpEmpresaComplementariaFormComponent implements OnInit {

  form!: FormGroup;
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    private rpEmpresaComplementariaService: RpEmpresaComplementariaService,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<RpEmpresaComplementariaFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id?: number }
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      idEmpresaComplementaria: [0],
      empresa:                 ['', [Validators.required, Validators.maxLength(248)]],
      ruc:                     ['', [Validators.maxLength(13)]],
      estado:                  [true],
    });

    this.isEditMode = !!this.data?.id;

    if (this.isEditMode && this.data.id) {
      this.rpEmpresaComplementariaService.getById(this.data.id).subscribe({
        next: (resp: ApiResponse<RpEmpresaComplementariaResponse>) => {
          this.form.patchValue(resp.data);
        },
        error: () => this.mostrarMensaje({
          type: 'error',
          title: 'Error',
          message: 'No se pudo cargar la empresa complementaria.',
          showCancel: false,
          confirmText: 'Aceptar'
        })
      });
    }
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.mostrarMensaje({
        type: 'warning',
        title: 'Formulario inválido',
        message: 'Completa todos los campos obligatorios.',
        showCancel: false,
        confirmText: 'Aceptar'
      });
      return;
    }

    const raw = this.form.getRawValue();

    const payload: CreateRpEmpresaComplementariaRequest = {
      empresa: (raw.empresa ?? '').trim(),
      ruc:     raw.ruc?.trim() || null,
      estado:  raw.estado,
    };

    const req$ = this.isEditMode
      ? this.rpEmpresaComplementariaService.update(raw.idEmpresaComplementaria, payload)
      : this.rpEmpresaComplementariaService.create(payload);

    req$.subscribe({
      next: () =>
        this.mostrarMensaje({
          type: 'success',
          title: 'Éxito',
          message: `Empresa complementaria ${this.isEditMode ? 'actualizada' : 'creada'} correctamente.`,
          showCancel: false,
          confirmText: 'Aceptar'
        }).afterClosed().subscribe(() => this.dialogRef.close(true)),
      error: (err) => {
        const msg = err?.error?.message ?? err?.message
          ?? `No se pudo ${this.isEditMode ? 'actualizar' : 'crear'} la empresa complementaria.`;
        this.mostrarMensaje({
          type: 'error',
          title: 'Error',
          message: msg,
          showCancel: false,
          confirmText: 'Aceptar'
        });
      }
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
}