import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { CustomMessageBoxComponent } from 'src/app/components/utils/messages/custom-message-box.component';
import { LiquidarAnticipoRequest } from 'src/app/interfaces/requests/anticipo-liquida-request';
import { AnticipoResponse } from 'src/app/interfaces/responses/anticipo-response';
import { BancosTercerosResponse } from 'src/app/interfaces/responses/bancos-terceros-response';
import { AnticipoLiquidaService } from 'src/app/services/anticipo-liquida.service';
import { BancosTercerosService } from 'src/app/services/bancosterceros.service';
import { ClienteService } from 'src/app/services/cliente.service';
import { FormaPagoResponse, FormaPagoService } from 'src/app/services/forma-pago.service';
import { UsuarioService } from 'src/app/services/usuario.service';

@Component({
  selector: 'app-liquidar-anticipo',
  templateUrl: './liquidar-anticipo.component.html',
  styleUrls: ['./liquidar-anticipo.component.css']
})
export class LiquidarAnticipoComponent implements OnInit {
  @Input() anticipo!: AnticipoResponse;
  @Output() onSuccess = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();

  liquidacionForm!: FormGroup;
  formasPago: FormaPagoResponse[] = [];
  isLoading = false;
  fechaHoy = new Date();
  numeroLiquidacion: number = 0; // ✅ AGREGAR
  bancos: BancosTercerosResponse[] = []; // ✅ AGREGAR
  bancosFiltrados: BancosTercerosResponse[] = []; // ✅ AGREGAR
  bancoSeleccionado: BancosTercerosResponse | null = null;

  // Datos del usuario logueado
  usuarioActual: string = '';
  nombreUsuario: string = '';

  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
    private anticipoLiquidaService: AnticipoLiquidaService,
    private formaPagoService: FormaPagoService,
    private usuarioService: UsuarioService,
    private clienteService: ClienteService,
    private bancosTercerosService: BancosTercerosService
  ) {}

  ngOnInit(): void {
    this.cargarUsuarioActual();
    this.buildForm();
    this.cargarFormasPago();
    this.cargarBancos(); // ✅ AGREGAR
    this.cargarSiguienteNumeroLiquidacion();
    this.onTipoPagoChange();
  }

  private cargarUsuarioActual(): void {
    const usuario = this.usuarioService.getUsuarioActual();
    if (usuario) {
      this.usuarioActual = usuario.id_usuario.toString();
      this.nombreUsuario = usuario.nombre_usuario || usuario.nombreD || 'Usuario';
    }
  }

  private buildForm(): void {
      this.liquidacionForm = this.fb.group({
      valorLiquidado: [
        parseFloat((this.anticipo.monto || 0).toFixed(2)), //Redondear a 2
        [
          Validators.required,
          Validators.min(0.01),
          Validators.max(this.anticipo.monto || 0)
        ]
      ],
      mismosDatosCliente: [false],
      cedula: [''],
      beneficiario: [''],
      tipoPago: ['Cheque', Validators.required],
      tipoCuenta: [''],
      nroCuenta: [''],
      nroCheque: [''],
      idBanco: [null],
      direccion: [''],
      telefono: [''],
      correo: [''],
      concepto: ['', Validators.required]
    });
  }

  private cargarFormasPago(): void {
    this.formaPagoService.getAnticipoActivas().subscribe({
      next: (response) => {
        if (response.type === 'success' && response.data) {
          this.formasPago = response.data;
        }
      },
      error: (error) => {
        console.error('Error cargando formas de pago:', error);
      }
    });
  }
  private cargarBancos(): void {
    this.bancosTercerosService.getAll().subscribe({
      next: (response) => {
        if (response.type === 'LIST' && response.data) {
          this.bancos = response.data;
          this.bancosFiltrados = [...this.bancos];
        }
      },
      error: (error) => {
        console.error('Error cargando bancos:', error);
      }
    });
  }
  private cargarSiguienteNumeroLiquidacion(): void {
    this.anticipoLiquidaService.getNextNumero().subscribe({
      next: (response) => {
        if (response.type === 'success' && response.data) {
          this.numeroLiquidacion = response.data.next_numero;
          console.log('✅ Siguiente número de liquidación:', this.numeroLiquidacion);
        }
      },
      error: (error) => {
        console.error('Error cargando siguiente número de liquidación:', error);
        this.numeroLiquidacion = Date.now(); // Fallback temporal
      }
    });
  }
  onMismosDatosClienteChange(event: any): void {
    if (event.target.checked) {
      if (!this.anticipo.clientes_codigo) {
        this.showMessageBox(
          'Advertencia',
          'No se encontró el código de cliente',
          'warning'
        );
        this.liquidacionForm.patchValue({ mismosDatosCliente: false });
        return;
      }

      // Cargar datos del cliente desde el servicio
      this.clienteService.getClienteById(this.anticipo.clientes_codigo).subscribe({
        next: (cliente) => {
          this.liquidacionForm.patchValue({
            cedula: cliente.ruc || '',
            beneficiario: cliente.nomcli || cliente.razonSocial || '',
            direccion: cliente.dircli || '',
            telefono: cliente.telefono || cliente.telefono1 || '',
            correo: cliente.email || ''
          });

          console.log('✅ Datos del cliente cargados:', cliente);
        },
        error: (error) => {
          console.error('Error cargando datos del cliente:', error);
          this.showMessageBox(
            'Error',
            'No se pudieron cargar los datos del cliente',
            'error'
          );
          this.liquidacionForm.patchValue({ mismosDatosCliente: false });
        }
      });
    } else {
      // Limpiar campos cuando se desmarca
      this.liquidacionForm.patchValue({
        cedula: '',
        beneficiario: '',
        direccion: '',
        telefono: '',
        correo: ''
      });
    }
  }

  onTipoPagoChange(): void {
    const tipoPago = this.liquidacionForm.get('tipoPago')?.value;

    if (tipoPago === 'Transferencia') {
      // Hacer obligatorios los campos de transferencia
      this.liquidacionForm.get('tipoCuenta')?.setValidators([Validators.required]);
      this.liquidacionForm.get('nroCuenta')?.setValidators([Validators.required]);

      // Limpiar validaciones de cheque
      this.liquidacionForm.get('nroCheque')?.clearValidators();
      this.liquidacionForm.get('nroCheque')?.setValue('');

    } else if (tipoPago === 'Cheque') {
      // Hacer obligatorio el número de cheque
      this.liquidacionForm.get('nroCheque')?.setValidators([Validators.required]);

      // Limpiar validaciones de transferencia
      this.liquidacionForm.get('tipoCuenta')?.clearValidators();
      this.liquidacionForm.get('nroCuenta')?.clearValidators();

      // Limpiar valores de transferencia
      this.liquidacionForm.patchValue({
        tipoCuenta: '',
        nroCuenta: ''
      });
    }

    // Actualizar validaciones
    this.liquidacionForm.get('tipoCuenta')?.updateValueAndValidity();
    this.liquidacionForm.get('nroCuenta')?.updateValueAndValidity();
    this.liquidacionForm.get('nroCheque')?.updateValueAndValidity();
  }

  liquidar(): void {
    if (this.liquidacionForm.invalid) {
      this.markFormGroupTouched(this.liquidacionForm);
      this.showMessageBox(
        'Validación',
        'Por favor complete todos los campos obligatorios',
        'warning'
      );
      return;
    }

    this.isLoading = true;
    const formValue = this.liquidacionForm.value;

    // Obtener el siguiente número de liquidación desde el backend
    const numLiquidacion = this.numeroLiquidacion;

    const request: LiquidarAnticipoRequest = {
      num_liquidacion: numLiquidacion,
      fecha_liquidacion: this.formatDateToISO(this.fechaHoy),
      id_anticipo: this.anticipo.id_anticipo,
      responsable: this.usuarioActual,
      clientes_codigo: this.anticipo.clientes_codigo,
      valor_liquidado: formValue.valorLiquidado,
      concepto: formValue.concepto,
      id_forma_pago: this.anticipo.id_forma_pago, // Usar la forma de pago del anticipo
      asiento_contable: null,
      tipo_asiento: null,
      cod_beneficiario: formValue.cedula || null,
      beneficiario: formValue.beneficiario || null,
      tipo_pago: formValue.tipoPago || null,
      tipo_cuenta: formValue.tipoCuenta || null,
      nro_cuenta: formValue.nroCuenta || null,
      direccion: formValue.direccion || null,
      telefono: formValue.telefono || null,
      correo: formValue.correo || null,
      cedula: formValue.cedula || null,
      id_bancos_terceros: formValue.idBanco || null,
      fecha_ingreso: this.formatDateToISO(this.fechaHoy),
      usuario_ingreso: this.nombreUsuario
    };

    console.log('📤 Request de liquidación:', request);

    this.anticipoLiquidaService.liquidar(request).subscribe({
      next: (response) => {
        this.isLoading = false;

        if (response.type === 'success') {
          this.showMessageBox(
            'Éxito',
            `Liquidación creada exitosamente. ${response.message || ''}`,
            'success'
          );
          this.onSuccess.emit();
        } else {
          this.showMessageBox(
            'Error',
            response.message || 'No se pudo crear la liquidación',
            'error'
          );
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('❌ Error al liquidar:', error);

        const errorMessage = error.error?.message || error.message || 'Error al procesar la liquidación';
        this.showMessageBox('Error', errorMessage, 'error');
      }
    });
  }

  cerrar(): void {
    this.onCancel.emit();
  }

  private formatDateToISO(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  private showMessageBox(
    title: string,
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info'
  ): void {
    this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: {
        title,
        message,
        type,
        confirmText: 'Aceptar',
        showCancel: false,
      },
    });
  }
}
