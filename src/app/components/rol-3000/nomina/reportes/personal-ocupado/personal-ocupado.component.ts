import { Component, OnInit } from '@angular/core';

interface PersonalOcupadoRow {
  grupo: string;
  sinDiscapacidadH: number;
  sinDiscapacidadM: number;
  conDiscapacidadH: number;
  conDiscapacidadM: number;
  permanenteH: number;
}

@Component({
  selector: 'app-personal-ocupado',
  templateUrl: './personal-ocupado.component.html',
  styleUrls: ['./personal-ocupado.component.css']
})
export class PersonalOcupadoComponent implements OnInit {

  mes: number = 4;
  anio: number = 2025;
  agrupadoPor: string = 'contrato';

  displayedColumns: string[] = [
    'grupo',
    'sdh',
    'sdm',
    'cdh',
    'cdm',
    'ph'
  ];

  dataSource: PersonalOcupadoRow[] = [];

  ngOnInit(): void {
    this.cargarMock();
  }

  cargarMock(): void {
    this.dataSource = [
      {
        grupo: '1 Directores y Gerentes',
        sinDiscapacidadH: 0,
        sinDiscapacidadM: 0,
        conDiscapacidadH: 0,
        conDiscapacidadM: 0,
        permanenteH: 0
      },
      {
        grupo: '2 Profesionales, Científicos e Intelectuales',
        sinDiscapacidadH: 16,
        sinDiscapacidadM: 53,
        conDiscapacidadH: 1,
        conDiscapacidadM: 0,
        permanenteH: 7
      },
      {
        grupo: '3 Técnicos de la salud',
        sinDiscapacidadH: 13,
        sinDiscapacidadM: 34,
        conDiscapacidadH: 0,
        conDiscapacidadM: 4,
        permanenteH: 3
      }
    ];
  }

  generar(): void {
    console.log('Generar reporte:', {
      mes: this.mes,
      anio: this.anio,
      agrupadoPor: this.agrupadoPor
    });
  }

  exportar(): void {
    console.log('Exportar...');
  }

  cancelar(): void {
    console.log('Cancelar');
  }
}