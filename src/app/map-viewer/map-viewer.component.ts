import { Component, OnInit } from '@angular/core';

declare var ol: any; // Declare OpenLayers globally

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
  nonConventionalAirwaysLayer:any;
  popup: any;
  filterPopupVisible: boolean = false;
  menuOpen: boolean = false;
  zoomThreshold: number = 10;

  constructor() { }

  ngOnInit(): void {
    this.initMap();
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

    // Initialize popup
    this.popup = new ol.Overlay({
      element: document.getElementById('popup'),
      autoPan: true,
      autoPanAnimation: {
        duration: 250
      }
    });
    this.map.addOverlay(this.popup);

    this.conventionalAirwaysLayer = new ol.layer.Vector({
      source: new ol.source.Vector(),
      style: new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: 'black',
          width: 2
        })
      })
    });
    this.map.addLayer(this.conventionalAirwaysLayer);
  
    // Initialize non-conventional airways layer
    this.nonConventionalAirwaysLayer = new ol.layer.Vector({
      source: new ol.source.Vector()
    });
    this.map.addLayer(this.nonConventionalAirwaysLayer);
  
    // Hide layers initially
    this.conventionalAirwaysLayer.setVisible(false);
    this.nonConventionalAirwaysLayer.setVisible(false);
  
    // Add click event listener to the map for showing popup
    this.map.on('click', (event: any) => {
      this.displayFeatureInfo(event.coordinate);
    });

    // Add moveend event listener to show/hide icons based on zoom level
    this.map.on('moveend', () => {
      this.updateIconVisibility();
    });
    
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

  addGeoJSONToMap(geojson: any): void {
    const vectorSource = new ol.source.Vector({
      features: new ol.format.GeoJSON().readFeatures(geojson, {
        featureProjection: 'EPSG:3857'
      })
    });

    // Remove existing vectorLayer and iconLayer from the map
    if (this.vectorLayer) {
      this.map.removeLayer(this.vectorLayer);
    }
    if (this.iconLayer) {
      this.map.removeLayer(this.iconLayer);
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

    // Create icons for each line feature
    const iconFeatures = this.createIconFeatures(vectorSource.getFeatures());

    // Create a vector source and layer for icons
    const iconSource = new ol.source.Vector({
      features: iconFeatures
    });

    this.iconLayer = new ol.layer.Vector({
      source: iconSource
    });

    this.map.addLayer(this.iconLayer);

    // Update icon visibility based on initial zoom level
    this.updateIconVisibility();
  }

  
  
  createIconFeatures(features: any[]): any[] {
    const iconFeatures: any[] = [];
    const overlapDistance = 100; // Adjust as needed based on your map scale
  
    // Helper function to calculate distance between two points
    const calculateDistance = (point1: number[], point2: number[]): number => {
      return Math.sqrt(Math.pow(point1[0] - point2[0], 2) + Math.pow(point1[1] - point2[1], 2));
    };
  
    // Helper function to find a new position when overlap is detected
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
  
      // Calculate midpoint
      const midPoint = [
        (startPoint[0] + endPoint[0]) / 2,
        (startPoint[1] + endPoint[1]) / 2
      ];
  
      // Example track magnetic value
      const trackMagnetic = parseFloat(feature.get('track_magnetic')); // Replace with actual track_magnetic value
  
      // Convert degrees to radians and adjust for OpenLayers rotation (clockwise from positive x-axis)
      const angle = (trackMagnetic - 90) * (Math.PI / 180);
  
      // Ensure text is always upright and readable
      let textAngle = angle;
      if (textAngle > Math.PI / 2 || textAngle < -Math.PI / 2) {
        textAngle += Math.PI; // Flip the text angle
      }
  
      // Determine icon based on direction of cruising levels
      const directionOfCruisingLevels = feature.get('direction_of_cruising_levels');
      let iconSrc = ''; // Default icon
      if (directionOfCruisingLevels === 'Forward' || directionOfCruisingLevels === 'Backward') {
        iconSrc = 'assets/right-arrow.png';
      } else {
        iconSrc = 'assets/rectangle.png';
      }
  
      // Check if iconSrc is correctly set
      if (!iconSrc) {
        console.error('Icon source is not set correctly');
        return;
      }
  
      // Create icon feature
      const iconFeature = new ol.Feature({
        geometry: new ol.geom.Point(midPoint)
      });
  
      // Style for icon
      const iconStyle = new ol.style.Style({
        image: new ol.style.Icon({
          src: iconSrc,
          anchor: [0.5, 0.5], // Center the icon on the point
          scale: 0.1, // Adjust scale to decrease size (smaller value for smaller icons)
          rotation: angle // Set the rotation of the icon
        })
      });
  
      // Add airway ID text to the icon
      const airwayIdStyle = new ol.style.Style({
        text: new ol.style.Text({
          text: feature.get('airway_id'),
          font: 'bold 14px Calibri,sans-serif', // Increase font size and make it bold
          textAlign: 'center', // Center align the text
          textBaseline: 'middle', // Align text vertically to the middle
          offsetX: 0, // No horizontal offset
          offsetY: 0, // No vertical offset
          fill: new ol.style.Fill({
            color: 'white'
          }),
          rotation: textAngle // Set the rotation of the text to be always upright
        })
      });
  
      // Add track magnetic text above the icon
      const trackMagneticStyle = new ol.style.Style({
        text: new ol.style.Text({
          text: `${feature.get('radial_distance')}`, // Format track magnetic
          font: '12px Calibri,sans-serif', // Font size for track magnetic
          textAlign: 'center',
          textBaseline: 'bottom',
          offsetX: 0,
          offsetY: -20, // Adjust vertical offset to position above the icon
          fill: new ol.style.Fill({
            color: '#000'
          }),
          rotation: textAngle // Ensure text is upright
        })
      });
  
      // Add lateral limit text below the icon
      const lateralLimitStyle = new ol.style.Style({
        text: new ol.style.Text({
          text: `${feature.get('mea')}`,
          font: '12px Calibri,sans-serif', // Font size for lateral limit
          textAlign: 'center',
          textBaseline: 'top',
          offsetX: 0,
          offsetY: 20, // Adjust vertical offset to position below the icon
          fill: new ol.style.Fill({
            color: '#000'
          }),
          rotation: textAngle // Ensure text is upright
        })
      });
  
      // Combine all styles into one style array
      iconFeature.setStyle([iconStyle, airwayIdStyle, trackMagneticStyle, lateralLimitStyle]);
  
      // Check for overlap with existing icons and adjust position
      let overlapDetected = false;
      for (let i = 0; i < iconFeatures.length; i++) {
        const existingFeature = iconFeatures[i];
        const existingCoords = existingFeature.getGeometry().getCoordinates();
        const distance = calculateDistance(existingCoords, midPoint);
        if (distance < overlapDistance) {
          overlapDetected = true;
  
          // Find a new position along the line
          const newPosition = findNewPositionAlongLine(midPoint, startPoint, endPoint, index);
  
          // Set the new position for the icon feature
          iconFeature.setGeometry(new ol.geom.Point(newPosition));
          break;
        }
      }
  
      // Push the icon feature to the array
      iconFeatures.push(iconFeature);
    });
  
    return iconFeatures;
  }
  
  
  
  updateIconVisibility(): void {
    const zoom = this.map.getView().getZoom();
    this.iconLayer.setVisible(zoom > this.zoomThreshold);
  }

  filterAndShowFeatures(type: string, trackMagnetic: string, airwayId: string, upperLimit: string, lowerLimit: string, mea: string, lateralLimits: string): void {
    const url = new URL(type === 'conv' ? 'http://localhost:3002/convlinedata' : 'http://localhost:3002/nonconvlinedata');
    const params: any = {};
  
    if (trackMagnetic) params.track_magnetic = trackMagnetic;
    if (airwayId) params.airway_id = airwayId;
    if (upperLimit) params.upper_limit = upperLimit;
    if (lowerLimit) params.lower_limit = lowerLimit;
    if (mea) params.mea = mea;
    if (lateralLimits) params.lateral_limits = lateralLimits;
  
    url.search = new URLSearchParams(params).toString();
  
    this.fetchGeoJSONData(url.toString()).then(data => {
      if (data && data.features) {
        // Filter GeoJSON data based on conditions
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
          if (lowerLimit && !this.isLowerLimitLessThan(feature.properties.lower_limit, lowerLimit)) {
            match = false; // Exclude features with lower limit not less than the input value
          }
          if (mea && feature.properties.mea !== mea) {
            match = false;
          }
          if (lateralLimits && feature.properties.lateral_limits !== lateralLimits) {
            match = false;
          }
  
          return match;
        });
  
        // Add filtered GeoJSON data to the appropriate layer
        if (type === 'conv') {
          this.addGeoJSONToLayer(data, this.conventionalAirwaysLayer);
        } else {
          this.addGeoJSONToLayer(data, this.nonConventionalAirwaysLayer);
        }
      }
    });
  }
  

  isLowerLimitLessThan(featureLowerLimit: string, inputLowerLimit: string): boolean {
    // Extract numerical part from featureLowerLimit and inputLowerLimit
    const featureValue = parseFloat(featureLowerLimit.split(' ')[1]);
    const inputValue = parseFloat(inputLowerLimit.split(' ')[1]);

    // Check if the featureValue is less than the inputValue
    return featureValue < inputValue;
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
    this.menuOpen = false;
    // Fetch and display conv data when filter popup is closed
    this.loadConvData();
  }

  closePopup(event: Event): void {
    event.preventDefault(); // Prevent the default action
    this.popup.setPosition(undefined);
  }

  toggleFilterPopup(): void {
    this.filterPopupVisible = !this.filterPopupVisible;
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
    if (!this.menuOpen) {
      // Close the filter popup if menu is closed
      this.filterPopupVisible = false;
    }
  }

  loadConvData(): void {
    this.fetchGeoJSONData('http://localhost:3002/convlinedata').then(data => {
      if (data && data.features) {
        // Filter GeoJSON data to include only conv type features
        data.features = data.features.filter((feature: any) => feature.properties.type === 'conv');
        // Add filtered GeoJSON data to the map
        this.addGeoJSONToMap(data);
      }
    });
  }

  toggleConventionalAirwaysLayer(): void {
    const isVisible = this.conventionalAirwaysLayer.getVisible();
    
    if (!isVisible) {
      // Fetch GeoJSON data only if the layer is not visible
      this.fetchGeoJSONData('http://localhost:3002/convlinedata').then(data => {
        if (data) {
          // Clear existing features
          this.conventionalAirwaysLayer.getSource().clear();
  
          // Add GeoJSON data to the layer
          this.addGeoJSONToLayer(data, this.conventionalAirwaysLayer);
        }
      });
    }
    
    // Toggle visibility
    this.conventionalAirwaysLayer.setVisible(!isVisible);
  }
  

  toggleNonConventionalAirwaysLayer(): void {
    const isVisible = this.nonConventionalAirwaysLayer.getVisible();
    
    if (!isVisible) {
      // Fetch GeoJSON data only if the layer is not visible
      this.fetchGeoJSONData('http://localhost:3002/nonconvlinedata').then(data => {
        if (data) {
          // Clear existing features
          this.nonConventionalAirwaysLayer.getSource().clear();
  
          // Add GeoJSON data to the layer
          this.addGeoJSONToLayer(data, this.nonConventionalAirwaysLayer);
        }
      });
    }
    
    // Toggle visibility
    this.nonConventionalAirwaysLayer.setVisible(!isVisible);
  }
  addGeoJSONToLayer(geojson: any, layer: any): void {
    const vectorSource = new ol.source.Vector({
      features: new ol.format.GeoJSON().readFeatures(geojson, {
        featureProjection: 'EPSG:3857'
      })
    });
  
    layer.getSource().clear(); // Clear existing features from the layer
    layer.setSource(vectorSource); // Set the new source
  
    // Fit the map view to the extent of the GeoJSON data
    this.map.getView().fit(vectorSource.getExtent(), {
      padding: [50, 50, 50, 50],
      maxZoom: 15
    });
  
    // Create icons for each line feature
    const iconFeatures = this.createIconFeatures(vectorSource.getFeatures());
  
    // Create a vector source and layer for icons
    const iconSource = new ol.source.Vector({
      features: iconFeatures
    });
  
    this.iconLayer.setSource(iconSource);
  
    // Update icon visibility based on initial zoom level
    this.updateIconVisibility();
  }
    
  
  
}
