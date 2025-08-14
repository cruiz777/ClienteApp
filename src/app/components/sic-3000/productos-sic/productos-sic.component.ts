import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';

@Component({
  selector: 'app-productos-sic',
  templateUrl: './productos-sic.component.html',
  styleUrls: ['./productos-sic.component.css']
})
export class ProductosSicComponent implements OnInit, AfterViewInit {

  /** Tab activo (asegura primer tab visible de inmediato) */
  selectedTab = 0;

  /** Catálogos (combos) usados en Tab 1 */
  unidadesVenta   = ['Unidad', 'Caja', 'Docena', 'Paquete', 'Litro'];
  tiposProducto   = ['Bien', 'Servicio', 'Medicamento', 'Insumo'];
  presentaciones  = ['Botella', 'Caja', 'Bolsa', 'Blíster', 'Granel'];
  clasesProducto  = ['A', 'B', 'C'];

  /** Formularios */
  form!: FormGroup;             // Tab 1: Datos Generales
  adicionalForm!: FormGroup;    // Tab 2: Datos Adicionales (nuevo)
  proveedorForm!: FormGroup;    // Tab 5: Proveedor

  /** TAB 5: columnas de la tabla */
  colsTab5: string[] = [
    'proveedor', 'costoCompra', 'unidadCompra', 'fechaIngreso',
    'costoNeto', 'consignacion', 'descuentoProducto', 'descuentos'
  ];

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {}

  // ================= Ciclo de vida =================

  ngOnInit(): void {
    // Primer tab seleccionado desde el arranque
    this.selectedTab = 0;

    // ====== Tab 1: Datos Generales
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

    // ====== Tab 2: Datos Adicionales (nuevo)
    this.adicionalForm = this.fb.group({
      color: [''],
      sabor: [''],
      tamanoTalla1: [''],
      medida1: [''],
      medida2: [''],
      medida3: [''],

      pasillo: [''],
      columna: [''],
      nivel: [''],
      tamanoTalla2: [''],

      observacion: [''],

      registroSanitario: [''],

      ctaVentas: [''],
      ctaInventarios: [''],
      ctaCostos: [''],
      ctaDevolucion: [''],
      productoGasto: [false],
      ctaGastos: [''],
    });

    // ====== Tab 5: Proveedor
    this.proveedorForm = this.fb.group({
      codigoInternoTab5: [''],
      codigoBarrasTab5: [''],
      descripcionTab5: [''],
      filasTab5: this.fb.array([] as FormGroup[])
    });

    for (let i = 0; i < 4; i++) this.filasTab5.push(this.crearFila());
  }

  ngAfterViewInit(): void {
    // Fuerza render inmediato (evita depender de interacción de mouse)
    this.cdr.detectChanges();
  }

  // ================= Getters / helpers =================

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

  // ================= Acciones (Tab 1) =================
  nuevo(): void {
    const keep = { descripcion: this.form.value.descripcion };
    this.form.reset({ ...keep, activo: true });
  }

  grabar(): void {
    if (this.form.invalid) return;
    console.log('Guardar (Tab 1 - Datos Generales)', this.form.value);
  }

  imprimir(): void { window.print(); }
  adjuntar(): void { console.log('Adjuntar archivo (Tab 1)'); }

  // ================= Acciones (Tab 2) =================
  nuevoTab2(): void {
    this.adicionalForm.reset({
      productoGasto: false
    });
  }

  grabarTab2(): void {
    if (this.adicionalForm.invalid) return;
    console.log('Guardar (Tab 2 - Datos Adicionales)', this.adicionalForm.value);
  }

  // ================= Acciones (Tab 5) =================
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
    console.log('Guardar (Tab 5 - Proveedor)', this.proveedorForm.value);
  }

  imprimirTab5(): void { window.print(); }
  adjuntarTab5(): void { console.log('Adjuntar (Tab 5)'); }
}
