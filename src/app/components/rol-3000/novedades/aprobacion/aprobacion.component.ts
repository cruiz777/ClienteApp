import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

interface SolicitudAprobacion {
  id: number;
  solicita: string;
  fecha: string;
  tiempo: string;
  motivo: string;
}

@Component({
  selector: 'app-aprobacion',
  templateUrl: './aprobacion.component.html',
  styleUrls: ['./aprobacion.component.css']
})
export class AprobacionComponent implements OnInit {
  form!: FormGroup;

  displayedColumns: string[] = [
    'id',
    'solicita',
    'fecha',
    'tiempo',
    'motivo',
    'aprobar',
    'negar',
    'eliminar',
    'reimprimir'
  ];

  solicitudes: SolicitudAprobacion[] = [];
  solicitudesFiltradas: SolicitudAprobacion[] = [];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      buscar: ['']
    });

    this.cargarMock();
    this.filtrar();

    this.form.get('buscar')?.valueChanges.subscribe(() => {
      this.filtrar();
    });
  }

  cargarMock(): void {
    this.solicitudes = [
      {
        id: 526,
        solicita: 'Tigslema Saltos Willi',
        fecha: '10/12/2020 07:00:00',
        tiempo: '40 Minutos',
        motivo: 'Rehabilitaciones'
      },
      {
        id: 535,
        solicita: 'Marcille Guerrero Sandra',
        fecha: '15/09/2020 09:00:00',
        tiempo: '7 Horas',
        motivo: 'Enfermedad'
      },
      {
        id: 536,
        solicita: 'Tomala Flores María Gabriela',
        fecha: '18/10/2020',
        tiempo: '8 Horas',
        motivo: 'Asuntos Personales'
      },
      {
        id: 8,
        solicita: 'Marcillo Guerrero Sandra',
        fecha: '11/11/2019',
        tiempo: '2 Horas',
        motivo: 'Rehabilitaciones'
      },
      {
        id: 12,
        solicita: 'Simbana Quishpe Natalia Alexandra',
        fecha: '11/12/2019 09:30:00',
        tiempo: '5 Horas',
        motivo: 'Asuntos Personales'
      },
      {
        id: 29,
        solicita: 'Tituana Tenorio Doris Alejandro',
        fecha: '15/11/2019 06:00:00',
        tiempo: '3 Horas',
        motivo: 'Asuntos Personales'
      },
      {
        id: 33,
        solicita: 'Torres Granda Consuelo Dell',
        fecha: '19/11/2019 09:00:00',
        tiempo: '2 Horas',
        motivo: 'Cita Médica'
      }
    ];
  }

  filtrar(): void {
    const texto = (this.form.get('buscar')?.value || '').toLowerCase().trim();

    if (!texto) {
      this.solicitudesFiltradas = [...this.solicitudes];
      return;
    }

    this.solicitudesFiltradas = this.solicitudes.filter(item =>
      item.solicita.toLowerCase().includes(texto) ||
      item.motivo.toLowerCase().includes(texto) ||
      String(item.id).includes(texto)
    );
  }

  aprobar(item: SolicitudAprobacion): void {
    console.log('Aprobar:', item);
  }

  negar(item: SolicitudAprobacion): void {
    console.log('Negar:', item);
  }

  eliminar(item: SolicitudAprobacion): void {
    this.solicitudes = this.solicitudes.filter(x => x.id !== item.id);
    this.filtrar();
    console.log('Eliminar:', item);
  }

  reimprimir(item: SolicitudAprobacion): void {
    console.log('Reimprimir:', item);
  }
}