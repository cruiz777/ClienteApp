import { Component, OnInit } from '@angular/core';

interface PeriodoQuincenal {
  id: number;
  dia: string;
  mes: string;
  anio: number;
  seleccionado: boolean;
}

@Component({
  selector: 'app-cierre-periodo-mensual',
  templateUrl: './cierre-periodo-mensual.component.html',
  styleUrls: ['./cierre-periodo-mensual.component.css']
})
export class CierrePeriodoMensualComponent implements OnInit {
  periodos: PeriodoQuincenal[] = [];

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

  togglePeriodo(item: PeriodoQuincenal): void {
    item.seleccionado = !item.seleccionado;
  }

  cierre(): void {
    const seleccionados = this.periodos.filter(x => x.seleccionado);
    console.log('Cerrar periodos:', seleccionados);
  }

  cancelar(): void {
    this.periodos.forEach(x => (x.seleccionado = false));
  }
}