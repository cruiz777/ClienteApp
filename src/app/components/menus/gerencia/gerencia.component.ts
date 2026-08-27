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
  cantidadTotal: number;   // ✅ 2da columna
  cantidadAnual: number;   // ✅ 3ra columna
  cantidadMensual: number; // ✅ 4ta columna (año+mes)
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
  resumenGtinTotal: { gtinTipo: string; cantidad: number }[] = [];


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
    total: this.productoAdicionalService.getResumenTotal(),          // ✅ TOTAL sin filtros
    anio: this.productoAdicionalService.getResumenPorAnio(this.anio), // ✅ por año
    mes: this.productoAdicionalService.getResumenPorMes(this.anio, this.mes) // ✅ por año/mes
  }).subscribe({
    next: (resp) => {
      // ✅ data sets
      this.resumenGtinTotal = resp.total?.data || [];
      this.resumenGtinAnio  = resp.anio?.data  || [];
      this.resumenGtinMes   = resp.mes?.data   || [];

      // ✅ construir tabla final (Total + Anual + Mensual)
      this.resumenGtinMix = this.combinarAnualMensual(
        this.resumenGtinAnio,
        this.resumenGtinMes,
        this.anio,
        this.mes
      );

      // ✅ mensaje
      this.mensaje =
        resp.mes?.message ||
        resp.anio?.message ||
        resp.total?.message ||
        'OK';

      this.cargando = false;
    },
    error: (err) => {
      console.error('Error al cargar resumen GTIN', err);

      this.mensaje = 'Error al cargar datos';

      // limpia todo
      this.resumenGtinTotal = [];
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

  const orden = ['GTIN-8', 'GTIN-8I', 'UPC', 'GTIN-12I', 'GTIN-13', 'GTIN-13I', 'GTIN-14', 'GTIN-14I'];

  // ✅ TOTAL viene de this.resumenGtinTotal (ya lo tienes en el service)
  const mapTotal = new Map<string, number>(
    (this.resumenGtinTotal || []).map(x => [x.gtinTipo?.trim() ?? '', Number(x.cantidad) || 0])
  );

  const mapAnio = new Map<string, number>(
    (anioData || []).map(x => [x.gtinTipo?.trim() ?? '', Number(x.cantidad) || 0])
  );

  const mapMes = new Map<string, number>(
    (mesData || []).map(x => [x.gtinTipo?.trim() ?? '', Number(x.cantidad) || 0])
  );

  const tipos = Array.from(new Set([
    ...mapTotal.keys(),
    ...mapAnio.keys(),
    ...mapMes.keys()
  ])).filter(x => x);

  tipos.sort((a, b) => {
    const ia = orden.indexOf(a);
    const ib = orden.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  // ✅ Ahora SÍ retorna cantidadTotal
  return tipos.map(gtinTipo => ({
    gtinTipo,
    cantidadTotal: mapTotal.get(gtinTipo) ?? 0,
    cantidadAnual: mapAnio.get(gtinTipo) ?? 0,
    cantidadMensual: mapMes.get(gtinTipo) ?? 0,
    anio,
    mes
  }));
}


 exportarPdf(): void {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(`Resumen de GTIN - TOTAL | Año ${this.anio} | Mes: ${this.mesLabel}`, 14, 15);

  const body = this.resumenGtinMix.map(r => ([
    r.gtinTipo,
    r.cantidadTotal.toString(),
    r.cantidadAnual.toString(),
    r.cantidadMensual.toString()
  ]));

  autoTable(doc, {
    head: [['GTIN Tipo', 'Total', 'Cantidad Anual', 'Cantidad Mensual']],
    body,
    startY: 22
  });

  doc.save(`Resumen-GTIN-TOTAL-${this.anio}-${this.mes}.pdf`);
}

  private combinarTotalAnualMensual(
  totalData: { gtinTipo: string; cantidad: number }[],
  anioData: GtinResumenResponse[],
  mesData: GtinResumenResponseM[],
  anio: number,
  mes: number
): GtinMixRow[] {

  const orden = ['GTIN-8', 'GTIN-8I', 'UPC', 'GTIN-12I', 'GTIN-13', 'GTIN-13I', 'GTIN-14', 'GTIN-14I'];

  const mapTotal = new Map<string, number>(
    (totalData || []).map(x => [x.gtinTipo?.trim() ?? '', Number(x.cantidad) || 0])
  );

  const mapAnio = new Map<string, number>(
    (anioData || []).map(x => [x.gtinTipo?.trim() ?? '', Number(x.cantidad) || 0])
  );

  const mapMes = new Map<string, number>(
    (mesData || []).map(x => [x.gtinTipo?.trim() ?? '', Number(x.cantidad) || 0])
  );

  const tipos = Array.from(new Set([
    ...mapTotal.keys(),
    ...mapAnio.keys(),
    ...mapMes.keys()
  ])).filter(x => x);

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
    cantidadTotal: mapTotal.get(gtinTipo) ?? 0,
    cantidadAnual: mapAnio.get(gtinTipo) ?? 0,
    cantidadMensual: mapMes.get(gtinTipo) ?? 0,
    anio,
    mes
  }));
}

}
