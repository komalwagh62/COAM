import { Component, OnInit } from '@angular/core';
declare var ol: any;
 
@Component({
  selector: 'app-map-viewer',
  templateUrl: './map-viewer.component.html',
  styleUrls: ['./map-viewer.component.scss']
})
export class MapViewerComponent implements OnInit {
  trackMagnetic: string = '';
  airwayId: string = '';
  upperLimit: string = '';
  lowerLimit: string = '';
  mea: string = '';
  lateralLimits: string = '';
  map: any;
  vectorLayer: any;
  iconLayer: any;
  conventionalAirwaysLayer: any;
  nonConventionalAirwaysLayer: any;
  waypointsPoint: any;
  navaidsData: any;
  controlAirspaceLayer: any;
  restrictedAirspaceLayer: any;
  aerodromeObstacleLayer: any;
  conventionalIconLayer: any;
  nonConventionalIconLayer: any;
  popup: any;
  filterPopupVisible: boolean = false;
  menuOpen: boolean = false;
  zoomThreshold: number = 8;
  selectedType: string = 'conv'; // Default type
  constructor() { }
 
  ngOnInit(): void {
    this.initMap();
  }
  onTypeChange(event: any) {
    this.selectedType = event.target.value;
    // Optionally reset filter fields or update UI based on type
  }
 
  applyFilters() {
    this.filterAndShowFeatures(this.selectedType, this.trackMagnetic, this.airwayId, this.upperLimit, this.lowerLimit, this.mea, this.lateralLimits);
  }
  initMap(): void {
    if (typeof ol === 'undefined') {
      console.error('OpenLayers library failed to load.');
      return;
    }
 
    this.map = new ol.Map({
      view: new ol.View({
        center: [0, 0],
        zoom: 2
      }),
      layers: [
        new ol.layer.Tile({
          source: new ol.source.OSM()
        })
      ],
      target: 'map'
    });
 
    this.popup = new ol.Overlay({
      element: document.getElementById('popup'),
      autoPan: true,
      autoPanAnimation: { duration: 250 }
    });
    this.map.addOverlay(this.popup);
 
    this.addMapLayers();
    this.conventionalAirwaysLayer.setVisible(false);
    this.nonConventionalAirwaysLayer.setVisible(false);
    this.waypointsPoint.setVisible(false);
    this.navaidsData.setVisible(false);
    this.controlAirspaceLayer.setVisible(false);
    this.restrictedAirspaceLayer.setVisible(false);
    this.aerodromeObstacleLayer.setVisible(false);
    // Fit map to the bounds of India
    const indiaExtent = ol.proj.transformExtent(
      [68.1766451354, 7.96553477623, 97.4025614766, 35.4940095078],
      'EPSG:4326',
      this.map.getView().getProjection()
    );
    this.map.getView().fit(indiaExtent, { size: this.map.getSize() });
  }
 
  addMapLayers(): void {
    // Define common style for vector layers
    const commonStyle = new ol.style.Style({
      image: new ol.style.Circle({
        radius: 5,
        fill: new ol.style.Fill({ color: 'blue' }),
        stroke: new ol.style.Stroke({ color: 'white', width: 2 })
      })
    });
 
    this.conventionalAirwaysLayer = new ol.layer.Vector({
      source: new ol.source.Vector(),
      style: commonStyle
    });
 
    this.nonConventionalAirwaysLayer = new ol.layer.Vector({
      source: new ol.source.Vector(),
      style: commonStyle
    });
 
    this.waypointsPoint = new ol.layer.Vector({
      source: new ol.source.Vector(),
      style: commonStyle
    });
 
    this.navaidsData = new ol.layer.Vector({
      source: new ol.source.Vector(),
      style: new ol.style.Style({
        image: new ol.style.Circle({
          radius: 5,
          fill: new ol.style.Fill({ color: 'green' }),
          stroke: new ol.style.Stroke({ color: 'white', width: 2 })
        })
      })
    });
 
    this.controlAirspaceLayer = new ol.layer.Vector({
      source: new ol.source.Vector(),
      style: commonStyle
    });
 
    this.restrictedAirspaceLayer = new ol.layer.Vector({
      source: new ol.source.Vector(),
      style: new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: 'red',
          width: 2,
          lineDash: [10, 10]
        }),
        fill: new ol.style.Fill({ color: 'rgba(255, 0, 0, 0.2)' })
      })
    });
 
    this.aerodromeObstacleLayer = new ol.layer.Vector({
      source: new ol.source.Vector(),
      style: new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: 'green',
          width: 2,
          lineDash: [10, 10]
        }),
        fill: new ol.style.Fill({ color: 'rgba(255, 0, 0, 0.2)' })
      })
    });
 
    // Add layers to the map
    this.map.addLayer(this.conventionalAirwaysLayer);
    this.map.addLayer(this.nonConventionalAirwaysLayer);
    this.map.addLayer(this.waypointsPoint);
    this.map.addLayer(this.navaidsData);
    this.map.addLayer(this.controlAirspaceLayer);
    this.map.addLayer(this.restrictedAirspaceLayer);
    this.map.addLayer(this.aerodromeObstacleLayer);
  }
 
  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }
 
  toggleFilterPopup(): void {
    this.filterPopupVisible = !this.filterPopupVisible;
  }
 
  fetchGeoJSONData(url: string): Promise<any> {
    return fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json();
      })
      .then(data => {
        return data;
      })
      .catch(error => {
        console.error('Error fetching data:', error);
        return null;
      });
  }
 
  createIconFeatures(features: any[]): any[] {
    const iconFeatures: any[] = [];
    const overlapDistance = 100;
    const calculateDistance = (point1: number[], point2: number[]): number => {
      return Math.sqrt(Math.pow(point1[0] - point2[0], 2) + Math.pow(point1[1] - point2[1], 2));
    };
    const findNewPositionAlongLine = (midPoint: number[], startPoint: number[], endPoint: number[], index: number): number[] => {
      const directionVector = [
        endPoint[0] - startPoint[0],
        endPoint[1] - startPoint[1]
      ];
      const length = Math.sqrt(directionVector[0] ** 2 + directionVector[1] ** 2);
      const unitVector = [directionVector[0] / length, directionVector[1] / length];
      const offset = overlapDistance * (index % 2 === 0 ? 1 : -1);
      const newX = midPoint[0] + offset * unitVector[0];
      const newY = midPoint[1] + offset * unitVector[1];
      return [newX, newY];
    };
    features.forEach((feature: any, index: number) => {
      const geometry = feature.getGeometry();
      const coordinates = geometry.getCoordinates();
      const startPoint = coordinates[0];
      const endPoint = coordinates[coordinates.length - 1];
      const midPoint = [
        (startPoint[0] + endPoint[0]) / 2,
        (startPoint[1] + endPoint[1]) / 2
      ];
      const trackMagnetic = parseFloat(feature.get('track_magnetic'));
      const angle = (trackMagnetic - 90) * (Math.PI / 180);
      let textAngle = angle;
      if (textAngle > Math.PI / 2 || textAngle < -Math.PI / 2) {
        textAngle += Math.PI;
      }
      const directionOfCruisingLevels = feature.get('direction_of_cruising_levels');
      let iconSrc = '';
      if (directionOfCruisingLevels === 'Forward' || directionOfCruisingLevels === 'Backward') {
        iconSrc = 'assets/right-arrow.png';
      } else {
        iconSrc = 'assets/rectangle.png';
      }
      if (!iconSrc) {
        console.error('Icon source is not set correctly');
        return;
      }
      const iconFeature = new ol.Feature({
        geometry: new ol.geom.Point(midPoint)
      });
      const iconStyle = new ol.style.Style({
        image: new ol.style.Icon({
          src: iconSrc,
          anchor: [0.5, 0.5],
          scale: 0.1,
          rotation: angle
        })
      });
      const airwayIdStyle = new ol.style.Style({
        text: new ol.style.Text({
          text: feature.get('airway_id'),
          font: 'bold 14px Calibri,sans-serif',
          textAlign: 'center',
          textBaseline: 'middle',
          offsetX: 0,
          offsetY: 0,
          fill: new ol.style.Fill({
            color: 'white'
          }),
          rotation: textAngle
        })
      });
      const trackMagneticStyle = new ol.style.Style({
        text: new ol.style.Text({
          text: `${feature.get('radial_distance')}`,
          font: '12px Calibri,sans-serif',
          textAlign: 'center',
          textBaseline: 'bottom',
          offsetX: 0,
          offsetY: -20,
          fill: new ol.style.Fill({
            color: '#000'
          }),
          rotation: textAngle
        })
      });
      const lateralLimitStyle = new ol.style.Style({
        text: new ol.style.Text({
          text: `${feature.get('mea')}`,
          font: '12px Calibri,sans-serif',
          textAlign: 'center',
          textBaseline: 'top',
          offsetX: 0,
          offsetY: 20,
          fill: new ol.style.Fill({
            color: '#000'
          }),
          rotation: textAngle
        })
      });
      iconFeature.setStyle([iconStyle, airwayIdStyle, trackMagneticStyle, lateralLimitStyle]);
      const overlap = iconFeatures.some(existingFeature => {
        const existingCoords = existingFeature.getGeometry().getCoordinates();
        const distance = calculateDistance(midPoint, existingCoords);
        return distance < overlapDistance;
      });
      if (!overlap) {
        iconFeatures.push(iconFeature);
      } else {
        const newMidPoint = findNewPositionAlongLine(midPoint, startPoint, endPoint, index);
        iconFeature.getGeometry().setCoordinates(newMidPoint);
        iconFeatures.push(iconFeature);
      }
    });
    return iconFeatures;
  }
 
  closePopup(event: Event): void {
    event.preventDefault(); // Prevent the default action
    this.popup.setPosition(undefined);
  }
 
  displayFeatureInfo(coordinate: any): void {
    const feature = this.map.forEachFeatureAtPixel(this.map.getPixelFromCoordinate(coordinate), (feature: any) => {
      return feature;
    });
    if (feature) {
      const properties = feature.getProperties();
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
      const popupContentElement = document.getElementById('popup-content');
      if (popupContentElement) {
        popupContentElement.innerHTML = info;
      }
      this.popup.setPosition(coordinate);
    } else {
      this.popup.setPosition(undefined); // Hide popup if no feature is clicked
    }
  }
 
  closeFilterPopup(event: Event): void {
    event.preventDefault();
    this.filterPopupVisible = false;
  }
 
 
  loadConvData(event: MouseEvent): void {
    event.stopPropagation();
    const visible = !this.conventionalAirwaysLayer.getVisible();
    console.log('Layer visibility:', visible);
    this.conventionalAirwaysLayer.setVisible(visible);
 
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
      this.conventionalAirwaysLayer.getSource().clear();
    }
  }
 
  displayConventionalAirwaysInfo(coordinate: any): void {
    const feature = this.map.forEachFeatureAtPixel(this.map.getPixelFromCoordinate(coordinate), (feature: any) => {
      return feature;
    });
    if (feature) {
      const properties = feature.getProperties();
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
      const popupContentElement = document.getElementById('popup-content');
      if (popupContentElement) {
        popupContentElement.innerHTML = info;
      }
      this.popup.setPosition(coordinate);
    } else {
      this.popup.setPosition(undefined); // Hide popup if no feature is clicked
    }
 
  }
 
  filterAndShowFeatures(type: string, trackMagnetic: string, airwayId: string, upperLimit: string, lowerLimit: string, mea: string, lateralLimits: string): void {
    const url = new URL('http://localhost:3002/api/convlinedata');
    const params: any = {};
 
    if (type) params.type = type;
    if (trackMagnetic) params.track_magnetic = trackMagnetic;
    if (airwayId) params.airway_id = airwayId;
    if (upperLimit) params.upper_limit = upperLimit;
    if (lowerLimit) params.lower_limit = lowerLimit;
    if (mea) params.mea = mea;
    if (lateralLimits) params.lateral_limits = lateralLimits;
 
    url.search = new URLSearchParams(params).toString();
 
    this.fetchGeoJSONData(url.toString()).then(data => {
      if (data && data.features) {
        // Filter GeoJSON data based on trackMagnetic and airwayId conditions
        data.features = data.features.filter((feature: any) => {
          let match = true;
 
          if (trackMagnetic && feature.properties.track_magnetic !== trackMagnetic) {
            match = false;
          }
 
          if (airwayId && feature.properties.airway_id !== airwayId) {
            match = false;
          }
          if (upperLimit && feature.properties.upper_limit !== upperLimit) {
            match = false;
          }
 
          // Add other conditions like upperLimit, lowerLimit, etc. if needed
 
          return match;
        });
 
        // Add filtered GeoJSON data to the map
        this.addGeoJSONToMap(data);
      }
    });
  }
 
  addGeoJSONToConventionalAirwaysLayer(geojson: any, conventionalAirwaysLayer: any): void {
    const vectorSource = new ol.source.Vector({
      features: new ol.format.GeoJSON().readFeatures(geojson, {
        featureProjection: 'EPSG:3857'
      })
    });
 
    const style = new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: 'black',
        width: 2
      })
    });
 
    vectorSource.getFeatures().forEach((feature: any) => {
      feature.setStyle(style);
    });
 
    this.conventionalAirwaysLayer.setSource(vectorSource);
    this.map.getView().fit(vectorSource.getExtent(), {
      padding: [50, 50, 50, 50],
      maxZoom: 8
    });
 
    // Create and add icon features for conventional airways
    const iconFeatures = this.createIconFeatures(vectorSource.getFeatures());
    const iconSource = new ol.source.Vector({
      features: iconFeatures
    });
    this.map.on('click', (event: { coordinate: any; }) => {
      this.displayConventionalAirwaysInfo(event.coordinate);
    });
    // Create separate icon layer for conventional airways
    this.conventionalIconLayer = new ol.layer.Vector({
      source: iconSource
    });
    this.map.addLayer(this.conventionalIconLayer);
    this.map.on('moveend', () => {
      this.updateIconVisibility();
    });
 
  }
 
  loadNonConvData(event: MouseEvent): void {
    event.stopPropagation();
    const visible = !this.nonConventionalAirwaysLayer.getVisible();
    this.nonConventionalAirwaysLayer.setVisible(visible);
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
      this.nonConventionalAirwaysLayer.getSource().clear();
    }
  }
 
  displayNonConventionalAirwaysInfo(coordinate: any): void {
    const feature = this.map.forEachFeatureAtPixel(this.map.getPixelFromCoordinate(coordinate), (feature: any) => {
      return feature;
    });
    if (feature) {
      const properties = feature.getProperties();
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
      const popupContentElement = document.getElementById('popup-content');
      if (popupContentElement) {
        popupContentElement.innerHTML = info;
      }
      this.popup.setPosition(coordinate);
    } else {
      this.popup.setPosition(undefined); // Hide popup if no feature is clicked
    }
 
  }
 
  addGeoJSONToNonConventionalAirwaysLayer(geojson: any, nonConventionalAirwaysLayer: any): void {
    const vectorSource = new ol.source.Vector({
      features: new ol.format.GeoJSON().readFeatures(geojson, {
        featureProjection: 'EPSG:3857'
      })
    });
 
    const style = new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: 'blue',
        width: 2
      })
    });
 
    vectorSource.getFeatures().forEach((feature: any) => {
      feature.setStyle(style);
    });
 
    this.nonConventionalAirwaysLayer.setSource(vectorSource);
    this.map.getView().fit(vectorSource.getExtent(), {
      padding: [50, 50, 50, 50],
      maxZoom: 8
    });
    // Add click event listener for waypoints
    this.map.on('click', (event: { coordinate: any; }) => {
      this.displayNonConventionalAirwaysInfo(event.coordinate);
    });
 
    // Create and add icon features for non-conventional airways
    const iconFeatures = this.createIconFeatures(vectorSource.getFeatures());
    const iconSource = new ol.source.Vector({
      features: iconFeatures
    });
 
    // Create separate icon layer for non-conventional airways
    this.nonConventionalIconLayer = new ol.layer.Vector({
      source: iconSource
    });
    this.map.addLayer(this.nonConventionalIconLayer);
 
    this.map.on('moveend', () => {
      this.updateIconVisibility();
    });
  }
 
  updateIconVisibility(): void {
    const zoom = this.map.getView().getZoom();
    // Show/hide icons based on zoom level
    if (this.conventionalIconLayer) {
      this.conventionalIconLayer.setVisible(zoom > this.zoomThreshold);
    }
    if (this.nonConventionalIconLayer) {
      this.nonConventionalIconLayer.setVisible(zoom > this.zoomThreshold);
    }
  }
 
  toggleWaypoints(event: MouseEvent): void {
    event.stopPropagation();
    const visible = !this.waypointsPoint.getVisible();
    this.waypointsPoint.setVisible(visible);
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
      this.waypointsPoint.getSource().clear();
    }
  }
 
  displayWaypointInfo(coordinate: any): void {
    const pixel = this.map.getPixelFromCoordinate(coordinate);
    const feature = this.map.forEachFeatureAtPixel(pixel, (feature: any) => {
      return feature;
    });
 
    if (feature) {
      const properties = feature.getProperties();
      let info = '<h3>Waypoint Info</h3>';
      info += `<strong>ID:</strong> ${properties.id}<br>`;
      info += `<strong>Waypoints:</strong> ${properties.waypoints}<br>`;
      info += `<strong>Name of Routes:</strong> ${properties.name_of_routes}<br>`;
 
      // Update the popup content and position
      const popupContentElement = document.getElementById('popup-content');
      if (popupContentElement) {
        popupContentElement.innerHTML = info;
      }
 
      // Set the position of the popup
      this.popup.setPosition(coordinate);
    } else {
      // Hide the popup if no waypoint is clicked
      this.popup.setPosition(undefined);
    }
  }
 
  addGeoJSONToWaypointLayerWithIcons(geojsonData: any, layer: any): void {
    const vectorSource = new ol.source.Vector({
      features: new ol.format.GeoJSON().readFeatures(geojsonData, {
        featureProjection: 'EPSG:3857' // Ensure correct projection
      })
    });
 
    const iconStyle = new ol.style.Style({
      image: new ol.style.Icon({
        src: 'assets/bleach.png', // Path to your icon in the assets folder
        scale: 0.02, // Adjust the scale as needed
        iconSize: [2, 2],
      }),
      text: new ol.style.Text({
        font: '10px,sans-serif',
        fill: new ol.style.Fill({
          color: 'black' // Text color
        }),
 
        offsetY: -15, // Position the text above the icon
        text: '' // Placeholder, will be updated with feature name
      })
    });
 
    vectorSource.getFeatures().forEach((feature: any) => {
      const name = feature.get('waypoints'); // Assuming 'waypoints' is the property for waypoint names
 
      // Clone the icon style for each feature
      const featureIconStyle = iconStyle.clone();
      featureIconStyle.getText().setText(''); // Initially hide the text
 
      // Apply the icon and text style to the feature
      feature.setStyle(featureIconStyle);
    });
 
    layer.setSource(vectorSource);
 
    // Add click event listener for waypoints
    this.map.on('click', (event: { coordinate: any; }) => {
      this.displayWaypointInfo(event.coordinate);
    });
 
    // Listen for zoom changes and update label visibility
    this.map.getView().on('change:resolution', () => {
      const zoom = this.map.getView().getZoom();
 
      // Show labels only when zoom is higher than 10, for example
      vectorSource.getFeatures().forEach((feature: any) => {
        const featureStyle = feature.getStyle();
        const textStyle = featureStyle.getText();
 
        if (zoom > 8) { // Set zoom threshold for showing waypoint names
          textStyle.setText(feature.get('waypoints')); // Show the waypoint name
        } else {
          textStyle.setText(''); // Hide the waypoint name when zoomed out
        }
      });
    });
  }
 
  togglenavaids(event: MouseEvent): void {
    event.stopPropagation();
    const visible = !this.navaidsData.getVisible();
    this.navaidsData.setVisible(visible);
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
      this.navaidsData.getSource().clear();
    }
  }
 
  toggleControlAirsapce(event: MouseEvent): void {
    event.stopPropagation();
    const visible = !this.controlAirspaceLayer.getVisible();
    this.controlAirspaceLayer.setVisible(visible);
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
      this.controlAirspaceLayer.getSource().clear();
    }
 
  }
 
  toggleRestrictedAirsapce(event: MouseEvent): void {
    event.stopPropagation();
    const visible = !this.restrictedAirspaceLayer.getVisible();
    this.restrictedAirspaceLayer.setVisible(visible);
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
      this.restrictedAirspaceLayer.getSource().clear();
    }
  }
  addGeoJSONToMap(geojson: any): void {
    const vectorSource = new ol.source.Vector({
      features: new ol.format.GeoJSON().readFeatures(geojson, {
        featureProjection: 'EPSG:3857'
      })
    });
 
    // Remove existing vectorLayer from the map
    if (this.vectorLayer) {
      this.map.removeLayer(this.vectorLayer);
    }
 
    this.vectorLayer = new ol.layer.Vector({
      source: vectorSource
    });
 
    this.map.addLayer(this.vectorLayer);
 
    // Fit the map view to the extent of the GeoJSON data
    this.map.getView().fit(vectorSource.getExtent(), {
      padding: [50, 50, 50, 50],
      maxZoom: 15
    });
  }
  toggleAerodromeObstacle(event: MouseEvent): void {
    event.stopPropagation();
    const visible = !this.aerodromeObstacleLayer.getVisible();
    this.aerodromeObstacleLayer.setVisible(visible);
    if (visible) {
      console.log('Loading data...');
      const geojsonUrl = 'http://localhost:3002/api/aerodromeobstacle';
      this.fetchGeoJSONData(geojsonUrl).then(geojson => {
        if (geojson) {
          this.addGeoJSONToAerodromeObstacleLayerWithIcons(geojson, this.aerodromeObstacleLayer);
        } else {
          console.error('Failed to load GeoJSON data.');
        }
      });
    } else {
      this.aerodromeObstacleLayer.getSource().clear();
    }
  }
 
  addGeoJSONToNavaidLayerWithIcons(geojsonData: any, layer: any): void {
    const vectorSource = new ol.source.Vector({
      features: new ol.format.GeoJSON().readFeatures(geojsonData, {
        featureProjection: 'EPSG:3857' // Ensure correct projection
      })
    });
 
    const iconStyle = new ol.style.Style({
      image: new ol.style.Icon({
        src: 'assets/navaid_icon.png', // Path to your icon in the assets folder
        scale: 0.05, // Adjust the scale as needed
        anchor: [0.5, 1], // Anchor at the bottom center
        iconSize: [20, 30],
      })
    });
 
    vectorSource.getFeatures().forEach((feature: any) => {
      // Apply the icon style only to specific geometries or all features
      feature.setStyle(iconStyle);
    });
 
    layer.setSource(vectorSource);
 
    // Add click event listener for waypoints
    this.map.on('click', (event: { coordinate: any; }) => {
      this.displayNavaidInfo(event.coordinate);
    });
  }
 
  displayNavaidInfo(coordinate: any): void {
    const pixel = this.map.getPixelFromCoordinate(coordinate);
    const feature = this.map.forEachFeatureAtPixel(pixel, (feature: any) => {
      return feature;
    });
 
    if (feature) {
      const properties = feature.getProperties();
      let info = '<h3>Navaid Info</h3>';
      info += `<strong>ID:</strong> ${properties.id}<br>`;
      info += `<strong>Airport ICAO:</strong> ${properties.airport_icao}<br>`;
      info += `<strong>Navaid information:</strong> ${properties.navaid_information}<br>`;
 
 
      // Update the popup content and position
      const popupContentElement = document.getElementById('popup-content');
      if (popupContentElement) {
        popupContentElement.innerHTML = info;
      }
 
      // Set the position of the popup
      this.popup.setPosition(coordinate);
    } else {
      // Hide the popup if no waypoint is clicked
      this.popup.setPosition(undefined);
    }
  }
 
  addGeoJSONToLayer(data: any, layer: any): void {
    const vectorSource = new ol.source.Vector({
      features: new ol.format.GeoJSON().readFeatures(data, {
        featureProjection: 'EPSG:3857'
      })
    });
 
    layer.getSource().clear(); // Clear existing features
    layer.getSource().addFeatures(vectorSource.getFeatures());
  }
 
  displayControlAirspaceInfo(coordinate: any): void {
    const pixel = this.map.getPixelFromCoordinate(coordinate);
    const feature = this.map.forEachFeatureAtPixel(pixel, (feature: any) => {
      return feature;
    });
 
    if (feature) {
      const properties = feature.getProperties();
      let info = '<h3>Control Airspace Info</h3>';
      info += `<strong>ID:</strong> ${properties.id}<br>`;
      info += `<strong>Airspace center:</strong> ${properties.AirspaceCenter}<br>`;
      info += `<strong>Controlled Airspace Name:</strong> ${properties.ControlledAirspaceName}<br>`;
 
      // Update the popup content and position
      const popupContentElement = document.getElementById('popup-content');
      if (popupContentElement) {
        popupContentElement.innerHTML = info;
      }
 
      // Set the position of the popup
      this.popup.setPosition(coordinate);
    } else {
      // Hide the popup if no waypoint is clicked
      this.popup.setPosition(undefined);
    }
  }
 
  addGeoJSONToControlAirspaceLayerWithIcons(geojson: any, layer: any): void {
    const vectorSource = new ol.source.Vector({
      features: new ol.format.GeoJSON().readFeatures(geojson, {
        featureProjection: 'EPSG:3857'
      })
    });
 
    const style = new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: 'purple',
        width: 2
      })
    });
 
    vectorSource.getFeatures().forEach((feature: any) => {
      feature.setStyle(style);
    });
 
    layer.setSource(vectorSource);
    this.map.getView().fit(vectorSource.getExtent(), {
      padding: [50, 50, 50, 50],
      maxZoom: 10
    });
    // Add click event listener for waypoints
    this.map.on('click', (event: { coordinate: any; }) => {
      this.displayControlAirspaceInfo(event.coordinate);
    });
  }
 
  displayRestrictedAirspaceInfo(coordinate: any): void {
    const pixel = this.map.getPixelFromCoordinate(coordinate);
    const feature = this.map.forEachFeatureAtPixel(pixel, (feature: any) => {
      return feature;
    });
    if (feature) {
      const properties = feature.getProperties();
      let info = '<h3>Restricted Airspace Info</h3>';
      info += `<strong>ID:</strong> ${properties.id}<br>`;
      info += `<strong>Restrictive Airspace Name:</strong> ${properties.RestrictiveAirspaceName}<br>`;
      info += `<strong>Upper Limit:</strong> ${properties.UpperLimit}<br>`;
      const popupContentElement = document.getElementById('popup-content');
      if (popupContentElement) {
        popupContentElement.innerHTML = info;
      }
      this.popup.setPosition(coordinate);
    } else {
      this.popup.setPosition(undefined);
    }
  }
 
  addGeoJSONToRestrictedAirspaceLayerWithIcons(geojson: any, layer: any): void {
    const vectorSource = new ol.source.Vector({
      features: new ol.format.GeoJSON().readFeatures(geojson, {
        featureProjection: 'EPSG:3857'
      })
    });
    const style = new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: 'red',
        width: 2
      })
    });
    vectorSource.getFeatures().forEach((feature: any) => {
      feature.setStyle(style);
    });
    layer.setSource(vectorSource);
    this.map.getView().fit(vectorSource.getExtent(), {
      padding: [50, 50, 50, 50],
      maxZoom: 10
    });
    this.map.on('click', (event: { coordinate: any; }) => {
      this.displayRestrictedAirspaceInfo(event.coordinate);
    });
  }
 
  addGeoJSONToRestrictedAirspaceLayer(geojson: any): void {
    const vectorSource = new ol.source.Vector({
      features: new ol.format.GeoJSON().readFeatures(geojson, {
        featureProjection: 'EPSG:3857' // Ensure that the projection is correct
      })
    });
 
    const style = new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: 'red',
        width: 2,
        lineDash: [10, 10] // Dashed line to indicate restricted airspace
      }),
      fill: new ol.style.Fill({
        color: 'rgba(255, 0, 0, 0.2)' // Semi-transparent fill for restricted areas
      })
    });
 
    vectorSource.getFeatures().forEach((feature: any) => {
      feature.setStyle(style);
    });
 
    this.restrictedAirspaceLayer.setSource(vectorSource);
    this.map.getView().fit(vectorSource.getExtent(), {
      padding: [50, 50, 50, 50],
      maxZoom: 8
    });
  }
 
  displayAerodromeObstacleInfo(coordinate: any): void {
    const pixel = this.map.getPixelFromCoordinate(coordinate);
    const feature = this.map.forEachFeatureAtPixel(pixel, (feature: any) => {
      return feature;
    });
    if (feature) {
      const properties = feature.getProperties();
      let info = '<h3>Aerodrome Obstacle Info</h3>';
      info += `<strong>ID:</strong> ${properties.id}<br>`;
 
      const popupContentElement = document.getElementById('popup-content');
      if (popupContentElement) {
        popupContentElement.innerHTML = info;
      }
      this.popup.setPosition(coordinate);
    } else {
      this.popup.setPosition(undefined);
    }
  }
 
  addGeoJSONToAerodromeObstacleLayerWithIcons(geojsonData: any, layer: any): void {
    const vectorSource = new ol.source.Vector({
      features: new ol.format.GeoJSON().readFeatures(geojsonData, {
        featureProjection: 'EPSG:3857' // Ensure correct projection
      })
    });
 
    const iconStyle = new ol.style.Style({
      image: new ol.style.Icon({
        src: 'assets/obstacle1.png', // Path to your icon in the assets folder
        scale: 0.15, // Adjust the scale as needed
        anchor: [0.5, 1], // Anchor at the bottom center
        iconSize: [50, 50],
      })
    });
 
    vectorSource.getFeatures().forEach((feature: any) => {
      // Apply the icon style only to specific geometries or all features
      feature.setStyle(iconStyle);
    });
 
    layer.setSource(vectorSource);
 
    // Add click event listener for waypoints
    this.map.on('click', (event: { coordinate: any; }) => {
      this.displayAerodromeObstacleInfo(event.coordinate);
    });
  }
 
}