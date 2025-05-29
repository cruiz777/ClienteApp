import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';

import { TipoNegocioService } from 'src/app/services/tipo-negocio.service';
import { EmpresaService } from 'src/app/services/empresa.service';
import { TipoNegocioRequest } from 'src/app/interfaces/requests/tipo-negocio-request';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
import { EmpresaResponse } from 'src/app/interfaces/responses/empresa-response';

@Component({
  selector: 'app-tipo-negocio-form',
  templateUrl: './tipo-negocio-form.component.html',
  styleUrls: ['./tipo-negocio-form.component.css']
})
export class TipoNegocioFormComponent implements OnInit {
  form: FormGroup;
  isEditMode: boolean = false;
  id: number | null = null;
  empresa: EmpresaResponse | null = null;

  constructor(
    private fb: FormBuilder,
    private tipoNegocioService: TipoNegocioService,
    private empresaService: EmpresaService,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog
  ) {
    this.form = this.fb.group({
      descripcion: ['', Validators.required],
      estado: [true]
    });
  }

  ngOnInit(): void {
    this.cargarEmpresa();

    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.isEditMode = !!this.id;

    if (this.isEditMode) {
      this.tipoNegocioService.getById(this.id!).subscribe({
        next: (res) => {
          this.form.patchValue(res.data);
        },
        error: () => {
          this.showMessageBox({
            type: 'error',
            title: 'Error',
            message: 'No se pudo cargar el tipo de negocio',
            showCancel: false
          });
        }
      });
    }
  }

  private cargarEmpresa(): void {
    const idEmpresa = Number(sessionStorage.getItem('empresaId'));
    if (!idEmpresa || isNaN(idEmpresa)) {
      this.showMessageBox({
        type: 'error',
        title: 'Error',
        message: 'No se encontró la empresa en sesión.',
        showCancel: false
      });
      return;
    }

    this.empresaService.getEmpresaById(idEmpresa).subscribe({
      next: (res) => {
        this.empresa = res;
      },
      error: () => {
        this.showMessageBox({
          type: 'error',
          title: 'Error',
          message: 'No se pudo cargar la empresa actual.',
          showCancel: false
        });
      }
    });
  }

  guardar(): void {
    if (this.form.invalid || !this.empresa) {
      this.showMessageBox({
        type: 'warning',
        title: 'Formulario inválido',
        message: 'Completa todos los campos requeridos y asegúrate de que la empresa esté cargada.',
        showCancel: false
      });
      return;
    }

    const data: TipoNegocioRequest = {
      descripcion: this.form.value.descripcion,
      estado: this.form.value.estado,
      idEmpresa: this.empresa.empresaCodigo
    };

    const request$ = this.isEditMode
      ? this.tipoNegocioService.update(this.id!, data)
      : this.tipoNegocioService.create(data);

    request$.subscribe({
      next: () => {
        this.showMessageBox({
          type: 'success',
          title: 'Éxito',
          message: `Tipo de negocio ${this.isEditMode ? 'actualizado' : 'creado'} correctamente`,
          showCancel: false
        }).afterClosed().subscribe(() => {
          this.router.navigate(['/seguridades/segmento-negocio']);
        });
      },
      error: () => {
        this.showMessageBox({
          type: 'error',
          title: 'Error',
          message: `No se pudo ${this.isEditMode ? 'actualizar' : 'crear'} el tipo de negocio`,
          showCancel: false
        });
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/seguridades/segmento-negocio']);
  }

  private showMessageBox(data: MessageBoxData) {
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
