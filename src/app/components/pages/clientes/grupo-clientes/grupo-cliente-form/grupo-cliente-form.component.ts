import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

import { GrupoClienteService } from 'src/app/services/grupo-cliente.service';
import { GrupoCliente } from 'src/app/interfaces/responses/grupo-cliente-response';
import { CustomMessageBoxComponent } from 'src/app/components/utils/messages/custom-message-box.component';
import { CustomValidators } from 'src/app/components/utils/validators/validator.util';

@Component({
  selector: 'app-grupo-cliente-form',
  templateUrl: './grupo-cliente-form.component.html',
  styleUrls: ['./grupo-cliente-form.component.css']
})
export class GrupoClienteFormComponent implements OnInit {
  formulario!: FormGroup;
  modoEdicion = false;
  idGrupo!: number;

  constructor(
    private fb: FormBuilder,
    private grupoClienteService: GrupoClienteService,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.initForm();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.modoEdicion = true;
      this.idGrupo = +id;
      this.cargarDatos(this.idGrupo);
    }
  }

  initForm(): void {
    this.formulario = this.fb.group({
      codigo: ['', [Validators.required, CustomValidators.alphanumericMaxLength(4)]],
      nombre: ['', [Validators.required]],
      inscripcion: [0, [Validators.required, CustomValidators.onlyFormattedNumber]],
      asignacion: [0, [Validators.required, CustomValidators.onlyFormattedNumber]],
      mantenimiento: [0, [Validators.required, CustomValidators.onlyFormattedNumber]],
      valorAnual: [0, [Validators.required, CustomValidators.onlyFormattedNumber]],
      estado: [true, Validators.required],
      fecha: [new Date().toISOString().substring(0, 10), Validators.required],
    });
  }

  cargarDatos(id: number): void {
    this.grupoClienteService.getById(id).subscribe({
      next: (res) => {
        const data: GrupoCliente = res.data;
        this.formulario.patchValue({
          ...data,
          fecha: new Date(data.fecha).toISOString().substring(0, 10),
          estado: data.estado ?? true
        });
      },
      error: () => {
        this.mostrarMensaje('Error', 'No se pudo cargar el grupo de cliente.', 'error');
      }
    });
  }

  guardar(): void {
    console.log('🟡 Evento guardar disparado. modoEdicion:', this.modoEdicion);
    if (this.formulario.invalid) {
      console.warn('❌ Formulario inválido:', this.formulario.errors);
      Object.keys(this.formulario.controls).forEach(key => {
        const control = this.formulario.get(key);
        if (control?.invalid) {
          console.warn(`❌ Campo ${key} inválido:`, control.errors);
        }
      });
      this.formulario.markAllAsTouched();
      return;
    }

    if (!this.modoEdicion) {
      const valoresCero = this.camposConValorCero();

      if (valoresCero.length > 0) {
        const mensaje = `Está guardando los siguientes campos en cero: <b>${valoresCero.join(', ')}</b>. ¿Desea continuar?`;

        this.dialog.open(CustomMessageBoxComponent, {
          width: '400px',
          data: {
            title: 'Advertencia',
            message: mensaje,
            type: 'warning',
            confirmText: 'Sí, continuar',
            cancelText: 'Cancelar',
            showCancel: true
          }
        }).afterClosed().subscribe((confirmado: boolean) => {
          if (confirmado) {
            this.procesarGuardado();
          }
        });

        return;
      }
    }

    this.procesarGuardado(); // En modo edición o sin campos en cero
  }

  private camposConValorCero(): string[] {
    const camposNumericos = ['inscripcion', 'asignacion', 'mantenimiento', 'valorAnual'];
    const nombresVisibles: { [key: string]: string } = {
      inscripcion: 'Inscripción',
      asignacion: 'Asignación',
      mantenimiento: 'Mantenimiento',
      valorAnual: 'Valor Anual'
    };

    return camposNumericos
      .filter(campo => this.formulario.get(campo)?.value === 0)
      .map(campo => nombresVisibles[campo]);
  }

  private procesarGuardado(): void {
    const grupoData = this.formulario.getRawValue();
    console.log('🚀 Entrando a procesarGuardado...');
    console.log('📤 Datos enviados:', grupoData);
    console.log('🛠️ Modo edición:', this.modoEdicion);
    console.log('🔧 ID grupo:', this.idGrupo);

    const request$ = this.modoEdicion
      ? this.grupoClienteService.update(this.idGrupo, grupoData)
      : this.grupoClienteService.create(grupoData);

    console.log('📡 Llamada al backend iniciada...');

    request$.subscribe({
      next: (res) => {
        console.log('✅ Respuesta del backend:', res);
        if (!res.data) {
          console.warn('⚠️ Respuesta sin data:', res.message);
          this.mostrarMensaje('Error', res.message, 'error', false, 'Cerrar');
          return;
        }

        const mensaje = this.modoEdicion
          ? 'Grupo de cliente actualizado correctamente.'
          : 'Grupo de cliente creado exitosamente.';

        console.log('✅ Guardado correcto:', mensaje);
        this.mostrarMensaje('Éxito', mensaje, 'success', false, 'Aceptar');
      },
      error: (err) => {
        console.error('❌ Error al guardar:', err);
        this.mostrarMensaje('Error', 'Ocurrió un error al guardar el grupo de cliente.', 'error');
      }
    });
  }





  cancelar(): void {
    this.router.navigate(['/codbar/ficha-de-cliente/grupocliente']);
  }

  private mostrarMensaje(
    titulo: string,
    mensaje: string,
    tipo: 'success' | 'error' | 'warning' | 'info',
    showCancel: boolean = false,
    confirmText: string = 'Cerrar'
  ): void {
    this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: {
        title: titulo,
        message: mensaje,
        type: tipo,
        confirmText,
        showCancel
      }
    }).afterClosed().subscribe(() => {
      if (tipo === 'success') {
        this.router.navigate(['/menus/grupocliente']);
      }
    });
  }
}
