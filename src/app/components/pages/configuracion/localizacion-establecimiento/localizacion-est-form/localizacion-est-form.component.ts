import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

import { TipoLocalizacionService } from 'src/app/services/tipo-localizacion.service';
import { TipoLocalizacionRequest } from 'src/app/interfaces/requests/tipo-localizacion-request';

import { CustomMessageBoxComponent } from 'src/app/util/messages/custom-message-box.component';
import { MessageBoxData } from 'src/app/util/messages/custom-message-box.component';

@Component({
  selector: 'app-localizacion-est-form',
  templateUrl: './localizacion-est-form.component.html',
  styleUrls: ['./localizacion-est-form.component.css']
})
export class TipoLocalizacionFormComponent implements OnInit {
  form!: FormGroup;
  idTipoCliente: number | null = null;
  esEdicion = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private tipoLocalizacionService: TipoLocalizacionService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.idTipoCliente = Number(this.route.snapshot.paramMap.get('id'));
    this.esEdicion = !!this.idTipoCliente;

    this.form = this.fb.group({
      descripcion: ['', Validators.required],
      estado: [true, Validators.required]
    });

    if (this.esEdicion) {
      this.tipoLocalizacionService.getById(this.idTipoCliente!).subscribe({
        next: (res) => {
          const data = res.data;
          this.form.patchValue({
            descripcion: data.descripcion,
            estado: data.estado
          });
        },
        error: () => {
          this.mostrarMensaje({
            title: 'Error',
            message: 'No se pudo cargar la localización.',
            type: 'error',
            confirmText: 'Entendido',
            showCancel: false
          });
        }
      });
    }
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.mostrarMensaje({
        title: 'Campos obligatorios',
        message: 'Debe completar todos los campos requeridos.',
        type: 'warning',
        confirmText: 'Entendido',
        showCancel: false
      });
      return;
    }

    const payload: TipoLocalizacionRequest = {
      id_tipo_cliente: this.idTipoCliente ?? 0,
      descripcion: this.form.value.descripcion.trim(),
      estado: this.form.value.estado
    };

    const request$ = this.esEdicion
      ? this.tipoLocalizacionService.update(this.idTipoCliente!, payload)
      : this.tipoLocalizacionService.create(payload);

    request$.subscribe({
      next: (res) => {
        // Validaciones de negocio del backend
        if (!res.data) {
          this.mostrarMensaje({
            title: 'Advertencia',
            message: res.message,
            type: 'warning',
            confirmText: 'Entendido',
            showCancel: false
          });
          return;
        }

        this.mostrarMensaje({
          title: 'Éxito',
          message: `Localización ${this.esEdicion ? 'actualizada' : 'creada'} correctamente.`,
          type: 'success',
          confirmText: 'Aceptar',
          showCancel: false
        }, true);
      },
      error: () => {
        this.mostrarMensaje({
          title: 'Error',
          message: 'Ocurrió un error al guardar la localización.',
          type: 'error',
          confirmText: 'Cerrar',
          showCancel: false
        });
      }
    });
  }


  cancelar(): void {
    this.router.navigate(['codbar/configuracion/localizacion-establecimiento']);
  }

  private mostrarMensaje(data: MessageBoxData, redirigir = false): void {
    const dialogRef = this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed && redirigir) {
        this.router.navigate(['/menus/localizacion-establecimiento']);
      }
    });
  }
}
