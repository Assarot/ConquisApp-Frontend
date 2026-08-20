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
  puntosPanoleta: number;
  puntosBiblia: number;
  puntosAgua: number;
  puntosMateriales: number;
  puntosCuota: number;
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
          const sortedData = [...data].sort((a, b) => b.puntaje - a.puntaje);
          const colores = ['#ffba27', '#00113a', '#b7102a', '#2e7d32'];
          const iconos = ['star', 'flight', 'local_fire_department', 'pets'];
          const mapped: PosicionRanking[] = sortedData.map((r, i) => {
            const total = r.puntaje;
            const puntosAsistencia = Math.round(total * 0.20);
            const puntosPanoleta = Math.round(total * 0.16);
            const puntosBiblia = Math.round(total * 0.16);
            const puntosAgua = Math.round(total * 0.16);
            const puntosMateriales = Math.round(total * 0.16);
            const puntosCuota = total - (puntosAsistencia + puntosPanoleta + puntosBiblia + puntosAgua + puntosMateriales);

            return {
              posicion: i + 1,
              unidad: r.nombreUnidad || `Unidad ${i + 1}`,
              color: colores[i % colores.length],
              icono: iconos[i % iconos.length],
              consejero: 'Consejero',
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
        puntosPanoleta: 680,
        puntosBiblia: 680,
        puntosAgua: 650,
        puntosMateriales: 650,
        puntosCuota: 650,
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
        puntosPanoleta: 610,
        puntosBiblia: 610,
        puntosAgua: 630,
        puntosMateriales: 630,
        puntosCuota: 630,
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
        puntosPanoleta: 560,
        puntosBiblia: 560,
        puntosAgua: 560,
        puntosMateriales: 560,
        puntosCuota: 560,
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
        puntosPanoleta: 520,
        puntosBiblia: 520,
        puntosAgua: 520,
        puntosMateriales: 520,
        puntosCuota: 520,
        tendencia: 'UP'
      }
    ]);
  }

  getPodiumColor(pos: number): string {
    const map: Record<number, string> = { 1: '#ffba27', 2: '#9e9e9e', 3: '#cd7f32' };
    return map[pos] || '#00113a';
  }
}
