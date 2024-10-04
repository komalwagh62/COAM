import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MapComponent } from './map/map.component';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { AuthGuard } from './guards/auth.guard';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SidenavComponent } from './sidenav/sidenav.component';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatMenuModule } from '@angular/material/menu';

import { MatToolbarModule } from '@angular/material/toolbar';
import { FooterComponent } from './shared/footer/footer.component';
import { LoginComponent } from './login/login.component';

import { LayoutModule } from '@angular/cdk/layout';
import { MapViewerComponent } from './map-viewer/map-viewer.component';
import { LeafletMapComponent } from './leaflet-map/leaflet-map.component';


@NgModule({
    declarations: [
        AppComponent,
        MapComponent,
        SidenavComponent,
        LoginComponent,
        FooterComponent,
        MapViewerComponent,
        LeafletMapComponent,
        
    ],
  
    imports: [
        BrowserModule,
        AppRoutingModule,
        MatSelectModule,
        MatFormFieldModule,
        MatInputModule,
        FormsModule,
        ReactiveFormsModule,
        BrowserAnimationsModule,
        MatAutocompleteModule,
        MatButtonModule,
        MatIconModule,
        MatToolbarModule,
        MatSidenavModule,
        MatListModule,
        MatMenuModule,
        LayoutModule,
        MatSidenavModule,
        RouterModule,
        CommonModule
        

    ],
    bootstrap: [AppComponent],
    providers: [AuthGuard, provideHttpClient(withInterceptorsFromDi())]
})
export class AppModule { }
