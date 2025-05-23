import { Component, OnInit } from '@angular/core';
import { ProductosModule } from './productos.module';


@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [ProductosModule],
  templateUrl: './productos.component.html',
  styleUrl: './productos.component.css'
})
export class ProductosComponent implements OnInit  {

 constructor() { }


  ngOnInit(): void {
  }

}
