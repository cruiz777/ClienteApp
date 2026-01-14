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

@Component({
  selector: 'app-gerencia',
  templateUrl: './gerencia.component.html',
  styleUrls: ['./gerencia.component.css']
})
export class GerenciaComponent implements OnInit {

  resumenGtinAnio: GtinResumenResponse[] = [];
  resumenGtinMes: GtinResumenResponseM[] = [];

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
        this.resumenGtinAnio = resp.anio.data || [];
        this.resumenGtinMes = resp.mes.data || [];

        // mensaje: prioriza el que venga con texto útil
        this.mensaje = resp.mes.message || resp.anio.message || 'OK';
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar resumen GTIN', err);
        this.mensaje = 'Error al cargar datos';
        this.resumenGtinAnio = [];
        this.resumenGtinMes = [];
        this.cargando = false;
      }
    });
  }

  exportarPdf(): void {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Resumen de GTIN - Año ${this.anio}`, 14, 15);

    // Tabla Año
    const bodyAnio = this.resumenGtinAnio.map(i => [
      i.gtinTipo,
      i.cantidad.toString()
    ]);

    autoTable(doc, {
      head: [['GTIN Tipo', 'Cantidad (Año)']],
      body: bodyAnio,
      startY: 22
    });

    // Tabla Mes (debajo)
    const y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : 60;
    doc.setFontSize(12);
    doc.text(`Resumen Mensual - ${this.mesLabel} ${this.anio}`, 14, y);

    const bodyMes = this.resumenGtinMes.map(i => [
      i.gtinTipo,
      i.cantidad.toString()
    ]);

    autoTable(doc, {
      head: [['GTIN Tipo', 'Cantidad (Mes)']],
      body: bodyMes,
      startY: y + 5
    });

    doc.save(`Resumen-GTIN-${this.anio}-${this.mes}.pdf`);
  }
}
