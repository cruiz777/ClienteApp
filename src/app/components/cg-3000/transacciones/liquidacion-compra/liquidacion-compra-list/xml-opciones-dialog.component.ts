import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export type XmlDialogAction = 'generar' | 'descargar' | null;

export interface XmlOpcionesDialogData {
  enviado: boolean | null;
  numdoc?: string;
  beneficiario?: string;
  tipoDocumento?: string; // ✅ NUEVO
}

@Component({
  selector: 'app-xml-opciones-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  template: `
    <div class="xml-dialog">

      <div class="xml-head">
        <div class="xml-title">Acciones XML</div>
        <button class="icon-close" (click)="close(null)" title="Cerrar">×</button>
      </div>

      <div class="xml-sub">
        <div class="xml-line">
          <span class="label">Tipo documento:</span>
          <span class="value">{{ data.tipoDocumento || '-' }}</span>
        </div>

        <div class="xml-line">
          <span class="label">Documento:</span>
          <span class="value">{{ data.numdoc || '-' }}</span>
        </div>

        <div class="xml-line">
          <span class="label">Beneficiario:</span>
          <span class="value">{{ data.beneficiario || '-' }}</span>
        </div>

        <div class="xml-status" [class.ok]="data.enviado === true" [class.pending]="data.enviado === false">
          <span class="dot"></span>
          <span *ngIf="data.enviado === true">XML generado</span>
          <span *ngIf="data.enviado === false">Pendiente de generar</span>
          <span *ngIf="data.enviado == null">Estado no definido</span>
        </div>
      </div>

      <div class="xml-actions">

        <!-- GENERAR -->
        <button
          class="action-btn action-generate"
          [disabled]="data.enviado !== false"
          (click)="close('generar')"
          title="Generar XML">
          <img src="assets/icons/xml-pg.png" alt="Generar XML" />
          <div class="txt">
            <div class="t1">Generar XML</div>
            <div class="t2">Disponible si está pendiente</div>
          </div>
        </button>

        <!-- DESCARGAR PDF -->
        <button
          class="action-btn action-download"
          [disabled]="data.enviado !== true"
          (click)="close('descargar')"
          title="Descargar PDF">
          <img src="assets/icons/icon-imprimir.png" alt="Descargar PDF" />
          <div class="txt">
            <div class="t1">Descargar PDF</div>
            <div class="t2">Disponible si ya fue generado</div>
          </div>
        </button>

      </div>

      <div class="xml-foot">
        <button class="btn-cancel" (click)="close(null)">Cerrar</button>
      </div>

    </div>
  `,
  styles: [`
    .xml-dialog{ width: 380px; padding:14px 14px 12px; font-family: Arial, sans-serif; }
    .xml-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
    .xml-title{ font-weight:700; font-size:15px; color:#1b1b1b; }
    .icon-close{ width:30px; height:30px; border:0; background:#f2f2f2; border-radius:8px; cursor:pointer; font-size:18px; line-height:30px; }
    .xml-sub{ background:#fafafa; border:1px solid #e9e9e9; border-radius:12px; padding:10px; margin-bottom:12px; }
    .xml-line{ display:flex; gap:8px; margin:2px 0; }
    .label{ color:#666; min-width:92px; }
    .value{ color:#111; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:240px; }
    .xml-status{ display:flex; align-items:center; gap:8px; margin-top:10px; font-weight:700; }
    .xml-status .dot{ width:10px; height:10px; border-radius:50%; background:#999; display:inline-block; }
    .xml-status.pending .dot{ background:#2e7d32; }
    .xml-status.ok .dot{ background:#e53935; }

    .xml-actions{ display:flex; flex-direction:column; gap:10px; }
    .action-btn{
      display:flex; align-items:center; gap:12px;
      width:100%; padding:10px 12px;
      border-radius:14px; border:1px solid #e3e3e3;
      background:#fff; cursor:pointer; text-align:left;
      transition: transform .05s ease;
    }
    .action-btn:active{ transform: scale(0.995); }
    .action-btn img{ width:22px; height:22px; }
    .action-btn .txt .t1{ font-weight:800; color:#111; }
    .action-btn .txt .t2{ font-size:12px; color:#666; margin-top:2px; }

    .action-generate{ border-left:5px solid #2e7d32; }
    .action-download{ border-left:5px solid #e53935; }

    .action-btn[disabled]{
      opacity:.45; cursor:not-allowed;
      filter: grayscale(0.2);
    }

    .xml-foot{ display:flex; justify-content:flex-end; margin-top:12px; }
    .btn-cancel{
      border:1px solid #d6d6d6; background:#f7f7f7;
      border-radius:10px; padding:8px 14px; cursor:pointer;
      font-weight:700;
    }
  `]
})
export class XmlOpcionesDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: XmlOpcionesDialogData,
    private ref: MatDialogRef<XmlOpcionesDialogComponent, XmlDialogAction>
  ) {}

  close(action: XmlDialogAction) {
    this.ref.close(action);
  }
}
