import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

import { TipoClienteService } from 'src/app/services/tipo-cliente.service';
import { EmpresaService } from 'src/app/services/empresa.service';
import { TipoClienteRequest } from 'src/app/interfaces/requests/tipo-cliente-request';
import { TipoClienteResponse } from 'src/app/interfaces/responses/tipo-cliente-response';
import { EmpresaResponse } from 'src/app/interfaces/responses/empresa-response';
import { CustomMessageBoxComponent } from 'src/app/components/utils/messages/custom-message-box.component';
import { CustomValidators } from 'src/app/components/utils/validators/validator.util';

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
  empresas: EmpresaResponse[] = [];
  public CustomValidators = CustomValidators;

  constructor(
    private fb: FormBuilder,
    private tipoClienteService: TipoClienteService,
    private empresaService: EmpresaService,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.cargarEmpresas();

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
      descripcion: ['', [Validators.required, Validators.maxLength(25), CustomValidators.onlyLetters]],
      cuenta: ['', [Validators.required, Validators.maxLength(10), CustomValidators.cuentaFormato]],
      estado: [true, Validators.required],
      empresa: ['', Validators.required],
      empresaCodigo: [null, Validators.required]
    });
  }

  private cargarEmpresas(): void {
    this.empresaService.getEmpresas().subscribe({
      next: (data) => {
        this.empresas = data;
        if (!this.modoEdicion && data.length > 0) {
          this.form.patchValue({
            empresaCodigo: data[0].empresaCodigo,
            empresa: data[0].empresaNombre
          });
        }
      },
      error: () => this.mostrarMensajeError('No se pudieron cargar las empresas.')
    });
  }

  private cargarTipoCliente(id: number): void {
    this.tipoClienteService.getById(id).subscribe({
      next: (response: { data: TipoClienteResponse }) => {
        const data = response.data;
        if (!data) return;

        this.form.patchValue({
          descripcion: data.descripcion ?? '',
          cuenta: data.cuenta ?? '',
          empresaCodigo: data.id_empresa ?? null,
          empresa: data.empresa ?? '',
          estado: data.estado ?? true
        });
      },
      error: () => this.mostrarMensajeError('No se pudo cargar el tipo de cliente.')
    });
  }

  grabar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.mostrarMensajeAdvertencia('Por favor complete todos los campos antes de grabar.');
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
      error: () => this.mostrarMensajeError('Ocurrió un error al guardar el tipo de cliente.')
    });
  }

  cancelar(): void {
    this.router.navigate(['/menus/tipocliente']);
  }

  private mostrarMensajeError(mensaje: string): void {
    this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: {
        title: 'Error',
        message: mensaje,
        type: 'error',
        confirmText: 'Cerrar',
        showCancel: false
      }
    });
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
