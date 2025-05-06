// Angular Core
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { forkJoin } from 'rxjs';

// Angular Forms
import { FormBuilder, FormGroup, FormControl, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
// Angular Material
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';


// RxJS
import { BehaviorSubject, Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
const html2pdf: any = require('html2pdf.js');
import { MatStepper } from '@angular/material/stepper';


// Servicios personalizados
import { GrupoEmpresaService, GrupoEmpresa } from '../../../../services/grupo-empresa.service';
import { GrupoProductoService, GrupoProducto } from '../../../../services/grupo-producto.service';
import { RucService } from '../../../../services/ruc.service';
import { CiudadService, Ciudad } from '../../../../services/ciudad.service';
import { UsuarioService } from '../../../../services/usuario.service';
import { ZonaService, Zona } from '../../../../services/zona.service';
import { ClienteIndividual, ClienteService } from 'src/app/services/cliente.service';
import { NcontrolService, NumeroControlMinDto } from 'src/app/services/ncontrol.service';
import { PrefijoService, Prefijo } from 'src/app/services/prefijo.service';
import { CedulaService } from 'src/app/services/cedula.service';
import { GenerarglnService } from 'src/app/services/generargln.service';
import { GlnService, GlnRequest } from 'src/app/services/gln.service';
// Interfaces o modelos
import { ClienteRuc } from '../../../../interfaces/clienteRuc';
import { emailValidoValidator } from '../../../../util/validators';

import { Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';


@Component({
  selector: 'app-dialog-cliente-editar',
  templateUrl: './dialog-cliente-editar.component.html',
  styleUrl: './dialog-cliente-editar.component.css'
})



export class DialogClienteEditarComponent implements OnInit {
  formCliente!: FormGroup;
  selectedTab: number = 0;

  grupos: GrupoEmpresa[] = [];
  grupoCtrl = new FormControl('');
  gruposFiltrados$!: Observable<GrupoEmpresa[]>;
  grupoSeleccionado!: number;

  gruposProducto: GrupoProducto[] = [];
  grupoProductoCtrl = new FormControl('');
  gruposProductoFiltrados$!: Observable<GrupoProducto[]>;
  grupoProductoFiltrados: GrupoProducto[] = [];
  grupoProductoSeleccionado!: number;
  fechaIngreso: Date = new Date();
  razonSocial = '';
  nombreRepresentante = '';
  ciudad: Ciudad[] = [];
  ciudadCtrl = new FormControl('');
  ciudadFiltrados$!: Observable<Ciudad[]>;
  ciudadSeleccionado!: number;
  ciudadFiltrados: Ciudad[] = [];

  nombreCiudadSeleccionada: string = '';
  esPasaporte = false;
  tipoIdentificacion: 'CEDULA' | 'RUC' | 'PASAPORTE' | null = null;
  usuarioActual: { id: number; usr: string } | null = null;

  zona: Zona[] = [];
  zonaCtrl = new FormControl('');
  zonaFiltrados$!: Observable<Zona[]>;
  ZonaSeleccionado!: number;

  clienteEncontrado?: ClienteRuc;
  error?: string;

  numeroControl?: NumeroControlMinDto;

  modificarSecuencia = false;
  longitudPrefijo = 6; // Se puede cambiar dinámicamente si quieres
  longitudPrefijoMin = 0;
  longitudPrefijoMax = 0;
  botonGuardarDeshabilitado: boolean = false;
  fechaHoy = new Date().toISOString().split('T')[0];
  datosReporte: any = {};
  resultados: Prefijo[] = [];
  prefijoExistente = false;
  impresionHabilitada = false;
  fecha: Date = new Date();
  clienteE!:ClienteIndividual;
  modoEdicion = false;
  constructor(
    private fb: FormBuilder,
    private grupoService: GrupoEmpresaService,
    private grupoProductoService: GrupoProductoService,
    private rucService: RucService,
    private ciudadService: CiudadService,
    private usuarioService: UsuarioService,
    private zonaService: ZonaService,
    private router: Router,
    private dialogRef: MatDialogRef<DialogClienteEditarComponent>,
    private clienteService: ClienteService,
    private _snackBar: MatSnackBar,
    private ncontrolService: NcontrolService,
    private prefijoService: PrefijoService,
    private cedulaService: CedulaService,
    private generarglnService: GenerarglnService,
    private glnService: GlnService,
    @Inject(MAT_DIALOG_DATA) public idCliente: number, 

  ) { }

  ngOnInit(): void {


    this.initFormulario();

    this.obtenerUsuarioActual();
    this.cargarGrupos();
    this.cargarGruposProducto();
    this.cargarCiudad();
    this.cargarZona();
  
    
    console.log(this.idCliente);
    this.cargarClienteYGrupos(this.idCliente);
  }

  initFormulario(): void {
    this.formCliente = this.fb.group({
      paso1: this.fb.group({
        ruc: ['', Validators.required],
        esPasaporte: [false],
        categoriaCliente: [null, Validators.required],
        grupo: [null, Validators.required],
        grupoProducto: [null, Validators.required],
        prefix: [''],
        zona: [null],
        codigoCliente: [{ value: '', disabled: false }],
        //prefijo: [''], antes 
        prefijo: [{ value: '', disabled: true }],
        prefijogs1: [''],
        origen: [''],
        gln: ['']
      }),

      paso2: this.fb.group({
        ciudad: ['', Validators.required],
        razonSocial: this.fb.control(null, {
          validators: [
            Validators.required
          ],
          updateOn: 'change'
        }),
        
        nombreRepresentante: [null, Validators.required],
        direccionPrincipal: ['', Validators.required],
        codigoPostal: [''],
        celular: ['', Validators.required],
        sitioWeb: [''],
        telefono2: [''],
        usuario: [{ value: '', disabled: true }],
        observacion1: ['']
      }),

      paso3: this.fb.group({
        nombreRepresentante: [null, Validators.required],
        emailRepresentante: ['', [Validators.required, emailValidoValidator()]],
        telefonoRepresentante: ['', Validators.required],
        nombreCodificacion: [''],
        email: ['', [emailValidoValidator()]],
        email1: ['', [emailValidoValidator()]],
        email2: ['', [emailValidoValidator()]],
        email3: ['', [emailValidoValidator()]],
        telefono: [''],
        nombreFinanciero: [''],

        telefono2: [''],
        pregunta1: [false],
        pregunta2: [false],
        pregunta3: [false],
        pregunta4: [false],
        pregunta5: [false],
        pregunta6: [false]
      }),

      paso4: this.fb.group({
        observacion2: [''],
        observacion3: [''],
        observacion4: ['']
      })
    });
  }


  get paso1Form(): FormGroup {
    return this.formCliente.get('paso1') as FormGroup;
  }

  get paso2Form(): FormGroup {
    return this.formCliente.get('paso2') as FormGroup;
  }

  get paso3Form(): FormGroup {
    return this.formCliente.get('paso3') as FormGroup;
  }

  get paso4Form(): FormGroup {
    return this.formCliente.get('paso4') as FormGroup;
  }



  cargarGrupos(): void {
    this.grupoService.obtenerGrupos().subscribe(data => {
      this.grupos = data;
      this.gruposFiltrados$ = this.grupoCtrl.valueChanges.pipe(
        startWith(''),
        map(valor => this.filtrarGrupos(valor || ''))
      );
    });
  }

  filtrarGrupos(valor: string): GrupoEmpresa[] {
    const filtro = valor.toLowerCase();
    return this.grupos.filter(grupo =>
      `${grupo.codigo} - ${grupo.nombre}`.toLowerCase().includes(filtro)
    );
  }

  seleccionarGrupo(nombre: string): void {
    const grupo = this.grupos.find(g => `${g.codigo} - ${g.nombre}` === nombre);
    if (grupo) {
      this.paso1Form.get('grupo')?.setValue(grupo.id_grupo_empresa);
    }
  }



  cargarGruposProducto(): void {
    this.grupoProductoService.obtenerGrupos().subscribe(data => {
      this.gruposProducto = data;

      this.paso1Form.get('grupoProducto')?.valueChanges
        .pipe(startWith(''))
        .subscribe(valor => {
          const filtro = typeof valor === 'string' ? valor.toLowerCase() : '';
          this.grupoProductoFiltrados = this.gruposProducto.filter(g =>
            (g.codigo + ' ' + g.brick + ' ' + g.desBrick).toLowerCase().includes(filtro)
          );
        });
    });
  }


  filtrarGruposProducto(valor: string | GrupoProducto): GrupoProducto[] {
    const filtro = typeof valor === 'string' ? valor.toLowerCase() : valor?.desBrick?.toLowerCase() || '';

    return this.gruposProducto.filter(g =>
      g.codigo.toLowerCase().includes(filtro) ||
      g.brick.toLowerCase().includes(filtro) ||
      g.desBrick.toLowerCase().includes(filtro)
    );
  }


  displayWithGrupoProducto(grupo: GrupoProducto | string): string {
    if (typeof grupo === 'string') return grupo;
    return grupo ? `${grupo.codigo} - ${grupo.brick} - ${grupo.desBrick}` : '';
  }


  seleccionarGrupoProducto(grupo: GrupoProducto): void {
    this.paso1Form.get('grupoProducto')?.setValue(grupo);
  }

  limpiarGrupoProducto(): void {
    this.paso1Form.get('grupoProducto')?.reset();
  }

  soloNumeros(event: KeyboardEvent) {
    const charCode = event.which ?? event.keyCode;
    if (charCode < 48 || charCode > 57) {
      event.preventDefault(); // Bloquea letras o símbolos
    }
  }
  buscarRuc(ruc: string): void {
    this.rucService.obtenerDatosRuc(ruc).subscribe({
      next: data => {
        this.tipoIdentificacion = 'RUC'; // ✅ importante
        this.razonSocial = data.razonSocial;
        this.nombreRepresentante = data.nombre;

        this.paso2Form.patchValue({
          razonSocial: data.razonSocial,
          nombreRepresentante: data.nombre
        });

        this.paso3Form.patchValue({
          nombreRepresentante: data.nombre
        });

        this.error = undefined;
        console.log('✅ Datos RUC:', data);
      },
      error: err => {
        this.error = 'No se encontraron datos para el RUC ingresado.';
        console.error('❌ Error buscando RUC:', err);
        this.tipoIdentificacion = null;
      }
    });
  }



  get rucControl(): FormControl {
    return this.paso1Form.get('ruc') as FormControl;
  }
  cargarCiudad(): void {
    this.ciudadService.obtenerCiudad().subscribe(data => {
      this.ciudad = data;

      this.paso2Form.get('ciudad')?.valueChanges
        .pipe(startWith(''))
        .subscribe(valor => {
          const texto = typeof valor === 'string' ? valor.toLowerCase() : '';
          this.ciudadFiltrados = this.ciudad.filter(c =>
            (c.ciudad).toLowerCase().includes(texto)
          );
        });
    });
  }








  displayCiudad(ciudad: Ciudad | string): string {
    if (typeof ciudad === 'string') return ciudad;
    return ciudad ? `${ciudad.ciudad} - ${ciudad.canton} - ${ciudad.provincia}` : '';
  }


  seleccionarCiudad(ciudad: Ciudad): void {
    this.paso2Form.get('ciudad')?.setValue(ciudad); // guardamos el objeto completo
  }


  limpiarCiudad(): void {
    this.paso2Form.get('ciudad')?.reset();
  }




  actualizarValidacionRuc(): void {
    const esPasaporte = this.paso1Form.get('esPasaporte')?.value;
    if (esPasaporte) {
      this.tipoIdentificacion = 'PASAPORTE';
      this.error = undefined; // limpia el error
      this.rucControl.clearValidators();
      this.rucControl.setErrors(null);
    } else {
      this.rucControl.setValidators([
        control => {
          const valor = control.value;
          const valido = /^\d{10}$/.test(valor) || /^\d{13}$/.test(valor);
          return valor && valido ? null : { invalidLength: true };
        }
      ]);
    }

    this.rucControl.updateValueAndValidity();
  }




  // Evento para buscar RUC o cédula automáticamente
  onRucBlur(): void {
    const valor = this.rucControl.value;
    const esPasaporte = this.paso1Form.get('esPasaporte')?.value;
    console.log('Valor esPasaporte:', this.paso1Form.get('esPasaporte')?.value);
    console.log('Form válido:', this.paso1Form.valid);
    console.log('Error:', this.error);
    if (!valor) {
      this.tipoIdentificacion = null;
      return;
    }

    if (esPasaporte) {
      this.tipoIdentificacion = 'PASAPORTE';
      this.error = undefined;
      return;
    }

    this.clienteService.getClientePorRuc(valor).subscribe({
      next: cliente => {
        if (cliente) {
          this.error = '⚠️ El cliente ya existe.';
          this.razonSocial = '';
          this.nombreRepresentante = '';
          this.paso2Form.patchValue({ razonSocial: '', nombreRepresentante: '' });
          this.paso3Form.patchValue({ nombreRepresentante: '' });
        } else {
          if (/^\d{13}$/.test(valor)) {
            this.buscarRuc(valor);
          } else if (/^\d{10}$/.test(valor)) {
            this.buscarCedula(valor);
          } else {
            // ❗ solo si NO es pasaporte
            if (!esPasaporte) {
              this.error = '❌ Número inválido. Ingrese 10 dígitos para cédula o 13 dígitos para RUC.';
            }
          }
        }
      },
      error: () => {
        if (/^\d{13}$/.test(valor)) {
          this.buscarRuc(valor);
        } else if (/^\d{10}$/.test(valor)) {
          this.buscarCedula(valor);
        } else {
          if (!esPasaporte) {
            this.error = '❌ Número inválido. Ingrese 10 dígitos para cédula o 13 dígitos para RUC.';
          }
        }
      }
    });
  }








  buscarCedula(cedula: string): void {
    console.log('🔎 Buscando Cédula:', cedula);

    this.cedulaService.obtenerDatosCedula(cedula).subscribe({
      next: (data) => {
        this.tipoIdentificacion = 'CEDULA'; // ✅ importante
        this.razonSocial = data.nombreCompleto;

        this.paso2Form.patchValue({
          nombreRepresentante: data.nombreCompleto,
          razonSocial: data.nombreCompleto
        });

        this.paso3Form.patchValue({
          nombreRepresentante: data.nombreCompleto
        });

        this.error = undefined;
      },
      error: (err) => {
        console.error('❌ Error consultando cédula:', err);
        this.error = 'No se encontraron datos para la cédula ingresada.';
        this.tipoIdentificacion = null;
      }
    });
  }


  obtenerUsuarioActual(): void {
    this.usuarioService.currentUser$.subscribe(user => {
      this.usuarioActual = user;

      console.log('Usuario Actual:', this.usuarioActual);

    });
  }
  cargarZona(): void {
    this.zonaService.obtenerZona().subscribe(data => {
      this.zona = data;
      this.zonaFiltrados$ = this.zonaCtrl.valueChanges.pipe(
        startWith(''),
        map(valor => this.filtrarZona(valor || ''))
      );
    });
  }

  filtrarZona(valor: string): Zona[] {
    const filtro = valor.toLowerCase();
    return this.zona.filter(zona =>
      `${zona.referencia} - ${zona.nombre}`.toLowerCase().includes(filtro)
    );
  }

  seleccionarZona(zona: Zona): void {
    // const zona = this.zona.find(g => `${g.referencia} - ${g.nombre}` === nombre);
    // if (zona) {
    //   this.paso1Form.get('zona')?.setValue(zona.id);
    // }
    this.paso1Form.get('zona')?.setValue(zona);
  }

  cancelar(): void {
    this.dialogRef.close(); // Cierra el diálogo
    this.router.navigate(['/pages/clientes']); // Redirecciona a /pages/clientes
  }
  guardar(): void {
    if (this.formCliente.invalid) {
      this.formCliente.markAllAsTouched(); // muestra errores en pantalla
      this.mostrarAlerta('Faltan campos obligatorios por llenar', 'Formulario Incompleto');
      return; // ⛔ no continúa si el formulario es inválido
    }
    const paso1 = this.paso1Form.value;
    const paso2 = this.paso2Form.value;
    const paso3 = this.paso3Form.value;
    const paso4 = this.paso4Form.value;

    const ciudadObj = paso2.ciudad;
    const ciudadNombre = typeof ciudadObj === 'object' ? ciudadObj.ciudad : ciudadObj;
    const idCiudad = typeof ciudadObj === 'object' ? ciudadObj.id_ciudad : 0;
    const grupoProductoObj = paso1.grupoProducto;
    const idGrupoProducto = typeof grupoProductoObj === 'object' ? grupoProductoObj.id_grupo_producto : grupoProductoObj || 0;
    // const zonaObj = paso1.zona;
    // const idZona = typeof zonaObj === 'object' ? zonaObj.id_zona : 0;
    const ruc = this.rucControl.value;
    const jsonCliente = {
      nomcli: paso2.razonSocial || '',
      dircli: paso2.direccionPrincipal || '',
      concli: paso2.nombreRepresentante || '',
      email: paso3.email || '',
      telefono: paso2.telefono || '',
      telefono1: paso3.telefono2 || '',
      razonSocial: paso2.razonSocial || '',
      fax: '',
      ruc: paso1.ruc || '',
      fecing: this.fechaIngreso.toISOString().split('T')[0],
      fecnac: '2025-04-23',
      fecfac1: '2025-04-23',
      fecfac2: '2025-04-23',
      fecfac3: '2025-04-23',
      fecfac4: '2025-04-23',
      fecfac5: '2025-04-23',
      marca1: '',
      marca2: '',
      marca3: '',
      marca4: '',
      marca5: '',
      codcue: '',
      hello: '',
      desde: 0,
      fechtre: new Date().toISOString(),
      ncomercial: '',
      saldo: 0,
      fecfac: '',
      ciudad: ciudadNombre || '',
      obs: paso2.observacion1 || '',
      delestado: 0,
      genero: '',
      infcamahabitacion: '',
      empresaCodigo: 1,
      seguimiento: 0,
      fechaactinact: '2025-04-23',
      idEstadoEmpresa: 1,
      formatodocumento: 0,
      imprimeobstramite: 0,
      idTipoCliente: paso1.categoriaCliente,// aqui llego en blanco 
      idGrupoProducto: paso1.grupoProducto.id_grupo_producto,
      idPersona: 8,
      codigoPostal: paso2.codigoPostal || '',
      codigoPostal2: '',
      idVendedor: 1,
      idCiudad: idCiudad,
      idZona: '1',
      //idZona: paso1.zona.id,  por el momento hasta enlazar con la ciudad
      idGrupoEmpresa: paso1.grupo || 1,
      representante: paso2.nombreRepresentante || ''
    };
    this.impresionHabilitada = true;
    console.log('📤 Enviando cliente:', jsonCliente);

    this.clienteService.guardarCliente(jsonCliente).subscribe({
      next: (res) => {
        console.log('✅ Cliente guardado:', res);

        this.clienteService.getClientePorRuc(ruc).subscribe({
          next: (cliente) => {
            if (cliente) {
              console.log('✅ Código recibido:', cliente.clientes_codigo);
              this.paso1Form.patchValue({
                codigoCliente: cliente.clientes_codigo

              });

              
            }
          },
          error: (err) => {
            console.error('❌ No se pudo obtener el cliente por RUC:', err);
          }
        });
        // Opcional: deshabilitar campo si deseas que sea solo lectura luego
        // this.paso1Form.get('codigoCliente')?.disable();

        //this.mostrarAlerta('Información Guardada', 'OK');

        //this.dialogRef.close(); // Cierra el modal (opcional)
        //this.router.navigate(['/pages/clientes']); // Redirecciona (opcional)
      },
      error: (err) => {
        console.error('❌ Error al guardar el cliente:', err);
        this.mostrarAlerta('No se pudieron cargar los clientes', 'Error');
      }
    });
  }
 





  mostrarAlerta(mensaje: string, tipo: string) {
    this._snackBar.open(mensaje, tipo, {
      horizontalPosition: "end",
      verticalPosition: "top",
      duration: 5000
    });
  }
  buscarCliente() {
    const ruc = this.rucControl.value;

    if (!ruc) return;

    this.clienteService.getClientePorRuc(ruc).subscribe({
      next: (cliente) => {
        if (cliente) {
          this.clienteEncontrado = cliente;
          this.error = undefined;
        } else {
          // No se encontró el cliente
          this.clienteEncontrado = undefined;
          this.error = 'Cliente no encontrado';
          this.actualizarValidacionRuc();
        }
      },
      error: (err) => {
        console.error('Error al buscar cliente:', err);
        this.clienteEncontrado = undefined;
        this.error = 'Error al buscar el cliente';
        this.actualizarValidacionRuc(); // Aquí también puedes validar
      }
    });
  }
  forzarMayusculas(controlName: string, formGroup: FormGroup, event: any): void {
    const input = event.target;
    const valorTransformado = input.value.toUpperCase(); // ⚠️ Solo transforma a mayúsculas
    input.value = valorTransformado;
    formGroup.get(controlName)?.setValue(valorTransformado, { emitEvent: false });
  }



  soloLetrasMayusculasValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const valor = control.value;
      const regex = /^[A-Z\s]+$/; // solo mayúsculas y espacios
      if (!valor || regex.test(valor)) {
        return null;
      }
      return { soloMayusculas: true };
    };
  }
  
  forzarGuardarValor(controlName: string, formGroup: FormGroup, event: Event): void {
    const input = event.target as HTMLInputElement;
    const control = formGroup.get(controlName);

    if (control) {
      const valorActual = input.value || '';
      control.setValue(valorActual); // 🔥 Guarda el valor exactamente como está en el input
      control.markAsTouched();       // 🔥 Marca el campo como "tocado"
      control.updateValueAndValidity(); // 🔥 Le indica a Angular que revalide el control
    }
  }

  limpiarFormulario(): void {
    this.formCliente.reset(); // 🔥 Limpia todo el formulario
    this.botonGuardarDeshabilitado = false;
    this.modificarSecuencia = false;
    // Valores predeterminados que quieres reiniciar
    this.paso1Form.patchValue({
      esPasaporte: false,
      codigoCliente: '',
      prefijo: '',
      prefijogs1: '',
      origen: '',
      gln: ''
    });

    this.paso2Form.patchValue({
      usuario: ''
    });

    this.paso3Form.patchValue({
      pregunta1: false,
      pregunta2: false,
      pregunta3: false,
      pregunta4: false,
      pregunta5: false,
      pregunta6: false
    });

    this.selectedTab = 0; // Opcional: vuelve al primer tab
    this.tipoIdentificacion = null;
    this.error = undefined;
    this.razonSocial = '';
    this.nombreRepresentante = '';
    this.ciudadSeleccionado = 0;
    this.zonaCtrl.reset();
    this.ciudadCtrl.reset();
    this.grupoCtrl.reset();
    this.grupoProductoCtrl.reset();

  }

  generarPDF(): void {
    this.datosReporte = {
      fechaHoy: new Date(),
     // prefijo: this.paso1Form.get('prefijo')?.value,
      fechaIngreso: this.fechaIngreso,
      ruc: this.paso1Form.get('ruc')?.value,
      razonSocial: this.paso2Form.get('razonSocial')?.value,
      ciudad: this.paso2Form.get('ciudad')?.value?.ciudad || '',
      representante: this.paso2Form.get('nombreRepresentante')?.value,
      observacion: this.paso2Form.get('observacion1')?.value
    };

    const contenido = document.getElementById('contenidoReporte');

    if (contenido) {
      // 👇 Mostrar el contenido temporalmente
      contenido.style.display = 'block';

      setTimeout(() => {
        const opciones = {
          margin: 10,
          filename: 'Informe_General_Cliente.pdf',
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().from(contenido).set(opciones).save()
          .then(() => {
            // 👇 Luego ocultarlo de nuevo
            contenido.style.display = 'none';
          });
      }, 500); // Espera 500ms para asegurarse que DOM se actualice
    } else {
      this.mostrarAlerta('No se encontró el contenido para imprimir', 'Error');
    }
  }

 
  verificarYAvanzar(form: FormGroup, stepper: MatStepper): void {
    console.log('🚦 Ejecutando verificarYAvanzar...');
    console.log('📋 Estado del formulario:', form.valid, form.value);
  
    form.markAllAsTouched();
  
    if (form.valid) {
      console.log('✅ Formulario válido. Avanzando...');
      stepper.next();
    } else {
      console.warn('❌ Formulario inválido. Verifica los siguientes errores:');
      for (const key in form.controls) {
        const ctrl = form.get(key);
        if (ctrl && ctrl.invalid) {
          console.warn(`🛑 Campo inválido: ${key}`, ctrl.errors);
        }
      }
    }
  }
  
  
  forzarGuardarRazonSocial(): void {
    const control = this.paso2Form.get('razonSocial');
    const input = document.querySelector<HTMLInputElement>('input[formcontrolname="razonSocial"]');
    const valor = input?.value?.trim();
  
    if (valor !== undefined && valor !== null) {
      // 🔄 1. Borrar temporalmente sin emitir evento
      control?.setValue('', { emitEvent: false });
  
      // 🔁 2. Reasignar el valor original después de un tick
      setTimeout(() => {
        control?.setValue(valor, { emitEvent: true });
        control?.markAsTouched();
        control?.markAsDirty();
        control?.updateValueAndValidity({ emitEvent: true });
  
        // 🔁 3. Disparar manualmente el evento input por si algún validador depende de él
        input?.dispatchEvent(new Event('input', { bubbles: true }));
      }, 0);
    }
  }
  
  forzarSyncYAvanzar(campo: string, form: FormGroup): void {
    const control = form.get(campo);
    const input = document.querySelector<HTMLInputElement>(`input[formcontrolname="${campo}"]`);
    const valor = input?.value?.trim();
  
    console.log(`🔁 forzarSyncYAvanzar ejecutado para '${campo}' con valor actual:`, valor);
  
    if (valor !== undefined && valor !== null) {
      control?.setValue('', { emitEvent: false });
  
      setTimeout(() => {
        control?.setValue(valor, { emitEvent: true });
        control?.markAsTouched();
        control?.markAsDirty();
        control?.updateValueAndValidity({ onlySelf: true, emitEvent: true });
  
        input?.dispatchEvent(new Event('input', { bubbles: true }));
  
        // 🔥 Trigger manualmente ChangeDetector si es necesario
        setTimeout(() => {
          console.log(`✅ Valor restablecido en '${campo}':`, control?.value);
        }, 50);
      }, 0);
    }
  }
  
  
  
  verificarPaso2YAvanzar(stepper: MatStepper): void {
    this.forzarSyncYAvanzar('razonSocial', this.paso2Form);
    this.forzarSyncYAvanzar('nombreRepresentante', this.paso2Form);
  
    this.paso2Form.markAllAsTouched();
  
    if (this.paso2Form.valid) {
      stepper.next();
    }
  }
  
  alEntrarCampo(nombreCampo: string, formGroup: FormGroup): void {
    const control = formGroup.get(nombreCampo);
    if (!control) return;
  
    const original = control.value || '';
  
    // Simula un Backspace borrando el último carácter
    const simulado = original.slice(0, -1);
  
    // Aplica el cambio
    control.setValue(simulado, { emitEvent: false });
  
    setTimeout(() => {
      control.setValue(original, { emitEvent: true });
      control.markAsTouched();
      control.markAsDirty();
      control.updateValueAndValidity({ emitEvent: true });
  
      const inputEl = document.querySelector<HTMLInputElement>(`input[formcontrolname="${nombreCampo}"]`);
      if (inputEl) {
        const event = new Event('input', { bubbles: true });
        inputEl.dispatchEvent(event);
      }
    }, 50);
  }
  
  cargarClientePorId(id: number): void {
    this.clienteService.getClienteById(id).subscribe({
      next: (cliente) => {
        this.clienteE = cliente;
        this.llenarFormularioConCliente(cliente);
        console.log('Cliente:', this.clienteE);
      },
      error: (err) => {
        console.error('Error al obtener cliente:', err);
      }
    });
  }
  llenarFormularioConCliente(cliente: ClienteIndividual): void {
    // Paso 1
    this.paso1Form.patchValue({
      ruc: cliente.ruc || '',
      codigoCliente: cliente.clientes_codigo || '',
      categoriaCliente: cliente.idTipoCliente || null,
      grupo: cliente.idGrupoEmpresa || null,
      prefix: cliente.prefijo || '',
      zona: this.zona.find(z => z.id === cliente.idZona) || null, // ← aquí el cambio
      prefijo: cliente.prefijo || '',
      prefijogs1: `${cliente.prefijo}`,
      origen: cliente.zonaReferencia || '',
      gln: ''
    });
  
    
  
    // Paso 2
    this.paso2Form.patchValue({
      ciudad: cliente.ciudad || '',
      razonSocial: cliente.razonSocial || '',
      nombreRepresentante: cliente.representante || '',
      direccionPrincipal: cliente.dircli || '',
      codigoPostal: cliente.codigoPostal || '',
      celular: cliente.telefono || '',
      sitioWeb: cliente.web,
      telefono2: cliente.telefono1 || '',
      usuario: '',
      observacion1: cliente.obs || ''
    });
  
    // Paso 3
    this.paso3Form.patchValue({
      nombreRepresentante: cliente.representante || '',
      emailRepresentante: cliente.email || '',
      telefonoRepresentante: cliente.telefono || '',
      email: cliente.email || '',
      telefono: cliente.telefono || '',
      email1: '',
      email2: '',
      email3: '',
      nombreCodificacion: '',
      nombreFinanciero: '',
      pregunta1: false,
      pregunta2: false,
      pregunta3: false,
      pregunta4: false,
      pregunta5: false,
      pregunta6: false
    });
  
    // Paso 4
    this.paso4Form.patchValue({
      observacion2: '',
      observacion3: '',
      observacion4: ''
    });
  
    this.formCliente.markAllAsTouched();
  }
  
  
  cargarClienteYGrupos(idCliente: number): void {
    forkJoin({
      cliente: this.clienteService.getClienteById(idCliente),
      gruposProducto: this.grupoProductoService.obtenerGrupos(),
      gruposEmpresa: this.grupoService.obtenerGrupos(),
      zona: this.zonaService.obtenerZona(),
      ciudad: this.ciudadService.obtenerCiudad() // 👈 agregar esto
    }).subscribe(({ cliente, gruposProducto, gruposEmpresa, zona, ciudad }) => {
      this.clienteE = cliente;
      this.gruposProducto = gruposProducto;
      this.grupos = gruposEmpresa;
      this.zona = zona;
      this.ciudad = ciudad; // 👈 guardar ciudades en this.ciudad
    
      this.llenarFormularioConCliente(this.clienteE);
      this.setGrupoProductoPorId(this.clienteE.idGrupoProducto);
      this.setGrupoEmpresaPorId(this.clienteE.idGrupoEmpresa);
      this.setZonaPorId(this.clienteE.idZona);
      this.setCiudadPorId(this.clienteE.idCiudad); // 👈 nuevo llamado
    });
    
    
  }
    
  
  setGrupoProductoPorId(id: number): void {
    const grupo = this.gruposProducto.find(g => g.id_grupo_producto === id);
    if (grupo) {
      this.paso1Form.get('grupoProducto')?.setValue(grupo);
    } else {
      console.warn('❌ No se encontró el grupo producto con ID:', id);
    }
  }
  setGrupoEmpresaPorId(id: number): void {
    
    const grupo = this.grupos.find(g => g.id_grupo_empresa === id);
    if (grupo) {
      this.paso1Form.get('grupo')?.setValue(grupo.id_grupo_empresa); // ✅ setea el ID
    } else {
      console.warn('❌ No se encontró el grupo empresa con ID:', id);
    }
  }
  setZonaPorId(id: number): void {
    debugger
    console.log(id);
    const zona = this.zona.find(z => z.id === id);
    if (zona) {
      this.paso1Form.get('zona')?.setValue(zona); // ✅ pasa el objeto completo
    } else {
      console.warn('❌ No se encontró la zona con ID:', id);
    }
  }
  
  setCiudadPorId(id: number): void {
    const ciudad = this.ciudad.find(c => c.id_ciudad === id);
    if (ciudad) {
      this.paso2Form.get('ciudad')?.setValue(ciudad); // ✅ setea el objeto completo
    } else {
      console.warn('❌ No se encontró la ciudad con ID:', id);
    }
  }
  activarModoEdicion() {
    debugger
    this.modoEdicion = true;
    this.formCliente.enable(); // habilita todo el formulario
  }
  
  desactivarModoEdicion() {
    this.modoEdicion = false;
    this.formCliente.disable(); // deshabilita todo el formulario
  }
  
}