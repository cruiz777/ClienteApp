import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-login-form',
  standalone: true,
  templateUrl: './login-form.component.html',
  styleUrls: ['./login-form.component.css'],
  imports: [CommonModule, ReactiveFormsModule]
})
export class LoginFormComponent {
  formRecuperacion: FormGroup;
  enviado = false;

  constructor(private fb: FormBuilder) {
    this.formRecuperacion = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  enviarCorreo(): void {
    if (this.formRecuperacion.invalid) return;

    this.enviado = true;

    setTimeout(() => {
      alert(`📧 Enlace de recuperación enviado a: ${this.formRecuperacion.value.email}`);
    }, 1000);
  }
}

