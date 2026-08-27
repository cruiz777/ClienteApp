import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import * as XLSX from 'xlsx';

import {
  ReporteCumpleaniosEmpleadoResponse,
  ReporteCumpleaniosRequest,
  ReportesEmpleadosService
} from 'src/app/services/rol/reportes-empleados.service';

@Component({
  selector: 'app-reporte-cumpleanios',
  templateUrl: './reporte-cumpleanios.component.html',
  styleUrls: ['./reporte-cumpleanios.component.css']
})
export class ReporteCumpleaniosComponent implements OnInit {

  form!: FormGroup;
  consultando = false;

  empleados: ReporteCumpleaniosEmpleadoResponse[] = [];
  empleadosPaginados: ReporteCumpleaniosEmpleadoResponse[] = [];

  paginaActual = 1;
  tamanioPagina = 10;
  totalPaginas = 1;

  opcionesPagina: number[] = [10, 25, 50, 100];

  meses = [
    { valor: 1, nombre: 'Enero' },
    { valor: 2, nombre: 'Febrero' },
    { valor: 3, nombre: 'Marzo' },
    { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' },
    { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' },
    { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Septiembre' },
    { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' },
    { valor: 12, nombre: 'Diciembre' }
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly reportesService: ReportesEmpleadosService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const hoy = new Date();

    this.form = this.fb.group({
      mesInicial: [hoy.getMonth() + 1, Validators.required],
      diaInicial: [hoy.getDate(), Validators.required],
      mesFinal: [hoy.getMonth() + 1, Validators.required],
      diaFinal: [hoy.getDate(), Validators.required]
    });
  }

  aceptar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.mostrarMensaje('Debe seleccionar el mes y día inicial y final.');
      return;
    }

    if (this.consultando) {
      return;
    }

    const mesInicial = Number(this.form.get('mesInicial')?.value);
    const diaInicial = Number(this.form.get('diaInicial')?.value);
    const mesFinal = Number(this.form.get('mesFinal')?.value);
    const diaFinal = Number(this.form.get('diaFinal')?.value);

    if (!this.fechaMesDiaValida(mesInicial, diaInicial)) {
      this.mostrarMensaje('La fecha inicial no es válida.');
      return;
    }

    if (!this.fechaMesDiaValida(mesFinal, diaFinal)) {
      this.mostrarMensaje('La fecha final no es válida.');
      return;
    }

    const request: ReporteCumpleaniosRequest = {
      fechaDesde: this.construirFechaMesDia(mesInicial, diaInicial),
      fechaHasta: this.construirFechaMesDia(mesFinal, diaFinal),
      idEmpresa: null
    };

    this.consultando = true;
    this.empleados = [];
    this.empleadosPaginados = [];
    this.paginaActual = 1;
    this.totalPaginas = 1;

    this.reportesService.consultarCumpleanios(request).subscribe({
      next: response => {
        this.consultando = false;

        const tipo = (response.type ?? '').trim().toUpperCase();

        if (tipo !== 'SUCCESS') {
          this.empleados = [];
          this.empleadosPaginados = [];

          this.mostrarMensaje(
            response.message ??
            'No existen empleados con cumpleaños en el rango seleccionado.'
          );

          return;
        }

        this.empleados = response.data?.empleados ?? [];

        if (this.empleados.length === 0) {
          this.mostrarMensaje('No existen cumpleaños en el rango seleccionado.');
          return;
        }

        this.paginaActual = 1;
        this.calcularPaginacion();
      },
      error: error => {
        this.consultando = false;
        this.empleados = [];
        this.empleadosPaginados = [];
        this.paginaActual = 1;
        this.totalPaginas = 1;

        console.error('Error consultando cumpleaños:', error);

        this.mostrarMensaje(
          error?.error?.message ??
          'No se pudo consultar el reporte de cumpleaños.'
        );
      }
    });
  }

  diasDelMes(mes: number): number[] {
    if (!mes) {
      return [];
    }

    const cantidadDias = new Date(2000, mes, 0).getDate();

    return Array.from(
      { length: cantidadDias },
      (_, index) => index + 1
    );
  }

  onMesInicialChange(): void {
    const mes = Number(this.form.get('mesInicial')?.value);
    const diaActual = Number(this.form.get('diaInicial')?.value);
    const diasValidos = this.diasDelMes(mes);

    if (!diasValidos.includes(diaActual)) {
      this.form.patchValue({
        diaInicial: diasValidos[diasValidos.length - 1]
      });
    }
  }

  onMesFinalChange(): void {
    const mes = Number(this.form.get('mesFinal')?.value);
    const diaActual = Number(this.form.get('diaFinal')?.value);
    const diasValidos = this.diasDelMes(mes);

    if (!diasValidos.includes(diaActual)) {
      this.form.patchValue({
        diaFinal: diasValidos[diasValidos.length - 1]
      });
    }
  }

  calcularPaginacion(): void {
    this.totalPaginas = Math.max(
      1,
      Math.ceil(this.empleados.length / this.tamanioPagina)
    );

    if (this.paginaActual > this.totalPaginas) {
      this.paginaActual = this.totalPaginas;
    }

    if (this.paginaActual < 1) {
      this.paginaActual = 1;
    }

    const inicio = (this.paginaActual - 1) * this.tamanioPagina;
    const fin = inicio + this.tamanioPagina;

    this.empleadosPaginados = this.empleados.slice(inicio, fin);
  }

  cambiarTamanioPagina(valor: any): void {
    const nuevoTamanio = Number(valor);

    if (!nuevoTamanio || nuevoTamanio <= 0) {
      return;
    }

    this.tamanioPagina = nuevoTamanio;
    this.paginaActual = 1;
    this.calcularPaginacion();
  }

  primeraPagina(): void {
    if (this.paginaActual === 1) {
      return;
    }

    this.paginaActual = 1;
    this.calcularPaginacion();
  }

  paginaAnterior(): void {
    if (this.paginaActual <= 1) {
      return;
    }

    this.paginaActual--;
    this.calcularPaginacion();
  }

  paginaSiguiente(): void {
    if (this.paginaActual >= this.totalPaginas) {
      return;
    }

    this.paginaActual++;
    this.calcularPaginacion();
  }

  ultimaPagina(): void {
    if (this.paginaActual === this.totalPaginas) {
      return;
    }

    this.paginaActual = this.totalPaginas;
    this.calcularPaginacion();
  }

  get registroDesde(): number {
    if (this.empleados.length === 0) {
      return 0;
    }

    return ((this.paginaActual - 1) * this.tamanioPagina) + 1;
  }

  get registroHasta(): number {
    if (this.empleados.length === 0) {
      return 0;
    }

    return Math.min(
      this.paginaActual * this.tamanioPagina,
      this.empleados.length
    );
  }

  exportarExcel(): void {
    if (!this.empleados || this.empleados.length === 0) {
      this.mostrarMensaje('No existen datos para exportar.');
      return;
    }

    const datosExcel = this.empleados.map(empleado => ({
      'Cédula': empleado.cedula ?? '',
      'Empleado': empleado.empleado ?? '',
      'Fecha Nacimiento': this.formatearFechaVisual(empleado.fechaNacimiento),
      'Edad': empleado.edad ?? 0,
      'Local': empleado.local ?? '',
      'Cargo': empleado.cargo ?? '',
      'Zona': empleado.zona ?? '',
      'Tipo Empleado': empleado.tipoEmpleado ?? ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(datosExcel);

    worksheet['!cols'] = [
      { wch: 15 },
      { wch: 40 },
      { wch: 18 },
      { wch: 10 },
      { wch: 22 },
      { wch: 30 },
      { wch: 20 },
      { wch: 20 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Cumpleaños');

    const mesInicial = Number(this.form.get('mesInicial')?.value);
    const diaInicial = Number(this.form.get('diaInicial')?.value);
    const mesFinal = Number(this.form.get('mesFinal')?.value);
    const diaFinal = Number(this.form.get('diaFinal')?.value);

    const desde =
      `${String(diaInicial).padStart(2, '0')}` +
      `${String(mesInicial).padStart(2, '0')}`;

    const hasta =
      `${String(diaFinal).padStart(2, '0')}` +
      `${String(mesFinal).padStart(2, '0')}`;

    XLSX.writeFile(
      workbook,
      `REPORTE_CUMPLEANIOS_${desde}_${hasta}.xlsx`
    );
  }

  cancelar(): void {
    if (this.consultando) {
      return;
    }

    const hoy = new Date();

    this.form.reset({
      mesInicial: hoy.getMonth() + 1,
      diaInicial: hoy.getDate(),
      mesFinal: hoy.getMonth() + 1,
      diaFinal: hoy.getDate()
    });

    this.empleados = [];
    this.empleadosPaginados = [];
    this.paginaActual = 1;
    this.totalPaginas = 1;
  }

  private fechaMesDiaValida(mes: number, dia: number): boolean {
    if (!mes || !dia) {
      return false;
    }

    return this.diasDelMes(mes).includes(dia);
  }

  private construirFechaMesDia(mes: number, dia: number): string {
    const mesTexto = String(mes).padStart(2, '0');
    const diaTexto = String(dia).padStart(2, '0');

    return `2000-${mesTexto}-${diaTexto}`;
  }

  private formatearFechaVisual(fecha: string | null): string {
    if (!fecha) {
      return '';
    }

    const partes = fecha.substring(0, 10).split('-');

    if (partes.length !== 3) {
      return fecha;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  private mostrarMensaje(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }
}