import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PurchaseReportService } from 'src/app/services/reporte-compras.service';
import { AtsXmlRequest } from 'src/app/interfaces/requests/ats-xml-request';
import { UsuarioService } from 'src/app/services/usuario.service';

@Component({
  selector: 'app-generar-ats',
  templateUrl: './generar-ats.component.html',
  styleUrls: ['./generar-ats.component.css'],
})
export class GenerarAtsComponent implements OnInit {

  atsForm: FormGroup;
  loading = false;
  idEmpresa: number = 0; // TODO: Obtener de servicio de autenticación

  anioMinimo = 2000;
  anioMaximo = new Date().getFullYear();

  meses = [
    { valor: 1,  etiqueta: 'Enero' },
    { valor: 2,  etiqueta: 'Febrero' },
    { valor: 3,  etiqueta: 'Marzo' },
    { valor: 4,  etiqueta: 'Abril' },
    { valor: 5,  etiqueta: 'Mayo' },
    { valor: 6,  etiqueta: 'Junio' },
    { valor: 7,  etiqueta: 'Julio' },
    { valor: 8,  etiqueta: 'Agosto' },
    { valor: 9,  etiqueta: 'Septiembre' },
    { valor: 10, etiqueta: 'Octubre' },
    { valor: 11, etiqueta: 'Noviembre' },
    { valor: 12, etiqueta: 'Diciembre' }
  ];

  constructor(
    private fb: FormBuilder,
    private purchaseReportService: PurchaseReportService,
    private snackBar: MatSnackBar,
    private usuarioService: UsuarioService
  ) {
    const hoy = new Date();

    this.atsForm = this.fb.group({
      mes: [hoy.getMonth() + 1, [Validators.required]],
      anio: [
        hoy.getFullYear(),
        [
          Validators.required,
          Validators.min(this.anioMinimo),
          Validators.max(this.anioMaximo),
          Validators.pattern('^[0-9]{4}$'),
        ],
      ],
    });
  }

  ngOnInit(): void {
    this.idEmpresa = this.usuarioService.getEmpresaId() ?? 0;
  }

  // ========== GETTERS para acceso fácil en template ==========

  get mesControl() { return this.atsForm.get('mes'); }
  get anioControl() { return this.atsForm.get('anio'); }

  get mesSeleccionadoEtiqueta(): string {
    const mes = this.meses.find(m => m.valor === this.mesControl?.value);
    return mes ? mes.etiqueta : '';
  }

  // ========== VALIDACIÓN PERSONALIZADA ==========

  get anioInvalido(): boolean {
    const ctrl = this.anioControl;
    return !!(ctrl?.invalid && (ctrl?.dirty || ctrl?.touched));
  }

  get errorAnio(): string {
    const ctrl = this.anioControl;
    if (ctrl?.hasError('required'))  return 'El año es requerido';
    if (ctrl?.hasError('min'))       return `El año mínimo permitido es ${this.anioMinimo}`;
    if (ctrl?.hasError('max'))       return `El año no puede ser mayor a ${this.anioMaximo}`;
    if (ctrl?.hasError('pattern'))   return 'Ingrese un año válido (4 dígitos)';
    return '';
  }

  // ========== DESCARGA DEL ATS ==========

  generarAts(): void {
    this.atsForm.markAllAsTouched();

    if (this.atsForm.invalid) {
      this.snackBar.open('Por favor complete correctamente los campos', 'Cerrar', {
        duration: 3000,
      });
      return;
    }

    const { mes, anio } = this.atsForm.value;

    // Validar que no sea un período futuro
    const hoy = new Date();
    const periodoSeleccionado = new Date(anio, mes - 1, 1);
    const periodoActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    if (periodoSeleccionado > periodoActual) {
      this.snackBar.open('No puede generar el ATS para un período futuro', 'Cerrar', {
        duration: 3000,
      });
      return;
    }

    this.loading = true;
    this.snackBar.open(
      `Generando ATS XML de ${this.mesSeleccionadoEtiqueta} ${anio}...`,
      'Cerrar',
      { duration: 2500 }
    );

    const request: AtsXmlRequest = {
      mes,
      anio,
      idEmpresa: this.idEmpresa,
    };

    this.purchaseReportService.downloadAndSaveAtsXml(request);

    // Feedback visual mientras descarga
    setTimeout(() => {
      this.loading = false;
      this.snackBar.open(
        `ATS XML de ${this.mesSeleccionadoEtiqueta} ${anio} descargado exitosamente`,
        'Cerrar',
        { duration: 4000 }
      );
    }, 2000);
  }
}