import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';


export interface MessageBoxData {
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
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
  ) {}

  onConfirm(): void {
    this.dialogRef.close(true);  // Devuelve true al cerrar
  }

  onCancel(): void {
    this.dialogRef.close(false); // Devuelve false al cerrar
  }
}