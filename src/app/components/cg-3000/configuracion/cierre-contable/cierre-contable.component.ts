import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';

import { UsuarioService } from 'src/app/services/usuario.service';
import { CustomMessageBoxComponent } from 'src/app/util/messages/custom-message-box.component';

import {
  JobService,
  ApiResponse as JobApiResponse,
  EjecutarJobResponse
} from 'src/app/services/job.service';

import {
  CierreContableService,
  CierreContableResponse,
  ReversarCierreContableResponse,
  ApiResponse
} from 'src/app/services/cierre-contable.service';

@Component({
  selector: 'app-cierre-contable',
  templateUrl: './cierre-contable.component.html',
  styleUrls: ['./cierre-contable.component.css']
})
export class CierreContableComponent implements OnInit {
  formCierre: FormGroup;
  formReversion: FormGroup;

  bloquearAccionesCierre = false;
  bloquearAccionesReversion = false;

  loadingPreviewCierre = false;
  loadingEjecutarCierre = false;
  loadingPreviewReversion = false;
  loadingEjecutarReversion = false;

  usuarioActual: any = null;
  mensaje = '';
  tipoMensaje: 'success' | 'error' | 'info' = 'info';

  resultadoPreviewCierre: CierreContableResponse | null = null;
  resultadoEjecutarCierre: CierreContableResponse | null = null;

  resultadoPreviewReversion: ReversarCierreContableResponse | null = null;
  resultadoEjecutarReversion: ReversarCierreContableResponse | null = null;

  constructor(
    private fb: FormBuilder,
    private usuarioService: UsuarioService,
    private cierreContableService: CierreContableService,
    private jobService: JobService,
    private dialog: MatDialog
  ) {
    const hoy = this.formatearFecha(new Date());

    this.formCierre = this.fb.group({
      anioCerrar: [2025, [Validators.required, Validators.min(2000)]],
      fechaCierre: [hoy, Validators.required],
      idZona: [1, Validators.required],
      idUsuario: [null, Validators.required],
      idEmpresa: [null, Validators.required],
      idLocal: [1, Validators.required],
      tipDoc: ['TB', [Validators.required, Validators.maxLength(2)]],
      numDoc: [null],
      beneficiario: ['ASOCIACION ECUATORIANA DEL CODIGO', Validators.required],
      observacion: ['CIERRE AÑO 2025']
    });

    this.formReversion = this.fb.group({
      anioCerrar: [2025, [Validators.required, Validators.min(2000)]],
      tipDoc: ['TB', [Validators.required, Validators.maxLength(2)]],
      numDoc: [null],
      idUsuario: [null]
    });
  }

  ngOnInit(): void {
    this.cargarDatosIniciales();
  }

  private cargarDatosIniciales(): void {
    this.cargarNumDocAutomatico();

    const usuario = this.usuarioService.getUsuarioActual();
    this.usuarioActual = usuario;

    if (usuario) {
      this.formCierre.patchValue({
        idUsuario: usuario.id_usuario,
        idZona: 1,
        idEmpresa: usuario.id_empresa,
        idLocal: 1
      });

      this.formReversion.patchValue({
        idUsuario: usuario.id_usuario
      });
    }
  }

  private formatearFecha(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private setMensaje(texto: string, tipo: 'success' | 'error' | 'info'): void {
    this.mensaje = texto;
    this.tipoMensaje = tipo;
  }

  previewCierre(): void {
    if (this.formCierre.invalid) {
      this.formCierre.markAllAsTouched();
      this.setMensaje('Completa los datos obligatorios para la vista previa del cierre.', 'error');
      return;
    }

    if (this.bloquearAccionesCierre) {
      return;
    }

    this.loadingPreviewCierre = true;
    this.resultadoPreviewCierre = null;
    this.resultadoEjecutarCierre = null;
    this.setMensaje('', 'info');

    const payload = this.formCierre.getRawValue();

    this.cierreContableService.previewCierre(payload).subscribe({
      next: (resp: ApiResponse<CierreContableResponse>) => {
        this.loadingPreviewCierre = false;

        if (resp?.type === 'OK' && resp.data) {
          this.resultadoPreviewCierre = resp.data;
          this.setMensaje(resp.message || 'Vista previa generada correctamente.', 'success');
        } else {
          this.setMensaje(resp?.message || 'No se pudo generar la vista previa.', 'error');
        }
      },
      error: (error: HttpErrorResponse) => {
        this.loadingPreviewCierre = false;
        this.setMensaje(error?.error?.message || 'Error al generar la vista previa del cierre.', 'error');
      }
    });
  }

  previewReversion(): void {
    if (this.formReversion.invalid) {
      this.formReversion.markAllAsTouched();
      this.setMensaje('Completa los datos obligatorios para la vista previa de reversión.', 'error');
      return;
    }

    if (this.bloquearAccionesReversion) {
      return;
    }

    this.loadingPreviewReversion = true;
    this.resultadoPreviewReversion = null;
    this.resultadoEjecutarReversion = null;
    this.setMensaje('', 'info');

    const payload = this.formReversion.getRawValue();

    this.cierreContableService.previewReversion(payload).subscribe({
      next: (resp: ApiResponse<ReversarCierreContableResponse>) => {
        this.loadingPreviewReversion = false;

        if (resp?.type === 'OK' && resp.data) {
          this.resultadoPreviewReversion = resp.data;
          this.setMensaje(resp.message || 'Vista previa de reversión generada correctamente.', 'success');
        } else {
          this.setMensaje(resp?.message || 'No se pudo generar la vista previa de reversión.', 'error');
        }
      },
      error: (error: HttpErrorResponse) => {
        this.loadingPreviewReversion = false;
        this.setMensaje(error?.error?.message || 'Error al generar la vista previa de reversión.', 'error');
      }
    });
  }

  private ejecutarRespaldoAntesDeCierre(): void {
    this.setMensaje('Ejecutando respaldo antes del cierre...', 'info');

    this.jobService.ejecutarRespaldo().subscribe({
      next: (resp: JobApiResponse<EjecutarJobResponse>) => {
        if (resp?.type === 'OK' && resp.data) {
          this.setMensaje('Respaldo ejecutado correctamente. Iniciando cierre...', 'info');
          this.ejecutarCierre();
        } else {
          this.loadingEjecutarCierre = false;
          this.bloquearAccionesCierre = false;
          this.setMensaje(resp?.message || 'No se pudo ejecutar el job de respaldo.', 'error');
        }
      },
      error: (error: HttpErrorResponse) => {
        this.loadingEjecutarCierre = false;
        this.bloquearAccionesCierre = false;
        this.setMensaje(error?.error?.message || 'Error al ejecutar el job de respaldo antes del cierre.', 'error');
      }
    });
  }

  private ejecutarRespaldoAntesDeReversion(): void {
    this.setMensaje('Ejecutando respaldo antes de la reversión...', 'info');

    this.jobService.ejecutarRespaldo().subscribe({
      next: (resp: JobApiResponse<EjecutarJobResponse>) => {
        if (resp?.type === 'OK' && resp.data) {
          this.setMensaje('Respaldo ejecutado correctamente. Iniciando reversión...', 'info');
          this.ejecutarReversion();
        } else {
          this.loadingEjecutarReversion = false;
          this.bloquearAccionesReversion = false;
          this.setMensaje(resp?.message || 'No se pudo ejecutar el job de respaldo.', 'error');
        }
      },
      error: (error: HttpErrorResponse) => {
        this.loadingEjecutarReversion = false;
        this.bloquearAccionesReversion = false;
        this.setMensaje(error?.error?.message || 'Error al ejecutar el job de respaldo antes de la reversión.', 'error');
      }
    });
  }

  ejecutarCierre(): void {
    if (this.formCierre.invalid) {
      this.formCierre.markAllAsTouched();
      this.setMensaje('Completa los datos obligatorios antes de ejecutar el cierre.', 'error');
      this.loadingEjecutarCierre = false;
      this.bloquearAccionesCierre = false;
      return;
    }

    this.resultadoEjecutarCierre = null;
    const payload = this.formCierre.getRawValue();

    this.cierreContableService.ejecutarCierre(payload).subscribe({
      next: (resp: ApiResponse<CierreContableResponse>) => {
        this.loadingEjecutarCierre = false;

        if (resp?.type === 'OK' && resp.data) {
          this.resultadoEjecutarCierre = resp.data;
          this.setMensaje(resp.message || 'Cierre ejecutado correctamente.', 'success');
          this.bloquearAccionesCierre = true;
        } else {
          this.bloquearAccionesCierre = false;
          this.setMensaje(resp?.message || 'No se pudo ejecutar el cierre.', 'error');
        }
      },
      error: (error: HttpErrorResponse) => {
        this.loadingEjecutarCierre = false;
        this.bloquearAccionesCierre = false;
        this.setMensaje(error?.error?.message || 'Error al ejecutar el cierre contable.', 'error');
      }
    });
  }

  ejecutarReversion(): void {
    if (this.formReversion.invalid) {
      this.formReversion.markAllAsTouched();
      this.setMensaje('Completa los datos obligatorios antes de ejecutar la reversión.', 'error');
      this.loadingEjecutarReversion = false;
      this.bloquearAccionesReversion = false;
      return;
    }

    this.resultadoEjecutarReversion = null;
    const payload = this.formReversion.getRawValue();

    this.cierreContableService.ejecutarReversion(payload).subscribe({
      next: (resp: ApiResponse<ReversarCierreContableResponse>) => {
        this.loadingEjecutarReversion = false;

        if (resp?.type === 'OK' && resp.data) {
          this.resultadoEjecutarReversion = resp.data;
          this.setMensaje(resp.message || 'Reversión ejecutada correctamente.', 'success');
          this.bloquearAccionesReversion = true;
        } else {
          this.bloquearAccionesReversion = false;
          this.setMensaje(resp?.message || 'No se pudo ejecutar la reversión.', 'error');
        }
      },
      error: (error: HttpErrorResponse) => {
        this.loadingEjecutarReversion = false;
        this.bloquearAccionesReversion = false;
        this.setMensaje(error?.error?.message || 'Error al ejecutar la reversión del cierre.', 'error');
      }
    });
  }

  cargarNumDocAutomatico(): void {
    const anio = Number(this.formCierre.get('anioCerrar')?.value);
    if (!anio) {
      return;
    }

    this.formCierre.patchValue({
      numDoc: Number(`${anio}1231`)
    });
  }

  confirmarEjecutarCierre(): void {
    if (this.formCierre.invalid) {
      this.formCierre.markAllAsTouched();
      this.setMensaje('Completa los datos obligatorios antes de ejecutar el cierre.', 'error');
      return;
    }

    if (this.bloquearAccionesCierre || this.loadingEjecutarCierre) {
      return;
    }

    const anio = this.formCierre.get('anioCerrar')?.value;
    const fechaCierre = this.formCierre.get('fechaCierre')?.value;
    const tipDoc = this.formCierre.get('tipDoc')?.value;
    const numDoc = this.formCierre.get('numDoc')?.value;
    const beneficiario = this.formCierre.get('beneficiario')?.value;
    const observacion = this.formCierre.get('observacion')?.value;

    const dialogRef = this.dialog.open(CustomMessageBoxComponent, {
      width: '420px',
      data: {
        title: 'Confirmar cierre contable',
        message:
          `Se ejecutará el cierre contable anual.\n\n` +
          `Año: ${anio || '(sin año)'}\n` +
          `Fecha de cierre: ${fechaCierre || '(sin fecha)'}\n` +
          `Tipo documento: ${tipDoc || '(sin tipo)'}\n` +
          `Número documento: ${numDoc || '(sin número)'}\n` +
          `Beneficiario: ${beneficiario || '(sin beneficiario)'}\n` +
          `Observación: ${observacion || '(sin observación)'}\n\n` +
          `Antes de continuar se ejecutará un respaldo de base de datos.\n\n` +
          `¿Está seguro de continuar?`,
        type: 'info',
        confirmText: 'Sí, ejecutar',
        cancelText: 'Cancelar',
        showCancel: true
      }
    });

    dialogRef.afterClosed().subscribe((confirmado: boolean) => {
      if (confirmado) {
        this.bloquearAccionesCierre = true;
        this.loadingEjecutarCierre = true;
        this.ejecutarRespaldoAntesDeCierre();
      }
    });
  }

  confirmarEjecutarReversion(): void {
    if (this.formReversion.invalid) {
      this.formReversion.markAllAsTouched();
      this.setMensaje('Completa los datos obligatorios antes de ejecutar la reversión.', 'error');
      return;
    }

    if (this.bloquearAccionesReversion || this.loadingEjecutarReversion) {
      return;
    }

    const anio = this.formReversion.get('anioCerrar')?.value;
    const tipDoc = this.formReversion.get('tipDoc')?.value;
    const numDoc = this.formReversion.get('numDoc')?.value;

    const dialogRef = this.dialog.open(CustomMessageBoxComponent, {
      width: '420px',
      data: {
        title: 'Confirmar reversión de cierre',
        message:
          `Se reversará el cierre contable anual.\n\n` +
          `Año: ${anio || '(sin año)'}\n` +
          `Tipo documento: ${tipDoc || '(sin tipo)'}\n` +
          `Número documento: ${numDoc || '(sin número)'}\n\n` +
          `Antes de continuar se ejecutará un respaldo de base de datos.\n\n` +
          `Este proceso eliminará el asiento de cierre y reabrirá los movimientos del período.\n\n` +
          `¿Está seguro de continuar?`,
        type: 'warning',
        confirmText: 'Sí, reversar',
        cancelText: 'Cancelar',
        showCancel: true
      }
    });

    dialogRef.afterClosed().subscribe((confirmado: boolean) => {
      if (confirmado) {
        this.bloquearAccionesReversion = true;
        this.loadingEjecutarReversion = true;
        this.ejecutarRespaldoAntesDeReversion();
      }
    });
  }

  limpiarCierre(): void {
    this.formCierre.reset({
      anioCerrar: new Date().getFullYear(),
      fechaCierre: this.formatearFecha(new Date()),
      idZona: 1,
      idUsuario: this.usuarioActual?.id_usuario || null,
      idEmpresa: this.usuarioActual?.id_empresa || null,
      idLocal: 1,
      tipDoc: 'TB',
      numDoc: null,
      beneficiario: '',
      observacion: ''
    });

    this.resultadoPreviewCierre = null;
    this.resultadoEjecutarCierre = null;
    this.bloquearAccionesCierre = false;
    this.loadingPreviewCierre = false;
    this.loadingEjecutarCierre = false;
    this.setMensaje('', 'info');
  }

  limpiarReversion(): void {
    this.formReversion.reset({
      anioCerrar: new Date().getFullYear(),
      tipDoc: 'TB',
      numDoc: null,
      idUsuario: this.usuarioActual?.id_usuario || null
    });

    this.resultadoPreviewReversion = null;
    this.resultadoEjecutarReversion = null;
    this.bloquearAccionesReversion = false;
    this.loadingPreviewReversion = false;
    this.loadingEjecutarReversion = false;
    this.setMensaje('', 'info');
  }
}