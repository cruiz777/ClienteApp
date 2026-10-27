import {
  Component,
  OnInit
} from '@angular/core';

import {
  RpBancosService
} from 'src/app/services/rol/bancos-rol.service';

import {
  RpBancosResponse
} from 'src/app/interfaces/responses/bancos-rol-response';

import {
  ApiResponse
} from 'src/app/interfaces/responses/api-response';

@Component({
  selector: 'app-banco-rol',
  templateUrl: './banco-rol.component.html',
  styleUrls: ['./banco-rol.component.css']
})
export class BancoRolComponent implements OnInit {

  displayedColumns: string[] = [
    'codban',
    'desban',
    'codcue',
    'ctacontabilidad'
  ];

  bancos: RpBancosResponse[] = [];

  cargando = false;
  mensajeError = '';

  constructor(
    private readonly rpBancosService: RpBancosService
  ) {}

  ngOnInit(): void {
    this.cargarBancos();
  }

  cargarBancos(): void {
    this.cargando = true;
    this.mensajeError = '';

    this.rpBancosService.getAll().subscribe({
      next: (
        resp: ApiResponse<RpBancosResponse[]>
      ) => {
        this.bancos = resp.data ?? [];
        this.cargando = false;
      },

      error: (err: any) => {
        console.error(
          'Error al cargar bancos:',
          err
        );

        this.bancos = [];
        this.cargando = false;

        this.mensajeError =
          err?.error?.message ??
          'No se pudo cargar el listado de bancos.';
      }
    });
  }
}