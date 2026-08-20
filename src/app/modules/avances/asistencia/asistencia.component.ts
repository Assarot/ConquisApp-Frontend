import { Component, OnInit, signal, computed } from '@angular/core';
import { ClubService, ClaseBackend } from '../../../core/services/club.service';
import { MiembroService } from '../../../core/services/miembro.service';
import { SesionesService, SesionBackend } from '../../../core/services/sesiones.service';
import { AvanceAsistenciaService } from '../../../core/services/avance-asistencia.service';
import { AuthService } from '../../../core/services/auth.service';
import { Miembro } from '../../../core/models/miembro.model';
import Swal from 'sweetalert2';

export interface RegistroAsistencia {
  idAsistencia?: string;
  idMiembro: string;
  nombre: string;
  apellido: string;
  unidad: string;
  clase: string;
  estado: 'PRESENTE' | 'AUSENTE' | 'JUSTIFICADO';
  panoleta: boolean;
  biblia: boolean;
  agua: boolean;
  materiales: boolean;
}

@Component({
  selector: 'app-asistencia',
  templateUrl: './asistencia.component.html',
  standalone: false
})
export class AsistenciaComponent implements OnInit {
  fechaSeleccionada = signal(new Date().toISOString().split('T')[0]);
  clasesList = signal<ClaseBackend[]>([]);
  selectedClaseId = signal<string>('');
  isLoading = false;

  currentSesion: SesionBackend | null = null;
  registros = signal<RegistroAsistencia[]>([]);

  currentUser = computed(() => this.authService.currentUser());

  get selectedClaseNombre(): string {
    const selected = this.clasesList().find(c => c.idClase === this.selectedClaseId());
    return selected ? selected.nombre : '';
  }

  constructor(
    private clubService: ClubService,
    private miembroService: MiembroService,
    private sesionesService: SesionesService,
    private avanceAsistenciaService: AvanceAsistenciaService,
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
          this.onFiltroChange();
        }
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  onFiltroChange(): void {
    const idClase = this.selectedClaseId();
    const fecha = this.fechaSeleccionada();
    const clubId = String(this.currentUser()?.idClub || '');
    if (!idClase || !clubId) return;

    this.isLoading = true;
    this.registros.set([]);
    this.currentSesion = null;

    // 1. Fetch all members of the club to filter by the selected class
    this.miembroService.getMiembrosByClub(clubId).subscribe({
      next: (miembros) => {
        const classMembers = miembros.filter(m => String(m.idClase) === String(idClase) && m.funcion === 'CONQUISTADOR');

        // 2. Fetch sessions of the class to see if we have a match for the selected date
        this.sesionesService.getSesionesByClase(idClase).subscribe({
          next: (sesiones) => {
            const match = sesiones.find(s => s.fecha === fecha);

            if (match && match.idSesion) {
              this.currentSesion = match;
              // 3. Load attendance records for this session
              this.avanceAsistenciaService.getAsistenciasBySesion(match.idSesion).subscribe({
                next: (asistencias) => {
                  const map: Record<string, any> = {};
                  asistencias.forEach(a => {
                    const memberId = a.miembro?.idMiembro || a.idMiembro;
                    if (memberId) map[String(memberId)] = a;
                  });

                  const list: RegistroAsistencia[] = classMembers.map(m => {
                    const saved = map[m.idMiembro];
                    return {
                      idAsistencia: saved?.idAsistencia,
                      idMiembro: m.idMiembro,
                      nombre: m.nombre,
                      apellido: m.apellido,
                      unidad: m.nombreUnidad || 'Sin Unidad',
                      clase: this.selectedClaseNombre,
                      estado: saved?.estado || 'PRESENTE',
                      panoleta: saved?.panoleta || false,
                      biblia: saved?.biblia || false,
                      agua: saved?.agua || false,
                      materiales: saved?.materiales || false
                    };
                  });
                  this.registros.set(list);
                  this.isLoading = false;
                },
                error: () => {
                  this.isLoading = false;
                }
              });
            } else {
              // No existing session for this date. Create defaults.
              const list: RegistroAsistencia[] = classMembers.map(m => ({
                idMiembro: m.idMiembro,
                nombre: m.nombre,
                apellido: m.apellido,
                unidad: m.nombreUnidad || 'Sin Unidad',
                clase: this.selectedClaseNombre,
                estado: 'PRESENTE',
                panoleta: false,
                biblia: false,
                agua: false,
                materiales: false
              }));
              this.registros.set(list);
              this.isLoading = false;
            }
          },
          error: () => {
            this.isLoading = false;
          }
        });
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  setEstado(idMiembro: string, nuevoEstado: 'PRESENTE' | 'AUSENTE' | 'JUSTIFICADO'): void {
    this.registros.update(list =>
      list.map(r => {
        if (r.idMiembro === idMiembro) {
          if (nuevoEstado === 'AUSENTE' || nuevoEstado === 'JUSTIFICADO') {
            return {
              ...r,
              estado: nuevoEstado,
              panoleta: false,
              biblia: false,
              agua: false,
              materiales: false
            };
          }
          return { ...r, estado: nuevoEstado };
        }
        return r;
      })
    );
  }

  toggleCheck(idMiembro: string, field: 'panoleta' | 'biblia' | 'agua' | 'materiales'): void {
    this.registros.update(list =>
      list.map(r => {
        if (r.idMiembro === idMiembro) {
          if (r.estado !== 'PRESENTE') {
            return r;
          }
          return { ...r, [field]: !r[field] };
        }
        return r;
      })
    );
  }

  guardarAsistencia(): void {
    const idClase = this.selectedClaseId();
    const fecha = this.fechaSeleccionada();
    const instructorId = this.currentUser()?.idUsuario;

    if (!idClase || !instructorId) return;

    this.isLoading = true;

    // Check if we need to create the session first
    if (!this.currentSesion) {
      const sesionPayload: SesionBackend = {
        titulo: `Pase de Lista - ${this.selectedClaseNombre}`,
        descripcion: 'Registro de asistencia semanal',
        fecha: fecha,
        duracionMinutos: 60,
        completada: true,
        idClase: idClase
      };

      this.sesionesService.guardarSesion(sesionPayload).subscribe({
        next: (sesion) => {
          this.currentSesion = sesion;
          this.guardarRegistrosDeAsistencia(sesion.idSesion!);
        },
        error: () => {
          this.isLoading = false;
          Swal.fire('Error', 'No se pudo crear la sesión para registrar la asistencia.', 'error');
        }
      });
    } else {
      this.guardarRegistrosDeAsistencia(this.currentSesion.idSesion!);
    }
  }

  private guardarRegistrosDeAsistencia(idSesion: string | number): void {
    const payload = this.registros().map(r => ({
      idAsistencia: r.idAsistencia || null,
      sesion: { idSesion: idSesion },
      miembro: { idMiembro: r.idMiembro },
      estado: r.estado,
      panoleta: r.panoleta,
      biblia: r.biblia,
      agua: r.agua,
      materiales: r.materiales
    }));

    this.avanceAsistenciaService.registrarAsistencias(payload).subscribe({
      next: () => {
        this.isLoading = false;
        Swal.fire({
          icon: 'success',
          title: 'Asistencia Guardada',
          text: 'Se registraron los datos de asistencia y el checklist correctamente.',
          timer: 1800,
          showConfirmButton: false
        });
        this.onFiltroChange(); // Reload state from DB
      },
      error: () => {
        this.isLoading = false;
        Swal.fire('Error', 'No se pudo guardar el registro de asistencia.', 'error');
      }
    });
  }
}

