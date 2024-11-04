import { Component, OnInit } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet-rotatedmarker';
import 'leaflet.markercluster';


@Component({
  selector: 'app-leaflet-map',
  templateUrl: './leaflet-map.component.html',
  styleUrls: ['./leaflet-map.component.scss']
})
export class LeafletMapComponent implements OnInit {
  map !: L.Map;
  selectedType!: string; // Set default type to 'Conv'
  airspaceOptions: string[] = ['Class A', 'Class B', 'Class C', 'Class D', 'Class E']; // Add your airspace options here
  menuOpen: boolean = false;
  filterPopupVisible: boolean = false;
  zoomThreshold: number = 8;
  popup: any;
  conventionalAirwaysLayer: any;
  nonConventionalAirwaysLayer: any;
  waypointsPoint: any;
  navaidsData: any;
  aerodromeData: any;
  controlAirspaceLayer: any;
  restrictedAirspaceLayer: any;
  convGeojsonData: any = null;
  nonconvGeojsonData: any = null;
  minZoom: number = 10;
  maxZoom: number = 15;
  isConvLayerVisible: boolean = true;
  isNonConvLayerVisible: boolean = true;
  private convIconLayerGroup: L.LayerGroup
  private nonConvIconLayerGroup: L.LayerGroup
  private onZoomEndHandler !: () => void;
  private loadedMarkersCount = 500;
  initialMarkersLoaded: boolean = false;
  private loadedFeatures: Set<number> = new Set();
 
 
  constructor() {
    this.conventionalAirwaysLayer = L.layerGroup();
    this.nonConventionalAirwaysLayer = L.layerGroup();
    this.convIconLayerGroup = L.layerGroup();
    this.nonConvIconLayerGroup = L.layerGroup();
  }
 
  ngOnInit(): void {
    this.initMap();
  }
 
  initMap(): void {
    const subdomains = ['mt0', 'mt1', 'mt2', 'mt3'];
    const maxZoom = 20;
    const attribution = '© <a href="https://www.cognitivenavigation.com/privacy-policy/">Cognitive Navigation</a> | <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
 
    if (typeof L === 'undefined') {
      console.error('Leaflet library failed to load.');
      return;
    }
 
    this.map = L.map('map').setView([0, 0], 2);
    L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', { subdomains, attribution }).addTo(this.map);
 
    this.popup = L.popup({ autoPan: true });
 
    this.addMapLayers();
    // Remove default layers after adding them
    this.map.removeLayer(this.conventionalAirwaysLayer);
    this.map.removeLayer(this.nonConventionalAirwaysLayer);
    this.map.removeLayer(this.waypointsPoint);
    this.map.removeLayer(this.navaidsData);
    this.map.removeLayer(this.controlAirspaceLayer);
    this.map.removeLayer(this.restrictedAirspaceLayer);
    this.map.removeLayer(this.aerodromeData);
 
 
    const indiaBounds: L.LatLngBoundsLiteral = [
      [7.96553477623, 68.1766451354],
      [35.4940095078, 97.4025614766]
    ];
 
    this.map.fitBounds(indiaBounds);
  }
 
  addMapLayers(): void {
    const commonStyle = {
      radius: 5,
      fillColor: 'blue',
      fillOpacity: 1,
      color: 'white',
      weight: 2
    };
 
    this.conventionalAirwaysLayer = L.layerGroup();
    this.nonConventionalAirwaysLayer = L.layerGroup();
    this.waypointsPoint = L.layerGroup();
    this.navaidsData = L.layerGroup();
    this.controlAirspaceLayer = L.layerGroup();
    this.restrictedAirspaceLayer = L.layerGroup();
    this.aerodromeData = L.layerGroup();
 
    this.conventionalAirwaysLayer.addTo(this.map);
    this.nonConventionalAirwaysLayer.addTo(this.map);
    this.waypointsPoint.addTo(this.map);
    this.navaidsData.addTo(this.map);
    this.controlAirspaceLayer.addTo(this.map);
    this.restrictedAirspaceLayer.addTo(this.map);
    this.aerodromeData.addTo(this.map);
  }
 
  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }
 
  toggleFilterPopup(): void {
    this.filterPopupVisible = !this.filterPopupVisible;
  }
 
  closePopUp(event: Event): void {
    event.preventDefault();
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
    this.isConvLayerVisible = !this.isConvLayerVisible;
    event.stopPropagation();
    console.log("wert")
    this.selectedType = 'Conv';
 
    // Toggle visibility of the conventional airways layer
    const isVisible = this.map.hasLayer(this.conventionalAirwaysLayer);
 
    if (!isVisible) {
      const geojsonUrl = 'http://localhost:3004/api/convlinedata';
      this.fetchGeoJSONData(geojsonUrl).then(geojson => {
        if (geojson) {
          // Store full GeoJSON data for filtering later
          this.convGeojsonData = geojson;
 
          // Add the full dataset to the map initially
          this.addGeoJSONToConventionalAirwaysLayer(this.convGeojsonData, this.conventionalAirwaysLayer);
        } else {
          console.error('Failed to load GeoJSON data.');
        }
      });
    } else {
 
      // If not visible, remove the layer from the map
      this.map.removeLayer(this.conventionalAirwaysLayer);
      this.convIconLayerGroup.clearLayers(); // Clear icons when layer is hidden
      this.map.removeLayer(this.convIconLayerGroup);
    }
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
 
  applyConvFilter(
    airwayId: string,
    upperLimit: string,
    lowerLimit: string,
    airspace: string,
    mea: string,
 
  ): void {
    // Clear the existing layer before applying the filter
    this.conventionalAirwaysLayer.clearLayers();
    this.convIconLayerGroup.clearLayers(); // Clear previous icons
 
    if (this.convGeojsonData) {
      // Filter based on all the provided criteria
      const filteredGeojson = {
        ...this.convGeojsonData,
        features: this.convGeojsonData.features.filter((feature: any) => {
          const properties = feature.properties;
 
          // Apply multiple conditions, empty values will not filter by that field
          const matchesAirwayId = !airwayId || properties.airway_id === airwayId;
          const matchesUpperLimit = !upperLimit || properties.upper_limit === upperLimit;
          const matchesLowerLimit = !lowerLimit || properties.lower_limit === lowerLimit;
          const matchesAirspace = !airspace || properties.airspace === airspace;
          const matchesMea = !mea || properties.mea === mea;
 
          // Return only features matching all criteria
          return matchesAirwayId && matchesUpperLimit &&
            matchesLowerLimit && matchesMea && matchesAirspace;
        })
      };
 
      // Add the filtered data to the layer
      this.addGeoJSONToConventionalAirwaysLayer(filteredGeojson, this.conventionalAirwaysLayer);
    }
  }
 
  addGeoJSONToMap(geojson: any, layerType: any): void {
    const geoJsonData = L.geoJSON(geojson, {
      style: function (feature) {
        return {
          color: 'red', // Define your style here
          weight: 2
        };
      },
      onEachFeature: (feature, layer) => {
        layer.on('click', (event) => {
          if (layerType === this.conventionalAirwaysLayer) {
            this.displayConventionalAirwaysInfo(feature, event.latlng);
          }
          else if (layerType === this.nonConventionalAirwaysLayer) {
            this.displayNonConventionalAirwaysInfo(feature, event.latlng);
          }
        });
      },
      pointToLayer: function (feature, latlng) {
        // Create an invisible marker
        return L.marker(latlng, {
          icon: L.divIcon({
            iconSize: [0, 0],
          })
        });
      }
    }).addTo(this.map);
 
    // // Fit the map to the bounds of the geoJSON data
    this.map.fitBounds(geoJsonData.getBounds(), {
      padding: [50, 50],
      maxZoom: 20
    });
  }
 
  addGeoJSONToConventionalAirwaysLayer(geojson: any, conventionalAirwaysLayer: any) {
    // Clear the existing layer
    conventionalAirwaysLayer.clearLayers(); // Ensure we are clearing the layer properly
    // this.iconLayerGroup.clearLayers(); // Clear previous icons
 
    const style = {
      color: 'black',
      weight: 1
    };
 
    // Create a new GeoJSON layer with the filtered or full dataset
    const geojsonLayer = L.geoJSON(geojson, {
      style: style,
      onEachFeature: (feature, layer) => {
        layer.on('click', (event) => {
          this.displayConventionalAirwaysInfo(feature, event.latlng);
        });
      },
    });
 
    // Add the new GeoJSON layer to the conventionalAirwaysLayer
    conventionalAirwaysLayer.addLayer(geojsonLayer);
 
    const features = geojsonLayer.getLayers(); // Get features from your source
    const iconFeatures = this.createIconFeatures(features);
 
    // Add icons to the iconLayerGroup instead of the map directly
    iconFeatures.forEach(iconFeature => {
      iconFeature.setOpacity(0);
      this.convIconLayerGroup.addLayer(iconFeature);
    });
 
    // Add the conventionalAirwaysLayer to the map
    this.map.addLayer(conventionalAirwaysLayer);
    this.convIconLayerGroup.addTo(this.map); // Ensure the icon layer is added to the map
 
    // Fit the map to the bounds of the displayed data
    this.map.fitBounds(geojsonLayer.getBounds(), {
      padding: [10, 10],
      maxZoom: 6
    });
 
    // Update visibility of icons based on zoom level
    this.map.on('moveend', () => {
      this.updateConvIconVisibility();
    });
  }
 
  createIconFeatures(features: any[]): any[] {
    const iconFeatures: any[] = [];
    const overlapDistance = 100; // Adjust this value as needed
 
    const calculateDistance = (point1: L.LatLng, point2: L.LatLng): number => {
      return point1.distanceTo(point2);
    };
 
    const findNewPositionAlongLine = (midPoint: L.LatLng, startPoint: L.LatLng, endPoint: L.LatLng, index: number): L.LatLng => {
      const directionVector = [
        endPoint.lng - startPoint.lng,
        endPoint.lat - startPoint.lat
      ];
      const length = Math.sqrt(directionVector[0] ** 2 + directionVector[1] ** 2);
      const unitVector = [directionVector[0] / length, directionVector[1] / length];
      const offset = overlapDistance * (index % 2 === 0 ? 1 : -1);
 
      // Adjust for y offset of 20 pixels (approximately equal to ~0.00018 degrees)
      const verticalOffset = 0.00018; // Adjust this value as needed for accuracy
 
      const newLng = midPoint.lng + offset * unitVector[0];
      const newLat = midPoint.lat + offset * unitVector[1] - verticalOffset; // Move down by verticalOffset
      return L.latLng(newLat, newLng);
    };
 
    features.forEach((feature, index: number) => {
      const actualFeature = feature.feature ? feature.feature : feature;
      const coordinates = actualFeature.geometry.coordinates;
 
      const startPoint = L.latLng(coordinates[0][1], coordinates[0][0]);
      const endPoint = L.latLng(coordinates[coordinates.length - 1][1], coordinates[coordinates.length - 1][0]);
      const bounds = L.latLngBounds([startPoint, endPoint]);
      const midPoint = bounds.getCenter();
 
      const properties = actualFeature.properties;
      const trackMagnetic = parseFloat(properties.track_magnetic);
      const angle = (trackMagnetic - 90) * (Math.PI / 180);
 
      // Determine if the angle requires rotation for the airway ID
      const rotationAngle = angle * (180 / Math.PI); // Convert to degrees
      const shouldRotateId = rotationAngle > 90 || rotationAngle < -90;
 
      // Determine the icon URL based on direction
      const directionOfCruisingLevels = properties.direction_of_cruising_levels || 'None';
      const iconUrl = (directionOfCruisingLevels === 'Forward' || directionOfCruisingLevels === 'Backward')
        ? 'assets/right-arrow.png'
        : 'assets/rectangle.png';
 
      const airwayId = properties.airway_id;
      const radialDistance = properties.radial_distance || 'N/A';
      const MEA = properties.mea || 'N/A';
 
      // First icon for airway ID
      const customIcon = L.divIcon({
        className: 'custom-icon',
        html: `
          <div style="position: relative; width: 30px; height: 30px; text-align: center;">
            <img src="${iconUrl}" style="width: 100%; height: 100%; position: absolute; top: 14px; left: 0;" />
            <div style="position: absolute; top: 22px; left: 50%; transform: translate(-50%, 0) ${shouldRotateId ? 'rotate(180deg)' : ''}; color: white; font-weight: bold; font-size: 8px; z-index: 1;">
              ${airwayId}
            </div>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -16]
      });
 
      // Second icon for radial distance
      const customIcon1 = L.divIcon({
        className: 'custom-icon',
        html: `
          <div style="position: relative; width: 30px; height: 30px; text-align: center;">
            <div style="position: absolute; top: 40px; left: 50%; transform: translate(-50%, 0) ${shouldRotateId ? 'rotate(180deg)' : ''}; color: black; font-weight: bold; font-size: 8px; z-index: 1;white-space: nowrap;">
              ${radialDistance}
            </div>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -16]
      });
 
      // 3rd icon for radial distance
      const customIcon2 = L.divIcon({
        className: 'custom-icon',
        html: `
          <div style="position: relative; width: 30px; height: 30px; text-align: center;">
            <div style="position: absolute; bottom: 12px; left: 50%; transform: translate(-50%, 0) ${shouldRotateId ? 'rotate(180deg)' : ''}; color: black; font-weight: bold; font-size: 8px; z-index: 1;white-space: nowrap;">
              ${MEA}
            </div>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -16]
      });
 
      // Create the marker for the airway ID
      const iconFeature = L.marker(midPoint, {
        icon: customIcon,
        rotationAngle: rotationAngle
      }).addTo(this.map);
 
      // Create the marker for the radial distance
      const iconFeature1 = L.marker(midPoint, {
        icon: customIcon1,
        rotationAngle: rotationAngle
      }).addTo(this.map);
 
      // Create the marker for the mea
      const iconFeature2 = L.marker(midPoint, {
        icon: customIcon2,
        rotationAngle: rotationAngle
      }).addTo(this.map);
 
      const overlap = iconFeatures.some(existingFeature => {
        const existingCoords = existingFeature.getLatLng();
        const distance = calculateDistance(midPoint, existingCoords);
        return distance < overlapDistance;
      });
 
      if (!overlap) {
        iconFeatures.push(iconFeature);
        iconFeatures.push(iconFeature1);
        iconFeatures.push(iconFeature2);
      } else {
        const newMidPoint = findNewPositionAlongLine(midPoint, startPoint, endPoint, index);
        iconFeature.setLatLng(newMidPoint); // Adjust the first marker position to avoid overlap
        iconFeature1.setLatLng(newMidPoint); // Adjust the second marker position as well
        iconFeature2.setLatLng(newMidPoint); // Adjust the 3rd marker position as well
        iconFeatures.push(iconFeature);
        iconFeatures.push(iconFeature1);
        iconFeatures.push(iconFeature2);
      }
    });
 
    return iconFeatures;
  }
 
 
  loadNonConvData(event: MouseEvent): void {
    this.isNonConvLayerVisible = !this.isNonConvLayerVisible;
    event.stopPropagation();
    this.selectedType = 'Non Conv'; // Update this line
 
    // Toggle visibility of the conventional airways layer
    const visible = !this.map.hasLayer(this.nonConventionalAirwaysLayer);
 
    if (visible) {
      const geojsonUrl = 'http://localhost:3002/api/nonconvlinedata';
      this.fetchGeoJSONData(geojsonUrl).then(geojson => {
        if (geojson) {
          // Store full GeoJSON data for filtering later
          this.nonconvGeojsonData = geojson;
 
          // Add the full dataset to the map initially
          this.addGeoJSONToNonConventionalAirwaysLayer(this.nonconvGeojsonData, this.nonConventionalAirwaysLayer);
        } else {
          console.error('Failed to load GeoJSON data.');
        }
      });
    } else {
      // If not visible, remove the layer from the map
      this.map.removeLayer(this.nonConventionalAirwaysLayer);
      this.nonConvIconLayerGroup.clearLayers(); // Clear icons when layer is hidden
      this.nonConvIconLayerGroup.remove(); // Remove the icon layer group
    }
  }
 
  displayNonConventionalAirwaysInfo(feature: any, coordinate: any): void {
 
    if (feature) {
      const properties = feature.properties;
      const displayProperties = [
        'airway_id',
        'rnp_type',
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
 
  applyNonConvFilter(
    airwayId: string,
    upperLimit: string,
    lowerLimit: string,
    airspace: string,
    mea: string,
 
  ): void {
    // Clear the existing layer before applying the filter
    this.nonConventionalAirwaysLayer.clearLayers();
    this.nonConvIconLayerGroup.clearLayers();
 
    if (this.nonconvGeojsonData) {
      // Filter based on all the provided criteria
      const filteredGeojson = {
        ...this.nonconvGeojsonData,
        features: this.nonconvGeojsonData.features.filter((feature: any) => {
          const properties = feature.properties;
 
          // Apply multiple conditions, empty values will not filter by that field
          const matchesAirwayId = !airwayId || properties.airway_id === airwayId;
          const matchesUpperLimit = !upperLimit || properties.upper_limit === upperLimit;
          const matchesLowerLimit = !lowerLimit || properties.lower_limit === lowerLimit;
          const matchesAirspace = !airspace || properties.airspace === airspace;
          const matchesMea = !mea || properties.mea === mea;
 
          // Return only features matching all criteria
          return matchesAirwayId && matchesUpperLimit &&
            matchesLowerLimit && matchesMea && matchesAirspace;
        })
      };
 
      // Add the filtered data to the layer
      this.addGeoJSONToNonConventionalAirwaysLayer(filteredGeojson, this.nonConventionalAirwaysLayer);
    }
  }
 
  addGeoJSONToNonConventionalAirwaysLayer(geojson: any, nonConventionalAirwaysLayer: any) {
    // Clear the existing layer
    nonConventionalAirwaysLayer.clearLayers(); // Ensure we are clearing the layer properly
    // this.iconLayerGroup.clearLayers(); // Clear previous icons
 
    const style = {
      color: 'blue',
      weight: 1
    };
 
    // Create a new GeoJSON layer with the filtered or full dataset
    const geojsonLayer = L.geoJSON(geojson, {
      style: style,
      onEachFeature: (feature, layer) => {
        layer.on('click', (event) => {
          this.displayNonConventionalAirwaysInfo(feature, event.latlng);
        });
      }
    });
 
    // Add the new GeoJSON layer to the conventionalAirwaysLayer
    nonConventionalAirwaysLayer.addLayer(geojsonLayer);
 
    const features = geojsonLayer.getLayers(); // Get features from your source
    const iconFeatures = this.createIconFeatures(features);
 
    // Add icons to the iconLayerGroup instead of the map directly
    iconFeatures.forEach(iconFeature => {
      iconFeature.setOpacity(0);
      this.nonConvIconLayerGroup.addLayer(iconFeature);
    });
 
    // Add the conventionalAirwaysLayer to the map
    this.map.addLayer(nonConventionalAirwaysLayer);
    this.nonConvIconLayerGroup.addTo(this.map); // Ensure the icon layer is added to the map
 
    // Fit the map to the bounds of the displayed data
    this.map.fitBounds(geojsonLayer.getBounds(), {
      padding: [10, 10],
      maxZoom: 6
    });
 
    // Update visibility of icons based on zoom level
    this.map.on('moveend', () => {
      this.updateNonconvIconVisibility();
    });
  }
 
 
  updateConvIconVisibility(): void {
    const zoomLevel = this.map.getZoom();
    const zoomThreshold = this.zoomThreshold; // Use your existing threshold for clarity
 
    if (zoomLevel > zoomThreshold) {
      // Show icons if the zoom level exceeds the threshold
      // if (areConvVisible || areNonConvVisible) {
      this.convIconLayerGroup.eachLayer((layer: L.Layer) => {
        if (layer instanceof L.Marker) {
          // Now you can safely treat 'layer' as a L.Marker
          layer.setOpacity(1); // Set to full opacity to show
        }
      });
      // Add icon layer to the map if not already present
      if (!this.map.hasLayer(this.convIconLayerGroup)) {
        this.convIconLayerGroup.addTo(this.map);
      }
      // }
    } else {
      // Hide icons if zoom level is below the threshold
      if (this.map.hasLayer(this.convIconLayerGroup)) {
        this.convIconLayerGroup.eachLayer((layer: L.Layer) => {
          if (layer instanceof L.Marker) {
            layer.setOpacity(0); // Set to zero opacity to hide
          }
        });
        this.convIconLayerGroup.remove(); // Optionally remove the icon layer if not needed
      }
    }
  }
 
 
  updateNonconvIconVisibility(): void {
    const zoomLevel = this.map.getZoom();
    const zoomThreshold = this.zoomThreshold; // Use your existing threshold for clarity
 
    if (zoomLevel > zoomThreshold) {
      // Show icons if the zoom level exceeds the threshold
      // if (areConvVisible || areNonConvVisible) {
      this.nonConvIconLayerGroup.eachLayer((layer: L.Layer) => {
        if (layer instanceof L.Marker) {
          // Now you can safely treat 'layer' as a L.Marker
          layer.setOpacity(1); // Set to full opacity to show
        }
      });
      // Add icon layer to the map if not already present
      if (!this.map.hasLayer(this.nonConvIconLayerGroup)) {
        this.nonConvIconLayerGroup.addTo(this.map);
      }
      // }
    } else {
      // Hide icons if zoom level is below the threshold
      if (this.map.hasLayer(this.nonConvIconLayerGroup)) {
        this.nonConvIconLayerGroup.eachLayer((layer: L.Layer) => {
          if (layer instanceof L.Marker) {
            layer.setOpacity(0); // Set to zero opacity to hide
          }
        });
        this.nonConvIconLayerGroup.remove(); // Optionally remove the icon layer if not needed
      }
    }
  }
 
  toggleWaypoints(event: MouseEvent): void {
    event.stopPropagation();
    // Check if the layer is already on the map
    const visible = this.map.hasLayer(this.waypointsPoint);
 
    if (visible) {
      // If the layer is visible, remove it from the map
 
      this.map.removeLayer(this.waypointsPoint);
    } else {
      // If the layer is not visible, load and add the GeoJSON data
      const geojsonUrl = 'http://localhost:3002/api/waypointdata';
      this.fetchGeoJSONData(geojsonUrl).then(geojson => {
        if (geojson) {
          this.addGeoJSONToWaypointLayerWithIcons(geojson, this.waypointsPoint);
          this.waypointsPoint.addTo(this.map); // Add the layer group to the map
        } else {
          console.error('Failed to load GeoJSON data.');
        }
      });
    }
  }
 
 
  addGeoJSONToWaypointLayerWithIcons(geojson: any, layer: any): void {
    const icon = L.icon({
      iconUrl: 'assets/bleach.png',
      iconSize: [10, 10], // Adjust size as needed
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
    });
 
    layer.clearLayers(); // Ensure the layer is cleared before adding new data
    layer.addLayer(geoJsonLayer); // Add the GeoJSON layer to the layer group
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
 

  toggleAerodromeAirspace(event: MouseEvent): void {
    event.stopPropagation();
    const visible = this.map.hasLayer(this.aerodromeData);
    console.log('Layer visibility:', visible);
 
    if (visible) {
      this.map.removeLayer(this.aerodromeData);
    } else {
      console.log('Loading aerodrome data...');
      const geojsonUrl = 'http://localhost:3002/api/aerodromeobstacle';
      this.fetchGeoJSONData(geojsonUrl).then(geojson => {
        if (geojson && geojson.features.length > 0) {
          this.loadInitialGeojsonData(geojson);
        } else {
          console.error('Failed to load or empty GeoJSON data.');
        }
      });
    }
  }
 
  // Load array function to shuffle the GeoJSON features
loadArray(array: any[]): any[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
 
loadInitialGeojsonData(geojson: any): void {
  const icon = L.icon({
    iconUrl: 'assets/navaid_icon.png',
    iconSize: [30, 15], // Adjust as needed
    iconAnchor: [15, 15]
  });
 
  // Clear any previous markers if needed
  if (this.aerodromeData.getLayers().length > 0) {
    this.aerodromeData.clearLayers();
  }
 
  // Shuffle the features and load the first 700 markers
  const loadFeatures = this.loadArray(geojson.features);
  const initialFeatures = loadFeatures.slice(0, 700); // Load 700 initially
  this.addGeoJSONToAerodromeLayerWithIcons(initialFeatures, icon, this.aerodromeData);
 
  // Add initial features to the map
  this.aerodromeData.addTo(this.map);
 
  // Add zoom level listener to progressively load more markers
  this.map.on('zoomend', () => {
    const zoomLevel = this.map.getZoom();
 
    // Load more features based on zoom level
    if (zoomLevel >= 5 && zoomLevel < 6) {
      this.loadMoreMarkers(geojson, icon, 700, 1400);  // Load markers from 700 to 1400
    } else if (zoomLevel >= 6 && zoomLevel < 7) {
      this.loadMoreMarkers(geojson, icon, 1400, 2100);  
    } else if (zoomLevel >= 7 && zoomLevel < 8) {
      this.loadMoreMarkers(geojson, icon, 2100, 2800);  
    }else if (zoomLevel >= 8) {
      this.loadMoreMarkers(geojson, icon, 2800, geojson.features.length);  
    }
  });
}

 
  loadMoreMarkers(geojson: any, icon: any, startIndex: number, endIndex: number): void {
    // Load more features between the given index range
    const moreFeatures = geojson.features.slice(startIndex, endIndex);
    this.addGeoJSONToAerodromeLayerWithIcons(moreFeatures, icon, this.aerodromeData);
  }
 
  addGeoJSONToAerodromeLayerWithIcons(features: any[], icon: any, layer: any): void {
    const geoJsonLayer = L.geoJSON(features, {
      pointToLayer: (feature, latlng) => {
        return L.marker(latlng, { icon });
      },
      onEachFeature: (feature, layer) => {
        layer.on('click', (event) => {
          this.displayAerodromeInfo(feature, event.latlng);
        });
      },
    });
 
    layer.clearLayers(); // Clear previous data
    layer.addLayer(geoJsonLayer);
  }
 
 
  displayAerodromeInfo(feature: any, coordinate: any): void {
    if (feature) {
      const properties = feature.properties;
      let info = '<h3>Aerodrome Info</h3>';
      info += `<strong>ID:</strong> ${properties.id}<br>`; // Show ID in the popup
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
 