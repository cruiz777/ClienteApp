import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { CustomMessageBoxComponent, MessageBoxData } from '../components/utils/messages/custom-message-box.component';

@Injectable({
  providedIn: 'root'
})
export class MessageBoxService {
  
  constructor(private dialog: MatDialog) {}

  // Método básico para mostrar message box
  show(data: MessageBoxData): Observable<boolean> {
    const dialogRef = this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      disableClose: data.isLoading || false,
      data: data
    });

    return dialogRef.afterClosed();
  }

  // Método específico para mostrar loading
  showLoading(title: string, message: string, loadingText?: string): MatDialogRef<CustomMessageBoxComponent> {
    const data: MessageBoxData = {
      title: title,
      message: message,
      isLoading: true,
      loadingText: loadingText || 'Procesando...',
      showCancel: false
    };

    return this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      disableClose: true,
      data: data
    });
  }

  // Método para mostrar confirmación con loading posterior
  showConfirmWithLoading(data: MessageBoxData): Observable<boolean> {
    const dialogRef = this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      disableClose: data.isLoading || false,
      data: data
    });

    return dialogRef.afterClosed();
  }

  // Método para actualizar un diálogo existente a estado loading
  updateToLoading(dialogRef: MatDialogRef<CustomMessageBoxComponent>, loadingText?: string): void {
    if (dialogRef.componentInstance) {
      dialogRef.componentInstance.updateLoadingState(true, loadingText);
    }
  }

  // Método para quitar el loading de un diálogo existente
  removeLoading(dialogRef: MatDialogRef<CustomMessageBoxComponent>): void {
    if (dialogRef.componentInstance) {
      dialogRef.componentInstance.updateLoadingState(false);
    }
  }
}