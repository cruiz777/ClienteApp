import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { ResumenInecService } from 'src/app/services/rol/resumen-inec.service.service';

@Component({
  selector: 'app-resumen-inec',
  templateUrl: './resumen-inec.component.html',
  styleUrls: ['./resumen-inec.component.css']
})
export class ResumenInecComponent implements OnInit {

  form!: FormGroup;

  generando = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly resumenInecService: ResumenInecService
  ) { }

  ngOnInit(): void {

    this.form = this.fb.group({
      periodo: ['', Validators.required]
    });

    this.cargarMock();
  }

  cargarMock(): void {

    this.form.patchValue({
      periodo: '2026-04-30'
    });
  }

  aceptar(): void {

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const periodo: string =
      this.form.get('periodo')?.value;

    if (!periodo) {
      return;
    }

    const partes = periodo.split('-');

    const anio = Number(partes[0]);
    const mes = Number(partes[1]);

    /*
     * AQUÍ debes colocar la empresa de la sesión.
     *
     * Ejemplo temporal:
     */
    const idEmpresa = 1;

    this.generando = true;

    this.resumenInecService
      .generarPdf(
        idEmpresa,
        anio,
        mes
      )
      .subscribe({

        next: (blob: Blob) => {

          this.generando = false;

          if (!blob || blob.size === 0) {
            console.error(
              'El backend devolvió un PDF vacío.'
            );
            return;
          }

          const url =
            window.URL.createObjectURL(blob);

          const link =
            document.createElement('a');

          link.href = url;

          link.download =
            `Resumen_INEC_${anio}_${String(mes).padStart(2, '0')}.pdf`;

          document.body.appendChild(link);

          link.click();

          document.body.removeChild(link);

          window.URL.revokeObjectURL(url);
        },

        error: err => {

          this.generando = false;

          console.error(
            'Error generando resumen INEC:',
            err
          );

          console.error(
            err?.error?.message ??
            'No se pudo generar el reporte INEC.'
          );
        }
      });
  }

  cancelar(): void {

    this.form.reset();
  }
}