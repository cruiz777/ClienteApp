import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface MessageBoxData {
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  isLoading?: boolean;
  loadingText?: string; // Texto personalizable para el loading
}

@Component({
  selector: 'app-custom-message-box',
  templateUrl: './custom-message-box.component.html',
  styleUrls: ['./custom-message-box.component.scss']
})
export class CustomMessageBoxComponent {
  constructor(
    public dialogRef: MatDialogRef<CustomMessageBoxComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MessageBoxData
  ) {
    // Deshabilitar el cierre del diálogo mientras está cargando
    this.dialogRef.disableClose = this.data.isLoading || false;
  }

  onConfirm(): void {
    if (!this.data.isLoading) {
      this.dialogRef.close(true);
    }
  }

  onCancel(): void {
    if (!this.data.isLoading) {
      this.dialogRef.close(false);
    }
  }

  // Método para actualizar el estado de loading desde fuera
  updateLoadingState(isLoading: boolean, loadingText?: string): void {
    this.data.isLoading = isLoading;
    if (loadingText) {
      this.data.loadingText = loadingText;
    }
    this.dialogRef.disableClose = isLoading;
  }
}