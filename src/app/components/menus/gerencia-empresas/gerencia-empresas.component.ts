import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { ClienteService } from 'src/app/services/cliente.service';
import { ApiResponse } from 'src/app/interfaces/responses/api-response';

// ==== Tipos del endpoint ====
export interface TipoClienteConteoResponse {
  idTipoCliente: number | null;
  descripcion: string;
  cantidad: number;
}

export interface ResumenTipoClienteAnioMesResponse {
  anio: number;
  mes: number;
  acumuladoAnio: TipoClienteConteoResponse[];
  acumuladoMes: TipoClienteConteoResponse[];
}

export interface ResumenTipoClienteTotalResponse {
  totalPorTipo: TipoClienteConteoResponse[];
  diagnostico?: { total: number };
}

type MixRow = {
  idTipoCliente: number | null;
  descripcion: string;
  cantidadTotal: number;
  cantidadAnual: number;
  cantidadMensual: number;
  anio: number;
  mes: number;
};

type DetalleBlock = {
  tipo: MixRow;
  afiliadas: MixRow;
  desafiliadas: MixRow;
};

@Component({
  selector: 'app-gerencia-empresas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,

    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  templateUrl: './gerencia-empresas.component.html',
  styleUrl: './gerencia-empresas.component.css'
})
export class GerenciaEmpresasComponent implements OnInit {

  // === Data dashboard ===
  mixTotal: MixRow[] = [];
  mixAfiliadas: MixRow[] = [];
  mixDesafiliadas: MixRow[] = [];
  detalle: DetalleBlock[] = [];

  // ✅ Totales globales (lo que te faltaba “ver”)
  totales = {
    totalClientes: 0,
    afiliadasTotal: 0,
    desafiliadasTotal: 0,
    afiliadasAnio: 0,
    afiliadasMes: 0,
    desafiliadasAnio: 0,
    desafiliadasMes: 0
  };

  anio: number = new Date().getFullYear();
  mes: number = new Date().getMonth() + 1;

  cargando = false;
  mensaje = '';

  meses = [
    { value: 1,  label: 'Enero' },
    { value: 2,  label: 'Febrero' },
    { value: 3,  label: 'Marzo' },
    { value: 4,  label: 'Abril' },
    { value: 5,  label: 'Mayo' },
    { value: 6,  label: 'Junio' },
    { value: 7,  label: 'Julio' },
    { value: 8,  label: 'Agosto' },
    { value: 9,  label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' },
  ];

  get mesLabel(): string {
    return this.meses.find(x => x.value === this.mes)?.label ?? `Mes ${this.mes}`;
  }

  constructor(private clienteService: ClienteService) {}

  ngOnInit(): void {
    this.cargarResumen();
  }

  onFiltroChange(): void {
    if (!this.mes || this.mes < 1 || this.mes > 12) this.mes = 1;
    if (!this.anio || this.anio < 2000 || this.anio > 2100) this.anio = new Date().getFullYear();
    this.cargarResumen();
  }

  // ✅ porcentaje para barras
  pct(parte: number, total: number): number {
    const t = Number(total) || 0;
    if (t <= 0) return 0;
    const p = ((Number(parte) || 0) / t) * 100;
    return Math.max(0, Math.min(100, Math.round(p * 10) / 10));
  }

  private cargarResumen(): void {
    this.cargando = true;
    this.mensaje = '';

    forkJoin({
      // TOTAL (sin filtro)
      total: this.clienteService.getResumenTipoClienteTotal(),
      anioMes: this.clienteService.getResumenTipoClienteAnioMes(this.anio, this.mes),

      // AFILIADAS
      totalAf: this.clienteService.getResumenTipoClienteTotalAfiliadas(),
      anioMesAf: this.clienteService.getResumenTipoClienteAnioMesAfiliadas(this.anio, this.mes),
    }).subscribe({
      next: (resp: {
        total: ApiResponse<ResumenTipoClienteTotalResponse>,
        anioMes: ApiResponse<ResumenTipoClienteAnioMesResponse>,
        totalAf: ApiResponse<ResumenTipoClienteTotalResponse>,
        anioMesAf: ApiResponse<ResumenTipoClienteAnioMesResponse>
      }) => {

        const totalList = resp.total?.data?.totalPorTipo ?? [];
        const anual = resp.anioMes?.data?.acumuladoAnio ?? [];
        const mensual = resp.anioMes?.data?.acumuladoMes ?? [];

        const totalAfList = resp.totalAf?.data?.totalPorTipo ?? [];
        const anualAf = resp.anioMesAf?.data?.acumuladoAnio ?? [];
        const mensualAf = resp.anioMesAf?.data?.acumuladoMes ?? [];

        // ✅ combinar
        this.mixTotal = this.combinarTotalAnualMensual(totalList, anual, mensual, this.anio, this.mes);
        this.mixAfiliadas = this.combinarTotalAnualMensual(totalAfList, anualAf, mensualAf, this.anio, this.mes);
        this.mixDesafiliadas = this.restarMix(this.mixTotal, this.mixAfiliadas, this.anio, this.mes);

        this.detalle = this.construirDetalle(this.mixTotal, this.mixAfiliadas, this.mixDesafiliadas);

        // ✅ totales globales (lo que faltaba “ver”)
        this.calcularTotales();

        this.mensaje = resp.anioMes?.message || resp.total?.message || 'OK';
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar dashboard', err);
        this.mensaje = 'Error al cargar datos';
        this.mixTotal = [];
        this.mixAfiliadas = [];
        this.mixDesafiliadas = [];
        this.detalle = [];
        this.totales = {
          totalClientes: 0,
          afiliadasTotal: 0,
          desafiliadasTotal: 0,
          afiliadasAnio: 0,
          afiliadasMes: 0,
          desafiliadasAnio: 0,
          desafiliadasMes: 0
        };
        this.cargando = false;
      }
    });
  }

  private keyOf(id: number | null): string {
    return String(id ?? 'null');
  }

  private zeroRow(desc: string, anio: number, mes: number, idTipoCliente: number | null): MixRow {
    return {
      idTipoCliente,
      descripcion: desc,
      cantidadTotal: 0,
      cantidadAnual: 0,
      cantidadMensual: 0,
      anio,
      mes
    };
  }

  private combinarTotalAnualMensual(
    total: TipoClienteConteoResponse[],
    anual: TipoClienteConteoResponse[],
    mensual: TipoClienteConteoResponse[],
    anio: number,
    mes: number
  ): MixRow[] {

    const mapTotal = new Map<string, { id: number | null, desc: string, cant: number }>();
    for (const t of (total || [])) {
      const k = this.keyOf(t.idTipoCliente ?? null);
      mapTotal.set(k, {
        id: t.idTipoCliente ?? null,
        desc: (t.descripcion ?? 'SIN TIPO').trim(),
        cant: Number(t.cantidad) || 0
      });
    }

    const mapAnual = new Map<string, { id: number | null, desc: string, cant: number }>();
    for (const a of (anual || [])) {
      const k = this.keyOf(a.idTipoCliente ?? null);
      mapAnual.set(k, {
        id: a.idTipoCliente ?? null,
        desc: (a.descripcion ?? 'SIN TIPO').trim(),
        cant: Number(a.cantidad) || 0
      });
    }

    const mapMensual = new Map<string, { id: number | null, desc: string, cant: number }>();
    for (const m of (mensual || [])) {
      const k = this.keyOf(m.idTipoCliente ?? null);
      mapMensual.set(k, {
        id: m.idTipoCliente ?? null,
        desc: (m.descripcion ?? 'SIN TIPO').trim(),
        cant: Number(m.cantidad) || 0
      });
    }

    const keys = Array.from(new Set([...mapTotal.keys(), ...mapAnual.keys(), ...mapMensual.keys()]));

    // Orden por id (null al final)
    keys.sort((ka, kb) => {
      const a = mapTotal.get(ka)?.id ?? mapAnual.get(ka)?.id ?? mapMensual.get(ka)?.id;
      const b = mapTotal.get(kb)?.id ?? mapAnual.get(kb)?.id ?? mapMensual.get(kb)?.id;
      if (a == null && b == null) return 0;
      if (a == null) return 1;
      if (b == null) return -1;
      return a - b;
    });

    return keys.map(k => {
      const t = mapTotal.get(k);
      const a = mapAnual.get(k);
      const m = mapMensual.get(k);

      const id = t?.id ?? a?.id ?? m?.id ?? null;
      const desc = (t?.desc || a?.desc || m?.desc || 'SIN TIPO').trim();

      return {
        idTipoCliente: id,
        descripcion: desc,
        cantidadTotal: t?.cant ?? 0,
        cantidadAnual: a?.cant ?? 0,
        cantidadMensual: m?.cant ?? 0,
        anio,
        mes
      };
    });
  }

  private restarMix(total: MixRow[], afiliadas: MixRow[], anio: number, mes: number): MixRow[] {
    const mapAf = new Map<string, MixRow>();
    for (const a of (afiliadas || [])) mapAf.set(this.keyOf(a.idTipoCliente), a);

    return (total || []).map(t => {
      const a = mapAf.get(this.keyOf(t.idTipoCliente));

      return {
        idTipoCliente: t.idTipoCliente,
        descripcion: t.descripcion,
        cantidadTotal: Math.max(0, (t.cantidadTotal || 0) - (a?.cantidadTotal || 0)),
        cantidadAnual: Math.max(0, (t.cantidadAnual || 0) - (a?.cantidadAnual || 0)),
        cantidadMensual: Math.max(0, (t.cantidadMensual || 0) - (a?.cantidadMensual || 0)),
        anio,
        mes
      };
    });
  }

  private construirDetalle(total: MixRow[], afiliadas: MixRow[], desafiliadas: MixRow[]): DetalleBlock[] {
    const mapAf = new Map<string, MixRow>(afiliadas.map(x => [this.keyOf(x.idTipoCliente), x]));
    const mapDes = new Map<string, MixRow>(desafiliadas.map(x => [this.keyOf(x.idTipoCliente), x]));

    return (total || []).map(t => {
      const af = mapAf.get(this.keyOf(t.idTipoCliente)) ?? this.zeroRow('AFILIADAS', t.anio, t.mes, t.idTipoCliente);
      const des = mapDes.get(this.keyOf(t.idTipoCliente)) ?? this.zeroRow('DESAFILIADAS', t.anio, t.mes, t.idTipoCliente);

      return {
        tipo: t,
        afiliadas: { ...af, descripcion: 'AFILIADAS' },
        desafiliadas: { ...des, descripcion: 'DESAFILIADAS' }
      };
    });
  }

  private calcularTotales(): void {
    const sum = (arr: MixRow[], field: keyof MixRow) =>
      (arr || []).reduce((acc, x) => acc + (Number(x?.[field]) || 0), 0);

    this.totales.totalClientes     = sum(this.mixTotal, 'cantidadTotal');
    this.totales.afiliadasTotal    = sum(this.mixAfiliadas, 'cantidadTotal');
    this.totales.desafiliadasTotal = sum(this.mixDesafiliadas, 'cantidadTotal');

    this.totales.afiliadasAnio     = sum(this.mixAfiliadas, 'cantidadAnual');
    this.totales.afiliadasMes      = sum(this.mixAfiliadas, 'cantidadMensual');
    this.totales.desafiliadasAnio  = sum(this.mixDesafiliadas, 'cantidadAnual');
    this.totales.desafiliadasMes   = sum(this.mixDesafiliadas, 'cantidadMensual');
  }

  exportarPdf(): void {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Resumen Tipo Cliente - Año ${this.anio} | Mes: ${this.mesLabel}`, 14, 15);

    // tabla por tipo
    const body: any[] = [];
    for (const b of (this.detalle || [])) {
      body.push([b.tipo.descripcion.toUpperCase(), b.tipo.cantidadTotal, b.tipo.cantidadAnual, b.tipo.cantidadMensual]);

      body.push(['AFILIADAS',
        b.afiliadas.cantidadTotal,
        b.afiliadas.cantidadAnual,
        b.afiliadas.cantidadMensual
      ]);

      body.push(['DESAFILIADAS',
        b.desafiliadas.cantidadTotal,
        b.desafiliadas.cantidadAnual,
        b.desafiliadas.cantidadMensual
      ]);

      body.push(['', '', '', '']);
    }

    autoTable(doc, {
      head: [['Descripción', 'Total', 'Año', 'Mes']],
      body,
      startY: 22,
      styles: { fontSize: 10 }
    });

    doc.save(`Resumen-TipoCliente-${this.anio}-${this.mes}.pdf`);
  }
}
