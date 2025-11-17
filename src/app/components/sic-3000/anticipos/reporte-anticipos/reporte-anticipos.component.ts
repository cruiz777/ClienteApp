// reporte-anticipos.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ReactiveFormsModule,
  FormsModule
} from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { EstadoAnticipoFiltro, ReporteAnticipoRequest } from 'src/app/interfaces/requests/anticipo-request';
import { TipoAnticipoService } from 'src/app/services/tipo-anticipo.service';
import { AnticipoService } from 'src/app/services/anticipo.service';
import { AnticipoPDFService, FiltrosAplicadosPDF } from 'src/app/reports/anticipos-pdf.service';
import { TipoAnticipo } from 'src/app/interfaces/responses/tipo-anticipo-response';
import { FilePreviewComponent } from 'src/app/util/preview/file-preview.component';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/components/utils/messages/custom-message-box.component';
import { MatDialogRef } from '@angular/material/dialog';
import { LogoService } from 'src/app/services/logo.service';

@Component({
  standalone: true,
  selector: 'app-reporte-anticipos',
  templateUrl: './reporte-anticipos.component.html',
  styleUrls: ['./reporte-anticipos.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatSnackBarModule
  ]
})
export class ReporteAnticiposComponent implements OnInit {
  form!: FormGroup;
  tiposAnticipo: TipoAnticipo[] = [];
  loading = false;
  private loadingDialogRef?: MatDialogRef<CustomMessageBoxComponent>;

  private fb = inject(FormBuilder);
  private tipoAnticipoService = inject(TipoAnticipoService);
  private logoService = inject(LogoService);
  private anticipoService = inject(AnticipoService);
  private pdfService = inject(AnticipoPDFService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  ngOnInit(): void {
    this.buildForm();
    this.setupCheckboxLogic();
    this.cargarTiposAnticipo();
  }

  // ============ FORMULARIO ============
  private buildForm(): void {
    this.form = this.fb.group(
      {
        fechaInicio: [null, Validators.required],
        fechaFin: [null, Validators.required],
        tipoAnticipo: [null], // null = TODOS
        estado: this.fb.group({
          utilizado: [false],
          sinUtilizar: [false],
          todos: [true]
        })
      },
      { validators: [this.rangoFechasValidator()] }
    );
  }

  private setupCheckboxLogic(): void {
    const estadoGroup = this.form.get('estado')!;

    // Si marca "Todos", desmarca los otros
    estadoGroup.get('todos')!.valueChanges.subscribe(v => {
      if (v) {
        estadoGroup.patchValue(
          { utilizado: false, sinUtilizar: false },
          { emitEvent: false }
        );
      }
    });

    // Si marca "Utilizado", desmarca "Todos"
    estadoGroup.get('utilizado')!.valueChanges.subscribe(v => {
      if (v) estadoGroup.get('todos')!.setValue(false, { emitEvent: false });
    });

    // Si marca "Sin utilizar", desmarca "Todos"
    estadoGroup.get('sinUtilizar')!.valueChanges.subscribe(v => {
      if (v) estadoGroup.get('todos')!.setValue(false, { emitEvent: false });
    });
  }

  private rangoFechasValidator() {
    return (group: AbstractControl) => {
      const inicio = group.get('fechaInicio')?.value;
      const fin = group.get('fechaFin')?.value;
      if (inicio && fin && new Date(inicio) > new Date(fin)) {
        return { rangoInvalido: true };
      }
      return null;
    };
  }

  get f() {
    return this.form.controls;
  }

  // ============ CARGA DE DATOS ============
  private cargarTiposAnticipo(): void {
    this.tipoAnticipoService.getAll().subscribe({
      next: (response) => {
        if (response.data && Array.isArray(response.data)) {
          this.tiposAnticipo = response.data;
          console.log('[ReporteAnticipos] Tipos cargados:', this.tiposAnticipo.length);
        }
      },
      error: (err) => {
        console.error('[ReporteAnticipos] Error al cargar tipos:', err);
        this.snackBar.open('Error al cargar tipos de anticipo', 'Cerrar', { duration: 3000 });
      }
    });
  }

  // ============ ACCIONES ============
  async onGenerar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Por favor complete los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    const valores = this.form.value;
    const estadoFiltro = this.calcularEstadoFiltro(valores.estado);

    const request: ReporteAnticipoRequest = {
      fechaInicial: valores.fechaInicio,
      fechaFinal: valores.fechaFin,
      idTipoAnticipo: valores.tipoAnticipo,
      estadoFiltro: estadoFiltro,
      page: 1,
      pageSize: 100000
    };

    // ✅ Mostrar loading con MessageBox
    this.loadingDialogRef = this.dialog.open(CustomMessageBoxComponent, {
      data: {
        title: 'Generando Reporte',
        message: 'Por favor espere...',
        type: 'info',
        isLoading: true,
        loadingText: 'Procesando anticipos...',
        showCancel: false
      } as MessageBoxData,
      disableClose: true,
      width: '400px'
    });

    try {
      const response = await this.anticipoService.getReporteAnticipos(request).toPromise();

      if (!response || !response.data) {
        throw new Error('No se recibieron datos del servidor');
      }

      const { datos, totales } = response.data;

      if (datos.items.length === 0) {
        this.loadingDialogRef.close();
        this.snackBar.open('No se encontraron registros con los filtros aplicados', 'Cerrar', { duration: 4000 });
        return;
      }

      // ✅ Actualizar mensaje del loading
      this.loadingDialogRef.componentInstance.updateLoadingState(true, 'Generando PDF...');

      const itemsPDF = datos.items.map(item => ({
        numero: item.numero,
        fecha: item.fecha,
        nombre_cliente: item.nombre_cliente,
        concepto: item.concepto,
        monto_inicial: item.monto_inicial,
        monto_utilizado: item.monto_utilizado,
        saldo: item.saldo
      }));

      const totalesPDF = {
        total_monto_inicial: totales.total_monto_inicial,
        total_monto_utilizado: totales.total_monto_utilizado,
        total_saldo: totales.total_saldo
      };

      const filtrosPDF: FiltrosAplicadosPDF = {
        fechaInicial: this.formatearFecha(valores.fechaInicio),
        fechaFinal: this.formatearFecha(valores.fechaFin),
        tipoAnticipo: this.obtenerNombreTipoAnticipo(valores.tipoAnticipo),
        estado: this.obtenerNombreEstado(estadoFiltro),
        totalRegistros: datos.items.length
      };

      const idEmpresa = 1;
      await this.logoService.loadLogoFromEmpresa(idEmpresa);
      await new Promise(resolve => setTimeout(resolve, 300));
      const configEmpresa = await this.pdfService.obtenerConfiguracionEmpresa(idEmpresa);

      const pdfBlob = await this.pdfService.generarPDFBlob(
        itemsPDF,
        totalesPDF,
        filtrosPDF,
        {
          ...configEmpresa,
          titulo: 'Reporte de Anticipos',
          subtitulo: `Del ${filtrosPDF.fechaInicial} al ${filtrosPDF.fechaFinal}`,
          mostrarUsuario: 'Usuario Actual',
          mostrarFiltros: false,
          mostrarFechaGeneracion: true
        }
      );

      // ✅ Cerrar loading
      this.loadingDialogRef.close();

      // Mostrar preview
      this.dialog.open(FilePreviewComponent, {
        data: {
          file: pdfBlob,
          title: 'Reporte de Anticipos',
          showPrintButton: true,
          showDownloadButton: true
        },
        width: '95vw',
        height: '95vh',
        maxWidth: '100vw',
        panelClass: 'fullscreen-dialog'
      });

      this.snackBar.open('Reporte generado exitosamente', 'Cerrar', { duration: 3000 });

    } catch (error: any) {
      // ✅ Cerrar loading si está abierto
      if (this.loadingDialogRef) {
        this.loadingDialogRef.close();
      }

      console.error('[ReporteAnticipos] Error:', error);
      this.snackBar.open(
        `Error al generar el reporte: ${error.message || 'Desconocido'}`,
        'Cerrar',
        { duration: 5000 }
      );
    }
  }

  onCancelar(): void {
    this.form.reset({
      fechaInicio: null,
      fechaFin: null,
      tipoAnticipo: null,
      estado: { utilizado: false, sinUtilizar: false, todos: true }
    });
  }

  // ============ HELPERS ============
  private calcularEstadoFiltro(estado: any): EstadoAnticipoFiltro {
    if (estado.todos) return EstadoAnticipoFiltro.Todos;
    if (estado.utilizado) return EstadoAnticipoFiltro.Utilizados;
    if (estado.sinUtilizar) return EstadoAnticipoFiltro.SinUtilizar;
    return EstadoAnticipoFiltro.Todos; // default
  }

  private obtenerNombreTipoAnticipo(id: number | null): string {
    if (!id) return 'Todos';
    const tipo = this.tiposAnticipo.find(t => t.id_tipo_anticipo === id);
    return tipo?.descripcion || 'Desconocido';
  }

  private obtenerNombreEstado(filtro: EstadoAnticipoFiltro): string {
    switch (filtro) {
      case EstadoAnticipoFiltro.Todos: return 'Todos';
      case EstadoAnticipoFiltro.Utilizados: return 'Utilizados';
      case EstadoAnticipoFiltro.SinUtilizar: return 'Sin utilizar';
      default: return 'Todos';
    }
  }

  private formatearFecha(fecha: string): string {
    if (!fecha) return '';
    const d = new Date(fecha + 'T00:00:00'); // evita timezone issues
    return d.toLocaleDateString('es-EC', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
}
