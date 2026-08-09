import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  standalone: false
})
export class RegisterComponent {
  registerForm: FormGroup;
  isLoading = false;

  // Mock list of Clubs and Roles to populate the select inputs
  clubs = [
    { id: 'uuid-club-conquistadores-orion', nombre: 'Club Orión (Conquistadores)' },
    { id: 'uuid-club-lideres-alcion', nombre: 'Club Alción (Líderes)' }
  ];

  roles = [
    { id: 'uuid-rol-director', nombre: 'Director' },
    { id: 'uuid-rol-secretario', nombre: 'Secretario' },
    { id: 'uuid-rol-instructor', nombre: 'Instructor' },
    { id: 'uuid-rol-consejero', nombre: 'Consejero' },
    { id: 'uuid-rol-conquistador', nombre: 'Conquistador' },
    { id: 'uuid-rol-padre', nombre: 'Padre de Familia' }
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      nombre: ['', [Validators.required]],
      apellido: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      idClub: ['', [Validators.required]],
      idRol: ['', [Validators.required]]
    });
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.authService.register(this.registerForm.value).subscribe({
      next: () => {
        this.isLoading = false;
        Swal.fire({
          title: 'Registro Exitoso',
          text: 'Cuenta creada correctamente. Por favor inicia sesión.',
          icon: 'success',
          timer: 2500,
          showConfirmButton: false,
          background: '#111827',
          color: '#f3f4f6'
        });
        this.router.navigate(['/auth/login']);
      },
      error: () => {
        this.isLoading = false;
        Swal.fire({
          title: 'Error de Registro',
          text: 'Hubo un error al registrar la cuenta.',
          icon: 'error',
          background: '#111827',
          color: '#f3f4f6',
          confirmButtonColor: '#eab308'
        });
      }
    });
  }
}
