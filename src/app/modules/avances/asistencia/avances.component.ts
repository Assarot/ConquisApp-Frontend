import { Component, OnInit, computed, signal } from '@angular/core';
import { MiembroService } from '../../../core/services/miembro.service';
import { AvanceAsistenciaService } from '../../../core/services/avance-asistencia.service';
import { ClubService, ClaseBackend } from '../../../core/services/club.service';
import { EspecialidadService, EspecialidadBackend } from '../../../core/services/especialidad.service';
import { RequisitoService, RequisitoBackend } from '../../../core/services/requisito.service';
import { AuthService } from '../../../core/services/auth.service';
import { Miembro } from '../../../core/models/miembro.model';
import { Avance } from '../../../core/models/avance-asistencia.model';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

const CATEGORIA_MAP: Record<string, { nombre: string; color: string }> = {
  'NATURALEZA':  { nombre: 'Naturaleza',              color: '#2e7d32' },
  'HABILIDADES': { nombre: 'Habilidades Manuales',    color: '#00113a' },
  'MISIONERAS':  { nombre: 'Actividades Misioneras',  color: '#00838f' },
  'CIENCIA':     { nombre: 'Ciencia y Salud',         color: '#b7102a' },
  'RECREACION':  { nombre: 'Actividades Recreativas', color: '#ffba27' }
};

interface AvanceMiembro {
  idAvance?: string;
  idRequisito?: string;
  descripcion: string;
  esAvanzado: boolean;
  estado: 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADO';
}

@Component({
  selector: 'app-avances',
  templateUrl: './avances.component.html',
  standalone: false
})
export class AvancesComponent implements OnInit {
  clasesList = signal<ClaseBackend[]>([]);
  selectedClaseId = signal<string>('');
  isLoadingClases = signal(false);

  miembrosDeClase = signal<Miembro[]>([]);
  isLoadingMiembros = signal(false);

  selectedMiembro = signal<Miembro | null>(null);
  avancesClase = signal<AvanceMiembro[]>([]);
  especialidadesClub = signal<EspecialidadBackend[]>([]);
  isLoadingAvances = signal(false);

  currentUser = computed(() => this.authService.currentUser());
  canEdit = computed(() => {
    const rawRol = this.currentUser()?.rol;
    const role = typeof rawRol === 'string' ? rawRol : (rawRol as any)?.nombre;
    return ['ADMINISTRADOR', 'DIRECTOR', 'SECRETARIO', 'INSTRUCTOR'].includes(role || '');
  });

  get totalRequisitos() { return this.avancesClase().length; }
  get completados() { return this.avancesClase().filter(a => a.estado === 'COMPLETADO').length; }
  get enProgreso() { return this.avancesClase().filter(a => a.estado === 'EN_PROGRESO').length; }
  get pendientes() { return this.avancesClase().filter(a => a.estado === 'PENDIENTE').length; }
  get porcentaje() {
    if (this.totalRequisitos === 0) return 0;
    return Math.round((this.completados / this.totalRequisitos) * 100);
  }

  get avancesRegulares() {
    return this.avancesClase().filter(a => !a.esAvanzado);
  }

  get avancesAvanzados() {
    return this.avancesClase().filter(a => a.esAvanzado);
  }

  get maestriasPorCategoria(): { categoria: string; color: string; count: number; tieneMaestria: boolean }[] {
    const conteo: Record<string, number> = {};
    for (const esp of this.especialidadesClub()) {
      const catRaw = esp.categoria;
      const catNombre = typeof catRaw === 'object' && catRaw !== null ? (catRaw as any).nombre || '' : catRaw || '';
      const catKey = Object.keys(CATEGORIA_MAP).find(k =>
        catNombre.toUpperCase().includes(k) || k.includes(catNombre.toUpperCase())
      ) || 'GENERAL';
      conteo[catKey] = (conteo[catKey] || 0) + 1;
    }
    return Object.entries(conteo).map(([cat, count]) => ({
      categoria: CATEGORIA_MAP[cat]?.nombre || cat,
      color: CATEGORIA_MAP[cat]?.color || '#757682',
      count,
      tieneMaestria: count >= 5
    }));
  }

  constructor(
    private miembroService: MiembroService,
    private avanceAsistenciaService: AvanceAsistenciaService,
    private clubService: ClubService,
    private especialidadService: EspecialidadService,
    private requisitoService: RequisitoService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarClases();
    this.cargarEspecialidadesClub();
  }

  cargarClases(): void {
    this.isLoadingClases.set(true);
    this.clubService.getClases().subscribe({
      next: (clases) => { this.clasesList.set(clases); this.isLoadingClases.set(false); },
      error: () => this.isLoadingClases.set(false)
    });
  }

  cargarEspecialidadesClub(): void {
    this.especialidadService.getEspecialidades().subscribe({
      next: (esps) => this.especialidadesClub.set(esps),
      error: () => {}
    });
  }

  seleccionarClase(idClase: string): void {
    this.selectedClaseId.set(idClase);
    this.selectedMiembro.set(null);
    this.avancesClase.set([]);
    const clubId = String(this.currentUser()?.idClub || '');
    if (!clubId) return;
    this.isLoadingMiembros.set(true);
    this.miembroService.getMiembrosByClub(clubId).subscribe({
      next: (todos) => {
        this.miembrosDeClase.set(todos.filter(m => m.idClase === idClase && m.funcion === 'CONQUISTADOR'));
        this.isLoadingMiembros.set(false);
      },
      error: () => this.isLoadingMiembros.set(false)
    });
  }

  seleccionarMiembro(miembro: Miembro): void {
    this.selectedMiembro.set(miembro);
    this.isLoadingAvances.set(true);
    const idClase = this.selectedClaseId();

    forkJoin({
      requisitos: this.requisitoService.getRequisitosByClase(idClase).pipe(catchError(() => of([]))),
      avances: this.avanceAsistenciaService.getAvancesByMiembro(miembro.idMiembro).pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ requisitos, avances }) => {
        const avanceMap: Record<string, Avance> = {};
        for (const av of (avances as Avance[])) {
          if (av.idRequisito) avanceMap[String(av.idRequisito)] = av;
        }
        const lista: AvanceMiembro[] = (requisitos as RequisitoBackend[]).map(req => {
          const idReq = String(req.idRequisito || '');
          const avance = avanceMap[idReq];
          return {
            idAvance: avance?.idAvance,
            idRequisito: idReq,
            descripcion: req.descripcion,
            esAvanzado: req.esAvanzado,
            estado: (avance?.estado as any) || 'PENDIENTE'
          };
        });
        this.avancesClase.set(lista);
        this.isLoadingAvances.set(false);
      },
      error: () => this.isLoadingAvances.set(false)
    });
  }

  cambiarEstado(avance: AvanceMiembro, nuevoEstado: 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADO'): void {
    if (!this.canEdit() || !avance.idAvance) return;
    this.avanceAsistenciaService.corregirAvance(avance.idAvance, nuevoEstado).subscribe({
      next: () => {
        this.avancesClase.update(list =>
          list.map(a => a.idRequisito === avance.idRequisito ? { ...a, estado: nuevoEstado } : a)
        );
      }
    });
  }

  getEstadoClasses(estado: string): string {
    if (estado === 'COMPLETADO') return 'text-green-700 bg-green-100 border-green-200';
    if (estado === 'EN_PROGRESO') return 'text-blue-700 bg-blue-100 border-blue-200';
    return 'text-[#757682] bg-[#f4f4f6] border-[#c5c6d2]';
  }

  getEstadoLabel(estado: string): string {
    if (estado === 'COMPLETADO') return 'Completado';
    if (estado === 'EN_PROGRESO') return 'En Progreso';
    return 'Pendiente';
  }

  getNombreClase(): string {
    return this.clasesList().find(c => c.idClase === this.selectedClaseId())?.nombre || '';
  }
}
