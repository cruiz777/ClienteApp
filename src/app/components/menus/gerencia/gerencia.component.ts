import { Component, OnInit } from '@angular/core';
import { ProductoAdicionalService, GtinResumenResponse, ApiResponse } from 'src/app/services/producto-adicional.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PermissionsService } from 'src/app/services/permission.service';

@Component({
  selector: 'app-gerencia',
  templateUrl: './gerencia.component.html',
  styleUrls: ['./gerencia.component.css']
})
export class GerenciaComponent implements OnInit {

  resumenGtin: GtinResumenResponse[] = [];
  anio: number = new Date().getFullYear();
  cargando: boolean = false;
  mensaje: string = '';

  constructor(public productoAdicionalService: ProductoAdicionalService,
    public permissions: PermissionsService
  ) {}

  ngOnInit(): void {
    this.obtenerResumen();
  }

  obtenerResumen(): void {
    this.cargando = true;
    this.productoAdicionalService.getResumenPorAnio(this.anio).subscribe({
      next: (resp: ApiResponse<GtinResumenResponse[]>) => {
        this.resumenGtin = resp.data || [];
        this.mensaje = resp.message;
        this.cargando = false;
      },
      error: (err: any) => {
        console.error('Error al obtener resumen GTIN', err);
        this.mensaje = 'Error al cargar datos';
        this.resumenGtin = [];
        this.cargando = false;
      }
    });
  }

  cambiarAnio(anio: number): void {
    this.anio = anio;
    this.obtenerResumen();
  }

  exportarPdf(): void {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Resumen de GTIN - Año ${this.anio}`, 14, 15);

    const body = this.resumenGtin.map(item => [
      item.gtinTipo,
      item.cantidad.toString(),
      item.anio.toString()
    ]);

    autoTable(doc, {
      head: [['GTIN Tipo', 'Cantidad', 'Año']],
      body,
      startY: 25
    });

    doc.save(`Resumen-GTIN-${this.anio}.pdf`);
  }
}
