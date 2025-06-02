import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DATE_FORMATS, MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

// Servicios
import { PerfilesService } from 'src/app/services/perfil.service';
import { DepartamentosService } from 'src/app/services/departamentos.service';
import { UsuarioService } from 'src/app/services/usuario.service';
import { PersonasService } from 'src/app/services/personas.service';

// Interfaces de datos
import { PerfilResponse } from 'src/app/interfaces/responses/perfil-response';
import { DepartamentoResponse } from 'src/app/interfaces/responses/departamentos-response';
import { UsuariosRequest, UsuariosEditRequest } from 'src/app/interfaces/requests/usuario-request';

// Diálogo de mensajes
import { CustomMessageBoxComponent } from 'src/app/components/utils/messages/custom-message-box.component';

export const MY_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'DD/MM/YYYY',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

@Component({
  selector: 'app-usuarios-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
  ],
  templateUrl: './usuarios-form.component.html',
  styleUrls: ['./usuarios-form.component.css'],
  providers: [{ provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS }]
})
export class UsuariosFormComponent implements OnInit {
  usuarioForm!: FormGroup;
  perfiles: PerfilResponse[] = [];
  departamentos: DepartamentoResponse[] = [];
  mostrarClave = false;
  esEdicion = false;
  usuarioIdEditar: number | null = null;
  entidadSeleccionada: any = null;
  busquedaEntidad = '';
  resultadosEntidad: any[] = [];
  mostrarFormulario = false;


  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<UsuariosFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public perfilService: PerfilesService,
    public departamentoService: DepartamentosService,
    private dialog: MatDialog,
    private usuario: UsuarioService,
    private persona: PersonasService
  ) { }

  ngOnInit(): void {
    this.usuarioForm = this.fb.group({
      usuario: ['', [Validators.required]],
      clave: ['', Validators.required],
      correo: ['', [Validators.email]],
      perfil: ['', Validators.required],
      fechaCaducidad: ['', Validators.required],
      estado: [{ value: 'activo', disabled: true }, Validators.required],
      departamento: ['', Validators.required],
    });

    this.cargarPerfiles();
    this.cargarDepartamentos();

    if (this.data?.modo === 'editar' && this.data.usuario) {
      this.esEdicion = true;
      this.usuarioIdEditar = this.data.usuario.id_usuario;
      this.cargarFormularioParaEdicion(this.data.usuario);
    } else {
      this.usuarioForm.get('estado')?.disable(); // en modo creación
    }
  }

  grabar(): void {
    // Forzar validación
    this.usuarioForm.markAllAsTouched();

    console.log('🧪 Validando formulario...');
    Object.entries(this.usuarioForm.controls).forEach(([name, control]) => {
      console.log(`🧾 ${name}: value=${control.value}, valid=${control.valid}, errors=`, control.errors);
    });


    if (this.usuarioForm.invalid) {
      console.warn('⚠️ Formulario inválido:', this.usuarioForm.value);
      for (const controlName in this.usuarioForm.controls) {
        const control = this.usuarioForm.get(controlName);
        if (control && control.invalid) {
          console.warn(`Campo inválido: ${controlName}`, control.errors);
        }
      }

      this.dialog.open(CustomMessageBoxComponent, {
        width: '400px',
        data: {
          title: 'Completado',
          message: 'Por favor complete todos los campos obligatorios.',
          type: 'info',
          confirmText: 'Aceptar',
          showCancel: false
        }
      });
      return;
    }

    const formData = this.usuarioForm.getRawValue();

    if (this.esEdicion && this.usuarioIdEditar != null && this.usuarioIdEditar > 0) {
      const requestEdit: UsuariosEditRequest = {
        id: this.usuarioIdEditar,
        nombre_usuario: formData.usuario,
        nueva_contrasenia: formData.clave || '',
        estado: formData.estado === 'activo',
        correo: formData.correo,
        fecha_creacion: new Date().toISOString(),
        id_empresa: 1,
        id_departamento: formData.departamento
      };

      console.log('📦 Enviando requestEdit:', requestEdit);

      this.usuario.updateUsuario(formData.perfil, requestEdit).subscribe({
        next: () => this.dialogRef.close(true),
        error: (err) => {
          console.error('❌ Error recibido del backend:', err);
          alert('❌ Error al actualizar el usuario.');
        }
      });
    }
    else {
      const request: UsuariosRequest = {
        nombre_usuario: formData.usuario,
        nueva_contrasenia: formData.clave || '',
        estado: formData.estado === 'activo',
        correo: formData.correo,
        fecha_creacion: new Date().toISOString(),
        id_empresa: 1,
        id_departamento: formData.departamento
      };

      this.usuario.createUsuario(request).subscribe({
        next: () => this.dialogRef.close(true),
        error: () => alert('❌ Error al crear el usuario.')
      });
    }
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  cargarPerfiles(): void {
    this.perfilService.getPerfiles().subscribe({
      next: (resp) => {
        this.perfiles = resp.data;
      },
      error: () => {
        alert('Error al cargar perfiles');
      }
    });
  }

  cargarDepartamentos(): void {
    this.departamentoService.getDepartamentos().subscribe({
      next: (resp) => {
        this.departamentos = resp;
      },
      error: () => {
        alert('Error al cargar departamentos');
      }
    });
  }

  editar(): void {
    this.usuarioForm.get('estado')?.enable();
  }

  toggleClave(): void {
    this.mostrarClave = !this.mostrarClave;
  }

  cargarFormularioParaEdicion(usuario: any): void {
    this.usuarioForm.patchValue({
      usuario: usuario.nombre_usuario,
      correo: usuario.correo,
      perfil: usuario.id_perfil,
      fechaCaducidad: new Date(), // Puedes ajustar si tienes fecha real
      estado: usuario.estado ? 'activo' : 'inactivo',
      departamento: usuario.id_departamento
    });

    this.usuarioForm.get('estado')?.enable(); // editable en modo edición
    this.usuarioForm.get('clave')?.clearValidators(); // clave opcional
    this.usuarioForm.get('clave')?.updateValueAndValidity();
  }

  buscarEntidad(): void {
    const valor = this.busquedaEntidad.trim();
    if (!valor) return;

    const esNumerico = /^[0-9]+$/.test(valor);

    if (esNumerico) {
      this.persona.buscarPersonaPorDocumento(valor).subscribe({
        next: (res) => {
          this.resultadosEntidad = res ? [res] : [];
        },
        error: () => alert('❌ Error al buscar por RUC o cédula.')
      });
    } else {
      this.persona.buscarPersonasPorNombre(valor).subscribe({
        next: (res) => {
          this.resultadosEntidad = res;
        },
        error: () => alert('❌ Error al buscar por nombre.')
      });
    }
  }

  seleccionarEntidad(entidad: any): void {
    this.entidadSeleccionada = entidad;
    this.resultadosEntidad = [];
  }


}
