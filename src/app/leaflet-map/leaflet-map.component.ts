import { Component, OnInit } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet-rotatedmarker';

@Component({
  selector: 'app-leaflet-map',
  templateUrl: './leaflet-map.component.html',
  styleUrl: './leaflet-map.component.scss'
})
export class LeafletMapComponent implements OnInit {
  map !: L.Map;
  selectedType: string = 'conv'; // Default type
  menuOpen: boolean = false;
  filterPopupVisible: boolean = false;
  zoomThreshold: number = 8;
  popup: any;
  conventionalAirwaysLayer: any;
  nonConventionalAirwaysLayer: any;
  waypointsPoint: any;
  navaidsData: any;
  controlAirspaceLayer: any;
  restrictedAirspaceLayer: any;

  constructor() { }




  ngOnInit(): void {
    this.initMap()
  }

  onTypeChange(event: any) {
    this.selectedType = event.target.value;
    // Optionally reset filter fields or update UI based on type
  }

  initMap(): void {

    // this.map = L.map('map', {
    //   center: [20.5937, 78.9629],
    //   zoom: 5,

    // });
    if (typeof L === 'undefined') {
      console.error('Leaflet library failed to load.');
      return;
  }
    this.map = L.map('map').setView([0, 0], 2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(this.map);

    this.popup = L.popup({
      autoPan: true,
      
    });
    this.addMapLayers();
    this.map.removeLayer(this.conventionalAirwaysLayer);
    this.map.removeLayer(this.nonConventionalAirwaysLayer);
    this.map.removeLayer(this.waypointsPoint);
    this.map.removeLayer(this.navaidsData);
    this.map.removeLayer(this.controlAirspaceLayer);
    this.map.removeLayer(this.restrictedAirspaceLayer);

   const indiaBounds: L.LatLngBoundsLiteral = [
    [7.96553477623, 68.1766451354], 
    [35.4940095078, 97.4025614766]  
];

// Fit the map to the bounds of India
   this.map.fitBounds(indiaBounds);
  }

  addMapLayers(): void {
    // Define common style for vector layers
    const commonStyle = {
      radius: 5,
      fillColor: 'blue',
      fillOpacity: 1,
      color: 'white',
      weight: 2
    };
  
    // Create a feature group for each layer type
    this.conventionalAirwaysLayer = L.layerGroup();
    this.nonConventionalAirwaysLayer = L.layerGroup();
    this.waypointsPoint = L.layerGroup();
    this.navaidsData = L.layerGroup();
    this.controlAirspaceLayer = L.layerGroup();
    this.restrictedAirspaceLayer = L.layerGroup();
    
  
    // Add the layers to the map
    this.conventionalAirwaysLayer.addTo(this.map);
    this.nonConventionalAirwaysLayer.addTo(this.map);
    this.waypointsPoint.addTo(this.map);
    this.navaidsData.addTo(this.map);
    this.controlAirspaceLayer.addTo(this.map);
    this.restrictedAirspaceLayer.addTo(this.map);
    
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }


  toggleFilterPopup(): void {
    this.filterPopupVisible = !this.filterPopupVisible;
  }

  closePopUp(event: Event): void {
    event.preventDefault(); // Prevent the default action
    this.popup.setPosition(undefined);
  }
  closeFilterPopup(event: Event): void {
    event.preventDefault();
    this.filterPopupVisible = false;
  }


  fetchGeoJSONData(url: string) {
    return fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json();
      })
      .catch(error => {
        console.error('Error fetching data:', error);
        return null;
      });
  }

  loadConvData(event: MouseEvent): void {
    event.stopPropagation();
    const visible = !this.map.hasLayer(this.conventionalAirwaysLayer);
    console.log('Layer visibility:', visible);

    if (visible) {
      console.log('Loading data...');
      const geojsonUrl = 'http://localhost:3002/api/convlinedata';
      this.fetchGeoJSONData(geojsonUrl).then(geojson => {
        if (geojson) {
          this.addGeoJSONToConventionalAirwaysLayer(geojson, this.conventionalAirwaysLayer);
        } else {
          console.error('Failed to load GeoJSON data.');
        }
      });
    } else {
      this.map.removeLayer(this.conventionalAirwaysLayer);
    }
  }

  addGeoJSONToConventionalAirwaysLayer(geojson: any, conventionalAirwaysLayer: any) {

    this.conventionalAirwaysLayer.clearLayers();

    const style = {
      color: 'black',
      weight: 2
    };

    const geojsonLayer = L.geoJSON(geojson, {
      style: style,
      onEachFeature: (feature, layer) => {
        layer.on('click', (event) => {
          this.displayConventionalAirwaysInfo(feature, event.latlng);
        });
      }
    }).addTo(this.map);

    this.map.fitBounds(geojsonLayer.getBounds(), {
      padding: [10, 10], 
      maxZoom: 8 
  });

    // this.createIconFeatures(geojsonLayer.getLayers());

    this.map.addLayer(this.conventionalAirwaysLayer);
    this.map.on('moveend', () => {
      this.updateIconVisibility();
    });
  }

  displayConventionalAirwaysInfo(feature: any, coordinate: any): void {
    if (feature) {
      const properties = feature.properties;
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
        'type'
      ];

      let info = '<h3>Feature Info</h3>';
      displayProperties.forEach(prop => {
        if (properties.hasOwnProperty(prop)) {
          info += `<strong>${prop}:</strong> ${properties[prop]}<br>`;
        }
      });

      // Set popup content and position
      const popup = L.popup()
        .setLatLng(coordinate)
        .setContent(info)
        .openOn(this.map);
    } else {
      this.map.closePopup();
    }
  }

  // createIconFeatures(features: any[]): L.Marker[] {
  //   const iconFeatures: L.Marker[] = [];
  //   const overlapDistance = 100; // Adjust distance as needed

  //   const calculateDistance = (point1: L.LatLng, point2: L.LatLng): number => {
  //     return point1.distanceTo(point2);
  //   };

  //   const findNewPositionAlongLine = (midPoint: L.LatLng, startPoint: L.LatLng, endPoint: L.LatLng, index: number): L.LatLng => {
  //     const directionVector = [
  //       endPoint.lng - startPoint.lng,
  //       endPoint.lat - startPoint.lat
  //     ];
  //     const length = Math.sqrt(directionVector[0] ** 2 + directionVector[1] ** 2);
  //     const unitVector = [directionVector[0] / length, directionVector[1] / length];
  //     const offset = overlapDistance * (index % 2 === 0 ? 1 : -1);
  //     const newLng = midPoint.lng + offset * unitVector[0];
  //     const newLat = midPoint.lat + offset * unitVector[1];
  //     return L.latLng(newLat, newLng);
  //   };

  //   features.forEach((feature: any, index: number) => {
  //     // Handle Leaflet objects like polygons or polylines
  //     if (feature instanceof L.Polyline || feature instanceof L.Polygon) {
  //       let latlngs = feature.getLatLngs();

  //       // Handle the case when latlngs could be nested arrays
  //       if (Array.isArray(latlngs[0])) {
  //         // Flatten the nested arrays (e.g., in case of MultiPolygons or MultiLines)
  //         latlngs = (latlngs as L.LatLng[][]).flat();
  //       }

  //       if (latlngs.length > 1 && 'lat' in latlngs[0] && 'lng' in latlngs[latlngs.length - 1]) {
  //         const startPoint = latlngs[0] as L.LatLng;
  //         const endPoint = latlngs[latlngs.length - 1] as L.LatLng;
  //         const midPoint = L.latLng(
  //           (startPoint.lat + endPoint.lat) / 2,
  //           (startPoint.lng + endPoint.lng) / 2
  //         );

  //         // Dummy angle for leaflet objects, adjust as needed
  //         const angle = 0; 

  //         const marker = L.marker(midPoint, {
  //           icon: L.icon({
  //             iconUrl: 'assets/right-arrow.png',
  //             iconSize: [25, 25], // Adjust size as needed
  //             iconAnchor: [12.5, 12.5],
  //             // rotationAngle: angle
  //           })
  //         });

  //         iconFeatures.push(marker);
  //       } else {
  //         console.warn('Leaflet object has insufficient points or invalid latlngs:', feature);
  //       }
  //     }
  //     // Handle GeoJSON features
  //     else if (feature && feature.geometry && feature.geometry.coordinates) {
  //       const geometry = feature.geometry.coordinates;

  //       if (geometry.length > 1) {
  //         const startPoint = L.latLng(geometry[0][1], geometry[0][0]);
  //         const endPoint = L.latLng(geometry[geometry.length - 1][1], geometry[geometry.length - 1][0]);
  //         const midPoint = L.latLng(
  //           (startPoint.lat + endPoint.lat) / 2,
  //           (startPoint.lng + endPoint.lng) / 2
  //         );

  //         const trackMagnetic = parseFloat(feature.properties.track_magnetic);
  //         const angle = (trackMagnetic - 90) * (Math.PI / 180);

  //         let iconUrl = '';
  //         const directionOfCruisingLevels = feature.properties.direction_of_cruising_levels;
  //         if (directionOfCruisingLevels === 'Forward' || directionOfCruisingLevels === 'Backward') {
  //           iconUrl = 'assets/right-arrow.png';
  //         } else {
  //           iconUrl = 'assets/rectangle.png';
  //         }

  //         const marker = L.marker(midPoint, {
  //           icon: L.icon({
  //             iconUrl,
  //             iconSize: [25, 25],
  //             iconAnchor: [12.5, 12.5],
  //             // rotationAngle: angle
  //           })
  //         });

  //         const overlap = iconFeatures.some((existingMarker: L.Marker) => {
  //           const existingCoords = existingMarker.getLatLng();
  //           const distance = calculateDistance(midPoint, existingCoords);
  //           return distance < overlapDistance;
  //         });

  //         if (!overlap) {
  //           iconFeatures.push(marker);
  //         } else {
  //           const newMidPoint = findNewPositionAlongLine(midPoint, startPoint, endPoint, index);
  //           const newMarker = L.marker(newMidPoint, {
  //             icon: L.icon({
  //               iconUrl,
  //               iconSize: [25, 25],
  //               iconAnchor: [12.5, 12.5],
  //               // rotationAngle: angle
  //             })
  //           });
  //           iconFeatures.push(newMarker);
  //         }
  //       } else {
  //         console.warn('GeoJSON feature geometry has insufficient points:', feature);
  //       }
  //     } else {
  //       console.warn('Invalid feature structure:', feature);
  //     }
  //   });

  //   return iconFeatures;
  // }
  
  updateIconVisibility(): void {
    const zoom = this.map.getZoom(); // Get current zoom level
  
    // Show/hide icons based on zoom level
    if (this.conventionalAirwaysLayer) {
      if (zoom > this.zoomThreshold) {
        this.map.addLayer(this.conventionalAirwaysLayer);  // Show the layer
      } else {
        this.map.removeLayer(this.conventionalAirwaysLayer);  // Hide the layer
      }
    }
  
    if (this.nonConventionalAirwaysLayer) {
      if (zoom > this.zoomThreshold) {
        this.map.addLayer(this.nonConventionalAirwaysLayer);  // Show the layer
      } else {
        this.map.removeLayer(this.nonConventionalAirwaysLayer);  // Hide the layer
      }
    }
  }

  loadNonConvData(event: MouseEvent): void {
    event.stopPropagation();
    const visible = !this.map.hasLayer(this.nonConventionalAirwaysLayer);
    console.log('Layer visibility:', visible);

    if (visible) {
      console.log('Loading data...');
      const geojsonUrl = 'http://localhost:3002/api/nonconvlinedata';
      this.fetchGeoJSONData(geojsonUrl).then(geojson => {
        if (geojson) {
          this.addGeoJSONToNonConventionalAirwaysLayer(geojson, this.nonConventionalAirwaysLayer);
        } else {
          console.error('Failed to load GeoJSON data.');
        }
      });
    } else {
      this.map.removeLayer(this.nonConventionalAirwaysLayer);
    }
  }

  addGeoJSONToNonConventionalAirwaysLayer(geojson: any, nonConventionalAirwaysLayer: any): void {

    this.nonConventionalAirwaysLayer.clearLayers();

    const style = {
      color: 'blue',
      weight: 2
    };

    const geojsonLayer = L.geoJSON(geojson, {
      style: style,
      onEachFeature: (feature, layer) => {
        layer.on('click', (event) => {
          this.displayNonConventionalAirwaysInfo(feature, event.latlng);
        });
      }
    }).addTo(this.map);

    this.map.fitBounds(geojsonLayer.getBounds(), {
      padding: [10, 10],
      maxZoom: 8
    });

    // this.createIconFeatures(geojsonLayer.getLayers());
    this.map.addLayer(this.nonConventionalAirwaysLayer);
    this.map.on('moveend', () => {
      this.updateIconVisibility();
    });
  }

  displayNonConventionalAirwaysInfo(feature: any, coordinate: any): void {

    if (feature) {
      const properties = feature.properties;
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
        'type'
      ];

      let info = '<h3>Feature Info</h3>';
      displayProperties.forEach(prop => {
        if (properties.hasOwnProperty(prop)) {
          info += `<strong>${prop}:</strong> ${properties[prop]}<br>`;
        }
      });

      // Set popup content and position
      const popup = L.popup()
        .setLatLng(coordinate)
        .setContent(info)
        .openOn(this.map);
    } else {
      this.map.closePopup();
    }

  }


  toggleWaypoints(event: MouseEvent): void {
    event.stopPropagation();
    const visible = !this.map.hasLayer(this.waypointsPoint);
    console.log('Layer visibility:', visible);

    if (visible) {
      console.log('Loading data...');
      const geojsonUrl = 'http://localhost:3002/api/waypointdata';
      this.fetchGeoJSONData(geojsonUrl).then(geojson => {
        if (geojson) {
          this.addGeoJSONToWaypointLayerWithIcons(geojson, this.waypointsPoint);
        } else {
          console.error('Failed to load GeoJSON data.');
        }
      });
    } else {
      this.map.removeLayer(this.waypointsPoint);
    }
  }

  addGeoJSONToWaypointLayerWithIcons(geojson: any, layer: any): void {
    const icon = L.icon({
      iconUrl: 'assets/bleach.png',
      iconSize: [10, 10], // Adjust size as needed
      // iconAnchor: [5, 10]
    });

    const geoJsonLayer = L.geoJSON(geojson, {
      pointToLayer: (feature, latlng) => {
        return L.marker(latlng, { icon });
      },
      onEachFeature: (feature, layer) => {
        layer.on('click', (event) => {
          this.displayWaypointInfo(feature, event.latlng);
        });
      }
    }).addTo(this.map);

    this.map.on('change:resolution', () => {
      const zoom = this.map.getZoom();
      geoJsonLayer.eachLayer((layer: any) => {
        const feature = layer.feature;
        if (zoom > 8) {
          layer.bindTooltip(feature.properties, {
            direction: 'top',
            offset: L.point(0, -15)
          }).openTooltip();
        } else {
          layer.unbindTooltip();
        }
      });
    });
  }

  displayWaypointInfo(feature: any, latlng: any): void {
    if (feature) {
      const properties = feature.properties;
      const info = `
      <h3>Waypoint Info</h3>
      <strong>ID:</strong> ${properties.id}<br>
      <strong>Waypoints:</strong> ${properties.waypoints}<br>
      <strong>Name of Routes:</strong> ${properties.name_of_routes}<br>
    `;
      L.popup()
        .setLatLng(latlng)
        .setContent(info)
        .openOn(this.map);
    }
  }

  togglenavaids(event: MouseEvent): void {
    event.stopPropagation();
    const visible = !this.map.hasLayer(this.navaidsData);
    console.log('Layer visibility:', visible);

    if (visible) {
      console.log('Loading data...');
      const geojsonUrl = 'http://localhost:3002/api/navaiddata';
      this.fetchGeoJSONData(geojsonUrl).then(geojson => {
        if (geojson) {
          this.addGeoJSONToNavaidLayerWithIcons(geojson, this.navaidsData);
        } else {
          console.error('Failed to load GeoJSON data.');
        }
      });
    } else {
      this.map.removeLayer(this.navaidsData);
    }
  }

  addGeoJSONToNavaidLayerWithIcons(geojson: any, layer: any): void {

    const icon = L.icon({
      iconUrl: 'assets/navaid_icon.png',
      iconSize: [30, 15], // Adjust size as needed
      iconAnchor: [15, 15]
    });

    L.geoJSON(geojson, {
      pointToLayer: (feature, latlng) => {
        return L.marker(latlng, { icon });
      },
      onEachFeature: (feature, layer) => {
        layer.on('click', (event) => {
          this.displayNavaidInfo(feature, event.latlng);
        });
      }
    }).addTo(this.map);
  }

  displayNavaidInfo(feature: any, coordinate: any): void {

    if (feature) {
      const properties = feature.properties;
      let info = '<h3>Navaid Info</h3>';
      info += `<strong>ID:</strong> ${properties.id}<br>`;
      info += `<strong>Airport ICAO:</strong> ${properties.airport_icao}<br>`;
      info += `<strong>Navaid information:</strong> ${properties.navaid_information}<br>`;


      // Set popup content and position
      const popup = L.popup()
        .setLatLng(coordinate)
        .setContent(info)
        .openOn(this.map);
    } else {
      this.map.closePopup();
    }
  }

  toggleControlAirsapce(event: MouseEvent): void {
    event.stopPropagation();
    const visible = !this.map.hasLayer(this.controlAirspaceLayer);
    console.log('Layer visibility:', visible);

    if (visible) {
      console.log('Loading data...');
      const geojsonUrl = 'http://localhost:3002/api/controlairspace';
      this.fetchGeoJSONData(geojsonUrl).then(geojson => {
        if (geojson) {
          this.addGeoJSONToControlAirspaceLayerWithIcons(geojson, this.controlAirspaceLayer);
        } else {
          console.error('Failed to load GeoJSON data.');
        }
      });
    } else {
      this.map.removeLayer(this.controlAirspaceLayer);
    }

  }

  addGeoJSONToControlAirspaceLayerWithIcons(geojson: any, layer: any): void {

    this.controlAirspaceLayer.clearLayers();

    const style = {
      color: 'purple',
      width: 2,
      fillOpacity: 0 
    };

    const geojsonLayer = L.geoJSON(geojson, {
      style: style,
      onEachFeature: (feature, layer) => {
        layer.on('click', (event) => {
          this.displayControlAirspaceInfo(feature, event.latlng);
        });
      }
      
    }).addTo(this.map);

    const bounds = geojsonLayer.getBounds();
  console.log('Bounds:', bounds); // Debugging line to check bounds

  this.map.fitBounds(bounds, {
    padding: [10, 10],
    maxZoom: 10 // Set to your desired max zoom level
  });
  }

  displayControlAirspaceInfo(feature: any, coordinate: any): void {

    if (feature) {
      const properties = feature.properties;
      let info = '<h3>Control Airspace Info</h3>';
      info += `<strong>ID:</strong> ${properties.id}<br>`;
      info += `<strong>Airspace center:</strong> ${properties.AirspaceCenter}<br>`;
      info += `<strong>Controlled Airspace Name:</strong> ${properties.ControlledAirspaceName}<br>`;

      // Set popup content and position
      const popup = L.popup()
        .setLatLng(coordinate)
        .setContent(info)
        .openOn(this.map);
    } else {
      this.map.closePopup();
    }
  }

  toggleRestrictedAirsapce(event: MouseEvent): void {
    event.stopPropagation();
    const visible = !this.map.hasLayer(this.restrictedAirspaceLayer);

    if (visible) {
      console.log('Loading data...');
      const geojsonUrl = 'http://localhost:3002/api/restrictedairspace';
      this.fetchGeoJSONData(geojsonUrl).then(geojson => {
        if (geojson) {
          this.addGeoJSONToRestrictedAirspaceLayerWithIcons(geojson, this.restrictedAirspaceLayer);
        } else {
          console.error('Failed to load GeoJSON data.');
        }
      });
    } else {
      this.map.removeLayer(this.restrictedAirspaceLayer);
    }
  }

  addGeoJSONToRestrictedAirspaceLayerWithIcons(geojson: any, layer: any): void {

    this.controlAirspaceLayer.clearLayers();

    const style = {
      color: 'red',
      width: 2
    };

    const geojsonLayer = L.geoJSON(geojson, {
      style: style,
      onEachFeature: (feature, layer) => {
        layer.on('click', (event) => {
          this.displayRestrictedAirspaceInfo(feature, event.latlng);
        });
      }
    }).addTo(this.map);

    this.map.fitBounds(geojsonLayer.getBounds(), {
      padding: [10, 10],
      maxZoom: 10
    });

  }

  displayRestrictedAirspaceInfo(feature: any, coordinate: any): void {

    if (feature) {
      const properties = feature.properties;
      let info = '<h3>Restricted Airspace Info</h3>';
      info += `<strong>ID:</strong> ${properties.id}<br>`;
      info += `<strong>Restrictiv Airspace Desgination:</strong> ${properties.RestrictivAirspaceDesgination}<br>`;
      info += `<strong>Multiple Code:</strong> ${properties.MultipleCode}<br>`;

      // Set popup content and position
      const popup = L.popup()
        .setLatLng(coordinate)
        .setContent(info)
        .openOn(this.map);
    } else {
      this.map.closePopup();
    }
  }
}
