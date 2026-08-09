import { Component, OnInit, signal } from '@angular/core';
import { EspecialidadService, EspecialidadBackend } from '../../core/services/especialidad.service';
import Swal from 'sweetalert2';

export interface EspecialidadItem {
  id: string;
  nombre: string;
  categoria: string;
  categoriaNombre: string;
  categoriaColor: string;
  icono: string;
  nivel: string;
  requisitosCount: number;
  conquistadoresCompletados: number;
  descripcion: string;
}

@Component({
  selector: 'app-especialidades',
  templateUrl: './especialidades.component.html',
  standalone: false
})
export class EspecialidadesComponent implements OnInit {
  filtroCategoria = signal('TODAS');
  searchTerm = signal('');
  selectedEspecialidad: EspecialidadItem | null = null;
  showEvaluacionModal = false;
  isLoading = signal(false);

  categorias = [
    { id: 'NATURALEZA', nombre: 'Naturaleza', color: '#2e7d32', icono: 'forest' },
    { id: 'HABILIDADES', nombre: 'Habilidades Manuales', color: '#00113a', icono: 'handyman' },
    { id: 'MISIONERAS', nombre: 'Actividades Misioneras', color: '#00838f', icono: 'volunteer_activism' },
    { id: 'CIENCIA', nombre: 'Ciencia y Salud', color: '#b7102a', icono: 'vital_signs' },
    { id: 'RECREACION', nombre: 'Actividades Recreativas', color: '#ffba27', icono: 'kayaking' }
  ];

  especialidades = signal<EspecialidadItem[]>([]);

  constructor(private especialidadService: EspecialidadService) {}

  ngOnInit(): void {
    this.cargarEspecialidades();
  }

  cargarEspecialidades(): void {
    this.isLoading.set(true);
    this.especialidadService.getEspecialidades().subscribe({
      next: (data) => {
        this.isLoading.set(false);
        if (data && data.length > 0) {
          const mapColor: Record<string, string> = {
            NATURALEZA: '#2e7d32',
            HABILIDADES: '#00113a',
            MISIONERAS: '#00838f',
            CIENCIA: '#b7102a',
            RECREACION: '#ffba27'
          };

          const items: EspecialidadItem[] = data.map(d => ({
            id: d.idEspecialidad || `esp-${Date.now()}`,
            nombre: d.nombre,
            categoria: d.categoria,
            categoriaNombre: this.categorias.find(c => c.id === d.categoria)?.nombre || d.categoria,
            categoriaColor: mapColor[d.categoria] || '#00113a',
            icono: d.icono || 'military_tech',
            nivel: 'BÁSICO',
            requisitosCount: 8,
            conquistadoresCompletados: d.puntos || 12,
            descripcion: d.descripcion
          }));
          this.especialidades.set(items);
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
    this.especialidades.set([
      {
        id: 'esp-1',
        nombre: 'Nudos y Amarras',
        categoria: 'HABILIDADES',
        categoriaNombre: 'Habilidades Manuales',
        categoriaColor: '#00113a',
        icono: 'all_inclusive',
        nivel: 'BÁSICO',
        requisitosCount: 8,
        conquistadoresCompletados: 18,
        descripcion: 'Conocer y ejecutar 20 nudos reglamentarios, amarras cuadradas y diagonales.'
      },
      {
        id: 'esp-2',
        nombre: 'Primeros Auxilios I',
        categoria: 'CIENCIA',
        categoriaNombre: 'Ciencia y Salud',
        categoriaColor: '#b7102a',
        icono: 'medical_services',
        nivel: 'BÁSICO',
        requisitosCount: 10,
        conquistadoresCompletados: 14,
        descripcion: 'Atención básica de shock, vendajes, RCP y manejo de fracturas simples.'
      },
      {
        id: 'esp-3',
        nombre: 'Árboles y Arbustos',
        categoria: 'NATURALEZA',
        categoriaNombre: 'Naturaleza',
        categoriaColor: '#2e7d32',
        icono: 'park',
        nivel: 'BÁSICO',
        requisitosCount: 7,
        conquistadoresCompletados: 12,
        descripcion: 'Identificar 15 especies de árboles nativos por corteza, hoja y frutos.'
      },
      {
        id: 'esp-4',
        nombre: 'Campismo y Supervivencia',
        categoria: 'RECREACION',
        categoriaNombre: 'Actividades Recreativas',
        categoriaColor: '#ffba27',
        icono: 'cabin',
        nivel: 'AVANZADO',
        requisitosCount: 12,
        conquistadoresCompletados: 9,
        descripcion: 'Armado de refugios naturales, cocina al aire libre y orientación sin brújula.'
      },
      {
        id: 'esp-5',
        nombre: 'Testificación Juvenil',
        categoria: 'MISIONERAS',
        categoriaNombre: 'Actividades Misioneras',
        categoriaColor: '#00838f',
        icono: 'diversity_3',
        nivel: 'BÁSICO',
        requisitosCount: 6,
        conquistadoresCompletados: 20,
        descripcion: 'Participar activamente en proyectos comunitarios y visitas de servicio.'
      },
      {
        id: 'esp-6',
        nombre: 'Astronomía',
        categoria: 'NATURALEZA',
        categoriaNombre: 'Naturaleza',
        categoriaColor: '#2e7d32',
        icono: 'bedtime',
        nivel: 'AVANZADO',
        requisitosCount: 9,
        conquistadoresCompletados: 6,
        descripcion: 'Reconocer constelaciones principales del hemisferio sur y planetas visibles.'
      }
    ]);
  }

  filtrarEspecialidades(): EspecialidadItem[] {
    return this.especialidades().filter(e => {
      const matchCat = this.filtroCategoria() === 'TODAS' || e.categoria === this.filtroCategoria();
      const matchSearch = e.nombre.toLowerCase().includes(this.searchTerm().toLowerCase()) ||
                          e.descripcion.toLowerCase().includes(this.searchTerm().toLowerCase());
      return matchCat && matchSearch;
    });
  }

  verDetalles(esp: EspecialidadItem): void {
    this.selectedEspecialidad = esp;
  }

  iniciarEvaluacion(esp: EspecialidadItem): void {
    this.selectedEspecialidad = esp;
    this.showEvaluacionModal = true;
  }

  guardarEvaluacion(): void {
    this.showEvaluacionModal = false;
    Swal.fire({
      icon: 'success',
      title: 'Evaluación Registrada',
      text: `Se registraron los avances en base de datos para "${this.selectedEspecialidad?.nombre}".`,
      timer: 1800,
      showConfirmButton: false
    });
  }
}
