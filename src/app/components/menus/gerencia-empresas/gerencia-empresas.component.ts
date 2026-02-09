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

import { PermissionsService } from 'src/app/services/permission.service';
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


type MixRow = {
  idTipoCliente: number | null;
  descripcion: string;
  cantidadTotal: number;    // ✅ NUEVO
  cantidadAnual: number;
  cantidadMensual: number;
  anio: number;
  mes: number;
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

  // Tabla final combinada
  resumenMix: MixRow[] = [];

  anio: number = new Date().getFullYear();
  mes: number = new Date().getMonth() + 1;
resumenTotalPorTipo: TipoClienteConteoResponse[] = [];

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

  constructor(
    private clienteService: ClienteService,
    public permissions: PermissionsService
  ) {}

  ngOnInit(): void {
    this.cargarResumen();
  }

  onFiltroChange(): void {
    if (!this.mes || this.mes < 1 || this.mes > 12) this.mes = 1;
    if (!this.anio || this.anio < 2000 || this.anio > 2100) this.anio = new Date().getFullYear();
    this.cargarResumen();
  }

private cargarResumen(): void {
  this.cargando = true;
  this.mensaje = '';

  forkJoin({
    total: this.clienteService.getResumenTipoClienteTotal(),
    anioMes: this.clienteService.getResumenTipoClienteAnioMes(this.anio, this.mes)
  }).subscribe({
    next: (resp) => {
      // ✅ total
      this.resumenTotalPorTipo = resp.total?.data?.totalPorTipo ?? [];

      // ✅ anio/mes
      const data = resp.anioMes?.data;
      const anual = data?.acumuladoAnio ?? [];
      const mensual = data?.acumuladoMes ?? [];

      // ✅ mezcla final
      this.resumenMix = this.combinar(anual, mensual, this.anio, this.mes);

      this.mensaje = resp.anioMes?.message || resp.total?.message || 'OK';
      this.cargando = false;
    },
    error: (err) => {
      console.error('Error al cargar resumen tipo cliente', err);
      this.mensaje = 'Error al cargar datos';
      this.resumenTotalPorTipo = [];
      this.resumenMix = [];
      this.cargando = false;
    }
  });
}


 private combinar(
  anual: TipoClienteConteoResponse[],
  mensual: TipoClienteConteoResponse[],
  anio: number,
  mes: number
): MixRow[] {

  const mapTotal = new Map<string, { id: number | null, desc: string, cant: number }>();
  for (const t of (this.resumenTotalPorTipo || [])) {
    const key = String(t.idTipoCliente ?? 'null');
    mapTotal.set(key, {
      id: t.idTipoCliente ?? null,
      desc: (t.descripcion ?? 'SIN TIPO').trim(),
      cant: Number(t.cantidad) || 0
    });
  }

  const mapAnual = new Map<string, { id: number | null, desc: string, cant: number }>();
  for (const a of (anual || [])) {
    const key = String(a.idTipoCliente ?? 'null');
    mapAnual.set(key, {
      id: a.idTipoCliente ?? null,
      desc: (a.descripcion ?? 'SIN TIPO').trim(),
      cant: Number(a.cantidad) || 0
    });
  }

  const mapMensual = new Map<string, { id: number | null, desc: string, cant: number }>();
  for (const m of (mensual || [])) {
    const key = String(m.idTipoCliente ?? 'null');
    mapMensual.set(key, {
      id: m.idTipoCliente ?? null,
      desc: (m.descripcion ?? 'SIN TIPO').trim(),
      cant: Number(m.cantidad) || 0
    });
  }

  const keys = Array.from(new Set([
    ...mapTotal.keys(),
    ...mapAnual.keys(),
    ...mapMensual.keys()
  ]));

  // Orden: por id_tipo_cliente (null al final)
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
      cantidadTotal: t?.cant ?? 0,      // ✅ ahora sí
      cantidadAnual: a?.cant ?? 0,
      cantidadMensual: m?.cant ?? 0,
      anio,
      mes
    };
  });
}

  exportarPdf(): void {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Resumen Tipo Cliente - Año ${this.anio} | Mes: ${this.mesLabel}`, 14, 15);

    const body = this.resumenMix.map(r => ([
      (r.idTipoCliente ?? '').toString(),
      r.descripcion,
      r.cantidadAnual.toString(),
      r.cantidadMensual.toString(),
    ]));

    autoTable(doc, {
      head: [['Id Tipo', 'Descripción', 'Cantidad Anual', 'Cantidad Mensual']],
      body,
      startY: 22
    });

    doc.save(`Resumen-TipoCliente-${this.anio}-${this.mes}.pdf`);
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
    const key = String(t.idTipoCliente ?? 'null');
    mapTotal.set(key, {
      id: t.idTipoCliente ?? null,
      desc: (t.descripcion ?? 'SIN TIPO').trim(),
      cant: Number(t.cantidad) || 0
    });
  }

  const mapAnual = new Map<string, { id: number | null, desc: string, cant: number }>();
  for (const a of (anual || [])) {
    const key = String(a.idTipoCliente ?? 'null');
    mapAnual.set(key, {
      id: a.idTipoCliente ?? null,
      desc: (a.descripcion ?? 'SIN TIPO').trim(),
      cant: Number(a.cantidad) || 0
    });
  }

  const mapMensual = new Map<string, { id: number | null, desc: string, cant: number }>();
  for (const m of (mensual || [])) {
    const key = String(m.idTipoCliente ?? 'null');
    mapMensual.set(key, {
      id: m.idTipoCliente ?? null,
      desc: (m.descripcion ?? 'SIN TIPO').trim(),
      cant: Number(m.cantidad) || 0
    });
  }

  const keys = Array.from(new Set([
    ...mapTotal.keys(),
    ...mapAnual.keys(),
    ...mapMensual.keys()
  ]));

  // Orden: por id_tipo_cliente (null al final)
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

}
