import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { FilePreviewComponent, PreviewConfig } from '../util/preview/file-preview.component';

@Injectable({
  providedIn: 'root'
})
export class PreviewDialogService {

  private dialogRef: MatDialogRef<FilePreviewComponent> | null = null;

  constructor(private dialog: MatDialog) {}

  /**
   * Abre el preview en un dialog de Material
   */
  abrirPreview(config: PreviewConfig): MatDialogRef<FilePreviewComponent> {
    // Cerrar dialog anterior si existe
    if (this.dialogRef) {
      this.dialogRef.close();
    }

    // Abrir nuevo dialog
    this.dialogRef = this.dialog.open(FilePreviewComponent, {
      width: '95vw',
      height: '95vh',
      maxWidth: '95vw',
      maxHeight: '95vh',
      panelClass: 'preview-dialog-panel',
      data: config,
      disableClose: false, // Permite cerrar con ESC o click fuera
      hasBackdrop: true,
      backdropClass: 'preview-dialog-backdrop'
    });

    // Limpiar referencia cuando se cierre
    this.dialogRef.afterClosed().subscribe(() => {
      // Liberar memoria del blob URL si existe
      if (config.url && typeof config.url === 'string' && config.url.startsWith('blob:')) {
        URL.revokeObjectURL(config.url);
      }
      this.dialogRef = null;
    });

    return this.dialogRef;
  }

  /**
   * Cierra el dialog actual
   */
  cerrarPreview(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }
}