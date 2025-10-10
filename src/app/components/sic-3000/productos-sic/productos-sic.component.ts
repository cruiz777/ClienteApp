import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RequiredFieldsToastService } from 'src/app/components/utils/messages/required-fields-toast.service';

import { ProductoRequest, sanitizeProductoPayload } from 'src/app/interfaces/requests/producto-request';
import { CreateProductoConEstructuraRequest } from 'src/app/interfaces/requests/create-producto-estructura-request';

import { ProductoService } from 'src/app/services/productos.service';
import { PresentacionService } from 'src/app/services/presentacion.service';
import { UniddaVentaService } from 'src/app/services/unidad-venta.service';
import { UnidadVentaResponse } from 'src/app/interfaces/responses/unidad-venta-response';
import { PresentacionResponse } from '../../../interfaces/responses/presentacion-response';

@Component({
  selector: 'app-productos-sic',
  templateUrl: './productos-sic.component.html',
  styleUrls: ['./productos-sic.component.css']
})
export class ProductosSicComponent implements OnInit, AfterViewInit {

  selectedTab = 0;
  idEstructura!: number;

  unidadesVenta: UnidadVentaResponse[] = [];
  tiposProducto = ['Bien', 'Servicio'];
  presentaciones: PresentacionResponse[] = [];
  clasesProducto = ['A', 'B', 'C'];

  iva = 0.12;

  form!: FormGroup;
  adicionalForm!: FormGroup;
  preciosForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private productoService: ProductoService,
    private presentacionService: PresentacionService,
    private unidadVentaService: UniddaVentaService,
    private route: ActivatedRoute,
    private toastCampos: RequiredFieldsToastService
  ) { }

  ngOnInit(): void {
    this.selectedTab = 0;
    this.cargarPresentacion();
    this.cargarUnidadesVenta();
    this.route.paramMap.subscribe(params => {
      this.idEstructura = Number(params.get('idEstructura')) || 0;
      const idProducto = Number(params.get('id_producto')) || 0;
      if (idProducto > 0) {
        this.cargarProducto(idProducto);
      }
    });

    this.form = this.fb.group({
      descripcion: ['', [Validators.required, Validators.maxLength(500)]],
      codigoInterno: ['', Validators.required],
      descripcion1: ['', [Validators.required, Validators.maxLength(500)]],
      unidadVenta: [null, Validators.required],
      existenciaGlobal: ['', Validators.required],
      abreviacion: ['', Validators.required],

      pagaIva: [false],
      productoEnVenta: [false],
      cargarInventarios: [false],
      productoConPeso: [false],
      consumoInterno: [false],

      codigoBarras: ['', Validators.required],
      generarCodigo: [false],
      descripcionPOS: ['', Validators.required],
      cantidad: [null],
      canCov: [''],
      referencia: [''],
      manejaDecimales: [false],
      psicotropico: [false],
      estupefaciente: [false],
      activo: [true],
      altoRiesgo: [false],

      tipoProducto: [null],
      presentacion: [null, Validators.required],
      claseProducto: [null],
      urlFoto: [''],

      fechaCreacion: [null],
      fechaModificacion: [null],
    });

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

    this.preciosForm = this.fb.group({
      precioOficial: [0],
      precioRedMsp: [0],
      pvpActualIva: [0, [Validators.min(0)]],
      pvpAnteriorMasIva: [0],
      fechaAnteriorModificarPrecio: [null],
      pvpActualMasIva: [0],
      fechaModificarPrecio: [null],
      margenUtilidad: [0],

      costoSuministro: [0],
      costoProducto: [0],
      costoPromedio: [0],
      precioCompraAnterior: [0],
      fechaAnteriorModificarCompra: [null],
      precioCompraActual: [0],
      fechaModificarCompra: [null],
      recepcionPorcentaje: [0]
    });

    this.preciosForm.get('pvpActualIva')!.valueChanges
      .subscribe(() => this.recalcularPvpConIva());
    this.preciosForm.get('costoProducto')!.valueChanges
      .subscribe(() => this.recalcularMargen());
    this.preciosForm.get('costoPromedio')!.valueChanges
      .subscribe(() => this.recalcularMargen());
    this.preciosForm.get('pvpActualMasIva')!.valueChanges
      .subscribe(() => this.recalcularMargen());
  }

  ngAfterViewInit(): void { this.cdr.detectChanges(); }

  isInvalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  cargarPresentacion(): void {
    this.presentacionService.getPresentacion().subscribe({
      next: (resp) => {
        this.presentaciones = resp.data;
      },
      error: () => {
        alert('Error al cargar presentaciones');
      }
    })
  }

  cargarUnidadesVenta(): void {
    this.unidadVentaService.getUnidadVenta().subscribe({
      next: (resp) => {
        this.unidadesVenta = resp.data;
      },
      error: () => {
        alert('Error al cargar unidades de venta')
      }
    })
  }

  get currentForm(): FormGroup | null {
    switch (this.selectedTab) {
      case 0: return this.form;
      case 1: return this.adicionalForm;
      case 2: return this.preciosForm;
      default: return null;
    }
  }
  get currentFormInvalid(): boolean { return !(this.currentForm && this.currentForm.valid); }

  private fix(n: number, d = 3): number {
    return Number((Math.round(n * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d));
  }

  onNumericInput(controlName: string): void {
    const ctrl = this.preciosForm.get(controlName);
    if (!ctrl) return;
    let val = (ctrl.value ?? '').toString();

    val = val.replace(',', '.').replace(/[^0-9.]/g, '');
    val = val.replace(/(\..*)\./g, '$1');

    ctrl.setValue(val, { emitEvent: false });
  }

  formatDecimal(controlName: string, dec = 3): void {
    const ctrl = this.preciosForm.get(controlName);
    if (!ctrl) return;

    const raw = (ctrl.value ?? '').toString().replace(',', '.');
    const n = parseFloat(raw);
    ctrl.setValue(this.fix(isFinite(n) ? n : 0, dec), { emitEvent: true });
  }

  recalcularPvpConIva(): void {
    const base = Number(this.preciosForm.getRawValue().pvpActualIva) || 0;
    const conIva = this.fix(base * (1 + this.iva), 3);

    const ctrlPvpConIva = this.preciosForm.get('pvpActualMasIva')!;
    const ctrlPvpAntIva = this.preciosForm.get('pvpAnteriorMasIva')!;

    if (!ctrlPvpConIva.dirty) {
      ctrlPvpConIva.setValue(conIva, { emitEvent: false });
    }
    if (!ctrlPvpAntIva.dirty) {
      const anterior = Number(ctrlPvpAntIva.value) || 0;
      if (anterior <= 0) {
        ctrlPvpAntIva.setValue(conIva, { emitEvent: false });
      }
    }
    this.recalcularMargen();
  }

  recalcularMargen(): void {
    const pvpConIva = Number(this.preciosForm.getRawValue().pvpActualMasIva) || 0;
    const costo = Number(this.preciosForm.getRawValue().costoProducto) || 0;
    const margen = pvpConIva > 0 ? ((pvpConIva - costo) / pvpConIva) * 100 : 0;

    const ctrlMargen = this.preciosForm.get('margenUtilidad')!;
    if (!ctrlMargen.dirty) {
      ctrlMargen.setValue(this.fix(margen, 3), { emitEvent: false });
    }
  }

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
    }
  }

  saving = false;

  private buildCreatePERequest(): any {
    const f1 = this.form.value;
    const f2 = this.adicionalForm.value;
    const f3 = this.preciosForm.getRawValue();

    const producto = sanitizeProductoPayload({
      despro: f1.descripcion1,
      despro2: f1.descripcionPOS,
      codbar: f1.codigoBarras,
      tippro: f1.tipoProducto === 'Bien' ? 'B' : (f1.tipoProducto === 'Servicio' ? 'S' : ''),
      uniman: this.unidadesVenta.find(u => u.idUnidadVenta === f1.unidadVenta)?.descripcion || '',
      abrevia: f1.abreviacion,
      referencia: f1.referencia,
      activo: f1.activo,
      pagaiva: f1.pagaIva,
      inv: f1.cargarInventarios,
      peso: f1.productoConPeso,
      pgasto: f2?.productoGasto ?? false,
      altoriesgo: f1.altoRiesgo,
      clasprod: f1.claseProducto,
      foto: f1.urlFoto,
      idempresa: 1,
      feccre: f1.fechaCreacion,
      fechamod: f1.fechaModificacion,

      colsab: f2.color,
      talla: f2.tamanoTalla1,
      obs: f2.observacion,
      regsanitario: f2.registroSanitario,
      codcuedeb: f2.ctaVentas,
      codcuehab: f2.ctaInventarios,
      codcuedes: f2.ctaCostos,
      codcuedev: f2.ctaDevolucion,
      ctaprodgasto: f2.ctaGastos,

      preven: f3.precioOficial,
      preven2: f3.precioRedMsp,
      pvpsiniva: f3.pvpActualIva,
      preanterior: f3.pvpAnteriorMasIva,
      feccosact: f3.fechaAnteriorModificarPrecio,
      fecpremod: f3.fechaModificarPrecio,
      margenutilidad: f3.margenUtilidad,
      costsuminis: f3.costoSuministro,
      cospro: f3.costoProducto,
      precos: f3.costoPromedio,
      cosanterior: f3.precioCompraAnterior,
      fecpreact: f3.fechaAnteriorModificarCompra,
      preuni: f3.precioCompraActual?.toString(),
      porcenrecepcion: f3.recepcionPorcentaje
    });

    return {
      Producto: producto,              // 👈 ahora con mayúscula
      Estructura: { idgrupo: this.idEstructura || null } // 👈 ahora con mayúscula
    };
  }


  onGrabar(): void {
    const controles = this.form.controls;
    const camposFaltantes: string[] = [];

    if (!controles['descripcion1'].value?.trim()) {
      camposFaltantes.push('Descripción');
      controles['descripcion1'].markAsTouched();
    }
    if (!controles['unidadVenta'].value) {
      camposFaltantes.push('Unidad de Venta');
      controles['unidadVenta'].markAsTouched();
    }
    if (!controles['existenciaGlobal'].value) {
      camposFaltantes.push('Existencia Global');
      controles['existenciaGlobal'].markAsTouched();
    }
    if (!controles['abreviacion'].value?.trim()) {
      camposFaltantes.push('Abreviación');
      controles['abreviacion'].markAsTouched();
    }
    if (!controles['descripcionPOS'].value?.trim()) {
      camposFaltantes.push('Descripción POS');
      controles['descripcionPOS'].markAsTouched();
    }
    if (!controles['presentacion'].value) {
      camposFaltantes.push('Presentación');
      controles['presentacion'].markAsTouched();
    }
    if (!controles['codigoInterno'].value) {
      camposFaltantes.push('Código Interno');
      controles['codigoInterno'].markAsTouched();
    }
    if (!controles['codigoBarras'].value) {
      camposFaltantes.push('Código de Barras');
      controles['codigoBarras'].markAsTouched();
    }

    if (camposFaltantes.length > 0) {
      this.toastCampos.mostrar(camposFaltantes);
      return;
    }

    if (this.selectedTab === 0 && this.form.invalid) {
      this.form.markAllAsTouched();
      this.selectedTab = 0;
      return;
    }
    if (this.selectedTab === 1 && this.adicionalForm.invalid) {
      this.adicionalForm.markAllAsTouched();
      this.selectedTab = 1;
      return;
    }
    if (this.selectedTab === 2 && this.preciosForm.invalid) {
      this.preciosForm.markAllAsTouched();
      this.selectedTab = 2;
      return;
    }

    this.saving = true;
    const request = this.buildCreatePERequest();

    // 👇 imprime request completo en consola
    console.log('📦 Request a enviar →', request);
    console.log('📦 JSON.stringify →', JSON.stringify(request, null, 2));

    this.productoService.createConEstructura(request).subscribe({
      next: (res) => {
        if (res?.type?.toUpperCase() === 'SUCCESS') {
          console.log('✅ Creado correctamente', res.data);
        } else {
          console.error('❌ Error lógica:', res?.message || res);
        }
      },
      error: (err) => console.error('❌ Error HTTP:', err),
      complete: () => (this.saving = false)
    });
  }

  cargarProducto(id: number): void {
    this.productoService.getById(id).subscribe({
      next: (res) => {
        const prod = res?.data;
        if (!prod) return;

        // ✅ Tab 1: datos generales
        this.form.patchValue({
          descripcion1: prod.despro,
          descripcionPOS: prod.despro2,
          codigoBarras: prod.codbar,
          tipoProducto: prod.tippro === 'B' ? 'Bien' : (prod.tippro === 'S' ? 'Servicio' : null),
          unidadVenta: this.unidadesVenta.find(u => u.descripcion === prod.uniman)?.idUnidadVenta || null,
          abreviacion: prod.abrevia,
          referencia: prod.referencia,
          activo: prod.activo,
          pagaIva: prod.pagaiva,
          cargarInventarios: prod.inv,
          productoConPeso: prod.peso,
          altoRiesgo: prod.altoriesgo,
          claseProducto: prod.clasprod,
          urlFoto: prod.foto,
          fechaCreacion: prod.feccre ? prod.feccre.substring(0, 10) : null,
          fechaModificacion: prod.fechamod ? prod.fechamod.substring(0, 10) : null,
        });

        // ✅ Tab 2: adicionales
        this.adicionalForm.patchValue({
          color: prod.colsab,
          tamanoTalla1: prod.talla,
          observacion: prod.obs,
          registroSanitario: prod.regsanitario,
          ctaVentas: prod.codcuedeb,
          ctaInventarios: prod.codcuehab,
          ctaCostos: prod.codcuedes,
          ctaDevolucion: prod.codcuedev,
          productoGasto: prod.pgasto,
          ctaGastos: prod.ctaprodgasto,
        });

        // ✅ Tab 3: precios / costos
        this.preciosForm.patchValue({
          precioOficial: prod.preven,
          precioRedMsp: prod.preven2,
          pvpActualIva: prod.pvpsiniva,
          pvpAnteriorMasIva: prod.preanterior,
          fechaAnteriorModificarPrecio: prod.feccosact,
          fechaModificarPrecio: prod.fecpremod,
          margenUtilidad: prod.margenutilidad,
          costoSuministro: prod.costsuminis,
          costoProducto: prod.cospro,
          costoPromedio: prod.precos,
          precioCompraAnterior: prod.cosanterior,
          fechaAnteriorModificarCompra: prod.fecpreact,
          precioCompraActual: prod.preuni,
          recepcionPorcentaje: prod.porcenrecepcion
        });
      },
      error: (err) => console.error('❌ Error cargando producto', err)
    });
  }

  onImprimir(): void { window.print(); }
  onAdjuntar(): void { history.back(); }

  trackByValue = (_: number, v: string) => v;
}
