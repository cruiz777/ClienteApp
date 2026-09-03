import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  CustomMessageBoxComponent,
  MessageBoxData
} from 'src/app/components/utils/messages/custom-message-box.component';

@Injectable({
  providedIn: 'root'
})
export class MessageBoxService {
  constructor(private dialog: MatDialog) {}

  // ===== Mensajes de resultado (sin cancelar) =====

  success(message: string, title = 'Éxito'): void {
    this.mostrarMensaje({
      title,
      message,
      type: 'success',
      confirmText: 'Aceptar',
      showCancel: false
    });
  }

  error(message: string, title = 'Error'): void {
    this.mostrarMensaje({
      title,
      message,
      type: 'error',
      confirmText: 'Aceptar',
      showCancel: false
    });
  }

  warning(message: string, title = 'Advertencia'): void {
    this.mostrarMensaje({
      title,
      message,
      type: 'warning',
      confirmText: 'Aceptar',
      showCancel: false
    });
  }

  info(message: string, title = 'Información'): void {
    this.mostrarMensaje({
      title,
      message,
      type: 'info',
      confirmText: 'Entendido',
      showCancel: false
    });
  }

  private mostrarMensaje(data: MessageBoxData, width = '420px'): void {
    this.dialog.open(CustomMessageBoxComponent, { width, data });
  }

  // ===== Confirmación (Sí / No) =====
  // Devuelve un Observable<boolean>: true si el usuario confirmó, false si canceló o cerró el diálogo.

  confirm(
    message: string,
    options?: {
      title?: string;
      confirmText?: string;
      cancelText?: string;
      type?: MessageBoxData['type'];
      width?: string;
    }
  ): Observable<boolean> {
    const data: MessageBoxData = {
      title: options?.title ?? 'Confirmar',
      message,
      type: options?.type ?? 'warning',
      confirmText: options?.confirmText ?? 'Sí',
      cancelText: options?.cancelText ?? 'Cancelar',
      showCancel: true
    };

    return this.dialog
      .open(CustomMessageBoxComponent, {
        width: options?.width ?? '400px',
        data
      })
      .afterClosed()
      .pipe(map(resultado => !!resultado));
  }
}
