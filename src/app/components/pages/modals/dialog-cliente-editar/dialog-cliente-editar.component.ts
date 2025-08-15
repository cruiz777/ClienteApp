// Angular Core
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { forkJoin } from 'rxjs';

// Angular Forms
import { FormBuilder, FormGroup, FormControl, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
// Angular Material
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CustomMessageBoxComponent } from 'src/app/util/messages/custom-message-box.component';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { ViewChild } from '@angular/core';
// RxJS
import { BehaviorSubject, Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
const html2pdf: any = require('html2pdf.js');
import { MatStepper } from '@angular/material/stepper';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { DialogPrefijoComponent } from '../dialog-prefijo/dialog-prefijo.component';

// Servicios personalizados
import { GrupoEmpresaService, GrupoEmpresa } from '../../../../services/grupo-empresa.service';
import { GrupoProductoService, GrupoProducto } from '../../../../services/grupo-producto.service';
import { RucService } from '../../../../services/ruc.service';
import { CiudadService, Ciudad } from '../../../../services/ciudad.service';
import { UsuarioService } from '../../../../services/usuario.service';
import { ZonaService, Zona } from '../../../../services/zona.service';
import { EstadoEmpresa, EstadoEmpresaService } from 'src/app/services/estado-empresa.service';
import { ClienteIndividual, ClienteService } from 'src/app/services/cliente.service';
import { NcontrolService, NumeroControlMinDto } from 'src/app/services/ncontrol.service';
import { PrefijoService, Prefijo, PrefijoClienteResponse } from 'src/app/services/prefijo.service';
import { CedulaService } from 'src/app/services/cedula.service';
import { GenerarglnService } from 'src/app/services/generargln.service';
import { GlnService, GlnRequest } from 'src/app/services/gln.service';
import { PaisService, Pais } from 'src/app/services/pais.service';
import { HistorialClienteService, HistorialClienteRequest } from 'src/app/services/historial-cliente.service';
// Interfaces o modelos
import { ClienteRuc } from '../../../../interfaces/clienteRuc';
import { emailValidoValidator } from '../../../../util/validators';

import { Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ClienteObservacionService, ClienteObservacion } from 'src/app/services/cliente-observacion.service';
import { ModalImpresionComponent } from 'src/app/components/shared/modal-impresion/modal-impresion.component';
import { DialogPrefijoEditarComponent } from '../dialog-prefijo-editar/dialog-prefijo-editar.component';
import { ClienteDatosAdicionalesService, ClienteDatosAdicionales } from 'src/app/services/cliente-datos-adicionales.service';
import { ClienteContacto, ClienteContactoService } from 'src/app/services/cliente-contacto.service';
import { ExportService } from 'src/app/services/export.service';
import { ExportOptions } from 'src/app/interfaces/export-options';
import { EmpresaService } from 'src/app/services/empresa.service';
import { LogoService } from 'src/app/services/logo.service';
import { PermissionsService } from 'src/app/services/permission.service';
const ELEMENT_DATA: HistorialClienteRequest[] = [
  {
    id_historial_cliente: 1,
    id_usuario: 1,
    nombre_usuario: 'admin',
    fecha: '2025-05-12T14:00:00.000Z',
    descripcion: 'Cambio de razón social',
    clientes_codigo: 12345
  }
];

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
  pais: Pais[] = [];
  paisCtrl = new FormControl('');
  paisFiltrados$!: Observable<Pais[]>;
  paisSeleccionado!: number;
  paisFiltrados: Pais[] = [];
  nombreCiudadSeleccionada: string = '';
  esPasaporte = false;
  tipoIdentificacion: 'CEDULA' | 'RUC' | 'PASAPORTE' | null = null;
  botonActualizarDeshabilitado = true;
  botonModificarDeshabilitado = false;
  cargando: boolean = true;
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
  clienteE!: ClienteIndividual;
  modoEdicion = false;

  estadoEmpresa: EstadoEmpresa[] = [];
  estadoEmpresaFiltrados$!: Observable<EstadoEmpresa[]>;
  estadoEmpresaCtrl = new FormControl('');
  codigoAreaE: number | null = null;
  cambios: string[] = [];
  historial: HistorialClienteRequest[] = [];
  displayedHistorialColumns: string[] = ['nombre_usuario', 'fecha', 'descripcion'];
  dataSourceHistorial = new MatTableDataSource(ELEMENT_DATA);
  dataSourcePrefijo = new MatTableDataSource<PrefijoClienteResponse>();
  displayedPrefijoColumns: string[] = [
    'clientesCodigo',
    'codpre',
    'gln',
    'fecha',
    'estado',
    'fechaCierre',
    'tipoLocalizacion',
    'observacion',
    'orden',
    'accion'
  ];

  nombrecli: string = '';
 logoUrl: string = '';
  prefijoCliente!: PrefijoClienteResponse;

  private clienteOriginal!: ClienteIndividual;
  observaciones: ClienteObservacion[] = [];
  clienteOriginalObservacion: ClienteObservacion[] = [];
  usuarioActual = this.usuarioService.getUsuarioActual();
  contactoCliente: ClienteContacto[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('paginatorPrefijo', { static: false }) paginatorPrefijo!: MatPaginator;

  @ViewChild(MatSort) sortPrefijo!: MatSort;

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
    private dialog: MatDialog,
    private estadoempresaService: EstadoEmpresaService,
    @Inject(MAT_DIALOG_DATA) public idCliente: number,
    private paisService: PaisService,
    private historialClienteService: HistorialClienteService,
    private clienteObservacionService: ClienteObservacionService,
    private clienteDatosAdicionalesService: ClienteDatosAdicionalesService,
    private clienteContactoService: ClienteContactoService,
    private exportService: ExportService,
    private empresaService: EmpresaService,
    private logoService: LogoService,
    private permissions: PermissionsService
  ) { }

 ngOnInit(): void {
  const loadingDialog = this.dialog.open(CustomMessageBoxComponent, {
    disableClose: true,
    data: {
      title: 'Cargando Cliente...',
      message: 'Por favor espere mientras se cargan los datos del cliente.',
      type: 'info',
      isLoading: true,
      loadingText: 'Cargando información...',
      showCancel: false
    }
  });

  this.cargando = true;
  this.usuarioActual = this.usuarioService.getUsuarioActual();
  this.initFormulario();

  this.cargarGrupos();
  this.cargarGruposProducto();
  this.cargarCiudad();
  this.cargarPais();
  this.cargarZona();
  this.cargarEstadoEmpresa();
  this.activarModoEdicion();

  console.log(this.idCliente);
  this.cargarHistorial(this.idCliente, 'update', 'Clientes', 1);
  this.cargarPrefijoCliente(this.idCliente);
  this.cargarClienteYGrupos(this.idCliente);
  this.obtenerObservaciones(this.idCliente);
  this.cargarDatosAdicionales(this.idCliente);
  this.cargarContactosClientes(this.idCliente);

  this.paso2Form.get('razonSocial')?.valueChanges.subscribe(valor => {
    this.nombrecli = valor;
  });

  this.paso1Form.get('estadoEmpresa')?.valueChanges.subscribe(value => {
    this.paso2Form.get('estadoEmpresa')?.setValue(value, { emitEvent: false });
    this.paso3Form.get('estadoEmpresa')?.setValue(value, { emitEvent: false });
    this.paso4Form.get('estadoEmpresa')?.setValue(value, { emitEvent: false });
  });

  this.paso1Form.get('zona')?.valueChanges.subscribe(value => {
    this.paso2Form.get('zona')?.setValue(value, { emitEvent: false });
    this.paso3Form.get('zona')?.setValue(value, { emitEvent: false });
    this.paso4Form.get('zona')?.setValue(value, { emitEvent: false });
  });

  this.cargando = false;
  loadingDialog.close(); // ✅ cerrar el diálogo
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
        estadoEmpresa: [null],
        codigoCliente: [{ value: '', disabled: false }],
        //prefijo: [''], antes
        prefijo: [{ value: '', disabled: true }],
        prefijogs1: [''],
        origen: [''],
        gln: [''],
        fechaIng: [''],
        fechaMod: [''],
        usuarioMod: ['']
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
        observacion1: [''],
        usuario1: [''],
        fecha1: [''],
        zona: [null],
        estadoEmpresa: [null],
        pais: [''],
        nprefijo: [false],
        compra: [false],
        fechaIng: [''],
        fechaMod: [''],
        usuarioMod: ['']

      }),

      paso3: this.fb.group({
        nombreRepresentante: [null, Validators.required],
        emailRepresentante: ['', [Validators.required, emailValidoValidator()]],
        telefonoRepresentante: ['', Validators.required],

        email: ['', [emailValidoValidator()]],
        email1: ['', [Validators.required, emailValidoValidator()]],
        email2: ['', [emailValidoValidator()]],
        email3: ['', [emailValidoValidator()]],
        telefono: [''],
        nombreCodificacion: [''],
        nombreFinanciero:[null, Validators.required],

        telefono22: ['', Validators.required],
        pregunta1: [false],
        pregunta2: [false],
        pregunta3: [false],
        pregunta4: [false],
        pregunta5: [false],
        pregunta6: [false],
        pregunta7: [false],
        zona: [null],
        estadoEmpresa: [null],
        fechaIng: [''],
        fechaMod: [''],
        usuarioMod: ['']
      }),

      paso4: this.fb.group({
        observacion2: [''],
        usuario2: [''],
        fecha2: [''],
        observacion3: [''],
        usuario3: [''],
        fecha3: [''],
        observacion4: [''],
        usuario4: [''],
        fecha4: [''],
        zona: [null],
        estadoEmpresa: [null],
        fechaIng: [''],
        fechaMod: [''],
        usuarioMod: ['']
      })
    });
  }
  ngAfterViewInit(): void {
    this.dataSourceHistorial.paginator = this.paginator;
    this.dataSourceHistorial.sort = this.sort;


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

    this.cargando = false; // ✅ Se coloca dentro del subscribe
  }, error => {
    console.error('❌ Error al cargar grupoProducto', error);
    this.cargando = false; // en caso de error también
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

          const ecuador = this.pais.find(p => p.nombre.toLowerCase() === 'ecuador');
          if (ecuador) {
            console.log('🇪🇨 Ecuador encontrado y seleccionado automáticamente:', ecuador);
            this.paso2Form.get('pais')?.setValue(ecuador);
            this.codigoAreaE = ecuador.codigoArea;
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


  // obtenerUsuarioActual(): void {
  //   this.usuarioService.currentUser$.subscribe(user => {
  //     this.usuarioActual = user;

  //     console.log('Usuario Actual:', this.usuarioActual);

  //   });
  // }
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
    this.dialogRef.close("editado");
    this.router.navigate(['/codbar/ficha-de-cliente/listado-clientes']); // Redirecciona a /pages/clientes
  }
  actualizar(): void {

    if (this.formCliente.invalid) {
      this.formCliente.markAllAsTouched();
      this.mostrarAlerta('Faltan campos obligatorios por llenar', 'Formulario Incompleto');
      return;
    }

    const paso1 = this.paso1Form.value;
    const paso2 = this.paso2Form.value;
    const paso3 = this.paso3Form.value;
    const clienteId = paso1.codigoCliente; // o donde tengas almacenado el ID
    const zonaObj = paso1.zona;
    const estadoObj = paso1.estadoEmpresa;
    const ciudadObj = paso2.ciudad;
    const idCiudad = typeof ciudadObj === 'object' ? ciudadObj.id_ciudad : ciudadObj;
    const idZona = (typeof zonaObj === 'object' && zonaObj !== null) ? zonaObj.id : zonaObj;
    const idEstadoEmpresa = (typeof estadoObj === 'object' && estadoObj !== null) ? estadoObj.id : estadoObj;
    const jsonActualizar = {
      clientesCodigo: clienteId, // ✅ aquí pasas el código del cliente (ID)
      nomcli: paso2.razonSocial || '',
      dircli: paso2.direccionPrincipal || '',
      concli: paso2.nombreRepresentante || '',
      razonSocial: paso2.razonSocial || '',
      telefono1: paso2.celular,
      fax: paso3.telefonoRepresentante || '',
      web: paso2.sitioWeb || '',
      email: paso3.emailRepresentante || '',
      telefono: paso2.telefono2 || '',
      idEstadoEmpresa: idEstadoEmpresa,
      idTipoCliente: paso1.categoriaCliente,
      idGrupoProducto: paso1.grupoProducto?.id_grupo_producto || 0,
      codigoPostal: paso2.codigoPostal || '',
      idCiudad: idCiudad || 0,
      idZona: idZona,
      idGrupoEmpresa: paso1.grupo || 1,
      representante: paso2.nombreRepresentante || '',
      fechamod: this.fechaIngreso.toISOString().split('T')[0],
      usumod: this.usuarioActual?.nombre_usuario || ''
    };


    console.log('📤 Enviando actualización:', jsonActualizar);

    this.clienteService.actualizarCliente(clienteId, jsonActualizar).subscribe({
      next: (res) => {
        console.log('✅ Cliente actualizado:', res);

        this.guardarHistorial();
        this.guardarTodasLasObservaciones();
        this.guardarOActualizarDatosAdicionales();
        this.verificarYGuardarContactosCliente();
        // ✅ Esperar un poco y recargar el historial
        setTimeout(() => {
          this.cargarHistorial(this.idCliente);
        }, 300); // 🔁 Espera 300ms para que se guarde el historial antes de recargarlo

        const msg = this.modoEdicion ? 'actualizada' : 'creada';

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
        this.botonActualizarDeshabilitado = true;
        this.botonModificarDeshabilitado = false;
      },
      error: (err) => {
        console.error('❌ Error al actualizar cliente:', err);
        this.mostrarAlerta('No se pudo actualizar el cliente', 'Error');
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
    debugger
    this.clienteOriginal = JSON.parse(JSON.stringify(cliente));
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
      gln: '',
      fechaIng: cliente.fecing,
      fechaMod: cliente.fecmod && new Date(cliente.fecmod).getFullYear() === 1 ? '' : cliente.fecmod,
      usuarioMod: cliente.usumod


    });



    // Paso 2
    this.paso2Form.patchValue({
      ciudad: cliente.ciudad || '',
      razonSocial: cliente.razonSocial || '',
      nombreRepresentante: cliente.representante || '',
      direccionPrincipal: cliente.dircli || '',
      codigoPostal: cliente.codigoPostal || '',
      celular: cliente.telefono1 || '',
      sitioWeb: cliente.web,
      telefono2: cliente.telefono || '',
      usuario: '',
      fechaIng: cliente.fecing,
      fechaMod: cliente.fecmod,
      usuarioMod: cliente.usumod

    });

    // Paso 3
    this.paso3Form.patchValue({
      nombreRepresentante: cliente.representante || '',
      emailRepresentante: cliente.email || '',
      telefonoRepresentante: cliente.fax || '',
      // email: cliente.email || '',
      // telefonoc: '',
      // email1: '',
      // email2: '',
      // email3: '',
      // nombreCodificacion: '',
      // nombreFinanciero: '',
      fechaIng: cliente.fecing,
      fechaMod: cliente.fecmod,
      usuarioMod: cliente.usumod

    });

    // Paso 4
    this.paso4Form.patchValue({
      fechaIng: cliente.fecing,
      fechaMod: cliente.fecmod,
      usuarioMod: cliente.usumod

    });

    this.formCliente.markAllAsTouched();
  }


  cargarClienteYGrupos(idCliente: number): void {
    
    forkJoin({
      cliente: this.clienteService.getClienteById(idCliente),
      gruposProducto: this.grupoProductoService.obtenerGrupos(),
      gruposEmpresa: this.grupoService.obtenerGrupos(),
      zona: this.zonaService.obtenerZona(),
      ciudad: this.ciudadService.obtenerCiudad(),
      estado: this.estadoempresaService.obtenerEstadosEmpresa(),
    }).subscribe(({ cliente, gruposProducto, gruposEmpresa, zona, ciudad, estado }) => {
      this.clienteE = cliente;
      this.gruposProducto = gruposProducto;
      this.grupos = gruposEmpresa;
      this.zona = zona;
      this.ciudad = ciudad;
      this.estadoEmpresa = estado; // 👈 asegúrate de tener this.estado declarado

      this.llenarFormularioConCliente(this.clienteE);
      this.setGrupoProductoPorId(this.clienteE.idGrupoProducto);
      this.setGrupoEmpresaPorId(this.clienteE.idGrupoEmpresa);
      this.setZonaPorId(this.clienteE.idZona);
      this.setCiudadPorId(this.clienteE.idCiudad);
      this.setEstadoEmpresaPorId(this.clienteE.idEstadoEmpresa); // 👈 corrijo el método si es necesario
      
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

    console.log(id);
    const zona = this.zona.find(z => z.id === id);
    if (zona) {
      this.paso1Form.get('zona')?.setValue(zona); // ✅ pasa el objeto completo
    } else {
      console.warn('❌ No se encontró la zona con ID:', id);
    }
  }
  setEstadoEmpresaPorId(id: number): void {
    const estado = this.estadoEmpresa.find(e => e.id === id);
    console.log(estado + ' hola');

    if (estado) {
      const formularios = [this.paso1Form, this.paso2Form, this.paso3Form, this.paso4Form];
      formularios.forEach((form, index) => {
        if (form.contains('estadoEmpresa')) {
          form.get('estadoEmpresa')?.setValue(estado);
        } else {
          console.warn(`El control "estadoEmpresa" no existe en el formulario paso${index + 1}.`);
        }
      });
    } else {
      console.warn('❌ No se encontró el estado de empresa con ID:', id);
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

    this.modoEdicion = true;
    this.formCliente.enable(); // habilita todo el formulario
    this.formCliente.get('paso1.ruc')?.disable();
    this.formCliente.get('paso1.esPasaporte')?.disable();
    
  }

  desactivarModoEdicion() {
    this.modoEdicion = false;
    //this.formCliente.disable(); // deshabilita todo el formulario
  }
  cargarEstadoEmpresa(): void {
    this.estadoempresaService.obtenerEstadosEmpresa().subscribe(data => {
      this.estadoEmpresa = data;
      this.estadoEmpresaFiltrados$ = this.estadoEmpresaCtrl.valueChanges.pipe(
        startWith(''),
        map(valor => this.filtrarEstadoEmpresa(valor || ''))
      );
    });
  }


  filtrarEstadoEmpresa(valor: string): EstadoEmpresa[] {
    const filtro = valor.toLowerCase();
    return this.estadoEmpresa.filter(e =>
      e.Nombre.toLowerCase().includes(filtro)
    );
  }

  seleccionarEstadoEmpresa(estado: EstadoEmpresa): void {
    this.paso1Form.get('estadoEmpresa')?.setValue(estado);
  }
  abrirModalImpresion(): void {
    this.dialog.open(ModalImpresionComponent, {
      width: '400px',
      disableClose: true, // opcional
      data: {
        prefijos: [
          { valor: '123', descripcion: 'debo seleccionar uno de los dos' },
          { valor: '113', descripcion: 'puede haber más' }
        ]
      },
      panelClass: 'modal-superpuesto' // opcional para estilos
    });
  }

  verificarCambiosCliente(): void {
    this.cambios = [];

    const actual = {
      ...this.paso1Form.value,
      ...this.paso2Form.value,
      ...this.paso3Form.value,
      ...this.paso4Form.value
    };

    const original = this.clienteOriginal;
    const originalObseer = this.clienteOriginalObservacion;
    console.log('Valor original:', original);

    const comparar = (clave: string, originalVal: any, actualVal: any) => {
      if (JSON.stringify(originalVal) !== JSON.stringify(actualVal)) {
        this.cambios.push(`${clave}: "${originalVal}" -> "${actualVal}"`);
      }
    };

    const categoriaTexto: Record<number, string> = {
      1: 'Individual',
      2: 'Industrial'
    };

    comparar('Categoría Cliente', categoriaTexto[original.idTipoCliente], categoriaTexto[actual.categoriaCliente]);
    comparar('Grupo', this.obtenerDescripcionGrupo(original.idGrupoEmpresa), this.obtenerDescripcionGrupo(actual.grupo));
    comparar('Categoría Producto', this.obtenerDescripcionGrupoProducto(original.idGrupoProducto), this.obtenerDescripcionGrupoProducto(actual.grupoProducto?.id_grupo_producto || 0));
    comparar('Estado Empresa', this.obtenerDescripcionEstadoEmpresa(original.idEstadoEmpresa), this.obtenerDescripcionEstadoEmpresa(actual.estadoEmpresa?.id || 0));
    comparar('Zona', this.obtenerDescripcionZona(original.idZona), this.obtenerDescripcionZona(actual.zona?.id || 0));
    comparar('Ciudad', this.obtenerDescripcionCiudad(original.idCiudad), this.obtenerDescripcionCiudad(actual.ciudad?.id_ciudad || 0));
    comparar('Razón Social', original.razonSocial, actual.razonSocial);
    comparar('Representante Legal', original.representante, this.paso2Form.get('nombreRepresentante')?.value);
    comparar('Direccion', original.dircli, this.paso2Form.get('direccionPrincipal')?.value);
    comparar('CodigoPostal', original.codigoPostal, this.paso2Form.get('codigoPostal')?.value);
    comparar('Web', original.web, this.paso2Form.get('sitioWeb')?.value); // CORREGIDO: antes comparabas con 'codigoPostal'
    comparar('Celular', original.telefono1, this.paso2Form.get('celular')?.value);
    comparar('Telefono 2', original.telefono, this.paso2Form.get('telefono2')?.value);
    comparar('Telefono Representante', original.fax, this.paso3Form.get('telefonoRepresentante')?.value);
    comparar('Email Representante', original.email, this.paso3Form.get('emailRepresentante')?.value);
    this.compararObservacionLinea('Observación 1', 1, this.paso2Form, 'observacion1', originalObseer);
    this.compararObservacionLinea('Observación 2', 2, this.paso4Form, 'observacion2', originalObseer);
    this.compararObservacionLinea('Observación 3', 2, this.paso4Form, 'observacion3', originalObseer);
    this.compararObservacionLinea('Observación 4', 2, this.paso4Form, 'observacion4', originalObseer);
    if (this.cambios.length) {
      console.log('⚠️ Cambios detectados:\n' + this.cambios.join('\n'));
      // this.mostrarAlerta('Cambios detectados:\n' + this.cambios.join('\n'), 'Advertencia');
    } else {
      console.log('No se detectaron cambios', 'Sin Cambios');
    }
  }


  private obtenerDescripcionGrupo(id: number): string {
    const grupo = this.grupos.find(g => g.id_grupo_empresa === id);
    return grupo ? `${grupo.codigo} - ${grupo.nombre}` : `ID ${id}`;
  }

  private obtenerDescripcionGrupoProducto(id: number): string {
    const grupo = this.gruposProducto.find(g => g.id_grupo_producto === id);
    return grupo ? `${grupo.codigo} - ${grupo.brick} - ${grupo.desBrick}` : `ID ${id}`;
  }

  private obtenerDescripcionEstadoEmpresa(id: number): string {
    const estado = this.estadoEmpresa.find(e => e.id === id);
    return estado ? estado.Nombre : `ID ${id}`;
  }

  private obtenerDescripcionZona(id: number): string {
    const zona = this.zona.find(z => z.id === id);
    return zona ? `${zona.referencia} - ${zona.nombre}` : `ID ${id}`;
  }


  private obtenerDescripcionCiudad(id: number): string {
    const ciudad = this.ciudad.find(c => c.id_ciudad === id);
    return ciudad ? `${ciudad.ciudad} - ${ciudad.canton} - ${ciudad.provincia}` : `ID ${id}`;
  }

  guardarHistorial(): void {
    this.verificarCambiosCliente(); // ← esta función debe llenar this.cambios

    if (!this.cambios || this.cambios.length === 0) {
      console.log('⚠️ No hay cambios, no se guarda historial.');
      return;
    }

    const historial: HistorialClienteRequest = {
      id_historial_cliente: 0,
      id_usuario: 2, // TODO: usar this.usuarioActual?.id || 0
      nombre_usuario: 'mario', // TODO: usar this.usuarioActual?.usr || 'Desconocido'
      fecha: new Date().toISOString(),
      descripcion: this.cambios.join('\n'),
      clientes_codigo: this.paso1Form.get('codigoCliente')?.value,
      tabla: 'Clientes',
      tipo_accion: 'update',
      id_empresa: 1
    };

    this.historialClienteService.insertarHistorialCliente(historial).subscribe({
      next: (res) => console.log('✅ Historial guardado:', res),
      error: (err) => console.error('❌ Error al guardar historial:', err)
    });
  }


  cargarHistorial(
    clientesCodigo: number,
    tipo_accion?: string,
    tabla?: string,
    id_empresa?: number


  ): void {
    this.historialClienteService
      .obtenerHistorialPorCliente(clientesCodigo, tipo_accion, tabla, id_empresa)
      .subscribe({
        next: (data) => {
          console.log('📦 Historial recibido desde API:', data);

          this.dataSourceHistorial = new MatTableDataSource(data);

          // 🔍 Filtro personalizado
          this.dataSourceHistorial.filterPredicate = (
            data: HistorialClienteRequest,
            filter: string
          ) => {
            const fechaFormateada = new Date(data.fecha).toLocaleDateString('es-EC');
            const dataStr = `${fechaFormateada} ${data.nombre_usuario} ${data.descripcion}`.toLowerCase();
            return dataStr.includes(filter.trim().toLowerCase());
          };

          this.dataSourceHistorial.paginator = this.paginator;
          this.dataSourceHistorial.sort = this.sort;

          console.log('🧾 Datos en dataSourceHistorial:', this.dataSourceHistorial.data);
        },
        error: (err) => {
          console.error('❌ Error al obtener historial:', err);
        }
      });
  }





  tieneHistorial(): boolean {
    return !!this.dataSourceHistorial?.data && this.dataSourceHistorial.data.length > 0;
  }

  aplicarFiltro(valor: string): void {
    this.dataSourceHistorial.filter = valor.trim().toLowerCase();
  }

  cargarPrefijoCliente(codigoCliente: number): void {
    this.prefijoService.obtenerPorClienteCodigo(codigoCliente).subscribe({
      next: (data) => {
        console.log('📦 Datos del cliente con prefijo:-->', data);

        // Asegurar que data es un arreglo
        const datos = Array.isArray(data) ? data : [];

        this.dataSourcePrefijo = new MatTableDataSource(datos);

        // Filtro opcional
        this.dataSourcePrefijo.filterPredicate = (item: PrefijoClienteResponse, filter: string) => {
          const dataStr = `${item.nomcli} ${item.ruccli} ${item.gln} ${item.codpre}`.toLowerCase();
          return dataStr.includes(filter.trim().toLowerCase());
        };

        // 👇 Aquí el setTimeout para asegurar que el paginador ya está disponible
        setTimeout(() => {
          if (this.paginatorPrefijo && this.sortPrefijo) {
            this.dataSourcePrefijo.paginator = this.paginatorPrefijo;
            this.dataSourcePrefijo.sort = this.sortPrefijo;
          }
        }, 0);
      },
      error: (err) => {
        console.error('❌ Error al obtener prefijo del cliente:', err);
      }
    });
  }


  onTabChange(event: any): void {
    if (event.index === 2) { // Índice del tab "Prefijos"
      setTimeout(() => {
        if (this.paginatorPrefijo && this.sortPrefijo) {
          this.dataSourcePrefijo.paginator = this.paginatorPrefijo;
          this.dataSourcePrefijo.sort = this.sortPrefijo;
        }
      }, 0);
    }
  }

  abrirModalPrefijo(): void {
    const dialogRef = this.dialog.open(DialogPrefijoComponent, {
      width: '920px', // Aumenta el ancho del diálogo

      height: '60vh', // ✅ que use casi toda la pantalla
      maxHeight: '60vh',
      disableClose: true,
      data: {
        idCliente: this.idCliente, // ✅ aquí va tu parámetro

      },
      panelClass: 'modal-superpuesto'
    });

    dialogRef.afterClosed().subscribe(resultado => {
      if (resultado) {
        console.log('Prefijo seleccionado:', resultado);
        this.cargarPrefijoCliente(this.idCliente);// puedes usar resultado para otra lógica
      }
    });
  }

  abrirModalPrefijoEditar(codpre: string): void {
    const dialogRef = this.dialog.open(DialogPrefijoEditarComponent, {
      width: '800px',
      height: '55vh',
      maxHeight: '55vh',
      disableClose: true,
      data: {
        codpre: codpre, // ✅ aquí va el valor correcto
      },
      panelClass: 'modal-superpuesto'
    });

    dialogRef.afterClosed().subscribe(resultado => {
      if (resultado) {
        console.log('Prefijo seleccionado:', resultado);
        this.cargarPrefijoCliente(this.idCliente);
      }
    });
  }

  obtenerObservaciones(clientesCodigo: number): void {
    this.clienteObservacionService.getObservacionesPorClienteCodigo(clientesCodigo).subscribe({
      next: (data) => {
        this.paso2Form.patchValue({ observacion1: '' });
        this.paso4Form.patchValue({
          observacion2: '',
          observacion3: '',
          observacion4: '',
          fecha2: '',
          fecha3: '',
          fecha4: '',
          usuario2: '',
          usuario3: '',
          usuario4: ''
        });

        data.forEach(obs => {
          const texto = obs.Detalle?.trim() ?? '';
          const linea = obs.linea;
          const fecha = obs.fecha;
          const usuario = obs.nombreUsuario;
          const fechaFormateada = new Date(fecha).toLocaleDateString('es-EC');

          const setIfEmpty = (form: FormGroup, control: string, valor: any) => {
            const actual = form.get(control)?.value;
            if (!actual || actual.trim?.() === '') {
              form.get(control)?.setValue(valor);
            }
          };

          if (texto === '') return; // 👈 si detalle está vacío, no hagas nada

          switch (linea) {
            case 1:
              setIfEmpty(this.paso2Form, 'observacion1', texto);
              setIfEmpty(this.paso2Form, 'usuario1', usuario);
              break;
            case 2:
              setIfEmpty(this.paso4Form, 'observacion2', texto);
              setIfEmpty(this.paso4Form, 'fecha2', fechaFormateada);
              setIfEmpty(this.paso4Form, 'usuario2', usuario);
              break;
            case 3:
              setIfEmpty(this.paso4Form, 'observacion3', texto);
              setIfEmpty(this.paso4Form, 'fecha3', fechaFormateada);
              setIfEmpty(this.paso4Form, 'usuario3', usuario);
              break;
            case 4:
              setIfEmpty(this.paso4Form, 'observacion4', texto);
              setIfEmpty(this.paso4Form, 'fecha4', fechaFormateada);
              setIfEmpty(this.paso4Form, 'usuario4', usuario);
              break;
            default:
              console.warn('❓ Línea no reconocida:', linea);
              break;
          }
        });

      },
      error: (err) => {
        console.error('❌ Error al obtener observaciones:', err);
      }
    });
  }


  compararObservacionLinea(
    nombre: string,
    linea: number,
    formGroup: FormGroup,
    campo: string,
    observacionesOriginales: ClienteObservacion[]
  ): void {
    const original = observacionesOriginales.find(o => o.linea === linea)?.Detalle ?? '';
    const actual = formGroup.get(campo)?.value ?? '';

    if (original.trim() !== actual.trim()) {
      this.cambios.push(`${nombre}: "${original}" -> "${actual}"`);
    }
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
      this.clienteObservacionService.getObservacionesPorClienteCodigo(clientesCodigo).subscribe({
        next: lista => {
          const existe = lista.find(o => o.linea === obs.linea);

          if (existe) {
            // ✅ Actualizar si existe
            const body = {
              Detalle: obs.Detalle,
              Fecha: obs.fecha,
              IdUsuario: obs.idUsuario,
              NombreUsuario: obs.nombreUsuario
            };

            this.clienteObservacionService.actualizarObservacion(clientesCodigo, obs.linea, body).subscribe({
              next: () => console.log(`🔄 Línea ${obs.linea} actualizada`),
              error: err => console.error(`❌ Error al actualizar línea ${obs.linea}`, err)
            });
          } else {
            // ✅ Insertar si no existe
            this.clienteObservacionService.enviarObservacion(obs).subscribe({
              next: () => console.log(`➕ Línea ${obs.linea} creada`),
              error: err => console.error(`❌ Error al crear línea ${obs.linea}`, err)
            });
          }
        },
        error: err => {
          console.error(`❌ Error al verificar existencia de línea ${obs.linea}`, err);
        }
      });
    });
  }

  cargarDatosAdicionales(clientesCodigo: number): void {
    if (!clientesCodigo) {
      console.warn('⚠️ No hay código de cliente definido.');
      return;
    }

    this.clienteDatosAdicionalesService.obtenerPorClienteCodigo(clientesCodigo).subscribe({
      next: (datos) => {
        console.log('✅ Datos adicionales cargados:', datos);

        // ✅ Asegurar valores booleanos para checkboxes
        const paso3Patch = {
          pregunta1: datos.expprod === true,
          pregunta2: datos.vendeus === true,
          pregunta3: datos.medico === true,
          pregunta4: datos.gs1ec === true,
          pregunta5: datos.instagram === true,
          pregunta6: datos.facebook === true,
          pregunta7: datos.web === true// <-- o puedes omitirlo si `web` no es binario
        };

        const paso2Patch = {
          nprefijo: !!datos.prefijo,
          compra: !!datos.guia
        };

        // ✅ Usar setTimeout por si los formularios aún no se renderizan completamente
        setTimeout(() => {
          this.paso3Form.patchValue(paso3Patch);
          this.paso2Form.patchValue(paso2Patch);
        }, 0);
      },
      error: (err) => {
        console.error('❌ Error al cargar datos adicionales:', err);
      }
    });
  }

  guardarOActualizarDatosAdicionales(): void {
    const paso1 = this.paso1Form.value;
    const paso2 = this.paso2Form.value;
    const paso3 = this.paso3Form.value;
    const clientesCodigo = paso1.codigoCliente || 0;

    const datosAdicionales: ClienteDatosAdicionales = {
      idDatosAdicionales: 0, // se ignora en update por código
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

    // 1️⃣ Primero intentamos obtener por código
    this.clienteDatosAdicionalesService.obtenerPorClienteCodigo(clientesCodigo).subscribe({
      next: (existente) => {
        if (existente) {
          // ✅ Si ya existe, actualizamos
          this.clienteDatosAdicionalesService.actualizarPorClienteCodigo(clientesCodigo, datosAdicionales).subscribe({
            next: () => console.log('🔄 Datos actualizados correctamente'),
            error: (err) => console.error('❌ Error al actualizar:', err)
          });
        } else {
          // ⚠️ Nunca debería pasar si existe pero just in case
          this.crearDatos(datosAdicionales);
        }
      },
      error: (err) => {
        if (err.status === 404) {
          // ✅ No existe → crear
          this.crearDatos(datosAdicionales);
        } else {
          console.error('❌ Error al verificar existencia:', err);
        }
      }
    });
  }

  // 🔧 Método de apoyo para crear
  private crearDatos(datos: ClienteDatosAdicionales): void {
    this.clienteDatosAdicionalesService.crear(datos).subscribe({
      next: () => console.log('🆕 Datos creados correctamente'),
      error: (err) => console.error('❌ Error al crear datos adicionales:', err)
    });
  }

  cargarContactosClientes(clientesCodigo: number): void {
    this.clienteContactoService.getByClienteCodigo(clientesCodigo).subscribe({
      next: (data) => {
        this.contactoCliente = data;
        console.log('✅ Contactos recibidos:', data);

        const paso3Patch: any = {};

        data.forEach(contacto => {
          switch (contacto.linea) {
            case 1:
              paso3Patch.email = contacto.email;
              paso3Patch.nombreCodificacion = contacto.Nombre;
              paso3Patch.telefono = contacto.telefono;
              break;
            case 2:
              paso3Patch.email1 = contacto.email;
              paso3Patch.nombreFinanciero = contacto.Nombre;
              break;
            case 3:
              paso3Patch.email2 = contacto.email;
              paso3Patch.telefono22 = contacto.telefono;
              break;
            case 4:
              paso3Patch.email3 = contacto.email;
              break;
          }
        });

        // Aplicar al formulario reactivo
        this.paso3Form.patchValue(paso3Patch);
      },
      error: (err) => {
        console.error('❌ Error al obtener contactos del cliente:', err);
      }
    });
  }

  verificarYGuardarContactosCliente(): void {
    const paso1 = this.paso1Form.value;
    const paso3 = this.paso3Form.value;
    const clientesCodigo = paso1.codigoCliente || 0;

    const contactosCliente: ClienteContacto[] = [
      {
        id_ContactosClientes: 0,
        Nombre: paso3.nombreCodificacion || '',
        telefono: paso3.telefono || '',
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

    this.clienteContactoService.getByClienteCodigo(clientesCodigo).subscribe({
      next: (existentes) => {
        contactosCliente.forEach(contacto => {
          const existe = existentes.find(c =>
            c.clientesCodigo === contacto.clientesCodigo &&
            c.linea === contacto.linea
          );

          if (contacto.Nombre || contacto.email || contacto.telefono) {
            if (existe) {
              // Si existe, actualizar
              this.clienteContactoService.update(contacto).subscribe({
                next: () => console.log(`🔁 Contacto línea ${contacto.linea} actualizado`),
                error: (err) => console.error(`❌ Error al actualizar contacto línea ${contacto.linea}:`, err)
              });
            } else {
              // Si no existe, crear
              this.clienteContactoService.crear(contacto).subscribe({
                next: () => console.log(`✅ Contacto línea ${contacto.linea} creado`),
                error: (err) => console.error(`❌ Error al crear contacto línea ${contacto.linea}:`, err)
              });
            }
          }
        });
      },
      error: (err) => {
        console.error('❌ Error al obtener contactos existentes:', err);
      }
    });
  }

  habilitarActualizar() {
    this.botonActualizarDeshabilitado = false;
    this.botonModificarDeshabilitado = true;
  }

logo()
  {
      this.empresaService.getEmpresas().subscribe({
      next: (empresas) => {
        if (empresas.length > 0 && empresas[0].empresaLogo) {
          this.logoUrl = this.logoService.getLogoUrl(empresas[0].empresaLogo);
          console.log('Logo cargado desde empresa:', this.logoUrl);
        } else {
          console.warn('No se encontró empresa o logo.');
        }
      },
      error: (err) => {
        console.error('Error al cargar empresa para obtener logo:', err);
      }
    });
  }
  exportar(tipo: 'excel' | 'pdf'): void {
  const headers = [
    'Prefijo',
    'GLN',
    'Fecha',
    'Estado',
    'Fecha Cierre',
    'Tipo',
    'Observación'
  ];

  const columns = [
    'codpre',
    'gln',
    'fecha',
    'estadoTexto',
    'fechaCierreTexto',
    'tipoLocalizacion',
    'observacion'
  ];

  const data = this.dataSourcePrefijo.data.map((el: any) => ({
    codpre: el.codpre,
    gln: el.gln,
    fecha: this.formatearFecha(el.fecha),
    estadoTexto: el.estado ? 'Inactivo' : 'Activo',
    fechaCierreTexto: this.formatearFecha(el.fechaCierre),
    tipoLocalizacion: el.tipoLocalizacion,
    observacion: el.observacion,
    orden:el.orden
  }));

  const options: ExportOptions = {
    data,
    columns,
    headers,
    filename: 'ListadoPrefijos',
    title: 'Listado de Prefijos',
    logoUrl: this.logoUrl || ''
  };

  if (tipo === 'excel') {
    this.exportService.exportarExcel(options);
  } else {
    this.exportService.exportarPDF(options);
  }
}

// Utilidad para formatear fecha a dd/MM/yyyy
private formatearFecha(fecha: string | Date): string {
  if (!fecha || fecha === '0001-01-01T00:00:00') return '';
  const d = new Date(fecha);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
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
