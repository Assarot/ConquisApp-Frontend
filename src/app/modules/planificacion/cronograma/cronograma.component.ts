import { Component, OnInit, signal } from '@angular/core';
import { CronogramaService, BloqueCronogramaBackend } from '../../../core/services/cronograma.service';
import Swal from 'sweetalert2';

export interface BloqueHorario {
  id: string;
  horaInicio: string;
  horaFin: string;
  titulo: string;
  descripcion: string;
  tipo: 'CEREMONIA' | 'DEVOCIONAL' | 'CLASE' | 'RINCON' | 'JUEGOS' | 'CIERRE';
  icono: string;
  color: string;
  responsable: string;
}

@Component({
  selector: 'app-cronograma',
  templateUrl: './cronograma.component.html',
  standalone: false
})
export class CronogramaComponent implements OnInit {
  fechaReunion = signal('Sábado, 15 de Agosto 2026');
  lugarReunion = signal('Patio Principal y Aulas');
  showAddModal = false;
  isLoading = signal(false);

  nuevoBloque: Partial<BloqueHorario> = {
    horaInicio: '16:00',
    horaFin: '16:30',
    titulo: '',
    descripcion: '',
    tipo: 'CLASE',
    responsable: ''
  };

  bloques = signal<BloqueHorario[]>([]);

  constructor(private cronogramaService: CronogramaService) {}

  ngOnInit(): void {
    this.cargarBloques();
  }

  cargarBloques(): void {
    this.isLoading.set(true);
    this.cronogramaService.getBloques().subscribe({
      next: (data) => {
        this.isLoading.set(false);
        if (data && data.length > 0) {
          const items: BloqueHorario[] = data.map(b => ({
            id: b.idBloque || `b-${Date.now()}`,
            horaInicio: b.horaInicio,
            horaFin: b.horaFin,
            titulo: b.titulo,
            descripcion: b.descripcion,
            tipo: (b.tipo as any) || 'CLASE',
            icono: b.icono || 'schedule',
            color: b.color || '#00113a',
            responsable: b.responsable || 'Líder'
          }));
          this.bloques.set(items);
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
    this.bloques.set([
      {
        id: 'b-1',
        horaInicio: '14:00',
        horaFin: '14:15',
        titulo: 'Ceremonia de Apertura',
        descripcion: 'Izamiento de banderas, ideología de conquistadores y oración inicial.',
        tipo: 'CEREMONIA',
        icono: 'flag',
        color: '#00113a',
        responsable: 'Director y Capellán'
      },
      {
        id: 'b-2',
        horaInicio: '14:15',
        horaFin: '14:45',
        titulo: 'Devocional Espiritual',
        descripcion: 'Reflexión espiritual: "Fieles en la Tormenta" y alabanzas.',
        tipo: 'DEVOCIONAL',
        icono: 'menu_book',
        color: '#b7102a',
        responsable: 'Pastor / Anciano de Jóvenes'
      },
      {
        id: 'b-3',
        horaInicio: '14:45',
        horaFin: '15:45',
        titulo: 'Instrucción de Clases Regulares',
        descripcion: 'Trabajo práctico en cuadernillos: Amigo, Compañero, Explorador y Guía.',
        tipo: 'CLASE',
        icono: 'school',
        color: '#ffba27',
        responsable: 'Instructores de Clase'
      },
      {
        id: 'b-4',
        horaInicio: '15:45',
        horaFin: '16:30',
        titulo: 'Rincón de Unidad y Pase de Lista',
        descripcion: 'Revisión de cuotas, pañoleta, uniforme y preparación para camporee.',
        tipo: 'RINCON',
        icono: 'group_work',
        color: '#2e7d32',
        responsable: 'Consejeros de Unidad'
      },
      {
        id: 'b-5',
        horaInicio: '16:30',
        horaFin: '17:15',
        titulo: 'Juegos y Orden Cerrado',
        descripcion: 'Dinámicas de campismo y práctica de marchas por unidades.',
        tipo: 'JUEGOS',
        icono: 'sports_kabaddi',
        color: '#7b1fa2',
        responsable: 'Capitán de Juegos'
      },
      {
        id: 'b-6',
        horaInicio: '17:15',
        horaFin: '17:30',
        titulo: 'Clausura y Anuncios',
        descripcion: 'Arriamiento del pabellón, oración final y despedida.',
        tipo: 'CIERRE',
        icono: 'verified',
        color: '#455a64',
        responsable: 'Secretario y Director'
      }
    ]);
  }

  agregarBloque(): void {
    if (!this.nuevoBloque.titulo || !this.nuevoBloque.horaInicio) {
      Swal.fire('Campos Requeridos', 'Por favor ingresa al menos el título y horario del bloque', 'warning');
      return;
    }

    const iconoMap: Record<string, string> = {
      CEREMONIA: 'flag',
      DEVOCIONAL: 'menu_book',
      CLASE: 'school',
      RINCON: 'group_work',
      JUEGOS: 'sports_kabaddi',
      CIERRE: 'verified'
    };

    const colorMap: Record<string, string> = {
      CEREMONIA: '#00113a',
      DEVOCIONAL: '#b7102a',
      CLASE: '#ffba27',
      RINCON: '#2e7d32',
      JUEGOS: '#7b1fa2',
      CIERRE: '#455a64'
    };

    const tipo = this.nuevoBloque.tipo || 'CLASE';

    const nuevo: BloqueHorario = {
      id: `b-${Date.now()}`,
      horaInicio: this.nuevoBloque.horaInicio || '16:00',
      horaFin: this.nuevoBloque.horaFin || '16:30',
      titulo: this.nuevoBloque.titulo || '',
      descripcion: this.nuevoBloque.descripcion || '',
      tipo: tipo,
      icono: iconoMap[tipo] || 'schedule',
      color: colorMap[tipo] || '#00113a',
      responsable: this.nuevoBloque.responsable || 'Equipo de Líderes'
    };

    const payload: BloqueCronogramaBackend = {
      horaInicio: nuevo.horaInicio,
      horaFin: nuevo.horaFin,
      titulo: nuevo.titulo,
      descripcion: nuevo.descripcion,
      tipo: nuevo.tipo,
      icono: nuevo.icono,
      color: nuevo.color,
      responsable: nuevo.responsable
    };

    this.cronogramaService.registrarBloque('cronograma-default', payload).subscribe({
      next: (res) => {
        if (res.idBloque) nuevo.id = res.idBloque;
        this.bloques.update(list => [...list, nuevo]);
      },
      error: () => {
        this.bloques.update(list => [...list, nuevo]);
      }
    });

    this.showAddModal = false;
    this.nuevoBloque = {
      horaInicio: '16:00',
      horaFin: '16:30',
      titulo: '',
      descripcion: '',
      tipo: 'CLASE',
      responsable: ''
    };

    Swal.fire({
      icon: 'success',
      title: 'Bloque Guardado',
      text: 'El bloque ha sido guardado en la base de datos.',
      timer: 1500,
      showConfirmButton: false
    });
  }

  eliminarBloque(id: string): void {
    this.cronogramaService.eliminarBloque(id).subscribe({
      next: () => {
        this.bloques.update(list => list.filter(b => b.id !== id));
      },
      error: () => {
        this.bloques.update(list => list.filter(b => b.id !== id));
      }
    });
  }
}
