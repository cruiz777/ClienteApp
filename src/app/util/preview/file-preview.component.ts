import { Component, Input, OnInit, Optional, Inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface PreviewConfig {
  file?: File | Blob;            // Debe ser application/pdf
  url?: string;                  // Debe terminar en .pdf o devolver PDF
  showPrintButton?: boolean;
  showDownloadButton?: boolean;
  title?: string;
}

@Component({
  selector: 'app-file-preview',
  templateUrl: './file-preview.component.html',
  styleUrls: ['./file-preview.component.scss']
})
export class FilePreviewComponent implements OnInit {
  @Input() config: PreviewConfig = {};

  previewUrl: SafeResourceUrl | null = null;
  isLoading = true;
  error = '';
  private printing = false; // guard anti-doble print

  constructor(
    private sanitizer: DomSanitizer,
    @Optional() @Inject(MAT_DIALOG_DATA) public dialogData: PreviewConfig,
    @Optional() private dialogRef: MatDialogRef<FilePreviewComponent>
  ) {
    if (dialogData) this.config = dialogData;
  }

  ngOnInit(): void {
    this.loadPdf();
  }

  private async loadPdf(): Promise<void> {
    try {
      this.isLoading = true;
      this.error = '';

      if (this.config.file) {
        const type = (this.config.file as File).type || '';
        if (type !== 'application/pdf') {
          this.error = 'Solo se admite PDF.';
          return;
        }
        const url = URL.createObjectURL(this.config.file);
        this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      } else if (this.config.url) {
        // No validamos extensión; asumimos que devuelve PDF
        this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.config.url);
      } else {
        this.error = 'No se proporcionó archivo o URL.';
      }
    } catch (e: any) {
      this.error = `Error al cargar el PDF: ${e?.message || e}`;
    } finally {
      this.isLoading = false;
    }
  }

  print(): void {
    if (this.printing) return;
    this.printing = true;

    const iframe = document.querySelector('.preview-iframe') as HTMLIFrameElement | null;
    const win = iframe?.contentWindow;
    // dispara solo una (si hay iframe usa esa; si no, fallback)
    (win ?? window).focus();
    (win ?? window).print();

    // libera el guard tras un tiempo para no quedar bloqueado si reabren
    setTimeout(() => { this.printing = false; }, 1500);
  }

  download(): void {
    if (this.config.file) {
      const url = URL.createObjectURL(this.config.file);
      const a = document.createElement('a');
      a.href = url;
      a.download = (this.config.file as File).name || 'documento.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } else if (this.config.url) {
      const a = document.createElement('a');
      a.href = this.config.url;
      a.download = this.config.title || 'documento.pdf';
      a.target = '_blank';
      a.click();
    }
  }

  close(): void {
    this.dialogRef?.close();
  }
}
