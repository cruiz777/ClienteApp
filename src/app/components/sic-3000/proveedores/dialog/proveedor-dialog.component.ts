import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

interface DialogData {
  modo: 'crear' | 'editar';
  tipo?: 'nacional' | 'internacional';
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
  formContactos!: FormGroup;

  // Data
  modo: 'crear' | 'editar';
  tipoProveedor: 'nacional' | 'internacional';
  titulo: string = '';

  // Opciones para selects
  paises: string[] = ['Ecuador', 'Colombia', 'Perú', 'Chile', 'Argentina', 'Brasil', 'México', 'Estados Unidos'];
  ciudadesEcuador: string[] = ['Quito', 'Guayaquil', 'Cuenca', 'Ambato', 'Manta', 'Santo Domingo', 'Machala', 'Portoviejo'];
  tiposContribuyente: string[] = ['Persona Natural', 'Persona Jurídica', 'RISE'];
  tiposProveedor: string[] = ['Productos', 'Servicios', 'Mixto'];
  tiposRetencion: string[] = ['1%', '2%', '8%', '10%'];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<ProveedorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.modo = data.modo;
    this.tipoProveedor = data.tipo || data.proveedor?.tipo || 'nacional';
    this.titulo = this.modo === 'crear' 
      ? `Nuevo Proveedor ${this.tipoProveedor === 'nacional' ? 'Nacional' : 'Internacional'}`
      : 'Editar Proveedor';
  }

  ngOnInit(): void {
    this.inicializarFormularios();
    
    if (this.modo === 'editar' && this.data.proveedor) {
      this.cargarDatosProveedor(this.data.proveedor);
    }
  }

  inicializarFormularios(): void {
    // Formulario de Datos Generales
    this.formGeneral = this.fb.group({
      codigo: ['', [Validators.required, Validators.maxLength(10)]],
      cedula: ['', [Validators.required, Validators.maxLength(13)]],
      razonSocial: ['', [Validators.required, Validators.maxLength(200)]],
      pais: ['Ecuador', Validators.required],
      ciudad: ['', Validators.required],
      nombreComercial: ['', [Validators.maxLength(200)]],
      direccion: ['', [Validators.required, Validators.maxLength(300)]],
      numeroDireccion: ['', [Validators.maxLength(20)]],
      telefono1: ['', [Validators.maxLength(15)]],
      telefono2: ['', [Validators.maxLength(15)]],
      email: ['', [Validators.email, Validators.maxLength(100)]],
      tipoProveedor: ['', Validators.required],
      telefono3: ['', [Validators.maxLength(15)]],
      tipoContribuyente: ['', Validators.required],
      retencion: [''],
      pagaIva: [false],
      noActualizarCostos: [false]
    });

    // Formulario de Datos Adicionales
    this.formAdicional = this.fb.group({
      contactoPrincipal: ['', [Validators.maxLength(100)]],
      telefonoContacto: ['', [Validators.maxLength(15)]],
      emailContacto: ['', [Validators.email, Validators.maxLength(100)]],
      sitioWeb: ['', [Validators.maxLength(200)]],
      diasCredito: [0, [Validators.min(0), Validators.max(365)]],
      limiteCredito: [0, [Validators.min(0)]],
      observaciones: ['', [Validators.maxLength(500)]],
      activo: [true]
    });

    // Formulario de Contactos
    this.formContactos = this.fb.group({
      nombreContacto: ['', [Validators.maxLength(100)]],
      cargoContacto: ['', [Validators.maxLength(50)]],
      telefonoContacto: ['', [Validators.maxLength(15)]],
      emailContacto: ['', [Validators.email, Validators.maxLength(100)]],
      notas: ['', [Validators.maxLength(300)]]
    });

    // Si es modo edición, deshabilitar el código
    if (this.modo === 'editar') {
      this.formGeneral.get('codigo')?.disable();
    }
  }

  cargarDatosProveedor(proveedor: any): void {
    // Cargar datos en el formulario general
    this.formGeneral.patchValue({
      codigo: proveedor.codigo,
      cedula: proveedor.cedula || proveedor.ruc,
      razonSocial: proveedor.nombre,
      pais: proveedor.pais,
      ciudad: proveedor.ciudad,
      direccion: proveedor.direccion
      // ... otros campos según tu estructura de datos
    });
  }

  cambiarTab(tab: string): void {
    this.activeTab = tab;
  }

  onPaisChange(): void {
    const paisSeleccionado = this.formGeneral.get('pais')?.value;
    this.formGeneral.get('ciudad')?.setValue('');
    
    // Aquí podrías cargar las ciudades según el país seleccionado
    // Por ahora solo muestra ciudades de Ecuador
  }

  guardar(): void {
    // Marcar todos los formularios como touched para mostrar errores
    Object.values(this.formGeneral.controls).forEach(control => control.markAsTouched());
    Object.values(this.formAdicional.controls).forEach(control => control.markAsTouched());
    Object.values(this.formContactos.controls).forEach(control => control.markAsTouched());

    // Validar que al menos el formulario general esté completo
    if (this.formGeneral.invalid) {
      this.activeTab = 'general';
      return;
    }

    const datosProveedor = {
      ...this.formGeneral.getRawValue(), // getRawValue() incluye campos deshabilitados
      ...this.formAdicional.value,
      ...this.formContactos.value,
      tipo: this.tipoProveedor
    };

    console.log('Datos a guardar:', datosProveedor);
    this.dialogRef.close(datosProveedor);
  }

  cancelar(): void {
    if (this.formGeneral.dirty || this.formAdicional.dirty || this.formContactos.dirty) {
      if (confirm('¿Está seguro de cancelar? Los cambios no guardados se perderán.')) {
        this.dialogRef.close();
      }
    } else {
      this.dialogRef.close();
    }
  }

  // Validación de campos
  getErrorMessage(formGroup: FormGroup, fieldName: string): string {
    const control = formGroup.get(fieldName);
    
    if (!control) return '';
    
    if (control.hasError('required')) {
      return 'Este campo es requerido';
    }
    if (control.hasError('email')) {
      return 'Email inválido';
    }
    if (control.hasError('maxlength')) {
      const maxLength = control.errors?.['maxlength'].requiredLength;
      return `Máximo ${maxLength} caracteres`;
    }
    if (control.hasError('min')) {
      return `Valor mínimo: ${control.errors?.['min'].min}`;
    }
    if (control.hasError('max')) {
      return `Valor máximo: ${control.errors?.['max'].max}`;
    }
    
    return '';
  }
}