import { Component, OnInit, computed, signal } from '@angular/core';
import { MiembroService } from '../../../core/services/miembro.service';
import { AvanceAsistenciaService } from '../../../core/services/avance-asistencia.service';
import { ClubService, ClaseBackend } from '../../../core/services/club.service';
import { RequisitoService, RequisitoBackend } from '../../../core/services/requisito.service';
import { AuthService } from '../../../core/services/auth.service';
import { Miembro } from '../../../core/models/miembro.model';
import { Avance } from '../../../core/models/avance-asistencia.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-clase-detalle',
  templateUrl: './clase-detalle.component.html',
  standalone: false
})
export class ClaseDetalleComponent implements OnInit {
  // Real class list from DB
  clasesList = signal<ClaseBackend[]>([]);
  selectedClaseId = signal<string>('');
  activeTab: 'cuadernillo' | 'avances' | 'asistencia' = 'cuadernillo';
  isLoading = false;

  // Requisitos for selected class
  requisitos = signal<RequisitoBackend[]>([]);
  loadingRequisitos = signal(false);

  // Members of selected class
  miembrosDeClase: Miembro[] = [];
  selectedMiembro: Miembro | null = null;
  avancesDeMiembro: Avance[] = [];

  // Attendance state
  asistenciaEstados: { [key: string]: 'PRESENTE' | 'AUSENTE' | 'JUSTIFICADO' } = {};

  // Permissions
  currentUser = computed(() => this.authService.currentUser());
  canEditAvance = computed(() => {
    const rawRol = this.currentUser()?.rol;
    const role = typeof rawRol === 'string' ? rawRol : (rawRol as any)?.nombre;
    return ['ADMINISTRADOR', 'DIRECTOR', 'SECRETARIO', 'INSTRUCTOR'].includes(role || '');
  });

  // Computed counts for cuadernillo tab
  get requisitosRegulares() { return this.requisitos().filter(r => !r.esAvanzado); }
  get requisitosAvanzados() { return this.requisitos().filter(r => r.esAvanzado); }
  get selectedClaseNombre() {
    const selected = this.clasesList().find(c => c.idClase === this.selectedClaseId());
    return selected ? selected.nombre : '';
  }

  constructor(
    private miembroService: MiembroService,
    private avanceAsistenciaService: AvanceAsistenciaService,
    private clubService: ClubService,
    private requisitoService: RequisitoService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarClases();
  }

  cargarClases(): void {
    this.isLoading = true;
    this.clubService.getClases().subscribe({
      next: (clases) => {
        this.clasesList.set(clases);
        this.isLoading = false;
        if (clases.length > 0) {
          this.selectedClaseId.set(clases[0].idClase || '');
          this.onClaseChange();
        }
      },
      error: () => { this.isLoading = false; }
    });
  }

  onClaseChange(): void {
    const id = this.selectedClaseId();
    if (!id) return;

    // Load requisitos from DB
    this.loadingRequisitos.set(true);
    this.requisitoService.getRequisitosByClase(id).subscribe({
      next: (reqs) => {
        this.requisitos.set(reqs);
        this.loadingRequisitos.set(false);
      },
      error: () => this.loadingRequisitos.set(false)
    });

    // Load members of this class from the club
    this.loadClaseData();
  }

  loadClaseData(): void {
    this.isLoading = true;
    const clubId = String(this.currentUser()?.idClub || '');
    if (!clubId) { this.isLoading = false; return; }

    this.miembroService.getMiembrosByClub(clubId).subscribe({
      next: (todos) => {
        this.miembrosDeClase = todos.filter(
          m => String(m.idClase) === String(this.selectedClaseId()) && m.funcion === 'CONQUISTADOR'
        );
        this.asistenciaEstados = {};
        this.miembrosDeClase.forEach(m => {
          this.asistenciaEstados[m.idMiembro] = 'PRESENTE';
        });
        if (this.miembrosDeClase.length > 0) {
          this.selectMiembro(this.miembrosDeClase[0]);
        } else {
          this.selectedMiembro = null;
          this.avancesDeMiembro = [];
          this.isLoading = false;
        }
      },
      error: () => { this.isLoading = false; }
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
