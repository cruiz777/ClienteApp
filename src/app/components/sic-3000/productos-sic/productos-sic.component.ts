import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';

@Component({
  selector: 'app-productos-sic',
  templateUrl: './productos-sic.component.html',
  styleUrls: ['./productos-sic.component.css']
})
export class ProductosSicComponent implements OnInit, AfterViewInit {

  selectedTab = 0;

  /** Catálogos (combos) */
  unidadesVenta   = ['Unidad', 'Caja', 'Docena', 'Paquete', 'Litro'];
  tiposProducto   = ['Bien', 'Servicio', 'Medicamento', 'Insumo'];
  presentaciones  = ['Botella', 'Caja', 'Bolsa', 'Blíster', 'Granel'];
  clasesProducto  = ['A', 'B', 'C'];

  /** Formularios (se definen en ngOnInit) */
  form!: FormGroup;
  proveedorForm!: FormGroup;

  /** TAB 5: columnas de la tabla */
  colsTab5: string[] = [
    'proveedor', 'costoCompra', 'unidadCompra', 'fechaIngreso',
    'costoNeto', 'consignacion', 'descuentoProducto', 'descuentos'
  ];

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Seleccionar primer tab desde el arranque
    this.selectedTab = 0;

    // Form principal (Tab 1)
    this.form = this.fb.group({
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

    // Form Tab 5
    this.proveedorForm = this.fb.group({
      codigoInternoTab5: [''],
      codigoBarrasTab5: [''],
      descripcionTab5: [''],
      filasTab5: this.fb.array([] as FormGroup[])
    });

    // Filas iniciales para la grilla del Tab 5
    for (let i = 0; i < 4; i++) this.filasTab5.push(this.crearFila());
  }

  ngAfterViewInit(): void {
    // Asegura pintado inmediato del primer tab sin depender de interacción
    this.cdr.detectChanges();
  }

  // ===== Getters / helpers =====
  get filasTab5(): FormArray<FormGroup> {
    return this.proveedorForm.get('filasTab5') as FormArray<FormGroup>;
  }

  private crearFila(): FormGroup {
    return this.fb.group({
      proveedor: [''],
      costoCompra: [null],
      unidadCompra: [''],
      fechaIngreso: [null],
      costoNeto: [null],
      consignacion: [false],
      descuentoProducto: [null],
      descuentos: ['']
    });
  }

  trackByValue = (_: number, value: string) => value;
  trackByIndex = (_: number, i: number) => i;

  // ===== Acciones generales =====
  nuevo(): void {
    const keep = { descripcion: this.form.value.descripcion };
    this.form.reset({ ...keep, activo: true });
  }

  grabar(): void {
    if (this.form.invalid) return;
    console.log('Guardar (form principal)', this.form.value);
  }

  imprimir(): void { window.print(); }
  adjuntar(): void { console.log('Adjuntar archivo (form principal)'); }

  // ===== TAB 5 =====
  nuevoTab5(): void {
    this.proveedorForm.patchValue({
      codigoInternoTab5: '',
      codigoBarrasTab5: '',
      descripcionTab5: ''
    });
    this.filasTab5.clear();
    for (let i = 0; i < 4; i++) this.filasTab5.push(this.crearFila());
  }

  grabarTab5(): void {
    if (this.proveedorForm.invalid) return;
    console.log('Guardar (TAB 5)', this.proveedorForm.value);
  }

  imprimirTab5(): void { window.print(); }
  adjuntarTab5(): void { console.log('Adjuntar (TAB 5)'); }
}
