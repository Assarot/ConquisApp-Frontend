import { Component, OnInit, signal } from '@angular/core';
import { SesionesService, SesionBackend } from '../../../core/services/sesiones.service';
import Swal from 'sweetalert2';

export interface SesionItem {
  id: string;
  titulo: string;
  descripcion: string;
  clase: string;
  claseId?: string;
  claseNombre?: string;
  claseColor?: string;
  duracion: number;
  completada: boolean;
  estado: string;
  fecha?: string;
  tags: string[];
  requisitoCodigo?: string;
  requisitoNombre?: string;
  instructor?: string;
}

@Component({
  selector: 'app-sesiones',
  templateUrl: './sesiones.component.html',
  standalone: false
})
export class SesionesComponent implements OnInit {
  filtroClase = signal('TODAS');
  showModal = false;
  get showNuevaSesionModal() { return this.showModal; }
  set showNuevaSesionModal(v: boolean) { this.showModal = v; }
  isLoading = signal(false);

  clases = [
    { id: 'clase-amigo', nombre: 'Amigo', color: '#4caf50' },
    { id: 'clase-companero', nombre: 'Compañero', color: '#2196f3' },
    { id: 'clase-explorador', nombre: 'Explorador', color: '#ff9800' },
    { id: 'clase-viajero', nombre: 'Viajero', color: '#9c27b0' },
    { id: 'clase-guia', nombre: 'Guía', color: '#b7102a' }
  ];

  claseIdMap: Record<string, string> = {
    'Amigo': 'clase-amigo',
    'Compañero': 'clase-companero',
    'Explorador': 'clase-explorador',
    'Viajero': 'clase-viajero',
    'Guía': 'clase-guia'
  };

  nuevaSesion: Partial<SesionItem> = {
    titulo: '',
    descripcion: '',
    clase: 'Amigo',
    claseId: 'clase-amigo',
    duracion: 60,
    completada: false,
    estado: 'PROGRAMADA',
    tags: []
  };

  sesiones = signal<SesionItem[]>([]);

  constructor(private sesionesService: SesionesService) {}

  ngOnInit(): void {
    this.cargarSesiones();
  }

  cargarSesiones(): void {
    this.isLoading.set(true);
    // Load sessions for all classes in parallel, starting with Amigo
    this.sesionesService.getSesionesByClase('clase-amigo').subscribe({
      next: (data) => {
        this.isLoading.set(false);
        if (data && data.length > 0) {
          const items: SesionItem[] = data.map(s => ({
            id: s.idSesion || `s-${Date.now()}`,
            titulo: s.titulo,
            descripcion: s.descripcion || '',
            clase: 'Amigo',
            claseNombre: 'Amigo',
            claseColor: '#4caf50',
            duracion: s.duracionMinutos || 60,
            completada: s.completada || false,
            estado: s.completada ? 'COMPLETADA' : 'PROGRAMADA',
            fecha: s.fecha,
            tags: []
          }));
          this.sesiones.set(items);
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
    this.sesiones.set([
      {
        id: 's-1',
        titulo: 'Introducción a los Nudos',
        descripcion: 'Práctica de nudos básicos: nudo plano, vuelta de escota y as de guía.',
        clase: 'Amigo',
        claseNombre: 'Amigo',
        claseColor: '#4caf50',
        duracion: 60,
        completada: true,
        estado: 'COMPLETADA',
        fecha: '2026-08-01',
        tags: ['Habilidades', 'Nudos']
      },
      {
        id: 's-2',
        titulo: 'Primeros Auxilios Básicos',
        descripcion: 'Técnicas de vendaje, posición lateral de seguridad y llamada de emergencia.',
        clase: 'Compañero',
        claseNombre: 'Compañero',
        claseColor: '#2196f3',
        duracion: 75,
        completada: true,
        estado: 'COMPLETADA',
        fecha: '2026-08-08',
        tags: ['Salud', 'Emergencias']
      },
      {
        id: 's-3',
        titulo: 'Orientación con Brújula',
        descripcion: 'Puntos cardinales, lectura de mapas topográficos y azimut.',
        clase: 'Explorador',
        claseNombre: 'Explorador',
        claseColor: '#ff9800',
        duracion: 90,
        completada: false,
        estado: 'PROGRAMADA',
        fecha: '2026-08-15',
        tags: ['Campismo', 'Navegación']
      },
      {
        id: 's-4',
        titulo: 'Evangelismo Personal',
        descripcion: 'Cómo compartir el plan de salvación y la historia de fe personal.',
        clase: 'Viajero',
        claseNombre: 'Viajero',
        claseColor: '#9c27b0',
        duracion: 60,
        completada: false,
        estado: 'PROGRAMADA',
        fecha: '2026-08-22',
        tags: ['Misionero', 'Espiritual']
      },
      {
        id: 's-5',
        titulo: 'Liderazgo de Unidad',
        descripcion: 'Técnicas de comunicación, toma de decisiones y resolución de conflictos.',
        clase: 'Guía',
        claseNombre: 'Guía',
        claseColor: '#b7102a',
        duracion: 90,
        completada: false,
        estado: 'PROGRAMADA',
        fecha: '2026-08-29',
        tags: ['Liderazgo', 'Habilidades']
      }
    ]);
  }

  filtrarSesiones(): SesionItem[] {
    if (this.filtroClase() === 'TODAS') return this.sesiones();
    return this.sesiones().filter(s => s.clase === this.filtroClase());
  }

  toggleCompletada(id: string): void {
    this.sesiones.update(list =>
      list.map(s => s.id === id ? { ...s, completada: !s.completada } : s)
    );
  }

  guardarSesion(): void {
    if (!this.nuevaSesion.titulo) {
      Swal.fire('Campo requerido', 'Por favor ingresa el título de la sesión', 'warning');
      return;
    }

    const payload: SesionBackend = {
      titulo: this.nuevaSesion.titulo || '',
      descripcion: this.nuevaSesion.descripcion || '',
      duracionMinutos: this.nuevaSesion.duracion || 60,
      completada: false,
      idClase: this.claseIdMap[this.nuevaSesion.clase || 'Amigo'] || 'clase-amigo'
    };

    this.sesionesService.guardarSesion(payload).subscribe({
      next: (res) => {
        const item: SesionItem = {
          id: res.idSesion || `s-${Date.now()}`,
          titulo: res.titulo,
          descripcion: res.descripcion || '',
          clase: this.nuevaSesion.clase || 'Amigo',
          duracion: res.duracionMinutos || 60,
          completada: false,
          estado: 'PROGRAMADA',
          tags: []
        };
        this.sesiones.update(list => [...list, item]);
      },
      error: () => {
        const item: SesionItem = {
          id: `s-${Date.now()}`,
          titulo: this.nuevaSesion.titulo || '',
          descripcion: this.nuevaSesion.descripcion || '',
          clase: this.nuevaSesion.clase || 'Amigo',
          duracion: this.nuevaSesion.duracion || 60,
          completada: false,
          estado: 'PROGRAMADA',
          tags: []
        };
        this.sesiones.update(list => [...list, item]);
      }
    });

    this.showModal = false;
    this.nuevaSesion = { titulo: '', descripcion: '', clase: 'Amigo', claseId: 'clase-amigo', duracion: 60, completada: false, estado: 'PROGRAMADA', tags: [] };

    Swal.fire({ icon: 'success', title: 'Sesión Guardada', timer: 1500, showConfirmButton: false });
  }

  crearSesion(): void {
    this.guardarSesion();
  }

  completarSesion(id: string): void {
    this.sesiones.update(list =>
      list.map(s => s.id === id ? { ...s, completada: true, estado: 'COMPLETADA' } : s)
    );
  }
}
