import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { VacacionesService } from 'src/app/services/rol/vacaciones-rol.service';
import {
  UpdateSolicitudVacacionesRequest,
  VacacionTomadaGridResponse
} from 'src/app/interfaces/responses/vacaciones.response';
import { MessageBoxService } from 'src/app/components/utils/messages/message-box.service';

export interface EditarVacacionDialogData {
  row: VacacionTomadaGridResponse;
}

@Component({
  selector: 'app-editar-vacacion-dialog',
  templateUrl: './editar-vacacion-dialog.component.html',
  styleUrls: ['./editar-vacacion-dialog.component.css']
})
export class EditarVacacionDialogComponent {
  form: FormGroup;
  guardando = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<EditarVacacionDialogComponent>,
    private vacacionesService: VacacionesService,
    private messageBox: MessageBoxService,
    @Inject(MAT_DIALOG_DATA) public data: EditarVacacionDialogData
  ) {
    this.form = this.fb.group({
      observacion: [data.row.observacion ?? ''],
      personaReemplazo: [data.row.personaReemplazo ?? ''],
      usuarioAutoriza: [data.row.usuarioAutoriza ?? ''],
      usuarioAprueba: [data.row.usuarioAprueba ?? '']
    });
  }

  guardar(): void {
    const v = this.form.value;

    const request: UpdateSolicitudVacacionesRequest = {
      idVacacionTomada: this.data.row.idVacacionTomada,
      observacion: v.observacion || null,
      personaReemplazo: v.personaReemplazo || null,
      usuarioAutoriza: v.usuarioAutoriza || null,
      usuarioAprueba: v.usuarioAprueba || null
    };

    this.guardando = true;

    this.vacacionesService.actualizarSolicitud(request).subscribe({
      next: res => {
        this.guardando = false;
        this.messageBox.success(res.message || 'Solicitud actualizada correctamente.');
        this.dialogRef.close(true);
      },
      error: err => {
        this.guardando = false;
        const msg = err?.error?.message || 'No se pudo actualizar la solicitud.';
        this.messageBox.error(msg);
      }
    });
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
