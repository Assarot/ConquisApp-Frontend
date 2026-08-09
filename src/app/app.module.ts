import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// Auth
import { LoginComponent } from './modules/auth/login/login.component';
import { RegisterComponent } from './modules/auth/register/register.component';

// Layout
import { DashboardLayoutComponent } from './modules/layout/dashboard-layout/dashboard-layout.component';

// Dashboard screens
import { DashboardHomeComponent } from './modules/dashboard/home/dashboard-home.component';
import { PoaComponent } from './modules/dashboard/poa/poa.component';

// Members
import { MiembrosListComponent } from './modules/miembros/miembros-list/miembros-list.component';

// Units
import { UnidadesListComponent } from './modules/unidades/unidades-list/unidades-list.component';

// Clases / Sessions
import { ClaseDetalleComponent } from './modules/clases/clase-detalle/clase-detalle.component';

// Planning
import { CronogramaComponent } from './modules/planificacion/cronograma/cronograma.component';
import { SesionesComponent } from './modules/planificacion/sesiones/sesiones.component';
import { CalendarioComponent } from './modules/planificacion/calendario/calendario.component';

// Specialties
import { EspecialidadesComponent } from './modules/especialidades/especialidades.component';

// Attendance / Progress
import { AsistenciaComponent } from './modules/avances/asistencia/asistencia.component';

// Reports & Materials
import { ReportesComponent } from './modules/reportes/reportes.component';
import { MaterialesComponent } from './modules/materiales/materiales.component';

// Ranking & Admin
import { RankingComponent } from './modules/ranking/ranking.component';
import { AdminComponent } from './modules/admin/admin.component';

// Interceptor
import { JwtInterceptor } from './core/interceptors/jwt.interceptor';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,
    DashboardLayoutComponent,
    DashboardHomeComponent,
    PoaComponent,
    MiembrosListComponent,
    UnidadesListComponent,
    ClaseDetalleComponent,
    CronogramaComponent,
    SesionesComponent,
    CalendarioComponent,
    EspecialidadesComponent,
    AsistenciaComponent,
    ReportesComponent,
    MaterialesComponent,
    RankingComponent,
    AdminComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: JwtInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
