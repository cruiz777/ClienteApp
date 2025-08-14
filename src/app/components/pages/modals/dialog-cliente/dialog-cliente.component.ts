// Angular Core
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Inject } from '@angular/core';
import { JsonEmpresaService } from 'src/app/services/json-empresa.service';
// Angular Forms
import {
  FormBuilder,
  FormGroup,
  FormControl,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn
} from '@angular/forms';

// Angular Material
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatStepper } from '@angular/material/stepper';
import { ViewChild } from '@angular/core';
// RxJS
import { forkJoin, BehaviorSubject, Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

// Librerías externas
const html2pdf: any = require('html2pdf.js');

// Utilidades y validadores
import { CustomMessageBoxComponent } from 'src/app/util/messages/custom-message-box.component';
import { emailValidoValidator } from 'src/app/util/validators';

// Interfaces y modelos
import { ClienteRuc } from 'src/app/interfaces/clienteRuc';

// Servicios personalizados
import { GrupoEmpresaService, GrupoEmpresa } from 'src/app/services/grupo-empresa.service';
import { GrupoProductoService, GrupoProducto } from 'src/app/services/grupo-producto.service';
import { RucService } from 'src/app/services/ruc.service';
import { CiudadService, Ciudad } from 'src/app/services/ciudad.service';
import { UsuarioService } from 'src/app/services/usuario.service';
import { ZonaService, Zona } from 'src/app/services/zona.service';
import { ClienteService, ClienteIndividual } from 'src/app/services/cliente.service';
import { EstadoEmpresa, EstadoEmpresaService } from 'src/app/services/estado-empresa.service';
import { NcontrolService, NumeroControlMinDto } from 'src/app/services/ncontrol.service';
import { PrefijoService, Prefijo } from 'src/app/services/prefijo.service';
import { CedulaService } from 'src/app/services/cedula.service';
import { GenerarglnService } from 'src/app/services/generargln.service';
import { GlnService, GlnRequest } from 'src/app/services/gln.service';
import { PaisService, Pais } from 'src/app/services/pais.service';
import { ClienteObservacionService,ClienteObservacion } from 'src/app/services/cliente-observacion.service';
import { ClienteDatosAdicionalesService,ClienteDatosAdicionales } from 'src/app/services/cliente-datos-adicionales.service';
import { ClienteContacto,ClienteContactoService } from 'src/app/services/cliente-contacto.service';
import { ParametrosFacturaService } from 'src/app/services/parametros-factura.service';
import { PermissionsService } from 'src/app/services/permission.service';
@Component({
  selector: 'app-dialog-cliente',
  templateUrl: './dialog-cliente.component.html',
  styleUrls: ['./dialog-cliente.component.css']
})
export class DialogClienteComponent implements OnInit {
  formCliente!: FormGroup;
  selectedTab: number = 0;
  @ViewChild('stepper') stepper!: MatStepper;


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
  pais: Pais[] = [];
  paisCtrl = new FormControl('');
  paisFiltrados$!: Observable<Pais[]>;
  paisSeleccionado!: number;
  paisFiltrados: Pais[] = [];

  nombreCiudadSeleccionada: string = '';
  esPasaporte = false;
  tipoIdentificacion: 'CEDULA' | 'RUC' | 'PASAPORTE' | null = null;
  usuarioActual = this.usuarioService.getUsuarioActual();


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
  modoEdicion = false;
  campoGlnVerde = false;
  estadoContribuyenteRuc: string = '';
 codigoAreaE: number | null = null;
   api: string = '';
  claveApi: string = '';
  constructor(
    private fb: FormBuilder,
    private grupoService: GrupoEmpresaService,
    private grupoProductoService: GrupoProductoService,
    private rucService: RucService,
    private ciudadService: CiudadService,
    private usuarioService: UsuarioService,
    private zonaService: ZonaService,
    private router: Router,
    private dialogRef: MatDialogRef<DialogClienteComponent>,
    private clienteService: ClienteService,
    private _snackBar: MatSnackBar,
    private ncontrolService: NcontrolService,
    private prefijoService: PrefijoService,
    private cedulaService: CedulaService,
    private generarglnService: GenerarglnService,
    private glnService: GlnService,
    private dialog: MatDialog,
    private paisService: PaisService,
    private clienteObservacionService: ClienteObservacionService,
    private clienteDatosAdicionalesService: ClienteDatosAdicionalesService,
    private clienteContactoService:ClienteContactoService,
    private jsonEmpresaService:JsonEmpresaService,
    private parametrosFacturaService:ParametrosFacturaService,
    private permissions: PermissionsService
  ) { }

  ngOnInit(): void {
    console.log('----Usuario---');
    this.usuarioActual = this.usuarioService.getUsuarioActual();

    console.log('=== DEBUG PERMISOS ===');
    console.log('1. Todos los permisos flat:', this.permissions.getTodosLosPermisos());
    console.log('2. ¿Incluye el permiso crear?', this.permissions.getTodosLosPermisos().includes('codbar.ficha-de-cliente.nuevo-cliente.nuevo-cliente.crear'));
    console.log('3. Resultado de puedeCrear():', this.puedeCrear);
    console.log('4. Valor de botonGuardarDeshabilitado:', this.botonGuardarDeshabilitado);
    console.log('5. ¿Botón debería estar deshabilitado?', this.botonGuardarDeshabilitado || !this.puedeCrear);


    this.initFormulario();

    //this.obtenerUsuarioActual();
    this.cargarGrupos();
    this.cargarGruposProducto();
    this.cargarPais();
    this.cargarCiudad();
    this.cargarZona();
    this.cargarParametroFacturaPorId(97);
    this.paso1Form.get('prefix')?.valueChanges.subscribe(prefix => {
      this.actualizarValidacionPrefijo(prefix);
    });
  }

  initFormulario(): void {
    this.formCliente = this.fb.group({
      paso1: this.fb.group({
        ruc: ['', Validators.required],
        esPasaporte: [false],
        categoriaCliente: [null, Validators.required],
        grupo: [null, Validators.required],
        grupoProducto: [null, Validators.required],
        prefix: ['', Validators.required],
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
        pais: [''],
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
        observacion1: [''],
        nprefijo:[false],
        compra:[false]
      }),

      paso3: this.fb.group({
        nombreRepresentante: [null, Validators.required],
        emailRepresentante: ['', [Validators.required, emailValidoValidator()]],
        telefonoRepresentante: ['', Validators.required],
        nombreCodificacion: [''],
        email: ['', [emailValidoValidator()]],
        email1: ['', [Validators.required, emailValidoValidator()]],
        email2: ['', [emailValidoValidator()]],
        email3: ['', [emailValidoValidator()]],
        telefonoc: [''],
        nombreFinanciero: [null, Validators.required],

        telefono22:['', Validators.required],
        pregunta1: [false],
        pregunta2: [false],
        pregunta3: [false],
        pregunta4: [false],
        pregunta5: [false],
        pregunta6: [false],
        pregunta7: [false]
      }),

      paso4: this.fb.group({
        observacion2: [''],
        observacion3: [''],
        observacion4: ['']
      })
    });
  }

  //#region 
  get puedeCrear(): boolean {
    return this.permissions.permisosFichaCliente.nuevoCliente.puedeCrear();
  }
  //#endregion

  get debugInfo() {
    return {
      puedeCrear: this.puedeCrear,
      botonDeshabilitado: this.botonGuardarDeshabilitado,
      resultadoFinal: this.botonGuardarDeshabilitado || !this.puedeCrear
    };
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
        this.estadoContribuyenteRuc = data.estadoContribuyenteRuc;
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
    return ciudad ? `${ciudad.ciudad} - ${ciudad.canton} - ${ciudad.provincia} - ${ciudad.idzona} ` : '';
  }


  seleccionarCiudad(ciudad: Ciudad): void {
    this.paso2Form.get('ciudad')?.setValue(ciudad); // guardamos el objeto completo
  }

  limpiarCiudad(): void {
    this.paso2Form.get('ciudad')?.reset();
  }

 cargarPais(): void {
  this.paisService.obtenerPaises().subscribe(data => {
    this.pais = data;

    // ✅ Autocompletar Ecuador al inicio si está disponible
    const ecuador = this.pais.find(p => p.nombre.toLowerCase() === 'ecuador');
    if (ecuador) {
      this.paso2Form.get('pais')?.setValue(ecuador);
      this.codigoAreaE = ecuador.codigoArea; // <-- se asigna 593 aquí
    }

    // 🔍 Reacciona a cambios en el campo país
    this.paso2Form.get('pais')?.valueChanges
      .pipe(startWith(''))
      .subscribe(valor => {
        const texto = typeof valor === 'string' ? valor.toLowerCase() : '';
        this.paisFiltrados = this.pais.filter(p =>
          p.nombre.toLowerCase().includes(texto)
        );

        // 🎯 Asignar código de área si se seleccionó un país válido
        if (typeof valor === 'object' && valor?.codigoArea) {
          this.codigoAreaE = valor.codigoArea;
        } else {
          this.codigoAreaE = 593;
        }
      });
  });
}






  limpiarPais(): void {
    this.paso2Form.get('pais')?.reset();
  }
 displayPais(pais: Pais | string): string {
  return typeof pais === 'string' ? pais : pais?.nombre || '';
}



  seleccionarPais(pais: Pais): void {
    this.paso2Form.get('pais')?.setValue(pais); // guardamos el objeto completo
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
    this.paso2Form.get('zona')?.setValue(zona);
  }

  cancelar(): void {
    this.dialogRef.close(); // Cierra el diálogo
    this.router.navigate(['/codbar/ficha-de-cliente/listado-clientes']); // Redirecciona a /pages/clientes
  }
  guardar(stepper: MatStepper): void {
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
     const idZona = typeof ciudadObj === 'object' ? ciudadObj.idzona : 0;
     debugger
    const ruc = this.rucControl.value;
    const jsonCliente = {
      nomcli: paso2.razonSocial || '',
      dircli: paso2.direccionPrincipal || '',
      concli: paso2.nombreRepresentante || '',
      email: paso3.emailRepresentante || '',
      razonSocial: paso2.razonSocial || '',
      telefono1: paso2.celular,
      fax: paso3.telefonoRepresentante || '',
      telefono: paso2.telefono2 || '',
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
      web: paso2.sitioWeb,
      saldo: 0,
      fecfac: '',
      ciudad: ciudadNombre || '',
      obs:  '', ///obs: paso2.observacion1 || '',
      delestado: 0,
      genero: '',
      infcamahabitacion: '',
      empresaCodigo: this.usuarioActual?.id_empresa,
      seguimiento: 0,
      fechaactinact: '2025-04-23',
      idEstadoEmpresa: 1,
      formatodocumento: 0,
      imprimeobstramite: 0,
      idTipoCliente: paso1.categoriaCliente,// aqui llego en blanco
      idGrupoProducto: paso1.grupoProducto.id_grupo_producto,
      idPersona: 0, //Siempre al crear una persona esta en 0
      codigoPostal: paso2.codigoPostal || '',
      codigoPostal2: '',
      idVendedor: 1,
      idCiudad: idCiudad,
      idZona:idZona,
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

              this.guardarPrefijo();
              this.guardarTodasLasObservaciones();
              this.guardarDatosAdicionales();
              this.guardarContactosCliente();
              
              stepper.selectedIndex = 0;
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
  guardarPrefijo(): void {
    const prefix = this.paso1Form.get('prefix')?.value;
    let idControl: number;
    let pais: string = '';
    let codigogs1: string = ''

    
    switch (prefix) {
      case '5':
        idControl = 70;
        pais = 'EC';
        codigogs1 = '786'
        break;
      case '6':
        idControl = 71;
        pais = 'EC';
        codigogs1 = '786'
        break;
      case '7':
        idControl = 73;
        pais = 'EC';
        codigogs1 = '786'
        break;
      case '8':
        idControl = 72;
        pais = 'EC';
        codigogs1 = '786'
        break;
      case 'MSV':
        idControl = 75;
        pais = 'EC';
        codigogs1 = '786'
        break;
      case 'USA':
        idControl = 0;
        pais = 'US';
        codigogs1 = ''
        break;
      default:
        this.mostrarAlerta('Prefijo no válido seleccionado', 'Error');
        return;
    }

    if (this.modificarSecuencia) {

      // Si se modifica la secuencia manualmente
      const paso1 = this.paso1Form.getRawValue();
      const codigoCliente = paso1.codigoCliente || 0;
      const prefijo = paso1.prefijo || '0';
      this.paso1Form.get('prefijogs1')?.enable(); // ✅ Habilita temporalmente
      this.paso1Form.patchValue({
        prefijo: prefijo,
        prefijogs1: `${codigogs1}${prefijo}`,
        origen: pais
      });

      // Luego generamos el GLN
      const glnGenerado = this.generarGLN();
      this.campoGlnVerde = true;
      this.paso1Form.patchValue({
        gln: glnGenerado
      });
      const bandera = prefix === 'USA' ? 2 : 0;
      const prefijoData = {
        codpre: prefijo,
        fecha: new Date().toISOString().split('T')[0],
        fechaCierre: null,
        observacion: 'Prefijo generado manualmente',
        digitos: prefijo.length.toString(),
        estado: false,
        control: 0,
        ngln: 0,
        bandera: bandera,
        facturar: 'C',
        codpro: '1174',
        nombre: `PREFIJO:`,
        fecfac: 'C',
        referenciaInterna: prefijo,
        prefijosgs1: `${codigogs1}${prefijo}`,
        origenPrefijo: pais,
        orden: 0,
        clientesCodigo: codigoCliente
      };

      console.log('✍️ Guardando prefijo ingresado manualmente:', prefijoData);

      this.prefijoService.guardarPrefijo(prefijoData).subscribe({
        next: () => {
          const msg = this.modoEdicion ? 'Creado' : 'creado';

          this.dialog.open(CustomMessageBoxComponent, {
            width: '400px',
            data: {
              title: 'Éxito',
              message: `El Cliente fue ${msg} correctamente.`,
              type: 'success',
              confirmText: '',
              showCancel: false
            }
          });

          this.paso1Form.get('prefijo')?.disable();
          this.botonGuardarDeshabilitado = true;
          this.guardarNuevoGln(); // ✅ estas van dentro del next
        },
        error: (err) => {
          console.error('❌ Error al actualizar cliente:', err);
          this.mostrarAlerta('No se pudo actualizar el cliente', 'Error');
        }
      });


    } else {
      // Flujo automático
      this.ncontrolService.obtenerNumeroControlMinPorId(idControl).subscribe({
        next: (data) => {
          const siguienteNum = (parseInt(data.numcon, 10) + 1).toString().padStart(data.numcon.length, '0');

          // Primero actualizamos prefijo, prefijoGS1 y origen
          this.paso1Form.get('prefijogs1')?.enable(); // ✅ Habilita temporalmente
          this.paso1Form.patchValue({
            prefijo: data.numcon,
            prefijogs1: `${codigogs1}${data.numcon}`,
            origen: pais
          });

          // Luego generamos el GLN
          const glnGenerado = this.generarGLN();
          this.campoGlnVerde = true;
          this.paso1Form.patchValue({
            gln: glnGenerado
          });
          console.log('⚠️ Valores en form paso1:', this.paso1Form.getRawValue());
          console.log('✅ Prefijo actualizado:', this.paso1Form.get('prefijo')?.value);
          console.log('✅ Prefijo gs1 actualizado:', this.paso1Form.get('prefijogs1')?.value);
          console.log('✅ GLN generado:', glnGenerado);

          const paso1 = this.paso1Form.getRawValue();
          const codigoCliente = paso1.codigoCliente || 0;
          const prefijo = paso1.prefijo || '0';

          const prefijoData = {
            codpre: prefijo,
            fecha: new Date().toISOString().split('T')[0],
            fechaCierre: null,
            observacion: '',
            digitos: prefijo.length.toString(),
            estado: false,
            control: 0,
            ngln: 0,
            bandera: 0,
            facturar: 'C',
            codpro: '1174',
            nombre: `PREFIJO:`,
            fecfac: 'C',
            referenciaInterna: prefijo,
            prefijosgs1: `${codigogs1}${prefijo}`,
            origenPrefijo: pais,
            orden: 0,
            clientesCodigo: codigoCliente
          };

          console.log('📦 Enviando prefijo a guardar:', prefijoData);

          this.prefijoService.guardarPrefijo(prefijoData).subscribe({
            next: () => {
              const msg = this.modoEdicion ? 'Creado' : 'creado';

              this.dialog.open(CustomMessageBoxComponent, {
                width: '400px',
                data: {
                  title: 'Éxito',
                  message: `El Cliente fue ${msg} correctamente.`,
                  type: 'success',
                  confirmText: '',
                  showCancel: false
                }
              });

              this.guardarNuevoGln(); // ✅ llamada adicional
              this.actualizarNumeroControl(idControl, siguienteNum, false); // ✅ nueva lógica
              this.botonGuardarDeshabilitado = true; // ✅ se desactiva el botón luego de guardar
            },
            error: () => {
              this.mostrarAlerta('Error al guardar el prefijo', 'Error');
            }
          });


        },
        error: (err) => {
          console.error('❌ Error al obtener el número de control:', err);
          this.mostrarAlerta('Error al obtener el número de control', 'Error');
        }
      });
    }
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
  obtenerNumeroControl(id: number): void {
    this.ncontrolService.obtenerNumeroControlMinPorId(id).subscribe({
      next: (data) => {
        this.numeroControl = data;

        // Primero actualizas prefijo y prefijogs1
        this.paso1Form.patchValue({
          prefijo: data.numcon,
          prefijogs1: '786' + data.numcon
        });

        // Luego generas el GLN usando el nuevo prefijo
        const glnGenerado = this.generarGLN();  // 🔥 tu función que genera el GLN

        this.paso1Form.patchValue({
          gln: glnGenerado
        });

        console.log('✅ Prefijo actualizado:', data.numcon);
        console.log('✅ Prefijo GS1 actualizado:', '786' + data.numcon);
        console.log('✅ GLN generado:', glnGenerado);

      },
      error: (err) => {
        console.error('Error al consultar el número de control:', err);
        alert('Error al obtener el número de control');
      }
    });
  }

  actualizarNumeroControl(id: number, numcon: string, ocupado: boolean): void {
    this.ncontrolService.actualizarNumeroControl(id, {
      numcon,
      ocupado
    }).subscribe({
      next: res => {
        console.log('✅ Número actualizado:', res);
      },
      error: err => {
        console.error('❌ Error actualizando número de control:', err);
      }
    });
  }
  onModificarSecuenciaChange(event: any): void {
    this.modificarSecuencia = event.target.checked;

    const prefijoControl = this.paso1Form.get('prefijo');
    const asignacionPrefix = this.paso1Form.get('prefix')?.value;

    if (this.modificarSecuencia) {
      prefijoControl?.enable();

      // Configurar límites dinámicamente
      if (asignacionPrefix === '5') {
        this.longitudPrefijoMin = 5;
        this.longitudPrefijoMax = 5;
      } else if (asignacionPrefix === '6') {
        this.longitudPrefijoMin = 6;
        this.longitudPrefijoMax = 6;
      } else if (asignacionPrefix === 'USA') {
        this.longitudPrefijoMin = 6;
        this.longitudPrefijoMax = 10;
      } else if (asignacionPrefix === 'MSV') {
        this.longitudPrefijoMin = 8;
        this.longitudPrefijoMax = 8;
      } else {
        this.longitudPrefijoMin = 0;
        this.longitudPrefijoMax = 0;
      }

      // 🔥 Aplicar validadores nuevos
      prefijoControl?.setValidators([
        Validators.required,
        Validators.pattern(/^\d+$/),
        this.prefijoValidator(this.longitudPrefijoMin, this.longitudPrefijoMax)
      ]);

    } else {
      prefijoControl?.disable();
      prefijoControl?.clearValidators();
      prefijoControl?.setValue('');
    }

    prefijoControl?.updateValueAndValidity();
  }
  actualizarValidacionPrefijo(prefix: string): void {
    const prefijoControl = this.paso1Form.get('prefijo');

    if (!prefijoControl) return;

    if (prefix === '5') {
      this.longitudPrefijoMin = 5;
      this.longitudPrefijoMax = 5;
    } else if (prefix === '6') {
      this.longitudPrefijoMin = 6;
      this.longitudPrefijoMax = 6;
    } else if (prefix === '7') {
      this.longitudPrefijoMin = 7;
      this.longitudPrefijoMax = 7;
    } else if (prefix === '8') {
      this.longitudPrefijoMin = 8;
      this.longitudPrefijoMax = 8;
    } else if (prefix === 'USA') {
      this.longitudPrefijoMin = 4;
      this.longitudPrefijoMax = 10;
    } else if (prefix === 'MSV') {
      this.longitudPrefijoMin = 8;
      this.longitudPrefijoMax = 8;
    } else {
      this.longitudPrefijoMin = 0;
      this.longitudPrefijoMax = 0;
    }

    // 🔥 APLICAR NUEVOS VALIDADORES
    prefijoControl.setValidators([
      Validators.required,
      Validators.pattern(/^\d+$/),
      this.prefijoValidator(this.longitudPrefijoMin, this.longitudPrefijoMax)
    ]);

    prefijoControl.updateValueAndValidity();
  }


  onPrefijoInput(): void {
    const prefijoControl = this.paso1Form.get('prefijo');
    let value = prefijoControl?.value || '';

    // Limpiar todo lo que no sea dígito
    value = value.replace(/\D/g, '');

    // Limitar al máximo permitido
    if (this.longitudPrefijoMax > 0 && value.length > this.longitudPrefijoMax) {
      value = value.substring(0, this.longitudPrefijoMax);
    }

    prefijoControl?.setValue(value, { emitEvent: false });

    // Marcar como tocado
    prefijoControl?.markAsTouched();
    prefijoControl?.updateValueAndValidity();

    // Verificar si el prefijo ya existe al salir del campo (blur)
    if (value.length >= this.longitudPrefijoMin) {
      this.prefijoService.buscarPorCodpre(value).subscribe({
        next: (data) => {
          if (data && data.length > 0) {
            this.prefijoExistente = true;
            this.mostrarAlerta('❗El prefijo ya existe. Ingrese uno diferente.', 'Advertencia');
            prefijoControl?.setValue('');
            prefijoControl?.markAsTouched();
            prefijoControl?.markAsDirty();
            prefijoControl?.updateValueAndValidity();
          } else {
            this.prefijoExistente = false;
          }
        },
        error: (err) => {
          console.error('❌ Error al buscar prefijo:', err);
        }
      });
    }
  }


  prefijoValidator(min: number, max: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value || '';

      if (!value) return { required: true };
      if (value.length < min) return { minLengthError: true };
      if (value.length > max) return { maxLengthError: true };

      return null;
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
    this.paso1Form.get('prefijo')?.disable();
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
      prefijo: this.paso1Form.get('prefijo')?.value,
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

  generarGLN(): string {
    const n = this.paso1Form.get('prefijo')?.value;
    const prefix = this.paso1Form.get('prefix')?.value;
    const modificarSecuencia = this.modificarSecuencia; // Asegúrate de tener esta propiedad en tu componente

    debugger;
    if (!n || !prefix) {
      console.error('Prefijo o prefix inválido.');
      return '';
    }

    let idControl: number;

    switch (prefix) {
      case '5':
        idControl = 5;
        break;
      case '6':
        idControl = 6;
        break;
      case '7':
        idControl = 7;
        break;
      case '8':
        idControl = 8;
        break;
      case 'MSV':
        idControl = 8;
        break;
      case 'USA':
        idControl = n.length;
        break;
      default:
        console.error('Prefijo no válido.');
        return '';
    }

    const resultado = this.generarglnService.generarGln(idControl, n, modificarSecuencia);
    return resultado[0]; // Devuelve el primer GLN generado
  }



  buscarPrefijos(codpre: string): void {
    this.prefijoService.buscarPorCodpre(codpre).subscribe({
      next: (data) => {
        this.resultados = data;
        console.log('📦 Resultado del servicio:', data);
      },
      error: (err) => {
        console.error('❌ Error al buscar prefijos:', err);
      }
    });
  }

  guardarNuevoGln(): void {
    debugger
    const prefijo = this.paso1Form.get('prefijo')?.value;
    const codigoCliente = this.paso1Form.get('codigoCliente')?.value;
    const gln = this.paso1Form.get('gln')?.value;

    if (!prefijo || !codigoCliente || !gln) {
      console.warn('⚠️ Faltan datos necesarios para guardar el GLN.');
      return;
    }

    this.prefijoService.buscarPorCodpre(prefijo).subscribe({
      next: (resultado) => {
        if (!resultado || resultado.length === 0) {
          console.warn('⚠️ No se encontró ningún prefijo con ese código.');
          return;
        }

        const id_prefijos = resultado[0].id_prefijos;
        ///
        const paso2 = this.paso2Form.value;
        const ciudadObj = paso2.ciudad;
        
        const idCiudad = typeof ciudadObj === 'object' ? ciudadObj.id_ciudad : 0;
        //
        const nuevoGln: GlnRequest = {
          id_prefijos: id_prefijos,
          clientesCodigo: codigoCliente,
          gln1: gln,
          idTipoLocalizacion: 12,
          glnLatitud: '0.0000',
          glnLongitud: '0.0000',
          idPais: 211,
          direccion: '',
          telefono: '',
          fax: '',
          contacto: '',
          contactoTel: '',
          email: '',
          web: '',
          fda: '',
          europa: '',
          glnGlobal: '',
          glnFecha: new Date().toISOString().split('T')[0],
          idCiudad: idCiudad,
          glnCodigopostal: '',
          glnCelular: '',
          glnContacto2: '',
          glnEmail2: '',
          glnTel2: '',
          glnContacto3: '',
          glnEmail3: '',
          glnTel3: '',
          glnFacturar: 'S',
          glnCodpro: '',
          glnNombre: '',
          glnOtro1: '',
          glnOtro2: '',
          glnObs1: '',
          glnObs2: '',
          glnOrigenprefijo: 'EC',
          glnPrefijogs1: gln,
          glnGlnp: '',
          glnGlne: '',
          nombreLocalizacion: '',
          observ: '',
          expprod: 1,
          gs1ec: 1,
          gs1latam: 0,
          gas1org: 0,
          google: 1,
          gs1otros: '',
          longG: '',
          longM: '',
          longS: '',
          longE: '',
          latiG: '',
          latiM: '',
          latiS: '',
          latiE: '',
          idUsuario: this.usuarioActual!.id_usuario

        };

        this.glnService.insertarGln({ request: nuevoGln }).subscribe({
          next: () => {
            console.log('✅ GLN guardado exitosamente:', nuevoGln);
            const prefix = this.paso1Form.get('prefix')?.value;  // funciona aunque esté deshabilitado
            if (prefix !== 'MSV') {
              this.enviarEmpresaAJson();
            }

            
          },
          error: (error) => {
            console.error('❌ Error al guardar GLN:', error);
          }
        });

      },
      error: (err) => {
        console.error('❌ Error al buscar prefijos:', err);
      }
    });
  }

  limpiarPrefijo(): void {
    const prefijoControl = this.paso1Form.get('prefijo');
    let value = prefijoControl?.value || '';

    value = value.replace(/\D/g, '');

    if (this.longitudPrefijoMax > 0 && value.length > this.longitudPrefijoMax) {
      value = value.substring(0, this.longitudPrefijoMax);
    }

    prefijoControl?.setValue(value, { emitEvent: false });
  }

  validarPrefijoExistente(): void {
    const prefijoControl = this.paso1Form.get('prefijo');
    const value = prefijoControl?.value;

    if (!value || value.length < this.longitudPrefijoMin) return;

    this.prefijoService.buscarPorCodpre(value).subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.prefijoExistente = true;
          this.mostrarAlerta('❗El prefijo ya existe. Ingrese uno diferente.', 'Advertencia');
          prefijoControl?.setValue('');
          prefijoControl?.markAsTouched();
          prefijoControl?.markAsDirty();
          prefijoControl?.updateValueAndValidity();

          setTimeout(() => {
            const inputElement = document.querySelector('input[formcontrolname="prefijo"]') as HTMLInputElement;
            inputElement?.focus();
          });
        } else {
          this.prefijoExistente = false;
        }
      },
      error: (err) => {
        console.error('❌ Error al buscar prefijo:', err);
      }
    });
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


guardarTodasLasObservaciones(): void {
  const paso1 = this.paso1Form.value;
  const paso2 = this.paso2Form.value;
  const paso4 = this.paso4Form.value;

  const fechaActual = new Date().toISOString();

  const idUsuario = this.usuarioActual?.id_usuario || 0;
  const nombreUsuario = this.usuarioActual?.nombre_usuario || '';
  const clientesCodigo = paso1.codigoCliente || 0;

  const observaciones: ClienteObservacion[] = [
    {
      id_ClienteObservacion: 0,
      Detalle: (paso2.observacion1 || '').trim(),
      fecha: fechaActual,
      idUsuario,
      clientesCodigo,
      nombreUsuario,
      linea: 1
    },
    {
      id_ClienteObservacion: 0,
      Detalle: (paso4.observacion2 || '').trim(),
      fecha: fechaActual,
      idUsuario,
      clientesCodigo,
      nombreUsuario,
      linea: 2
    },
    {
      id_ClienteObservacion: 0,
      Detalle: (paso4.observacion3 || '').trim(),
      fecha: fechaActual,
      idUsuario,
      clientesCodigo,
      nombreUsuario,
      linea: 3
    },
    {
      id_ClienteObservacion: 0,
      Detalle: (paso4.observacion4 || '').trim(),
      fecha: fechaActual,
      idUsuario,
      clientesCodigo,
      nombreUsuario,
      linea: 4
    }
  ];

  observaciones.forEach(obs => {
    this.clienteObservacionService.enviarObservacion(obs).subscribe({
      next: () => console.log(`✅ Observación línea ${obs.linea} enviada`),
      error: err => console.error(`❌ Error en línea ${obs.linea}:`, err)
    });
  });
}

guardarDatosAdicionales(): void {
  const paso1 = this.paso1Form.value;
  const paso2 = this.paso2Form.value;
  const paso3 = this.paso3Form.value;
  const clientesCodigo = paso1.codigoCliente || 0;
  const datosAdicionales = {
    idDatosAdicionales: 0,
    expprod: paso3.pregunta1 || false,
    vendeus: paso3.pregunta2 || false,
    medico: paso3.pregunta3 || false,
    gs1ec: paso3.pregunta4 || false,
    instagram: paso3.pregunta5 || false,
    facebook: paso3.pregunta6 || false,
    web: paso3.pregunta7 || false,
    clientes_codigo: clientesCodigo,
    prefijo: paso2.nprefijo || false,
    guia: paso2.compra || false,
    estado: true
  };
  debugger
  console.log(datosAdicionales);
  this.clienteDatosAdicionalesService.crear(datosAdicionales).subscribe({
    next: () => console.log('✅ Datos creados correctamente'),
    error: (err) => console.error('❌ Error al crear datos adicionales:', err)
  });
}

guardarContactosCliente(): void {
  const paso1 = this.paso1Form.value;
  const paso3 = this.paso3Form.value;
  const clientesCodigo = paso1.codigoCliente || 0;

  const contactosCliente = [
    {
      id_ContactosClientes: 0,
      Nombre: paso3.nombreCodificacion || '',
      telefono: paso3.telefonoc || '',
      email: paso3.email || '',
      cargo: 'Codificación',
      clientesCodigo: clientesCodigo,
      linea: 1
    },
    {
      id_ContactosClientes: 0,
      Nombre: paso3.nombreFinanciero || '',
      telefono: paso3.telefono22 || '',
      email: paso3.email1 || '',
      cargo: 'Facturación',
      clientesCodigo: clientesCodigo,
      linea: 2
    },
    {
      id_ContactosClientes: 0,
      Nombre: paso3.nombreFinanciero || '',
      telefono: paso3.telefono22 || '',
      email: paso3.email2 || '',
      cargo: 'Facturación',
      clientesCodigo: clientesCodigo,
      linea: 3
    },
    {
      id_ContactosClientes: 0,
      Nombre: paso3.nombreFinanciero || '',
      telefono: paso3.telefono22 || '',
      email: paso3.email3 || '',
      cargo: 'Facturación',
      clientesCodigo: clientesCodigo,
      linea: 4
    }
  ];

  // Enviar cada contacto individualmente
  contactosCliente.forEach(contacto => {
    if (contacto.Nombre || contacto.email || contacto.telefono) { // Validar si al menos hay un dato útil
      this.clienteContactoService.crear(contacto).subscribe({
        next: () => console.log(`✅ Contacto línea ${contacto.linea} creado correctamente`),
        error: (err) => console.error(`❌ Error al crear contacto línea ${contacto.linea}:`, err)
      });
    }
  });
}

enviarEmpresaAJson(): void {
  const ciudadObj = this.paso2Form.get('ciudad')?.value;
  const data = {
    status: 'ACTIVE',
    licenceKey: this.paso1Form.get('prefijo')?.value || '',
    licenseeName: this.paso2Form.get('razonSocial')?.value || '',
    licenseeGLN: this.paso1Form.get('gln')?.value || '',
    streetAddress: this.paso2Form.get('direccionPrincipal')?.value || '',
    canton: ciudadObj.canton || '',
    postalName: this.paso2Form.get('codigoPostal')?.value || '',
    ciudad: ciudadObj.ciudad || '',
    provincia: ciudadObj.provincia || '',
    postalCode: this.paso2Form.get('codigoPostal')?.value || '',
    email: this.paso3Form.get('emailRepresentante')?.value || '',
    telefono: '593' + (this.paso2Form.get('telefono2')?.value ?? ''),
    website: this.paso2Form.get('sitioWeb')?.value || '',
    dapi: this.api,  // reemplaza con tu endpoint real
    capi: this.claveApi
  };
  console.log(data);
  this.jsonEmpresaService.generarJsonEmpresa(data);
}

cargarParametroFacturaPorId(id: number): void {
    this.parametrosFacturaService.getById(id).subscribe({
      next: (parametro) => {
        // Aquí asignas el resultado a una variable del componente
        this.api = parametro.texto ?? '';
        this.claveApi = parametro.obs ?? ''; // si `valor` puede ser undefined

        console.log('✅ Parámetro cargado:', parametro);
      },
      error: (error) => {
        console.error('❌ Error al obtener el parámetro:', error);
        // Puedes mostrar un mensaje de error si deseas
      }
    });
  }

soloDigitos(ctrl: string, ev: Event, form: FormGroup) {
  const el = ev.target as HTMLInputElement;
  const limpio = el.value.replace(/\D/g, ''); // solo dígitos
  if (el.value !== limpio) {
    el.value = limpio;
    form.get(ctrl)?.setValue(limpio);
  }
}


}
