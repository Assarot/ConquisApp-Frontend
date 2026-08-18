import { Component, OnInit, computed, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { UnidadService } from '../../../core/services/unidad.service';
import { ClubService, ClaseBackend } from '../../../core/services/club.service';
import { MiembroService } from '../../../core/services/miembro.service';
import { SesionesService, SesionBackend } from '../../../core/services/sesiones.service';
import { AvanceAsistenciaService } from '../../../core/services/avance-asistencia.service';
import { PoaService } from '../../../core/services/poa.service';
import { Unidad } from '../../../models/api.models';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import Swal from 'sweetalert2';

export interface RegistroAsistencia {
  idAsistencia?: string;
  idMiembro: string;
  idClase?: string;
  nombre: string;
  apellido: string;
  unidad: string;
  clase: string;
  estado: 'PRESENTE' | 'AUSENTE' | 'JUSTIFICADO';
  panoleta: boolean;
  biblia: boolean;
  agua: boolean;
  materiales: boolean;
  cuota: boolean;
}

@Component({
  selector: 'app-unidades-list',
  templateUrl: './unidades-list.component.html',
  standalone: false
})
export class UnidadesListComponent implements OnInit {
  unidades: Unidad[] = [];
  counselors: any[] = [];
  isLoading = false;
  showModal = false;
  isEditing = false;
  selectedUnidadId: string | null = null;
  unidadForm: FormGroup;

  // Tabs state
  activeTab: 'unidades' | 'asistencia' = 'unidades';

  // Asistencia properties
  fechaSeleccionada = signal<string>('');
  fechasDisponibles = signal<string[]>([]);
  selectedUnidadAsistenciaId = signal<string>('');
  registros = signal<RegistroAsistencia[]>([]);
  clasesList = signal<ClaseBackend[]>([]);

  // Static/academic classes representation for UI helpers
  clases = [
    { id: '1', nombre: 'Amigo' },
    { id: '2', nombre: 'Compañero' },
    { id: '3', nombre: 'Explorador' },
    { id: '4', nombre: 'Pionero' },
    { id: '5', nombre: 'Excursionista' },
    { id: '6', nombre: 'Guía' }
  ];

  currentUser = computed(() => this.authService.currentUser());
  canEdit = computed(() => {
    const rawRol = this.currentUser()?.rol;
    const role = typeof rawRol === 'string' ? rawRol : (rawRol as any)?.nombre;
    return role === 'ADMINISTRADOR' || role === 'DIRECTOR' || role === 'SECRETARIO' || role === 'DIRECTOR_ASOCIADO';
  });

  // Color choices
  colorOptions = [
    { label: 'Azul Marino', value: 'primary' },
    { label: 'Rojo', value: 'secondary' },
    { label: 'Dorado', value: 'tertiary' },
    { label: 'Verde Bosque', value: 'success' }
  ];

  // Icon choices
  iconOptions = ['pets', 'flight', 'auto_awesome', 'bolt', 'local_fire_department', 'waves', 'grass', 'star'];

  constructor(
    private authService: AuthService,
    private unidadService: UnidadService,
    private fb: FormBuilder,
    private clubService: ClubService,
    private miembroService: MiembroService,
    private sesionesService: SesionesService,
    private avanceAsistenciaService: AvanceAsistenciaService,
    private poaService: PoaService
  ) {
    this.unidadForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      descripcion: [''],
      icono: ['pets'],
      color: ['primary'],
      idConsejero: ['']
    });
  }

  ngOnInit(): void {
    this.loadUnidades();
    this.loadCounselors();
    this.cargarFechasDesdePoa();
    this.cargarClases();
  }

  loadUnidades(): void {
    this.isLoading = true;
    this.unidadService.getUnidades().subscribe({
      next: (data) => {
        this.unidades = data;
        this.isLoading = false;
        if (data.length > 0 && !this.selectedUnidadAsistenciaId()) {
          this.selectedUnidadAsistenciaId.set(String(data[0].idUnidad));
          this.onFiltroChange();
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error cargando unidades', err);
      }
    });
  }

  loadCounselors(): void {
    this.authService.getUsers().subscribe({
      next: (users) => {
        this.counselors = users.filter(u => u.rol !== 'CONQUISTADOR' && u.rol !== 'PADRE');
      },
      error: (err) => {
        console.error('Error loading users for counselors list', err);
      }
    });
  }

  openCreateModal(): void {
    this.isEditing = false;
    this.selectedUnidadId = null;
    this.unidadForm.reset({ nombre: '', descripcion: '', icono: 'pets', color: 'primary', idConsejero: '' });
    this.showModal = true;
  }

  openEditModal(unidad: Unidad): void {
    this.isEditing = true;
    this.selectedUnidadId = unidad.idUnidad;
    this.unidadForm.patchValue({
      nombre: unidad.nombre,
      descripcion: unidad.descripcion || '',
      icono: unidad.icono || 'pets',
      color: unidad.color || 'primary',
      idConsejero: unidad.consejeroId || ''
    });
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  onSubmit(): void {
    if (this.unidadForm.invalid) return;
    const formVal = this.unidadForm.value;
    this.isLoading = true;

    const payload: any = {
      nombre: formVal.nombre,
      descripcion: formVal.descripcion || '',
      icono: formVal.icono || 'pets',
      color: formVal.color || 'primary',
      consejero: formVal.idConsejero ? { idUsuario: Number(formVal.idConsejero) } : null
    };

    if (this.isEditing && this.selectedUnidadId) {
      this.unidadService.actualizarUnidad(this.selectedUnidadId, payload).subscribe({
        next: () => {
          this.closeModal();
          this.loadUnidades();
          Swal.fire({ title: 'Unidad Actualizada', icon: 'success', timer: 1500, showConfirmButton: false,
            background: '#f8f9fa', color: '#191c1d', confirmButtonColor: '#00113a' });
        },
        error: () => {
          this.isLoading = false;
          Swal.fire({ title: 'Error', text: 'No se pudo actualizar la unidad.', icon: 'error',
            background: '#f8f9fa', color: '#191c1d' });
        }
      });
    } else {
      this.unidadService.crearUnidad(payload).subscribe({
        next: () => {
          this.closeModal();
          this.loadUnidades();
          Swal.fire({ title: 'Unidad Creada', icon: 'success', timer: 1500, showConfirmButton: false,
            background: '#f8f9fa', color: '#191c1d', confirmButtonColor: '#00113a' });
        },
        error: () => {
          this.isLoading = false;
          Swal.fire({ title: 'Error', text: 'No se pudo crear la unidad.', icon: 'error',
            background: '#f8f9fa', color: '#191c1d' });
        }
      });
    }
  }

  onDelete(unidad: Unidad): void {
    Swal.fire({
      title: `¿Eliminar "${unidad.nombre}"?`,
      text: 'Esta acción no se puede deshacer. Los miembros de esta unidad quedarán sin unidad asignada.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#b7102a',
      cancelButtonColor: '#444650',
      background: '#f8f9fa',
      color: '#191c1d'
    }).then((result) => {
      if (result.isConfirmed) {
        this.isLoading = true;
        this.unidadService.eliminarUnidad(unidad.idUnidad).subscribe({
          next: () => {
            Swal.fire({ title: 'Eliminada', icon: 'success', timer: 1500, showConfirmButton: false,
              background: '#f8f9fa', color: '#191c1d' });
            this.loadUnidades();
          },
          error: () => {
            this.isLoading = false;
            Swal.fire({ title: 'Error', text: 'No se pudo eliminar la unidad.', icon: 'error',
              background: '#f8f9fa', color: '#191c1d' });
          }
        });
      }
    });
  }

  getIconForUnidad(nombre: string): string {
    const name = nombre?.toLowerCase() || '';
    if (name.includes('halcon') || name.includes('halcón')) return 'flight';
    if (name.includes('aguila') || name.includes('águila')) return 'bolt';
    if (name.includes('leon') || name.includes('león')) return 'pets';
    if (name.includes('estrella')) return 'auto_awesome';
    return 'group_work';
  }

  getColorHex(color: string): string {
    switch (color) {
      case 'primary': return '#00113a';
      case 'secondary': return '#b7102a';
      case 'tertiary': return '#ff9e00';
      case 'success': return '#2e7d32';
      default: return '#00113a';
    }
  }

  getColorClassForUnidad(color: string): string {
    switch (color) {
      case 'primary': return 'bg-[#dbe1ff] text-[#00113a]';
      case 'secondary': return 'bg-[#ffdad6] text-[#b7102a]';
      case 'tertiary': return 'bg-[#ffdea9] text-[#5e4100]';
      case 'success': return 'bg-[#cbf2d6] text-[#1b5e20]';
      default: return 'bg-[#dbe1ff] text-[#00113a]';
    }
  }

  // --- Attendance and Checklists Tab Logic (Unit-based & POA-based) ---

  cargarFechasDesdePoa(): void {
    const clubId = String(this.currentUser()?.idClub || '1');
    this.poaService.getPoasByClub(clubId).subscribe({
      next: (poas) => {
        const active = poas.find(p => p.estado === 'ACTIVO') || poas[0];
        if (active && active.idPoa) {
          this.poaService.getActividades(String(active.idPoa)).subscribe({
            next: (actividades: any[]) => {
              const fechas = actividades
                .filter((act: any) => act.ambito === 'RECURRENTE' || act.nombre?.toLowerCase().includes('reunión regular') || act.nombre?.toLowerCase().includes('reunion regular'))
                .map((act: any) => act.fecha)
                .filter((f: any) => !!f);
              const unicas = [...new Set(fechas)].sort() as string[];
              this.fechasDisponibles.set(unicas);
              if (unicas.length > 0) {
                this.fechaSeleccionada.set(unicas[0]);
                this.onFiltroChange();
              }
            }
          });
        }
      }
    });
  }

  cargarClases(): void {
    this.clubService.getClases().subscribe({
      next: (clases) => {
        this.clasesList.set(clases);
      },
      error: () => {}
    });
  }

  onFiltroChange(): void {
    const idUnidad = this.selectedUnidadAsistenciaId();
    const fecha = this.fechaSeleccionada();
    const clubId = String(this.currentUser()?.idClub || '1');
    if (!idUnidad || !clubId || !fecha) return;

    this.isLoading = true;
    this.registros.set([]);

    // 1. Fetch all members of the club to filter by the selected unit
    this.miembroService.getMiembrosByClub(clubId).subscribe({
      next: (miembros) => {
        const unitMembers = miembros.filter(m => String(m.idUnidad) === String(idUnidad) && m.funcion === 'CONQUISTADOR');
        if (unitMembers.length === 0) {
          this.isLoading = false;
          return;
        }

        // Get distinct class IDs from the unit members
        const classIds = [...new Set(unitMembers.map(m => String(m.idClase)))];

        // 2. Fetch sessions of these classes for the selected date
        const sessionRequests = classIds.map(cId => {
          return this.sesionesService.getSesionesByClase(cId).pipe(
            catchError(() => of([]))
          );
        });

        forkJoin(sessionRequests).subscribe({
          next: (sessionsListList) => {
            // Map classId -> active session for that date
            const sessionsMap: Record<string, SesionBackend> = {};
            classIds.forEach((cId, index) => {
              const sessions = sessionsListList[index];
              const match = sessions.find(s => s.fecha === fecha);
              if (match) {
                sessionsMap[cId] = match;
              }
            });

            // 3. For sessions that exist, load the attendance records
            const sessionIds = Object.values(sessionsMap).map(s => s.idSesion!).filter(id => !!id);
            if (sessionIds.length > 0) {
              const attendanceRequests = sessionIds.map(sId => {
                return this.avanceAsistenciaService.getAsistenciasBySesion(sId).pipe(
                  catchError(() => of([]))
                );
              });

              forkJoin(attendanceRequests).subscribe({
                next: (attendancesListList) => {
                  const attendancesMap: Record<string, any> = {};
                  attendancesListList.flat().forEach(a => {
                    const userId = a.usuario?.idUsuario || a.usuario?.id || a.idUsuario;
                    if (userId) attendancesMap[String(userId)] = a;
                  });

                  const list: RegistroAsistencia[] = unitMembers.map(m => {
                    const saved = attendancesMap[m.idMiembro];
                    const classInfo = this.clasesList().find(c => String(c.idClase) === String(m.idClase) || c.nombre === m.nombreClase);
                    return {
                      idAsistencia: saved?.idAsistencia,
                      idMiembro: m.idMiembro,
                      idClase: String(m.idClase),
                      nombre: m.nombre,
                      apellido: m.apellido,
                      unidad: m.nombreUnidad || 'Sin Unidad',
                      clase: classInfo?.nombre || m.nombreClase || 'Amigo',
                      estado: saved?.estado || 'PRESENTE',
                      panoleta: saved?.panoleta || false,
                      biblia: saved?.biblia || false,
                      agua: saved?.agua || false,
                      materiales: saved?.materiales || false,
                      cuota: saved?.cuota || false
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
              // No existing sessions for any class on this date.
              const list: RegistroAsistencia[] = unitMembers.map(m => {
                const classInfo = this.clasesList().find(c => String(c.idClase) === String(m.idClase) || c.nombre === m.nombreClase);
                return {
                  idMiembro: m.idMiembro,
                  idClase: String(m.idClase),
                  nombre: m.nombre,
                  apellido: m.apellido,
                  unidad: m.nombreUnidad || 'Sin Unidad',
                  clase: classInfo?.nombre || m.nombreClase || 'Amigo',
                  estado: 'PRESENTE',
                  panoleta: false,
                  biblia: false,
                  agua: false,
                  materiales: false,
                  cuota: false
                };
              });
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
      list.map(r => r.idMiembro === idMiembro ? { ...r, estado: nuevoEstado } : r)
    );
  }

  toggleCheck(idMiembro: string, field: 'panoleta' | 'biblia' | 'agua' | 'materiales' | 'cuota'): void {
    this.registros.update(list =>
      list.map(r => r.idMiembro === idMiembro ? { ...r, [field]: !r[field] } : r)
    );
  }

  guardarAsistencia(): void {
    const idUnidad = this.selectedUnidadAsistenciaId();
    const fecha = this.fechaSeleccionada();
    const clubId = String(this.currentUser()?.idClub || '1');

    if (!idUnidad || !fecha || this.registros().length === 0) return;

    this.isLoading = true;

    // Get the distinct classes of our current list of members
    this.miembroService.getMiembrosByClub(clubId).subscribe({
      next: (miembros) => {
        const unitMembers = miembros.filter(m => String(m.idUnidad) === String(idUnidad) && m.funcion === 'CONQUISTADOR');
        const classIds = [...new Set(unitMembers.map(m => String(m.idClase)))];

        // 1. Fetch sessions of these classes
        const sessionRequests = classIds.map(cId => {
          return this.sesionesService.getSesionesByClase(cId).pipe(
            catchError(() => of([]))
          );
        });

        forkJoin(sessionRequests).subscribe({
          next: (sessionsListList) => {
            const sessionsMap: Record<string, SesionBackend> = {};
            const classesToCreate: string[] = [];

            classIds.forEach((cId, index) => {
              const sessions = sessionsListList[index];
              const match = sessions.find(s => s.fecha === fecha);
              if (match) {
                sessionsMap[cId] = match;
              } else {
                classesToCreate.push(cId);
              }
            });

            // 2. Create missing sessions in parallel
            if (classesToCreate.length > 0) {
              const creationRequests = classesToCreate.map(cId => {
                const classInfo = this.clasesList().find(c => String(c.idClase) === String(cId));
                const className = classInfo?.nombre || 'Clase';
                const payload: SesionBackend = {
                  titulo: `Pase de Lista - ${className}`,
                  descripcion: 'Registro de asistencia semanal',
                  fecha: fecha,
                  duracionMinutos: 60,
                  completada: true,
                  idClase: cId
                };
                return this.sesionesService.guardarSesion(payload).pipe(
                  catchError((err) => {
                    console.error('Error creating session for class ' + cId, err);
                    return of(null);
                  })
                );
              });

              forkJoin(creationRequests).subscribe({
                next: (createdSessions) => {
                  createdSessions.forEach((s) => {
                    if (s && s.idClase) {
                      sessionsMap[String(s.idClase)] = s;
                    }
                  });

                  this.guardarRegistrosDeAsistenciaMasiva(sessionsMap);
                }
              });
            } else {
              this.guardarRegistrosDeAsistenciaMasiva(sessionsMap);
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

  private guardarRegistrosDeAsistenciaMasiva(sessionsMap: Record<string, SesionBackend>): void {
    const payload: any[] = [];
    
    this.registros().forEach(r => {
      const cId = r.idClase || 'clase-amigo';
      const session = sessionsMap[cId];
      if (session && session.idSesion) {
        payload.push({
          idAsistencia: r.idAsistencia || null,
          sesion: { idSesion: session.idSesion },
          usuario: { idUsuario: r.idMiembro },
          estado: r.estado,
          panoleta: r.panoleta,
          biblia: r.biblia,
          agua: r.agua,
          materiales: r.materiales,
          cuota: r.cuota
        });
      }
    });

    this.avanceAsistenciaService.registrarAsistencias(payload).subscribe({
      next: () => {
        this.isLoading = false;
        Swal.fire({
          icon: 'success',
          title: 'Asistencia Guardada',
          text: 'Se registraron los datos de asistencia y el checklist por unidades.',
          timer: 1800,
          showConfirmButton: false,
          background: '#111827',
          color: '#f3f4f6'
        });
        this.onFiltroChange();
      },
      error: () => {
        this.isLoading = false;
        Swal.fire({
          title: 'Error',
          text: 'No se pudo guardar el registro de asistencia.',
          icon: 'error',
          background: '#111827',
          color: '#f3f4f6'
        });
      }
    });
  }

  isUnidadSelected(idUnidad: any): boolean {
    return String(this.selectedUnidadAsistenciaId()) === String(idUnidad);
  }

  selectUnidad(idUnidad: any): void {
    this.selectedUnidadAsistenciaId.set(String(idUnidad));
    this.onFiltroChange();
  }
}
