import { Component, OnInit } from '@angular/core';

import { Chart, registerables } from 'node_modules/chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.css']
})
export class SeguridadesInicioComponent implements OnInit {
  totalIngresos: string = "0";
  totalVentas: string = "0";
  totalProductos: string = "0";

  constructor(
      ) {


  }

  ngOnInit(): void {



  }



}
