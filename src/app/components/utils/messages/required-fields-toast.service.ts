import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
//Servicio para POPUPS generico
export class RequiredFieldsToastService {
  constructor(private toastr: ToastrService) {}

  mostrar(campos: string[]): void {
    if (!campos || campos.length === 0) return;

    const mensajeHTML = campos.map(campo => `• ${campo}`).join('<br>');

    this.toastr.warning(mensajeHTML, 'Campos requeridos', {
      disableTimeOut: true,
      closeButton: true,
      enableHtml: true,
      tapToDismiss: false,
      positionClass: 'toast-top-right'
    });
  }
  cerrar(): void {
    this.toastr.clear();
  }
}
