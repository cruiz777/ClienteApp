import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { EmpresaService } from 'src/app/services/empresa.service';
import { TipoNegocioService } from 'src/app/services/tipo-negocio.service';

import { EmpresaResponse } from 'src/app/interfaces/responses/empresa-response';
import { TipoNegocioRequest } from 'src/app/interfaces/requests/tipo-negocio-request';

import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';

@Component({
  selector: 'app-tipo-negocio-form',
  templateUrl: './tipo-negocio-form.component.html',
  styleUrls: ['./tipo-negocio-form.component.css']
})
export class TipoNegocioFormComponent implements OnInit {
  form: FormGroup;
  isEditMode: boolean = false;
  empresas: EmpresaResponse[] = [];

  constructor(
    private fb: FormBuilder,
    private tipoNegocioService: TipoNegocioService,
    private empresaService: EmpresaService,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<TipoNegocioFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id?: number }
  ) {
    this.form = this.fb.group({
      id: [0],
      descripcion: ['', Validators.required],
      estado: [true],
      idEmpresa: [null, Validators.required]
    });

    this.isEditMode = !!data?.id;
  }

  ngOnInit(): void {
    this.cargarEmpresas();

    if (this.isEditMode && this.data.id) {
      this.tipoNegocioService.getById(this.data.id).subscribe({
        next: (res) => {
          this.form.patchValue(res.data);
        },
        error: () => {
          this.mostrarMensaje({
            type: 'error',
            title: 'Error',
            message: 'No se pudo cargar el tipo de negocio.',
            showCancel: false
          });
        }
      });
    }
  }

  private cargarEmpresas(): void {
    this.empresaService.getEmpresas().subscribe({
      next: (data) => {
        this.empresas = data;
      },
      error: () => {
        this.mostrarMensaje({
          type: 'error',
          title: 'Error',
          message: 'No se pudo cargar la lista de empresas.',
          showCancel: false
        });
      }
    });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.mostrarMensaje({
        type: 'warning',
        title: 'Formulario inválido',
        message: 'Completa todos los campos obligatorios.',
        showCancel: false
      });
      return;
    }
  const rawData = this.form.value;

  // 🛠️ Forzar booleano por seguridad
  rawData.estado = rawData.estado === true || rawData.estado === 'true';

    const data: TipoNegocioRequest = this.form.value;

    const request$ = this.isEditMode
      ? this.tipoNegocioService.update(data.id!, data)
      : this.tipoNegocioService.create(data);

    request$.subscribe({
      next: () => {
        this.mostrarMensaje({
          type: 'success',
          title: 'Éxito',
          message: `Tipo de negocio ${this.isEditMode ? 'actualizado' : 'creado'} correctamente.`,
          showCancel: false
        }).afterClosed().subscribe(() => this.dialogRef.close(true));
      },
      error: () => {
        this.mostrarMensaje({
          type: 'error',
          title: 'Error',
          message: `No se pudo ${this.isEditMode ? 'actualizar' : 'crear'} el tipo de negocio.`,
          showCancel: false
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
      data: {
        confirmText: 'Aceptar',
        cancelText: 'Cancelar',
        ...data
      }
    });
  }
}
