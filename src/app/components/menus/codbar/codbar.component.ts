import { Component, OnInit } from '@angular/core';

import { Chart, registerables } from 'node_modules/chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-codbar',
  templateUrl: './codbar.component.html',
  styleUrls: ['./codbar.component.css']
})
export class CodbarComponent implements OnInit {
  totalIngresos: string = "0";
  totalVentas: string = "0";
  totalProductos: string = "0";

  constructor(
      ) {


  }

  ngOnInit(): void {

    

  }



}
