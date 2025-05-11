import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

import { TipoClienteService } from 'src/app/services/tipo-cliente.service';
import { TipoClienteRequest } from 'src/app/interfaces/requests/tipo-cliente-request';
import { TipoClienteResponse } from 'src/app/interfaces/responses/tipo-cliente-response';
import { CustomMessageBoxComponent } from 'src/app/components/utils/messages/custom-message-box.component';

@Component({
  selector: 'app-tipo-cliente-form',
  templateUrl: './tipo-cliente-form.component.html',
  styleUrls: ['./tipo-cliente-form.component.css']
})
export class TipoClienteFormComponent implements OnInit {
  form!: FormGroup;
  modoEdicion = false;
  tipoClienteId!: number;
  tituloFormulario = 'Creación Tipo de Cliente';

  constructor(
    private fb: FormBuilder,
    private tipoClienteService: TipoClienteService,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.initForm();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.modoEdicion = true;
      this.tipoClienteId = +id;
      this.tituloFormulario = 'Edición Tipo de Cliente';
      this.cargarTipoCliente(this.tipoClienteId);
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      descripcion: ['', [Validators.required, Validators.maxLength(100)]],
      cuenta: ['', [Validators.required, Validators.maxLength(50)]],
      estado: [true, Validators.required],
      empresa: ['SIN EMPRESA', Validators.required],
      empresaCodigo: [1, Validators.required]
    });
  }

  private cargarTipoCliente(id: number): void {
    this.tipoClienteService.getById(id).subscribe({
      next: (response: { data: TipoClienteResponse }) => {
        const data = response.data;
        console.log('✅ Datos recibidos del backend:', data);

        if (!data) return;

        this.form.patchValue({
          descripcion: data.descripcion ?? '',
          cuenta: data.cuenta ?? '',
          empresaCodigo: data.id_empresa ?? 1,
          empresa: data.empresa ?? 'SIN EMPRESA',
          estado: data.estado ?? true //booleano
        });

        console.log('📋 Formulario después del patchValue:', this.form.value);
      },
      error: () => {
        this.dialog.open(CustomMessageBoxComponent, {
          width: '400px',
          data: {
            title: 'Error',
            message: 'No se pudo cargar el tipo de cliente.',
            type: 'error',
            confirmText: 'Cerrar',
            showCancel: false
          }
        });
      }
    });
  }

  grabar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (!this.dialog.openDialogs.find(d => d.componentInstance instanceof CustomMessageBoxComponent)) {
        this.dialog.open(CustomMessageBoxComponent, {
          width: '400px',
          data: {
            title: 'Campos obligatorios',
            message: 'Por favor complete todos los campos antes de grabar.',
            type: 'warning',
            confirmText: 'Entendido',
            showCancel: false
          }
        });
      }
      return;
    }

    const formValues = this.form.getRawValue();
    const payload: TipoClienteRequest = {
      descripcion: formValues.descripcion,
      cuenta: formValues.cuenta,
      estado: formValues.estado,      
      idEmpresa: formValues.empresaCodigo
    };

    const request$ = this.modoEdicion
      ? this.tipoClienteService.update(this.tipoClienteId, payload)
      : this.tipoClienteService.create(payload);

    request$.subscribe({
      next: () => {
        const message = this.modoEdicion ? 'actualizado' : 'creado';
        this.dialog.open(CustomMessageBoxComponent, {
          width: '400px',
          data: {
            title: 'Éxito',
            message: `El tipo de cliente fue ${message} correctamente.`,
            type: 'success',
            confirmText: 'Aceptar',
            showCancel: false
          }
        }).afterClosed().subscribe(() => {
          this.router.navigate(['/menus/tipocliente']);
        });
      },
      error: () => {
        this.dialog.open(CustomMessageBoxComponent, {
          width: '400px',
          data: {
            title: 'Error',
            message: 'Ocurrió un error al guardar el tipo de cliente.',
            type: 'error',
            confirmText: 'Cerrar',
            showCancel: false
          }
        });
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/menus/tipocliente']);
  }
}
