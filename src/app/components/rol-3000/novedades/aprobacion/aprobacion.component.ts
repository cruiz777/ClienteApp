import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { PermisoService } from 'src/app/services/rol/permisos-rol.service';
import { PermisoResponse, UpdateEstadoPermisoRequest } from 'src/app/interfaces/responses/permiso.response';

// Ajusta la ruta/nombre real de tu servicio de sesión (el mismo que usa DecimoCuartoComponent)
import { UsuarioService } from 'src/app/services/usuario.service';
import { MessageBoxService } from 'src/app/components/utils/messages/message-box.service';

@Component({
  selector: 'app-aprobacion',
  templateUrl: './aprobacion.component.html',
  styleUrls: ['./aprobacion.component.css']
})
export class AprobacionComponent implements OnInit {
  form!: FormGroup;

  displayedColumns: string[] = [
    'id',
    'solicita',
    'fecha',
    'tiempo',
    'motivo',
    'aprobar',
    'negar',
    'eliminar',
    'reimprimir'
  ];

  solicitudes: PermisoResponse[] = [];
  solicitudesFiltradas: PermisoResponse[] = [];

  cargando = false;
  procesandoId: number | null = null; // deshabilita los botones de la fila mientras se procesa

  // TODO: verifica el nombre real del campo del empleado logueado en tu LoginUsuarioResponse
  private idEmpleadoActual: number | null = null;

  constructor(
    private fb: FormBuilder,
    private permisoService: PermisoService,
    private messageBox: MessageBoxService,
    private usuarioService: UsuarioService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      buscar: ['']
    });

    const usuarioActual = this.usuarioService.getUsuarioActual();
    this.idEmpleadoActual = (usuarioActual as any)?.id_empleado ?? null;

    this.cargarPendientes();

    this.form.get('buscar')?.valueChanges.subscribe(() => {
      this.filtrar();
    });
  }

  cargarPendientes(): void {
    this.cargando = true;

    this.permisoService
      .getPendientes()
      .pipe(finalize(() => (this.cargando = false)))
      .subscribe({
        next: data => {
          this.solicitudes = data ?? [];
          this.filtrar();
        },
        error: () => {
          this.messageBox.error('No se pudieron cargar las solicitudes pendientes.');
        }
      });
  }

  filtrar(): void {
    const texto = (this.form.get('buscar')?.value || '').toLowerCase().trim();

    if (!texto) {
      this.solicitudesFiltradas = [...this.solicitudes];
      return;
    }

    this.solicitudesFiltradas = this.solicitudes.filter(item =>
      item.nombreEmpleadoSolicita.toLowerCase().includes(texto) ||
      item.motivoPermiso.toLowerCase().includes(texto) ||
      String(item.idPermiso).includes(texto)
    );
  }

  aprobar(item: PermisoResponse): void {
    this.messageBox
      .confirm(`¿Aprobar la solicitud de ${item.nombreEmpleadoSolicita}?`, {
        title: 'Aprobar solicitud',
        confirmText: 'Sí, aprobar',
        type: 'success'
      })
      .subscribe(confirmado => {
        if (confirmado) {
          this.cambiarEstado(item, 'SI', 'Solicitud aprobada correctamente.');
        }
      });
  }

  negar(item: PermisoResponse): void {
    this.messageBox
      .confirm(`¿Negar la solicitud de ${item.nombreEmpleadoSolicita}?`, {
        title: 'Negar solicitud',
        confirmText: 'Sí, negar',
        type: 'warning'
      })
      .subscribe(confirmado => {
        if (confirmado) {
          this.cambiarEstado(item, 'NO', 'Solicitud negada correctamente.');
        }
      });
  }

  eliminar(item: PermisoResponse): void {
    this.messageBox
      .confirm(`¿Eliminar la solicitud de ${item.nombreEmpleadoSolicita}? Esta acción no se puede deshacer.`, {
        title: 'Eliminar solicitud',
        confirmText: 'Sí, eliminar',
        type: 'error'
      })
      .subscribe(confirmado => {
        if (confirmado) {
          this.cambiarEstado(item, 'ELI', 'Solicitud eliminada correctamente.');
        }
      });
  }

  private cambiarEstado(
    item: PermisoResponse,
    estado: UpdateEstadoPermisoRequest['estadoAprobacion'],
    mensajeExito: string
  ): void {
    const request: UpdateEstadoPermisoRequest = {
      idPermiso: item.idPermiso,
      estadoAprobacion: estado,
      idEmpleadoAprueba: estado === 'SI' ? this.idEmpleadoActual : item.idEmpleadoAprueba,
      idEmpleadoAutoriza: item.idEmpleadoAutoriza,
      observacion: null
    };

    this.procesandoId = item.idPermiso;

    this.permisoService
      .updateEstado(request)
      .pipe(finalize(() => (this.procesandoId = null)))
      .subscribe({
        next: res => {
          this.messageBox.success(res.message || mensajeExito);
          // PND/SI/NO/ELI: cualquier cambio de estado saca la solicitud de "pendientes"
          this.solicitudes = this.solicitudes.filter(x => x.idPermiso !== item.idPermiso);
          this.filtrar();
        },
        error: err => {
          const msg = err?.error?.message || 'No se pudo actualizar el estado de la solicitud.';
          this.messageBox.error(msg);
        }
      });
  }

  reimprimir(item: PermisoResponse): void {
    this.permisoService.imprimirPdf(item.idPermiso).subscribe({
      next: blob => {
        if (!blob || blob.size === 0) {
          this.messageBox.warning('El PDF se generó vacío.');
          return;
        }

        const url = window.URL.createObjectURL(blob);
        const ventana = window.open(url, '_blank');

        if (!ventana) {
          const link = document.createElement('a');
          link.href = url;
          link.download = `Solicitud_Permiso_${item.idPermiso}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }

        setTimeout(() => window.URL.revokeObjectURL(url), 30000);
      },
      error: () => {
        this.messageBox.error('No se pudo generar el PDF de la solicitud.');
      }
    });
  }
}