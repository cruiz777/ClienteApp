import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { GrupoEmpresaService, GrupoEmpresa } from '../../../../services/grupo-empresa.service';
import { GrupoProductoService, GrupoProducto } from '../../../../services/grupo-producto.service';
import { RucService } from '../../../../services/ruc.service';
import { Ciudad, CiudadService } from '../../../../services/ciudad.service';
import { UsuarioService } from '../../../../services/usuario.service';
import { ZonaService, Zona } from '../../../../services/zona.service';
import { map, startWith } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { MatDialogRef } from '@angular/material/dialog';
import { BehaviorSubject } from 'rxjs';
import { ClienteService } from 'src/app/services/cliente.service';
import { MatSnackBar } from '@angular/material/snack-bar';
@Component({
  selector: 'app-dialog-cliente',
  templateUrl: './dialog-cliente.component.html',
  styleUrls: ['./dialog-cliente.component.css']
})
export class DialogClienteComponent implements OnInit {
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
  usuarioActual: { id: number; usr: string } | null = null;

  zona: Zona[] = [];
  zonaCtrl = new FormControl('');
  zonaFiltrados$!: Observable<Zona[]>;
  ZonaSeleccionado!: number;

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
    private _snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.initFormulario();

    this.obtenerUsuarioActual();
    this.cargarGrupos();
    this.cargarGruposProducto();
    this.cargarCiudad();
    this.cargarZona();
  }

  initFormulario(): void {
    this.formCliente = this.fb.group({
      paso1: this.fb.group({
        ruc: ['', Validators.required],
        categoriaCliente: [null, Validators.required],
        grupo: [null, Validators.required],
        grupoProducto: [null, Validators.required],
        prefix: ['', Validators.required],
        zona:[null]
      }),
      paso2: this.fb.group({
        direccion: [''],
        p_emision: [''],
        ciudad: ['', Validators.required],
        razonSocial: [null],
        nombreRepresentante: [null,Validators.required],
        direccionPrincipal: ['',Validators.required],
        codigoPostal: [''],
        celular: ['', Validators.required],
        sitioWeb: [''],
        telefono2: [''], 
        usuario: [{ value: '', disabled: true }],
        observacion1: ['']

      }),
      paso3: this.fb.group({
        nombreRepresentante: [null,Validators.required],
        emailRepresentante: ['',Validators.required],
        telefonoRepresentante: ['',Validators.required],
        nombreCodificacion: [''],
        email: [''],
        telefono: [''],
        nombreFinanciero: [''],
        email1: [''],
        email2: [''],
        email3: [''],
        telefono2: [''],
        pregunta1: [false],
        pregunta2: [false],
        pregunta3: [false],
        pregunta4: [false],
        pregunta5: [false],
        pregunta6: [false],
      }),
      paso4: this.fb.group({
        observacion2: [''],
        observacion3: [''],
        observacion4: [''],
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
    this.rucService.obtenerDatosRuc(ruc).subscribe(data => {
      this.razonSocial = data.razonSocial;
      this.nombreRepresentante = data.nombre;
  
      this.paso2Form.patchValue({
        razonSocial: this.razonSocial,
        nombreRepresentante: this.nombreRepresentante
      });
  
      this.paso3Form.patchValue({
        nombreRepresentante: this.nombreRepresentante
      });
  
      console.log(`✅ Datos RUC`, data);
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
            (c.ciudad + ' ' + c.canton + ' ' + c.provincia).toLowerCase().includes(texto)
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

    if (this.esPasaporte) {
      this.rucControl.clearValidators();
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
    if (!this.esPasaporte && /^\d{13}$/.test(valor)) {
      this.buscarRuc(valor);
    } else if (!this.esPasaporte && /^\d{10}$/.test(valor)) {
      this.buscarCedula(valor);
    }
  }



  buscarCedula(cedula: string): void {
    console.log('🔎 Buscando Cédula:', cedula);
    // llamada al servicio
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
    this.paso2Form.get('zona')?.setValue(zona);
  }

  cancelar(): void {
    this.dialogRef.close(); // Cierra el diálogo
    this.router.navigate(['/pages/clientes']); // Redirecciona a /pages/clientes
  }
  guardar(): void {
    const paso1 = this.paso1Form.value;
    const paso2 = this.paso2Form.value;
    const paso3 = this.paso3Form.value;
    const paso4 = this.paso4Form.value;




    const ciudadObj = paso2.ciudad;
    const ciudadNombre = typeof ciudadObj === 'object' ? ciudadObj.ciudad : ciudadObj;
    const idCiudad = typeof ciudadObj === 'object' ? ciudadObj.id_ciudad : 0;
    const grupoProductoObj = paso1.grupoProducto;
    const idGrupoProducto = typeof grupoProductoObj === 'object' ? grupoProductoObj.id : grupoProductoObj || 0;
    const zonaObj = paso1.zona;
    const idZona = typeof zonaObj === 'object' ? zonaObj.id_zona : 0;

    const jsonCliente = {

      nomcli: paso2.razonSocial || '',
      dircli: paso2.direccionPrincipal || '',
      concli: paso2.nombreRepresentante || '',
      email: paso3.email || '',
      telefono: paso3.telefono || '',
      telefono1: paso2.telefono2 || '',
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
      idZona: paso1.zona.id,
      idGrupoEmpresa: paso1.grupo || 1,
      representante: paso2.nombreRepresentante || ''
    };

    console.log('📤 Enviando cliente:', jsonCliente);

    this.clienteService.guardarCliente(jsonCliente).subscribe({
      next: (res) => {
        this.mostrarAlerta('Informacion Guardada','OK');
      this.dialogRef.close(); // Cierra el modal
      this.router.navigate(['/pages/clientes']); // Redirecciona
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

}