const map = L.map('map', {
  center: [58.373523, 26.716045],
  zoom: 12,
  zoomControl: true,
});

map.zoomControl.setPosition('topright');
map.createPane('customDistrictsPane');
map.getPane('customDistrictsPane').style.zIndex = 390;

const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: 'OpenStreetMap contributors',
});

const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Esri, Maxar, Earthstar Geographics, and the GIS community',
  maxZoom: 19,
});

const topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
  maxZoom: 17,
  attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)',
});

let districtsLayer;
let choroplethLayer;
let heatMapLayer;
let markersLayer;

function getDistrictColor(id) {
  switch (id) {
    case 1:
      return '#ff0000';
    case 13:
      return '#009933';
    case 6:
      return '#0000ff';
    case 7:
      return '#ff0066';
    default:
      return '#ffffff';
  }
}

async function loadDistrictsLayer() {
  try {
    const response = await fetch('geojson/tartu_city_districts_edu.geojson');
    const data = await response.json();

    districtsLayer = L.geoJson(data, {
      pane: 'customDistrictsPane',
      style: function (feature) {
        return {
          fillColor: getDistrictColor(feature.properties.OBJECTID),
          fillOpacity: 0.5,
          weight: 1,
          opacity: 1,
          color: 'grey',
        };
      },
      onEachFeature: function (feature, layer) {
        layer.bindPopup(feature.properties.NIMI || 'District ' + feature.properties.OBJECTID);
      },
    });
  } catch (error) {
    console.error('Error loading districts data:', error);
  }
}

async function loadChoroplethLayer() {
  try {
    const response = await fetch('geojson/tartu_city_districts_edu.geojson');
    const data = await response.json();

    choroplethLayer = L.choropleth(data, {
      valueProperty: 'OBJECTID',
      scale: ['#e6ffe6', '#004d00'],
      steps: 11,
      mode: 'q',
      pane: 'customDistrictsPane',
      style: {
        color: '#fff',
        weight: 2,
        fillOpacity: 0.8,
      },
      onEachFeature: function (feature, layer) {
        layer.bindPopup('Value: ' + feature.properties.OBJECTID);
      },
    });
  } catch (error) {
    console.error('Error loading choropleth data:', error);
  }
}

async function loadHeatMapLayer() {
  try {
    const response = await fetch('geojson/tartu_city_celltowers_edu.geojson');
    const data = await response.json();

    const heatData = data.features.map(function (feature) {
      return [
        feature.geometry.coordinates[1],
        feature.geometry.coordinates[0],
        feature.properties.area || 1,
      ];
    });

    heatMapLayer = L.heatLayer(heatData, {
      radius: 20,
      blur: 15,
      maxZoom: 17,
    });
  } catch (error) {
    console.error('Error loading heatmap data:', error);
  }
}

async function loadMarkersLayer() {
  try {
    const response = await fetch('geojson/tartu_city_celltowers_edu.geojson');
    const data = await response.json();

    const geoJsonLayer = L.geoJson(data, {
      pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng, {
          radius: 5,
          fillColor: 'red',
          fillOpacity: 0.5,
          color: 'red',
          weight: 1,
          opacity: 1,
        });
      },
      onEachFeature: function (feature, layer) {
        if (feature.properties) {
          layer.bindPopup('Cell Tower<br>Area: ' + (feature.properties.area || 'Unknown'));
        }
      },
    });

    markersLayer = L.markerClusterGroup();
    markersLayer.addLayer(geoJsonLayer);
  } catch (error) {
    console.error('Error loading markers data:', error);
  }
}

async function initializeLayers() {
  await Promise.all([
    loadDistrictsLayer(),
    loadChoroplethLayer(),
    loadHeatMapLayer(),
    loadMarkersLayer(),
  ]);

  const baseLayers = {
    OpenStreetMap: osmLayer,
    Satellite: satelliteLayer,
    Topographic: topoLayer,
  };

  const overlayLayers = {
    'Tartu districts': districtsLayer,
    'Choropleth layer': choroplethLayer,
    Heatmap: heatMapLayer,
    Markers: markersLayer,
  };

  const layerControlOptions = {
    collapsed: false,
    position: 'topleft',
  };

  const layerControl = L.control.layers(baseLayers, overlayLayers, layerControlOptions);
  layerControl.addTo(map);

  osmLayer.addTo(map);
}

function defaultMapSettings() {
  map.setView([58.373523, 26.716045], 12);
}

initializeLayers();
