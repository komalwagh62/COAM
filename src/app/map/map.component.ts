import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MediaMatcher } from '@angular/cdk/layout';
import { ChangeDetectorRef, OnDestroy } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet-rotatedmarker';
import { AuthService } from '../Service/auth.service';
import { Router } from '@angular/router';
import { StreamServiceService } from '../Service/stream-service.service';
import { Flight, Plane } from '../target';
import { Subscription } from 'rxjs';

declare module 'leaflet' {
  interface MarkerOptions {
    rotationAngle?: number;
    transform?: number;
  }
}
@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {
  hasUnsavedChanges() {
    throw new Error('Method not implemented.');
  }
  filterPopupVisible = false; // Controls the visibility of the filter popup
  selectedType: string = 'Conv'; // Default type (Conventional)
  airspaceOptions: string[] = ['Class A', 'Class B', 'Class C', 'Class D', 'Class E'];
  Airform !: FormGroup;
  selectedAirport: string[] = [];
  selectedRunway: string[] = [];
  selectedTypeofProcedure: string[] = [];
  selectedProcedureName: string[] = [];
  private markers: { [key: string]: L.Marker } = {};
  lineGeoJsonLayer!: L.GeoJSON;
  geoJsonLayer!: L.GeoJSON;
  map!: L.Map;
  airportLayerGroup!: any;
  selectedAirwayId: string = '';
  selectwaypoint: string = '';
  [key: string]: any; // Allows dynamic properties

  // Existing properties and methods



  // http://10.98.10.103:8080/geoserver/web

  // wmsUrl = "http://localhost:8080/geoserver/wms"
  wmsUrl = 'http://10.98.11.77:8080/geoserver/wms';
  private waypointLayer!: L.TileLayer.WMS;
  private nonConvLineDataLayer!: L.TileLayer.WMS;
  private convLineDataLayer!: L.TileLayer.WMS;
  private navaidsLayer!: L.TileLayer.WMS;
  private controlairspaceLayer!: L.TileLayer.WMS;
  private aerodrome_obstacleLayer!: L.TileLayer.WMS;
  private restricted_areasLayer!: L.TileLayer.WMS;
  private airportdetails!: L.TileLayer.WMS;
  private Airway2!: L.TileLayer.WMS;
  private thailandenroute!: L.TileLayer.WMS;
  private FIR!: L.TileLayer.WMS;
  private India_FIR!: L.TileLayer.WMS;
  private subscription: Subscription | null = null;
  menuOpen: boolean = false;
  flightslive: Flight[] = [];
  flights: Plane[] = [];
  mode: 'static' | 'animation' = 'static';
  animationIndex: number = 0;
  animationInterval: any;
  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  menuClosed() {
    this.menuOpen = false;
  }

  stopPropagation(event: Event) {
    event.stopPropagation();
  }




  optionsAirport: { value: any; label: any; }[] = [
    { value: 'VOBL/Bengaluru (KIA)', label: 'VOBL/BLR/Bengaluru' },
    { value: 'VEPY/PAKYONG', label: 'VEPY/PYG/Pakyong' },
    { value: 'VIJP/JAIPUR', label: 'VIJP/JAI/Jaipur' },];
  optionsBengaluruKIARunway: { value: any; label: any; }[] = [];
  optionsVIJPJAIPURRunway: { value: any; label: any; }[] = [];
  optionsVEPYPAKYONGRunway: { value: any; label: any; }[] = [];
  optionsRWY_09TypeofProcedure: { value: any; label: any; }[] = [];
  optionsRWY_27TypeofProcedure: { value: any; label: any; }[] = [];
  optionsRWY_02TypeofProcedure: { value: any; label: any; }[] = [];
  optionsRWY_20TypeofProcedure: { value: any; label: any; }[] = [];
  optionsRWY_09LTypeofProcedure: { value: any; label: any; }[] = [];
  optionsRWY_27RTypeofProcedure: { value: any; label: any; }[] = [];
  optionsVEPYTypeofProcedure: { value: any; label: any; }[] = [];
  optionsProcedureName: { value: any; label: any; }[] = [];

  isSidenavOpen = true;

  toggleSidenav(snav: any) {
    snav.toggle();
    this.isSidenavOpen = !this.isSidenavOpen;
  }

  mobileQuery!: MediaQueryList;

  fillerNav = ['Home', 'Login', 'Join Us'].concat(Array.from({ length: 0 }, (_, i) => ` ${i + 1}`));


  private _mobileQueryListener: () => void;
  isExpanded = false;
  searchQuery = '';

  toggleSearchBar() {
    this.isExpanded = !this.isExpanded;
    if (this.isExpanded) {
      setTimeout(() => {
        const searchInput = document.getElementById('site-search');
        if (searchInput) {
          searchInput.focus();
        }
      }, 0);
    }
  }
  constructor(changeDetectorRef: ChangeDetectorRef, private flightService: StreamServiceService, media: MediaMatcher, private formbuilder: FormBuilder, private authService: AuthService, private router: Router) {
    this.mobileQuery = media.matchMedia('(max-width: 600px)');
    this._mobileQueryListener = () => changeDetectorRef.detectChanges();
    this.mobileQuery.addListener(this._mobileQueryListener);
  }

  ngOnInit(): void {
    this.Airform = this.formbuilder.group({
      selectedAirport: [[]],
      selectedRunway: [[]],
      selectedTypeofProcedure: [[]],
      selectedProcedureName: [[]],
    });
    this.initMap();
    this.watchAirportChanges();

  }

  fetchFlightData(): void {
    this.flightService.getLiveFlights().subscribe(
      (data: Flight[]) => {
        this.flightslive = data;
        this.updateFlightMarkers();
      },
      error => {
        console.error('Error fetching flight data', error);
      }
    );
  }

  private updateFlightMarkers(): void {
    this.flightslive.forEach(flight => {
      const planeSVG = `
        <svg height="20" width="20" style="transition: transform 0.5s ease; transform: rotate(${flight.heading}deg); transform-origin: center; background: none; border: none;" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 46.876 46.876" xml:space="preserve" fill="#000000" stroke="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <path style="fill:#e3b021;" d="M26.602,24.568l15.401,6.072l-0.389-4.902c-10.271-7.182-9.066-6.481-14.984-10.615V2.681 c0-1.809-1.604-2.701-3.191-2.681c-1.587-0.021-3.19,0.872-3.19,2.681v12.44c-5.918,4.134-4.714,3.434-14.985,10.615l-0.39,4.903 l15.401-6.072c0,0-0.042,15.343-0.006,15.581l-5.511,3.771v2.957l7.044-2.427h3.271l7.046,2.427V43.92l-5.513-3.771 C26.644,39.909,26.602,24.568,26.602,24.568z"></path> </g> </g></svg>
      `;

      const icon = L.divIcon({
        html: planeSVG,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        className: 'custom-plane-icon'
      });

      if (this.markers[flight.flight_id]) {
        // Update existing marker
        this.markers[flight.flight_id].setLatLng([flight.latitude, flight.longitude]).setIcon(icon);
      } else {
        // Create new marker
        const marker = L.marker([flight.latitude, flight.longitude], { icon })
          .bindPopup(`<b>Flight Number:</b> ${flight.flight_number}<br><b>Airline:</b> ${flight.airline_name}<br><b>Status:</b> ${flight.flight_state}`)
          .addTo(this.map);
        this.markers[flight.flight_id] = marker;
      }
    });
  }


  ngOnDestroy(): void {
    this.mobileQuery.removeListener(this._mobileQueryListener);
  }


  // all world data
  // private updateMapWithPlaneData(data: { satellite: Plane[]; terrestrial: Plane[] }): void {
  //   const planes = [...data.satellite, ...data.terrestrial];

  //   if (planes.length === 0) {
  //     console.error('No valid plane data found', data);
  //     return;
  //   }

  //   planes.forEach((plane: any) => {
  //     const target: Plane = {
  //       icao_address: plane.icao_address,
  //       callsign: plane.callsign,
  //       origin_country: plane.origin_country || '',
  //       time_position: plane.timestamp,
  //       last_contact: plane.ingestion_time,
  //       longitude: parseFloat(plane.longitude),
  //       latitude: parseFloat(plane.latitude),
  //       altitude_baro: parseFloat(plane.altitude_baro),
  //       on_ground: plane.on_ground,
  //       velocity: parseFloat(plane.speed),
  //       heading: parseFloat(plane.heading),
  //       vertical_rate: parseFloat(plane.vertical_rate),
  //       sensors: plane.source || '',
  //       geo_altitude: parseFloat(plane.altitude_baro),
  //       squawk: plane.squawk,
  //       spi: plane.on_ground,
  //       position_source: 1,
  //       collection_type: plane.collection_type,
  //     };

  //     if (isNaN(target.latitude) || isNaN(target.longitude)) {
  //       console.error('Invalid coordinates for plane:', target);
  //       return;
  //     }

  //     const planeSVG = `
  //     <svg height="20" width="20" style="transform-origin: center; transform: rotate(${target.heading}deg);" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 46.876 46.876" xml:space="preserve" fill="#000000" stroke="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <path style="fill:#e3b021;" d="M26.602,24.568l15.401,6.072l-0.389-4.902c-10.271-7.182-9.066-6.481-14.984-10.615V2.681 c0-1.809-1.604-2.701-3.191-2.681c-1.587-0.021-3.19,0.872-3.19,2.681v12.44c-5.918,4.134-4.714,3.434-14.985,10.615l-0.39,4.903 l15.401-6.072c0,0-0.042,15.343-0.006,15.581l-5.511,3.771v2.957l7.044-2.427h3.271l7.046,2.427V43.92l-5.513-3.771 C26.644,39.909,26.602,24.568,26.602,24.568z"></path> </g> </g></svg>
  //   `;

  //     const planeIcon = L.divIcon({
  //       html: planeSVG,
  //       className: 'custom-plane-icon',
  //       iconSize: [20, 20],
  //       iconAnchor: [10, 10],
  //     });

  //     if (this.markers[target.icao_address]) {
  //       const marker = this.markers[target.icao_address];
  //       marker.setLatLng([target.latitude, target.longitude]);
  //       marker.setIcon(planeIcon);
  //     } else {
  //       const marker = L.marker([target.latitude, target.longitude], { icon: planeIcon });
  //       marker.addTo(this.map).on('click', () => {
  //         this.displayPlaneData(target);
  //       });

  //       this.markers[target.icao_address] = marker;
  //     }
  //   });
  // }

  spiresAPI(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
      this.clearMarkers();
      clearInterval(this.animationInterval);
    } else {
      this.subscription = this.flightService.listenToStream().subscribe({
        next: (data: { satellite: Plane[]; terrestrial: Plane[] }) => {
          console.log('Received plane data:', data);
          this.updateMapWithPlaneData(data);
        },
        error: err => console.error('Error listening to stream', err)
      });
    }
  }

  private updateMapWithPlaneData(data: { satellite: Plane[]; terrestrial: Plane[] }): void {
    const planes = [...data.satellite, ...data.terrestrial];

    if (planes.length === 0) {
      console.error('No valid plane data found', data);
      return;
    }

    if (this.mode === 'animation') {
      this.startAnimation(planes);
    } else {
      this.updateMarkers(planes);
    }
  }

  private updateMarkers(planes: Plane[]): void {
    planes.forEach((plane: Plane) => {
      if (!plane.callsign || !plane.callsign.startsWith('IGO')) {
        return;
      }

      const planeSVG = `
        <svg height="20" width="20" style="transform-origin: center; transform: rotate(${plane.heading}deg);" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 46.876 46.876" xml:space="preserve" fill="#000000" stroke="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <path style="fill:#e3b021;" d="M26.602,24.568l15.401,6.072l-0.389-4.902c-10.271-7.182-9.066-6.481-14.984-10.615V2.681 c0-1.809-1.604-2.701-3.191-2.681c-1.587-0.021-3.19,0.872-3.19,2.681v12.44c-5.918,4.134-4.714,3.434-14.985,10.615l-0.39,4.903 l15.401-6.072c0,0-0.042,15.343-0.006,15.581l-5.511,3.771v2.957l7.044-2.427h3.271l7.046,2.427V43.92l-5.513-3.771 C26.644,39.909,26.602,24.568,26.602,24.568z"></path> </g> </g></svg>
      `;

      const planeIcon = L.divIcon({
        html: planeSVG,
        className: 'custom-plane-icon',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      if (this.markers[plane.icao_address]) {
        const marker = this.markers[plane.icao_address];
        marker.setLatLng([plane.latitude, plane.longitude]);
        marker.setIcon(planeIcon);
      } else {
        const marker = L.marker([plane.latitude, plane.longitude], { icon: planeIcon });
        marker.addTo(this.map).on('click', () => {
          this.displayPlaneData(plane);
        });

        this.markers[plane.icao_address] = marker;
      }
    });
  }

  private startAnimation(planes: Plane[]): void {
    clearInterval(this.animationInterval);

    this.animationInterval = setInterval(() => {
      const plane = planes[this.animationIndex];
      this.animationIndex = (this.animationIndex + 1) % planes.length;

      if (!plane.callsign || !plane.callsign.startsWith('IGO')) {
        return;
      }

      const planeSVG = `
        <svg height="20" width="20" style="transform-origin: center; transform: rotate(${plane.heading}deg);" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 46.876 46.876" xml:space="preserve" fill="#000000" stroke="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <path style="fill:#e3b021;" d="M26.602,24.568l15.401,6.072l-0.389-4.902c-10.271-7.182-9.066-6.481-14.984-10.615V2.681 c0-1.809-1.604-2.701-3.191-2.681c-1.587-0.021-3.19,0.872-3.19,2.681v12.44c-5.918,4.134-4.714,3.434-14.985,10.615l-0.39,4.903 l15.401-6.072c0,0-0.042,15.343-0.006,15.581l-5.511,3.771v2.957l7.044-2.427h3.271l7.046,2.427V43.92l-5.513-3.771 C26.644,39.909,26.602,24.568,26.602,24.568z"></path> </g> </g></svg>
      `;

      const planeIcon = L.divIcon({
        html: planeSVG,
        className: 'custom-plane-icon',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      if (this.markers[plane.icao_address]) {
        const marker = this.markers[plane.icao_address];
        marker.setLatLng([plane.latitude, plane.longitude]);
        marker.setIcon(planeIcon);
      } else {
        const marker = L.marker([plane.latitude, plane.longitude], { icon: planeIcon });
        marker.addTo(this.map).on('click', () => {
          this.displayPlaneData(plane);
        });

        this.markers[plane.icao_address] = marker;
      }
    }, 1000); // Adjust interval as needed
  }

  private displayPlaneData(plane: Plane): void {
    L.popup()
      .setLatLng([plane.latitude, plane.longitude])
      .setContent(`
      <div>
        <p><strong>ICAO Address:</strong> ${plane.icao_address}</p>
        <p><strong>Callsign:</strong> ${plane.callsign}</p>
        <p><strong>Origin Country:</strong> ${plane.origin_country}</p>
        <p><strong>Longitude:</strong> ${plane.longitude}</p>
        <p><strong>Latitude:</strong> ${plane.latitude}</p>
        <p><strong>Altitude:</strong> ${plane.altitude_baro}</p>
        <p><strong>Velocity:</strong> ${plane.velocity}</p>
        <p><strong>Heading:</strong> ${plane.heading}</p>
        <p><strong>Vertical Rate:</strong> ${plane.vertical_rate}</p>
        <p><strong>Geo Altitude:</strong> ${plane.geo_altitude}</p>
        <p><strong>Squawk:</strong> ${plane.squawk}</p>
      </div>
    `)
      .openOn(this.map);
  }

  private clearMarkers(): void {
    Object.keys(this.markers).forEach(key => {
      this.map.removeLayer(this.markers[key]);
    });
    this.markers = {};
  }

  initMap(): void {
    const subdomains = ['mt0', 'mt1', 'mt2', 'mt3'];
    const maxZoom = 20;
    const attribution = '© <a href="https://www.cognitivenavigation.com/privacy-policy/">Cognitive Navigation</a> | <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    this.map = L.map('map', { zoomControl: false, attributionControl: true }).setView([20.5937, 78.9629], 5);

    const streets = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', { subdomains, attribution });
    const darkMatter = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution });
    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution });
    const navigation = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      attribution,
      maxZoom: 16
    });
    const googleHybrid = L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', { maxZoom, subdomains, attribution });
    const googleSat = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', { maxZoom, subdomains, attribution });
    const googleTerrain = L.tileLayer('http://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', { maxZoom, subdomains, attribution });

    const baseMaps = {
      'Streets': streets,
      'Satellite': satellite,
      'Navigation': navigation,
      'Hybrid': googleHybrid,
      'Satellite Google': googleSat,
      'Terrain': googleTerrain,
      'Dark': darkMatter
    };


    L.control.layers(baseMaps, {}, { position: 'topleft' }).addTo(this.map);
    navigation.addTo(this.map);
    L.control.scale({ position: 'bottomright', metric: false }).addTo(this.map);
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
    this.map.on('wheel', (event: L.LeafletEvent) => { }, { passive: true });
    this.airportLayerGroup = L.layerGroup().addTo(this.map);

  }


  updateLayers(): void {
    // Clear existing layers
    this.airportLayerGroup.clearLayers();

    const loadSIDProcedure = async (procedureName: string, pointFileName: string, lineFileName: string, iconFileName: string) => {
      try {

        // Load runway GeoJSON data
        const runwayIcon = L.icon({
          iconUrl: 'assets/AKTIM_7A/RWY.png',
          iconSize: [20, 30],
          iconAnchor: [10, 30]
        });

        const runwayResponse = await fetch(iconFileName);
        const runwayData = await runwayResponse.json();

        const geoLayer = L.geoJSON(runwayData, {
          pointToLayer: (feature, latlng) => {
            const trueB = parseFloat(feature.properties.True_B);
            let marker: L.Marker<any>;

            if (!isNaN(trueB)) {
              const rotationAngle = trueB
              console.log(rotationAngle)
              marker = L.marker(latlng, { icon: runwayIcon, rotationAngle: rotationAngle });
            } else {
              console.error('Invalid True_B value:', feature.properties.True_B);
              // Create a transparent marker as a fallback
              marker = L.marker(latlng, { opacity: 0 });
            }

            return marker;
          }
        });

        this.airportLayerGroup.addLayer(geoLayer);
        // this.map.fitBounds(geoLayer.getBounds());

        // Load Point_SID GeoJSON data
        const pointResponse = await fetch(pointFileName);
        const pointData = await pointResponse.json();

        const stepIcon = L.icon({
          iconUrl: 'assets/AKTIM_7A/Fly-by.png',
          iconSize: [40, 40],
          popupAnchor: [-3, -76],
          // bgPos: [0, 0],
        });

        const geoJsonLayer = L.geoJSON(pointData, {
          pointToLayer: (feature, latlng) => {
            const marker = L.marker(latlng, { icon: stepIcon });

            let tooltipContent = '';
            if (feature.properties.Name) {
              tooltipContent += `<b>${feature.properties.Name}</b><br>`;
            }

            if (feature.properties.Altitude) {
              tooltipContent += `${feature.properties.Altitude}<br>`;
            }
            if (feature.properties.Speed) {
              tooltipContent += `${feature.properties.Speed}<br>`;
            }
            if (feature.properties.Speed1) {
              tooltipContent += `${feature.properties.Speed1}`;
            }

            if (tooltipContent !== '') {
              marker.bindTooltip(tooltipContent, {
                permanent: true,
                direction: 'bottom',
                className: 'labelstyle',
                offset: L.point(25, 0),
              });
            }

            return marker;
          }

        });

        this.airportLayerGroup.addLayer(geoJsonLayer);
        this.map.fitBounds(geoJsonLayer.getBounds());

        // Load Line_SID GeoJSON data
        const lineResponse = await fetch(lineFileName);
        const lineData = await lineResponse.json();

        const lineFeatures = lineData.features; // Assuming lineData is your GeoJSON data

        this.lineGeoJsonLayer = L.geoJSON(lineData, {
          style: {
            color: 'black', // Set line color
            weight: 2 // Set line weight
          },

          onEachFeature: (feature, layer) => {

            const currentIndex = lineFeatures.indexOf(feature); // Get the index of the current feature

            if (feature.properties) {
              const bearing = feature.properties.Bearing;
              const distance = feature.properties.Distance;

              // Check if either Bearing or Distance is available
              if (bearing !== null || distance !== null) {
                // Get the coordinates of the line
                let coordinates: number[][] = [];
                if (feature.geometry.type === 'MultiLineString') {
                  coordinates = feature.geometry.coordinates[0]; // For MultiLineString, choose the first line
                } else if (feature.geometry.type === 'LineString') {
                  coordinates = feature.geometry.coordinates;
                }

                const start = coordinates[0];
                const end = coordinates[1];

                // Calculate the angle between start and end points in radians
                let angle = Math.atan2(end[1] - start[1], end[0] - start[0]);

                // Ensure angle is positive
                if (angle < 0) {
                  angle += 2 * Math.PI;
                }

                // Calculate the center point of the line segment
                const center = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];

                let rotationAngle; // Declare rotationAngle variable here

                if (distance !== null) {
                  // Create a custom icon
                  const customIcon = L.icon({
                    iconUrl: 'assets/AKTIM_7A/penta.png',
                    iconSize: [44, 36],
                    iconAnchor: [20, 19]
                  });

                  // Calculate the rotation angle in degrees for the icon
                  let iconRotationAngle = parseFloat(bearing);

                  // If current bearing is null, use the next bearing value
                  if (isNaN(iconRotationAngle)) {
                    const nextIndex = currentIndex + 1;
                    if (nextIndex < lineFeatures.length) {
                      const nextFeature = lineFeatures[nextIndex];
                      if (nextFeature.properties && nextFeature.properties.Bearing) {
                        iconRotationAngle = parseFloat(nextFeature.properties.Bearing);
                      }
                    }
                  }

                  // Create a marker with a custom icon at the center point and rotation
                  const marker = L.marker(L.latLng(center[1], center[0]), {
                    icon: customIcon,
                    rotationAngle: iconRotationAngle // Set rotation angle based on line direction or bearing
                  }).addTo(this.airportLayerGroup);

                  // Calculate the rotation angle for the distance text relative to the line direction
                  if (iconRotationAngle !== null) {
                    if (iconRotationAngle >= 0 && iconRotationAngle < 180) {
                      // Angle between 0 and 180 degrees
                      rotationAngle = iconRotationAngle - 90;
                    } else {
                      // Angle between 180 and 360 degrees
                      rotationAngle = iconRotationAngle + 90;
                    }
                  } else {
                    // Default rotation angle if iconRotationAngle is null
                    rotationAngle = angle * (180 / Math.PI) - 90;
                  }

                  // Bind tooltip with distance text to the marker, rotate dynamically based on the line direction
                  const distanceTooltip = `<div style="transform: rotate(${rotationAngle}deg); font-size: 8px;">${feature.properties.Distance}</div>`;
                  marker.bindTooltip(distanceTooltip, {
                    permanent: true,
                    direction: 'center',
                    className: 'labelstyle',
                    opacity: 1
                  });
                }

                if (bearing !== null) {
                  // Add bearing text outside the icon
                  const bearingMarker = L.marker(L.latLng(center[1], center[0]), {
                    rotationAngle: rotationAngle, // Set rotation angle
                    icon: L.divIcon({
                      className: 'bearing-label', // Custom CSS class for styling
                      html: `<div style="font-size: 8px;">${feature.properties.Bearing}</div>`, // HTML content for the bearing text
                      iconAnchor: [10, 20] // Adjust the icon anchor to shift the bearing text above by 20 pixels
                    })
                  }).addTo(this.airportLayerGroup);
                }
              }

            }
          }
        });

        this.airportLayerGroup.addLayer(this.lineGeoJsonLayer);


      } catch (error) {
        console.error(`Error loading ${procedureName} SID procedure:`, error);
      }
    };

    // Mapping of procedure names to their respective file paths
    const proceduresMap: { [key: string]: [string, string, string] } = {
      //VOBL_RWY9L SID procedure
      'AKTIM 7A': ['assets/VOBL_RWY9L/SID/AKTIM7A/AKTIM7A_Point.geojson', 'assets/VOBL_RWY9L/SID/AKTIM7A/AKTIM7A_line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      'ANIRO 7A': ['assets/VOBL_RWY9L/SID/ANIRO7A/ANIRO7A_Point.geojson', 'assets/VOBL_RWY9L/SID/ANIRO7A/ANIRO7A_line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      'GUNIM 7A': ['assets/VOBL_RWY9L/SID/GUNIM7A/GUNIM7A_Point.geojson', 'assets/VOBL_RWY9L/SID/GUNIM7A/GUNIM7A_Line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      'VAGPU 7A': ['assets/VOBL_RWY9L/SID/VAGPU7A/VAGPU7A_Point.geojson', 'assets/VOBL_RWY9L/SID/VAGPU7A/VAGPU7A_Line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      'GUNIM 7L': ['assets/VOBL_RWY9L/SID/GUNIM7L/GUNIM7L_Point.geojson', 'assets/VOBL_RWY9L/SID/GUNIM7L/GUNIM7L_Line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      'OPAMO 7A': ['assets/VOBL_RWY9L/SID/OPAMO7A/OPAMO7A_Point.geojson', 'assets/VOBL_RWY9L/SID/OPAMO7A/OPAMO7A_Line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      'PEXEG 7A': ['assets/VOBL_RWY9L/SID/PEXEG7A/PEXEG7A_Point.geojson', 'assets/VOBL_RWY9L/SID/PEXEG7A/PEXEG7A_Line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      'TULNA 7A': ['assets/VOBL_RWY9L/SID/TULNA7A/TULNA7A_Point.geojson', 'assets/VOBL_RWY9L/SID/TULNA7A/TULNA7A_Line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      'VEMBO 7A': ['assets/VOBL_RWY9L/SID/VEMBO7A/VEMBO7A_Point.geojson', 'assets/VOBL_RWY9L/SID/VEMBO7A/VEMBO7A_Line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      'LATID 7A': ['assets/VOBL_RWY9L/SID/LATID7A/LATID7A_Point.geojson', 'assets/VOBL_RWY9L/SID/LATID7A/LATID7A_Line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      'SAI 7A': ['assets/VOBL_RWY9L/SID/SAI7A/SAI7A_Point.geojson', 'assets/VOBL_RWY9L/SID/SAI7A/SAI7A_Line.geojson', ''],
      //VOBL_RWY9L STAR procedure
      'GUNIM 7E': ['assets/VOBL_RWY9L/STAR/GUNIM7E/GUNIM7E_Point.geojson', 'assets/VOBL_RWY9L/STAR/GUNIM7E/GUNIM7E_Line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      'ADKAL 7E': ['assets/VOBL_RWY9L/STAR/ADKAL7E/ADKAL7E_Point.geojson', 'assets/VOBL_RWY9L/STAR/ADKAL7E/ADKAL7E_Line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      'LEKAP 7E': ['assets/VOBL_RWY9L/STAR/LEKAP7E/LEKAP7E_Point.geojson', 'assets/VOBL_RWY9L/STAR/LEKAP7E/LEKAP7E_Line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      'PEXEG 7E': ['assets/VOBL_RWY9L/STAR/PEXEG7E/PEXEG7E_Point.geojson', 'assets/VOBL_RWY9L/STAR/PEXEG7E/PEXEG7E_Line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      'RIKBU 7E': ['assets/VOBL_RWY9L/STAR/RIKBU7E/RIKBU7E_Point.geojson', 'assets/VOBL_RWY9L/STAR/RIKBU7E/RIKBU7E_Line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      'SUSIK 7E': ['assets/VOBL_RWY9L/STAR/SUSIK7E/SUSIK7E_Point.geojson', 'assets/VOBL_RWY9L/STAR/SUSIK7E/SUSIK7E_Line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      'SUSIK 7J': ['assets/VOBL_RWY9L/STAR/SUSIK7J/SUSIK7J_Point.geojson', 'assets/VOBL_RWY9L/STAR/SUSIK7J/SUSIK7J_Line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      'TELUV 7E': ['assets/VOBL_RWY9L/STAR/TELUV7E/TELUV7E_Point.geojson', 'assets/VOBL_RWY9L/STAR/TELUV7E/TELUV7E_Line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      'UGABA 7E': ['assets/VOBL_RWY9L/STAR/UGABA7E/UGABA7E_Point.geojson', 'assets/VOBL_RWY9L/STAR/UGABA7E/UGABA7E_Line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      'XIVIL 7E': ['assets/VOBL_RWY9L/STAR/XIVIL7E/XIVIL7E_Point.geojson', 'assets/VOBL_RWY9L/STAR/XIVIL7E/XIVIL7E_Line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      // VOBL_RWY9L APCH procedure
      'RNP': ['assets/VOBL_RWY9L/APCH/RNP/RNp_RWY_09L_Point.geojson', 'assets/VOBL_RWY9L/APCH/RNP/RNp_RWY_09L_Line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      // VOBL_RWY27R sid procedure
      'AKTIM 7B': ['assets/VOBL_RWY27R/SID27R_VOBL/AKTIM7B/AKTIM7B_Point.geojson', 'assets/VOBL_RWY27R/SID27R_VOBL/AKTIM7B/AKTIM7B_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'ANIRO 7B': ['assets/VOBL_RWY27R/SID27R_VOBL/ANIRO7B/ANIRO7B_Point.geojson', 'assets/VOBL_RWY27R/SID27R_VOBL/ANIRO7B/ANIRO7B_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'GUNIM 7B': ['assets/VOBL_RWY27R/SID27R_VOBL/GUNIM7B/GUNIM7B_Point.geojson', 'assets/VOBL_RWY27R/SID27R_VOBL/GUNIM7B/GUNIM7B_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'GUNIM 7J': ['assets/VOBL_RWY27R/SID27R_VOBL/GUNIM7J/GUNIM7J_Point.geojson', 'assets/VOBL_RWY27R/SID27R_VOBL/GUNIM7J/GUNIM7J_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'OPAMO 7B': ['assets/VOBL_RWY27R/SID27R_VOBL/OPAMO7B/OPAMO7B_Point.geojson', 'assets/VOBL_RWY27R/SID27R_VOBL/OPAMO7B/OPAMO7B_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'SAI 7B': ['assets/VOBL_RWY27R/SID27R_VOBL/SAI7B/SAI7B_Point.geojson', 'assets/VOBL_RWY27R/SID27R_VOBL/SAI7B/SAI7B_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'PEXEG 7B': ['assets/VOBL_RWY27R/SID27R_VOBL/PEXEG7B/PEXEG7B_Point.geojson', 'assets/VOBL_RWY27R/SID27R_VOBL/PEXEG7B/PEXEG7B_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'TULNA 7B': ['assets/VOBL_RWY27R/SID27R_VOBL/TULNA7B/TULNA7B_Point.geojson', 'assets/VOBL_RWY27R/SID27R_VOBL/TULNA7B/TULNA7B_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'VEMBO 7B': ['assets/VOBL_RWY27R/SID27R_VOBL/VEMBO7B/VEMBO7B_Point.geojson', 'assets/VOBL_RWY27R/SID27R_VOBL/VEMBO7B/VEMBO7B_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'LATID 7B': ['assets/VOBL_RWY27R/SID27R_VOBL/LATID7B/LATID7B_Point.geojson', 'assets/VOBL_RWY27R/SID27R_VOBL/LATID7B/LATID72_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'VEMBO 7S': ['assets/VOBL_RWY27R/SID27R_VOBL/VEMBO7S/VEMBO7S_Point.geojson', 'assets/VOBL_RWY27R/SID27R_VOBL/VEMBO7S/VEMBO7S_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'ANIRO 7S': ['assets/VOBL_RWY27R/SID27R_VOBL/ANIRO7S/ANIRO7S_Point.geojson', 'assets/VOBL_RWY27R/SID27R_VOBL/ANIRO7S/ANIRO7S_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'VAGPU 7B': ['assets/VOBL_RWY27R/SID27R_VOBL/VAGPU7B/VAGPU7B_Point.geojson', 'assets/VOBL_RWY27R/SID27R_VOBL/VAGPU7B/VAGPU7B_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      //VOBL_RWY27R star procedure
      'ADKAL 7F': ['assets/VOBL_RWY27R/STAR27R_VOBL/ADKAL7F/ADKAL7F_Point.geojson', 'assets/VOBL_RWY27R/STAR27R_VOBL/ADKAL7F/ADKAL7F_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'GUNIM 7F': ['assets/VOBL_RWY27R/STAR27R_VOBL/GUNIM7F/GUNIM7F_Point.geojson', 'assets/VOBL_RWY27R/STAR27R_VOBL/GUNIM7F/GUNIM7F_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'GUNIM 7N': ['assets/VOBL_RWY27R/STAR27R_VOBL/GUNIM7N/GUNIM7N_Point.geojson', 'assets/VOBL_RWY27R/STAR27R_VOBL/GUNIM7N/GUNIM7N_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'LEKAP 7F': ['assets/VOBL_RWY27R/STAR27R_VOBL/LEKAP7F/LEKAP7F_Point.geojson', 'assets/VOBL_RWY27R/STAR27R_VOBL/LEKAP7F/LEKAP7F_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'PEXEG 7F': ['assets/VOBL_RWY27R/STAR27R_VOBL/PEXEG7F/PEXEG7F_Point.geojson', 'assets/VOBL_RWY27R/STAR27R_VOBL/PEXEG7F/PEXEG7F_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'PEXEG 7N': ['assets/VOBL_RWY27R/STAR27R_VOBL/PEXEG7N/PEXEG7N_Point.geojson', 'assets/VOBL_RWY27R/STAR27R_VOBL/PEXEG7N/PEXEG7N_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'RIKBU 7F': ['assets/VOBL_RWY27R/STAR27R_VOBL/RIKBU7F/RIKBU7F_Point.geojson', 'assets/VOBL_RWY27R/STAR27R_VOBL/RIKBU7F/RIKBU7F_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'SUSIK 7F': ['assets/VOBL_RWY27R/STAR27R_VOBL/SUSIK7F/SUSIK7F_Point.geojson', 'assets/VOBL_RWY27R/STAR27R_VOBL/SUSIK7F/SUSIK7F_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'SUSIK 7L': ['assets/VOBL_RWY27R/STAR27R_VOBL/SUSIK7L/SUSIK7L_Point.geojson', 'assets/VOBL_RWY27R/STAR27R_VOBL/SUSIK7L/SUSIK7L_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'TELUV 7F': ['assets/VOBL_RWY27R/STAR27R_VOBL/TELUV7F/TELUV7F_Point.geojson', 'assets/VOBL_RWY27R/STAR27R_VOBL/TELUV7F/TELUV7F_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'UGABA 7F': ['assets/VOBL_RWY27R/STAR27R_VOBL/UGABA7F/UGABA7F_Point.geojson', 'assets/VOBL_RWY27R/STAR27R_VOBL/UGABA7F/UGABA7F_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'XIVIL 7F': ['assets/VOBL_RWY27R/STAR27R_VOBL/XIVIL7F/XIVIL7F_Point.geojson', 'assets/VOBL_RWY27R/STAR27R_VOBL/XIVIL7F/XIVIL7F_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      //VOBL_RWY27R APCh procedure
      'RNP_Y': ['assets/VOBL_RWY27R/APCH27R_VOBL/RNP_Y_RWY_27R_Point.geojson', 'assets/VOBL_RWY27R/APCH27R_VOBL/RNP_Y_RWY_27R_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      //VIJP_RWY09 sid procedures
      'UKASO 1D': ['assets/VIJP_RWY09/SID_RWY09/UKASO1D/UKASO1D_Point.geojson', 'assets/VIJP_RWY09/SID_RWY09/UKASO1D/UKASO1D_Line.geojson', 'assets/RWY/VIJP_RWY09.geojson'],
      'UXENI 1D': ['assets/VIJP_RWY09/SID_RWY09/UXENI1D/UXENI1D_Point.geojson', 'assets/VIJP_RWY09/SID_RWY09/UXENI1D/UXENI1D_Line.geojson', 'assets/RWY/VIJP_RWY09.geojson'],
      'GUDUM 1D': ['assets/VIJP_RWY09/SID_RWY09/GUDUM1D/GUDUM1D_1_Point.geojson', 'assets/VIJP_RWY09/SID_RWY09/GUDUM1D/GUDUM1D_1_Line.geojson', 'assets/RWY/VIJP_RWY09.geojson'],
      'NIKOT 1D': ['assets/VIJP_RWY09/SID_RWY09/NIKOT1D/NIKOT1D_Point.geojson', 'assets/VIJP_RWY09/SID_RWY09/NIKOT1D/NIKOT1D_Line.geojson', 'assets/RWY/VIJP_RWY09.geojson'],
      'IKAVA 1D': ['assets/VIJP_RWY09/SID_RWY09/IKAVA1D/IKAVA1D_Point.geojson', 'assets/VIJP_RWY09/SID_RWY09/IKAVA1D/IKAVA1D_Line.geojson', 'assets/RWY/VIJP_RWY09.geojson'],
      'INTIL 1D': ['assets/VIJP_RWY09/SID_RWY09/INTIL1D/INTIL1D_Point.geojson', 'assets/VIJP_RWY09/SID_RWY09/INTIL1D/INTIL1D_Line.geojson', 'assets/RWY/VIJP_RWY09.geojson'],
      'LOVGA 1D': ['assets/VIJP_RWY09/SID_RWY09/LOVGA1D/LOVGA1D_Point.geojson', 'assets/VIJP_RWY09/SID_RWY09/LOVGA1D/LOVGA1D_Line.geojson', 'assets/RWY/VIJP_RWY09.geojson'],
      //VIJP_RWY09 Star procedures
      'IGOLU 1C': ['assets/VIJP_RWY09/STAR_RWO9/IGOLU1C/IGOLU1C_Point.geojson', 'assets/VIJP_RWY09/STAR_RWO9/IGOLU1C/IGOLU1C_Line.geojson', 'assets/RWY/VIJP_RWY09.geojson'],
      'LOVGA 1C': ['assets/VIJP_RWY09/STAR_RWO9/LOVGA1C/LOVGA1C_Point.geojson', 'assets/VIJP_RWY09/STAR_RWO9/LOVGA1C/LOVGA1C_Line.geojson', 'assets/RWY/VIJP_RWY09.geojson'],
      'BUBNU 1C': ['assets/VIJP_RWY09/STAR_RWO9/BUBNU1C/BUBNU1C_Point.geojson', 'assets/VIJP_RWY09/STAR_RWO9/BUBNU1C/BUBNU1C_Line.geojson', 'assets/RWY/VIJP_RWY09.geojson'],
      'RIDRA 1C': ['assets/VIJP_RWY09/STAR_RWO9/RIDRA1C/RIDRA1C_Point.geojson', 'assets/VIJP_RWY09/STAR_RWO9/RIDRA1C/RIDRA1C_Line.geojson', 'assets/RWY/VIJP_RWY09.geojson'],
      'INTIL 1C': ['assets/VIJP_RWY09/STAR_RWO9/INTILC/INTIL1C_Point.geojson', 'assets/VIJP_RWY09/STAR_RWO9/INTILC/INTIL1C_Line.geojson', 'assets/RWY/VIJP_RWY09.geojson'],
      'UXENI 1C': ['assets/VIJP_RWY09/STAR_RWO9/UXENI1C/UXENI1C_Point.geojson', 'assets/VIJP_RWY09/STAR_RWO9/UXENI1C/UXENI1C_Line.geojson', 'assets/RWY/VIJP_RWY09.geojson'],
      //VIJP_RWY09 APCH procedures
      'RNP_Y_RWY_09': ['assets/VIJP_RWY09/APCH_RW09/RNP_Y_RWY_09_Point.geojson', 'assets/VIJP_RWY09/APCH_RW09/RNP_Y_RWY_09_Line.geojson', 'assets/RWY/VIJP_RWY09.geojson'],
      //VIJP_RWY27 SID procedures
      'GUDUM 1B': ['assets/VIJP_RWY27/SID_RWY27/GUDUM1B/GUDUM1B_Point.geojson', 'assets/VIJP_RWY27/SID_RWY27/GUDUM1B/GUDUM1B_Line.geojson', 'assets/RWY/VIJP_RWY27.geojson'],
      'UXENI 1B': ['assets/VIJP_RWY27/SID_RWY27/UXENI1B/UXENI1B_Point.geojson', 'assets/VIJP_RWY27/SID_RWY27/UXENI1B/UXENI1B_Line.geojson', 'assets/RWY/VIJP_RWY27.geojson'],
      'IKAVA 1B': ['assets/VIJP_RWY27/SID_RWY27/IKAVA1B/IKAVA1B_Point.geojson', 'assets/VIJP_RWY27/SID_RWY27/IKAVA1B/IKAVA1B_Line.geojson', 'assets/RWY/VIJP_RWY27.geojson'],
      'INTIL 1B': ['assets/VIJP_RWY27/SID_RWY27/INTIL1B/INTIL1B_Point.geojson', 'assets/VIJP_RWY27/SID_RWY27/INTIL1B/INTIL1B_Line.geojson', 'assets/RWY/VIJP_RWY27.geojson'],
      'UKASO 1B': ['assets/VIJP_RWY27/SID_RWY27/UKASO1B/UKASO1B_Point.geojson', 'assets/VIJP_RWY27/SID_RWY27/UKASO1B/UKASO1B_Line.geojson', 'assets/RWY/VIJP_RWY27.geojson'],
      'LOVGA 1B': ['assets/VIJP_RWY27/SID_RWY27/LOVGA1B/LOVGA1B_Point.geojson', 'assets/VIJP_RWY27/SID_RWY27/LOVGA1B/LOVGA1B_Line.geojson', 'assets/RWY/VIJP_RWY27.geojson'],
      'NIKOT 1B': ['assets/VIJP_RWY27/SID_RWY27/NIKOT1B/NIKOT1B_Point.geojson', 'assets/VIJP_RWY27/SID_RWY27/NIKOT1B/NIKOT1B_Line.geojson', 'assets/RWY/VIJP_RWY27.geojson'],

      //VIJP_RWY27 STAR procedures
      'IGOLU 1A': ['assets/VIJP_RWY27/STAR_RWY27/IGOLU1A/IGOLU1A_Point.geojson', 'assets/VIJP_RWY27/STAR_RWY27/IGOLU1A/IGOLU1A_Line.geojson', 'assets/RWY/VIJP_RWY27.geojson'],
      'LOVGA 1A': ['assets/VIJP_RWY27/STAR_RWY27/LOVGA1A/LOVGA1A_Point.geojson', 'assets/VIJP_RWY27/STAR_RWY27/LOVGA1A/LOVGA1A_Line.geojson', 'assets/RWY/VIJP_RWY27.geojson'],
      'INTIL 1A': ['assets/VIJP_RWY27/STAR_RWY27/INTIL1A/INTIL1A_Point.geojson', 'assets/VIJP_RWY27/STAR_RWY27/INTIL1A/INTIL1A_Line.geojson', 'assets/RWY/VIJP_RWY27.geojson'],
      'RIDRA 1A': ['assets/VIJP_RWY27/STAR_RWY27/RIDRA1A/RIDRA1A_Point.geojson', 'assets/VIJP_RWY27/STAR_RWY27/RIDRA1A/RIDRA1A_Line.geojson', 'assets/RWY/VIJP_RWY27.geojson'],
      'BUBNU 1A': ['assets/VIJP_RWY27/STAR_RWY27/BUBNU1A/BUBNU1A_Point.geojson', 'assets/VIJP_RWY27/STAR_RWY27/BUBNU1A/BUBNU1A_Line.geojson', 'assets/RWY/VIJP_RWY27.geojson'],
      'UXENI 1A': ['assets/VIJP_RWY27/STAR_RWY27/UXENI1A/UXENI1A_Point.geojson', 'assets/VIJP_RWY27/STAR_RWY27/UXENI1A/UXENI1A_Line.geojson', 'assets/RWY/VIJP_RWY27.geojson'],
      //VIJP_RWY27 APCH procedures
      'RNP_Y_RWY27': ['assets/VIJP_RWY27/APCH_RW27/RNP_Y_RWY27_Point.geojson', 'assets/VIJP_RWY27/APCH_RW27/RNP_Y_RWY27_Line.geojson', 'assets/RWY/VIJP_RWY27.geojson'],
      //VEPY_RWY02 APCH procedures
      'RNP_Y_RWY02': ['assets/VEPY/APCH_RWY02/RNP_Y_RWY02_Point.geojson', 'assets/VEPY/APCH_RWY02/RNP_Y_RWY02_Line.geojson', 'assets/RWY/VEPY_RWY02.geojson'],
      //VEPY_RWY20 SID procedures
      'BGD1': ['assets/VEPY/SID_RWY20/BGD1_Departure/BGD1_Point.geojson', 'assets/VEPY/SID_RWY20/BGD1_Departure/BGD1_Line.geojson', 'assets/RWY/VEPY_RWY20.geojson'],
      //VOBL_RWY09R SID procedures
      'AKTIM 7C': ['assets/VOBL_RWY09R/AKTIM7C/AKTIM7C_Point.geojson', 'assets/VOBL_RWY09R/AKTIM7C/AKTIM7C_Line.geojson', 'assets/RWY/VOBL_RWY09R.geojson'],
      'ANIRO 7C': ['assets/VOBL_RWY09R/ANIRO7C/ANIRO7C_Point.geojson', 'assets/VOBL_RWY09R/ANIRO7C/ANIRO7C_Line.geojson', 'assets/RWY/VOBL_RWY09R.geojson'],
      'GUNIM 7C': ['assets/VOBL_RWY09R/GUNIM7C/GUNIM7C_Point.geojson', 'assets/VOBL_RWY09R/GUNIM7C/GUNIM7C_Line.geojson', 'assets/RWY/VOBL_RWY09R.geojson'],
      'GUNIM 7M': ['assets/VOBL_RWY09R/GUNIM7M/GUNIM7M_Point.geojson', 'assets/VOBL_RWY09R/GUNIM7M/GUNIM7M_Line.geojson', 'assets/RWY/VOBL_RWY09R.geojson'],
      'LATID 7C': ['assets/VOBL_RWY09R/LATID7C/LATID7C_Point.geojson', 'assets/VOBL_RWY09R/LATID7C/LATID7C_Line.geojson', 'assets/RWY/VOBL_RWY09R.geojson'],
      'OPAMO 7C': ['assets/VOBL_RWY09R/OPAMO7C/OPAMO7C_Point.geojson', 'assets/VOBL_RWY09R/OPAMO7C/OPAMO7C_Line.geojson', 'assets/RWY/VOBL_RWY09R.geojson'],
      'PEXEG 7C': ['assets/VOBL_RWY09R/PEXEG7C/PEXEG7C_Point.geojson', 'assets/VOBL_RWY09R/PEXEG7C/PEXEG7C_Line.geojson', 'assets/RWY/VOBL_RWY09R.geojson'],
      'SAI 7C': ['assets/VOBL_RWY09R/SAI7C/SAI7C_Point.geojson', 'assets/VOBL_RWY09R/SAI7C/SAI7C_Line.geojson', 'assets/RWY/VOBL_RWY09R.geojson'],
      'TULNA 7C': ['assets/VOBL_RWY09R/TULNA7C/TULNA7C_Point.geojson', 'assets/VOBL_RWY09R/TULNA7C/TULNA7C_Line.geojson', 'assets/RWY/VOBL_RWY09R.geojson'],
      'VAGPU 7C': ['assets/VOBL_RWY09R/VAGPU7C/VAGPU7C_Point.geojson', 'assets/VOBL_RWY09R/VAGPU7C/VAGPU7C_Line.geojson', 'assets/RWY/VOBL_RWY09R.geojson'],
      'VEMBO 7C': ['assets/VOBL_RWY09R/VEMBO7C/VEMBO7C_Point.geojson', 'assets/VOBL_RWY09R/VEMBO7C/VEMBO7C_Line.geojson', 'assets/RWY/VOBL_RWY09R.geojson'],
      //VOBL_RWY09R APCH procedures
      'RNP_Y_RWY09R': ['assets/VOBL_RWY09R/VOBL_APCH09R/RNP_Y_RWY09R_Point.geojson', 'assets/VOBL_RWY09R/VOBL_APCH09R/RNP_Y_RWY09R_Line.geojson', 'assets/RWY/VOBL_RWY09R.geojson'],
      //VOBL_RWY27L SID procedures
      'AKTIM 7D': ['assets/VOBL_RW27L/AKTIM7D/AKTIM7D_Point.geojson', 'assets/VOBL_RW27L/AKTIM7D/AKTIM7D_Line.geojson', 'assets/RWY/VOBL_RWY27L.geojson'],
      'ANIRO 7D': ['assets/VOBL_RW27L/ANIRO7D/ANIRO7D_Point.geojson', 'assets/VOBL_RW27L/ANIRO7D/ANIRO7D_Line.geojson', 'assets/RWY/VOBL_RWY27L.geojson'],
      'GUNIM 7D': ['assets/VOBL_RW27L/GUNIM7D/GUNIM7D_Point.geojson', 'assets/VOBL_RW27L/GUNIM7D/GUNIM7D_Line.geojson', 'assets/RWY/VOBL_RWY27L.geojson'],
      'GUNIM 7U': ['assets/VOBL_RW27L/GUNIM7U/GUNIM7U_Point.geojson', 'assets/VOBL_RW27L/GUNIM7U/GUNIM7U_Line.geojson', 'assets/RWY/VOBL_RWY27L.geojson'],
      'LATID 7D': ['assets/VOBL_RW27L/LATID7D/LATID7D_Point.geojson', 'assets/VOBL_RW27L/LATID7D/LATID7D_Line.geojson', 'assets/RWY/VOBL_RWY27L.geojson'],
      'OPAMO 7D': ['assets/VOBL_RW27L/OPAMO7D/OPAMO7D_Point.geojson', 'assets/VOBL_RW27L/OPAMO7D/OPAMO7D_Line.geojson', 'assets/RWY/VOBL_RWY27L.geojson'],
      'PEXEG 7D': ['assets/VOBL_RW27L/PEXEG7D/PEXEG7D_Point.geojson', 'assets/VOBL_RW27L/PEXEG7D/PEXEG7D_Line.geojson', 'assets/RWY/VOBL_RWY27L.geojson'],
      'SAI 7D': ['assets/VOBL_RW27L/SAI7D/SAI7D_Point.geojson', 'assets/VOBL_RW27L/SAI7D/SAI7D_Line.geojson', 'assets/RWY/VOBL_RWY27L.geojson'],
      'TULNA 7D': ['assets/VOBL_RW27L/TULNA7D/TULNA7D_Point.geojson', 'assets/VOBL_RW27L/TULNA7D/TULNA7D_Line.geojson', 'assets/RWY/VOBL_RWY27L.geojson'],
      'VAGPU 7D': ['assets/VOBL_RW27L/VAGPU7D/VAGPU7D_Point.geojson', 'assets/VOBL_RW27L/VAGPU7D/VAGPU7D_Line.geojson', 'assets/RWY/VOBL_RWY27L.geojson'],
      'VEMBO 7D': ['assets/VOBL_RW27L/VEMBO7D/VEMBO7D_Point.geojson', 'assets/VOBL_RW27L/VEMBO7D/VEMBO7D_Line.geojson', 'assets/RWY/VOBL_RWY27L.geojson'],
      'VEMBO 7Y': ['assets/VOBL_RW27L/VEMBO7Y/VEMBO7Y_Point.geojson', 'assets/VOBL_RW27L/VEMBO7Y/VEMBO7Y_Line.geojson', 'assets/RWY/VOBL_RWY27L.geojson'],
      'ANIRO 7Y': ['assets/VOBL_RW27L/ANIRO7Y/ANIRO7Y_Point.geojson', 'assets/VOBL_RW27L/ANIRO7Y/ANIRO7Y_Line.geojson', 'assets/RWY/VOBL_RWY27L.geojson'],
      //VOBL_RWY27L APCH procedures
      'RNP_Y_RWY27L': ['assets/VOBL_RW27L/VOBL_APCH27L/RNP_Y_RWY27L_Point.geojson', 'assets/VOBL_RW27L/VOBL_APCH27L/RNP_Y_RWY27L_Line.geojson', 'assets/RWY/VOBL_RWY27L.geojson'],
    };
    // Iterate over selected procedures and load them
    for (const procedureName in proceduresMap) {
      if (this.selectedProcedureName.includes(procedureName)) {
        const [pointFileName, lineFileName, iconFileName] = proceduresMap[procedureName];
        loadSIDProcedure(procedureName, pointFileName, lineFileName, iconFileName);
      }
    }
  }

  watchAirportChanges(): void {
    this.Airform.get('selectedAirport')?.valueChanges.subscribe((selectedAirport: string[]) => {
      // Clear all runway and procedure options when the selected airport changes
      this.optionsBengaluruKIARunway = [];
      this.optionsVIJPJAIPURRunway = [];
      this.optionsVEPYPAKYONGRunway = [];
      this.optionsRWY_09LTypeofProcedure = [];
      this.selectedTypeofProcedure = [];


      const customIcon = L.icon({
        iconUrl: 'assets/airport.png',
        iconSize: [30, 30],
        iconAnchor: [10, 30]
      });



      // Check if VOBL/Bengaluru (KIA) is selected
      if (selectedAirport.includes('VOBL/Bengaluru (KIA)')) {

        this.airportLayerGroup.clearLayers(); // Remove all markers when no airport is selected

        const marker = L.marker([13.198889, 77.705556], { icon: customIcon }).addTo(this.airportLayerGroup);


        // Set the map view to the marker's position
        this.map.setView([13.1979, 77.7063], 13);


        this.optionsBengaluruKIARunway = [
          { value: 'RWY 09L', label: 'RWY 09L' },
          { value: 'RWY_9R', label: 'RWY 09R' },
          { value: '27L_RWY', label: 'RWY 27L' },
          { value: 'RWY 27R', label: 'RWY 27R' },
        ];
        // Set view to Bengaluru
        this.map.setView([13.206944, 77.704167], 12);
      } else {
        this.optionsBengaluruKIARunway = [];
      }

      // Check if VIJP/JAIPUR is selected
      if (selectedAirport.includes('VIJP/JAIPUR')) {
        const marker = L.marker([26.824167, 75.8025], { icon: customIcon }).addTo(this.airportLayerGroup);


        // Set the map view to the marker's position
        this.map.setView([23.071111, 72.626389], 13);


        // Show options for VIJP/JAIPUR
        this.optionsVIJPJAIPURRunway = [
          { value: 'RWY_09', label: 'RWY_08' },
          { value: 'RWY_27', label: 'RWY_26' },
        ];
        // Set view to Jaipur
        this.map.setView([26.824167, 75.812222], 12);
      } else {
        this.optionsVIJPJAIPURRunway = [];
      }
      // Check if VEPY/PAKYONG is selected
      if (selectedAirport.includes('VEPY/PAKYONG')) {
        const marker = L.marker([27.225833, 88.585833], { icon: customIcon }).addTo(this.airportLayerGroup);

        // Set the map view to the marker's position
        this.map.setView([27.1333, 88.3509], 13);
        // Show options for VEPY/PAKYONG
        this.optionsVEPYPAKYONGRunway = [
          { value: 'RWY 02', label: 'RWY 02' },
          { value: 'RWY 20', label: 'RWY 20' },
        ];
        // Set view to Pakyong
        this.map.setView([27.2394, 88.5961], 12);
      } else {
        this.optionsVEPYPAKYONGRunway = [];
      }
    });

    this.Airform.get('selectedRunway')?.valueChanges.subscribe((selectedRunway: string[]) => {
      // Reset options for both runways
      this.selectedTypeofProcedure = [];
      this.optionsRWY_09LTypeofProcedure = [];

      // Check if RWY 09L or RWY 27R is selected
      if (selectedRunway.includes('RWY 09L') || selectedRunway.includes('RWY 27R') ||
        selectedRunway.includes('RWY_09') || selectedRunway.includes('RWY 02') ||
        selectedRunway.includes('RWY 20') || selectedRunway.includes('RWY_27') ||
        selectedRunway.includes('RWY_9R') || selectedRunway.includes('27L_RWY')) {

        this.optionsRWY_09LTypeofProcedure = [
          { value: 'SID', label: 'SID' },
          { value: 'STAR', label: 'STAR' },
          { value: 'APCH', label: 'APCH' },
        ];
      }
    });

    this.Airform.get('selectedTypeofProcedure')?.valueChanges.subscribe((selectedTypeofProcedure: string[]) => {

      let filteredOptions: { value: string, label: string }[] = [];

      if (this.Airform.get('selectedRunway')?.value.includes('RWY 09L')) {
        if (selectedTypeofProcedure.includes('SID')) {

          filteredOptions = filteredOptions.concat([
            { value: 'AKTIM 7A', label: 'AKTIM 7A' },
            { value: 'ANIRO 7A', label: 'ANIRO 7A' },
            { value: 'GUNIM 7A', label: 'GUNIM 7A' },
            { value: 'VAGPU 7A', label: 'VAGPU 7A' },
            { value: 'GUNIM 7L', label: 'GUNIM 7L' },
            { value: 'OPAMO 7A', label: 'OPAMO 7A' },
            { value: 'PEXEG 7A', label: 'PEXEG 7A' },
            { value: 'TULNA 7A', label: 'TULNA 7A' },
            { value: 'VEMBO 7A', label: 'VEMBO 7A' },
            { value: 'LATID 7A', label: 'LATID 7A' },
            { value: 'SAI 7A', label: 'SAI 7A' },
          ]);
        }
        if (selectedTypeofProcedure.includes('STAR')) {
          filteredOptions = filteredOptions.concat([
            { value: 'ADKAL 7E', label: 'ADKAL 7E' },
            { value: 'GUNIM 7E', label: 'GUNIM 7E' },
            { value: 'LEKAP 7E', label: 'LEKAP 7E' },
            { value: 'PEXEG 7E', label: 'PEXEG 7E' },
            { value: 'RIKBU 7E', label: 'RIKBU 7E' },
            { value: 'SUSIK 7E', label: 'SUSIK 7E' },
            { value: 'SUSIK 7J', label: 'SUSIK 7J' },
            { value: 'TELUV 7E', label: 'TELUV 7E' },
            { value: 'UGABA 7E', label: 'UGABA 7E' },
            { value: 'XIVIL 7E', label: 'XIVIL 7E' },
          ]);
        }
        if (selectedTypeofProcedure.includes('APCH')) {
          filteredOptions = filteredOptions.concat([
            { value: 'RNP', label: 'RNP_RWY_09L' },
          ]);
        }
        this.optionsProcedureName = filteredOptions;
      }
      if (this.Airform.get('selectedRunway')?.value.includes('RWY 27R')) {
        if (selectedTypeofProcedure.includes('SID')) {

          filteredOptions = filteredOptions.concat([
            { value: 'AKTIM 7B', label: 'AKTIM 7B' },
            { value: 'ANIRO 7B', label: 'ANIRO 7B' },
            { value: 'GUNIM 7B', label: 'GUNIM 7B' },
            { value: 'GUNIM 7J', label: 'GUNIM 7J' },
            { value: 'OPAMO 7B', label: 'OPAMO 7B' },
            { value: 'SAI 7B', label: 'SAI 7B' },
            { value: 'PEXEG 7B', label: 'PEXEG 7B' },
            { value: 'TULNA 7B', label: 'TULNA 7B' },
            { value: 'VEMBO 7B', label: 'VEMBO 7B' },
            { value: 'LATID 7B', label: 'LATID 7B' },
            { value: 'VEMBO 7S', label: 'VEMBO 7S' },
            { value: 'ANIRO 7S', label: 'ANIRO 7S' },
            { value: 'VAGPU 7B', label: 'VAGPU 7B' },
          ]);
        }
        if (selectedTypeofProcedure.includes('STAR')) {
          filteredOptions = filteredOptions.concat([
            { value: 'ADKAL 7F', label: 'ADKAL 7F' },
            { value: 'GUNIM 7F', label: 'GUNIM 7F' },
            { value: 'GUNIM 7N', label: 'GUNIM 7N' },
            { value: 'LEKAP 7F', label: 'LEKAP 7F' },
            { value: 'PEXEG 7F', label: 'PEXEG 7F' },
            { value: 'PEXEG 7N', label: 'PEXEG 7N' },
            { value: 'RIKBU 7F', label: 'RIKBU 7F' },
            { value: 'SUSIK 7F', label: 'SUSIK 7F' },
            { value: 'SUSIK 7L', label: 'SUSIK 7L' },
            { value: 'TELUV 7F', label: 'TELUV 7F' },
            { value: 'UGABA 7F', label: 'UGABA 7F' },
            { value: 'XIVIL 7F', label: 'XIVIL 7F' },
          ]);
        }
        if (selectedTypeofProcedure.includes('APCH')) {
          filteredOptions = filteredOptions.concat([
            { value: 'RNP_Y', label: 'RNP_Y_RWY_27R' },
          ]);
        }
        this.optionsProcedureName = filteredOptions;
      }
      if (this.Airform.get('selectedRunway')?.value.includes('RWY_09')) {
        if (selectedTypeofProcedure.includes('SID')) {

          filteredOptions = filteredOptions.concat([
            { value: 'UKASO 1D', label: 'UKASO 1D' },
            { value: 'UXENI 1D', label: 'UXENI 1D' },
            { value: 'GUDUM 1D', label: 'GUDUM 1D' },
            { value: 'NIKOT 1D', label: 'NIKOT 1D' },
            { value: 'IKAVA 1D', label: 'IKAVA 1D' },
            { value: 'INTIL 1D', label: 'INTIL 1D' },
            { value: 'LOVGA 1D', label: 'LOVGA 1D' },
          ]);
        }
        if (selectedTypeofProcedure.includes('STAR')) {
          filteredOptions = filteredOptions.concat([
            { value: 'IGOLU 1C', label: 'IGOLU 1C' },
            { value: 'LOVGA 1C', label: 'LOVGA 1C' },
            { value: 'BUBNU 1C', label: 'BUBNU 1C' },
            { value: 'RIDRA 1C', label: 'RIDRA 1C' },
            { value: 'INTIL 1C', label: 'INTIL 1C' },
            { value: 'UXENI 1C', label: 'UXENI 1C' },
          ]);
        }
        if (selectedTypeofProcedure.includes('APCH')) {
          filteredOptions = filteredOptions.concat([
            { value: 'RNP_Y_RWY_09', label: 'RNP_Y_RWY_09' },
          ]);
        }
        this.optionsProcedureName = filteredOptions;
      }
      if (this.Airform.get('selectedRunway')?.value.includes('RWY_27')) {
        if (selectedTypeofProcedure.includes('SID')) {

          filteredOptions = filteredOptions.concat([
            { value: 'UXENI 1B', label: 'UXENI 1B' },
            { value: 'IKAVA 1B', label: 'IKAVA 1B' },
            { value: 'INTIL 1B', label: 'INTIL 1B' },
            { value: 'UKASO 1B', label: 'UKASO 1B' },
            { value: 'LOVGA 1B', label: 'LOVGA 1B' },
            { value: 'GUDUM 1B', label: 'GUDUM 1B' },
            { value: 'NIKOT 1B', label: 'NIKOT 1B' },
          ]);
        }
        if (selectedTypeofProcedure.includes('STAR')) {
          filteredOptions = filteredOptions.concat([
            { value: 'IGOLU 1A', label: 'IGOLU 1A' },
            { value: 'LOVGA 1A', label: 'LOVGA 1A' },
            { value: 'INTIL 1A', label: 'INTIL 1A' },
            { value: 'RIDRA 1A', label: 'RIDRA 1A' },
            { value: 'BUBNU 1A', label: 'BUBNU 1A' },
            { value: 'UXENI 1A', label: 'UXENI 1A' },
          ]);
        }
        if (selectedTypeofProcedure.includes('APCH')) {
          filteredOptions = filteredOptions.concat([
            { value: 'RNP_Y_RWY27', label: 'RNP_Y_RWY27' },

          ]);
        }
        this.optionsProcedureName = filteredOptions;
      }
      if (this.Airform.get('selectedRunway')?.value.includes('RWY 20')) {
        if (selectedTypeofProcedure.includes('SID')) {

          filteredOptions = filteredOptions.concat([
            { value: 'BGD1', label: 'BGD1' },
          ]);
        }
        this.optionsProcedureName = filteredOptions;
      }
      if (this.Airform.get('selectedRunway')?.value.includes('RWY 02')) {

        if (selectedTypeofProcedure.includes('APCH')) {
          filteredOptions = filteredOptions.concat([
            { value: 'RNP_Y_RWY02', label: 'RNP_Y_RWY02' },
          ]);
        }
        this.optionsProcedureName = filteredOptions;
      }

      if (this.Airform.get('selectedRunway')?.value.includes('RWY_9R')) {
        if (selectedTypeofProcedure.includes('SID')) {

          filteredOptions = filteredOptions.concat([
            { value: 'AKTIM 7C', label: 'AKTIM 7C' },
            { value: 'ANIRO 7C', label: 'ANIRO 7C' },
            { value: 'GUNIM 7C', label: 'GUNIM 7C' },
            { value: 'GUNIM 7M', label: 'GUNIM 7M' },
            { value: 'LATID 7C', label: 'LATID 7C' },
            { value: 'OPAMO 7C', label: 'OPAMO 7C' },
            { value: 'PEXEG 7C', label: 'PEXEG 7C' },
            { value: 'SAI 7C', label: 'SAI 7C' },
            { value: 'TULNA 7C', label: 'TULNA 7C' },
            { value: 'VAGPU 7C', label: 'VAGPU 7C' },
            { value: 'VEMBO 7C', label: 'VEMBO 7C' },
          ]);
        }

        if (selectedTypeofProcedure.includes('APCH')) {
          filteredOptions = filteredOptions.concat([
            { value: 'RNP_Y_RWY09R', label: 'RNP_Y_RWY09R' },
          ]);
        }
        this.optionsProcedureName = filteredOptions;
      }

      if (this.Airform.get('selectedRunway')?.value.includes('27L_RWY')) {
        if (selectedTypeofProcedure.includes('SID')) {

          filteredOptions = filteredOptions.concat([
            { value: 'AKTIM 7D', label: 'AKTIM 7D' },
            { value: 'ANIRO 7D', label: 'ANIRO 7D' },
            { value: 'GUNIM 7D', label: 'GUNIM 7D' },
            { value: 'GUNIM 7U', label: 'GUNIM 7U' },
            { value: 'LATID 7D', label: 'LATID 7D' },
            { value: 'OPAMO 7D', label: 'OPAMO 7D' },
            { value: 'PEXEG 7D', label: 'PEXEG 7D' },
            { value: 'SAI 7D', label: 'SAI 7D' },
            { value: 'TULNA 7D', label: 'TULNA 7D' },
            { value: 'VAGPU 7D', label: 'VAGPU 7D' },
            { value: 'VEMBO 7D', label: 'VEMBO 7D' },
            { value: 'VEMBO 7Y', label: 'VEMBO 7Y' },
            { value: 'ANIRO 7Y', label: 'ANIRO 7Y' },
          ]);
        }

        if (selectedTypeofProcedure.includes('APCH')) {
          filteredOptions = filteredOptions.concat([
            { value: 'RNP_Y_RWY27L', label: 'RNP_Y_RWY27L' },
          ]);
        }
        this.optionsProcedureName = filteredOptions;
      }
    });
  }

  loadFIR(event: Event) {
    this.stopPropagation(event);
    const layerName = 'India_FIR';
    if (!this.India_FIR) {
      this.India_FIR = L.tileLayer.wms(
        this.wmsUrl,
        {
          layers: layerName,
          format: 'image/png',
          transparent: true,
        }
      );
      this.airportLayerGroup.clearLayers();
      this.India_FIR.addTo(this.map).bringToFront();
    } else {
      if (this.map.hasLayer(this.India_FIR)) {
        this.map.removeLayer(this.India_FIR);
      } else {
        this.India_FIR.addTo(this.map).bringToFront();
      }
    }
  }










  getFeatureInfo(event: L.LeafletMouseEvent) {
    console.log('Fetching feature info...');

    const bbox = this.map.getBounds().toBBoxString();
    const size = this.map.getSize();
    const point = this.map.latLngToContainerPoint(event.latlng);

    // Create the GetFeatureInfo URL with current filters
    const cqlFilter = this.selectedAirwayId ? `airway_id='${this.selectedAirwayId}'` : '';
    const url = `${this.wmsUrl}?service=WMS&request=GetFeatureInfo&layers=convlinedata&styles=&format=image/png&transparent=true&version=1.1.1&height=${size.y}&width=${size.x}&srs=EPSG:4326&bbox=${bbox}&query_layers=convlinedata&info_format=application/json&x=${Math.floor(point.x)}&y=${Math.floor(point.y)}&_=${Date.now()}${cqlFilter ? '&CQL_FILTER=' + encodeURIComponent(cqlFilter) : ''}`;

    console.log('Constructed GetFeatureInfo URL:', url);

    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        console.log('Response data:', data);
        if (data.features && data.features.length > 0) {
          let popupContent = `<h3>Feature Info</h3>`;
          data.features.forEach((feature: { properties: any; }) => {
            const properties = feature.properties;
            console.log('Feature properties:', properties);  // Log properties for each feature

            if (properties) {
              const displayProperties = [
                'airway_id',
                'start_point',
                'end_point',
                'track_magnetic',
                'reverse_magnetic',
                'radial_distance',
                'upper_limit',
                'lower_limit',
                'airspace',
                'mea',
                'lateral_limits',
                'direction_of_cruising_levels',
                'type',
                'remarks'
              ];
              displayProperties.forEach(prop => {
                if (properties.hasOwnProperty(prop)) {
                  popupContent += `<strong>${prop}:</strong> ${properties[prop]}<br>`;
                }
              });
            } else {
              console.log('No properties found for feature:', feature);
            }
          });

          L.popup()
            .setLatLng(event.latlng)
            .setContent(popupContent)
            .openOn(this.map);
        } else {
          console.log('No features found');
        }
      })
      .catch(error => {
        console.error('Error fetching feature info:', error);
      });
  }

  getNonConvFeatureInfo(event: L.LeafletMouseEvent) {
    console.log('Fetching feature info...');

    const bbox = this.map.getBounds().toBBoxString();
    const size = this.map.getSize();
    const point = this.map.latLngToContainerPoint(event.latlng);

    // Create the GetFeatureInfo URL with current filters
    const cqlFilter = this.selectedAirwayId ? `airway_id='${this.selectedAirwayId}'` : '';
    const url = `${this.wmsUrl}?service=WMS&request=GetFeatureInfo&layers=nonconvlinedata&styles=&format=image/png&transparent=true&version=1.1.1&height=${size.y}&width=${size.x}&srs=EPSG:4326&bbox=${bbox}&query_layers=nonconvlinedata&info_format=application/json&x=${Math.floor(point.x)}&y=${Math.floor(point.y)}&_=${Date.now()}${cqlFilter ? '&CQL_FILTER=' + encodeURIComponent(cqlFilter) : ''}`;

    console.log('Constructed GetFeatureInfo URL:', url);

    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        console.log('Response data:', data);
        if (data.features && data.features.length > 0) {
          let popupContent = `<h3>Feature Info</h3>`;
          data.features.forEach((feature: { properties: any; }) => {
            const properties = feature.properties;
            console.log('Feature properties:', properties);  // Log properties for each feature

            if (properties) {
              const displayProperties = [
                'airway_id',
                'start_point',
                'rnp_type',
                'end_point',
                'track_magnetic',
                'reverse_magnetic',
                'radial_distance',
                'upper_limit',
                'lower_limit',
                'airspace',
                'mea',
                'lateral_limits',
                'direction_of_cruising_levels',
                'type',
              ];
              displayProperties.forEach(prop => {
                if (properties.hasOwnProperty(prop)) {
                  popupContent += `<strong>${prop}:</strong> ${properties[prop]}<br>`;
                }
              });
            } else {
              console.log('No properties found for feature:', feature);
            }
          });

          L.popup()
            .setLatLng(event.latlng)
            .setContent(popupContent)
            .openOn(this.map);
        } else {
          console.log('No features found');
        }
      })
      .catch(error => {
        console.error('Error fetching feature info:', error);
      });
  }

  getWaypointFeatureInfo(event: L.LeafletMouseEvent) {
    console.log('Fetching feature info...');
    const bbox = this.map.getBounds().toBBoxString();
    const size = this.map.getSize();
    const point = this.map.latLngToContainerPoint(event.latlng);
    // Create the GetFeatureInfo URL with current filters
    const cqlFilter = this.selectwaypoint ? `id='${this.selectwaypoint}'` : '';
    console.log(cqlFilter, "dert")
    const url = `${this.wmsUrl}?service=WMS&request=GetFeatureInfo&layers=significantpoints&styles=&format=image/png&transparent=true&version=1.1.1&height=${size.y}&width=${size.x}&srs=EPSG:4326&bbox=${bbox}&query_layers=significantpoints&info_format=application/json&x=${Math.floor(point.x)}&y=${Math.floor(point.y)}&_=${Date.now()}${cqlFilter ? '&CQL_FILTER=' + encodeURIComponent(cqlFilter) : ''}`;
    console.log('Constructed GetFeatureInfo URL:', url);

    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        console.log('Response data:', data);
        if (data.features && data.features.length > 0) {
          let popupContent = `<h3>Waypoint Info</h3>`; // Start with Waypoint Info header
          data.features.forEach((feature: { properties: any; }) => {
            const properties = feature.properties;
            console.log('Feature properties:', properties);  // Log properties for each feature

            if (properties) {
              popupContent += `
                         
                          <strong>Waypoints:</strong> ${properties.waypoints}<br>
                          <strong>Name of Routes:</strong> ${properties.name_of_routes}<br>
                      `;
            }
          });
          // Display the popup with all collected content
          L.popup()
            .setLatLng(event.latlng)
            .setContent(popupContent)
            .openOn(this.map);
        } else {
          console.log('No features found');
        }
      })
      .catch(error => {
        console.error('Error fetching feature info:', error);
      });
  }

  getNavaidFeatureInfo(event: L.LeafletMouseEvent) {
    console.log('Fetching Navaid feature info...');

    const bbox = this.map.getBounds().toBBoxString();
    const size = this.map.getSize();
    const point = this.map.latLngToContainerPoint(event.latlng);

    // Create the GetFeatureInfo URL for the navaiddata layer
    const url = `${this.wmsUrl}?service=WMS&request=GetFeatureInfo&layers=navaids&styles=&format=image/png&transparent=true&version=1.1.1&height=${size.y}&width=${size.x}&srs=EPSG:4326&bbox=${bbox}&query_layers=navaids&info_format=application/json&x=${Math.floor(point.x)}&y=${Math.floor(point.y)}&_=${Date.now()}`;

    console.log('Constructed GetFeatureInfo URL for navaiddata:', url);

    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        console.log('Response data for navaiddata:', data);
        if (data.features && data.features.length > 0) {
          let popupContent = '<h3>Navaid Info</h3>'; // Initialize popup content for navaid data
          data.features.forEach((feature: { properties: any; }) => {
            const properties = feature.properties;
            console.log('Navaid feature properties:', properties); // Log properties for each feature

            if (properties) {
              popupContent += `
                            <strong>Airport ICAO:</strong> ${properties.airport_icao}<br>
                            <strong>Navaid Information:</strong> ${properties.navaid_information}<br>
                        `;
            }
          });

          // Display the popup with navaid data
          L.popup()
            .setLatLng(event.latlng)
            .setContent(popupContent)
            .openOn(this.map);
        } else {
          console.log('No features found for navaiddata');
        }
      })
      .catch(error => {
        console.error('Error fetching navaid feature info:', error);
      });
  }

  getAerodromeObstacleFeatureInfo(event: L.LeafletMouseEvent) {
    console.log('Fetching Aerodrome Obstacle feature info...');

    const bbox = this.map.getBounds().toBBoxString();
    const size = this.map.getSize();
    const point = this.map.latLngToContainerPoint(event.latlng);

    const url = `${this.wmsUrl}?service=WMS&request=GetFeatureInfo&layers=aerodrome_obstacle&styles=&format=image/png&transparent=true&version=1.1.1&height=${size.y}&width=${size.x}&srs=EPSG:4326&bbox=${bbox}&query_layers=aerodrome_obstacle&info_format=application/json&x=${Math.floor(point.x)}&y=${Math.floor(point.y)}&_=${Date.now()}`;

    console.log('Constructed GetFeatureInfo URL for aerodromeobstacle:', url);

    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        console.log('Response data for aerodromeobstacle:', data);
        if (data.features && data.features.length > 0) {
          let popupContent = '<h3>Aerodrome Obstacle Info</h3>'; // Initialize popup content for aerodrome obstacles
          data.features.forEach((feature: { properties: any; }) => {
            const properties = feature.properties;
            console.log('Aerodrome Obstacle feature properties:', properties); // Log properties for each feature

            if (properties) {
              popupContent += `
                      
                        <strong>Airport ICAO:</strong> ${properties.airport_icao || 'N/A'}<br>
                        <strong>Area Affected:</strong> ${properties.area_affected || 'N/A'}<br>
                        <strong>Obstacle Type:</strong> ${properties.obstacle_type || 'N/A'}<br>
                        <strong>Elevation:</strong> ${properties.elevation || 'N/A'}<br>
                        <strong>Marking Light:</strong> ${properties.marking_lgt || 'N/A'}<br>
                        <strong>Remarks:</strong> ${properties.remarks || 'N/A'}<br>
                    `;
            }
          });

          // Display the popup with aerodrome obstacle data
          L.popup()
            .setLatLng(event.latlng)
            .setContent(popupContent)
            .openOn(this.map);
        } else {
          console.log('No features found for aerodromeobstacle');
        }
      })

      .catch(error => {
        console.error('Error fetching aerodrome obstacle feature info:', error);
      });
  }

  getRestrictedAirspaceFeatureInfo(event: L.LeafletMouseEvent) {
    console.log('Fetching Restricted Airspace feature info...');

    const bbox = this.map.getBounds().toBBoxString();
    const size = this.map.getSize();
    const point = this.map.latLngToContainerPoint(event.latlng);

    // Create the GetFeatureInfo URL for the restrictedairspace layer
    const url = `${this.wmsUrl}?service=WMS&request=GetFeatureInfo&layers=restricted_areas&styles=&format=image/png&transparent=true&version=1.1.1&height=${size.y}&width=${size.x}&srs=EPSG:4326&bbox=${bbox}&query_layers=restricted_areas&info_format=application/json&x=${Math.floor(point.x)}&y=${Math.floor(point.y)}&_=${Date.now()}`;

    console.log('Constructed GetFeatureInfo URL for restrictedairspace:', url);

    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        console.log('Response data for restrictedairspace:', data);
        if (data.features && data.features.length > 0) {
          let popupContent = '<h3>Restricted Airspace Info</h3>';
          data.features.forEach((feature: { properties: any; }) => {
            const properties = feature.properties;
            console.log('Restricted Airspace feature properties:', properties);

            if (properties) {
              popupContent += `
                      <strong>Designation:</strong> ${properties.designation || 'N/A'}<br>
                      <strong>Airspace Name:</strong> ${properties.name || 'N/A'}<br>
                      <strong>FIR:</strong> ${properties.fir || 'N/A'}<br>
                      <strong>Type:</strong> ${properties.type || 'N/A'}<br>
                      <strong>Upper Limit:</strong> ${properties.upper_limit || 'N/A'}<br>
                      <strong>Lower Limit:</strong> ${properties.lower_limit || 'N/A'}<br>
                      <strong>Remarks:</strong> ${properties.remarks || 'N/A'}<br>
                  `;
            }
          });

          L.popup()
            .setLatLng(event.latlng)
            .setContent(popupContent)
            .openOn(this.map);
        } else {
          console.log('No features found for restricted airspace');
        }

      })
      .catch(error => {
        console.error('Error fetching restricted airspace feature info:', error);
      });
  }

  getControlAirspaceFeatureInfo(event: L.LeafletMouseEvent) {
    console.log('Fetching Controlled Airspace feature info...');

    const bbox = this.map.getBounds().toBBoxString();
    const size = this.map.getSize();
    const point = this.map.latLngToContainerPoint(event.latlng);

    // Create the GetFeatureInfo URL for the controlairspace layer
    const url = `${this.wmsUrl}?service=WMS&request=GetFeatureInfo&layers=controlairspace&styles=&format=image/png&transparent=true&version=1.1.1&height=${size.y}&width=${size.x}&srs=EPSG:4326&bbox=${bbox}&query_layers=controlairspace&info_format=application/json&x=${Math.floor(point.x)}&y=${Math.floor(point.y)}&_=${Date.now()}`;

    console.log('Constructed GetFeatureInfo URL for controlairspace:', url);

    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        console.log('Response data for controlairspace:', data);
        if (data.features && data.features.length > 0) {
          let popupContent = '<h3>Control Airspace Info</h3>'; // Initialize popup content for control airspace
          data.features.forEach((feature: { properties: any; }) => {
            const properties = feature.properties;
            console.log('Controlled Airspace feature properties:', properties); // Log properties for each feature

            if (properties) {
              // Append the desired properties to the popup content
              popupContent += `
                          <strong>Airspace Center:</strong> ${properties.AirspaceCenter || 'N/A'}<br>
                          <strong>Controlled Airspace Name:</strong> ${properties.ControlledAirspaceName || 'N/A'}<br>
                      `;
            }
          });

          // Display the popup with controlled airspace data
          L.popup()
            .setLatLng(event.latlng)
            .setContent(popupContent)
            .openOn(this.map);
        } else {
          console.log('No features found for controlled airspace');
        }
      })
      .catch(error => {
        console.error('Error fetching controlled airspace feature info:', error);
      });
  }

  applyFilter(event: Event) {
    event.preventDefault();  // Prevent form submission from reloading the page

    // Get the value from the input fields
    const airwayIdInput = (document.getElementById('airwayIdInput') as HTMLInputElement).value;
    const upperLimitInput = (document.getElementById('upperLimitInput') as HTMLInputElement).value;
    const lowerLimitInput = (document.getElementById('lowerLimitInput') as HTMLInputElement).value;
    const meaInput = (document.getElementById('meaInput') as HTMLInputElement).value;
    const airspaceInput = (document.getElementById('airspaceInput') as HTMLSelectElement).value;

    // Trim the inputs and ensure they're valid
    this.selectedAirwayId = airwayIdInput.trim();
    const upperLimit = upperLimitInput.trim() ? `${upperLimitInput.trim()}` : null;
    const lowerLimit = lowerLimitInput.trim() ? `${lowerLimitInput.trim()}` : null;
    const mea = meaInput.trim();
    const airspace = airspaceInput.trim();


    // Apply filter if any of the filter fields are set
    if (this.selectedAirwayId || upperLimit || lowerLimit || mea || airspace) {
      const layerName = 'convlinedata';

      if (this.convLineDataLayer) {
        // If a layer already exists, remove it
        this.map.removeLayer(this.convLineDataLayer);
      }

      // Create the CQL_FILTER based on selected inputs
      let cqlFilter = '';
      if (this.selectedAirwayId) {
        cqlFilter += `airway_id='${this.selectedAirwayId}'`;
      }
      if (upperLimit) {
        cqlFilter += (cqlFilter ? ' AND ' : '') + `upper_limit='${upperLimit}'`;
      }
      if (lowerLimit) {
        cqlFilter += (cqlFilter ? ' AND ' : '') + `lower_limit='${lowerLimit}'`;
      }
      if (mea) {
        cqlFilter += (cqlFilter ? ' AND ' : '') + `mea='${mea}'`;
      }
      if (airspace) {
        cqlFilter += (cqlFilter ? ' AND ' : '') + `airspace='${airspace}'`;
      }

      // Custom parameters with CQL_FILTER for the specific filters
      const customParams = L.Util.extend({
        layers: layerName,
        format: 'image/png',
        transparent: true,
        CQL_FILTER: cqlFilter  // Apply filter for airway_id, upper_limit, lower_limit, mea, and airspace
      }, {});

      // Add the WMS layer with the custom filter applied
      this.convLineDataLayer = L.tileLayer.wms(this.wmsUrl, customParams);

      // Clear the previous layers and add the new one to the map
      this.airportLayerGroup.clearLayers();
      this.convLineDataLayer.addTo(this.map).bringToFront();
      console.log(`WMS Layer added with filter: ${cqlFilter}`);
    } else {
      // If no filter is selected, remove the layer
      if (this.convLineDataLayer) {
        this.map.removeLayer(this.convLineDataLayer);
        console.log('WMS Layer removed because no filters were selected');
      }
    }
  }

  toggleFilterPopup() {
    this.filterPopupVisible = !this.filterPopupVisible;
  }
  activeLayer: 'convlinedata' | 'nonconvlinedata' | null = null;


  // Method to close the filter popup
  closeFilterPopup(event: Event) {
    event.preventDefault(); // Prevent the default anchor click behavior
    this.filterPopupVisible = false; // Close the popup
  }

  loadLayer(event: Event, layerName: string, layerVar: string) {
    this.stopPropagation(event);

    // Check if the layer already exists, if not, create it
    if (!(this as any)[layerVar]) {
      // Create the layer
      (this as any)[layerVar] = L.tileLayer.wms(this.wmsUrl, {
        layers: layerName,
        format: 'image/png',
        transparent: true,
      });

      // Clear the airport layer group and add the new layer
      this.airportLayerGroup.clearLayers();
      (this as any)[layerVar].addTo(this.map).bringToFront();

      // Open the filter popup and set the active layer
      this.filterPopupVisible = true;
      this.activeLayer = layerName as 'convlinedata' | 'nonconvlinedata';
      console.log(`${layerName} layer added to the map`);

      // Add click event based on the layer type
      this.map.on('click', (e: L.LeafletMouseEvent) => {
        this.handleLayerClick(layerName, e);
      });

    } else {
      // Toggle the layer: remove it if it exists, add it if it's removed
      if (this.map.hasLayer((this as any)[layerVar])) {
        // Remove the layer and close the filter popup
        this.map.removeLayer((this as any)[layerVar]);
        this.map.off('click'); // Remove all click events for this layer
        this.filterPopupVisible = false; // Close the filter popup
        this.activeLayer = null; // Reset active layer
        console.log(`${layerName} layer removed from the map`);
      } else {
        // If the layer was removed, add it back to the map and open the filter popup
        (this as any)[layerVar].addTo(this.map).bringToFront();
        this.filterPopupVisible = true; // Open the filter popup
        this.activeLayer = layerName as 'convlinedata' | 'nonconvlinedata';
        console.log(`${layerName} layer brought to the front`);
      }
    }
  }


  applyNonConvFilter(event: Event) {
    event.preventDefault();  // Prevent form submission from reloading the page

    // Get the value from the input fields
    const nonairwayIdInput = (document.getElementById('nonairwayIdInput') as HTMLInputElement).value;
    const nonupperLimitInput = (document.getElementById('nonupperLimitInput') as HTMLInputElement).value;
    const nonlowerLimitInput = (document.getElementById('nonlowerLimitInput') as HTMLInputElement).value;
    const nonmeaInput = (document.getElementById('nonmeaInput') as HTMLInputElement).value;
    const nonairspaceInput = (document.getElementById('nonairspaceInput') as HTMLSelectElement).value;

    // Trim the inputs and ensure they're valid
    this.selectedAirwayId = nonairwayIdInput.trim();
    const upperLimit = nonupperLimitInput.trim() ? `${nonupperLimitInput.trim()}` : null;
    const lowerLimit = nonlowerLimitInput.trim() ? `${nonlowerLimitInput.trim()}` : null;
    const mea = nonmeaInput.trim();
    const airspace = nonairspaceInput.trim();


    // Apply filter if any of the filter fields are set
    if (this.selectedAirwayId || upperLimit || lowerLimit || mea || airspace) {
      const layerName = 'nonconvlinedata';

      if (this.nonConvLineDataLayer) {
        // If a layer already exists, remove it
        this.map.removeLayer(this.nonConvLineDataLayer);
      }

      // Create the CQL_FILTER based on selected inputs
      let cqlFilter = '';
      if (this.selectedAirwayId) {
        cqlFilter += `airway_id='${this.selectedAirwayId}'`;
      }
      if (upperLimit) {
        cqlFilter += (cqlFilter ? ' AND ' : '') + `upper_limit='${upperLimit}'`;
      }
      if (lowerLimit) {
        cqlFilter += (cqlFilter ? ' AND ' : '') + `lower_limit='${lowerLimit}'`;
      }
      if (mea) {
        cqlFilter += (cqlFilter ? ' AND ' : '') + `mea='${mea}'`;
      }
      if (airspace) {
        cqlFilter += (cqlFilter ? ' AND ' : '') + `airspace='${airspace}'`;
      }

      // Custom parameters with CQL_FILTER for the specific filters
      const customParams = L.Util.extend({
        layers: layerName,
        format: 'image/png',
        transparent: true,
        CQL_FILTER: cqlFilter  // Apply filter for airway_id, upper_limit, lower_limit, mea, and airspace
      }, {});

      // Add the WMS layer with the custom filter applied
      this.nonConvLineDataLayer = L.tileLayer.wms(this.wmsUrl, customParams);

      // Clear the previous layers and add the new one to the map
      this.airportLayerGroup.clearLayers();
      this.nonConvLineDataLayer.addTo(this.map).bringToFront();
      console.log(`WMS Layer added with filter: ${cqlFilter}`);
    } else {
      // If no filter is selected, remove the layer
      if (this.nonConvLineDataLayer) {
        this.map.removeLayer(this.nonConvLineDataLayer);
        console.log('WMS Layer removed because no filters were selected');
      }
    }
  }


  handleLayerClick(layerName: string, event: L.LeafletMouseEvent) {
    switch (layerName) {
      case 'convlinedata':
        this.getFeatureInfo(event);
        break;
      case 'nonconvlinedata':
        this.getNonConvFeatureInfo(event);
        break;
      case 'significantpoints':
        this.getWaypointFeatureInfo(event);
        break;
      case 'navaids':
        this.getNavaidFeatureInfo(event);
        break;
      case 'controlairspace':
        this.getControlAirspaceFeatureInfo(event);
        break;
      case 'restricted_areas':
        this.getRestrictedAirspaceFeatureInfo(event);
        break;
      case 'aerodrome_obstacle':
        this.getAerodromeObstacleFeatureInfo(event);
        break;
      default:
        console.warn(`No click handler for layer: ${layerName}`);
    }
  }






























  loadairport(event: Event) {
    this.stopPropagation(event);
    const layerName = 'airportdetails';
    if (!this.airportdetails) {
      this.airportdetails = L.tileLayer.wms(
        this.wmsUrl,
        {
          layers: layerName,
          format: 'image/png',
          transparent: true,
        }
      );
      this.airportLayerGroup.clearLayers();
      this.airportdetails.addTo(this.map).bringToFront();
    } else {
      if (this.map.hasLayer(this.airportdetails)) {
        this.map.removeLayer(this.airportdetails);
      } else {
        this.airportdetails.addTo(this.map).bringToFront();
      }
    }
  }

  loadairway2() {
    const layerName = 'thailandconvlinedata';
    if (!this.Airway2) {
      this.Airway2 = L.tileLayer.wms(
        this.wmsUrl,
        {
          layers: layerName,
          format: 'image/png',
          transparent: true,
        }
      );
      this.airportLayerGroup.clearLayers();
      this.Airway2.addTo(this.map).bringToFront();
    } else {
      if (this.map.hasLayer(this.Airway2)) {
        this.map.removeLayer(this.Airway2);
      } else {
        this.Airway2.addTo(this.map).bringToFront();
      }
    }
  }
  loadthailandenroute() {
    const layerName = 'thailandenroute';
    if (!this.thailandenroute) {
      this.thailandenroute = L.tileLayer.wms(
        this.wmsUrl,
        {
          layers: layerName,
          format: 'image/png',
          transparent: true,
        }
      );
      this.airportLayerGroup.clearLayers();
      this.thailandenroute.addTo(this.map).bringToFront();
    } else {
      if (this.map.hasLayer(this.thailandenroute)) {
        this.map.removeLayer(this.thailandenroute);
      } else {
        this.thailandenroute.addTo(this.map).bringToFront();
      }
    }
  }

  loadFIR1() {
    const layerName = 'FIR';
    if (!this.FIR) {
      this.FIR = L.tileLayer.wms(
        this.wmsUrl,
        {
          layers: layerName,
          format: 'image/png',
          transparent: true,
        }
      );
      this.airportLayerGroup.clearLayers();
      this.FIR.addTo(this.map).bringToFront();
    } else {
      if (this.map.hasLayer(this.FIR)) {
        this.map.removeLayer(this.FIR);
      } else {
        this.FIR.addTo(this.map).bringToFront();
      }
    }
  }


  changeLineColor(color: string) {
    this.lineGeoJsonLayer.setStyle({ color });
    this.airportLayerGroup.setStyle({ color });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }


}