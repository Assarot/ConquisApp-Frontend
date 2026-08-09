import { Component, OnInit, signal } from '@angular/core';
import { RankingService } from '../../core/services/ranking.service';
import { AuthService } from '../../core/services/auth.service';

export interface KpiCard {
  titulo: string;
  valor: string;
  icono: string;
  trend: string;
  trendUp: boolean;
  color: string;
}

export interface FilaUnidad {
  unidad: string;
  consejero: string;
  conquistadoresCount: number;
  conquistadores: number;
  asistencia: number;
  asistenciaPromedio: number;
  especialidades: number;
  uniforme: number;
  cuotas: number;
  cuotasAlDia: number;
  puntaje: number;
  puntajeTotal: number;
  requisitosCompletados: number;
}

@Component({
  selector: 'app-reportes',
  templateUrl: './reportes.component.html',
  standalone: false
})
export class ReportesComponent implements OnInit {
  isLoading = signal(false);

  kpis = signal<KpiCard[]>([
    { titulo: 'Total Conquistadores', valor: '–', icono: 'group', trend: '', trendUp: true, color: '#00113a' },
    { titulo: 'Asistencia Promedio', valor: '–', icono: 'how_to_reg', trend: '', trendUp: true, color: '#2e7d32' },
    { titulo: 'Especialidades Completadas', valor: '–', icono: 'military_tech', trend: '', trendUp: true, color: '#ffba27' },
    { titulo: 'Puntaje Promedio', valor: '–', icono: 'leaderboard', trend: '', trendUp: true, color: '#b7102a' }
  ]);

  filas = signal<FilaUnidad[]>([]);
  periodoSeleccionado = signal('Agosto 2026');

  get fichas() { return this.filas; }

  constructor(
    private rankingService: RankingService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarIndicadores();
  }

  cargarIndicadores(): void {
    this.isLoading.set(true);
    const user = this.authService.currentUser();
    const idClub = user?.idClub || 'uuid-club-conquistadores-orion';

    this.rankingService.getIndicadoresByClub(idClub).subscribe({
      next: (data) => {
        this.isLoading.set(false);
        if (data && Object.keys(data).length > 0) {
          this.kpis.update(kpis => kpis.map(k => {
            if (k.titulo === 'Total Conquistadores') return { ...k, valor: String(data['totalConquistadores'] ?? '–') };
            if (k.titulo === 'Asistencia Promedio') return { ...k, valor: `${data['promedioAsistencia'] ?? '–'}%` };
            if (k.titulo === 'Especialidades Completadas') return { ...k, valor: String(data['especialidadesCompletadas'] ?? '–') };
            if (k.titulo === 'Puntaje Promedio') return { ...k, valor: String(data['puntajePromedio'] ?? '–') };
            return k;
          }));
        } else {
          this.cargarFallback();
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.cargarFallback();
      }
    });

    this.rankingService.getRankingByClub(idClub).subscribe({
      next: (ranking) => {
        if (ranking && ranking.length > 0) {
          const mapped: FilaUnidad[] = ranking.map((r, i) => {
            const pct = Math.round((r.puntaje / 4000) * 100);
            return {
              unidad: r.nombreUnidad || `Unidad ${i + 1}`,
              consejero: 'Consejero',
              conquistadoresCount: 8,
              conquistadores: 8,
              asistencia: pct,
              asistenciaPromedio: pct,
              especialidades: Math.round(r.puntaje / 200),
              uniforme: pct,
              cuotas: pct,
              cuotasAlDia: pct,
              puntaje: r.puntaje,
              puntajeTotal: r.puntaje,
              requisitosCompletados: Math.round(r.puntaje / 150)
            };
          });
          this.filas.set(mapped);
        } else {
          this.setFilasFallback();
        }
      },
      error: () => this.setFilasFallback()
    });
  }

  private cargarFallback(): void {
    this.kpis.set([
      { titulo: 'Total Conquistadores', valor: '30', icono: 'group', trend: '+2 este mes', trendUp: true, color: '#00113a' },
      { titulo: 'Asistencia Promedio', valor: '87%', icono: 'how_to_reg', trend: '+3% vs mes anterior', trendUp: true, color: '#2e7d32' },
      { titulo: 'Especialidades Completadas', valor: '18', icono: 'military_tech', trend: '+5 este trimestre', trendUp: true, color: '#ffba27' },
      { titulo: 'Puntaje Promedio', valor: '3260', icono: 'leaderboard', trend: '+4.2% vs mes anterior', trendUp: true, color: '#b7102a' }
    ]);
    this.setFilasFallback();
  }

  private setFilasFallback(): void {
    this.filas.set([
      { unidad: 'Estrellas', consejero: 'Lucía Fernández', conquistadoresCount: 8, conquistadores: 8, asistencia: 95, asistenciaPromedio: 95, especialidades: 12, uniforme: 98, cuotas: 90, cuotasAlDia: 90, puntaje: 3620, puntajeTotal: 3620, requisitosCompletados: 24 },
      { unidad: 'Águilas', consejero: 'Marcos Ruiz', conquistadoresCount: 7, conquistadores: 7, asistencia: 90, asistenciaPromedio: 90, especialidades: 10, uniforme: 94, cuotas: 88, cuotasAlDia: 88, puntaje: 3410, puntajeTotal: 3410, requisitosCompletados: 20 },
      { unidad: 'Leones', consejero: 'Ana Torres', conquistadoresCount: 8, conquistadores: 8, asistencia: 84, asistenciaPromedio: 84, especialidades: 9, uniforme: 90, cuotas: 82, cuotasAlDia: 82, puntaje: 3120, puntajeTotal: 3120, requisitosCompletados: 18 },
      { unidad: 'Halcones', consejero: 'Pedro Castro', conquistadoresCount: 7, conquistadores: 7, asistencia: 78, asistenciaPromedio: 78, especialidades: 7, uniforme: 85, cuotas: 78, cuotasAlDia: 78, puntaje: 2890, puntajeTotal: 2890, requisitosCompletados: 14 }
    ]);
  }

  exportarReporte(formato: string): void {
    console.log(`Exportando ${formato}...`);
  }

  exportarPDF(): void {
    this.exportarReporte('PDF');
  }

  exportarExcel(): void {
    this.exportarReporte('Excel');
  }
}
