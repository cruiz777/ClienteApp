import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-anulacion-rolq',
  templateUrl: './anulacion-rolq.component.html',
  styleUrls: ['./anulacion-rolq.component.css']
})
export class AnulacionRolqComponent implements OnInit {
  form!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      fechaRol: ['', Validators.required]
    });
  }

  generar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    console.log('Anulando rol:', this.form.value);
  }

  cancelar(): void {
    this.form.reset();
  }
}