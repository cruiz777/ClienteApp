import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
  MatDialog
} from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { NotaCreditoService, FacturaListResponse } from 'src/app/services/nota-credito.service';
import { UsuarioService } from 'src/app/services/usuario.service';
import { FacturacionService } from 'src/app/services/facturacion.service';
import { CustomMessageBoxComponent } from 'src/app/util/messages/custom-message-box.component';

// Tipos mínimos locales (si en tu proyecto existen definiciones globales usa esas)
interface ApiResponse<T = any> { type: string; message?: string; data?: T | null; }
interface PaginationResponse<TItem> { items: TItem[]; page: number; pageSize: number; totalItems: number; totalPages: number; }

export interface DatosAnularFactura {
  factura?: string;
  fecha?: string;
  cliente?: string;
  ruc?: string;
  total?: number | null;
}

// Resultado que devuelve el diálogo al cerrarse
export type ResultadoAnular =
  | { ok: true; idNota: number; observacion: string }
  | { ok: false };

interface UsuarioActual {
  id_usuario: number;
  // agrega más campos si los necesitas
}

@Component({
  selector: 'app-factura-anulada',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './factura-anulada.component.html',
  styleUrls: ['./factura-anulada.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class FacturaAnuladaComponent implements OnInit {
  // Estado visual
  buscandoFactura = false;
  errorFactura: string | null = null;

  // Observación del usuario (OBLIGATORIA)
  observacion: string = '';

  // Claves para anulación
  idNota: number | null = null;
  clientesCodigo: number | null = null;

  // Usuario actual
  usuarioActual: UsuarioActual | null = null;

  // Datos mostrados en el encabezado
  encabezado: {
    factura?: string;
    fecha?: string;
    cliente?: string;
    ruc?: string;
    total?: number | null;
    direccion?: string;
  } = {
    factura: this.data?.factura ?? '',
    fecha: this.data?.fecha ?? '',
    cliente: this.data?.cliente ?? '',
    ruc: this.data?.ruc ?? '',
    total: this.data?.total ?? null,
    direccion: ''
  };

  // longitud mínima requerida para la observación
  readonly MIN_OBSERVACION = 10;

  constructor(
    private dialogRef: MatDialogRef<FacturaAnuladaComponent, ResultadoAnular>,
    @Inject(MAT_DIALOG_DATA) public data: DatosAnularFactura,
    private svc: NotaCreditoService,
    private dialog: MatDialog,
    private snack: MatSnackBar,
    private usuarioService: UsuarioService,
    private facturacionService: FacturacionService
  ) {}

  ngOnInit(): void {
    // Obtén el usuario actual desde tu servicio (ajusta al método real)
    // Si tu servicio es asíncrono, adáptalo a un subscribe/await
    this.usuarioActual = (this.usuarioService.getUsuarioActual?.() as UsuarioActual) ?? null;
  }

  // Getter útil para habilitar/deshabilitar el botón Anular
  get canAnular(): boolean {
    const tieneId = this.idNota != null;
    const obsLen = (this.observacion || '').trim().length;
    return Boolean(tieneId && obsLen >= this.MIN_OBSERVACION);
  }

  cerrar() {
    this.dialogRef.close({ ok: false });
  }

  /** Click en "Anular": valida, pregunta confirmación, llama servicio, alerta y cierra */
  confirmar() {
    // 1) Validación de precondiciones
    if (this.idNota == null) {
      this.mostrarAlerta('No se ha seleccionado una factura válida para anular.', 'error');
      return;
    }

    // Normalizar observación: mayúsculas y trim para validar longitud real
    this.observacion = (this.observacion || '').toUpperCase().trim();

    if (!this.observacion) {
      this.mostrarAlerta('Debe ingresar una observación para anular la factura.', 'error');
      return;
    }

    if (this.observacion.length < this.MIN_OBSERVACION) {
      this.mostrarAlerta(`El motivo de anulación debe tener al menos ${this.MIN_OBSERVACION} caracteres.`, 'error');
      return;
    }

    const obs = this.observacion;

    // 2) Confirmación previa (ventana modal)
    this.dialog.open(CustomMessageBoxComponent, {
      width: '420px',
      data: {
        title: 'Confirmar anulación',
        message: '¿Está seguro que desea anular esta factura? Esta acción no se puede deshacer.',
        type: 'info',
        confirmText: 'Sí, anular',
        cancelText: 'Cancelar',
        showCancel: true
      }
    }).afterClosed().subscribe((acepta: boolean) => {
      if (!acepta) {
        this.mostrarAlerta('Operación cancelada.', 'info');
        return;
      }

      // 3) Llamado real al backend
      const idUsuario = this.usuarioActual?.id_usuario ?? 0; // ajusta el campo si tu modelo usa otro nombre
      this.facturacionService
        .anularFactura(this.idNota!, obs, idUsuario)
        .subscribe({
          next: (resp: ApiResponse<any>) => {
            // asumir que la API retorna type: 'Success' en caso de éxito
            if (resp?.type === 'Success') {
              this.mostrarAlerta('Factura anulada correctamente.', 'ok');
              this.dialogRef.close({ ok: true, idNota: this.idNota!, observacion: obs });
            } else {
              // Manejo de respuestas no exitosas
              this.mostrarAlerta(resp?.message ?? 'No se pudo anular la factura.', 'error');
            }
          },
          error: (e) => {
            this.mostrarAlerta(e?.message ?? 'No se pudo anular la factura.', 'error');
          }
        });
    });
  }

  /** Busca factura al presionar Enter o invocar la búsqueda */
  onEnterFactura(): void {
    const entrada = (this.encabezado.factura ?? '').trim();
    if (!entrada) return;

    this.errorFactura = null;
    this.buscandoFactura = true;

    this.svc.buscarPorNumeroLike(entrada, true, 1, 20).subscribe({
      next: (resp: ApiResponse<PaginationResponse<FacturaListResponse>>) => {
        this.buscandoFactura = false;

        const items = resp?.data?.items ?? [];
        if (resp?.type !== 'Success' || !items.length) {
          this.errorFactura = resp?.message || 'No se encontraron facturas.';
          return;
        }

        // Intento por sufijo; si no hay coincidencias, usa el listado completo
        const sufijo = this.extraerSufijo(entrada);
        const candidatos = sufijo ? items.filter(i => (i.numeroFactura ?? '').endsWith(sufijo)) : [];
        const lista = (candidatos.length ? candidatos : items)
          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

        const best = lista[0];

        if (!best) {
          this.errorFactura = 'No se encontraron facturas.';
          return;
        }

        // Guardar claves
        this.idNota = (best as any).idNota ?? null;
        this.clientesCodigo = (best as any).idCliente ?? null;

        // Fijar encabezado visual
        if ((best as any).numeroFactura) this.encabezado.factura = (best as any).numeroFactura;
        this.encabezado.fecha   = best.fecha ? this.formatearDDMMYYYY(best.fecha) : '';
        this.encabezado.cliente = (best as any).cliente ?? '';
        this.encabezado.ruc     = (best as any).rucCliente ?? '';
        this.encabezado.total   = this.toNumber((best as any).total);

        // Opcional: limpiar mensaje de error anterior
        this.errorFactura = null;
      },
      error: (e) => {
        this.buscandoFactura = false;
        this.errorFactura = e?.message ?? 'Error consultando la factura.';
      }
    });
  }

  /** Extrae el sufijo numérico (p.ej. últimos 5 dígitos) para comparar vs. número de factura */
  private extraerSufijo(input: string): string {
    const soloNums = (input || '').replace(/\D+/g, '');
    return soloNums.slice(-5);
  }

  private mostrarAlerta(mensaje: string, tipo: 'info' | 'error' | 'ok' | string): void {
    this.snack.open(mensaje, 'Cerrar', {
      duration: 3500,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: tipo === 'error' ? ['snack-error']
                 : tipo === 'ok'   ? ['snack-ok']
                 : ['snack-info']
    });
  }

  /** Asegura solo dígitos en el input de Factura (si lo usas) */
  soloDigitos(evt: Event) {
    const el = evt.target as HTMLInputElement;
    const soloNums = el.value.replace(/\D+/g, '');
    if (el.value !== soloNums) {
      el.value = soloNums;
      this.encabezado.factura = soloNums; // mantiene el ngModel limpio
    }
  }

  /** dd/mm/yyyy */
  private formatearDDMMYYYY(input: string | Date): string {
    const d = new Date(input);
    if (isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  /** Forzar MAYÚSCULAS en observación al escribir */
  toUpperObservacion(evt: Event) {
    const el = evt.target as HTMLTextAreaElement;
    const up = (el.value || '').toUpperCase();
    if (el.value !== up) {
      el.value = up; // refleja en UI
    }
    this.observacion = up; // mantiene el texto mientras se escribe (sin trim)
  }

  // --- Helpers para TOTAL con 2 decimales y PUNTO ---
  private nf2 = new Intl.NumberFormat('es-EC', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  /** Convierte a número aunque venga como "123,45" */
  private toNumber(val: unknown): number {
    if (val == null) return 0;
    const s = String(val).replace(',', '.'); // normaliza coma -> punto
    const n = parseFloat(s);
    return isFinite(n) ? n : 0;
  }

  /** Si usas en el HTML: [value]="formatTotal(encabezado.total)" */
  formatTotal(total: number | null | undefined): string {
    const n = this.toNumber(total ?? 0);
    return n.toFixed(2); // SIEMPRE con punto como separador decimal
  }
}
