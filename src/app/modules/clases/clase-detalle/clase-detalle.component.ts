import { Component, OnInit, computed } from '@angular/core';
import { MiembroService } from '../../../core/services/miembro.service';
import { AvanceAsistenciaService } from '../../../core/services/avance-asistencia.service';
import { AuthService } from '../../../core/services/auth.service';
import { Miembro } from '../../../core/models/miembro.model';
import { Avance, Requisito } from '../../../core/models/avance-asistencia.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-clase-detalle',
  templateUrl: './clase-detalle.component.html',
  standalone: false
})
export class ClaseDetalleComponent implements OnInit {
  clasesList = [
    { id: 'clase-amigo', nombre: 'Amigo' },
    { id: 'clase-viajero', nombre: 'Viajero' },
    { id: 'clase-guia', nombre: 'Guía' }
  ];

  selectedClaseId = 'clase-guia';
  activeTab: 'avances' | 'asistencia' = 'avances';
  isLoading = false;

  // Class data
  miembrosDeClase: Miembro[] = [];
  requisitos: Requisito[] = [];

  // Selected student's progress state
  selectedMiembro: Miembro | null = null;
  avancesDeMiembro: Avance[] = [];

  // Attendance state
  asistenciaEstados: { [key: string]: 'PRESENTE' | 'AUSENTE' | 'JUSTIFICADO' } = {};

  // Permissions helpers
  currentUser = computed(() => this.authService.currentUser());
  canEditAvance = computed(() => {
    const rawRol = this.currentUser()?.rol;
    const role = typeof rawRol === 'string' ? rawRol : (rawRol as any)?.nombre;
    // Instructors, Secretaries, Directors and Admins can update progress
    return ['ADMINISTRADOR', 'DIRECTOR', 'SECRETARIO', 'INSTRUCTOR'].includes(role || '');
  });

  constructor(
    private miembroService: MiembroService,
    private avanceAsistenciaService: AvanceAsistenciaService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadClaseData();
    this.loadRequisitos();
  }

  loadRequisitos(): void {
    this.avanceAsistenciaService.getRequisitos().subscribe(reqs => {
      this.requisitos = reqs;
    });
  }

  loadClaseData(): void {
    this.isLoading = true;
    const clubId = this.currentUser()?.idClub || 'uuid-club-conquistadores-orion';
    
    this.miembroService.getMiembrosByClub(clubId).subscribe({
      next: (todos) => {
        // Filter by selected class and function = CONQUISTADOR
        this.miembrosDeClase = todos.filter(
          m => m.idClase === this.selectedClaseId && m.funcion === 'CONQUISTADOR'
        );

        // Prepopulate attendance states
        this.asistenciaEstados = {};
        this.miembrosDeClase.forEach(m => {
          this.asistenciaEstados[m.idMiembro] = 'PRESENTE';
        });

        // Auto select first student for progress display
        if (this.miembrosDeClase.length > 0) {
          this.selectMiembro(this.miembrosDeClase[0]);
        } else {
          this.selectedMiembro = null;
          this.avancesDeMiembro = [];
          this.isLoading = false;
        }
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  selectMiembro(miembro: Miembro): void {
    this.selectedMiembro = miembro;
    this.isLoading = true;
    this.avanceAsistenciaService.getAvancesByMiembro(miembro.idMiembro).subscribe({
      next: (avs) => {
        this.avancesDeMiembro = avs;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  onToggleStatus(avance: Avance, nuevoEstado: 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADO'): void {
    if (!this.canEditAvance()) {
      Swal.fire({
        title: 'Acceso Denegado',
        text: 'No tienes permisos para modificar avances académicos.',
        icon: 'warning',
        background: '#111827',
        color: '#f3f4f6'
      });
      return;
    }

    this.avanceAsistenciaService.corregirAvance(avance.idAvance!, nuevoEstado).subscribe({
      next: () => {
        // Instantly update status locally
        avance.estado = nuevoEstado;
        
        // Show a micro toast notification for premium feel
        const toast = Swal.mixin({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 1500,
          background: '#1f2937',
          color: '#f3f4f6'
        });
        toast.fire({
          icon: 'success',
          title: 'Progreso guardado'
        });

        // Recalculate member administrative pendientes count locally if needed
        // For visual representation, we can decrement/increment the counter
        if (this.selectedMiembro) {
          const totalPendientes = this.avancesDeMiembro.filter(a => a.estado !== 'COMPLETADO').length;
          this.selectedMiembro.pendientes = totalPendientes;
        }
      }
    });
  }

  onSaveAttendance(): void {
    const list = Object.keys(this.asistenciaEstados).map(idUsuario => ({
      idUsuario,
      estado: this.asistenciaEstados[idUsuario]
    }));

    const request = {
      idSesion: `sesion-${Date.now()}`,
      asistencias: list
    };

    this.isLoading = true;
    this.avanceAsistenciaService.registrarAsistenciaMasiva(request).subscribe({
      next: (res) => {
        this.isLoading = false;
        Swal.fire({
          title: 'Asistencia Registrada',
          text: `Se registró la asistencia de ${res.count} conquistadores de manera masiva.`,
          icon: 'success',
          background: '#111827',
          color: '#f3f4f6',
          confirmButtonColor: '#10b981'
        });
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }
}
