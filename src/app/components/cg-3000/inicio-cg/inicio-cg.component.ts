import { Component, OnInit } from '@angular/core';
import { Chart, registerables } from 'node_modules/chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-inicio-cg',
  templateUrl: './inicio-cg.component.html',
  styleUrl: './inicio-cg.component.css'
})
export class InicioCgComponent {
  totalIngresos: string = "0";
  totalVentas: string = "0";
  totalProductos: string = "0";
 constructor() {
  }

  ngOnInit(): void {
  }
}
