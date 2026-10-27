// src/app/asientos/asientos-form/sesion-caducada.dialog.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-sesion-caducada-dialog',
  template: `
    <h2 mat-dialog-title>Sesión caducada</h2>
    <mat-dialog-content>Tu sesión ha expirado. Inicia sesión nuevamente.</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>OK</button>
    </mat-dialog-actions>
  `
})
export class SesionCaducadaDialog {}
