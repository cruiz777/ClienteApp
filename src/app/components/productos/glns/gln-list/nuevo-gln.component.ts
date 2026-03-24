// GLNComponent unificado con navegación, paso a paso y GLNs por prefijo
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { PrefijoService } from 'src/app/services/prefijo.service';
import { TipoLocalizacionService } from 'src/app/services/tipo-localizacion.service';
import { ClienteSeleccionadoService } from 'src/app/services/cliente-seleccionado.service';
import { CiudadService } from 'src/app/services/ciudad.service';
import { TipoLocalizacionResponse } from 'src/app/interfaces/responses/tipo-localizacion-response';
import { PrefijoClienteResponse } from 'src/app/interfaces/responses/PrefijoClienteResponse';
import { Cliente } from 'src/app/interfaces/cliente';
import { CiudadResumen } from 'src/app/interfaces/responses/ciudad-response';
import { combineLatest, distinctUntilChanged, startWith, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { GlnRequest, GlnResponse, GlnService } from 'src/app/services/gln.service';
import { PaisService, Pais } from 'src/app/services/pais.service';
import { CustomValidators } from 'src/app/components/utils/validators/validator.util';
import { CustomMessageBoxComponent } from 'src/app/util/messages/custom-message-box.component';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ToastrService } from 'ngx-toastr';
import { RequiredFieldsToastService } from 'src/app/components/utils/messages/required-fields-toast.service';
import { ExportService } from 'src/app/services/export.service';
import { LogoService } from 'src/app/services/logo.service';
import { EmpresaService } from 'src/app/services/empresa.service';
import { Router } from '@angular/router';
import { PermissionsService } from 'src/app/services/permission.service';

@Component({
  selector: 'app-nuevo-gln',
  templateUrl: './nuevo-gln.component.html',
  styleUrls: ['./nuevo-gln.component.css']
})
export class GlnComponent implements OnInit {
  formGln!: FormGroup;
  pasoActual: number = 1;
  guardando: boolean = false;
  public CustomValidators = CustomValidators;
  tiposLocalizacion: TipoLocalizacionResponse[] = [];
  prefijos: PrefijoClienteResponse[] = [];
  ciudades: CiudadResumen[] = [];
  ciudadesFiltradas: CiudadResumen[] = [];
  paises: Pais[] = [];
  provincias: { id: number; nombre: string }[] = [];
  provinciasFiltradas: { id: number; nombre: string }[] = [];
  cantones: { id: number; nombre: string }[] = [];

  clienteActual: Cliente | null = null;
  activeTab: string = 'Informacion'; // valores posibles: 'Informacion' | 'GLNs'

  glnsDelPrefijo: GlnResponse[] = [];   
  glnsPorPrefijo: GlnResponse[] = [];   
  glnIndex: number = 0;
  alertaGln: string | null = null;
  modoEdicion: boolean = false;
  ciudadesCargadas = false;
  evitandoEventos = false;
  evitandoEventosUbicacion = false;
  ciudadAutocompleteControl = new FormControl<CiudadResumen | string>(''); 
  filtroGLN: string = '';
  glnsFiltrados: GlnResponse[] = [];
  glnsPorCliente: GlnResponse[] = [];
  logoUrl: string = '';

  //Para la secuencia manual
  usarSecuenciaManual: boolean = false;
  secuenciaManual: number | null = null;
  validandoSecuencia: boolean = false;
  secuenciaValida: boolean = false;
  mensajeSecuencia: string = '';
  private secuenciaSubject = new Subject<number>();
  constructor(
    private fb: FormBuilder,
    private prefijoService: PrefijoService,
    private tipoLocalizacionService: TipoLocalizacionService,
    private clienteSeleccionadoService: ClienteSeleccionadoService,
    private ciudadService: CiudadService,
    private glnService: GlnService,
    private paisService: PaisService,
    private empresaService: EmpresaService,
    private logoService: LogoService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private toastr: ToastrService,
    private toastCampos: RequiredFieldsToastService,
    private exportService: ExportService,
    private router: Router,
    public permissions: PermissionsService
  ) {}

  compareCiudad(a: any, b: any): boolean {
    return a != null && b != null && +a === +b;
  }
  compareProvincia = (a: string, b: string) => 
    a?.trim().toUpperCase() === b?.trim().toUpperCase();
  compareCanton: (a: string, b: string) => boolean = (a, b) =>
    a?.trim().toUpperCase() === b?.trim().toUpperCase();

  ngOnInit(): void {
    this.inicializarFormulario();
    this.clienteActual = this.clienteSeleccionadoService.obtenerClienteActual();

    if (this.clienteActual) {
      const clienteCodigo = this.clienteActual.clientes_codigo;

      this.formGln.patchValue({
        clientesCodigo: clienteCodigo,
        documentoIdentidad: this.clienteActual.ruc,
        nomCli: this.clienteActual.nomcli
      });

      this.tipoLocalizacionService.getAll().subscribe({
        next: (res) => this.tiposLocalizacion = res.data,
        error: (err) => console.error('❌ Error al cargar tipos de localización', err)
      });

      this.prefijoService.obtenerPrefijosGlnPorClienteCodigo(clienteCodigo).subscribe({
        next: (res) => {
          this.prefijos = res;
          
          // ✅ CORRECTO: Actualizar clienteActual con datos completos
          if (res.length > 0 && this.clienteActual) {
            this.clienteActual = {
              ...this.clienteActual,
              representante: res[0].representante,
              telefono: res[0].telefono,
              ruc: res[0].ruccli || this.clienteActual.ruc
            };
          }

          // ✅ Solo actualizar campos del GLN en el formulario
          if (res.length > 0) {
            this.formGln.patchValue({
              glnPrefijogs1: res[0].codpre,
              glnOrigenprefijo: res[0].origenPrefijo,
              idPrefijos: +res[0].id_prefijos
            });
          }
        },
        error: (err) => console.error('❌ Error al cargar prefijos', err)
      });

      let ultimoPrefijo: number | null = null;

      this.formGln.get('idPrefijos')?.valueChanges
        .pipe(distinctUntilChanged())
        .subscribe((idPrefijo: number) => {
          if (!idPrefijo || idPrefijo === ultimoPrefijo || !this.ciudadesCargadas) return;

          ultimoPrefijo = idPrefijo;
          this.alertaGln = null;
          this.cargarGlnDesdePrefijos(idPrefijo);
      });
    }

    this.ciudadService.getCiudades().subscribe({
      next: (res) => {
        this.ciudades = res.map(c => ({ ...c, id: +c.id }));
        const idCiudadInicial = +this.formGln.get('idCiudad')?.value;
        if (idCiudadInicial && this.ciudades.length > 0) {
          const ciudadSeleccionada = this.ciudades.find(c => c.id === idCiudadInicial);
          if (ciudadSeleccionada) {
            this.setUbicacionDesdeCiudad(ciudadSeleccionada);
            this.ciudadAutocompleteControl.setValue(ciudadSeleccionada, { emitEvent: false });

            this.ciudadesFiltradas = this.ciudades.filter(c =>
              c.provincia === ciudadSeleccionada.provincia &&
              c.canton === ciudadSeleccionada.canton
            );
          }
        }


        this.ciudadAutocompleteControl.valueChanges
        .pipe(distinctUntilChanged())
        .subscribe(valor => {
          if (typeof valor === 'string') {
            const filtro = valor.toLowerCase();
            this.ciudadesFiltradas = this.ciudades.filter(c =>
              (c.ciudad + c.canton + c.provincia).toLowerCase().includes(filtro)
            );
            this.formGln.patchValue({ idCiudad: null }); //Fuerza la validacion
          } else if (valor && typeof valor === 'object' && 'id' in valor) {
            this.formGln.patchValue({ idCiudad: valor.id });
          }
        });

        this.ciudadesCargadas = true;

        this.paisService.obtenerPaises().subscribe({
          next: (res: Pais[]) => {
            this.paises = res;
            const ecuador = res.find(p => p.nombre.toUpperCase() === 'ECUADOR');
            if (ecuador) {
              this.formGln.patchValue({
                idPais: ecuador.idPais,
                provinciaCodigo: 'PICHINCHA',
                cantonCodigo: 'QUITO'
              });
            }

            // Ahora que ya están cargadas las ciudades y países, puedes cargar el GLN
            const idPrefijo = this.formGln.value.idPrefijos;
            if (idPrefijo) this.cargarGlnDesdePrefijos(idPrefijo);
          },
          error: (err) => console.error('❌ Error al obtener países:', err)
        });
      },
      error: (err) => console.error('❌ Error al cargar ciudades', err)
    });

    this.formGln.get('glnLatitud')?.valueChanges
    .pipe(distinctUntilChanged())
    .subscribe(value => {
      if (typeof value === 'string' && value.includes(',')) {
        const partes = value.split(',').map(p => p.trim());
        const lat = partes[0];
        const lng = partes[1];

        if (!isNaN(+lat) && !isNaN(+lng)) {
          this.formGln.patchValue({
            glnLatitud: lat,
            glnLongitud: lng
          });
          this.convertirALatitudGMS(lat);
          this.convertirALongitudGMS(lng);
          return;
        }
      }

      // Si no hay coma, procesa como latitud sola
      this.convertirALatitudGMS(value);
    });

    this.formGln.get('glnLongitud')?.valueChanges
      .pipe(distinctUntilChanged())
      .subscribe(value => this.convertirALongitudGMS(value));


    this.formGln.get('idPais')?.valueChanges.subscribe(paisSeleccionado => {
      if (this.evitandoEventosUbicacion) return; 
      const pais = this.paises.find(p => p.idPais === +paisSeleccionado);

      this.provinciasFiltradas = this.ciudades
        .filter(c => pais && c.pais.toUpperCase().trim() === pais.nombre.toUpperCase().trim()) // 🔥 normalizado
        .map(c => c.provincia)
        .filter((v, i, a) => a.indexOf(v) === i)
        .map((nombre, idx) => ({ id: idx + 1, nombre }));

      this.formGln.patchValue({ provinciaCodigo: '', cantonCodigo: '', idCiudad: null });
      this.cantones = [];
      this.ciudadesFiltradas = [];
    });


    this.formGln.get('provinciaCodigo')?.valueChanges.subscribe(provinciaSeleccionada => {
      if (this.evitandoEventosUbicacion) return; 
      this.cantones = this.ciudades
        .filter(c => c.provincia === provinciaSeleccionada)
        .map(c => c.canton)
        .filter((v, i, a) => a.indexOf(v) === i)
        .map((nombre, idx) => ({ id: idx + 1, nombre }));

      this.formGln.patchValue({ cantonCodigo: '', idCiudad: null });
      this.ciudadesFiltradas = [];
    });
    this.empresaService.getEmpresas().subscribe({
      next: (empresas) => {
        if (empresas.length > 0 && empresas[0].empresaLogo) {
          const logo = this.logoService.getLogoUrl(empresas[0].empresaLogo);
          this.formGln.patchValue({ glnLogo: logo }); // opcional si quieres guardarlo
          this.logoUrl = logo; // << almacénalo para usar al exportar
        } else {
          console.warn('No se encontró empresa o logo');
        }
      },
      error: (err) => {
        console.error('❌ Error al cargar logo dinámico:', err);
      }
    });

    combineLatest([
      this.formGln.get('provinciaCodigo')!.valueChanges.pipe(startWith(this.formGln.get('provinciaCodigo')!.value), distinctUntilChanged()),
      this.formGln.get('cantonCodigo')!.valueChanges.pipe(startWith(this.formGln.get('cantonCodigo')!.value), distinctUntilChanged())
    ]).subscribe(([provincia, canton]) => {
      if (this.evitandoEventosUbicacion) return; 
      this.ciudadesFiltradas = this.ciudades.filter(c => c.provincia === provincia && c.canton === canton);
      const ciudadActual = this.formGln.get('idCiudad')?.value;
      const ciudadValida = this.ciudadesFiltradas.some(c => c.id === +ciudadActual);
      if (!ciudadValida && this.ciudadesFiltradas.length > 0) {
        this.formGln.patchValue({ idCiudad: this.ciudadesFiltradas[0].id });
      }
    });
    combineLatest([
      this.formGln.get('latiG')!.valueChanges,
      this.formGln.get('latiM')!.valueChanges,
      this.formGln.get('latiS')!.valueChanges,
      this.formGln.get('latiE')!.valueChanges,
      this.formGln.get('longG')!.valueChanges,
      this.formGln.get('longM')!.valueChanges,
      this.formGln.get('longS')!.valueChanges,
      this.formGln.get('longE')!.valueChanges
    ]).subscribe(() => {
      if (this.modoEdicion) {
        this.convertirGMSaCoordenadas();
      }
    });
    if (this.activeTab === 'GLNs') {
      this.cargarGlnsPorCliente();
    }
    this.formGln.get('idCiudad')?.valueChanges
      .pipe(distinctUntilChanged())
      .subscribe(ciudadId => {
        if (this.evitandoEventosUbicacion) return;
        // Validar ciudad y que ya no esté cargada
        if (!ciudadId || ciudadId === 0 || !this.ciudadesCargadas) return;

        const ciudad = this.ciudades.find(c => c.id === +ciudadId);
        if (!ciudad) return;

        // 🚫 Solo actúa si cambia manualmente, no cuando fue seteada por patchValue con emitEvent: false
        if (
          this.formGln.get('provinciaCodigo')?.value === ciudad.provincia &&
          this.formGln.get('cantonCodigo')?.value === ciudad.canton
        ) return;

        const paisObj = this.paises.find(p => p.nombre.toUpperCase() === ciudad.pais.toUpperCase());
        this.formGln.patchValue({
          idPais: paisObj?.idPais ?? null,
          provinciaCodigo: ciudad.provincia,
          cantonCodigo: ciudad.canton
        }, { emitEvent: false });
    });
    setTimeout(() => {
      const idPrefijo = this.formGln.get('idPrefijos')?.value;
      if (idPrefijo) this.cargarGlnDesdePrefijos(idPrefijo);
    }, 0);
    this.bloquearCamposPaso(2, true); // bloquear contactos
    this.bloquearCamposPaso(3, true); // bloquear certificados
    // ✅ Validación en tiempo real con debounce para secuencia manual
    this.secuenciaSubject.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(secuencia => {
      if (secuencia > 0) {
        this.validarSecuenciaEnTiempoReal(secuencia);
      }
    });
  }

  
  mostrarCiudad = (ciudad: CiudadResumen | string | null): string =>
    typeof ciudad === 'string'
      ? ciudad
      : ciudad
        ? `${ciudad.ciudad} - ${ciudad.canton} - ${ciudad.provincia}`
        : '';

  seleccionarCiudadAutocomplete(ciudad: CiudadResumen): void {
    if (!ciudad) return;
    this.setUbicacionDesdeCiudad(ciudad);
    this.formGln.patchValue({ idCiudad: ciudad.id });
  }
  
  cargarDatosDesdeGlnResponse(gln: GlnResponse): void {
    this.formGln.patchValue({
      idGln: gln.id_gln,
      localizacion: gln.nombreLocalizacion,
      idPais: gln.idPais,
      idCiudad: gln.idCiudad,
      glnCodigopostal: gln.glnCodigopostal,
      direccion: gln.direccion,
      glnLatitud: gln.glnLatitud?.toString() ?? '',
      glnLongitud: gln.glnLongitud?.toString() ?? '',
      telefono: gln.telefono,
      fax: gln.fax,
      email: gln.email,
      web: gln.web,
      contacto: gln.contacto,
      contactoTel: gln.contactoTel,
      glnCelular: gln.glnCelular,
      glnContacto2: gln.glnContacto2,
      glnEmail2: gln.glnEmail2,
      glnTel2: gln.glnTel2,
      glnContacto3: gln.glnContacto3,
      glnEmail3: gln.glnEmail3,
      glnTel3: gln.glnTel3,
      fda: gln.fda,
      europa: gln.europa,
      glnGlobal: gln.glnGlobal,
      glnOtro1: gln.glnOtro1,
      glnOtro2: gln.glnOtro2,
      glnGlnp: gln.glnGlnp,
      glnGlne: gln.glnGlne,
      glnObs1: gln.glnObs1,
      glnObs2: gln.glnObs2,
      observ: gln.observ,
    });
    if (!this.modoEdicion) {
      this.bloquearCamposPaso(2, true);
      this.bloquearCamposPaso(3, true);
      this.formGln.patchValue({
        latiG: gln.latiG,
        latiM: gln.latiM,
        latiS: gln.latiS,
        latiE: gln.latiE,
        longG: gln.longG,
        longM: gln.longM,
        longS: gln.longS,
        longE: gln.longE,
      });
    }

    if (gln.idCiudad) {
      const ciudad = this.ciudades.find(c => c.id === gln.idCiudad);
      if (ciudad) this.sincronizarCiudad(ciudad);
    }

    this.setCamposUbicacionHabilitados(false);
    this.setCamposGeneralesSoloLectura();
  }

  generarGlnCompleto(prefijo: string, secuencia: number): string {
    const codigoPais = '786';
    const longitudPrefijo = prefijo.length;

    // Longitud de secuencia = 12 - (longitud del prefijo + 3 dígitos del país)
    const longitudSecuencia = 12 - (codigoPais.length + longitudPrefijo);

    if (longitudSecuencia < 1) {
      throw new Error(`El prefijo '${prefijo}' es demasiado largo para un GLN válido.`);
    }

    const secuenciaTexto = secuencia.toString().padStart(longitudSecuencia, '0');
    const glnSinVerificador = `${codigoPais}${prefijo}${secuenciaTexto}`;

    const digitoVerificador = this.calcularDigitoVerificador(glnSinVerificador);
    return `${glnSinVerificador}${digitoVerificador}`;
  }

  private calcularDigitoVerificador(numero: string): number {
    let suma = 0;
    const longitud = numero.length;

    for (let i = 0; i < longitud; i++) {
      const digito = +numero.charAt(longitud - 1 - i);
      suma += i % 2 === 0 ? digito * 3 : digito;
    }

    const modulo = suma % 10;
    return modulo === 0 ? 0 : 10 - modulo;
  }

  private sincronizarCiudad(ciudad: CiudadResumen): void {
    this.setUbicacionDesdeCiudad(ciudad);
    this.ciudadAutocompleteControl.setValue(ciudad, { emitEvent: false });
    this.formGln.patchValue({ idCiudad: ciudad.id });
  }

private cargarGlnDesdePrefijos(idPrefijos: number): void {
  const prefijo = this.prefijos.find(p => p.id_prefijos === idPrefijos);

  if (!prefijo) {
    this.alertaGln = '❌ Prefijo no encontrado.';
    this.glnsPorPrefijo = [];
    return;
  }

  const glns = prefijo.glns || [];

  if (glns.length === 0) {
    this.alertaGln = '⚠️ No se encontraron GLNs para el prefijo seleccionado.';
    this.glnsDelPrefijo = [];
    this.glnsPorPrefijo = [];
    this.glnIndex = 0;

    // ✅ Limpieza segura y controlada
    const datosGenerales = {
      clientesCodigo: this.formGln.get('clientesCodigo')?.value,
      documentoIdentidad: this.formGln.get('documentoIdentidad')?.value,
      nomCli: this.formGln.get('nomCli')?.value,
      glnOrigenprefijo: prefijo.origenPrefijo,
      glnPrefijogs1: prefijo.codpre,
      idPrefijos: prefijo.id_prefijos
    };

    this.formGln.reset();
    this.formGln.patchValue(datosGenerales);
    this.ciudadAutocompleteControl.reset();

    // Bloqueamos pasos opcionales si no hay GLN
    this.setCamposUbicacionHabilitados(true);
    this.bloquearCamposPaso(2, true);
    this.bloquearCamposPaso(3, true);

    return;
  }

  // En caso de que sí haya GLNs
  this.alertaGln = null;
  this.glnsDelPrefijo = glns;
  this.glnsPorPrefijo = glns;
  this.glnIndex = 0;

  this.cargarGlnActual();
  this.setCamposUbicacionHabilitados(false);
  this.setCamposGeneralesSoloLectura();
}

actualizarCoordenadas(event: { lat: number, lng: number }): void {
  this.formGln.patchValue({
    glnLatitud: event.lat.toFixed(5),
    glnLongitud: event.lng.toFixed(5)
  });
}



private setUbicacionDesdeCiudad(ciudad: CiudadResumen): void {
  this.evitandoEventosUbicacion = true; 
  console.log('🔍 Ejecutando setUbicacionDesdeCiudad con:', ciudad);

  this.formGln.get('idPais')?.enable({ emitEvent: false });
  this.formGln.get('provinciaCodigo')?.enable({ emitEvent: false });
  this.formGln.get('cantonCodigo')?.enable({ emitEvent: false });
  this.formGln.get('idCiudad')?.enable({ emitEvent: false });

  this.provinciasFiltradas = this.ciudades
    .filter(c => c.pais === ciudad.pais)
    .map(c => c.provincia)
    .filter((v, i, a) => a.indexOf(v) === i)
    .map((nombre, idx) => ({ id: idx + 1, nombre }));

  this.cantones = this.ciudades
    .filter(c => c.provincia === ciudad.provincia)
    .map(c => c.canton)
    .filter((v, i, a) => a.indexOf(v) === i)
    .map((nombre, idx) => ({ id: idx + 1, nombre }));

  this.ciudadesFiltradas = this.ciudades.filter(
    c => c.provincia === ciudad.provincia && c.canton === ciudad.canton
  );

  if (!this.ciudadesFiltradas.some(c => c.id === ciudad.id)) {
    this.ciudadesFiltradas.unshift(ciudad);
  }
  ['idPais', 'provinciaCodigo', 'cantonCodigo', 'idCiudad'].forEach(campo => {
    this.formGln.get(campo)?.enable({ emitEvent: false });
  });

  const paisEncontrado = this.paises.find(p => p.nombre.toUpperCase() === ciudad.pais.toUpperCase());

  this.formGln.patchValue({
    idPais: paisEncontrado?.idPais ?? null,
    provinciaCodigo: ciudad.provincia,
    cantonCodigo: ciudad.canton,
    idCiudad: ciudad.id
  }, { emitEvent: false });
  this.evitandoEventosUbicacion = false; 
  // Opcional: re-deshabilitar si no estás en modo edición
  if (!this.modoEdicion) {
    this.setCamposUbicacionHabilitados(false);
  }

  console.log('✅ Formulario actualizado con ubicación:', {
    idPais: ciudad.pais,
    provincia: ciudad.provincia,
    canton: ciudad.canton,
    ciudad: ciudad.ciudad,
    ciudadId: ciudad.id
  });
}



  obtenerProvinciaPorCiudad(idCiudad: number | null): string {
    const ciudad = this.ciudades.find(c => c.id === idCiudad);
    return ciudad?.provincia ?? '';
  }

  obtenerCantonPorCiudad(idCiudad: number | null): string {
    const ciudad = this.ciudades.find(c => c.id === idCiudad);
    return ciudad?.canton ?? '';
  }

setUbicacionDesdeCiudadId(idCiudad: number): void {
  const ciudad = this.ciudades.find(c => c.id === +idCiudad);
  if (!ciudad) return;

  this.provinciasFiltradas = this.ciudades
    .filter(c => c.pais === ciudad.pais)
    .map(c => c.provincia)
    .filter((v, i, a) => a.indexOf(v) === i)
    .map((nombre, idx) => ({ id: idx + 1, nombre }));

  this.cantones = this.ciudades
    .filter(c => c.provincia === ciudad.provincia)
    .map(c => c.canton)
    .filter((v, i, a) => a.indexOf(v) === i)
    .map((nombre, idx) => ({ id: idx + 1, nombre }));

  this.ciudadesFiltradas = this.ciudades.filter(
    c => c.provincia === ciudad.provincia && c.canton === ciudad.canton
  );

  // Garantizar que la ciudad esté incluida
  if (!this.ciudadesFiltradas.some(c => c.id === ciudad.id)) {
    this.ciudadesFiltradas.unshift(ciudad);
  }
  const paisEncontrado = this.paises.find(p => p.nombre.toUpperCase() === ciudad.pais.toUpperCase());
  this.formGln.patchValue({
    idPais: paisEncontrado?.idPais ?? null,   
    provinciaCodigo: ciudad.provincia,
    cantonCodigo: ciudad.canton,
    idCiudad: ciudad.id
  }, { emitEvent: false });
}


  setCamposGeneralesSoloLectura(): void {
    const campos = [
      'clientesCodigo', 'documentoIdentidad', 'glnNombre', 'nomCli',
      'gln1', 'glnOrigenprefijo', 'glnPrefijogs1', 'idTipoLocalizacion'
    ];
    campos.forEach(c => this.formGln.get(c)?.disable());
  }
  inicializarFormulario(): void {
    this.formGln = this.fb.group({
      idGln: [0],
      idPrefijos: [null],
      clientesCodigo: [null],
      gln1: [''],
      documentoIdentidad: [''],
      nomCli: [''],
      idTipoLocalizacion: [null, Validators.required],
      glnLatitud: ['', [Validators.required, CustomValidators.validarLatitud]],
      glnLongitud: ['', [Validators.required, CustomValidators.validarLongitud]],
      idPais: [''],
      direccion: [''],
      telefono: [''],
      fax: [''],
      contacto: [''],
      contactoTel: [''],
      email: [''],
      web: [''],
      fda: [''],
      europa: [''],
      glnGlobal: [''],
      glnFecha: [null],
      idCiudad: [null, Validators.required],
      glnCodigopostal: [''],
      glnCelular: [''],
      glnContacto2: [''],
      glnEmail2: [''],
      glnTel2: [''],
      glnContacto3: [''],
      glnEmail3: [''],
      glnTel3: [''],
      glnFacturar: [''],
      glnCodpro: [''],
      glnNombre: [''],
      glnOtro1: [''],
      glnOtro2: [''],
      glnObs1: [''],
      glnObs2: [''],
      glnOrigenprefijo: [''],
      glnPrefijogs1: [''],
      glnGlnp: [''],
      glnGlne: [''],
      nombreLocalizacion: [''],
      observ: [''],
      expprod: [0],
      gs1ec: [0],
      gs1latam: [0],
      gas1org: [0],
      google: [0],
      gs1otros: [''],
      longG: [''],
      longM: [''],
      longS: [''],
      longE: [''],
      latiG: [''],
      latiM: [''],
      latiS: [''],
      latiE: [''],
      idUsuario: [null],
      provinciaCodigo: [''],
      cantonCodigo: [''],
      localizacion: ['', Validators.required],
    });
  }

  siguientePaso(): void {
    const raw = this.formGln.getRawValue();
    const controles = this.formGln.controls;
    const camposFaltantes: string[] = [];

    //Sincroniza ciudad si está seleccionada desde el autocomplete
    const ciudadValor = this.ciudadAutocompleteControl.value;
    if (typeof ciudadValor === 'object' && ciudadValor?.id) {
      this.formGln.patchValue({ idCiudad: ciudadValor.id });
    }

    if (this.pasoActual === 1) {
      //Validar secuencia manual si está activa
      if (this.usarSecuenciaManual) {
        if (!this.secuenciaManual) {
          this.toastCampos.mostrar(['Debe ingresar un número de secuencia']);
          return;
        }
        if (this.validandoSecuencia) {
          this.toastCampos.mostrar(['Espere mientras se valida la secuencia']);
          return;
        }
        if (!this.secuenciaValida) {
          this.toastCampos.mostrar(['La secuencia ingresada ya está en uso']);
          return;
        }
      }
      // Validaciones paso 1
      if (!controles['localizacion'].value?.trim()) {
        camposFaltantes.push('Localización');
        controles['localizacion'].markAsTouched();
      }

      if (!controles['idCiudad'].value) {
        camposFaltantes.push('Ciudad');
        controles['idCiudad'].markAsTouched();
      }

      if (!controles['glnLatitud'].value) {
        camposFaltantes.push('Latitud');
        controles['glnLatitud'].markAsTouched();
      }

      if (!controles['glnLongitud'].value) {
        camposFaltantes.push('Longitud');
        controles['glnLongitud'].markAsTouched();
      }

      if (!controles['idTipoLocalizacion'].value) {
        camposFaltantes.push('Tipo de Localización');
        controles['idTipoLocalizacion'].markAsTouched();
      }

      if (camposFaltantes.length > 0) {
        this.formGln.markAllAsTouched();
        this.toastCampos.mostrar(camposFaltantes); //Usamos el nuevo servicio
        return;
      }
    }

    if (this.pasoActual === 2) {
      const tieneContacto = !!raw.contacto || !!raw.email || !!raw.contactoTel;
      if (!tieneContacto) {
        this.toastCampos.mostrar(['Debes completar al menos un campo del Contacto 1']);
        return;
      }
    }

    this.pasoActual++;
  }


  pasoAnterior(): void {
    if (this.pasoActual > 1) this.pasoActual--;
  }

  cambiarPaso(paso: number): void { this.pasoActual = paso; }
  esPasoActual(paso: number): boolean { return this.pasoActual === paso; }
  pasoCompletado(paso: number): boolean { return this.pasoActual > paso; }
  pasoPendiente(paso: number): boolean { return this.pasoActual < paso; }

  irAlPaso(paso: number): void {
    // Validar si es permitido avanzar directamente
    if (paso > this.pasoActual) {
      // Simula avanzar paso a paso hasta llegar al deseado
      while (this.pasoActual < paso) {
        this.siguientePaso();
        if (this.pasoActual !== paso) return; // Detener si falló una validación
      }
    } else {
      this.pasoActual = paso;
    }
  }

  siguienteGln(): void {
    if (this.glnIndex < this.glnsDelPrefijo.length - 1) {
      this.glnIndex++;
      this.cargarGlnActual();
    }
  }

  anteriorGln(): void {
    if (this.glnIndex > 0) {
      this.glnIndex--;
      this.cargarGlnActual();
    }
  }
  mostrarMensajeBox(
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'info'
  ): void {
    this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: {
        title,
        message,
        type,
        confirmText: 'Aceptar',
        showCancel: false
      }
    });
  }

  cargarGlnActual(): void {
    const gln = this.glnsPorPrefijo[this.glnIndex];
    if (!gln) return;

    if (this.ciudadesCargadas && gln.idCiudad) {
      const ciudad = this.ciudades.find(c => c.id === gln.idCiudad);
      if (ciudad) {
        this.setUbicacionDesdeCiudad(ciudad);
        this.ciudadAutocompleteControl.setValue(ciudad, { emitEvent: false });
      }
    }

    // Patch de campos generales desde GlnResponse
    this.formGln.patchValue({
      idGln: gln.id_gln,
      idPrefijos: gln.id_prefijos,
      clientesCodigo: gln.clientesCodigo,
      gln1: gln.gln1,
      idTipoLocalizacion: gln.idTipoLocalizacion,
      direccion: gln.direccion,
      telefono: gln.telefono,
      fax: gln.fax,
      contacto: gln.contacto,
      contactoTel: gln.contactoTel,
      email: gln.email,
      web: gln.web,
      fda: gln.fda,
      europa: gln.europa,
      glnGlobal: gln.glnGlobal,
      glnLatitud: gln.glnLatitud,
      glnLongitud: gln.glnLongitud,
      glnFecha: gln.glnFecha,
      glnCodigopostal: gln.glnCodigopostal,
      // CAMPOS DE TELÉFONO
      glnCelular: gln.glnCelular,
      glnTel2: gln.glnTel2,
      glnTel3: gln.glnTel3,
      // FIN CAMPOS DE TELÉFONO
      glnContacto2: gln.glnContacto2,
      glnEmail2: gln.glnEmail2,
      glnContacto3: gln.glnContacto3,
      glnEmail3: gln.glnEmail3,
      glnFacturar: gln.glnFacturar,
      glnCodpro: gln.glnCodpro,
      glnNombre: gln.glnNombre,
      glnOtro1: gln.glnOtro1,
      glnOtro2: gln.glnOtro2,
      glnObs1: gln.glnObs1,
      glnObs2: gln.glnObs2,
      glnOrigenprefijo: gln.glnOrigenprefijo,
      glnPrefijogs1: gln.glnPrefijogs1,
      glnGlnp: gln.glnGlnp,
      glnGlne: gln.glnGlne,
      nombreLocalizacion: gln.nombreLocalizacion,
      observ: gln.observ,
      expprod: gln.expprod,
      gs1ec: gln.gs1ec,
      gs1latam: gln.gs1latam,
      gas1org: gln.gas1org,
      google: gln.google,
      gs1otros: gln.gs1otros,
      longG: gln.longG,
      longM: gln.longM,
      longS: gln.longS,
      longE: gln.longE,
      latiG: gln.latiG,
      latiM: gln.latiM,
      latiS: gln.latiS,
      latiE: gln.latiE,
      idUsuario: gln.idUsuario,
      localizacion: gln.nombreLocalizacion
    });

    // 👈 DELAY PARA PERMITIR QUE LOS COMPONENTES PROCESEN
    setTimeout(() => {
      console.log('Valores en FormControls después del patchValue:');
      console.log('glnCelular:', this.formGln.get('glnCelular')?.value);
      console.log('glnTel2:', this.formGln.get('glnTel2')?.value);
      console.log('glnTel3:', this.formGln.get('glnTel3')?.value);
    }, 200);

    this.setCamposUbicacionHabilitados(false);
    this.setCamposGeneralesSoloLectura(); 
    this.bloquearCamposPaso(2, true); // Contactos
    this.bloquearCamposPaso(3, true); // Certificados
    this.ciudadAutocompleteControl.disable();
    this.modoEdicion = false;
  }

  guardar(): void {
    if (this.guardando) {
      console.warn('⚠️ Ya hay un guardado en proceso');
      return;
    }
    if (this.formGln.invalid) {
      this.formGln.markAllAsTouched();
      alert('Por favor, completa todos los campos requeridos antes de guardar.');
      return;
    } 
    //Validar secuencia manual antes de guardar
    if (this.usarSecuenciaManual) {
      if (!this.secuenciaManual) {
        this.toastr.error('Debe ingresar un número de secuencia', 'Error de validación');
        return;
      }
      if (this.validandoSecuencia) {
        this.toastr.warning('Espere mientras se valida la secuencia', 'Validando');
        return;
      }
      if (!this.secuenciaValida) {
        this.toastr.error('La secuencia ingresada ya está en uso', 'Secuencia no disponible');
        return;
      }
    }
    //BLOQUEAR NUEVOS GUARDADOS
    this.guardando = true;

    //MOSTRAR LOADING DIALOG
    const loadingDialog = this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      disableClose: true, // ✅ NO SE PUEDE CERRAR
      data: {
        title: 'Guardando GLN',
        message: 'Por favor espere...',
        type: 'info',
        isLoading: true,
        loadingText: 'Guardando información del GLN...',
        showCancel: false
      }
    });
    const ciudadCtrlValor = this.ciudadAutocompleteControl.value;
    if (ciudadCtrlValor && typeof ciudadCtrlValor === 'object' && 'id' in ciudadCtrlValor) {
      this.formGln.patchValue({ idCiudad: ciudadCtrlValor.id });
    }
    const raw = this.formGln.getRawValue();
    let fechaConvertida: string | null = null;
    if (raw.glnFecha) {
      const fecha = new Date(raw.glnFecha);
      if (!isNaN(fecha.getTime())) {
        const year = fecha.getFullYear();
        const month = (fecha.getMonth() + 1).toString().padStart(2, '0');
        const day = fecha.getDate().toString().padStart(2, '0');
        fechaConvertida = `${year}-${month}-${day}`; // formato yyyy-MM-dd
      }
    }
    const data: GlnRequest = {
      id_gln: raw.idGln ?? 0,  //Enviar 0 en vez de null
      id_prefijos: raw.idPrefijos,
      clientesCodigo: raw.clientesCodigo,
      gln1: raw.gln1,
      idTipoLocalizacion: raw.idTipoLocalizacion,
      glnLatitud: raw.glnLatitud,
      glnLongitud: raw.glnLongitud,
      idPais: raw.idPais,
      direccion: raw.direccion,
      telefono: raw.telefono,
      fax: raw.fax,
      contacto: raw.contacto,
      contactoTel: raw.contactoTel,
      email: raw.email,
      web: raw.web,
      fda: raw.fda,
      europa: raw.europa,
      glnGlobal: raw.glnGlobal,
      glnFecha: raw.fechaConvertida,
      idCiudad: raw.idCiudad,
      glnCodigopostal: raw.glnCodigopostal,
      glnCelular: raw.glnCelular,
      glnContacto2: raw.glnContacto2,
      glnEmail2: raw.glnEmail2,
      glnTel2: raw.glnTel2,
      glnContacto3: raw.glnContacto3,
      glnEmail3: raw.glnEmail3,
      glnTel3: raw.glnTel3,
      glnFacturar: raw.glnFacturar,
      glnCodpro: raw.glnCodpro,
      glnNombre: raw.glnNombre,
      glnOtro1: raw.glnOtro1,
      glnOtro2: raw.glnOtro2,
      glnObs1: raw.glnObs1,
      glnObs2: raw.glnObs2,
      glnOrigenprefijo: raw.glnOrigenprefijo,
      glnPrefijogs1: raw.glnPrefijogs1,
      glnGlnp: raw.glnGlnp,
      glnGlne: raw.glnGlne,
      nombreLocalizacion: raw.localizacion,
      observ: raw.observ,
      expprod: raw.expprod ?? 0,
      gs1ec: raw.gs1ec ?? 0,
      gs1latam: raw.gs1latam ?? 0,
      gas1org: raw.gas1org ?? 0,
      google: raw.google ?? 0,
      gs1otros: raw.gs1otros,
      longG: raw.longG,
      longM: raw.longM,
      longS: raw.longS,
      longE: raw.longE,
      latiG: raw.latiG,
      latiM: raw.latiM,
      latiS: raw.latiS,
      latiE: raw.latiE,
      idUsuario: raw.idUsuario
    };
    console.log('📞 Valores de teléfono al guardar:');
    console.log('glnCelular:', this.formGln.get('glnCelular')?.value);
    console.log('glnTel2:', this.formGln.get('glnTel2')?.value);
    console.log('glnTel3:', this.formGln.get('glnTel3')?.value);
    const callback = () => {
       console.log('📥 Ejecutando callback de actualización...');
      const idGln = this.formGln.get('idGln')?.value;

      if (idGln && idGln > 0) {
        this.glnService.obtenerGlnPorId(idGln).subscribe({
          next: (glnActualizadoResponse) => {
            console.log('🔄 GLN actualizado recibido del backend:', glnActualizadoResponse);

            const glnData = glnActualizadoResponse.data;
            this.cargarDatosDesdeGlnResponse(glnData); // ✅ ahora es del tipo correcto
            this.modoEdicion = false;
            this.pasoActual = 1;

            // Opcional: recargar prefijos si también deseas que la navegación GLN se actualice
            const clienteCodigo = this.formGln.value.clientesCodigo;
            if (clienteCodigo) {
              this.prefijoService.obtenerPrefijosGlnPorClienteCodigo(clienteCodigo).subscribe(prefijos => {
                this.prefijos = prefijos;
                const idPrefijo = this.formGln.value.idPrefijos;

                this.cargarGlnDesdePrefijos(idPrefijo);

                // Restaurar índice del GLN actualizado
                const index = this.glnsPorPrefijo.findIndex(g => g.id_gln === idGln);
                if (index !== -1) {
                  this.glnIndex = index;
                  this.cargarGlnActual();
                }
              });
            }
          },
          error: (err) => {
            console.error('❌ Error al recargar GLN después de guardar', err);
            this.mostrarMensajeBox('Error', 'El GLN se guardó, pero no se pudo recargar los datos.', 'warning');
          }
        });
      }
    };

    console.log('🛰️ Payload que se va a enviar:', data);
    console.log('📌 idGln en el payload:', data.id_gln);
    console.log('🧾 Teléfono con prefijo:', this.formGln.get('telefono')?.value);

    // ✅ Diferenciar POST vs PUT correctamente
    if (data.id_gln && data.id_gln !== 0) {
      // PUT
      this.glnService.actualizarGln(data.id_gln, data).subscribe({
        next: () => {
          loadingDialog.close();
          this.guardando = false; 
          this.mostrarMensajeBox('GLN actualizado', 'El GLN fue actualizado correctamente.', 'success');
          callback();
          this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
            this.router.navigate(['/productos/nuevo-gln']);
          });
        },
        error: (err) => {
          loadingDialog.close(); 
          this.guardando = false;
          console.error('❌ Error al actualizar GLN', err);
          this.mostrarMensajeBox('Error', 'No se pudo actualizar el GLN.', 'error');
        }
      });
    } else {
      // POST
      console.log('🚀 Enviando a /Gln:', { request: data });
      this.glnService.insertarGln({ request: data }).subscribe({
        next: () => {
          loadingDialog.close();
          this.guardando = false; 
          this.mostrarMensajeBox('GLN creado', 'El GLN fue creado correctamente.', 'success');
          callback();
          this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
            this.router.navigate(['/productos/nuevo-gln']);
          });
        },
        error: (err) => {
          loadingDialog.close(); 
          this.guardando = false;
          console.error('❌ Error al crear GLN', err);
          this.mostrarMensajeBox('Error', 'Ocurrió un error al crear el GLN.', 'error');
        }
      });
    }
  }
  obtenerCodigoPrefijo(idPrefijo: number): string {
    const prefijo = this.prefijos.find(p => p.id_prefijos === idPrefijo);
    return prefijo?.codpre ?? 'N/A';
  }

  private convertirGMSaDecimal(grados: string, minutos: string, segundos: string, hemisferio: 'N' | 'S' | 'E' | 'O'): number {
    const g = parseFloat(grados);
    const m = parseFloat(minutos);
    const s = parseFloat(segundos);
    if (isNaN(g) || isNaN(m) || isNaN(s)) return 0;

    let decimal = g + m / 60 + s / 3600;
    if (hemisferio === 'S' || hemisferio === 'O') {
      decimal *= -1;
    }
    return decimal;
  }
  
  convertirGMSaCoordenadas(): void {
    const latiG = this.formGln.get('latiG')?.value;
    const latiM = this.formGln.get('latiM')?.value;
    const latiS = this.formGln.get('latiS')?.value;
    const latiE = (this.formGln.get('latiE')?.value || '').toUpperCase();

    const longG = this.formGln.get('longG')?.value;
    const longM = this.formGln.get('longM')?.value;
    const longS = this.formGln.get('longS')?.value;
    const longE = (this.formGln.get('longE')?.value || '').toUpperCase();

    if (!latiG || !latiM || !latiS || !latiE || !longG || !longM || !longS || !longE) return;

    const latDecimal = this.convertirGMSaDecimal(latiG, latiM, latiS, latiE);
    const longDecimal = this.convertirGMSaDecimal(longG, longM, longS, longE);

    this.formGln.patchValue({
      glnLatitud: latDecimal.toFixed(7),
      glnLongitud: longDecimal.toFixed(7)
    }, { emitEvent: false });
  }

  convertirALatitudGMS(valor: string): void {
    if (!this.modoEdicion || !valor || isNaN(+valor)) return;

    const decimal = parseFloat(valor);
    if (!isFinite(decimal) || Math.abs(decimal) > 999) {
      console.warn('⚠️ Valor extremo detectado en latitud:', decimal);
      return; // No convertir a GMS, pero permitir el valor
    }
    const dms = this.convertDecimalToDMS(decimal, true);

    this.formGln.patchValue({
      latiG: dms.grados,
      latiM: dms.minutos,
      latiS: dms.segundos,
      latiE: dms.direccion
    }, { emitEvent: false });
  }

  convertirALongitudGMS(valor: string): void {
    if (!this.modoEdicion || !valor || isNaN(+valor)) return;

    const decimal = parseFloat(valor);
    if (!isFinite(decimal) || Math.abs(decimal) > 999) {
      console.warn('⚠️ Valor extremo detectado en longitud:', decimal);
      return; // No convertir a GMS, pero permitir el valor
    }
    const dms = this.convertDecimalToDMS(decimal, false);

    this.formGln.patchValue({
      longG: dms.grados,
      longM: dms.minutos,
      longS: dms.segundos,
      longE: dms.direccion
    }, { emitEvent: false });
  }

  convertDecimalToDMS(decimal: number, isLatitude: boolean): { grados: string, minutos: string, segundos: string, direccion: 'N' | 'S' | 'E' | 'O' } {
    const dir = isLatitude
      ? (decimal >= 0 ? 'N' : 'S')
      : (decimal >= 0 ? 'E' : 'O');

    const abs = Math.abs(decimal);
    const grados = Math.floor(abs);
    const minutosFloat = (abs - grados) * 60;
    const minutos = Math.floor(minutosFloat);
    const segundos = ((minutosFloat - minutos) * 60);

    return {
      grados: grados.toString().padStart(2, '0'),
      minutos: minutos.toString().padStart(2, '0'),
      segundos: segundos.toFixed(2).padStart(5, '0'), // 2 decimales
      direccion: dir
    };
  }

  limpiarCiudad(): void {
    this.ciudadAutocompleteControl.setValue('', { emitEvent: true });
    this.formGln.patchValue({ idCiudad: null });
    // this.ciudadesFiltradas = []; // opcional, para limpiar la lista de ciudades también
  }

  modificar(): void {
    this.modoEdicion = true;
    this.setCamposUbicacionHabilitados(true);
    this.bloquearCamposPaso(2, false);
    this.bloquearCamposPaso(3, false);
    this.formGln.get('idTipoLocalizacion')?.enable(); //Permite editar el campo de Tipo Localizacion
  }

  cancelar(): void {
    const dialogRef = this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: {
        title: '¿Cancelar cambios?',
        message: 'Se perderán todos los cambios no guardados. ¿Desea continuar?',
        type: 'warning',
        confirmText: 'Sí, cancelar',
        cancelText: 'No',
        showCancel: true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
          this.router.navigate(['/productos/nuevo-gln']);
        });
      }
    });
  }

  cambiarTab(tab: string): void {
    this.activeTab = tab;
    if (tab === 'GLNs') {
      if (!this.glnsPorCliente || this.glnsPorCliente.length === 0) {
        this.cargarGlnsPorCliente();
      } else {
        this.aplicarFiltroGLN();
      }
    }
  }

  aplicarFiltroGLN(): void {
    const filtro = this.filtroGLN.toLowerCase().trim();
    if (!filtro) {
      this.glnsFiltrados = [...this.glnsPorCliente];
      console.log('🔍 Filtro vacío, mostrando todos:', this.glnsFiltrados.length);
      return;
    }
    
    this.glnsFiltrados = this.glnsPorCliente.filter(gln =>
      (gln.gln1 || '').toLowerCase().includes(filtro) ||
      (gln.nombreLocalizacion || '').toLowerCase().includes(filtro) ||
      (gln.contacto || '').toLowerCase().includes(filtro) ||
      (gln.direccion || '').toLowerCase().includes(filtro) ||
      (this.obtenerNombreCiudad(gln.idCiudad) || '').toLowerCase().includes(filtro) ||
      (this.obtenerNombrePais(gln.idPais) || '').toLowerCase().includes(filtro)
    );
    
    console.log('🔎 Resultados filtrados:', this.glnsFiltrados.length);
  }


  obtenerNombreCiudad(idCiudad: number): string {
    const ciudad = this.ciudades.find(c => c.id === idCiudad);
    return ciudad ? `${ciudad.ciudad}, ${ciudad.provincia}` : '';
  }

  obtenerNombrePais(idPais: number): string {
    const pais = this.paises.find(p => p.idPais === idPais);
    return pais ? pais.nombre : '';
  }

  cargarGlnsPorCliente(): void {
    const clienteCodigo = this.clienteActual?.clientes_codigo;

    if (!clienteCodigo) {
      this.alertaGln = '⚠️ No hay cliente seleccionado.';
      return;
    }

    this.glnService.obtenerGlnsPorCliente(clienteCodigo).subscribe({
      next: (res) => {
        this.glnsPorCliente = res.data ?? [];
        this.glnsFiltrados = [...this.glnsPorCliente]; // Inicializar la vista sin filtro
      },
      error: (err) => {
        console.error('❌ Error al cargar GLNs por cliente', err);
        this.alertaGln = 'No se pudo cargar los GLNs.';
      }
    });
  }

  bloquearCamposPaso(paso: number, bloquear: boolean): void {
    if (paso === 2) {
      // REMOVER los campos de teléfono de aquí, ya que tienen su propio componente
      const campos = ['contacto', 'email', 'web', 'glnContacto2', 'glnEmail2', 'glnContacto3', 'glnEmail3'];
      campos.forEach(c => this.formGln.get(c)?.[bloquear ? 'disable' : 'enable']());
      
      // Los campos de teléfono se manejan diferente porque son componentes custom
      if (bloquear) {
        this.formGln.get('glnCelular')?.disable();
        this.formGln.get('glnTel2')?.disable();
        this.formGln.get('glnTel3')?.disable();
      } else {
        this.formGln.get('glnCelular')?.enable();
        this.formGln.get('glnTel2')?.enable();
        this.formGln.get('glnTel3')?.enable();
      }
    } else if (paso === 3) {
      const campos = ['fda', 'europa', 'glnGlobal', 'glnOtro1', 'glnOtro2', 'glnGlnp', 'glnGlne'];
      campos.forEach(c => this.formGln.get(c)?.[bloquear ? 'disable' : 'enable']());
    }
  }

  nuevo(): void {
    const datosGenerales = {
      clientesCodigo: this.formGln.get('clientesCodigo')?.value,
      documentoIdentidad: this.formGln.get('documentoIdentidad')?.value,
      nomCli: this.formGln.get('nomCli')?.value,
      glnOrigenprefijo: this.formGln.get('glnOrigenprefijo')?.value,
      glnPrefijogs1: this.formGln.get('glnPrefijogs1')?.value,
      idPrefijos: this.formGln.get('idPrefijos')?.value
    };

    this.formGln.reset();
    this.modoEdicion = true;

    const latitudDefecto = -0.22985;
    const longitudDefecto = -78.52495;
    this.formGln.patchValue({
      clientesCodigo: datosGenerales.clientesCodigo,
      documentoIdentidad: datosGenerales.documentoIdentidad,
      nomCli: datosGenerales.nomCli,
      glnOrigenprefijo: datosGenerales.glnOrigenprefijo,
      glnPrefijogs1: datosGenerales.glnPrefijogs1,
      idTipoLocalizacion: null,
      glnLatitud: latitudDefecto,
      glnLongitud: longitudDefecto
    });

    // Este lo seteas *aparte* sin emitir evento
    this.formGln.get('idPrefijos')?.patchValue(datosGenerales.idPrefijos, { emitEvent: false });
    
    this.pasoActual = 1;
    this.setCamposUbicacionHabilitados(true);
    this.bloquearCamposPaso(2, false);
    this.bloquearCamposPaso(3, false);

    this.modoEdicion = true;

    this.glnsDelPrefijo = [];
    this.glnsPorPrefijo = [];
    this.glnIndex = 0;
    this.ciudadAutocompleteControl.reset();

    // ✅ NUEVO: Resetear estado del checkbox de serie
    this.usarSecuenciaManual = false;
    this.secuenciaManual = null;
    this.validandoSecuencia = false;
    this.secuenciaValida = false;
    this.mensajeSecuencia = '';

    // Aqui arma el prefijo y verifica su longitud
    const prefijo = this.prefijos.find(p => p.id_prefijos === datosGenerales.idPrefijos);
    if (prefijo) {
      // ✅ Generar automáticamente (tu lógica original intacta)
      this.generarGlnAutomatico(prefijo);
    } else {
      this.alertaGln = 'Debe seleccionar un prefijo válido antes de generar un nuevo GLN.';
    }
    this.formGln.get('idTipoLocalizacion')?.enable(); //Habilitar al crear
  }

  setCamposUbicacionHabilitados(habilitado: boolean): void {
    const campos = [
      'localizacion', 'idPais', 'provinciaCodigo', 'cantonCodigo',
      'direccion', 'glnCodigopostal', 'glnLatitud', 'glnLongitud',
      'longG', 'longM', 'longS', 'longE',
      'latiG', 'latiM', 'latiS', 'latiE'
    ];
    campos.forEach(campo => {
      const control = this.formGln.get(campo);
      if (control) {
        habilitado ? control.enable() : control.disable();
      }
    });

      habilitado ? this.ciudadAutocompleteControl.enable() : this.ciudadAutocompleteControl.disable();
  }

  procesarFiltrosIniciales(): void {
    const provincia = this.formGln.get('provinciaCodigo')?.value;
    const canton = this.formGln.get('cantonCodigo')?.value;
    this.cantones = this.ciudades
      .filter(c => c.provincia === provincia)
      .map(c => c.canton)
      .filter((v, i, a) => a.indexOf(v) === i)
      .map((nombre, idx) => ({ id: idx + 1, nombre }));
    this.ciudadesFiltradas = this.ciudades.filter(c => c.provincia === provincia && c.canton === canton);
    if (this.ciudadesFiltradas.length > 0) {
      this.formGln.patchValue({ idCiudad: this.ciudadesFiltradas[0].id });
    }
  }

  async exportarPDF(): Promise<void> {
  // PRIORIZAR AUTOCOMPLETE SOBRE TODO LO DEMÁS
  const ciudadAutocompleteValue = this.ciudadAutocompleteControl.value;

  // USAR SIEMPRE EL AUTOCOMPLETE COMO FUENTE DE VERDAD
  let ciudad = null;
  
  if (ciudadAutocompleteValue && typeof ciudadAutocompleteValue === 'object' && ciudadAutocompleteValue.id) {
    // El autocomplete tiene prioridad absoluta
    ciudad = ciudadAutocompleteValue;
    console.log('✅ Usando ciudad del autocomplete (prioridad 1):', ciudad);
    
    // Sincronizar el formulario con el autocomplete
    this.formGln.patchValue({ 
      idCiudad: ciudad.id,
      provinciaCodigo: ciudad.provincia,
      cantonCodigo: ciudad.canton
    });
  } else {
    // Solo si no hay autocomplete, buscar por ID del formulario
    const raw = this.formGln.getRawValue();
    
    if (raw.idCiudad) {
      ciudad = this.ciudades.find(c => c.id === +raw.idCiudad);
    }
    
    // Último recurso: buscar por provincia y cantón
    if (!ciudad && raw.provinciaCodigo && raw.cantonCodigo) {
      // 🚨 BUSCAR LA PRIMERA QUE COINCIDA EXACTAMENTE
      ciudad = this.ciudades.find(c => 
        c.provincia === raw.provinciaCodigo && 
        c.canton === raw.cantonCodigo
      );
    }
  }

  const raw = this.formGln.getRawValue();
  
  // Buscar país
  let pais = null;
  if (raw.idPais) {
    pais = this.paises.find(p => p.idPais === +raw.idPais);
  } else if (ciudad) {
    pais = this.paises.find(p => p.nombre.toUpperCase() === ciudad.pais.toUpperCase());
  }
  
  const tipoLoc = this.tiposLocalizacion.find(t => t.id_tipo_cliente === +raw.idTipoLocalizacion);

  await this.exportService.exportarGLNPDF({
    gln: raw.gln1 || '',
    clienteActual: this.clienteActual,
    formData: raw,
    ciudad: ciudad,
    pais: pais,
    tipoLoc: tipoLoc,
    logoUrl: this.logoUrl
  });
}

  //Exportar a Excel
  async exportarGLNsExcel(): Promise<void> {
    const headers = ['GLN', 'Localización', 'Dirección', 'Teléfono', 'Contacto', 'Email', 'Ciudad', 'País'];
    const columns = ['gln1', 'nombreLocalizacion', 'direccion', 'telefono', 'contacto', 'email', 'ciudad', 'pais'];

    const data = this.glnsFiltrados.map(gln => ({
      gln1: gln.gln1,
      nombreLocalizacion: gln.nombreLocalizacion,
      direccion: gln.direccion,
      telefono: gln.telefono,
      contacto: gln.contacto,
      email: gln.email,
      ciudad: this.obtenerNombreCiudad(gln.idCiudad),
      pais: this.obtenerNombrePais(gln.idPais)
    }));

    await this.exportService.exportarExcel({
      data,
      columns,
      headers,
      filename: 'GLNs',
      title: 'Listado de GLNs por Prefijo',
      logoUrl: this.logoUrl
    });
  }
  onPhoneChange(controlName: string, phoneData: any): void {
    console.log('Teléfono cambiado:', controlName, phoneData);
    
    // Obtener el número completo con código de país
    const numeroCompleto = phoneData?.e164Number || phoneData?.internationalNumber || phoneData;
    
    // Actualizar el FormControl con el número completo
    this.formGln.get(controlName)?.setValue(numeroCompleto, { emitEvent: false });
    
    console.log('💾 Guardado en FormControl:', numeroCompleto);
  }
  /**
   * Valida en tiempo real la latitud mientras se escribe
   * Permite: números, punto, coma, signo negativo
   * Bloquea: valores que excedan -90 a 90
   */
  validarLatitudKeyPress(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;
    const key = event.key;
    
    // Permitir teclas de control
    if (key === 'Backspace' || key === 'Delete' || key === 'Tab' || 
        key === 'ArrowLeft' || key === 'ArrowRight' || key === 'Home' || key === 'End') {
      return;
    }

    // Permitir solo números, punto, coma y signo negativo
    if (!/^[-0-9.,]$/.test(key)) {
      event.preventDefault();
      return;
    }

    // Obtener el valor que resultaría después de presionar la tecla
    const selectionStart = input.selectionStart || 0;
    const selectionEnd = input.selectionEnd || 0;
    const currentValue = input.value;
    const newValue = currentValue.substring(0, selectionStart) + key + currentValue.substring(selectionEnd);

    // Si contiene coma, permitir (para paste "lat,lng")
    if (newValue.includes(',')) {
      return;
    }

    // Validar múltiples puntos
    const puntos = (newValue.match(/\./g) || []).length;
    if (puntos > 1) {
      event.preventDefault();
      return;
    }

    // Validar múltiples signos negativos
    const negativos = (newValue.match(/-/g) || []).length;
    if (negativos > 1 || (negativos === 1 && newValue.indexOf('-') !== 0)) {
      event.preventDefault();
      return;
    }

    // ✅ VALIDACIÓN DE RANGO PARA LATITUD (-90 a 90)
    // Solo validar si ya es un número válido
    if (newValue !== '-' && newValue !== '.' && !newValue.endsWith('.')) {
      const numero = parseFloat(newValue);
      if (!isNaN(numero) && Math.abs(numero) > 90) {
        event.preventDefault();
        this.toastr.warning('La latitud debe estar entre -90 y 90', 'Valor fuera de rango', {
          timeOut: 2000,
          positionClass: 'toast-top-right'
        });
        return;
      }
    }
  }

  /**
   * Valida en tiempo real la longitud mientras se escribe
   * Permite: números, punto, coma, signo negativo
   * Bloquea: valores que excedan -180 a 180
   */
  validarLongitudKeyPress(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;
    const key = event.key;
    
    // Permitir teclas de control
    if (key === 'Backspace' || key === 'Delete' || key === 'Tab' || 
        key === 'ArrowLeft' || key === 'ArrowRight' || key === 'Home' || key === 'End') {
      return;
    }

    // Permitir solo números, punto, coma y signo negativo
    if (!/^[-0-9.,]$/.test(key)) {
      event.preventDefault();
      return;
    }

    // Obtener el valor que resultaría después de presionar la tecla
    const selectionStart = input.selectionStart || 0;
    const selectionEnd = input.selectionEnd || 0;
    const currentValue = input.value;
    const newValue = currentValue.substring(0, selectionStart) + key + currentValue.substring(selectionEnd);

    // Si contiene coma, permitir (para paste "lat,lng")
    if (newValue.includes(',')) {
      return;
    }

    // Validar múltiples puntos
    const puntos = (newValue.match(/\./g) || []).length;
    if (puntos > 1) {
      event.preventDefault();
      return;
    }

    // Validar múltiples signos negativos
    const negativos = (newValue.match(/-/g) || []).length;
    if (negativos > 1 || (negativos === 1 && newValue.indexOf('-') !== 0)) {
      event.preventDefault();
      return;
    }

    // ✅ VALIDACIÓN DE RANGO PARA LONGITUD (-180 a 180)
    // Solo validar si ya es un número válido
    if (newValue !== '-' && newValue !== '.' && !newValue.endsWith('.')) {
      const numero = parseFloat(newValue);
      if (!isNaN(numero) && Math.abs(numero) > 180) {
        event.preventDefault();
        this.toastr.warning('La longitud debe estar entre -180 y 180', 'Valor fuera de rango', {
          timeOut: 2000,
          positionClass: 'toast-top-right'
        });
        return;
      }
    }
  }

  /**
   * Permite el paste sin restricciones
   * El valueChanges se encarga de procesar la coma si existe
   */
  permitirPaste(event: ClipboardEvent): void {
    // No hacer nada, dejar que el paste funcione normalmente
    // El valueChanges procesará la coma automáticamente
    return;
  }
  
  generarGlnAutomatico(prefijo: any): void {
    const codigoPais = '786';
    this.glnService.obtenerUltimaSecuenciaGln(codigoPais, prefijo.codpre).subscribe({
      next: (secuencia: number) => {
        const longitudSecuencia = 12 - (codigoPais.length + prefijo.codpre.length);
        const maxSecuencia = Math.pow(10, longitudSecuencia) - 1;

        if (secuencia >= maxSecuencia) {
          this.alertaGln = `No se pueden generar más GLNs con el prefijo ${prefijo.codpre}. Límite alcanzado (${maxSecuencia}).`;
          return;
        }

        const nuevaSecuencia = secuencia + 1;
        const gln = this.generarGlnCompleto(prefijo.codpre, nuevaSecuencia);
        this.formGln.patchValue({ gln1: gln });
      },
      error: (err) => {
        console.error('❌ Error al obtener la secuencia de GLN', err);
        this.alertaGln = 'No se pudo generar el GLN automáticamente.';
      }
    });
  }

  //Maneja el cambio del checkbox SERIE
  onCheckboxSerieChange(): void {
    if (this.usarSecuenciaManual) {
      // Cuando activa el checkbox, limpia el GLN para que ingrese la secuencia
      this.formGln.patchValue({ gln1: '' });
      this.secuenciaManual = null;
    } else {
      // Cuando desactiva, regenera automáticamente
      const prefijo = this.prefijos.find(p => p.id_prefijos === this.formGln.get('idPrefijos')?.value);
      if (prefijo) {
        this.generarGlnAutomatico(prefijo);
      }
    }
  }

  //Valida y genera GLN con secuencia manual
  validarYGenerarGlnManual(): void {
      if (!this.secuenciaManual || this.secuenciaManual <= 0) {
        this.toastr.error('Ingrese un número de secuencia válido', 'Error');
        return;
      }

      const prefijo = this.prefijos.find(p => p.id_prefijos === this.formGln.get('idPrefijos')?.value);
      if (!prefijo) {
        this.toastr.error('Seleccione un prefijo válido', 'Error');
        return;
      }

      const codigoPais = '786';
      const longitudSecuencia = 12 - (codigoPais.length + prefijo.codpre.length);
      const maxSecuencia = Math.pow(10, longitudSecuencia) - 1;

      if (this.secuenciaManual > maxSecuencia) {
        this.toastr.error(
          `La secuencia no puede exceder ${maxSecuencia} para este prefijo`,
          'Fuera de rango'
        );
        return;
      }

      this.validandoSecuencia = true;

      this.glnService.validarSecuenciaDisponible(codigoPais, prefijo.codpre, this.secuenciaManual).subscribe({
        next: (response) => {
          this.validandoSecuencia = false;
          
          if (response.data) {
            const gln = this.generarGlnCompleto(prefijo.codpre, this.secuenciaManual!);
            this.formGln.patchValue({ gln1: gln });
            this.toastr.success(response.message, 'Éxito');
          } else {
            this.toastr.error(response.message, 'Secuencia no disponible');
            this.formGln.patchValue({ gln1: '' });
          }
        },
        error: (err) => {
          this.validandoSecuencia = false;
          console.error('❌ Error al validar secuencia', err);
          this.toastr.error('No se pudo validar la secuencia', 'Error');
        }
      });
    }
    onSecuenciaInput(): void {
    this.mensajeSecuencia = '';
    this.secuenciaValida = false;
    
    if (this.secuenciaManual && this.secuenciaManual > 0) {
      this.secuenciaSubject.next(this.secuenciaManual);
    }
  }

  validarSecuenciaEnTiempoReal(secuencia: number): void {
    const prefijo = this.prefijos.find(p => p.id_prefijos === this.formGln.get('idPrefijos')?.value);
    if (!prefijo) return;

    const codigoPais = '786';
    const longitudSecuencia = 12 - (codigoPais.length + prefijo.codpre.length);
    const maxSecuencia = Math.pow(10, longitudSecuencia) - 1;

    if (secuencia > maxSecuencia) {
      this.mensajeSecuencia = `Máximo permitido: ${maxSecuencia}`;
      this.secuenciaValida = false;
      this.formGln.patchValue({ gln1: '' });
      return;
    }

    this.validandoSecuencia = true;

    this.glnService.validarSecuenciaDisponible(codigoPais, prefijo.codpre, secuencia).subscribe({
      next: (response) => {
        this.validandoSecuencia = false;
        
        if (response.data) {
          const gln = this.generarGlnCompleto(prefijo.codpre, secuencia);
          this.formGln.patchValue({ gln1: gln });
          this.mensajeSecuencia = `Disponible`;
          this.secuenciaValida = true;
        } else {
          this.formGln.patchValue({ gln1: '' });
          this.mensajeSecuencia = 'Ya en uso';
          this.secuenciaValida = false;
        }
      },
      error: (err) => {
        this.validandoSecuencia = false;
        console.error('❌ Error al validar secuencia', err);
        this.mensajeSecuencia = 'Error al validar';
        this.secuenciaValida = false;
      }
    });
  }
}
