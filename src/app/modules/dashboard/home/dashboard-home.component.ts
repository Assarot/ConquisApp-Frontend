import { Component, OnInit, computed, signal } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { MiembroService } from '../../../core/services/miembro.service';
import { UnidadService } from '../../../core/services/unidad.service';
import { RankingService } from '../../../core/services/ranking.service';

@Component({
  selector: 'app-dashboard-home',
  templateUrl: './dashboard-home.component.html',
  standalone: false
})
export class DashboardHomeComponent implements OnInit {
  currentUser = computed(() => this.authService.currentUser());

  stats = signal({
    totalMiembros: 0,
    unidadesActivas: 0,
    diasProximoEvento: 15,
    especialidadesOtorgadas: 0
  });

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
    private rankingService: RankingService
  ) {}

  ngOnInit(): void {
    this.cargarEstadisticas();
  }

  cargarEstadisticas(): void {
    const user = this.authService.currentUser();
    const idClub = user?.idClub || 'uuid-club-conquistadores-orion';

    // Load real members count
    this.miembroService.getMiembrosByClub(idClub).subscribe({
      next: (miembros) => {
        this.stats.update(s => ({ ...s, totalMiembros: miembros.length }));
      },
      error: () => this.stats.update(s => ({ ...s, totalMiembros: 30 }))
    });

    // Load real units count
    this.unidadService.getUnidades().subscribe({
      next: (unidades) => {
        this.stats.update(s => ({ ...s, unidadesActivas: unidades.length }));
      },
      error: () => this.stats.update(s => ({ ...s, unidadesActivas: 4 }))
    });

    // Load club indicators for especialidades
    this.rankingService.getIndicadoresByClub(idClub).subscribe({
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
