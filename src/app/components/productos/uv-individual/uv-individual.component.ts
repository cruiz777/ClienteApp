import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { Cliente } from 'src/app/interfaces/cliente';
import { ClienteSeleccionadoService } from 'src/app/services/cliente-seleccionado.service';


@Component({
  selector: 'app-uv-individual',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatTableModule,

  ],
  templateUrl: './uv-individual.component.html',
  styleUrl: './uv-individual.component.css'
})
export class UvIndividualComponent implements OnInit {
  formUV!: FormGroup;
  formUL!: FormGroup;

  clienteSeleccionado: Cliente | null = null;
  constructor(private fb: FormBuilder,
    private clienteSeleccionadoService: ClienteSeleccionadoService,

  ) {}

  ngOnInit(): void {

    this.formUV = this.fb.group({
      codigoCliente: [''],
      cliente: [''],
      ruc: [''],
      gcp: [''],
      gln: [''],
      serie: [''],
      gtinUv: [''],
      tipoGtin: [''],
      descripcion: [''],
      marca: [''],
      contenido: [''],
      unidadMedida: [''],
      categoria: [''],
      brick: [''],
      pais: [''],
      sector: [''],
      urlFoto: [''],
      observacion: [''],
      otrosSolicitantes: [''],
      empresas: this.fb.group({
        favorita: [false],
        mega: [false],
        amazon: [false],
        rosario: [false],
        tia: [false],
        google: [false]
      }),
      gtinNacionales: this.fb.group({
        gtin13: [false],
        gtin8: [false]
      }),
      gtinInternacionales: this.fb.group({
        gtin13: [false],
        gtin8: [false],
        gtin12: [false]
      })
    });

    this.formUL = this.fb.group({
      gtinNacionalesUL: this.fb.group({
        gtin14: [false],
        gtin13: [false],
        gtin12: [false]
      }),
      gtinInternacionalesUL: this.fb.group({
        gtin14: [false],
        gtin13: [false],
        gtin12: [false]
      }),
      serie: [''],
      tipoEmpaque: [''],
      unidad: [''],
      indicador: [''],
      factor: [''],
      gtinUl: [''],
      tipoGtin: [''],
      observacion: ['']
    });

    this.cargarCliente();

  }

  grabarTodo() {
    const datosUV = this.formUV.value;
    const datosUL = this.formUL.value;
    console.log('Datos UV:', datosUV);
    console.log('Datos UL:', datosUL);
    // Aquí puedes hacer el POST al backend
  }

  salir(): void {
    //this.router.navigate(['/pages/clientes']);
  }

  cargarCliente(): void {
  const cliente = this.clienteSeleccionadoService.obtenerClienteActual();
  if (cliente) {
    this.clienteSeleccionado = cliente;

    this.formUV.patchValue({
      codigoCliente: cliente.clientes_codigo || '',
      cliente: cliente.nomcli || '',
      ruc: cliente.ruc || '',
    });
  }
}

}
