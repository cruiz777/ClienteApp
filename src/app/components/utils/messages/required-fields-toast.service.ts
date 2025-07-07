import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
//Servicio para POPUPS generico
export class RequiredFieldsToastService {
  constructor(private toastr: ToastrService) { }

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
  exito(mensaje: string): void {
    this.toastr.success(mensaje, 'Éxito', {
      closeButton: true,
      timeOut: 3000,
      positionClass: 'toast-top-right'
    });
  }

  error(mensaje: string): void {
    this.toastr.error(mensaje, 'Error', {
      closeButton: true,
      timeOut: 4000,
      positionClass: 'toast-top-right'
    });
  }

}
