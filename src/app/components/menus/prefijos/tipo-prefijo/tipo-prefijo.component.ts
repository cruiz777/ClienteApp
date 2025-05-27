import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-tipo-prefijo',
  standalone: true,
  imports: [
     CommonModule,
        FormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatMenuModule,
        MatButtonModule
  ],
  templateUrl: './tipo-prefijo.component.html',
  styleUrl: './tipo-prefijo.component.css'
})
export class TipoPrefijoComponent {

filtroBusqueda: string = '';

    
}
