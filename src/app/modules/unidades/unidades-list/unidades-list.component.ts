import { Component, OnInit, computed, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { UnidadService } from '../../../core/services/unidad.service';
import { ClubService, ClaseBackend } from '../../../core/services/club.service';
import { MiembroService } from '../../../core/services/miembro.service';
import { SesionesService, SesionBackend } from '../../../core/services/sesiones.service';
import { AvanceAsistenciaService } from '../../../core/services/avance-asistencia.service';
import { PoaService } from '../../../core/services/poa.service';
import { RankingService } from '../../../core/services/ranking.service';
import { PosicionRanking } from '../../ranking/ranking.component';
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

  // Members modal state
  showMembersModal = false;
  selectedUnitMembers: any[] = [];
  selectedUnitCounselor: any = null;
  selectedUnitName = '';
  selectedUnitColor = '';
  selectedUnitImage = '';
  topContributorName = '';
  topContributorPoints = 0;

  // Tabs state
  activeTab: 'unidades' | 'asistencia' | 'ranking' = 'unidades';

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

  ranking = signal<PosicionRanking[]>([]);
  initialSessionPoints = 0;

  get totalMiembros(): number {
    return this.unidades.reduce((acc, curr) => acc + (curr.miembrosCount || 0), 0);
  }

  get recordPuntos(): number {
    if (this.unidades.length === 0) return 0;
    return Math.max(...this.unidades.map(u => u.puntos || 0));
  }

  canEditUnidadAsistencia(idUnidad: string | number): boolean {
    const user = this.currentUser();
    if (!user) return false;
    const rawRol = user.rol;
    const role = typeof rawRol === 'string' ? rawRol : (rawRol as any)?.nombre;
    const userId = user.idUsuario;

    if (role === 'ADMINISTRADOR' || role === 'DIRECTOR' || role === 'INSTRUCTOR' || role === 'SECRETARIO' || role === 'DIRECTOR_ASOCIADO') {
      return true;
    }

    if (role === 'CONSEJERO') {
      const unit = this.unidades.find(u => String(u.idUnidad) === String(idUnidad));
      return unit ? String(unit.consejeroId) === String(userId) : false;
    }

    return false;
  }

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
    private poaService: PoaService,
    private rankingService: RankingService
  ) {
    this.unidadForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      descripcion: [''],
      icono: ['pets'],
      color: ['primary'],
      idConsejero: [''],
      imagen: ['']
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
        this.loadRanking();
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
    this.unidadForm.reset({ nombre: '', descripcion: '', icono: 'pets', color: 'primary', idConsejero: '', imagen: '' });
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
      idConsejero: unidad.consejeroId || '',
      imagen: unidad.imagen || ''
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
      consejero: formVal.idConsejero ? { idUsuario: Number(formVal.idConsejero) } : null,
      imagen: formVal.imagen || null
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

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        Swal.fire({
          title: 'Archivo muy grande',
          text: 'La imagen no debe superar los 2MB.',
          icon: 'warning',
          background: '#f8f9fa',
          color: '#191c1d'
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        this.unidadForm.patchValue({
          imagen: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(): void {
    this.unidadForm.patchValue({
      imagen: ''
    });
  }

  openMembersModal(unidad: Unidad): void {
    this.selectedUnitName = unidad.nombre;
    this.selectedUnitColor = unidad.color || 'primary';
    this.selectedUnitImage = unidad.imagen || '';
    this.selectedUnitMembers = [];
    this.selectedUnitCounselor = null;
    this.topContributorName = '';
    this.topContributorPoints = 0;
    this.isLoading = true;

    const clubId = String(this.currentUser()?.idClub || '1');
    
    this.miembroService.getMiembrosByClub(clubId).subscribe({
      next: (miembros) => {
        const allUnitMembers = miembros.filter(m => String(m.idUnidad) === String(unidad.idUnidad));
        
        const counselor = allUnitMembers.find(m => m.funcion === 'CONSEJERO');
        if (counselor) {
          this.selectedUnitCounselor = counselor;
        } else if (unidad.consejeroNombre) {
          this.selectedUnitCounselor = {
            nombre: unidad.consejeroNombre.split(' ')[0],
            apellido: unidad.consejeroNombre.split(' ').slice(1).join(' ') || '',
            funcion: 'CONSEJERO'
          };
        }

        const conquistadores = allUnitMembers.filter(m => m.funcion === 'CONQUISTADOR');

        if (conquistadores.length === 0) {
          this.selectedUnitMembers = [];
          this.isLoading = false;
          this.showMembersModal = true;
          return;
        }

        this.avanceAsistenciaService.getAsistenciasByUnidad(unidad.idUnidad).subscribe({
          next: (asistencias) => {
            const pointsMap: Record<string, number> = {};

            asistencias.forEach(a => {
              const mId = String(a.miembro?.idMiembro || a.idMiembro || '');
              if (!mId) return;

              let score = 0;
              if (a.estado === 'PRESENTE') {
                score += 10;
                if (a.panoleta) score += 10;
                if (a.biblia) score += 10;
                if (a.agua) score += 10;
                if (a.materiales) score += 10;
                if (a.cuota) score += 10;
              }
              pointsMap[mId] = (pointsMap[mId] || 0) + score;
            });

            let maxPoints = -1;
            let mvpName = '';

            this.selectedUnitMembers = conquistadores.map(m => {
              const points = pointsMap[String(m.idMiembro)] || 0;
              if (points > maxPoints && points > 0) {
                maxPoints = points;
                mvpName = m.nombre + ' ' + m.apellido;
              }
              return {
                ...m,
                puntosAportados: points
              };
            });

            this.selectedUnitMembers.sort((a, b) => b.puntosAportados - a.puntosAportados);

            if (maxPoints > 0) {
              this.topContributorName = mvpName;
              this.topContributorPoints = maxPoints;
            }

            this.isLoading = false;
            this.showMembersModal = true;
          },
          error: (err) => {
            console.error('Error fetching assistances for MVP calculation', err);
            this.selectedUnitMembers = conquistadores.map(m => ({ ...m, puntosAportados: 0 }));
            this.isLoading = false;
            this.showMembersModal = true;
          }
        });
      },
      error: (err) => {
        console.error('Error loading members for modal', err);
        this.isLoading = false;
      }
    });
  }

  closeMembersModal(): void {
    this.showMembersModal = false;
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
                    const memberId = a.miembro?.idMiembro || a.idMiembro;
                    if (memberId) attendancesMap[String(memberId)] = a;
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
                  this.calculateInitialSessionPoints(list);
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
              this.calculateInitialSessionPoints(list);
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
              materiales: false,
              cuota: false
            };
          }
          return { ...r, estado: nuevoEstado };
        }
        return r;
      })
    );
    this.updateRankingLocally();
  }

  toggleCheck(idMiembro: string, field: 'panoleta' | 'biblia' | 'agua' | 'materiales' | 'cuota'): void {
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
    this.updateRankingLocally();
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
          miembro: { idMiembro: r.idMiembro },
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
        this.loadUnidades();
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

  loadRanking(): void {
    const user = this.currentUser();
    const idClub = user?.idClub || 'uuid-club-conquistadores-orion';

    this.rankingService.getRankingByClub(String(idClub)).subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          const sortedData = [...data].sort((a, b) => b.puntaje - a.puntaje);
          const mapped: PosicionRanking[] = sortedData.map((r, i) => {
            const idUnidad = (r as any).unidad?.idUnidad || r.idUnidad;
            const nombreUnidad = (r as any).unidad?.nombre || r.nombreUnidad;
            const unit = this.unidades.find(u => String(u.nombre) === String(nombreUnidad) || String(u.idUnidad) === String(idUnidad));
            const colorVal = unit?.color || 'primary';
            const iconVal = unit?.icono || 'star';
            const consejeroVal = unit?.consejeroNombre || 'Sin asignar';

            const total = r.puntaje;
            const puntosAsistencia = Math.round(total * 0.20);
            const puntosPanoleta = Math.round(total * 0.16);
            const puntosBiblia = Math.round(total * 0.16);
            const puntosAgua = Math.round(total * 0.16);
            const puntosMateriales = Math.round(total * 0.16);
            const puntosCuota = total - (puntosAsistencia + puntosPanoleta + puntosBiblia + puntosAgua + puntosMateriales);

            return {
              posicion: i + 1,
              unidad: nombreUnidad || `Unidad ${i + 1}`,
              color: colorVal === 'primary' ? '#00113a' : colorVal === 'secondary' ? '#b7102a' : colorVal === 'tertiary' ? '#ffba27' : '#2e7d32',
              icono: iconVal,
              consejero: consejeroVal,
              puntaje: total,
              puntosAsistencia,
              puntosPanoleta,
              puntosBiblia,
              puntosAgua,
              puntosMateriales,
              puntosCuota,
              tendencia: 'EQUAL' as const
            };
          });
          this.ranking.set(mapped);
        } else {
          const mapped: PosicionRanking[] = this.unidades.map((u, i) => {
            const total = u.puntos || 0;
            const puntosAsistencia = Math.round(total * 0.20);
            const puntosPanoleta = Math.round(total * 0.16);
            const puntosBiblia = Math.round(total * 0.16);
            const puntosAgua = Math.round(total * 0.16);
            const puntosMateriales = Math.round(total * 0.16);
            const puntosCuota = total - (puntosAsistencia + puntosPanoleta + puntosBiblia + puntosAgua + puntosMateriales);

            return {
              posicion: i + 1,
              unidad: u.nombre,
              color: u.color === 'primary' ? '#00113a' : u.color === 'secondary' ? '#b7102a' : u.color === 'tertiary' ? '#ffba27' : '#2e7d32',
              icono: u.icono || 'star',
              consejero: u.consejeroNombre || 'Sin asignar',
              puntaje: total,
              puntosAsistencia,
              puntosPanoleta,
              puntosBiblia,
              puntosAgua,
              puntosMateriales,
              puntosCuota,
              tendencia: 'EQUAL' as const
            };
          }).sort((a, b) => b.puntaje - a.puntaje).map((item, idx) => ({ ...item, posicion: idx + 1 }));
          this.ranking.set(mapped);
        }
      },
      error: (err) => {
        console.error('Error loading ranking', err);
      }
    });
  }

  calculateInitialSessionPoints(list: RegistroAsistencia[]): void {
    let score = 0;
    list.forEach(r => {
      if (r.estado === 'PRESENTE') {
        score += 10;
        if (r.panoleta) score += 10;
        if (r.biblia) score += 10;
        if (r.agua) score += 10;
        if (r.materiales) score += 10;
        if (r.cuota) score += 10;
      }
    });
    this.initialSessionPoints = score;
  }

  updateRankingLocally(): void {
    let currentSessionPoints = 0;
    this.registros().forEach(r => {
      if (r.estado === 'PRESENTE') {
        currentSessionPoints += 10;
        if (r.panoleta) currentSessionPoints += 10;
        if (r.biblia) currentSessionPoints += 10;
        if (r.agua) currentSessionPoints += 10;
        if (r.materiales) currentSessionPoints += 10;
        if (r.cuota) currentSessionPoints += 10;
      }
    });

    const selectedId = this.selectedUnidadAsistenciaId();
    const updatedUnidades = this.unidades.map(u => {
      if (String(u.idUnidad) === String(selectedId)) {
        const initialPoints = u.puntos || 0;
        const diff = currentSessionPoints - this.initialSessionPoints;
        return { ...u, puntos: Math.max(0, initialPoints + diff) };
      }
      return u;
    });

    const mapped: PosicionRanking[] = updatedUnidades.map((u, i) => {
      const total = u.puntos || 0;
      const puntosAsistencia = Math.round(total * 0.20);
      const puntosPanoleta = Math.round(total * 0.16);
      const puntosBiblia = Math.round(total * 0.16);
      const puntosAgua = Math.round(total * 0.16);
      const puntosMateriales = Math.round(total * 0.16);
      const puntosCuota = total - (puntosAsistencia + puntosPanoleta + puntosBiblia + puntosAgua + puntosMateriales);

      return {
        posicion: i + 1,
        unidad: u.nombre,
        color: u.color === 'primary' ? '#00113a' : u.color === 'secondary' ? '#b7102a' : u.color === 'tertiary' ? '#ffba27' : '#2e7d32',
        icono: u.icono || 'star',
        consejero: u.consejeroNombre || 'Sin asignar',
        puntaje: total,
        puntosAsistencia,
        puntosPanoleta,
        puntosBiblia,
        puntosAgua,
        puntosMateriales,
        puntosCuota,
        tendencia: 'EQUAL' as const
      };
    }).sort((a, b) => b.puntaje - a.puntaje).map((item, idx) => ({ ...item, posicion: idx + 1 }));

    this.ranking.set(mapped);
  }
}
