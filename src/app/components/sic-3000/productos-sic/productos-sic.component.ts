import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-productos-sic',
  templateUrl: './productos-sic.component.html',
  styleUrls: ['./productos-sic.component.css']
})
export class ProductosSicComponent {

  selectedTab = 0;

  unidadesVenta = ['Unidad', 'Caja', 'Docena', 'Paquete', 'Litro'];
  tiposProducto = ['Bien', 'Servicio', 'Medicamento', 'Insumo'];
  presentaciones = ['Botella', 'Caja', 'Bolsa', 'Blíster', 'Granel'];
  clasesProducto = ['A', 'B', 'C'];

  form: FormGroup = this.fb.group({
    // encabezado
    descripcion: ['', [Validators.required, Validators.maxLength(200)]],

    // izquierda
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

    // centro
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

    // derecha
    tipoProducto: [null],
    presentacion: [null],
    claseProducto: [null],
    urlFoto: [''],

    // fechas
    fechaCreacion: [null],
    fechaModificacion: [null],
  });

  constructor(private fb: FormBuilder) {}

  nuevo(): void {
    const keep = { descripcion: this.form.value.descripcion };
    this.form.reset({ ...keep, activo: true });
  }

  grabar(): void {
    if (this.form.invalid) return;
    // Aquí integras tu servicio
    console.log('Guardar', this.form.value);
  }

  imprimir(): void {
    // Hook para impresión
    window.print();
  }

  adjuntar(): void {
    // Hook para adjuntar archivos / abrir dialogo
    console.log('Adjuntar archivo');
  }

}
