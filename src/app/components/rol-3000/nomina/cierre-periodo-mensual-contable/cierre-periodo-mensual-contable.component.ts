import { Component, OnInit } from '@angular/core';

interface PeriodoMensualContable {
  id: number;
  dia: string;
  mes: string;
  anio: number;
  seleccionado: boolean;
}

@Component({
  selector: 'app-cierre-periodo-mensual-contable',
  templateUrl: './cierre-periodo-mensual-contable.component.html',
  styleUrls: ['./cierre-periodo-mensual-contable.component.css']
})
export class CierrePeriodoMensualContableComponent implements OnInit {
  periodos: PeriodoMensualContable[] = [];

  ngOnInit(): void {
    this.cargarMock();
  }

  cargarMock(): void {
    this.periodos = [
      { id: 1, dia: '05', mes: 'Julio', anio: 2025, seleccionado: false },
      { id: 2, dia: '21', mes: 'Agosto', anio: 2025, seleccionado: false },
      { id: 3, dia: '15', mes: 'Octubre', anio: 2025, seleccionado: false }
    ];
  }

  togglePeriodo(item: PeriodoMensualContable): void {
    item.seleccionado = !item.seleccionado;
  }

  cierre(): void {
    const seleccionados = this.periodos.filter(x => x.seleccionado);
    console.log('Cerrar periodos mensuales contables:', seleccionados);
  }

  cancelar(): void {
    this.periodos.forEach(x => (x.seleccionado = false));
  }
}