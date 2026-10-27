import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
declare var require: any;
const html2pdf = require('html2pdf.js');

@Component({
  selector: 'app-modal-impresion',
  templateUrl: './modal-impresion.component.html',
  styleUrls: ['./modal-impresion.component.css']
})
export class ModalImpresionComponent {
  seleccionado: any;

  constructor(
    public dialogRef: MatDialogRef<ModalImpresionComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  seleccionar(item: any): void {
    this.seleccionado = item;
  }

  imprimirPDF(): void {
  if (!this.seleccionado) {
    alert('⚠️ Debe seleccionar un prefijo antes de continuar.');
    return;
  }

  const contenido = document.getElementById('contenidoPDF');
  if (!contenido) return;

  contenido.style.display = 'block';

  const opciones = {
    margin: 10,
    filename: 'prefijo_seleccionado.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().from(contenido).set(opciones).save().then(() => {
    contenido.style.display = 'none';
    this.dialogRef.close();
  });
}
cancelar(): void {
  this.dialogRef.close(); // o pasa un valor si necesitas: this.dialogRef.close(null);
}

}
