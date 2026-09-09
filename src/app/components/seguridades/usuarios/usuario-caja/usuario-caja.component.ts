import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MAT_DATE_FORMATS, MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';

// Servicios propios
import { PerfilesService } from 'src/app/services/perfil.service';
import { DepartamentosService } from 'src/app/services/departamentos.service';
import { UsuarioService } from 'src/app/services/usuario.service';
import { PersonasService } from 'src/app/services/personas.service';

// Interfaces/Requests
import { PerfilResponse } from 'src/app/interfaces/responses/perfil-response';
import { DepartamentoResponse } from 'src/app/interfaces/responses/departamentos-response';
import { UsuariosRequest, UsuariosEditRequest } from 'src/app/interfaces/requests/usuario-request';

// Mensajes
import { CustomMessageBoxComponent } from 'src/app/components/utils/messages/custom-message-box.component';
import { RequiredFieldsToastService } from 'src/app/components/utils/messages/required-fields-toast.service';

// Servicio de Autorizaciones de Caja + tipos
import {
  CajaUsuarioService,
  AutorizacionCajaUsuarioDto,
  ApiResponse,
  AutorizacionCajaDto,
  PaginationResponse,
} from 'src/app/services/caja-usuario.service';

import { Observable, of, forkJoin } from 'rxjs';

export const MY_DATE_FORMATS = {
  parse: { dateInput: 'DD/MM/YYYY' },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'DD/MM/YYYY',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

type AutorizacionRow = {
  idAutorizacionUsuario: number;
  idAutorizacionCaja: number;
  establecimiento: string;
  tipoDocumentoDescripcion: string;
  caja: string;
  activa: boolean; // ✅ reemplaza "estado"
};

function mapDtoToRow(dto: AutorizacionCajaUsuarioDto): AutorizacionRow {
  return {
    idAutorizacionUsuario: dto.idAutorizacionUsuario,
    idAutorizacionCaja: dto.idAutorizacionCaja,
    establecimiento: dto.numEstablecimiento ?? '',
    caja: (dto.caja ?? '') as any, // si tu DTO caja viene string, esto queda OK
    tipoDocumentoDescripcion: dto.tipoDocumentoDescripcion ?? '',
    activa: !!dto.activa, // ✅ boolean real
  };
}

@Component({
  selector: 'app-usuario-caja',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    MatIconModule,
    MatDialogModule
  ],
  templateUrl: './usuario-caja.component.html',
  styleUrl: './usuario-caja.component.css',
  providers: [{ provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS }],
})
export class UsuarioCajaComponent implements OnInit {
  usuarioForm!: FormGroup;

  perfiles: PerfilResponse[] = [];
  departamentos: DepartamentoResponse[] = [];

  mostrarClave = false;
  esEdicion = false;
  usuarioIdEditar: number | null = null;
  entidadSeleccionada: any = null;

  // búsqueda/selección de persona
  busquedaEntidad = '';
  resultadosEntidad: any[] = [];

  usuarioActual = this.usuarioservice.getUsuarioActual();

  // seguridad de contraseña
  nivelSeguridad = '';
  mensajesSeguridad = '';

  // Tabla de Autorizaciones (usuario ↔ autorización caja)
  autorizaciones: AutorizacionRow[] = [];

  // Catálogo de Autorizaciones de Caja (para seleccionar y agregar)
  catalogoAutorizaciones: AutorizacionCajaDto[] = [];
  page = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<UsuarioCajaComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public perfilService: PerfilesService,
    public departamentoService: DepartamentosService,
    private dialog: MatDialog,
    private usuarioservice: UsuarioService,
    private persona: PersonasService,
    private toast: RequiredFieldsToastService,
    private cajaUsuarioService: CajaUsuarioService
  ) {}

  ngOnInit(): void {
    this.usuarioForm = this.fb.group({
      usuario: ['', [Validators.required]],
      clave: ['', Validators.required],
      correo: ['', [Validators.email]],
      perfil: ['', Validators.required],
      fechaCaducidad: ['', Validators.required],
      estado: [{ value: 'activo', disabled: true }],
      departamento: ['', Validators.required],
    });

    if (this.data?.modo === 'editar' && this.data.usuario) {
      this.esEdicion = true;
      this.usuarioIdEditar = this.data.usuario.id_usuario;
      this.cargarFormularioParaEdicion(this.data.usuario);
    } else {
      this.usuarioForm.get('estado')?.disable();
    }

    this.usuarioForm.get('clave')?.valueChanges.subscribe(val => this.verificarSeguridad(val));

    const idUsuario = this.esEdicion ? this.usuarioIdEditar! : this.usuarioActual?.id_usuario;
    if (idUsuario) {
      this.cargarAutorizacionesCaja(idUsuario);
    } else {
      this.autorizaciones = [];
    }
  }

  grabar(): void {
    Object.keys(this.usuarioForm.controls).forEach(key => {
      if (key !== 'estado') this.usuarioForm.get(key)?.markAsTouched();
    });

    if (this.usuarioForm.invalid) {
      const errores: string[] = [];
      const c = this.usuarioForm.controls;
      if (c['usuario'].invalid) errores.push('Usuario es requerido');
      if (c['clave'].invalid && !this.esEdicion) errores.push('Clave es requerida');
      if (c['perfil'].invalid) errores.push('Perfil es requerido');
      if (c['fechaCaducidad'].invalid) errores.push('Fecha de caducidad es requerida');
      if (c['departamento'].invalid) errores.push('Departamento es requerido');
      if (c['correo'].value && c['correo'].invalid) errores.push('Correo inválido');
      this.toast.mostrar(errores);
      return;
    }

    if (this.usuarioForm.get('clave')?.value && this.nivelSeguridad === 'Débil') {
      this.toast.error(this.mensajesSeguridad || '❌ Contraseña débil. Mejore la seguridad antes de continuar.');
      return;
    }

    const formData = this.usuarioForm.getRawValue();
    formData.perfil = parseInt(formData.perfil, 10);

    if (!formData.perfil || isNaN(formData.perfil) || formData.perfil <= 0) {
      this.toast.mostrar(['Debe seleccionar un perfil válido.']);
      return;
    }
    if (!formData.departamento || isNaN(formData.departamento)) {
      this.toast.mostrar(['Debe seleccionar un departamento válido.']);
      return;
    }

    if (this.esEdicion && this.usuarioIdEditar != null && this.usuarioIdEditar > 0) {
      const requestEdit: UsuariosEditRequest = {
        id: this.usuarioIdEditar,
        id_persona: this.entidadSeleccionada?.personaCodigo || 0,
        nombre_usuario: formData.usuario,
        contrasena_hash: formData.clave || '',
        estado: formData.estado === 'activo',
        correo: formData.correo,
        fecha_creacion: undefined,
        id_empresa: 1,
        id_departamento: formData.departamento,
      };

      this.usuarioservice.updateUsuario(formData.perfil, requestEdit).subscribe({
        next: () => this.dialogRef.close(true),
        error: (err: any) => this.toast.error(err.error?.message || 'Error al actualizar el usuario.'),
      });
    } else {
      const request: UsuariosRequest = {
        id_persona: this.entidadSeleccionada.personaCodigo,
        nombre_usuario: formData.usuario,
        contrasena_hash: formData.clave || '',
        estado: formData.estado === 'activo',
        correo: formData.correo,
        fecha_creacion: new Date().toISOString(),
        id_empresa: 1,
        id_departamento: formData.departamento,
      };

      this.usuarioservice.createUsuario(formData.perfil, request).subscribe({
        next: () => {
          this.dialog
            .open(CustomMessageBoxComponent, {
              width: '400px',
              data: {
                title: 'Éxito',
                message: '✅ Usuario creado correctamente.',
                type: 'success',
                confirmText: 'Aceptar',
                showCancel: false,
              },
            })
            .afterClosed()
            .subscribe(() => this.dialogRef.close(true));
        },
        error: (err: any) => this.toast.error(err.error?.message || 'Error al crear el usuario.'),
      });
    }
  }

  cerrar(): void {
    this.dialogRef.close();
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
      estado: usuario.estado ? 'activo' : 'inactivo',
    });

    this.usuarioForm.get('estado')?.enable();
    this.usuarioForm.get('clave')?.clearValidators();
    this.usuarioForm.get('clave')?.updateValueAndValidity();
  }

  buscarEntidad(): void {
    const valor = this.busquedaEntidad.trim();
    if (!valor) return;

    const soloLetras = /^[a-zA-Z\s]+$/.test(valor);

    if (soloLetras) {
      this.persona.buscarPersonasPorNombre(valor).subscribe({
        next: (res: any) => (this.resultadosEntidad = res),
        error: () => alert('❌ Error al buscar por nombre.'),
      });
    } else {
      this.persona.buscarPersonaPorDocumento(valor).subscribe({
        next: (res: any) => (this.resultadosEntidad = res),
        error: () => alert('❌ Error al buscar por documento.'),
      });
    }
  }

  verificarSeguridad(password: string): void {
    const requisitos = [
      { test: /[a-z]/, mensaje: 'una letra minúscula' },
      { test: /[A-Z]/, mensaje: 'una letra mayúscula' },
      { test: /\d/, mensaje: 'un número' },
      { test: /[\W_]/, mensaje: 'un carácter especial (!, @, #, etc.)' },
      { test: /.{8,}/, mensaje: 'al menos 8 caracteres' },
    ];

    const faltantes = requisitos.filter(r => !r.test.test(password)).map(r => r.mensaje);
    const puntos = 5 - faltantes.length;

    this.nivelSeguridad = puntos <= 2 ? 'Débil' : puntos <= 4 ? 'Media' : 'Alta';
    this.mensajesSeguridad =
      faltantes.length > 0
        ? `⚠️ Para mejorar tu contraseña, añade: ${faltantes.join(', ')}.`
        : '✅ Contraseña segura.';
  }

  // Abrir catálogo
  nuevoAutorizacion(): void {
    this.cargarCatalogoAutorizaciones(1, 10);
  }

  // ✅ Selecciona Autorización: crea y recarga (NO desactiva otras)
  seleccionarAutorizacion(aut: AutorizacionCajaDto): void {
    const idUsuario = this.esEdicion ? this.usuarioIdEditar! : this.usuarioActual?.id_usuario;

    if (!idUsuario) {
      this.toast.error('No hay usuario seleccionado.');
      return;
    }

    // ✅ Evitar duplicado
    const yaExiste = this.autorizaciones?.some(a => a.idAutorizacionCaja === aut.id_autorizacion_caja);
    if (yaExiste) {
      this.toast.mostrar(['Esta autorización ya está asignada al usuario.']);
      this.catalogoAutorizaciones = [];
      return;
    }

    this.cajaUsuarioService.create({
      idUsuario,
      idAutorizacionCaja: aut.id_autorizacion_caja,
      activa: true
    }).subscribe({
      next: (resp: ApiResponse<AutorizacionCajaUsuarioDto>) => {
        if (resp.type === 'Success' && resp.data) {
          this.catalogoAutorizaciones = [];
          this.cargarAutorizacionesCaja(idUsuario);
        } else {
          this.toast.error(resp.message || 'No se pudo crear la asignación.');
        }
      },
      error: (err: any) => {
        console.error(err);
        this.toast.error(err?.error?.message || 'Error al crear la asignación.');
      }
    });
  }

  // ✅ Cambia estado individual (checkbox) sin afectar otros
  cambiarEstado(index: number, event: Event): void {
    const row = this.autorizaciones[index];
    const checked = (event.target as HTMLInputElement).checked;

    // UI optimista
    row.activa = checked;

    if (row.idAutorizacionUsuario <= 0) return;

    this.cajaUsuarioService.update(row.idAutorizacionUsuario, {
      idAutorizacionUsuario: row.idAutorizacionUsuario,
      activa: checked
    }).subscribe({
      next: () => { /* ok */ },
      error: (err: any) => {
        console.error(err);
        this.toast.error(err?.error?.message || 'No se pudo actualizar el estado.');
        // rollback
        row.activa = !checked;
      }
    });
  }

  // Carga la tabla de autorizaciones del usuario
  private cargarAutorizacionesCaja(idUsuario: number, soloActivas?: boolean): void {
    this.cajaUsuarioService.getByUsuario(idUsuario, soloActivas).subscribe({
      next: (resp: ApiResponse<AutorizacionCajaUsuarioDto[]>) => {
        if (resp.type === 'Success') {
          const data = resp.data ?? [];
          this.autorizaciones = data.map(mapDtoToRow);
        } else {
          this.toast.error(resp.message || 'No se pudo obtener autorizaciones.');
          this.autorizaciones = [];
        }
      },
      error: (err: any) => {
        console.error(err);
        this.toast.error(err?.error?.message || 'Error al obtener autorizaciones de caja.');
        this.autorizaciones = [];
      }
    });
  }

  // Carga catálogo de AutorizacionCaja (para seleccionar)
  private cargarCatalogoAutorizaciones(page: number = 1, pageSize: number = 10): void {
    const idUsuario = this.esEdicion ? this.usuarioIdEditar! : this.usuarioActual?.id_usuario;

    this.cajaUsuarioService
      .getAutorizacionesCajaDisponibles(page, pageSize, idUsuario)
      .subscribe({
        next: (resp: ApiResponse<PaginationResponse<AutorizacionCajaDto>>) => {
          if (resp.type === 'Success' && resp.data) {
            const d = resp.data;

            const yaAsignadas = new Set(this.autorizaciones.map(a => a.idAutorizacionCaja));
            this.catalogoAutorizaciones = (d.items ?? []).filter(
              x => !yaAsignadas.has(x.id_autorizacion_caja)
            );

            this.page = d.page;
            this.pageSize = d.pageSize;
            this.totalItems = d.totalItems;
            this.totalPages = d.totalPages;
          } else {
            this.catalogoAutorizaciones = [];
            this.toast.error(resp.message || 'No se pudo obtener cajas disponibles.');
          }
        },
        error: (err: any) => {
          console.error(err);
          this.catalogoAutorizaciones = [];
          this.toast.error(err?.error?.message || 'Error consultando cajas disponibles.');
        }
      });
  }

  // Para *ngFor trackBy
  trackById(index: number, row: { idAutorizacionUsuario: number }): number {
    return row?.idAutorizacionUsuario ?? index;
  }

  ocultarCatalogo(): void {
    this.catalogoAutorizaciones = [];
  }

  confirmarEliminar(index: number): void {
    const row = this.autorizaciones[index];

    this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: {
        title: '¿Desea confirmar?',
        message: `¿Eliminar la autorización de la caja ${row.caja} (Establecimiento ${row.establecimiento})?`,
        type: 'info',
        confirmText: 'Sí, eliminar',
        cancelText: 'Cancelar',
        showCancel: true
      }
    })
    .afterClosed()
    .subscribe((confirmado: boolean) => {
      if (confirmado) {
        this.eliminarAutorizacion(index);
      }
    });
  }

  private eliminarAutorizacion(index: number): void {
    const row = this.autorizaciones[index];

    // fila local
    if (row.idAutorizacionUsuario <= 0) {
      this.autorizaciones = this.autorizaciones.filter((_, i) => i !== index);
      return;
    }

    this.cajaUsuarioService.delete(row.idAutorizacionUsuario).subscribe({
      next: () => {
        this.autorizaciones = this.autorizaciones.filter((_, i) => i !== index);
        // ✅ Ya NO forzamos activar(0) ni usamos "estado"
      },
      error: (err: any) => {
        console.error(err);
        this.toast.error(err?.error?.message || 'No se pudo eliminar la autorización.');
      }
    });
  }
}
