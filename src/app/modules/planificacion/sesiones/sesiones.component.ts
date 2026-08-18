import { Component, OnInit, signal } from '@angular/core';
import { SesionesService, SesionBackend } from '../../../core/services/sesiones.service';
import { forkJoin } from 'rxjs';
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
  materiales?: string;
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
    tags: [],
    requisitoCodigo: '',
    requisitoNombre: '',
    materiales: '',
    instructor: ''
  };

  sesiones = signal<SesionItem[]>([]);

  constructor(private sesionesService: SesionesService) {}

  ngOnInit(): void {
    this.cargarSesiones();
  }

  cargarSesiones(): void {
    this.isLoading.set(true);
    
    const cIds = ['clase-amigo', 'clase-companero', 'clase-explorador', 'clase-viajero', 'clase-guia'];
    const requests = cIds.map(cId => this.sesionesService.getSesionesByClase(cId));

    forkJoin(requests).subscribe({
      next: (results) => {
        this.isLoading.set(false);
        const allItems: SesionItem[] = [];
        
        results.forEach((data, index) => {
          const cId = cIds[index];
          const classInfo = this.clases.find(c => c.id === cId);
          
          if (data && data.length > 0) {
            data.forEach(s => {
              let desc = s.descripcion || '';
              let parsed = { descripcion: desc, materiales: '', requisitoCodigo: 'REGULAR', requisitoNombre: 'Reunión Regular del Club', instructor: 'Instructor' };
              try {
                if (desc.startsWith('{')) {
                  parsed = JSON.parse(desc);
                }
              } catch (e) {}

              allItems.push({
                id: s.idSesion || `s-${Date.now()}-${Math.random()}`,
                titulo: s.titulo,
                descripcion: parsed.descripcion || '',
                clase: classInfo?.nombre || 'Amigo',
                claseId: cId,
                claseNombre: classInfo?.nombre || 'Amigo',
                claseColor: classInfo?.color || '#4caf50',
                duracion: s.duracionMinutos || 60,
                completada: s.completada || false,
                estado: s.completada ? 'COMPLETADA' : 'PROGRAMADA',
                fecha: s.fecha,
                tags: [],
                requisitoCodigo: parsed.requisitoCodigo || 'REGULAR',
                requisitoNombre: parsed.requisitoNombre || 'Reunión Regular',
                materiales: parsed.materiales || '',
                instructor: parsed.instructor || 'Instructor'
              });
            });
          }
        });

        if (allItems.length > 0) {
          this.sesiones.set(allItems);
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
        tags: ['Habilidades', 'Nudos'],
        requisitoCodigo: 'AM-HAB-01',
        requisitoNombre: 'Nudos básicos',
        materiales: 'Cuerdas de práctica, folleto guía',
        instructor: 'Juan Pérez'
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
        tags: ['Salud', 'Emergencias'],
        requisitoCodigo: 'CO-SAL-02',
        requisitoNombre: 'Primeros auxilios',
        materiales: 'Vendas, botiquín de primeros auxilios',
        instructor: 'María Castro'
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
        tags: ['Campismo', 'Navegación'],
        requisitoCodigo: 'EX-CAM-03',
        requisitoNombre: 'Uso de brújula y mapa',
        materiales: 'Brújulas, mapas de la zona local',
        instructor: 'Carlos Ruiz'
      }
    ]);
  }

  filtrarSesiones(): SesionItem[] {
    if (this.filtroClase() === 'TODAS') return this.sesiones();
    const targetId = this.filtroClase();
    const classInfo = this.clases.find(c => c.id === targetId);
    if (!classInfo) return this.sesiones();
    return this.sesiones().filter(s => s.claseId === targetId || s.clase === classInfo.nombre);
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

    const descObj = {
      descripcion: this.nuevaSesion.descripcion || '',
      materiales: this.nuevaSesion.materiales || '',
      requisitoCodigo: this.nuevaSesion.requisitoCodigo || '',
      requisitoNombre: this.nuevaSesion.requisitoNombre || '',
      instructor: this.nuevaSesion.instructor || ''
    };

    const payload: SesionBackend = {
      titulo: this.nuevaSesion.titulo || '',
      descripcion: JSON.stringify(descObj),
      duracionMinutos: this.nuevaSesion.duracion || 60,
      completada: false,
      idClase: this.nuevaSesion.claseId || 'clase-amigo',
      fecha: this.nuevaSesion.fecha || new Date().toISOString().split('T')[0]
    };

    this.sesionesService.guardarSesion(payload).subscribe({
      next: (res) => {
        this.cargarSesiones();
        this.showModal = false;
        this.resetNuevaSesion();
        Swal.fire({ icon: 'success', title: 'Sesión Guardada', timer: 1500, showConfirmButton: false });
      },
      error: () => {
        const classInfo = this.clases.find(c => c.id === this.nuevaSesion.claseId);
        const item: SesionItem = {
          id: `s-${Date.now()}`,
          titulo: this.nuevaSesion.titulo || '',
          descripcion: this.nuevaSesion.descripcion || '',
          clase: classInfo?.nombre || 'Amigo',
          claseId: this.nuevaSesion.claseId || 'clase-amigo',
          claseNombre: classInfo?.nombre || 'Amigo',
          claseColor: classInfo?.color || '#4caf50',
          duracion: this.nuevaSesion.duracion || 60,
          completada: false,
          estado: 'PROGRAMADA',
          tags: [],
          requisitoCodigo: this.nuevaSesion.requisitoCodigo || 'REGULAR',
          requisitoNombre: this.nuevaSesion.requisitoNombre || 'Reunión Regular',
          materiales: this.nuevaSesion.materiales || '',
          instructor: this.nuevaSesion.instructor || 'Instructor',
          fecha: this.nuevaSesion.fecha
        };
        this.sesiones.update(list => [...list, item]);
        this.showModal = false;
        this.resetNuevaSesion();
        Swal.fire({ icon: 'success', title: 'Sesión Guardada (Local)', timer: 1500, showConfirmButton: false });
      }
    });
  }

  private resetNuevaSesion(): void {
    this.nuevaSesion = {
      titulo: '',
      descripcion: '',
      clase: 'Amigo',
      claseId: 'clase-amigo',
      duracion: 60,
      completada: false,
      estado: 'PROGRAMADA',
      tags: [],
      requisitoCodigo: '',
      requisitoNombre: '',
      materiales: '',
      instructor: ''
    };
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
