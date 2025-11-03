import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';

// Tus servicios existentes
import { CiudadService} from 'src/app/services/ciudad.service';
import { PaisService, Pais } from 'src/app/services/pais.service';
import { TipoProveedorService } from 'src/app/services/tipo-proveedor.service';
import { ProveedorService } from 'src/app/services/proveedor.service';
import { CiudadResumen } from 'src/app/interfaces/responses/ciudad-response';
import { TipoContribuyenteService } from 'src/app/services/tipo-contribuyente.service';
import { PlanCuentaService } from 'src/app/services/plan-cuenta.service';
import { TipoRetencionResponse, TipoRetencionService } from 'src/app/services/tipo-retencion.service';

interface DialogData {
  modo: 'crear' | 'editar';
  tipoProveedor?: any; // TipoProveedorResponse
  proveedor?: any;
}

@Component({
  selector: 'app-proveedor-dialog',
  templateUrl: './proveedor-dialog.component.html',
  styleUrls: ['./proveedor-dialog.component.css']
})
export class ProveedorDialogComponent implements OnInit {
  // Pestañas
  activeTab: string = 'general';
  
  // Formularios
  formGeneral!: FormGroup;
  formAdicional!: FormGroup;
  formContacto!: FormGroup; // Formulario individual para contacto
  
  // Data
  modo: 'crear' | 'editar';
  tipoProveedorSeleccionado: any;
  titulo: string = '';
  
  // Arrays para combos
  paises: Pais[] = [];
  ciudades: CiudadResumen[] = [];
  tiposProveedor: any[] = [];
  tiposContribuyente: any[] = [];
  planesCuenta: any[] = [];
  
  // Contactos
  contactos: any[] = [];
  mostrarFormContacto: boolean = false;
  editandoContacto: number = -1;
  tiposRetencion: TipoRetencionResponse[] = [];
  codigosRetencionFuente: TipoRetencionResponse[] = [];
  codigosRetencionIVA: TipoRetencionResponse[] = [];
  // Loading states
  isLoadingCombos: boolean = false;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<ProveedorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private paisService: PaisService,
    private ciudadService: CiudadService,
    private tipoProveedorService: TipoProveedorService,
    private proveedorService: ProveedorService,
    private tipoContribuyenteService: TipoContribuyenteService,
    private planCuentaService: PlanCuentaService,
    private tipoRetencionService: TipoRetencionService
  ) {
    this.modo = data.modo;
    this.tipoProveedorSeleccionado = data.tipoProveedor;
    this.titulo = this.modo === 'crear' 
      ? `Nuevo Proveedor ${this.tipoProveedorSeleccionado?.nombre_tipo || ''}`
      : 'Editar Proveedor';
  }

  ngOnInit(): void {
    this.cargarCombos();
    this.inicializarFormularios();
    
    if (this.modo === 'editar' && this.data.proveedor) {
      this.cargarDatosProveedor(this.data.proveedor);
    }
  }

  cargarCombos(): void {
    this.isLoadingCombos = true;
    
    forkJoin({
      paises: this.paisService.obtenerPaises(),
      ciudades: this.ciudadService.getCiudades(),
      tiposProveedor: this.tipoProveedorService.getAll(),
      tiposContribuyente: this.tipoContribuyenteService.getAll(),
      planesCuenta: this.planCuentaService.getAll(),
      tiposRetencion: this.tipoRetencionService.getAll()
    }).subscribe({
      next: (responses) => {
        this.paises = responses.paises;
        this.ciudades = responses.ciudades;
        
        // ✅ CORREGIR: Verificar si viene envuelto en data o directamente
        this.tiposProveedor = responses.tiposProveedor.data || responses.tiposProveedor;
        this.tiposContribuyente = responses.tiposContribuyente.data || responses.tiposContribuyente;
        this.planesCuenta = responses.planesCuenta.data || responses.planesCuenta;
        // ✅ CARGAR RETENCIONES
        this.tiposRetencion = responses.tiposRetencion.data || responses.tiposRetencion;
      
        // Filtrar por tipo
        this.codigosRetencionFuente = this.tiposRetencion.filter(ret => ret.codigo_tipo_ret.startsWith('3'));
        this.codigosRetencionIVA = this.tiposRetencion.filter(ret => ret.codigo_tipo_ret.startsWith('7'));
      
        console.log('Tipos Proveedor:', this.tiposProveedor);
        console.log('Tipos Contribuyente:', this.tiposContribuyente);
        console.log('Planes Cuenta:', this.planesCuenta);
        
        this.isLoadingCombos = false;
      },
      error: (error) => {
        console.error('Error cargando combos:', error);
        this.isLoadingCombos = false;
      }
    });
  }

  inicializarFormularios(): void {
    const esInternacional = this.tipoProveedorSeleccionado?.nombre_tipo === 'INTERNACIONAL';
    
    // FORMULARIO GENERAL
    this.formGeneral = this.fb.group({
      codigo_proveedor: [{ value: '', disabled: this.modo === 'editar' }],
      ruc_prov: ['', esInternacional ? [] : [Validators.required]],
      nombre_prov: ['', [Validators.required]],
      nombre_comercial: [''],
      id_tipo_proveedor: [this.tipoProveedorSeleccionado?.id_tipo_proveedor || '', [Validators.required]],
      id_tipo_contribuyente: ['', esInternacional ? [] : [Validators.required]],
      web_proveedor: [''],
      id_ciudad: ['', [Validators.required]],
      direccion_prov: ['', [Validators.required]],
      codigo_postal: [''],
      telefono_prov: [''],
      tel1_prov: [''],
      tel2_prov: [''],
      email_prov: ['', [Validators.email]]
    });

    // FORMULARIO ADICIONAL
    this.formAdicional = this.fb.group({
      tiempo_entrega: [0, [Validators.min(0)]],
      plazo_pago: [0, [Validators.min(0)]],
      no_cambiar_costo_producto: [false],
      id_plan_cuenta: [''],
      // Retenciones
      porcentaje_retencion_fb: [null, [Validators.min(0), Validators.max(100)]],
      codigo_retencion_fb: [''],
      porcentaje_retencion_fs: [null, [Validators.min(0), Validators.max(100)]],
      codigo_retencion_fs: [''],
      porcentaje_retencion_ib: [null, [Validators.min(0), Validators.max(100)]],
      codigo_retencion_ib: [''],
      porcentaje_retencion_is: [null, [Validators.min(0), Validators.max(100)]],
      codigo_retencion_is: [''],
      observaciones: ['']
    });

    // FORMULARIO CONTACTO INDIVIDUAL
    this.formContacto = this.fb.group({
      nombre_contacto: ['', [Validators.required]],
      cargo: [''],
      departamento: [''],
      telefono: [''],
      telefono_movil: [''],
      email: ['', [Validators.email]],
      extension: [''],
      tipo_contacto: [''],
      es_principal: [false],
      observaciones: ['']
    });
  }

  // === GESTIÓN DE CONTACTOS ===
  agregarContacto(): void {
    this.editandoContacto = -1;
    this.formContacto.reset();
    this.formContacto.patchValue({ es_principal: false });
    this.mostrarFormContacto = true;
  }

  editarContacto(index: number): void {
    this.editandoContacto = index;
    this.formContacto.patchValue(this.contactos[index]);
    this.mostrarFormContacto = true;
  }

  guardarContacto(): void {
    if (this.formContacto.invalid) {
      Object.values(this.formContacto.controls).forEach(control => control.markAsTouched());
      return;
    }

    const contactoData = this.formContacto.value;
    
    // Si marca como principal, desmarcar otros
    if (contactoData.es_principal) {
      this.contactos.forEach(c => c.es_principal = false);
    }

    if (this.editandoContacto >= 0) {
      // Editar existente
      this.contactos[this.editandoContacto] = contactoData;
    } else {
      // Agregar nuevo
      this.contactos.push(contactoData);
    }

    this.cancelarContacto();
  }

  eliminarContacto(index: number): void {
    if (confirm('¿Está seguro de eliminar este contacto?')) {
      this.contactos.splice(index, 1);
    }
  }

  cancelarContacto(): void {
    this.mostrarFormContacto = false;
    this.editandoContacto = -1;
    this.formContacto.reset();
  }

  // === NAVEGACIÓN DE PESTAÑAS ===
  cambiarTab(tab: string): void {
    this.activeTab = tab;
  }

  // === VALIDACIÓN Y GUARDADO ===
  guardar(): void {
    // Marcar todos los campos como touched
    Object.values(this.formGeneral.controls).forEach(control => control.markAsTouched());
    Object.values(this.formAdicional.controls).forEach(control => control.markAsTouched());

    // Validar formulario principal
    if (this.formGeneral.invalid) {
      this.activeTab = 'general';
      return;
    }

    // Construir objeto para enviar
    const formData = {
      ...this.formGeneral.getRawValue(), // incluye campos deshabilitados
      ...this.formAdicional.value,
      contactos: this.contactos
    };

    //LIMPIAR CAMPOS VACÍOS ANTES DE ENVIAR
    const proveedorData = {
      ...formData,
      // Limpiar códigos de retención vacíos
      codigo_retencion_fb: formData.codigo_retencion_fb || null,
      codigo_retencion_fs: formData.codigo_retencion_fs || null,
      codigo_retencion_ib: formData.codigo_retencion_ib || null,
      codigo_retencion_is: formData.codigo_retencion_is || null,
      
      // Limpiar otros campos opcionales
      id_plan_cuenta: formData.id_plan_cuenta || null,
      codigo_postal: formData.codigo_postal || null,
      tel1_prov: formData.tel1_prov || null,
      tel2_prov: formData.tel2_prov || null,
      email_prov: formData.email_prov || null,
      observaciones: formData.observaciones || null
    };

    console.log('Datos a guardar:', proveedorData);
    
    if (this.modo === 'crear') {
      this.proveedorService.create(proveedorData).subscribe({
        next: (response) => {
          console.log('Proveedor creado:', response);
          this.dialogRef.close(response);
        },
        error: (error) => {
          console.error('Error creando proveedor:', error);
        }
      });
    } else {
      // Modo editar - necesitarías el ID del proveedor
      const id = this.data.proveedor?.id_proveedor;
      this.proveedorService.update(id, proveedorData).subscribe({
        next: (response) => {
          console.log('Proveedor actualizado:', response);
          this.dialogRef.close(response);
        },
        error: (error) => {
          console.error('Error actualizando proveedor:', error);
        }
      });
    }
  }

  cancelar(): void {
    const formularioSucio = this.formGeneral.dirty || this.formAdicional.dirty || this.contactos.length > 0;
    
    if (formularioSucio) {
      if (confirm('¿Está seguro de cancelar? Los cambios no guardados se perderán.')) {
        this.dialogRef.close();
      }
    } else {
      this.dialogRef.close();
    }
  }

  cargarDatosProveedor(proveedor: any): void {
    // Cargar datos en formulario general
    this.formGeneral.patchValue({
      codigo_proveedor: proveedor.codigo_proveedor,
      ruc_prov: proveedor.ruc_prov,
      nombre_prov: proveedor.nombre_prov,
      nombre_comercial: proveedor.nombre_comercial,
      id_tipo_proveedor: proveedor.id_tipo_proveedor, // ✅ Usar el ID
      id_tipo_contribuyente: proveedor.id_tipo_contribuyente, // ✅ Usar el ID
      web_proveedor: proveedor.web_proveedor,
      id_ciudad: proveedor.id_ciudad,
      direccion_prov: proveedor.direccion_prov,
      codigo_postal: proveedor.codigo_postal,
      telefono_prov: proveedor.telefono_prov,
      tel1_prov: proveedor.tel1_prov,
      tel2_prov: proveedor.tel2_prov,
      email_prov: proveedor.email_prov
    });

    // Cargar datos adicionales
    this.formAdicional.patchValue({
      tiempo_entrega: proveedor.tiempo_entrega,
      plazo_pago: proveedor.plazo_pago,
      no_cambiar_costo_producto: proveedor.no_cambiar_costo_producto,
      id_plan_cuenta: proveedor.id_plan_cuenta, // ✅ Usar el ID
      // ✅ CÓDIGOS DE RETENCIÓN
      porcentaje_retencion_fb: proveedor.porcentaje_retencion_fb,
      codigo_retencion_fb: proveedor.codigo_retencion_fb,
      porcentaje_retencion_fs: proveedor.porcentaje_retencion_fs,
      codigo_retencion_fs: proveedor.codigo_retencion_fs,
      porcentaje_retencion_ib: proveedor.porcentaje_retencion_ib,
      codigo_retencion_ib: proveedor.codigo_retencion_ib,
      porcentaje_retencion_is: proveedor.porcentaje_retencion_is,
      codigo_retencion_is: proveedor.codigo_retencion_is,
      observaciones: proveedor.observaciones
    });

    // ✅ Cargar contactos existentes
    this.contactos = proveedor.contactos || [];
  }

  // Método helper para errores
  getErrorMessage(formGroup: FormGroup, fieldName: string): string {
    const control = formGroup.get(fieldName);
    if (!control || !control.errors) return '';
    
    if (control.hasError('required')) return 'Este campo es requerido';
    if (control.hasError('email')) return 'Email inválido';
    if (control.hasError('min')) return `Valor mínimo: ${control.errors?.['min'].min}`;
    if (control.hasError('max')) return `Valor máximo: ${control.errors?.['max'].max}`;
    
    return '';
  }
}