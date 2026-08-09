import { Component, OnInit, signal } from '@angular/core';
import Swal from 'sweetalert2';

export interface RegistroAsistencia {
  id: string;
  nombre: string;
  unidad: string;
  clase: string;
  estado: 'PRESENTE' | 'AUSENTE' | 'TARDANZA' | 'JUSTIFICADO';
  uniformeCompleto: boolean;
  cuotaPagada: boolean;
  biblia: boolean;
}

@Component({
  selector: 'app-asistencia',
  templateUrl: './asistencia.component.html',
  standalone: false
})
export class AsistenciaComponent implements OnInit {
  fechaSeleccionada = signal('2026-08-15');
  filtroUnidad = signal('TODAS');

  unidades = ['Águilas', 'Halcones', 'Leones', 'Estrellas'];

  registros = signal<RegistroAsistencia[]>([
    {
      id: 'm-1',
      nombre: 'Mateo Silva',
      unidad: 'Águilas',
      clase: 'Amigo',
      estado: 'PRESENTE',
      uniformeCompleto: true,
      cuotaPagada: true,
      biblia: true
    },
    {
      id: 'm-2',
      nombre: 'Lucas Morales',
      unidad: 'Águilas',
      clase: 'Amigo',
      estado: 'PRESENTE',
      uniformeCompleto: true,
      cuotaPagada: false,
      biblia: true
    },
    {
      id: 'm-3',
      nombre: 'Sofía Quispe',
      unidad: 'Halcones',
      clase: 'Compañero',
      estado: 'TARDANZA',
      uniformeCompleto: true,
      cuotaPagada: true,
      biblia: false
    },
    {
      id: 'm-4',
      nombre: 'Valentina Castro',
      unidad: 'Halcones',
      clase: 'Compañero',
      estado: 'PRESENTE',
      uniformeCompleto: true,
      cuotaPagada: true,
      biblia: true
    },
    {
      id: 'm-5',
      nombre: 'Daniel Rivas',
      unidad: 'Leones',
      clase: 'Explorador',
      estado: 'AUSENTE',
      uniformeCompleto: false,
      cuotaPagada: false,
      biblia: false
    },
    {
      id: 'm-6',
      nombre: 'Camila Benítez',
      unidad: 'Estrellas',
      clase: 'Guía',
      estado: 'JUSTIFICADO',
      uniformeCompleto: false,
      cuotaPagada: true,
      biblia: true
    }
  ]);

  ngOnInit(): void {}

  filtrarRegistros(): RegistroAsistencia[] {
    if (this.filtroUnidad() === 'TODAS') {
      return this.registros();
    }
    return this.registros().filter(r => r.unidad === this.filtroUnidad());
  }

  setEstado(id: string, nuevoEstado: 'PRESENTE' | 'AUSENTE' | 'TARDANZA' | 'JUSTIFICADO'): void {
    this.registros.update(list =>
      list.map(r => (r.id === id ? { ...r, estado: nuevoEstado } : r))
    );
  }

  toggleCheck(id: string, field: 'uniformeCompleto' | 'cuotaPagada' | 'biblia'): void {
    this.registros.update(list =>
      list.map(r => (r.id === id ? { ...r, [field]: !r[field] } : r))
    );
  }

  guardarAsistencia(): void {
    Swal.fire({
      icon: 'success',
      title: 'Asistencia Guardada',
      text: 'El pase de lista y la puntualidad fueron registrados exitosamente.',
      timer: 1800,
      showConfirmButton: false
    });
  }
}
