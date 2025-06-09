// GLNComponent unificado con navegación, paso a paso y GLNs por prefijo
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { PrefijoService } from 'src/app/services/prefijo.service';
import { TipoLocalizacionService } from 'src/app/services/tipo-localizacion.service';
import { ClienteSeleccionadoService } from 'src/app/services/cliente-seleccionado.service';
import { CiudadService } from 'src/app/services/ciudad.service';
import { TipoLocalizacionResponse } from 'src/app/interfaces/responses/tipo-localizacion-response';
import { PrefijoClienteResponse } from 'src/app/interfaces/responses/PrefijoClienteResponse';
import { Cliente } from 'src/app/interfaces/cliente';
import { CiudadResumen } from 'src/app/interfaces/responses/ciudad-response';
import { combineLatest, distinctUntilChanged, startWith } from 'rxjs';
import { GlnRequest, GlnResponse, GlnService } from 'src/app/services/gln.service';
import { PaisService, Pais } from 'src/app/services/pais.service';
import { CustomValidators } from 'src/app/components/utils/validators/validator.util';
import { CustomMessageBoxComponent } from 'src/app/util/messages/custom-message-box.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-nuevo-gln',
  templateUrl: './nuevo-gln.component.html',
  styleUrls: ['./nuevo-gln.component.css']
})
export class GlnComponent implements OnInit {
  formGln!: FormGroup;
  pasoActual: number = 1;

  tiposLocalizacion: TipoLocalizacionResponse[] = [];
  prefijos: PrefijoClienteResponse[] = [];
  ciudades: CiudadResumen[] = [];
  ciudadesFiltradas: CiudadResumen[] = [];
  paises: Pais[] = [];
  provincias: { id: number; nombre: string }[] = [];
  provinciasFiltradas: { id: number; nombre: string }[] = [];
  cantones: { id: number; nombre: string }[] = [];

  clienteActual: Cliente | null = null;

  glnsDelPrefijo: GlnResponse[] = [];   
  glnsPorPrefijo: GlnResponse[] = [];   
  glnIndex: number = 0;
  alertaGln: string | null = null;
  modoEdicion: boolean = false;
  ciudadesCargadas = false;
  evitandoEventos = false;
  evitandoEventosUbicacion = false;
  ciudadAutocompleteControl = new FormControl<CiudadResumen | string>(''); 
  
  constructor(
    private fb: FormBuilder,
    private prefijoService: PrefijoService,
    private tipoLocalizacionService: TipoLocalizacionService,
    private clienteSeleccionadoService: ClienteSeleccionadoService,
    private ciudadService: CiudadService,
    private glnService: GlnService,
    private paisService: PaisService,
    private dialog: MatDialog
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

      this.prefijoService.obtenerPrefijosPorClienteCodigo(clienteCodigo).subscribe({
        next: (res) => {
          this.prefijos = res;
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
      .subscribe(value => this.convertirALatitudGMS(value));

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
    const secuenciaTexto = secuencia.toString().padStart(4, '0'); // 0001 - 9999
    const glnSinVerificador = `${codigoPais}${prefijo}${secuenciaTexto}`; // 12 dígitos

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
      this.glnsPorPrefijo = [];
      return;
    }

    this.alertaGln = null;
    this.glnsPorPrefijo = glns;
    this.glnsDelPrefijo = glns;
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
      'gln1', 'glnOrigenprefijo', 'glnPrefijogs1'
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
      idTipoLocalizacion: [null],
      glnLatitud: ['', [CustomValidators.onlyFormattedNumber]],
      glnLongitud: ['', [CustomValidators.onlyFormattedNumber]],
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
      idCiudad: [null],
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
      localizacion: ['']
    });
  }

  siguientePaso(): void {
    if (this.pasoActual < 3) this.pasoActual++;
  }

  pasoAnterior(): void {
    if (this.pasoActual > 1) this.pasoActual--;
  }

  cambiarPaso(paso: number): void { this.pasoActual = paso; }
  esPasoActual(paso: number): boolean { return this.pasoActual === paso; }
  pasoCompletado(paso: number): boolean { return this.pasoActual > paso; }
  pasoPendiente(paso: number): boolean { return this.pasoActual < paso; }

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
    const gln = this.glnsPorPrefijo[this.glnIndex]; // ← Cambia aquí
    if (!gln) return;

    if (this.ciudadesCargadas && gln.idCiudad) {
      const ciudad = this.ciudades.find(c => c.id === gln.idCiudad);
      if (ciudad) {
        this.setUbicacionDesdeCiudad(ciudad);
        this.ciudadAutocompleteControl.setValue(ciudad, { emitEvent: false }); // 👈 línea clave
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
      glnCelular: gln.glnCelular,
      glnContacto2: gln.glnContacto2,
      glnEmail2: gln.glnEmail2,
      glnTel2: gln.glnTel2,
      glnContacto3: gln.glnContacto3,
      glnEmail3: gln.glnEmail3,
      glnTel3: gln.glnTel3,
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
    this.setCamposUbicacionHabilitados(false);
  }

  guardar(): void {
    if (this.formGln.invalid) {
      this.formGln.markAllAsTouched();
      alert('❌ Por favor, completa todos los campos requeridos antes de guardar.');
      return;
    } 
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

    const callback = () => {
    const clienteCodigo = this.formGln.value.clientesCodigo;

    if (clienteCodigo) {
      this.prefijoService.obtenerPrefijosPorClienteCodigo(clienteCodigo).subscribe(res => {
        this.prefijos = res;
        const idPrefijo = this.formGln.value.idPrefijos;
        this.cargarGlnDesdePrefijos(idPrefijo);
        this.modoEdicion = false;
      });
    }

    this.pasoActual = 1;
  };

  console.log('🛰️ Payload que se va a enviar:', data);
  console.log('📌 idGln en el payload:', data.id_gln);
  // ✅ Diferenciar POST vs PUT correctamente
  if (data.id_gln && data.id_gln !== 0) {
    // PUT
    this.glnService.actualizarGln(data.id_gln, data).subscribe({
      next: () => {
        this.mostrarMensajeBox('GLN actualizado', 'El GLN fue actualizado correctamente.', 'success');
        callback();
      },
      error: (err) => {
        console.error('❌ Error al actualizar GLN', err);
        this.mostrarMensajeBox('Error', 'No se pudo actualizar el GLN.', 'error');
      }
    });
  } else {
    // POST
    console.log('🚀 Enviando a /Gln:', { request: data });
    this.glnService.insertarGln({ request: data }).subscribe({
      next: () => {
        this.mostrarMensajeBox('GLN creado', 'El GLN fue creado correctamente.', 'success');
        callback();
      },
      error: (err) => {
        console.error('❌ Error al crear GLN', err);
        this.mostrarMensajeBox('Error', 'Ocurrió un error al crear el GLN.', 'error');
      }
    });
  }
}
  convertirALatitudGMS(valor: string): void {
    if (!this.modoEdicion || !valor || isNaN(+valor)) return;

    const decimal = parseFloat(valor);
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
    // this.ciudadesFiltradas = []; // opcional, si deseas limpiar la lista también
  }

  modificar(): void {
    this.modoEdicion = true;
    this.setCamposUbicacionHabilitados(true);
  }

  cancelar(): void {
    this.formGln.reset();
    this.pasoActual = 1;
    this.setCamposUbicacionHabilitados(false);
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

    // Restaurar solo los campos deseados
    this.formGln.patchValue({
      ...datosGenerales,
      idTipoLocalizacion: null // este se limpia
    });

    this.pasoActual = 1;
    this.setCamposUbicacionHabilitados(true);
    this.modoEdicion = true;

    const prefijo = this.prefijos.find(p => p.id_prefijos === datosGenerales.idPrefijos);

    if (prefijo) {
      const codigoPais = '786';
      this.glnService.obtenerUltimaSecuenciaGln(codigoPais, prefijo.codpre).subscribe({
        next: (secuencia: number) => {
          const nuevaSecuencia = secuencia + 1;
          const gln = this.generarGlnCompleto(prefijo.codpre, nuevaSecuencia);
          this.formGln.patchValue({ gln1: gln });
        },
        error: (err) => {
          console.error('❌ Error al obtener la secuencia de GLN', err);
          this.alertaGln = 'No se pudo generar el GLN automáticamente.';
        }
      });
    } else {
      this.alertaGln = 'Debe seleccionar un prefijo válido antes de generar un nuevo GLN.';
    }
  }




  setCamposUbicacionHabilitados(habilitado: boolean): void {
    const campos = [
      'localizacion', 'idPais', 'provinciaCodigo', 'cantonCodigo', 'idCiudad',
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
}
