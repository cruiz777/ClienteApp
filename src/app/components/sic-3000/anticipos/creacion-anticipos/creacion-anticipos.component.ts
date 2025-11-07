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
    MatIconModule
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

  // ========= Autorización de caja =========
  cajaAsignada = false;

  constructor(
    private fb: FormBuilder,
    private clienteService: ClienteService,
    private usuarioService: UsuarioService,
    private autorizacionCajaService: AutorizacionCajaService
  ) {}

  // ========= Ciclo de vida =========
  ngOnInit(): void {
    this.form = this.fb.group({
      // meta del cliente
      clienteCodigo: [0, [Validators.required, Validators.min(1)]],
      cliente: ['', Validators.required], // se rellenará con el nombre

      // resto del formulario
      fecha: [this.hoyIso(), Validators.required],
      caja: [''],
      cajero: [''],
      tipoAnticipo: ['', Validators.required],
      monto: [null, [Validators.required, Validators.min(0.01)]],
      banco: [''],
      descrPago: [''],
      noTarjeta: [''],
      autorizado: [''],
      saldo: [''],
      estado: [''],
      nombre: [''],
      concepto: [''],
      lote: [''],
      plazo: ['']
    });

    // Cargar cajero/caja si tu servicio lo provee
    try {
      const u: any = this.usuarioService?.getUsuarioActual?.();
      if (u) {
        this.form.patchValue({
          cajero:
            u.nombre_usuario ??
            u.username ??
            u.nombre ??
            u.usuario ??
            '',
        }, { emitEvent: false });
      }
    } catch { /* noop */ }

    this.cargarAutorizacion();

    // ===== Stream del autocomplete cliente =====
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
      tipoAnticipo: '',
      monto: null,
      banco: '',
      descrPago: '',
      noTarjeta: '',
      autorizado: '',
      saldo: '',
      estado: '',
      nombre: '',
      concepto: '',
      lote: '',
      plazo: ''
    });

    this.codcli = 0;
    this.nombreCliente = '';
    this.clienteOrigenControl.setValue('', { emitEvent: false });
    this.numeroAnticipo = num;
  }

  grabar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const payload = {
      numero: this.numeroAnticipo,
      clienteCodigo: this.form.value.clienteCodigo,
      clienteNombre: this.form.value.cliente,
      ...this.form.value
    };

    console.log('Grabar anticipo:', payload);
    // TODO: servicio HTTP para crear anticipo
  }

  imprimir(): void {
    console.log('Imprimir anticipo', this.numeroAnticipo);
  }

  anular(): void {
    console.log('Anular anticipo', this.numeroAnticipo);
  }

  cancelar(): void {
    // restablece al estado actual (no pierde lo escrito)
    this.form.reset(this.form.value);
    console.log('Cancelar');
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
}

// type guard para usar el mismo método con evento o con objeto
function isMatEvent(e: any): e is MatAutocompleteSelectedEvent {
  return !!e && !!(e as MatAutocompleteSelectedEvent).option;
}
