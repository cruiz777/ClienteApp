import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EmpresaService } from 'src/app/services/empresa.service';
import { CiudadService } from 'src/app/services/ciudad.service';
import { PersonasService } from 'src/app/services/personas.service';
import { EmpresaRequest } from 'src/app/interfaces/requests/empresa-request';
import { AsignarGerenteContadorRequest } from 'src/app/interfaces/requests/asignar-gerente-contador';
import { Router } from '@angular/router';

@Component({
  selector: 'app-empresa-form',
  templateUrl: './empresa-form.component.html'
})
export class EmpresaFormComponent implements OnInit {
  empresaForm!: FormGroup;
  ciudades: any[] = [];
  personas: any[] = [];

  constructor(
    private fb: FormBuilder,
    private empresaService: EmpresaService,
    private ciudadService: CiudadService,
    private personaService: PersonasService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadCiudades();
    this.loadPersonas();
  }

  initForm(): void {
    this.empresaForm = this.fb.group({
      empresaCodigo: [0],
      empresaNombre: ['', Validators.required],
      empresaRuc: ['', Validators.required],
      empresaObligadoContabilidad: ['', Validators.required],
      idCiudad: [null, Validators.required],
      idGerente: [null, Validators.required],
      idContador: [null, Validators.required],
      status: [true]
    });
  }

  loadCiudades(): void {
    this.ciudadService.getCiudades().subscribe(data => {
      this.ciudades = data.data;
    });
  }

  loadPersonas(): void {
    this.personaService.getPersonas().subscribe((data: any) => {
      this.personas = data;
    });
  }

  onSubmit(): void {
    if (this.empresaForm.valid) {
      const { idGerente, idContador } = this.empresaForm.value;

      if (idGerente === idContador) {
        alert('No se puede asignar la misma persona como gerente y contador');
        return;
      }

      const empresaRequest: EmpresaRequest = this.empresaForm.value;

      this.empresaService.createEmpresa(empresaRequest).subscribe({
        next: (res) => {
          alert('Empresa creada correctamente');

          const asignacion: AsignarGerenteContadorRequest = {
            empresaCodigo: res.data.empresaCodigo,
            idGerente,
            idContador,
            fechaInicio: new Date().toISOString().split('T')[0],
            status: true
          };

          this.empresaService.asignarGerenteContador(asignacion).subscribe({
            next: () => alert('Gerente y Contador asignados correctamente'),
            error: () => alert('Error al asignar gerente y contador')
          });
        },
        error: () => alert('Error al crear la empresa')
      });
    }
  }
  cancelar(): void {
    this.router.navigate(['/seguridades/empresas']);
  }

}
