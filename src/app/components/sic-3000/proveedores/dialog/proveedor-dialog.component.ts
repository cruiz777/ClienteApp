import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
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
import { ConsultaSriService } from 'src/app/services/consultas.service';
import { CustomMessageBoxComponent } from 'src/app/components/utils/messages/custom-message-box.component';
import { UsuarioService } from 'src/app/services/usuario.service';

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
  
  //Validar internacional
  esInternacional: boolean = false;
  nombreTipoProveedor: string = '';

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
    private tipoRetencionService: TipoRetencionService,
    private consultaSriService: ConsultaSriService,
    private usuarioService: UsuarioService,
    private dialog: MatDialog 
  ) {
    this.modo = data.modo;
    this.tipoProveedorSeleccionado = data.tipoProveedor;
    this.titulo = this.modo === 'crear' 
      ? `Nuevo Proveedor ${this.tipoProveedorSeleccionado?.nombre_tipo || ''}`
      : 'Editar Proveedor';
  }

  ngOnInit(): void {
    
    this.esInternacional = this.tipoProveedorSeleccionado?.descripcion === 'INTERNACIONAL';
    this.nombreTipoProveedor = this.tipoProveedorSeleccionado?.descripcion || 
                              this.tipoProveedorSeleccionado?.nombre_tipo || '';
  
    
    this.inicializarFormularios();
    this.configurarListenersRetenciones(); 
    this.cargarCombos();
    if (this.modo === 'editar' && this.data.proveedor) {
      this.cargarDatosProveedor(this.data.proveedor);
    }
  }
  configurarListenersRetenciones(): void {
    // Listener para Retención Fuente - Bienes
    this.formAdicional.get('codigo_retencion_fb')?.valueChanges.subscribe(codigo => {
      if (codigo) {
        const retencion = this.tiposRetencion.find(r => r.codigo_tipo_ret === codigo);
        if (retencion) {
          this.formAdicional.patchValue(
            { porcentaje_retencion_fb: retencion.porcentaje },
            { emitEvent: false } // No emitir evento para evitar loops
          );
        }
      }
    });

    // Listener para Retención Fuente - Servicios
    this.formAdicional.get('codigo_retencion_fs')?.valueChanges.subscribe(codigo => {
      if (codigo) {
        const retencion = this.tiposRetencion.find(r => r.codigo_tipo_ret === codigo);
        if (retencion) {
          this.formAdicional.patchValue(
            { porcentaje_retencion_fs: retencion.porcentaje },
            { emitEvent: false }
          );
        }
      }
    });

    // Listener para Retención IVA - Bienes
    this.formAdicional.get('codigo_retencion_ib')?.valueChanges.subscribe(codigo => {
      if (codigo) {
        const retencion = this.tiposRetencion.find(r => r.codigo_tipo_ret === codigo);
        if (retencion) {
          this.formAdicional.patchValue(
            { porcentaje_retencion_ib: retencion.porcentaje },
            { emitEvent: false }
          );
        }
      }
    });

    // Listener para Retención IVA - Servicios
    this.formAdicional.get('codigo_retencion_is')?.valueChanges.subscribe(codigo => {
      if (codigo) {
        const retencion = this.tiposRetencion.find(r => r.codigo_tipo_ret === codigo);
        if (retencion) {
          this.formAdicional.patchValue(
            { porcentaje_retencion_is: retencion.porcentaje },
            { emitEvent: false }
          );
        }
      }
    });
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
        
        this.tiposProveedor = responses.tiposProveedor.data || responses.tiposProveedor;
        this.tiposContribuyente = responses.tiposContribuyente.data || responses.tiposContribuyente;
        console.log('🔍 RAW planesCuenta del backend:', responses.planesCuenta.data || responses.planesCuenta);
      
        this.planesCuenta = responses.planesCuenta.data || responses.planesCuenta;

        // CARGAR RETENCIONES
        this.tiposRetencion = responses.tiposRetencion.data || responses.tiposRetencion;
      
        // Filtrar por tipo
        this.codigosRetencionFuente = this.tiposRetencion.filter(ret => ret.codigo_tipo_ret.startsWith('3'));
        this.codigosRetencionIVA = this.tiposRetencion.filter(ret => ret.codigo_tipo_ret.startsWith('7'));
      
        console.log('Tipos Proveedor:', this.tiposProveedor);
        console.log('Tipos Contribuyente:', this.tiposContribuyente);
        console.log('Planes Cuenta:', this.planesCuenta);
        
        this.isLoadingCombos = false;
        if (this.esInternacional && this.modo === 'crear') {
          this.asignarTipoContribuyenteNoAplica();
        }
      },
      error: (error) => {
        console.error('Error cargando combos:', error);
        this.isLoadingCombos = false;
      }
    });
  }

  inicializarFormularios(): void {
    // FORMULARIO GENERAL
    this.formGeneral = this.fb.group({
      codigo_proveedor: [{ value: '', disabled: this.modo === 'editar' }],
      ruc_prov: ['', this.esInternacional ? [] : [Validators.required]],  
      nombre_prov: ['', [Validators.required]],
      nombre_comercial: [''],
      id_tipo_proveedor: [this.tipoProveedorSeleccionado?.id_tipo_proveedor || '', [Validators.required]],
      id_tipo_contribuyente: ['', this.esInternacional ? [] : [Validators.required]],
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
      id_plan_cuentas: null,
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
    const usuarioActual = this.usuarioService.getUsuarioActual();

    // Validar formulario principal
    if (this.formGeneral.invalid) {
      this.activeTab = 'general';
      
      // ✅ MOSTRAR ERROR DE VALIDACIÓN
      this.dialog.open(CustomMessageBoxComponent, {
        width: '350px',
        data: {
          title: 'Formulario Incompleto',
          message: 'Por favor complete todos los campos requeridos en la pestaña "Datos Generales".',
          type: 'warning',
          showCancel: false,
          confirmText: 'Entendido'
        }
      });
      return;
    }
    if (!usuarioActual) {
      this.dialog.open(CustomMessageBoxComponent, {
        width: '350px',
        data: {
          title: 'Error de Sesión',
          message: 'No se pudo obtener el usuario actual. Por favor inicie sesión nuevamente.',
          type: 'error',
          showCancel: false,
          confirmText: 'Entendido'
        }
      });
      return;
    }

    // Construir objeto para enviar
    const formData = {
      ...this.formGeneral.getRawValue(),
      ...this.formAdicional.value,
      contactos: this.contactos
    };

    const proveedorData = {
      ...formData,
      codigo_retencion_fb: formData.codigo_retencion_fb || null,
      codigo_retencion_fs: formData.codigo_retencion_fs || null,
      codigo_retencion_ib: formData.codigo_retencion_ib || null,
      codigo_retencion_is: formData.codigo_retencion_is || null,
      id_plan_cuenta: formData.id_plan_cuentas || null,
      codigo_postal: formData.codigo_postal || null,
      tel1_prov: formData.tel1_prov || null,
      tel2_prov: formData.tel2_prov || null,
      email_prov: formData.email_prov || null,
      observaciones: formData.observaciones || null,
      usuario_creacion: this.modo === 'crear' ? usuarioActual.id_usuario : undefined,
      usuario_modificacion: this.modo === 'editar' ? usuarioActual.id_usuario : undefined
    };

    console.log('📤 Datos a guardar:', proveedorData);
    
    // ✅ MOSTRAR LOADING
    const loadingDialog = this.dialog.open(CustomMessageBoxComponent, {
      width: '350px',
      disableClose: true,
      data: {
        title: this.modo === 'crear' ? 'Creando Proveedor' : 'Actualizando Proveedor',
        message: 'Por favor espere mientras procesamos la información...',
        type: 'info',
        isLoading: true,
        loadingText: this.modo === 'crear' ? 'Creando...' : 'Actualizando...'
      }
    });
    
    if (this.modo === 'crear') {
      this.proveedorService.create(proveedorData).subscribe({
        next: (response) => {
          console.log('✅ Proveedor creado:', response);
          
          // ✅ CERRAR LOADING
          loadingDialog.close();
          
          // ✅ MOSTRAR ÉXITO
          const successDialog = this.dialog.open(CustomMessageBoxComponent, {
            width: '350px',
            data: {
              title: 'Éxito',
              message: 'El proveedor ha sido creado correctamente.',
              type: 'success',
              showCancel: false,
              confirmText: 'Aceptar'
            }
          });
          
          successDialog.afterClosed().subscribe(() => {
            this.dialogRef.close(response);
          });
        },
        error: (error) => {
          console.error('❌ Error creando proveedor:', error);
          
          // ✅ CERRAR LOADING Y MOSTRAR ERROR
          loadingDialog.close();
          
          this.dialog.open(CustomMessageBoxComponent, {
            width: '350px',
            data: {
              title: 'Error',
              message: error.error?.message || 'No se pudo crear el proveedor. Por favor intente nuevamente.',
              type: 'error',
              showCancel: false,
              confirmText: 'Entendido'
            }
          });
        }
      });
    } else {
      const id = this.data.proveedor?.id_proveedor;
      this.proveedorService.update(id, proveedorData).subscribe({
        next: (response) => {
          console.log('✅ Proveedor actualizado:', response);
          
          // ✅ CERRAR LOADING
          loadingDialog.close();
          
          // ✅ MOSTRAR ÉXITO
          const successDialog = this.dialog.open(CustomMessageBoxComponent, {
            width: '350px',
            data: {
              title: 'Éxito',
              message: 'El proveedor ha sido actualizado correctamente.',
              type: 'success',
              showCancel: false,
              confirmText: 'Aceptar'
            }
          });
          
          successDialog.afterClosed().subscribe(() => {
            this.dialogRef.close(response);
          });
        },
        error: (error) => {
          console.error('❌ Error actualizando proveedor:', error);
          
          // ✅ CERRAR LOADING Y MOSTRAR ERROR
          loadingDialog.close();
          
          this.dialog.open(CustomMessageBoxComponent, {
            width: '350px',
            data: {
              title: 'Error',
              message: error.error?.message || 'No se pudo actualizar el proveedor. Por favor intente nuevamente.',
              type: 'error',
              showCancel: false,
              confirmText: 'Entendido'
            }
          });
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
      if (this.isLoadingCombos) {
      // Si aún se están cargando, esperar un momento y reintentar
      setTimeout(() => this.cargarDatosProveedor(proveedor), 100);
      return;
    }
    const tipoProveedor = this.tiposProveedor.find(t => t.id_tipo_proveedor === proveedor.id_tipo_proveedor);
    if (tipoProveedor) {
      this.esInternacional = tipoProveedor.nombre_tipo === 'INTERNACIONAL';
      this.nombreTipoProveedor = tipoProveedor.descripcion || tipoProveedor.nombre_tipo;
    }
    
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
      id_plan_cuentas: proveedor.id_plan_cuenta,
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
  compararPlanCuenta(valor1: any, valor2: any): boolean {
    // Comparar convirtiendo ambos a number por si acaso
    return Number(valor1) === Number(valor2);
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

  //CONSULTAS A APIS
  consultarDocumento(): void {
    // Solo para proveedores NO internacionales
    if (this.esInternacional) return;
    
    const documento = this.formGeneral.get('ruc_prov')?.value?.trim();
    
    if (!documento && !this.esInternacional) {
      // ✅ MENSAJE: Campo vacío
      this.dialog.open(CustomMessageBoxComponent, {
        width: '350px',
        data: {
          title: 'Campo Requerido',
          message: 'Por favor ingrese un RUC o cédula para realizar la consulta.',
          type: 'warning',
          showCancel: false,
          confirmText: 'Entendido'
        }
      });
      return;
    }
    
    // Determinar si es cédula (10) o RUC (13)
    if (documento.length === 10) {
      this.consultarCedula(documento);
    } else if (documento.length === 13) {
      this.consultarRuc(documento);
    } else {
      // ✅ MENSAJE: Longitud inválida
      this.dialog.open(CustomMessageBoxComponent, {
        width: '350px',
        data: {
          title: 'Documento Inválido',
          message: 'El documento debe tener 10 dígitos (cédula) o 13 dígitos (RUC).',
          type: 'warning',
          showCancel: false,
          confirmText: 'Entendido'
        }
      });
    }
  }


  private consultarRuc(ruc: string): void {
    console.log('🔍 Consultando RUC:', ruc);
    
    // ✅ MOSTRAR LOADING
    const loadingDialog = this.dialog.open(CustomMessageBoxComponent, {
      width: '350px',
      disableClose: true,
      data: {
        title: 'Consultando RUC',
        message: 'Obteniendo información del SRI...',
        type: 'info',
        isLoading: true,
        loadingText: 'Por favor espere'
      }
    });
    
    this.consultaSriService.consultarRuc(ruc).subscribe({
      next: (response) => {
        // ✅ CERRAR LOADING
        loadingDialog.close();
        
        if (response.ok && response.consulta && response.consulta.length > 0) {
          const data = response.consulta[0];
          
          console.log('✅ Datos RUC obtenidos:', data);
          
          // Autocompletar solo campos básicos
          this.formGeneral.patchValue({
            nombre_prov: data.razonSocial || '',
          });
          
          // Buscar tipo contribuyente por nombre
          this.buscarTipoContribuyente(data.tipoContribuyente);
          
          // ✅ MENSAJE: Éxito
          this.dialog.open(CustomMessageBoxComponent, {
            width: '350px',
            data: {
              title: 'Datos Obtenidos',
              message: 'La información del RUC ha sido cargada correctamente.',
              type: 'success',
              showCancel: false,
              confirmText: 'Aceptar'
            }
          });
        } else {
          // ✅ MENSAJE: No se encontró información
          this.dialog.open(CustomMessageBoxComponent, {
            width: '350px',
            data: {
              title: 'RUC No Encontrado',
              message: 'No se encontró información para el RUC ingresado en el SRI.',
              type: 'warning',
              showCancel: false,
              confirmText: 'Entendido'
            }
          });
        }
      },
      error: (error) => {
        console.error('❌ Error consultando RUC:', error);
        
        // ✅ CERRAR LOADING Y MOSTRAR ERROR
        loadingDialog.close();
        
        this.dialog.open(CustomMessageBoxComponent, {
          width: '350px',
          data: {
            title: 'Error de Conexión',
            message: 'No se pudo conectar con el servicio del SRI para consultar el RUC. Por favor verifique su conexión a internet o intente más tarde.',
            type: 'error',
            showCancel: false,
            confirmText: 'Entendido'
          }
        });
      }
    });
  }
  private buscarTipoContribuyente(tipoNombre: string): void {
    if (!tipoNombre) return;
    
    // Mapeo simple de nombres
    const mapeo: any = {
      'PERSONA NATURAL': 'PERSONAS NATURALES',
      'RISE': 'RISE',
      'ESPECIAL': 'ESPECIAL'
    };
    
    const nombreBuscar = mapeo[tipoNombre.toUpperCase()] || tipoNombre;
    
    const tipo = this.tiposContribuyente.find(t => 
      t.descripcion?.toUpperCase().includes(nombreBuscar.toUpperCase())
    );
    
    if (tipo) {
      this.formGeneral.patchValue({
        id_tipo_contribuyente: tipo.id_tipo_contribuyente
      });
    }
  }
  private consultarCedula(cedula: string): void {
    console.log('🔍 Consultando Cédula:', cedula);
    
    // ✅ MOSTRAR LOADING
    const loadingDialog = this.dialog.open(CustomMessageBoxComponent, {
      width: '350px',
      disableClose: true,
      data: {
        title: 'Consultando Cédula',
        message: 'Obteniendo información del registro civil...',
        type: 'info',
        isLoading: true,
        loadingText: 'Por favor espere'
      }
    });
    
    this.consultaSriService.consultarCedula(cedula).subscribe({
      next: (response) => {
        // ✅ CERRAR LOADING
        loadingDialog.close();
        
        if (response.ok && response.consulta) {
          const data = response.consulta;
          
          console.log('✅ Datos Cédula obtenidos:', data);
          
          // Construir dirección
          const direccion = `${data.calleDomicilio || ''} ${data.numeracionDomicilio || ''}`.trim();
          
          // Autocompletar solo campos básicos
          this.formGeneral.patchValue({
            nombre_prov: data.nombre || '',
            direccion_prov: direccion || ''
          });
          
          // ✅ MENSAJE: Éxito
          this.dialog.open(CustomMessageBoxComponent, {
            width: '350px',
            data: {
              title: 'Datos Obtenidos',
              message: 'La información de la cédula ha sido cargada correctamente.',
              type: 'success',
              showCancel: false,
              confirmText: 'Aceptar'
            }
          });
        } else {
          // ✅ MENSAJE: No se encontró información
          this.dialog.open(CustomMessageBoxComponent, {
            width: '350px',
            data: {
              title: 'Cédula No Encontrada',
              message: 'No se encontró información para la cédula ingresada.',
              type: 'warning',
              showCancel: false,
              confirmText: 'Entendido'
            }
          });
        }
      },
      error: (error) => {
        console.error('❌ Error consultando Cédula:', error);
        
        // ✅ CERRAR LOADING Y MOSTRAR ERROR
        loadingDialog.close();
        
        this.dialog.open(CustomMessageBoxComponent, {
          width: '350px',
          data: {
            title: 'Error de Conexión',
            message: 'No se pudo conectar con el servicio del registro civil para consultar la cédula. Por favor verifique su conexión a internet o intente más tarde.',
            type: 'error',
            showCancel: false,
            confirmText: 'Entendido'
          }
        });
      }
    });
  }
  // Metodo para asignar tipo de contribuyente cuando sea internacional
  asignarTipoContribuyenteNoAplica(): void {
    const noAplica = this.tiposContribuyente.find(t => 
      t.descripcion?.toUpperCase().includes('NO APLICA') ||
      t.descripcion?.toUpperCase().includes('INTERNACIONAL') ||
      t.descripcion?.toUpperCase() === 'N/A'
    );
    
    if (noAplica) {
      this.formGeneral.patchValue({
        id_tipo_contribuyente: noAplica.id_tipo_contribuyente
      });
      console.log('✅ Tipo contribuyente "NO APLICA" asignado:', noAplica.descripcion);
    } else {
      console.warn('⚠️ No se encontró tipo contribuyente "NO APLICA" en la base de datos');
    }
  }

}