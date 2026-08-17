import { Component, OnInit, signal, computed } from '@angular/core';
import { MaterialesService } from '../../core/services/materiales.service';
import { AuthService } from '../../core/services/auth.service';
import { ClubService } from '../../core/services/club.service';
import { EspecialidadService } from '../../core/services/especialidad.service';
import Swal from 'sweetalert2';

export interface MaterialItem {
  id: string;
  titulo: string;
  descripcion: string;
  tipo: 'PDF' | 'WORD' | 'VIDEO' | 'ENLACE' | 'IMAGEN';
  formato: string;
  categoria: string;
  categoriaNombre: string;
  tamano: string;
  icono: string;
  color: string;
  url: string;
  descargas: number;
  fechaSubida: string;
}

@Component({
  selector: 'app-materiales',
  templateUrl: './materiales.component.html',
  standalone: false
})
export class MaterialesComponent implements OnInit {
  filtroCategoria = signal('TODOS');
  isLoading = signal(false);

  categorias = [
    { id: 'TODOS', nombre: 'Todos' },
    { id: 'CUADERNILLO', nombre: 'Cuadernillos' },
    { id: 'ESPECIALIDAD', nombre: 'Especialidades' },
    { id: 'HIMNO', nombre: 'Himnos' },
    { id: 'REGLAMENTO', nombre: 'Reglamentos' }
  ];

  materiales = signal<MaterialItem[]>([]);

  showSubirModal = false;
  clasesList = signal<any[]>([]);
  especialidadesList = signal<any[]>([]);
  
  nuevoMaterial = {
    tipo: 'PDF',
    urlOArchivo: '',
    idClase: null as string | null,
    idEspecialidad: null as string | null
  };

  currentUser = computed(() => this.authService.currentUser());
  canUploadMaterial = computed(() => {
    const rawRol = this.currentUser()?.rol;
    const role = typeof rawRol === 'string' ? rawRol : (rawRol as any)?.nombre;
    return ['ADMINISTRADOR', 'DIRECTOR', 'SECRETARIO', 'INSTRUCTOR'].includes(role || '');
  });

  constructor(
    private materialesService: MaterialesService,
    private authService: AuthService,
    private clubService: ClubService,
    private especialidadService: EspecialidadService
  ) {}

  ngOnInit(): void {
    this.cargarMateriales();
    if (this.canUploadMaterial()) {
      this.cargarClases();
      this.cargarEspecialidades();
    }
  }

  cargarMateriales(): void {
    this.isLoading.set(true);
    // Load materials for a common class as starting point
    this.materialesService.getMaterialesByClase('1').subscribe({
      next: (data) => {
        this.isLoading.set(false);
        if (data && data.length > 0) {
          const tipoIconos: Record<string, string> = {
            PDF: 'picture_as_pdf', WORD: 'description', VIDEO: 'play_circle',
            ENLACE: 'link', IMAGEN: 'image'
          };
          const tipoColores: Record<string, string> = {
            PDF: '#b7102a', WORD: '#00113a', VIDEO: '#7b1fa2',
            ENLACE: '#00838f', IMAGEN: '#2e7d32'
          };
          const items: MaterialItem[] = data.map(m => ({
            id: m.idMaterial || `mat-${Date.now()}`,
            titulo: `Material de ${m.tipo}`,
            descripcion: m.urlOArchivo,
            tipo: m.tipo as any,
            formato: m.tipo,
            categoria: 'CUADERNILLO',
            categoriaNombre: 'Cuadernillo',
            tamano: 'Desconocido',
            icono: tipoIconos[m.tipo] || 'folder',
            color: tipoColores[m.tipo] || '#00113a',
            url: m.urlOArchivo,
            descargas: 0,
            fechaSubida: 'Ago 2026'
          }));
          this.materiales.set(items);
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
    this.materiales.set([
      {
        id: 'm-1',
        titulo: 'Cuadernillo Amigo v2026',
        descripcion: 'Versión oficial del cuadernillo de clase Amigo con todos los requisitos actualizados.',
        tipo: 'PDF',
        formato: 'PDF',
        categoria: 'CUADERNILLO',
        categoriaNombre: 'Cuadernillo',
        tamano: '2.4 MB',
        icono: 'picture_as_pdf',
        color: '#b7102a',
        url: '#',
        descargas: 124,
        fechaSubida: 'Ene 2026'
      },
      {
        id: 'm-2',
        titulo: 'Cuadernillo Compañero v2026',
        descripcion: 'Cuadernillo actualizado de la clase Compañero con requisitos de práctica.',
        tipo: 'PDF',
        formato: 'PDF',
        categoria: 'CUADERNILLO',
        categoriaNombre: 'Cuadernillo',
        tamano: '2.8 MB',
        icono: 'picture_as_pdf',
        color: '#b7102a',
        url: '#',
        descargas: 98,
        fechaSubida: 'Ene 2026'
      },
      {
        id: 'm-3',
        titulo: 'Manual de Nudos y Amarras',
        descripcion: 'Guía visual con ilustraciones de los 20 nudos reglamentarios de la especialidad.',
        tipo: 'PDF',
        formato: 'PDF',
        categoria: 'ESPECIALIDAD',
        categoriaNombre: 'Especialidad',
        tamano: '1.9 MB',
        icono: 'picture_as_pdf',
        color: '#b7102a',
        url: '#',
        descargas: 87,
        fechaSubida: 'Feb 2026'
      },
      {
        id: 'm-4',
        titulo: 'Himnario Joven de Conquistadores',
        descripcion: 'Colección de 45 himnos para el programa devocional y ceremonias.',
        tipo: 'WORD',
        formato: 'WORD',
        categoria: 'HIMNO',
        categoriaNombre: 'Himno',
        tamano: '890 KB',
        icono: 'description',
        color: '#00113a',
        url: '#',
        descargas: 210,
        fechaSubida: 'Mar 2026'
      },
      {
        id: 'm-5',
        titulo: 'Reglamento Oficial Conquistadores 2025',
        descripcion: 'Normativa oficial de la IASD para el funcionamiento de clubes.',
        tipo: 'PDF',
        formato: 'PDF',
        categoria: 'REGLAMENTO',
        categoriaNombre: 'Reglamento',
        tamano: '3.2 MB',
        icono: 'picture_as_pdf',
        color: '#b7102a',
        url: '#',
        descargas: 156,
        fechaSubida: 'Abr 2026'
      },
      {
        id: 'm-6',
        titulo: 'Video: Campismo Básico',
        descripcion: 'Tutorial de armado de campamento, fogata y cocina al aire libre.',
        tipo: 'VIDEO',
        formato: 'VIDEO',
        categoria: 'ESPECIALIDAD',
        categoriaNombre: 'Especialidad',
        tamano: '48 MB',
        icono: 'play_circle',
        color: '#7b1fa2',
        url: '#',
        descargas: 63,
        fechaSubida: 'May 2026'
      }
    ]);
  }

  filtrarMateriales(): MaterialItem[] {
    if (this.filtroCategoria() === 'TODOS') return this.materiales();
    return this.materiales().filter(m => m.categoria === this.filtroCategoria());
  }

  descargar(item: MaterialItem): void {
    this.materiales.update(list =>
      list.map(m => m.id === item.id ? { ...m, descargas: m.descargas + 1 } : m)
    );
    if (item.url && item.url !== '#') {
      window.open(item.url, '_blank');
    }
  }

  cargarClases(): void {
    this.clubService.getClases().subscribe(data => this.clasesList.set(data));
  }

  cargarEspecialidades(): void {
    this.especialidadService.getEspecialidades().subscribe(data => this.especialidadesList.set(data));
  }

  subirMaterial(): void {
    if (!this.nuevoMaterial.urlOArchivo) {
      Swal.fire('Error', 'Debes ingresar la URL del archivo o recurso.', 'error');
      return;
    }
    if (!this.nuevoMaterial.idClase && !this.nuevoMaterial.idEspecialidad) {
      Swal.fire('Error', 'Debes seleccionar una Clase o una Especialidad para este recurso.', 'error');
      return;
    }

    const payload = {
      tipo: this.nuevoMaterial.tipo,
      urlOArchivo: this.nuevoMaterial.urlOArchivo,
      idClase: this.nuevoMaterial.idClase || undefined,
      idEspecialidad: this.nuevoMaterial.idEspecialidad || undefined
    };

    this.materialesService.guardarMaterial(payload).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Material Subido',
          text: 'El recurso ha sido guardado exitosamente.',
          timer: 1500,
          showConfirmButton: false
        });
        this.showSubirModal = false;
        this.nuevoMaterial = { tipo: 'PDF', urlOArchivo: '', idClase: null, idEspecialidad: null };
        this.cargarMateriales();
      },
      error: (err) => {
        Swal.fire('Error', 'No se pudo guardar el material.', 'error');
        console.error(err);
      }
    });
  }

  eliminarMaterial(id: string): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: "Este material se eliminará permanentemente de tu biblioteca.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#b7102a',
      cancelButtonColor: '#757682',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.materialesService.eliminarMaterial(id).subscribe({
          next: () => {
            Swal.fire('Eliminado', 'El material ha sido eliminado.', 'success');
            this.cargarMateriales();
          },
          error: (err) => Swal.fire('Error', 'No se pudo eliminar el material.', 'error')
        });
      }
    });
  }
}
