import { Component, OnInit, computed, signal, effect } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { MiembroService } from '../../../core/services/miembro.service';
import { UnidadService } from '../../../core/services/unidad.service';
import { RankingService } from '../../../core/services/ranking.service';
import { ClubService } from '../../../core/services/club.service';
import { EspecialidadService } from '../../../core/services/especialidad.service';

@Component({
  selector: 'app-dashboard-home',
  templateUrl: './dashboard-home.component.html',
  standalone: false
})
export class DashboardHomeComponent implements OnInit {
  currentUser = computed(() => this.authService.currentUser());
  isAdmin = computed(() => {
    const role = this.currentUser()?.rol;
    const roleName = typeof role === 'string' ? role : (role as any)?.nombre;
    return roleName === 'ADMINISTRADOR';
  });

  stats = signal({
    totalMiembros: 0,
    unidadesActivas: 0,
    diasProximoEvento: 15,
    especialidadesOtorgadas: 0
  });

  adminStats = signal({
    totalClubes: 0,
    totalUsuarios: 0,
    totalEspecialidades: 0,
    totalClases: 0
  });

  clubName = signal<string>('Club Fernando Stahl');

  recentActivity = [
    {
      icon: 'verified',
      colorClass: 'bg-blue-100 text-blue-700',
      description: 'La <strong class="text-[#00113a]">Unidad Halcones</strong> completó los requisitos de la clase "Viajero".',
      time: 'Hace 2 horas • Verificado por el Director'
    },
    {
      icon: 'person_add',
      colorClass: 'bg-red-100 text-red-700',
      description: '<strong class="text-[#00113a]">3 Nuevos Miembros</strong> se unieron al club en la clase Amigo.',
      time: 'Hace 5 horas • Registro pendiente de revisión'
    },
    {
      icon: 'event_available',
      colorClass: 'bg-amber-100 text-amber-700',
      description: 'Se abrió el registro para el <strong class="text-[#00113a]">Campamento de Invierno</strong>.',
      time: 'Ayer • 12 participantes ya registrados'
    }
  ];

  schedule = [
    { time: '14:00 - 14:15', title: 'Ceremonia de Apertura e Inspección', isCurrent: false, tags: null },
    { time: '14:15 - 15:15', title: 'Clases de Especialidad: Sesión A', isCurrent: true, tags: ['Halcones', 'Primeros Auxilios'] },
    { time: '15:15 - 16:00', title: 'Práctica de Marcha y Desfile', isCurrent: false, tags: null }
  ];

  unitReadiness = signal([
    { clase: 'Clase Amigo', porcentaje: 92, color: 'bg-green-500' },
    { clase: 'Clase Viajero', porcentaje: 78, color: 'bg-[#00113a]' },
    { clase: 'Clase Guía', porcentaje: 45, color: 'bg-[#b7102a]' }
  ]);

  constructor(
    private authService: AuthService,
    private miembroService: MiembroService,
    private unidadService: UnidadService,
    private rankingService: RankingService,
    private clubService: ClubService,
    private especialidadService: EspecialidadService
  ) {
    effect(() => {
      const user = this.currentUser();
      if (!user) return;
      if (this.isAdmin()) {
        this.cargarEstadisticasGlobales();
      } else {
        this.cargarEstadisticas();
      }
    });
  }

  ngOnInit(): void {}

  cargarEstadisticasGlobales(): void {
    this.clubService.getClubes().subscribe({
      next: (clubes) => this.adminStats.update(s => ({ ...s, totalClubes: clubes.length })),
      error: () => this.adminStats.update(s => ({ ...s, totalClubes: 3 }))
    });

    this.authService.getUsers().subscribe({
      next: (usuarios) => this.adminStats.update(s => ({ ...s, totalUsuarios: usuarios.length })),
      error: () => this.adminStats.update(s => ({ ...s, totalUsuarios: 10 }))
    });

    this.especialidadService.getEspecialidades().subscribe({
      next: (especialidades) => this.adminStats.update(s => ({ ...s, totalEspecialidades: especialidades.length })),
      error: () => this.adminStats.update(s => ({ ...s, totalEspecialidades: 8 }))
    });

    this.clubService.getClases().subscribe({
      next: (clases) => this.adminStats.update(s => ({ ...s, totalClases: clases.length })),
      error: () => this.adminStats.update(s => ({ ...s, totalClases: 6 }))
    });
  }

  cargarEstadisticas(): void {
    const user = this.authService.currentUser();
    const idClub = user?.idClub ? Number(user.idClub) : 1;

    this.clubService.getClubById(String(idClub)).subscribe({
      next: (club) => {
        this.clubName.set(club.nombre);
      },
      error: () => {
        this.clubName.set('Club ' + (user?.idClub || 'Fernando Stahl'));
      }
    });

    this.miembroService.getMiembrosByClub(String(idClub)).subscribe({
      next: (miembros) => {
        this.stats.update(s => ({ ...s, totalMiembros: miembros.length }));
      },
      error: () => this.stats.update(s => ({ ...s, totalMiembros: 30 }))
    });

    this.unidadService.getUnidades().subscribe({
      next: (unidades) => {
        this.stats.update(s => ({ ...s, unidadesActivas: unidades.length }));
      },
      error: () => this.stats.update(s => ({ ...s, unidadesActivas: 4 }))
    });

    this.rankingService.getIndicadoresByClub(String(idClub)).subscribe({
      next: (data) => {
        if (data && data['especialidadesCompletadas']) {
          this.stats.update(s => ({ ...s, especialidadesOtorgadas: data['especialidadesCompletadas'] }));
        } else {
          this.stats.update(s => ({ ...s, especialidadesOtorgadas: 18 }));
        }
      },
      error: () => this.stats.update(s => ({ ...s, especialidadesOtorgadas: 18 }))
    });
  }
}
