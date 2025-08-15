import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-productos-sic',
  templateUrl: './productos-sic.component.html',
  styleUrls: ['./productos-sic.component.css']
})
export class ProductosSicComponent implements OnInit, AfterViewInit {

  selectedTab = 0;

  // Catálogos (Tab 1)
  unidadesVenta   = ['Unidad', 'Caja', 'Docena', 'Paquete', 'Litro'];
  tiposProducto   = ['Bien', 'Servicio', 'Medicamento', 'Insumo'];
  presentaciones  = ['Botella', 'Caja', 'Bolsa', 'Blíster', 'Granel'];
  clasesProducto  = ['A', 'B', 'C'];

  // IVA para Tab 3
  iva = 0.12;

  // Formularios
  form!: FormGroup;          // Tab 1
  adicionalForm!: FormGroup; // Tab 2
  preciosForm!: FormGroup;   // Tab 3

  constructor(private fb: FormBuilder, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.selectedTab = 0;

    // ===== Tab 1
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

    // ===== Tab 2
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

    // ===== Tab 3
    this.preciosForm = this.fb.group({
      // Precios
      precioOficial: [0],
      precioRedMsp: [0],
      pvpActualIva: [0, [Validators.min(0)]],               // base SIN IVA
      pvpAnteriorMasIva: [{ value: 0, disabled: true }],
      fechaAnteriorModificarPrecio: [null],
      pvpActualMasIva: [{ value: 0, disabled: true }],      // calculado
      fechaModificarPrecio: [null],
      margenUtilidad: [{ value: 0, disabled: true }],       // calculado %

      // Costos
      costoSuministro: [0],
      costoProducto: [0],
      costoPromedio: [0],
      precioCompraAnterior: [0],
      fechaAnteriorModificarCompra: [null],
      precioCompraActual: [0],
      fechaModificarCompra: [null],
      recepcionPorcentaje: [0]
    });

    // Cálculos automáticos Tab 3
    this.preciosForm.get('pvpActualIva')!.valueChanges.subscribe(() => this.recalcularPvpConIva());
    this.preciosForm.get('costoProducto')!.valueChanges.subscribe(() => this.recalcularMargen());
    this.preciosForm.get('costoPromedio')!.valueChanges.subscribe(() => this.recalcularMargen());
    this.preciosForm.get('pvpActualMasIva')!.valueChanges.subscribe(() => this.recalcularMargen());
  }

  ngAfterViewInit(): void { this.cdr.detectChanges(); }

  // ===== Getters para botonera genérica =====
  get currentForm(): FormGroup | null {
    switch (this.selectedTab) {
      case 0: return this.form;
      case 1: return this.adicionalForm;
      case 2: return this.preciosForm;
      default: return null;   // Tab 4 sin formulario
    }
  }
  get currentFormInvalid(): boolean { return !(this.currentForm && this.currentForm.valid); }

  // ===== Utilidades Tab 3 =====
  private fix(n: number, d = 4): number {
    return Number((Math.round(n * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d));
  }
  formatDecimal(controlName: string, dec = 4): void {
    const ctrl = this.preciosForm.get(controlName);
    if (!ctrl) return;
    const n = Number(ctrl.value);
    ctrl.setValue(this.fix(isFinite(n) ? n : 0, dec), { emitEvent: true });
  }
  recalcularPvpConIva(): void {
    const base = Number(this.preciosForm.getRawValue().pvpActualIva) || 0;
    const conIva = base * (1 + this.iva);
    this.preciosForm.get('pvpActualMasIva')!.setValue(this.fix(conIva, 4), { emitEvent: false });

    const anterior = Number(this.preciosForm.getRawValue().pvpAnteriorMasIva) || 0;
    if (anterior <= 0) {
      this.preciosForm.get('pvpAnteriorMasIva')!.setValue(this.fix(conIva, 4), { emitEvent: false });
    }
    this.recalcularMargen();
  }
  recalcularMargen(): void {
    const pvpConIva = Number(this.preciosForm.getRawValue().pvpActualMasIva) || 0;
    const costo = Number(this.preciosForm.getRawValue().costoProducto) || 0;
    const margen = pvpConIva > 0 ? ((pvpConIva - costo) / pvpConIva) * 100 : 0;
    this.preciosForm.get('margenUtilidad')!.setValue(this.fix(margen, 4), { emitEvent: false });
  }

  // ===== Botones genéricos (mismos en todos los tabs) =====
  onNuevo(): void {
    switch (this.selectedTab) {
      case 0:
        this.form.reset({ activo: true });
        break;
      case 1:
        this.adicionalForm.reset({ productoGasto: false });
        break;
      case 2:
        const hoy = null;
        this.preciosForm.reset({
          precioOficial: 0,
          precioRedMsp: 0,
          pvpActualIva: 0,
          pvpAnteriorMasIva: 0,
          fechaAnteriorModificarPrecio: hoy,
          pvpActualMasIva: 0,
          fechaModificarPrecio: hoy,
          margenUtilidad: 0,
          costoSuministro: 0,
          costoProducto: 0,
          costoPromedio: 0,
          precioCompraAnterior: 0,
          fechaAnteriorModificarCompra: hoy,
          precioCompraActual: 0,
          fechaModificarCompra: hoy,
          recepcionPorcentaje: 0
        });
        break;
      default:
        break;
    }
  }

  onGrabar(): void {
    switch (this.selectedTab) {
      case 0:
        if (this.form.invalid) return;
        console.log('Guardar (Tab 1 - Datos Generales)', this.form.value);
        break;
      case 1:
        if (this.adicionalForm.invalid) return;
        console.log('Guardar (Tab 2 - Datos Adicionales)', this.adicionalForm.value);
        break;
      case 2:
        if (this.preciosForm.invalid) return;
        console.log('Guardar (Tab 3 - Precios/Costos)', this.preciosForm.getRawValue());
        break;
      default:
        console.log('Guardar (Tab 4 - Estructura y Stock)');
        break;
    }
  }

  onImprimir(): void { window.print(); }
  onAdjuntar(): void { history.back(); }

  // TrackBy para *ngFor
  trackByValue = (_: number, v: string) => v;
}
