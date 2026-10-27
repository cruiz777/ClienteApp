import { Component, OnInit } from '@angular/core';
import { Chart, registerables } from 'node_modules/chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-inicio-sic',
  templateUrl: './inicio-sic.component.html',
  styleUrl: './inicio-sic.component.css'
})
export class InicioSicComponent {
  totalIngresos: string = "0";
  totalVentas: string = "0";
  totalProductos: string = "0";
 constructor() {
  }

  ngOnInit(): void {
  }
}
