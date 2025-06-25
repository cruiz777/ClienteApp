import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { Cliente } from 'src/app/interfaces/cliente';
import { ClienteSeleccionadoService } from 'src/app/services/cliente-seleccionado.service';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { Observable, of } from 'rxjs';

import { MatIconModule } from '@angular/material/icon';
import { Router, ActivatedRoute } from '@angular/router';

import { MatSnackBar } from '@angular/material/snack-bar';

import { Codigos14Service, Codigos14Request } from 'src/app/services/codigos14.service';

import { ChangeDetectorRef } from '@angular/core';
import { ClienteService, ClienteIndividual } from 'src/app/services/cliente.service';
import { UsuarioService } from 'src/app/services/usuario.service';
import { take } from 'rxjs/operators';
import { catchError } from 'rxjs/operators';
import { AgGridModule } from 'ag-grid-angular';
import { MatDatepickerModule } from '@angular/material/datepicker';
import * as moment from 'moment';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { LOCALE_ID } from '@angular/core';
registerLocaleData(localeEs);
import { Location } from '@angular/common';
import { CustomMessageBoxComponent } from 'src/app/util/messages/custom-message-box.component';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
export const MY_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY'
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY'
  }
};



@Component({
  selector: 'app-ul-edit',
  standalone: true,
  templateUrl: './ul-edit.component.html',
  styleUrl: './ul-edit.component.css'
,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatTableModule,
    MatSelectModule,
    MatIconModule,
    AgGridModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  providers: [
    { provide: LOCALE_ID, useValue: 'es' },
    { provide: MAT_DATE_LOCALE, useValue: 'es-ES' },
    { provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS }
  ]
})

export class UlEditComponent implements OnInit {
  formUV!: FormGroup;
  formUL!: FormGroup;

  clienteSeleccionado: Cliente | null = null;
  prefijos: any[] = [];
  gtinNacionalActivo = false;
  gtinInternacionalActivo = false;
  registrosGtin14: any[] = [];
  bandera: number = 0;
  npais: string = ''
  codigoprefijos: string = '';
  prefijo8: string = '';
  secuencia: number = 1;
  mensaje: string = '';
  serieEditable: boolean = false;
  campoGtin = false;
  campoGtinU = false;
  
  modoEdicion = false;
  botonGenerarDeshabilitado = false;
  botonGrabarDeshabilitado = true;
  botonIngresarULDeshabilitado = true;
  botonNuevoDeshabilitado = true;
  botonGenerarULDeshabilitado = true;
  botonGrabarULDeshabilitado = true;
  registroSeleccionado: any = null;

  idCodigos14: number = 0;

  longitudMaxima = 0;
  id_grupo_producto: number = 0;
  idProducto:number=0;
  idProductoDatosAdicionles:number=0;
  usuarioActual = this.usuarioService.getUsuarioActual();
  

  defaultColDef = {
    sortable: true,
    filter: true,
    resizable: true
  };
  constructor(
    private fb: FormBuilder,
    private clienteSeleccionadoService: ClienteSeleccionadoService,
    private router: Router,
    private _snackBar: MatSnackBar,
    private codigos14Service: Codigos14Service,
    private dialog: MatDialog,
    private cd: ChangeDetectorRef,
    private clienteService: ClienteService,
    private usuarioService: UsuarioService,
    private route: ActivatedRoute,
    private location: Location
  ) { }



  ngOnInit(): void {
    this.formUV = this.fb.group({
      codigoCliente: [''],
      cliente: [''],
      ruc: [''],
      gcp: [{ value: null, disabled: true }],
      gln: [''],
      activo: [false],
      gtinUv: [''],
      descripcion: [''],
      presentacion: [''],
      factor: [''],
     
      
      fecha: [moment()] ,
     
    });

    

    this.cargarCliente();
    this.cargarCodigo14();

    
   

    
  }

 




  cargarCliente(): void {
    const cliente = this.clienteSeleccionadoService.obtenerClienteActual();
    if (cliente) {
      this.clienteSeleccionado = cliente;
      this.formUV.patchValue({
        codigoCliente: cliente.clientes_codigo || '',
        cliente: cliente.nomcli || '',
        ruc: cliente.ruc || '',
      });
      this.cargarClientePorId(cliente.clientes_codigo);
      
    }
  }

  




  

  salir(): void {
     this.location.back(); // Retrocede a la ventana anterior
  }


 
  mostrarAlerta(mensaje: string, tipo: string) {
    this._snackBar.open(mensaje, tipo, {
      horizontalPosition: "end",
      verticalPosition: "top",
      duration: 3000
    });
  }
 

  permitirSoloNumeros(event: KeyboardEvent): void {
    const charCode = event.key;

    if (!/^[0-9]$/.test(charCode)) {
      event.preventDefault(); // bloquea la tecla
    }
  }

  

  
 


  validarNumeroDecimal(event: KeyboardEvent): void {
    const inputChar = event.key;
    const input = (event.target as HTMLInputElement).value;

    const esNumero = /^[0-9]$/.test(inputChar);
    const esPunto = inputChar === '.';

    // Permitir números
    if (esNumero) return;

    // Permitir solo un punto
    if (esPunto && !input.includes('.')) return;

    // Bloquear cualquier otro carácter o segundo punto
    event.preventDefault();
  }

  convertirAMayusculas(controlName: string): void {
    const control = this.formUV.get(controlName);
    if (control) {
      const valor = control.value || '';
      control.setValue(valor.toUpperCase());
    }
  }


  cargarClientePorId(id: number): void {

    console.log('🔍 ID recibido en cargarClientePorId:', id); // 👈 AÑADE ESTO

    this.clienteService.getClienteById(id).subscribe({
      next: (cliente) => {
        this.id_grupo_producto = cliente.idGrupoProducto;

       
      },
      error: (err) => {
        console.error('❌ Error al obtener cliente:', err);
      }
    });
  }


 
cargarCodigo14(): void {
  const g14 = this.route.snapshot.paramMap.get('g14');
  if (!g14) return;

  this.codigos14Service.obtenerPorG14(g14).pipe(take(1)).subscribe({
    next: (respuesta) => {
      if (!respuesta || respuesta.length === 0) {
        console.warn('⚠️ Código14 no encontrado para G14:', g14);
        return;
      }

      const codigo14 = respuesta[0]; // tomamos el primero
      console.log('✅ Código14 cargado:', codigo14);
      this.idCodigos14=codigo14.id_codigos14,
      this.formUV.patchValue({
        gtinUv:codigo14.g14 || '',
        descripcion: codigo14.descripcion || '',
        presentacion: codigo14.presentacion || 0,
        factor: codigo14.unidad || '',
        fecha: moment(codigo14.fecha, 'YYYY-MM-DD'),
        activo: codigo14.activo,
        gcp:codigo14.codpre
      });

      // Desactiva el botón de grabar si se está editando
      this.botonGrabarULDeshabilitado = true;
    },
    error: (err) => {
      console.error('❌ Error al cargar Código14 por G14:', err);
    }
  });
}

formatearFecha(fechaStr: string): string {
  const fecha = new Date(fechaStr);
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const anio = fecha.getFullYear();
  return `${dia}/${mes}/${anio}`;
}


 habilitarModificar()
 {
  this.botonGrabarDeshabilitado=false;
 }

  parseFechaLatina(fechaStr: string): Date {
  const [dd, mm, yyyy] = fechaStr.split('/');
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}
formatearFechaGuardado(fecha: Date): string {
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const anio = fecha.getFullYear();
  return `${dia}/${mes}/${anio}`;
}
convertirAFecha(fechaStr: string): Date | null {
  if (!fechaStr) return null;

  const partes = fechaStr.includes('/') ? fechaStr.split('/') : fechaStr.split('-');

  if (partes.length === 3) {
    const [d, m, y] = partes.map(Number);
    return new Date(y, m - 1, d); // dd/mm/yyyy
  }

  return null;
}

actualizarCodigo14(): void {
  if (!this.idCodigos14) {
    this.mostrarAlerta('⚠️ No se ha cargado un código válido.', 'Error');
    return;
  }

  const formValue = this.formUV.value;

  // Abre el diálogo de confirmación
  this.dialog.open(CustomMessageBoxComponent, {
    width: '400px',
    data: {
      title: '¿Desea guardar los cambios?',
      message: `Se guardarán los cambios para el código ${formValue.gtinUv || '(sin código)'}.\n¿Está seguro?`,
      type: 'info',
      confirmText: 'Sí, guardar',
      cancelText: 'Cancelar',
      showCancel: true
    }
  }).afterClosed().subscribe(confirmado => {
    if (!confirmado) {
      console.log('❌ Modificación cancelada por el usuario');
      return;
    }
   
    const data: Partial<Codigos14Request> = {
      id_codigos14: this.idCodigos14,
      descripcion: formValue.descripcion || '',
      presentacion: Number(formValue.presentacion || 0),
      unidad: formValue.factor || '',
      fecha: moment(formValue.fecha).format('YYYY-MM-DD'), 
      activo: formValue.activo
    };

    this.codigos14Service.actualizarCamposBasicos(data).pipe(take(1)).subscribe({
      next: (resp) => {
        this.mostrarAlerta('✅ Registro actualizado correctamente', 'Éxito');
        this.botonGrabarDeshabilitado = true;
      },
      error: (err) => {
        console.error('❌ Error al actualizar Código14:', err);
        this.mostrarAlerta('❌ Ocurrió un error al actualizar.', 'Error');
      }
    });
  });
}


}
