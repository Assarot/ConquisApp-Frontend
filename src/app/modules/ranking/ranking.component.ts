import { Component, OnInit, signal } from '@angular/core';
import { RankingService } from '../../core/services/ranking.service';
import { AuthService } from '../../core/services/auth.service';

export interface PosicionRanking {
  posicion: number;
  unidad: string;
  color: string;
  icono: string;
  consejero: string;
  puntaje: number;
  puntosAsistencia: number;
  puntosUniforme: number;
  puntosCuotas: number;
  puntosEspecialidades: number;
  tendencia: 'UP' | 'DOWN' | 'EQUAL';
}

@Component({
  selector: 'app-ranking',
  templateUrl: './ranking.component.html',
  standalone: false
})
export class RankingComponent implements OnInit {
  isLoading = signal(false);
  ranking = signal<PosicionRanking[]>([]);

  constructor(
    private rankingService: RankingService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarRanking();
  }

  cargarRanking(): void {
    this.isLoading.set(true);
    const user = this.authService.currentUser();
    const idClub = user?.idClub || 'uuid-club-conquistadores-orion';

    this.rankingService.getRankingByClub(idClub).subscribe({
      next: (data) => {
        this.isLoading.set(false);
        if (data && data.length > 0) {
          const colores = ['#ffba27', '#00113a', '#b7102a', '#2e7d32'];
          const iconos = ['star', 'flight', 'local_fire_department', 'pets'];
          const mapped: PosicionRanking[] = data.map((r, i) => ({
            posicion: i + 1,
            unidad: r.nombreUnidad || `Unidad ${i + 1}`,
            color: colores[i % colores.length],
            icono: iconos[i % iconos.length],
            consejero: 'Consejero',
            puntaje: r.puntaje,
            puntosAsistencia: Math.round(r.puntaje * 0.27),
            puntosUniforme: Math.round(r.puntaje * 0.27),
            puntosCuotas: Math.round(r.puntaje * 0.22),
            puntosEspecialidades: Math.round(r.puntaje * 0.24),
            tendencia: 'EQUAL' as const
          }));
          this.ranking.set(mapped);
        } else {
          this.cargarFallback();
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.cargarFallback();
      }
    });
  }

  private cargarFallback(): void {
    this.ranking.set([
      {
        posicion: 1,
        unidad: 'Estrellas',
        color: '#ffba27',
        icono: 'star',
        consejero: 'Lucía Fernández',
        puntaje: 3620,
        puntosAsistencia: 960,
        puntosUniforme: 980,
        puntosCuotas: 800,
        puntosEspecialidades: 880,
        tendencia: 'UP'
      },
      {
        posicion: 2,
        unidad: 'Águilas',
        color: '#00113a',
        icono: 'flight',
        consejero: 'Marcos Ruiz',
        puntaje: 3410,
        puntosAsistencia: 900,
        puntosUniforme: 910,
        puntosCuotas: 780,
        puntosEspecialidades: 820,
        tendencia: 'EQUAL'
      },
      {
        posicion: 3,
        unidad: 'Leones',
        color: '#b7102a',
        icono: 'local_fire_department',
        consejero: 'Ana Torres',
        puntaje: 3120,
        puntosAsistencia: 820,
        puntosUniforme: 840,
        puntosCuotas: 720,
        puntosEspecialidades: 740,
        tendencia: 'DOWN'
      },
      {
        posicion: 4,
        unidad: 'Halcones',
        color: '#2e7d32',
        icono: 'pets',
        consejero: 'Pedro Castro',
        puntaje: 2890,
        puntosAsistencia: 760,
        puntosUniforme: 780,
        puntosCuotas: 680,
        puntosEspecialidades: 670,
        tendencia: 'UP'
      }
    ]);
  }

  getPodiumColor(pos: number): string {
    const map: Record<number, string> = { 1: '#ffba27', 2: '#9e9e9e', 3: '#cd7f32' };
    return map[pos] || '#00113a';
  }
}
