import { Component, OnInit, signal } from '@angular/core';
import { EspecialidadService, EspecialidadBackend } from '../../core/services/especialidad.service';
import { RequisitoService, RequisitoBackend } from '../../core/services/requisito.service';

export interface EspecialidadItem {
  id: string;
  nombre: string;
  categoriaId: string;
  categoriaNombre: string;
  categoriaColor: string;
  icono: string;
  descripcion: string;
  requiereExamen: boolean;
}

const CATEGORIA_MAP: Record<string, { nombre: string; color: string; icono: string }> = {
  'NATURALEZA':  { nombre: 'Naturaleza',              color: '#2e7d32', icono: 'forest' },
  'HABILIDADES': { nombre: 'Habilidades Manuales',    color: '#00113a', icono: 'handyman' },
  'MISIONERAS':  { nombre: 'Actividades Misioneras',  color: '#00838f', icono: 'volunteer_activism' },
  'CIENCIA':     { nombre: 'Ciencia y Salud',         color: '#b7102a', icono: 'vital_signs' },
  'RECREACION':  { nombre: 'Actividades Recreativas', color: '#ffba27', icono: 'kayaking' }
};

@Component({
  selector: 'app-especialidades',
  templateUrl: './especialidades.component.html',
  standalone: false
})
export class EspecialidadesComponent implements OnInit {
  filtroCategoria = signal('TODAS');
  searchTerm = signal('');
  isLoading = signal(false);
  selectedEspecialidad: EspecialidadItem | null = null;
  requisitosModal = signal<RequisitoBackend[]>([]);
  loadingRequisitos = signal(false);

  categorias = Object.entries(CATEGORIA_MAP).map(([id, v]) => ({ id, ...v }));

  especialidades = signal<EspecialidadItem[]>([]);

  constructor(
    private especialidadService: EspecialidadService,
    private requisitoService: RequisitoService
  ) {}

  ngOnInit(): void {
    this.cargarEspecialidades();
  }

  cargarEspecialidades(): void {
    this.isLoading.set(true);
    this.especialidadService.getEspecialidades().subscribe({
      next: (data) => {
        this.isLoading.set(false);
        const items: EspecialidadItem[] = data.map(d => {
          // categoria arrives as object {nombre} or as plain string
          const catRaw = d.categoria;
          const catNombre: string = typeof catRaw === 'object' && catRaw !== null
            ? (catRaw.nombre || '') : (catRaw || '');

          const catKey = Object.keys(CATEGORIA_MAP).find(k =>
            catNombre.toUpperCase().includes(k) || k.includes(catNombre.toUpperCase())
          ) || catNombre.toUpperCase();

          const catInfo = CATEGORIA_MAP[catKey] || { nombre: catNombre || 'General', color: '#00113a', icono: 'military_tech' };

          return {
            id: d.idEspecialidad || `esp-${Math.random()}`,
            nombre: d.nombre,
            categoriaId: catKey,
            categoriaNombre: catInfo.nombre,
            categoriaColor: catInfo.color,
            icono: d.icono || 'military_tech',
            descripcion: d.descripcion,
            requiereExamen: d.requiereExamen || false
          };
        });
        this.especialidades.set(items);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }



  filtrarEspecialidades(): EspecialidadItem[] {
    return this.especialidades().filter(e => {
      const matchCat = this.filtroCategoria() === 'TODAS' || e.categoriaId === this.filtroCategoria();
      const term = this.searchTerm().toLowerCase();
      const matchSearch = !term ||
        e.nombre.toLowerCase().includes(term) ||
        e.descripcion.toLowerCase().includes(term) ||
        e.categoriaNombre.toLowerCase().includes(term);
      return matchCat && matchSearch;
    });
  }

  verRequisitos(esp: EspecialidadItem): void {
    this.selectedEspecialidad = esp;
    this.requisitosModal.set([]);
    this.loadingRequisitos.set(true);
    this.requisitoService.getRequisitosByEspecialidad(esp.id).subscribe({
      next: (reqs) => {
        this.requisitosModal.set(reqs);
        this.loadingRequisitos.set(false);
      },
      error: () => this.loadingRequisitos.set(false)
    });
  }

  cerrarModal(): void {
    this.selectedEspecialidad = null;
    this.requisitosModal.set([]);
  }
}
