import { Component, OnInit, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PoaService } from '../../../core/services/poa.service';
import { AuthService } from '../../../core/services/auth.service';
import { Poa, ActividadPoa } from '../../../core/models/poa.model';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

// Responsables estándar del club
const RESPONSABLES_ESTANDAR = ['Jóvenes', 'Directiva', 'Director', 'Director Asociado', 'Secretario', 'Tesorero'];

@Component({
  selector: 'app-poa',
  templateUrl: './poa.component.html',
  standalone: false
})

export class PoaComponent implements OnInit {
  poas: Poa[] = [];
  selectedPoa: Poa | null = null;
  actividades: ActividadPoa[] = [];
  isLoading = false;
  filtroFecha = '';
  terminoBusqueda = '';

  get actividadesFiltradas(): ActividadPoa[] {
    let result = this.actividades;

    // 1. Filtrar por término de búsqueda (nombre)
    if (this.terminoBusqueda.trim()) {
      const term = this.terminoBusqueda.toLowerCase().trim();
      result = result.filter((act: ActividadPoa) => act.nombre && act.nombre.toLowerCase().includes(term));
    }

    // 2. Filtrar por fecha
    if (this.filtroFecha) {
      result = result.filter((act: ActividadPoa) => {
        if (!act.fecha) return false;
        const start = act.fecha;
        const end = act.fechaFin || act.fecha;
        return this.filtroFecha >= start && this.filtroFecha <= end;
      });
    }

    return result;
  }

  limpiarFiltroFecha(): void {
    this.filtroFecha = '';
  }

  // Forms
  activityForm: FormGroup;
  poaForm: FormGroup;
  plantillaForm: FormGroup;
  editForm!: FormGroup;

  // Modals visibility toggles
  showActivityModal = false;
  showPoaModal = false;
  showEditModal = false;
  showPlantillaModal = false;
  plantillaMode: 'recurrente' | 'vacia' = 'recurrente';
  isUploading = false;
  actividadEditando: ActividadPoa | null = null;

  // Multi-responsable
  responsablesSeleccionados: string[] = [];
  nuevoResponsable = '';
  responsablesExtra: string[] = [];    // añadidos manualmente en sesión
  responsablesOcultos: string[] = [];  // no-estándar ocultados por el usuario

  get getActividadesCompletadasCount(): number {
    const hoyStr = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
    return this.actividades.filter(act => act.fecha && act.fecha <= hoyStr).length;
  }

  get getPorcentajeAvance(): number {
    if (this.actividades.length === 0) return 0;
    return Math.round((this.getActividadesCompletadasCount / this.actividades.length) * 100);
  }

  get responsablesDelPoa(): string[] {
    const todos = this.actividades
      .flatMap(a => (a.responsable || '').split(',').map(r => r.trim()))
      .filter(r => r && r !== 'Sin asignar');
    return [...new Set(todos)];
  }

  get responsablesDisponibles(): string[] {
    const combinados = [
      ...RESPONSABLES_ESTANDAR,
      ...this.responsablesDelPoa,
      ...this.responsablesExtra
    ];
    // Excluir los ocultos (solo aplica a no-estándar)
    return [...new Set(combinados)].filter(r => !this.responsablesOcultos.includes(r));
  }

  /** Devuelve true si el responsable NO es parte de los estándar por defecto */
  isResponsableExtra(r: string): boolean {
    return !RESPONSABLES_ESTANDAR.includes(r);
  }

  // Permission helper using auth signals
  currentUser = computed(() => this.authService.currentUser());
  canManagePoa = computed(() => {
    const rawRol = this.currentUser()?.rol;
    const role = typeof rawRol === 'string' ? rawRol : (rawRol as any)?.nombre;
    return role === 'ADMINISTRADOR' || role === 'DIRECTOR' || role === 'SECRETARIO' || role === 'DIRECTOR_ASOCIADO';
  });

  constructor(
    private poaService: PoaService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.activityForm = this.fb.group({
      nombre: ['', [Validators.required]],
      fecha: ['', [Validators.required]],
      fechaFin: [''],
      ambito: ['CLUB', [Validators.required]],
      lugar: [''],
      responsable: [''] // manejado por responsablesSeleccionados
    });

    const defaultYear = new Date().getFullYear() + 1;
    this.poaForm = this.fb.group({
      anio: [defaultYear, [Validators.required, Validators.min(2020), Validators.max(2100)]]
    });

    this.plantillaForm = this.fb.group({
      anio: [defaultYear, [Validators.required, Validators.min(2020), Validators.max(2100)]],
      fechaApertura: [this.getFirstSaturdayOfMarch(defaultYear), [Validators.required]],
      fechaClausura: [this.getLastSaturdayOfNovember(defaultYear), [Validators.required]]
    });

    this.plantillaForm.get('anio')?.valueChanges.subscribe(year => {
      if (year && year >= 2020 && year <= 2100) {
        this.plantillaForm.patchValue({
          fechaApertura: this.getFirstSaturdayOfMarch(Number(year)),
          fechaClausura: this.getLastSaturdayOfNovember(Number(year))
        }, { emitEvent: false });
      }
    });

    this.editForm = this.fb.group({
      nombre: ['', [Validators.required]],
      fecha: ['', [Validators.required]],
      fechaFin: [''],
      ambito: ['CLUB', [Validators.required]],
      lugar: [''],
      responsable: [''] // manejado por responsablesSeleccionados
    });
  }

  ngOnInit(): void {
    this.loadPoas();
  }

  loadPoas(): void {
    const clubId = this.currentUser()?.idClub?.toString() || '1';
    this.isLoading = true;
    this.poaService.getPoasByClub(clubId).subscribe({
      next: (poas) => {
        this.poas = poas;
        // Select active or latest POA
        const active = poas.find(p => p.estado === 'ACTIVO') || poas[0];
        if (active) {
          this.selectPoa(active);
        } else {
          this.isLoading = false;
        }
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  selectPoa(poa: Poa): void {
    this.selectedPoa = poa;
    this.isLoading = true;
    this.poaService.getActividades(poa.idPoa).subscribe({
      next: (acts) => {
        this.actividades = (acts || []).sort((a, b) => {
          if (!a.fecha) return 1;
          if (!b.fecha) return -1;
          return a.fecha.localeCompare(b.fecha);
        });
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  // ── Multi-responsable helpers ─────────────────────────────────────────────
  toggleResponsable(r: string): void {
    const idx = this.responsablesSeleccionados.indexOf(r);
    if (idx >= 0) {
      this.responsablesSeleccionados.splice(idx, 1);
    } else {
      this.responsablesSeleccionados.push(r);
    }
  }

  isResponsableSelected(r: string): boolean {
    return this.responsablesSeleccionados.includes(r);
  }

  addNuevoResponsable(): void {
    const raw = this.nuevoResponsable.trim();
    if (!raw) return;
    
    const val = raw;
    if (!this.responsablesDisponibles.includes(val)) {
      this.responsablesExtra.push(val);
    }
    if (!this.responsablesSeleccionados.includes(val)) {
      this.responsablesSeleccionados.push(val);
    }
    this.nuevoResponsable = '';
  }

  removeResponsableExtra(r: string): void {
    // Quitar de extras de sesión (si fue añadido en esta sesión)
    this.responsablesExtra = this.responsablesExtra.filter(e => e !== r);
    // Ocultar del listado para esta sesión (aplica a los del POA también)
    if (!this.responsablesOcultos.includes(r)) {
      this.responsablesOcultos.push(r);
    }
    // Deseleccionar si estaba seleccionado
    this.responsablesSeleccionados = this.responsablesSeleccionados.filter(s => s !== r);
  }

  // ── POA Modal ──────────────────────────────────────────────────────────────
  openNewPoaModal(): void {
    const nextYear = new Date().getFullYear() + 1;
    this.poaForm.patchValue({ anio: nextYear });
    this.showPoaModal = true;
  }

  closeNewPoaModal(): void {
    this.showPoaModal = false;
    const nextYear = new Date().getFullYear() + 1;
    this.poaForm.reset({ anio: nextYear });
  }

  onCreatePoa(): void {
    if (this.poaForm.invalid) return;
    const { anio } = this.poaForm.value;

    const existente = this.poas.find(p => p.anio === anio);
    if (existente) {
      this.closeNewPoaModal();
      Swal.fire({
        title: 'POA Existente',
        text: `Ya existe un Plan Operativo Anual para el año ${anio}.`,
        icon: 'warning',
        background: '#111827',
        color: '#f3f4f6'
      });
      this.selectPoa(existente);
      return;
    }

    const clubId = this.currentUser()?.idClub?.toString() || '1';

    this.poaService.inicializarPoa(clubId, anio).subscribe({
      next: () => {
        this.closeNewPoaModal();
        Swal.fire({
          title: 'POA Inicializado',
          text: `El Plan Operativo Anual para el año ${anio} ha sido creado. Ahora puedes generar una plantilla o importar actividades.`,
          icon: 'success',
          background: '#111827',
          color: '#f3f4f6'
        });
        this.loadPoas();
      },
      error: (err) => {
        Swal.fire({
          title: 'Error',
          text: err?.error?.error || err?.error?.mensaje || 'No se pudo crear el POA. Intenta de nuevo.',
          icon: 'error',
          background: '#111827',
          color: '#f3f4f6'
        });
      }
    });
  }

  generarReunionesRegulares(fechaApertura: string, fechaClausura: string): any[] {
    const actividades: any[] = [];
    
    // Agregar Apertura y Clausura explícitamente
    actividades.push({
      nombre: 'Apertura de Actividades',
      fecha: fechaApertura,
      ambito: 'CLUB',
      lugar: 'Club Local',
      responsable: 'Directiva'
    });

    actividades.push({
      nombre: 'Clausura de Actividades',
      fecha: fechaClausura,
      ambito: 'CLUB',
      lugar: 'Club Local',
      responsable: 'Directiva'
    });

    const fechaInicio = new Date(fechaApertura + 'T00:00:00');
    const fechaFin = new Date(fechaClausura + 'T00:00:00');
    const anio = fechaInicio.getFullYear();
    
    // Para calcular Día de la Madre (2do domingo de Mayo)
    // Mayo es mes 4 (0-indexed)
    let segundoDomingoMayo: string | null = null;
    let domingosMayoCount = 0;
    for (let d = 1; d <= 31; d++) {
      const tempDate = new Date(anio, 4, d);
      if (tempDate.getDay() === 0) { // 0 = Domingo
        domingosMayoCount++;
        if (domingosMayoCount === 2) {
          const diaStr = String(d).padStart(2, '0');
          segundoDomingoMayo = `${anio}-05-${diaStr}`;
          break;
        }
      }
    }

    // Para calcular Día del Padre (3er domingo de Junio)
    // Junio es mes 5 (0-indexed)
    let tercerDomingoJunio: string | null = null;
    let domingosJunioCount = 0;
    for (let d = 1; d <= 30; d++) {
      const tempDate = new Date(anio, 5, d);
      if (tempDate.getDay() === 0) {
        domingosJunioCount++;
        if (domingosJunioCount === 3) {
          const diaStr = String(d).padStart(2, '0');
          tercerDomingoJunio = `${anio}-06-${diaStr}`;
          break;
        }
      }
    }

    // Agrupamos domingos por mes para poder saltear el último domingo de cada mes
    const domingosPorMes: { [key: number]: string[] } = {};
    for (let m = 0; m <= 11; m++) {
      domingosPorMes[m] = [];
    }

    // Primero identificamos todos los sábados y domingos en el rango
    let current = new Date(fechaInicio);
    while (current <= fechaFin) {
      const dayOfWeek = current.getDay();
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      const fechaStr = `${y}-${m}-${d}`;

      // Skip regular meetings if the date is exactly the Apertura or Clausura date
      if (fechaStr !== fechaApertura && fechaStr !== fechaClausura) {
        if (dayOfWeek === 6) { // Sábado
          actividades.push({
            nombre: 'Reunión Regular - Sábado',
            fecha: fechaStr,
            ambito: 'RECURRENTE',
            lugar: 'Club Local',
            responsable: 'Directiva'
          });
        } else if (dayOfWeek === 0) { // Domingo
          const monthIdx = current.getMonth();
          domingosPorMes[monthIdx].push(fechaStr);
        }
      }
      
      current.setDate(current.getDate() + 1);
    }

    // Procesamos los domingos aplicando las reglas
    for (let m = 0; m <= 11; m++) {
      const domingos = domingosPorMes[m];
      if (domingos.length === 0) continue;
      
      // Encontrar el VERDADERO último domingo del mes (independientemente del rango seleccionado)
      const ultimoDiaMes = new Date(anio, m + 1, 0);
      let tempUltimoDomingo = new Date(ultimoDiaMes);
      while (tempUltimoDomingo.getDay() !== 0) {
        tempUltimoDomingo.setDate(tempUltimoDomingo.getDate() - 1);
      }
      const yStr = tempUltimoDomingo.getFullYear();
      const mStr = String(tempUltimoDomingo.getMonth() + 1).padStart(2, '0');
      const dStr = String(tempUltimoDomingo.getDate()).padStart(2, '0');
      const ultimoDomingoRealStr = `${yStr}-${mStr}-${dStr}`;
      
      domingos.forEach(domingoStr => {
        // Excluir el último domingo real de cada mes
        if (domingoStr === ultimoDomingoRealStr) {
          return;
        }
        // Excluir Día de la Madre en Perú
        if (domingoStr === segundoDomingoMayo) {
          return;
        }
        // Excluir Día del Padre en Perú
        if (domingoStr === tercerDomingoJunio) {
          return;
        }

        actividades.push({
          nombre: 'Reunión Regular - Domingo',
          fecha: domingoStr,
          ambito: 'RECURRENTE',
          lugar: 'Club Local',
          responsable: 'Directiva'
        });
      });
    }

    // Ordenar por fecha
    actividades.sort((a, b) => a.fecha.localeCompare(b.fecha));
    return actividades;
  }

  // ── Plantilla POA Modal ────────────────────────────────────────────────────
  openPlantillaModal(): void {
    const year = this.selectedPoa?.anio || new Date().getFullYear() + 1;
    this.plantillaForm.patchValue({
      anio: year,
      fechaApertura: this.getFirstSaturdayOfMarch(year),
      fechaClausura: this.getLastSaturdayOfNovember(year)
    });
    this.plantillaMode = 'recurrente';
    this.showPlantillaModal = true;
  }

  closePlantillaModal(): void {
    this.showPlantillaModal = false;
  }

  onDescargarPlantilla(): void {
    if (this.plantillaForm.invalid) return;
    const { anio, fechaApertura, fechaClausura } = this.plantillaForm.value;

    let datos: any[] = [];
    if (this.plantillaMode === 'recurrente') {
      const reuniones = this.generarReunionesRegulares(fechaApertura, fechaClausura);
      datos = reuniones.map(r => ({
        'Fecha': r.fecha,
        'Actividad': r.nombre,
        'Lugar': r.lugar || '',
        'Ambito': r.ambito || '',
        'Responsable': r.responsable || ''
      }));
    }

    // Si está vacío, agregar al menos una fila vacía para que se vean los encabezados
    if (datos.length === 0) {
      datos = [{
        'Fecha': '',
        'Actividad': '',
        'Lugar': '',
        'Ambito': '',
        'Responsable': ''
      }];
    }

    const ws = XLSX.utils.json_to_sheet(datos);

    // Ajustar anchos de columna
    ws['!cols'] = [
      { wch: 14 }, // Fecha
      { wch: 40 }, // Actividad
      { wch: 25 }, // Lugar
      { wch: 15 }, // Ámbito
      { wch: 25 }, // Responsable
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'POA');
    XLSX.writeFile(wb, `Plantilla-POA-${anio}.xlsx`);

    this.closePlantillaModal();
    Swal.fire({
      title: 'Plantilla descargada',
      text: `Se ha descargado la plantilla del POA ${anio}. Complétala y luego impórtala con el botón "Importar Excel".`,
      icon: 'success',
      background: '#111827',
      color: '#f3f4f6'
    });
  }

  openActivityModal(): void {
    this.responsablesSeleccionados = [];
    this.responsablesOcultos = [];
    this.nuevoResponsable = '';
    this.showActivityModal = true;
  }

  closeActivityModal(): void {
    this.showActivityModal = false;
    this.responsablesSeleccionados = [];
    this.responsablesOcultos = [];
    this.nuevoResponsable = '';
    this.activityForm.reset({ ambito: 'CLUB', lugar: '', responsable: '', nombre: '', fecha: '', fechaFin: '' });
  }

  onAddActivity(): void {
    if (this.activityForm.invalid || !this.selectedPoa) return;
    if (this.responsablesSeleccionados.length === 0) return;

    const val = this.activityForm.value;
    const payload = {
      ...val,
      fechaFin: val.fechaFin ? val.fechaFin : null,
      responsable: this.responsablesSeleccionados.join(', ')
    };

    this.poaService.addActividad(this.selectedPoa.idPoa, payload).subscribe({
      next: () => {
        this.closeActivityModal();
        Swal.fire({
          title: 'Actividad Agregada',
          text: 'La actividad se ha planificado con éxito.',
          icon: 'success',
          background: '#111827',
          color: '#f3f4f6'
        });
        this.selectPoa(this.selectedPoa!);
      }
    });
  }

  openEditModal(actividad: ActividadPoa): void {
    this.actividadEditando = actividad;
    // Pre-poblar chips con los responsables guardados
    this.responsablesSeleccionados = (actividad.responsable || '')
      .split(',')
      .map(r => r.trim())
      .filter(r => r && r !== 'Sin asignar');
    this.responsablesOcultos = [];
    this.nuevoResponsable = '';
    this.editForm.setValue({
      nombre: actividad.nombre ?? '',
      fecha: actividad.fecha ?? '',
      fechaFin: actividad.fechaFin ?? '',
      ambito: actividad.ambito ?? 'CLUB',
      lugar: actividad.lugar ?? '',
      responsable: actividad.responsable ?? ''
    });
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.actividadEditando = null;
    this.responsablesSeleccionados = [];
    this.responsablesOcultos = [];
    this.nuevoResponsable = '';
    this.editForm.reset({ ambito: 'CLUB', fechaFin: '' });
  }

  onGuardarEdicion(): void {
    if (this.editForm.invalid || !this.actividadEditando?.idActividad) return;
    if (this.responsablesSeleccionados.length === 0) return;
    const id = this.actividadEditando.idActividad;
    const val = this.editForm.value;
    const payload = {
      ...val,
      fechaFin: val.fechaFin ? val.fechaFin : null,
      responsable: this.responsablesSeleccionados.join(', ')
    };
    this.poaService.actualizarActividad(id, payload).subscribe({
      next: () => {
        this.closeEditModal();
        Swal.fire({
          title: 'Actividad actualizada',
          text: 'Los datos de la actividad se guardaron correctamente.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          background: '#111827',
          color: '#f3f4f6'
        });
        this.selectPoa(this.selectedPoa!);
      },
      error: () => {
        Swal.fire({
          title: 'Error al guardar',
          text: 'No se pudo actualizar la actividad. Intenta de nuevo.',
          icon: 'error',
          background: '#111827',
          color: '#f3f4f6'
        });
      }
    });
  }

  onExcelFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length || !this.selectedPoa) return;
    const file = input.files[0];
    // Reset input so the same file can be re-uploaded if needed
    input.value = '';

    this.isUploading = true;
    Swal.fire({
      title: 'Importando actividades…',
      text: 'Por favor espera.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
      background: '#111827',
      color: '#f3f4f6'
    });

    this.poaService.importarExcel(this.selectedPoa.idPoa, file).subscribe({
      next: (res) => {
        this.isUploading = false;
        Swal.fire({
          title: '¡Importación exitosa!',
          text: `Se importaron ${res.totalImportadas} actividad(es) correctamente.`,
          icon: 'success',
          background: '#111827',
          color: '#f3f4f6'
        });
        this.selectPoa(this.selectedPoa!);
      },
      error: (err) => {
        this.isUploading = false;
        Swal.fire({
          title: 'Error al importar',
          text: err?.error?.error || 'Verifica que el archivo sea un Excel válido con el formato correcto.',
          icon: 'error',
          background: '#111827',
          color: '#f3f4f6'
        });
      }
    });
  }

  onEliminarActividad(actividad: ActividadPoa): void {
    Swal.fire({
      title: '¿Eliminar actividad?',
      html: `<span class="font-semibold">${actividad.nombre}</span> será eliminada permanentemente del POA.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#b7102a',
      background: '#111827',
      color: '#f3f4f6'
    }).then(result => {
      if (!result.isConfirmed || !actividad.idActividad) return;
      this.poaService.eliminarActividad(actividad.idActividad).subscribe({
        next: () => {
          Swal.fire({
            title: 'Actividad eliminada',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            background: '#111827',
            color: '#f3f4f6'
          });
          this.selectPoa(this.selectedPoa!);
        },
        error: () => {
          Swal.fire({
            title: 'Error al eliminar',
            text: 'No se pudo eliminar la actividad. Intenta de nuevo.',
            icon: 'error',
            background: '#111827',
            color: '#f3f4f6'
          });
        }
      });
    });
  }

  onExportarExcel(): void {
    if (!this.selectedPoa) return;
    this.poaService.exportarExcel(this.selectedPoa.idPoa).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `POA-${this.selectedPoa!.anio}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        Swal.fire({
          title: 'Error al exportar',
          text: 'No se pudo generar el archivo Excel.',
          icon: 'error',
          background: '#111827',
          color: '#f3f4f6'
        });
      }
    });
  }

  private getFirstSaturdayOfMarch(year: number): string {
    for (let day = 1; day <= 7; day++) {
      const d = new Date(year, 2, day);
      if (d.getDay() === 6) {
        return `${year}-03-${String(day).padStart(2, '0')}`;
      }
    }
    return `${year}-03-07`;
  }

  private getLastSaturdayOfNovember(year: number): string {
    for (let day = 30; day >= 24; day--) {
      const d = new Date(year, 10, day);
      if (d.getDay() === 6) {
        return `${year}-11-${String(day).padStart(2, '0')}`;
      }
    }
    return `${year}-11-28`;
  }
}
