import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-productos-sic',
  templateUrl: './productos-sic.component.html',
  styleUrls: ['./productos-sic.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductosSicComponent {

  selectedTab = 0;

  unidadesVenta = ['Unidad', 'Caja', 'Docena', 'Paquete', 'Litro'];
  tiposProducto = ['Bien', 'Servicio', 'Medicamento', 'Insumo'];
  presentaciones = ['Botella', 'Caja', 'Bolsa', 'Blíster', 'Granel'];
  clasesProducto = ['A', 'B', 'C'];

  form: FormGroup = this.fb.group({
    descripcion: ['', [Validators.required, Validators.maxLength(200)]],
    codigoInterno: [''],
    descripcion1: [''],
    unidadVenta: [null],
    existenciaGlobal: [''],
    abreviacion: [''],

    pagaIva: [false],
    productoEnVenta: [false],
    cargarInventarios: [false],
    productoConPeso: [false],
    consumoInterno: [false],

    codigoBarras: [''],
    generarCodigo: [false],
    descripcionPOS: [''],
    cantidad: [null],
    canCov: [''],
    referencia: [''],
    manejaDecimales: [false],
    psicotropico: [false],
    estupefaciente: [false],
    activo: [true],
    altoRiesgo: [false],

    tipoProducto: [null],
    presentacion: [null],
    claseProducto: [null],
    urlFoto: [''],

    fechaCreacion: [null],
    fechaModificacion: [null],
  });

  constructor(private fb: FormBuilder) {}

  trackByValue = (_: number, value: string) => value;

  nuevo(): void {
    const keep = { descripcion: this.form.value.descripcion };
    this.form.reset({ ...keep, activo: true });
  }

  grabar(): void {
    if (this.form.invalid) return;
    console.log('Guardar', this.form.value);
  }

  imprimir(): void {
    window.print();
  }

  adjuntar(): void {
    console.log('Adjuntar archivo');
  }

}
