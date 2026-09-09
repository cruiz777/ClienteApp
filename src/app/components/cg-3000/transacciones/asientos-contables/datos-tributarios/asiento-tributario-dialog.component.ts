import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

import { SustentoTributarioService } from 'src/app/services/sustento-tributario.service';
import { SustentoTributarioResponse } from 'src/app/interfaces/responses/sustento-tributario-response';

import { TipoComprobanteSriService } from 'src/app/services/tipocomprobantesri.service';
import { TipoComprobanteSriResponse } from 'src/app/interfaces/responses/tipo-comprobantesri-response';

import { TipoRetencionService } from 'src/app/services/tiporetencion.service';
import { TipoRetencionResponse } from 'src/app/interfaces/responses/tipo-retencion-response';

import { CentroCostosService } from 'src/app/services/centro-costos.service';
import { CentroCostosResponse } from 'src/app/interfaces/responses/centro-costos-response';

import { ProyectoService } from 'src/app/services/proyecto.service';
import { ProyectoResponse } from 'src/app/interfaces/responses/proyecto-response';

import { UsuarioService } from 'src/app/services/usuario.service';


export interface AsientoTributarioData {
  idSustentoTrib: number;
  idTipoCompSri: number;
  autorizacion: string;
  fechacaduca: string | null;   // string yyyy-MM-dd o null
  idTipoRetencion: number;
  idCentroCostos: number;
  idProyecto: number;
  idSubproyecto: number;

  /** Texto del tipo de movimiento (por ejemplo: "FCB - FACTURA TARIF.12% S...") */
  movLabel?: string;
}

@Component({
  selector: 'app-asiento-tributario-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './asiento-tributario-dialog.component.html',
  styleUrls: ['./asiento-tributario-dialog.component.css'],
})
export class AsientoTributarioDialogComponent implements OnInit {
  form: FormGroup;

  listaSustentos: { id: number; label: string }[] = [];
  listaTiposCompSri: { id: number; label: string }[] = [];
  listaTiposRetencion: { id: number; label: string }[] = [];

  listaCentroCostos: { id: number; descripcion: string }[] = [];
  listaProyectos: { id: number; descripcion: string }[] = [];
  listaSubProyectos = [{ id: 0, descripcion: 'Sin subproyecto' }];

  private usuarioActual: any;
  private idEmpresa = 0;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AsientoTributarioDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AsientoTributarioData,
    private sustentoService: SustentoTributarioService,
    private tipoCompSriService: TipoComprobanteSriService,
    private tipoRetencionService: TipoRetencionService,
    private centroCostosService: CentroCostosService,
    private proyectoService: ProyectoService,
    private usuarioService: UsuarioService
  ) {
    this.usuarioActual = this.usuarioService.getUsuarioActual();
    this.idEmpresa = this.usuarioActual?.id_empresa ?? 0;

    const fechaCaducaInicial = this.normalizarFechaCaduca(
      data?.fechacaduca ?? null
    );

    this.form = this.fb.group({
      idSustentoTrib: [data.idSustentoTrib || 0, Validators.required],
      idTipoCompSri: [data.idTipoCompSri || 0],
      autorizacion: [
        data.autorizacion || '',
        [
          Validators.maxLength(49),
          // solo números
          Validators.pattern(/^[0-9]*$/),
        ],
      ],
      // para input type="date" el valor debe ser 'yyyy-MM-dd' o null
      fechacaduca: [fechaCaducaInicial],
      idTipoRetencion: [data.idTipoRetencion || 0],
      idCentroCostos: [data.idCentroCostos || 0],
      idProyecto: [data.idProyecto || 0],
      idSubproyecto: [data.idSubproyecto || 0],
    });
  }

  /** Convierte "2025-11-19T08:14:00" -> "2025-11-19"
   *  que es lo que entiende <input type="date">
   */
  private normalizarFechaCaduca(fecha: string | null): string | null {
    if (!fecha) return null;
    return fecha.split('T')[0]; // yyyy-MM-dd
  }

  ngOnInit(): void {
    this.cargarSustentos();
    this.cargarTiposComprobanteSri();
    this.cargarTiposRetencion();
    this.cargarCentroCostos();
    this.cargarProyectos();
  }

  // ======= SUSTENTO TRIBUTARIO =======
  private cargarSustentos(): void {
    this.sustentoService.getAll().subscribe({
      next: (res) => {
        const data = (res.data ?? []) as SustentoTributarioResponse[];
        this.listaSustentos = data.map((s) => ({
          id: s.IdSustentoTrib,
          label: `${s.Codsustento} - ${s.Dessustento}`,
        }));
      },
      error: (err) =>
        console.error('Error cargando sustentos tributarios', err),
    });
  }

  // ======= TIPO COMPROBANTE SRI =======
  private cargarTiposComprobanteSri(): void {
    this.tipoCompSriService.getAll().subscribe({
      next: (resp) => {
        const data = (resp.data ?? []) as TipoComprobanteSriResponse[];
        this.listaTiposCompSri = data.map((t) => ({
          id: t.IdTipoCompSri,
          label: `${t.Codtipcomp} - ${t.Destipcomp}`,
        }));
      },
      error: (err) =>
        console.error('Error cargando tipos de comprobante SRI', err),
    });
  }

  // ======= TIPO RETENCIÓN =======
  private cargarTiposRetencion(): void {
    this.tipoRetencionService.getAll().subscribe({
      next: (resp) => {
        const data = (resp.data ?? []) as TipoRetencionResponse[];
        this.listaTiposRetencion = data.map((r) => ({
          id: r.IdTipoRetencion,
          label: `${r.CodigoTipoRet} - ${r.Descripcion} (${r.Porcentaje}%)`,
        }));
      },
      error: (err) =>
        console.error('Error cargando tipos de retención', err),
    });
  }

  private esActivo(obj: { estado: any }): boolean {
    const v: any = obj.estado;
    return v === true || v === 1 || v === '1';
  }

  // ======= CENTRO DE COSTOS =======
  private cargarCentroCostos(): void {
    this.centroCostosService.getAll().subscribe({
      next: (resp) => {
        const data = (resp.data ?? []) as CentroCostosResponse[];

        const filtrados = data.filter(
          (c) => c.idEmpresa === this.idEmpresa && this.esActivo(c)
        );

        const items = filtrados.map((c) => ({
          id: c.id,
          descripcion: c.descripcion ?? '',
        }));

        this.listaCentroCostos =
          items.length > 0 ? items : [{ id: 0, descripcion: 'Sin centro costos' }];
      },
      error: (err) =>
        console.error('Error cargando centros de costos', err),
    });
  }

  // ======= PROYECTOS =======
  private cargarProyectos(): void {
    this.proyectoService.getAll().subscribe({
      next: (resp) => {
        const data = (resp.data ?? []) as ProyectoResponse[];

        const filtrados = data.filter(
          (p) => p.idEmpresa === this.idEmpresa && this.esActivo(p)
        );

        const items = filtrados.map((p) => ({
          id: p.id,
          descripcion: p.descripcion ?? '',
        }));

        this.listaProyectos =
          items.length > 0 ? items : [{ id: 0, descripcion: 'Sin proyecto' }];
      },
      error: (err) => console.error('Error cargando proyectos', err),
    });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.value as AsientoTributarioData;
    this.dialogRef.close(value);
  }

  cancelar(): void {
    this.dialogRef.close();
  }

  soloLetrasKeypress(event: KeyboardEvent): void {
    const char = event.key;

    // permitir teclas de control (backspace, tab, enter, arrows, etc.)
    if (char.length > 1) {
      return;
    }

    const regex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]$/;

    if (!regex.test(char)) {
      event.preventDefault();
    }
  }

  soloNumerosKeypress(event: KeyboardEvent): void {
    const char = event.key;

    // permitir teclas de control (Backspace, Tab, Enter, flechas, etc.)
    if (char.length > 1) {
      return;
    }

    const regex = /^[0-9]$/;

    if (!regex.test(char)) {
      event.preventDefault();
    }
  }
}
