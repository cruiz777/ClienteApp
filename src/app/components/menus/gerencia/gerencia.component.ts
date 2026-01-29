import { Component, OnInit } from '@angular/core';
import {
  ProductoAdicionalService,
  GtinResumenResponse,
  GtinResumenResponseM,
  ApiResponse
} from 'src/app/services/producto-adicional.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PermissionsService } from 'src/app/services/permission.service';
import { forkJoin } from 'rxjs';

type GtinMixRow = {
  gtinTipo: string;
  cantidadAnual: number;
  cantidadMensual: number;
  anio: number;
  mes: number;
};

@Component({
  selector: 'app-gerencia',
  templateUrl: './gerencia.component.html',
  styleUrls: ['./gerencia.component.css']
})
export class GerenciaComponent implements OnInit {

  // Datos crudos (opcional conservarlos)
  resumenGtinAnio: GtinResumenResponse[] = [];
  resumenGtinMes: GtinResumenResponseM[] = [];

  // ✅ Tabla final combinada (lo que debes pintar)
  resumenGtinMix: GtinMixRow[] = [];

  anio: number = new Date().getFullYear();
  mes: number = new Date().getMonth() + 1; // 1..12

  cargando: boolean = false;
  mensaje: string = '';

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
    public productoAdicionalService: ProductoAdicionalService,
    public permissions: PermissionsService
  ) {}

  ngOnInit(): void {
    this.cargarTodo();
  }

  onFiltroChange(): void {
    // Validación rápida de mes
    if (!this.mes || this.mes < 1 || this.mes > 12) {
      this.mes = 1;
    }
    // Validación año (opcional)
    if (!this.anio || this.anio < 2000 || this.anio > 2100) {
      this.anio = new Date().getFullYear();
    }
    this.cargarTodo();
  }

  private cargarTodo(): void {
    this.cargando = true;
    this.mensaje = '';

    forkJoin({
      anio: this.productoAdicionalService.getResumenPorAnio(this.anio),
      mes: this.productoAdicionalService.getResumenPorMes(this.anio, this.mes)
    }).subscribe({
      next: (resp) => {
        this.resumenGtinAnio = resp.anio?.data || [];
        this.resumenGtinMes = resp.mes?.data || [];

        // ✅ Construir tabla combinada (anual + mensual)
        this.resumenGtinMix = this.combinarAnualMensual(
          this.resumenGtinAnio,
          this.resumenGtinMes,
          this.anio,
          this.mes
        );

        // Mensaje de estado
        this.mensaje = resp.mes?.message || resp.anio?.message || 'OK';
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar resumen GTIN', err);
        this.mensaje = 'Error al cargar datos';
        this.resumenGtinAnio = [];
        this.resumenGtinMes = [];
        this.resumenGtinMix = [];
        this.cargando = false;
      }
    });
  }

  private combinarAnualMensual(
    anioData: GtinResumenResponse[],
    mesData: GtinResumenResponseM[],
    anio: number,
    mes: number
  ): GtinMixRow[] {

    // Orden “preferido” para que siempre se vea igual
    const orden = ['GTIN-8', 'GTIN-8I', 'UPC', 'GTIN-12I', 'GTIN-13', 'GTIN-13I', 'GTIN-14', 'GTIN-14I'];

    const mapAnio = new Map<string, number>(
      (anioData || []).map(x => [x.gtinTipo?.trim() ?? '', Number(x.cantidad) || 0])
    );

    const mapMes = new Map<string, number>(
      (mesData || []).map(x => [x.gtinTipo?.trim() ?? '', Number(x.cantidad) || 0])
    );

    // Unir por gtinTipo
    const tipos = Array.from(new Set([...mapAnio.keys(), ...mapMes.keys()]))
      .filter(x => x); // elimina vacíos

    // Ordena por el orden estándar; si aparece uno nuevo, queda al final en orden alfabético
    tipos.sort((a, b) => {
      const ia = orden.indexOf(a);
      const ib = orden.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

    return tipos.map(gtinTipo => ({
      gtinTipo,
      cantidadAnual: mapAnio.get(gtinTipo) ?? 0,
      cantidadMensual: mapMes.get(gtinTipo) ?? 0,
      anio,
      mes
    }));
  }

  exportarPdf(): void {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Resumen de GTIN - Año ${this.anio} | Mes: ${this.mesLabel}`, 14, 15);

    const body = this.resumenGtinMix.map(r => ([
      r.gtinTipo,
      r.cantidadAnual.toString(),
      r.cantidadMensual.toString()
    ]));

    autoTable(doc, {
      head: [['GTIN Tipo', 'Cantidad Anual', 'Cantidad Mensual']],
      body,
      startY: 22
    });

    doc.save(`Resumen-GTIN-${this.anio}-${this.mes}.pdf`);
  }
}
