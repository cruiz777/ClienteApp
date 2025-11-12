import { Component, OnInit } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon'; // opcional si usas íconos
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormControl,
  AbstractControl} from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { debounceTime, distinctUntilChanged, filter, switchMap, catchError, of, take } from 'rxjs';
import { ClienteService } from 'src/app/services/cliente.service';
import { UsuarioService } from 'src/app/services/usuario.service';
import { AutorizacionCajaService } from 'src/app/services/autorizacion-caja.service';
import { ReactiveFormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { TipoAnticipo } from '../../../../interfaces/responses/tipo-anticipo-response';
import { FormaPagoResponse, FormaPagoService } from '../../../../services/forma-pago.service';
import { PlazoTarjeta } from '../../../../interfaces/responses/plazo-tarjeta-response';
import { TipoAnticipoService } from '../../../../services/tipo-anticipo.service';
import { PlazoTarjetaService } from '../../../../services/plazo-tarjeta.service';
import { AnticipoService } from '../../../../services/anticipo.service';
import { BancosTercerosService } from '../../../../services/bancosterceros.service';
import { CreateAnticipoRequest } from '../../../../interfaces/requests/anticipo-request';
import { BancosTercerosResponse } from '../../../../interfaces/responses/bancos-terceros-response';
import { MatDialog } from '@angular/material/dialog';
import { BuscarAnticipoDialogComponent } from '../dialogs/buscar-anticipo-dialog/buscar-anticipo-dialog.component';
import { AnticipoDetalleResponse } from '../../../../interfaces/responses/anticipo-response';

// Ajusta a tu interfaz real
interface ClienteSummary {
  clientes_codigo: number;
  nomcli: string;
}

@Component({
  standalone: true,
  selector: 'app-creacion-anticipos',
  templateUrl: './creacion-anticipos.component.html',
  styleUrls: ['./creacion-anticipos.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatIconModule,
    MatSelectModule,      // ← NUEVO
    MatOptionModule
  ]
})
export class CreacionAnticiposComponent implements OnInit {

  // ========= Estado general =========
  numeroAnticipo = 1;
  form!: FormGroup;

  // ========= Autocomplete Cliente =========
  clienteOrigenControl = new FormControl<string | ClienteSummary | null>(null, Validators.required);
  clientesOrigenFiltrados: ClienteSummary[] = [];
  codcli = 0; // código del cliente seleccionado
  nombreCliente = '';

  tipoAnticipoControl = new FormControl<string | TipoAnticipo | null>(null, Validators.required);
    tiposAnticipo: TipoAnticipo[] = [];
    tiposAnticipoFiltrados: TipoAnticipo[] = [];
    tipoAnticipoSeleccionado: TipoAnticipo | null = null;

    bancoControl = new FormControl<string | BancosTercerosResponse | null>(null);
    bancos: BancosTercerosResponse[] = [];
    bancosFiltrados: BancosTercerosResponse[] = [];
    bancoSeleccionado: BancosTercerosResponse | null = null;

    formaPagoControl = new FormControl<string | FormaPagoResponse | null>(null, Validators.required);
    formasPago: FormaPagoResponse[] = [];
    formasPagoFiltradas: FormaPagoResponse[] = [];
    formaPagoSeleccionada: FormaPagoResponse | null = null;

    plazoControl = new FormControl<string | PlazoTarjeta | null>(null);
    plazos: PlazoTarjeta[] = [];
    plazosFiltrados: PlazoTarjeta[] = [];
    plazoSeleccionado: PlazoTarjeta | null = null;

    // ========= NUEVO: Estados de carga =========
    cargandoDatos = false;
    guardando = false;

    // ========= Autorización de caja ========= (YA LO TIENES)
    cajaAsignada = false;
  constructor(
    private fb: FormBuilder,
    private clienteService: ClienteService,
    private usuarioService: UsuarioService,
    private autorizacionCajaService: AutorizacionCajaService,
    private tipoAnticipoService: TipoAnticipoService,
    private plazoTarjetaService: PlazoTarjetaService,
    private bancosTercerosService: BancosTercerosService,
    private formaPagoService: FormaPagoService,
    private anticipoService: AnticipoService,
    private dialog: MatDialog
  ) {}

  // ========= Ciclo de vida =========
  ngOnInit(): void {
    // Inicializar formulario
    this.form = this.fb.group({
      // Cliente
      clienteCodigo: [0, [Validators.required, Validators.min(1)]],
      cliente: ['', Validators.required],

      // Datos básicos
      fecha: [this.hoyIso(), Validators.required],
      caja: [''],
      cajero: [''],

      // Campos principales
      tipoAnticipo: [null, Validators.required],
      monto: [null, [Validators.required, Validators.min(0.01)]],
      banco: [null],
      descrPago: [null, Validators.required],

      // Campos de pago
      noTarjeta: [''],
      nroCuenta: [''],
      nroCheque: [''],
      propietario: [''],
      nroDocumento: [''],
      autorizado: [''],

      // Campos adicionales
      saldo: [''],
      estado: [''],
      nombre: [''],
      concepto: [''],
      lote: [''],
      plazo: [null]
    });

    // Cargar cajero
    try {
      const u: any = this.usuarioService?.getUsuarioActual?.();
      if (u) {
        this.form.patchValue({
          cajero: u.nombre_usuario ?? u.username ?? u.nombre ?? u.usuario ?? '',
        }, { emitEvent: false });
      }
    } catch { /* noop */ }

    // Cargar autorización de caja
    this.cargarAutorizacion();

    // Cargar datos de combobox
    this.cargarDatosIniciales();

    // ===== Stream del autocomplete CLIENTE =====
    this.clienteOrigenControl.valueChanges
      .pipe(
        filter((v): v is string => typeof v === 'string'),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((texto) => {
          const q = (texto || '').trim();
          if (!q) return of({ data: [] as ClienteSummary[] });
          return this.clienteService.getClientesSummary(q).pipe(
            catchError(_ => of({ data: [] as ClienteSummary[] }))
          );
        })
      )
      .subscribe(resp => {
        this.clientesOrigenFiltrados = (resp?.data ?? []) as ClienteSummary[];
      });

    // ===== Stream del autocomplete TIPO ANTICIPO =====
    this.tipoAnticipoControl.valueChanges
      .pipe(
        filter((v): v is string => typeof v === 'string'),
        debounceTime(200),
        distinctUntilChanged()
      )
      .subscribe(texto => {
        this.filtrarTiposAnticipo(texto);
      });

    // ===== Stream del autocomplete BANCO =====
    this.bancoControl.valueChanges
      .pipe(
        filter((v): v is string => typeof v === 'string'),
        debounceTime(200),
        distinctUntilChanged()
      )
      .subscribe(texto => {
        this.filtrarBancos(texto);
      });

    // ===== Stream del autocomplete FORMA PAGO =====
    this.formaPagoControl.valueChanges
      .pipe(
        filter((v): v is string => typeof v === 'string'),
        debounceTime(200),
        distinctUntilChanged()
      )
      .subscribe(texto => {
        this.filtrarFormasPago(texto);
      });

    // ===== Stream del autocomplete PLAZO =====
    this.plazoControl.valueChanges
      .pipe(
        filter((v): v is string => typeof v === 'string'),
        debounceTime(200),
        distinctUntilChanged()
      )
      .subscribe(texto => {
        this.filtrarPlazos(texto);
      });
    this.form.get('monto')?.valueChanges.subscribe(monto => {
      if (monto != null && monto > 0) {
        this.form.patchValue({ saldo: monto }, { emitEvent: false });
      }
    });
  }

  // ========= Acciones UI =========
  nuevo(): void {
    const num = this.numeroAnticipo + 1;
    const fecha = this.form.get('fecha')?.value ?? this.hoyIso();

    this.form.reset({
      fecha,
      caja: this.form.get('caja')?.value ?? '',
      cajero: this.form.get('cajero')?.value ?? '',
      clienteCodigo: 0,
      cliente: '',
      tipoAnticipo: null,
      monto: null,
      banco: null,
      descrPago: null,
      noTarjeta: '',
      nroCuenta: '',
      nroCheque: '',
      propietario: '',
      nroDocumento: '',
      autorizado: '',
      saldo: '',
      estado: '',
      nombre: '',
      concepto: '',
      lote: '',
      plazo: null
    });

    // Limpiar autocompletes
    this.codcli = 0;
    this.nombreCliente = '';
    this.clienteOrigenControl.setValue('', { emitEvent: false });

    this.tipoAnticipoSeleccionado = null;
    this.tipoAnticipoControl.setValue('', { emitEvent: false });

    this.bancoSeleccionado = null;
    this.bancoControl.setValue('', { emitEvent: false });

    this.formaPagoSeleccionada = null;
    this.formaPagoControl.setValue('', { emitEvent: false });

    this.plazoSeleccionado = null;
    this.plazoControl.setValue('', { emitEvent: false });

    this.numeroAnticipo = num;
    this.anticipoActual = null;  // Limpiar anticipo cargado
    this.form.enable();           // Habilitar todos los campos
    this.clienteOrigenControl.enable();
    this.tipoAnticipoControl.enable();
    this.bancoControl.enable();
    this.formaPagoControl.enable();
    this.plazoControl.enable();
  }
  private cargarDatosIniciales(): void {
    this.cargandoDatos = true;

    // Cargar Tipos de Anticipo
    this.tipoAnticipoService.getAll().subscribe({
      next: (response) => {
        if (response.type === 'success' && response.data) {
          this.tiposAnticipo = response.data;
          this.tiposAnticipoFiltrados = [...this.tiposAnticipo];
        }
      },
      error: (error) => console.error('Error cargando tipos de anticipo:', error)
    });

    // Cargar Bancos
    this.bancosTercerosService.getAll().subscribe({
      next: (response) => {
        if (response.type === 'LIST' && response.data) {
          this.bancos = response.data;
          this.bancosFiltrados = [...this.bancos];
        }
      },
      error: (error) => console.error('Error cargando bancos:', error)
    });

    // Cargar Formas de Pago
    this.formaPagoService.getActivas().subscribe({
      next: (response: any) => {
        console.log('📦 Formas Pago:', response);
        if ((response.type === 'Success' || response.type === 'success') && response.data) {
          // Mapear campos snake_case
          this.formasPago = (response.data || []).map((f: any) => ({
            idFormaPago: f.id_forma_pago,
            descripcionPago: f.descripcion_pago,
            codigoCuenta: f.codigo_cuenta
          }));
          this.formasPagoFiltradas = [...this.formasPago];
          console.log('✅ Formas de pago cargadas:', this.formasPago);
        }
        this.cargandoDatos = false;
      },
      error: (error) => {
        console.error('Error cargando formas de pago:', error);
        this.cargandoDatos = false;
      }
    });

    // Cargar Plazos
    this.plazoTarjetaService.getAll().subscribe({
      next: (response) => {
        if (response.type === 'success' && response.data) {
          this.plazos = response.data;
          this.plazosFiltrados = [...this.plazos];
        }
      },
      error: (error) => console.error('Error cargando plazos:', error)
    });
  }
  grabar(): void {
    // Marcar todos los controles como tocados
    this.form.markAllAsTouched();
    this.clienteOrigenControl.markAsTouched();
    this.tipoAnticipoControl.markAsTouched();
    this.formaPagoControl.markAsTouched();

    // Validar formulario
    if (this.form.invalid || !this.codcli || !this.tipoAnticipoSeleccionado || !this.formaPagoSeleccionada) {
      alert('Por favor complete todos los campos obligatorios marcados con *');
      return;
    }

    this.guardando = true;

    // Construir request
    const request: CreateAnticipoRequest = {
      caja: this.form.value.caja || null,
      responsable: this.form.value.cajero || null,
      clientes_codigo: this.codcli,
      monto: this.form.value.monto,
      concepto: this.form.value.concepto || null,
      id_forma_pago: this.formaPagoSeleccionada.idFormaPago,
      id_local: 1, // Ajustar según tu lógica
      id_tipo_anticipo: this.tipoAnticipoSeleccionado.id_tipo_anticipo,

      // Opcionales
      id_bancos_terceros: this.bancoSeleccionado?.IdBancosTerceros ?? null,
      nro_cuenta: this.form.value.nroCuenta || null,
      lote: this.form.value.lote || null,
      nro_cheque: this.form.value.nroCheque || null,
      propietario: this.form.value.propietario || null,
      nro_documento: this.form.value.nroDocumento || null,
      nombre: this.form.value.nombre || null,
      id_plazo_tarjeta: this.plazoSeleccionado?.id_plazo ?? null,
      autorizacion: this.form.value.autorizado || null,
      ate_numero_atencion: null,
      pac_historia_clinica: null
    };

    console.log('Enviando request:', request);

    this.anticipoService.create(request).subscribe({
      next: (response) => {
        this.guardando = false;

        if (response.type === 'success' && response.data) {
          console.log('✅ Anticipo creado:', response.data);
          alert(`✅ Anticipo ${response.data.numero_anticipo} creado exitosamente`);
          this.nuevo(); // Limpiar formulario
        } else {
          console.error('❌ Error:', response.message);
          alert(`❌ Error: ${response.message}`);
        }
      },
      error: (error) => {
        this.guardando = false;
        console.error('❌ Error al crear anticipo:', error);
        alert('❌ Error al crear anticipo. Por favor intente nuevamente.');
      }
    });
  }

  imprimir(): void {
    console.log('Imprimir anticipo', this.numeroAnticipo);
  }

  anular(): void {
    console.log('Anular anticipo', this.numeroAnticipo);
  }

  cancelar(): void {
    if (this.anticipoActual) {
      // Si hay un anticipo cargado, limpiar y volver a modo nuevo
      this.nuevo();
    } else {
      // Si es nuevo, solo resetear a valores actuales
      this.form.reset(this.form.value);
    }
    console.log('Cancelar');
  }
  // ===== Filtros =====
  private filtrarTiposAnticipo(texto: string): void {
    const filtro = (texto || '').toLowerCase().trim();
    if (!filtro) {
      this.tiposAnticipoFiltrados = [...this.tiposAnticipo];
      return;
    }
    this.tiposAnticipoFiltrados = this.tiposAnticipo.filter(t =>
      (t.descripcion ?? '').toLowerCase().includes(filtro)
    );
  }

  private filtrarBancos(texto: string): void {
    const filtro = (texto || '').toLowerCase().trim();
    if (!filtro) {
      this.bancosFiltrados = [...this.bancos];
      return;
    }
    this.bancosFiltrados = this.bancos.filter(b =>
      (b.Descripcion ?? '').toLowerCase().includes(filtro)
    );
  }

  private filtrarFormasPago(texto: string): void {
    const filtro = (texto || '').toLowerCase().trim();
    if (!filtro) {
      this.formasPagoFiltradas = [...this.formasPago];
      return;
    }
    this.formasPagoFiltradas = this.formasPago.filter(f =>
      (f.descripcionPago ?? '').toLowerCase().includes(filtro)
    );
  }

  private filtrarPlazos(texto: string): void {
    const filtro = (texto || '').toLowerCase().trim();
    if (!filtro) {
      this.plazosFiltrados = [...this.plazos];
      return;
    }
    this.plazosFiltrados = this.plazos.filter(p =>
      (p.descripcion ?? '').toLowerCase().includes(filtro)
    );
  }
  // ===== Métodos para comportamiento de combobox =====
  mostrarTodasLasOpciones(tipo: 'tipoAnticipo' | 'banco' | 'formaPago' | 'plazo'): void {
    switch(tipo) {
      case 'tipoAnticipo':
        this.tiposAnticipoFiltrados = [...this.tiposAnticipo];
        break;
      case 'banco':
        this.bancosFiltrados = [...this.bancos];
        break;
      case 'formaPago':
        this.formasPagoFiltradas = [...this.formasPago];
        break;
      case 'plazo':
        this.plazosFiltrados = [...this.plazos];
        break;
    }
  }

  toggleAutocomplete(tipo: 'tipoAnticipo' | 'banco' | 'formaPago' | 'plazo'): void {
    // Mostrar todas las opciones
    this.mostrarTodasLasOpciones(tipo);

    // Hacer foco en el input correspondiente para abrir el autocomplete
    switch(tipo) {
      case 'tipoAnticipo':
        this.tipoAnticipoControl.setValue('');
        setTimeout(() => {
          const input = document.querySelector('[formcontrolname="tipoAnticipo"]') as HTMLInputElement;
          input?.focus();
        }, 0);
        break;
      case 'banco':
        this.bancoControl.setValue('');
        setTimeout(() => {
          const input = document.querySelector('[formcontrolname="banco"]') as HTMLInputElement;
          input?.focus();
        }, 0);
        break;
      case 'formaPago':
        this.formaPagoControl.setValue('');
        setTimeout(() => {
          const input = document.querySelector('[formcontrolname="descrPago"]') as HTMLInputElement;
          input?.focus();
        }, 0);
        break;
      case 'plazo':
        this.plazoControl.setValue('');
        setTimeout(() => {
          const input = document.querySelector('[formcontrolname="plazo"]') as HTMLInputElement;
          input?.focus();
        }, 0);
        break;
    }
  }
  // ===== Display functions =====
  mostrarTipoAnticipo = (t: TipoAnticipo | string | null): string =>
    (t && typeof t === 'object') ? (t.descripcion ?? '') : (t ?? '') as string;

  mostrarBanco = (b: BancosTercerosResponse | string | null): string =>
    (b && typeof b === 'object') ? (b.Descripcion ?? '') : (b ?? '') as string;

  mostrarFormaPago = (f: FormaPagoResponse | string | null): string =>
    (f && typeof f === 'object') ? (f.descripcionPago ?? '') : (f ?? '') as string;

  mostrarPlazo = (p: PlazoTarjeta | string | null): string =>
    (p && typeof p === 'object') ? (p.descripcion ?? '') : (p ?? '') as string;


  // ===== Métodos de selección =====
  seleccionarTipoAnticipo(tipo: TipoAnticipo): void {
    if (!tipo?.id_tipo_anticipo) return;
    this.tipoAnticipoSeleccionado = tipo;
    this.form.patchValue({ tipoAnticipo: tipo.id_tipo_anticipo }, { emitEvent: false });
  }

  seleccionarBanco(banco: BancosTercerosResponse | null): void {
    this.bancoSeleccionado = banco;
    this.form.patchValue({ banco: banco?.IdBancosTerceros ?? null }, { emitEvent: false });
  }

  seleccionarFormaPago(forma: FormaPagoResponse): void {
    if (!forma?.idFormaPago) return;
    this.formaPagoSeleccionada = forma;
    this.form.patchValue({ descrPago: forma.idFormaPago }, { emitEvent: false });
  }

  seleccionarPlazo(plazo: PlazoTarjeta | null): void {
    this.plazoSeleccionado = plazo;
    this.form.patchValue({ plazo: plazo?.id_plazo ?? null }, { emitEvent: false });
  }

  // ========= Autocomplete handlers =========
  mostrarNombreCliente = (c: ClienteSummary | string | null): string =>
    (c && typeof c === 'object') ? (c.nomcli ?? '') : (c ?? '') as string;

  seleccionarClienteOrigen(e: MatAutocompleteSelectedEvent | ClienteSummary): void {
    const cli: ClienteSummary = (isMatEvent(e) ? e.option.value : e) as ClienteSummary;
    if (!cli?.clientes_codigo) return;

    this.codcli = cli.clientes_codigo;
    this.nombreCliente = cli.nomcli;

    // Guarda en el form
    this.form.patchValue({
      clienteCodigo: this.codcli,
      cliente: this.nombreCliente
    }, { emitEvent: false });
  }

  onClienteInputBlur(): void {
    // Si el usuario escribió texto y no eligió opción, intenta casar exacto
    const valor = this.clienteOrigenControl.value;
    if (typeof valor === 'string' && valor.trim().length > 0) {
      const exact = this.clientesOrigenFiltrados.find(c =>
        (c.nomcli ?? '').toLowerCase().trim() === valor.toLowerCase().trim()
      );
      if (exact) {
        this.seleccionarClienteOrigen(exact);
        return;
      }
    }

    // Si no hay selección válida, marca como requerido
    if (!this.codcli) {
      this.form.patchValue({ clienteCodigo: 0, cliente: '' }, { emitEvent: false });
    }
  }

  // ========= Autorización de caja =========
  private cargandoAutorizacion = false;
  private cargarAutorizacion(): void {
    if (this.cargandoAutorizacion) return;
    this.cargandoAutorizacion = true;

    const u: any = this.usuarioService?.getUsuarioActual?.();
    const id = u?.id_autorizacion_caja;
    if (id == null) {
      this.avisarCajaNoAsignada();
      this.cargandoAutorizacion = false;
      return;
    }

    this.autorizacionCajaService.getAutorizacionCaja(Number(id))
      .pipe(take(1))
      .subscribe({
        next: ({ data }) => {
          if (!data) {
            this.avisarCajaNoAsignada();
            this.cargandoAutorizacion = false;
            return;
          }
          const numEst = this.padLeft(data.num_establecimiento ?? '', 3);
          const caja = this.padLeft(data.caja ?? '', 3);

          // Rellena en el form (si quieres mostrar la caja/PE)
          this.form.patchValue({
            caja: caja
          }, { emitEvent: false });

          this.cajaAsignada = !!(numEst && caja);
          this.cargandoAutorizacion = false;
        },
        error: _ => {
          this.avisarCajaNoAsignada();
          this.cargandoAutorizacion = false;
        }
      });
  }

  private avisarCajaNoAsignada(): void {
    this.form.patchValue({ caja: '' }, { emitEvent: false });
    this.cajaAsignada = false;
    // Si prefieres snack: colócalo aquí
    console.info('Usuario no tiene asignado Caja');
  }

  // ========= Helpers =========
  get f() { return this.form.controls; }

  private hoyIso(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private padLeft(value: any, size: number): string {
    const s = (value ?? '').toString().replace(/\D/g, '');
    return s ? s.padStart(size, '0') : '';
  }
  //BUSQUEDA DE ANTICIPOS
  buscarAnticipo(): void {
    const dialogRef = this.dialog.open(BuscarAnticipoDialogComponent, {
      width: '900px',
      disableClose: false,
      data: {}
    });

    dialogRef.afterClosed().subscribe((anticipoSeleccionado: any) => {
      if (anticipoSeleccionado) {
        this.cargarAnticipo(anticipoSeleccionado.id_anticipo);
      }
    });
  }
  // Método para cargar el anticipo completo
  private cargarAnticipo(idAnticipo: number): void {
    this.cargandoDatos = true;

    this.anticipoService.getById(idAnticipo).subscribe({
      next: (response) => {
        this.cargandoDatos = false;

        if (response.type === 'success' && response.data) {
          this.llenarFormularioConAnticipo(response.data);
        } else {
          alert('Error al cargar el anticipo');
        }
      },
      error: (error) => {
        this.cargandoDatos = false;
        console.error('Error cargando anticipo:', error);
        alert('Error al cargar el anticipo');
      }
    });
  }
  // Método para llenar el formulario con los datos del anticipo
  private llenarFormularioConAnticipo(anticipo: AnticipoDetalleResponse): void {
    // Guardar ID del anticipo para futura anulación
    this.anticipoActual = anticipo;
    this.numeroAnticipo = anticipo.id_anticipo;

    // Llenar campos básicos
    this.form.patchValue({
      fecha: anticipo.fecha ? anticipo.fecha.split('T')[0] : this.hoyIso(),
      caja: anticipo.caja || '',
      cajero: anticipo.responsable || '',
      monto: anticipo.monto || 0,
      saldo: anticipo.monto || 0,
      concepto: anticipo.concepto || '',
      lote: anticipo.lote || '',
      nombre: anticipo.nombre || '',
      nroCuenta: anticipo.nro_cuenta || '',
      nroCheque: anticipo.nro_cheque || '',
      propietario: anticipo.propietario || '',
      nroDocumento: anticipo.nro_documento || '',
      autorizado: anticipo.autorizacion || ''
    }, { emitEvent: false });

    // Cargar CLIENTE
    if (anticipo.clientes_codigo) {
      this.codcli = anticipo.clientes_codigo;
      this.nombreCliente = anticipo.nombre_cliente || '';

      const clienteObj: ClienteSummary = {
        clientes_codigo: anticipo.clientes_codigo,
        nomcli: this.nombreCliente
      };

      this.clienteOrigenControl.setValue(clienteObj, { emitEvent: false });
      this.form.patchValue({
        clienteCodigo: this.codcli,
        cliente: this.nombreCliente
      }, { emitEvent: false });
    }

    // Cargar TIPO ANTICIPO
    if (anticipo.id_tipo_anticipo) {
      const tipo = this.tiposAnticipo.find(t => t.id_tipo_anticipo === anticipo.id_tipo_anticipo);
      if (tipo) {
        this.tipoAnticipoSeleccionado = tipo;
        this.tipoAnticipoControl.setValue(tipo, { emitEvent: false });
        this.form.patchValue({ tipoAnticipo: tipo.id_tipo_anticipo }, { emitEvent: false });
      }
    }

    // Cargar BANCO
    if (anticipo.id_bancos_terceros) {
      const banco = this.bancos.find(b => b.IdBancosTerceros === anticipo.id_bancos_terceros);
      if (banco) {
        this.bancoSeleccionado = banco;
        this.bancoControl.setValue(banco, { emitEvent: false });
        this.form.patchValue({ banco: banco.IdBancosTerceros }, { emitEvent: false });
      }
    }

    // Cargar FORMA DE PAGO
    if (anticipo.id_forma_pago) {
      const forma = this.formasPago.find(f => f.idFormaPago === anticipo.id_forma_pago);
      if (forma) {
        this.formaPagoSeleccionada = forma;
        this.formaPagoControl.setValue(forma, { emitEvent: false });
        this.form.patchValue({ descrPago: forma.idFormaPago }, { emitEvent: false });
      }
    }

    // Cargar PLAZO
    if (anticipo.id_plazo_tarjeta) {
      const plazo = this.plazos.find(p => p.id_plazo === anticipo.id_plazo_tarjeta);
      if (plazo) {
        this.plazoSeleccionado = plazo;
        this.plazoControl.setValue(plazo, { emitEvent: false });
        this.form.patchValue({ plazo: plazo.id_plazo }, { emitEvent: false });
      }
    }

    console.log('✅ Anticipo cargado en el formulario');
      // Deshabilitar TODOS los campos
    this.form.disable();
    this.clienteOrigenControl.disable();
    this.tipoAnticipoControl.disable();
    this.bancoControl.disable();
    this.formaPagoControl.disable();
    this.plazoControl.disable();
  }

  anticipoActual: AnticipoDetalleResponse | null = null;
}
// type guard para usar el mismo método con evento o con objeto
function isMatEvent(e: any): e is MatAutocompleteSelectedEvent {
  return !!e && !!(e as MatAutocompleteSelectedEvent).option;
}
