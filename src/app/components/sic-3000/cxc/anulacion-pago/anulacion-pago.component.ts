import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { jsPDF } from 'jspdf';

import { CuentaCobrarService, PagoPorNumero } from 'src/app/services/cuenta-cobrar.service';
import { UsuarioService } from 'src/app/services/usuario.service';
import {
  ReversarAsientoService,
  GenerarAsientoReversoPagoResponse,
  ApiResponse
} from 'src/app/services/reversar-asiento.service';

import { CustomMessageBoxComponent } from 'src/app/util/messages/custom-message-box.component';

@Component({
  selector: 'app-anulacion-pago',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  templateUrl: './anulacion-pago.component.html',
  styleUrls: ['./anulacion-pago.component.css']
})
export class AnulacionPagoComponent implements OnInit {
  @ViewChild('obsInput') obsInput!: ElementRef<HTMLTextAreaElement>;

  paymentNumber = '';
  paymentDate = '';
  clientName = '';
  observacion = '';
  reversalDate = '';
  obsError = false;

  logoUrl = 'assets/logo/GS1-logo.png';
  private logoDataUrl?: string;

  pago?: PagoPorNumero;
  /** id_pago del registro en sic.pagos */
  idPago: number | null = null;

  usuarioActual = this.usuarioService.getUsuarioActual();

  // estados de botones
  loading = false;
  reverting = false;
  canConsult = true;
  canRevert = false;

  constructor(
    private cxc: CuentaCobrarService,
    private _snackBar: MatSnackBar,
    private usuarioService: UsuarioService,
    private dialog: MatDialog,
    private reversarAsientoService: ReversarAsientoService
  ) {}

  ngOnInit(): void {
    this.setReversalToday(); // fecha actual al cargar
    this.preloadLogo();
  }

  // =========================
  //   CONSULTA DEL PAGO
  // =========================
  onConsulta(): void {
    const nro = (this.paymentNumber || '').trim();
    if (!nro) {
      this.mostrarAlerta('Ingrese el número de pago (ej: PAG000059).', 'info');
      return;
    }

    this.loading = true;
    this.canConsult = false;
    this.canRevert = false;

    this.cxc.getPagoByNumero(nro).subscribe({
      next: (pago: PagoPorNumero) => {
        if (!pago) {
          this.handleNoEncontrado();
          return;
        }

        this.pago = pago;
        // guardamos id_pago para el reverso contable
        this.idPago = (pago as any).id_pago ?? null;

        this.clientName = pago.cliente_nombre;
        this.paymentDate = this.formatFecha(pago.fecha);

        // si no han elegido fecha de reversión, pon hoy
        if (!this.reversalDate) this.setReversalToday();

        this.loading = false;
        this.canRevert = true;
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        if (err.status === 404) this.handleNoEncontrado();
        else this.mostrarAlerta('No se pudo consultar el pago. Intente nuevamente.', 'error');
        this.canConsult = true;
        this.canRevert = false;
      }
    });
  }

  // =========================
  //     REVERSAR EL PAGO
  // =========================
  onRevertirPago(): void {
    if (!this.pago) return;

    const motivo = (this.observacion ?? '').trim();
    if (!motivo) {
      this.obsError = true;
      this.mostrarAlerta('Ingrese un motivo de anulación en Observación.', 'info');
      setTimeout(() => this.obsInput?.nativeElement?.focus(), 0);
      return;
    }

    const numero = this.pago.numero_pago;
    const usuarioId = this.getUsuarioId();
    if (!usuarioId) {
      this.mostrarAlerta('No se pudo identificar el usuario responsable.', 'error');
      return;
    }

    if (!this.idPago) {
      this.mostrarAlerta('No se pudo obtener el IdPago para generar el reverso contable.', 'error');
      return;
    }

    this.confirmarYGuardar(() => {
      this.reverting = true;

      // 1️⃣ Generar asiento de reverso en cg.cabecera_maestro/cg.detalle_maestro
      this.reversarAsientoService
        .generarReversoDesdePago(this.idPago!, usuarioId)
        .subscribe({
          next: (resp: ApiResponse<GenerarAsientoReversoPagoResponse>) => {
            if (!resp || resp.type.toLowerCase() !== 'success' || !resp.data) {
              this.reverting = false;
              this.mostrarAlerta(
                resp?.message || 'No se pudo generar el asiento contable de reverso.',
                'error'
              );
              return;
            }

            const info = resp.data;
            console.log('Asiento de reverso generado:', info);

            // 2️⃣ Si el reverso contable fue OK, anulamos el pago en SIC
            this.cxc.anularPago(numero, {
              motivo_anulacion: motivo,
              id_usuario_responsable: usuarioId
            }).subscribe({
              next: (msg: string) => {
                this.reverting = false;
                this.canRevert = false;

                const asientoMsg =
                  `Asiento original: ${info.numdocOriginal}  |  Reverso: ${info.numdocReverso}`;
                this.mostrarAlerta(
                  (msg || `Pago ${numero} anulado.`) + ' ' + asientoMsg,
                  'ok'
                );

                this.generatePdfReversion();
              },
              error: (err) => {
                this.reverting = false;
                this.mostrarAlerta(err?.message || 'Error anulando el pago.', 'error');
              }
            });
          },
          error: (err) => {
            this.reverting = false;
            this.mostrarAlerta(
              err?.message || 'Error generando el asiento contable de reverso.',
              'error'
            );
          }
        });
    });
  }

  // =========================
  //       PDF REVERSIÓN
  // =========================
  generatePdfReversion(): void {
    if (!this.pago) return;

    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const left = 20;
      let y = 20;

      // Logo (opcional)
      if (this.logoDataUrl) {
        const logoW = 30, logoH = 12;
        doc.addImage(this.logoDataUrl, 'PNG', left, 12, logoW, logoH);
        y = 12 + logoH + 6;
      }

      // Título
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Reversión de Pago', left, y); y += 10;

      // Fecha emisión
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const hoy = this.getHoyDMY();
      doc.text(`Fecha de emisión: ${hoy}`, left, y); y += 8;

      // Datos del pago
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
      doc.text('Datos del Pago', left, y); y += 8;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(11);

      this.addLine(doc, 'No. Pago:', this.pago.numero_pago, left, y); y += 7;
      this.addLine(doc, 'Fecha Pago:', this.paymentDate || '-', left, y); y += 7;
      this.addLine(doc, 'Cliente:', this.clientName || '-', left, y); y += 7;
      this.addLine(doc, 'Fecha Reversión:', this.reversalDate || hoy, left, y); y += 7;

      const usuarioMostrar =
        (this.usuarioActual?.nombre_usuario ??
          String(this.getUsuarioId() || '-'));
      this.addLine(doc, 'Usuario:', usuarioMostrar, left, y); y += 10;

      // Observación
      doc.setFont('helvetica', 'bold');
      doc.text('Observación', left, y); y += 7;
      doc.setFont('helvetica', 'normal');
      const obs = (this.observacion || 'Sin observaciones').trim();
      const obsLines = doc.splitTextToSize(obs, 170);
      doc.text(obsLines, left, y);
      y += obsLines.length * 6 + 10;

      // Pie
      doc.setFont('helvetica', 'italic'); doc.setFontSize(9);
      doc.text('Documento generado automáticamente por el sistema de CxC.', left, 285);

      const fileName = `ReversionPago_${this.pago.numero_pago}.pdf`;
      doc.save(fileName);
    } catch (e: any) {
      this.mostrarAlerta('No se pudo generar el PDF.', 'error');
    }
  }

  private addLine(doc: jsPDF, label: string, value: string, x: number, y: number): void {
    doc.setFont('helvetica', 'bold');
    doc.text(label, x, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value ?? '-'), x + 40, y);
  }

  private getHoyDMY(): string {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  }

  getUsuarioId(): number {
    const u = this.usuarioActual;
    return Number(u?.id_usuario ?? 0) || 0;
  }

  onCancelar(): void {
    this.paymentNumber = '';
    this.paymentDate = '';
    this.clientName = '';
    this.observacion = '';
    this.reversalDate = '';
    this.pago = undefined;
    this.idPago = null;

    this.loading = false;
    this.reverting = false;
    this.canConsult = true;
    this.canRevert = false;

    this.setReversalToday();
  }

  private handleNoEncontrado(): void {
    this.pago = undefined;
    this.idPago = null;
    this.clientName = '';
    this.paymentDate = '';
    this.mostrarAlerta('Pago no existe.', 'error');
  }

  mostrarAlerta(mensaje: string, tipo: 'info' | 'error' | 'ok' | string): void {
    this._snackBar.open(mensaje, 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: tipo === 'error'
        ? ['snack-error']
        : tipo === 'ok'
        ? ['snack-ok']
        : ['snack-info']
    });
  }

  private formatFecha(iso: string): string {
    if (!iso) return '';
    const mDMY = iso.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (mDMY) return `${mDMY[1]}/${mDMY[2]}/${mDMY[3]}`;
    const mISO = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (mISO) return `${mISO[3]}/${mISO[2]}/${mISO[1]}`;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  }

  private setReversalToday(): void {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    this.reversalDate = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  }

  onObservacionChange(v: string) {
    this.observacion = v;
    this.obsError = !v.trim();
  }

  private preloadLogo(): void {
    this.imageToDataURL(this.logoUrl)
      .then((data) => { this.logoDataUrl = data; })
      .catch(() => {
        console.warn('No se pudo cargar el logo:', this.logoUrl);
      });
  }

  private imageToDataURL(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject('Canvas no soportado'); return; }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  confirmarYGuardar = (accion: () => void) => {
    this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: {
        title: '¿Revertir Pago?',
        message: '¿Está seguro?',
        type: 'info',
        confirmText: 'Sí, confirmar',
        cancelText: 'Cancelar',
        showCancel: true
      }
    }).afterClosed().subscribe(result => {
      if (result === true) {
        accion();
        this.mostrarAlerta('Operación confirmada.', 'ok');
      } else {
        this.mostrarAlerta('Operación cancelada.', 'info');
      }
    });
  };
}
