import { Component, OnInit } from '@angular/core';
import { Chart, registerables } from 'node_modules/chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-inicio-rol',
  templateUrl: './inicio-rol.component.html',
  styleUrl: './inicio-rol.component.css'
})
export class InicioRolComponent {
  totalIngresos: string = "0";
  totalVentas: string = "0";
  totalProductos: string = "0";
 constructor() {
  }

  ngOnInit(): void {
  }
}
