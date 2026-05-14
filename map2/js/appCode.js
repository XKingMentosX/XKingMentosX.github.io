import { turfFunctions } from "./turfPractice.js"
import { wmsLayers, ogcApiLayers } from "./layers.js"

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
let activeWmsLayers = {}

// ── Reprojection helpers ──────────────────────────────────────────────────────

function reprojectToEstonian(featureCollection) {
  const reprojected = JSON.parse(JSON.stringify(featureCollection))
  reprojected.features.forEach(feature => {
    const geom = feature.geometry
    if (geom.type === "Polygon") {
      geom.coordinates = geom.coordinates.map(ring =>
        ring.map(coord => proj4("EPSG:4326", "EPSG:3301", coord))
      )
    } else if (geom.type === "MultiPolygon") {
      geom.coordinates = geom.coordinates.map(polygon =>
        polygon.map(ring =>
          ring.map(coord => proj4("EPSG:4326", "EPSG:3301", coord))
        )
      )
    }
  })
  return reprojected
}

function reprojectToWGS84(featureCollection) {
  const reprojected = JSON.parse(JSON.stringify(featureCollection))
  reprojected.features.forEach(feature => {
    const geom = feature.geometry
    if (geom.type === "Polygon") {
      geom.coordinates = geom.coordinates.map(ring =>
        ring.map(coord => proj4("EPSG:3301", "EPSG:4326", coord))
      )
    } else if (geom.type === "MultiPolygon") {
      geom.coordinates = geom.coordinates.map(polygon =>
        polygon.map(ring =>
          ring.map(coord => proj4("EPSG:3301", "EPSG:4326", coord))
        )
      )
    }
  })
  return reprojected
}

// ── Existing layer loaders ────────────────────────────────────────────────────

function getDistrictColor(id) {
  switch (id) {
    case 1:  return '#ff0000';
    case 13: return '#009933';
    case 6:  return '#0000ff';
    case 7:  return '#ff0066';
    default: return '#ffffff';
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
      style: { color: '#fff', weight: 2, fillOpacity: 0.8 },
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
    heatMapLayer = L.heatLayer(heatData, { radius: 20, blur: 15, maxZoom: 17 });
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
          radius: 5, fillColor: 'red', fillOpacity: 0.5,
          color: 'red', weight: 1, opacity: 1,
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

// ── WMS helpers ───────────────────────────────────────────────────────────────

function toggleActiveState(layerId, boolean) {
  if (typeof(activeWmsLayers[layerId]) == "boolean") {
    activeWmsLayers[layerId] = boolean
  }
}

function loadWmsLayers(layersList, overlayLayers, activeWmsLayers) {
  layersList.forEach(layer => {
    let paneName = `${layer.layers}-pane`
    map.createPane(paneName)
    map.getPane(paneName).style.zIndex = layer.zIndex
    let newLayer = L.tileLayer.wms(layer.url, {
      version: layer.version,
      layers: layer.layers,
      format: layer.format,
      transparent: layer.transparent,
      zIndex: layer.zIndex,
      pane: paneName,
    })
    overlayLayers[layer.title.en] = newLayer
    activeWmsLayers[layer.layers] = false
  })
}

function buildRequestUrl(e, baseUrl, layerName) {
  const bounds = map.getBounds()
  const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()].join(',')
  const size = map.getSize()
  const params = new URLSearchParams({
    service: 'WMS', version: '1.1.1', request: 'GetFeatureInfo',
    query_layers: layerName, layers: layerName,
    info_format: 'application/json',
    x: Math.floor(e.containerPoint.x),
    y: Math.floor(e.containerPoint.y),
    srs: 'EPSG:4326', width: size.x, height: size.y, bbox: `${bbox}`
  })
  return baseUrl + params
}

function getLayerName(layersData, layerName) {
  const layer = layersData.filter(entry => entry.layers == layerName)
  return layer[0].title.en
}

function fetchWmsData(fullUrl, layerName) {
  fetch(fullUrl)
    .then(response => response.json())
    .then(data => {
      const content = document.getElementById('info-content')
      if (data.features && data.features.length > 0) {
        const props = data.features[0].properties
        let html = `<h4>${getLayerName(wmsLayers, layerName)}</h4><ul>`
        for (const key in props) {
          html += `<li><strong>${key}:</strong> ${props[key]}</li>`
        }
        html += '</ul>'
        content.innerHTML += html
      } else {
        content.innerHTML += `<em>No features found for ${getLayerName(wmsLayers, layerName)}</em><br>`
      }
    })
    .catch(error => console.error('Request failed:', error))
}

// ── OGC API Features ──────────────────────────────────────────────────────────

const ogcApiLeafletLayers = {}

async function loadOgcApiLayers(layersList, overlayLayers) {
  for (const layerDef of layersList) {
    const url = `http://localhost:5000/collections/${layerDef.id}/items?f=json&limit=500`
    try {
      const response = await fetch(url)
      if (!response.ok) {
        console.error(`Failed to load collection "${layerDef.id}": HTTP ${response.status}`)
        continue
      }
      const geojson = await response.json()

      const leafletLayer = L.geoJson(geojson, {
        style: {
          color: layerDef.color,
          fillColor: layerDef.fillColor,
          fillOpacity: layerDef.fillOpacity,
          weight: layerDef.weight,
        },

        onEachFeature: layerDef.id === "buildings"
          ? function(feature, layer) {
              const featureId = feature.id || feature.properties.id || Math.random().toString(36).slice(2)
              const props = feature.properties
              const propLines = Object.entries(props)
                .slice(0, 5)
                .map(([k, v]) => `<tr><td><b>${k}</b></td><td>${v ?? "—"}</td></tr>`)
                .join("")

              const popupContent = `
                <div style="min-width:220px">
                  <table style="border-collapse:collapse;width:100%">${propLines}</table>
                  <hr style="margin:6px 0">
                  <label style="display:flex;justify-content:space-between;font-size:0.85em">
                    <span>Buffer distance</span>
                    <span id="buffer-label-${featureId}"><b>50</b> m</span>
                  </label>
                  <input
                    type="range"
                    id="buffer-slider-${featureId}"
                    min="10" max="500" step="10" value="50"
                    style="width:100%;margin:4px 0 8px"
                    oninput="window.__updateBufferLabel('${featureId}', this.value)"
                  />
                  <button
                    id="buffer-btn-${featureId}"
                    style="width:100%;padding:4px 8px;cursor:pointer"
                    onclick="window.__toggleBuffer('${featureId}', this)"
                  >
                    Add buffer
                  </button>
                </div>
              `

              layer.bindPopup(popupContent)

              layer.on("popupopen", () => {
                const btn = document.getElementById(`buffer-btn-${featureId}`)
                if (btn) btn._leafletFeature = feature
              })
            }
          : undefined,
      })

      ogcApiLeafletLayers[layerDef.id] = leafletLayer
      overlayLayers[layerDef.title] = leafletLayer

    } catch (error) {
      console.error(`Error loading OGC API layer "${layerDef.id}":`, error)
    }
  }
}

// ── Buffer computation ────────────────────────────────────────────────────────

const buildingBufferLayers = {}

async function computeAndDrawBuffer(feature, featureId, bufferDistance = 50) {
  const featureCollection = { type: "FeatureCollection", features: [feature] }
  const reprojected = reprojectToEstonian(featureCollection)

  const payload = {
    inputs: {
      features: reprojected,
      distance: bufferDistance,
      crs: 3301,
    }
  }

  const response = await fetch("http://localhost:5000/processes/buffer/execution", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Buffer process returned HTTP ${response.status}`)
  }

  const result = await response.json()
  const bufferedWGS84 = reprojectToWGS84(result.value)

  return L.geoJson(bufferedWGS84, {
    style: {
      color: "#e34a33",
      fillColor: "#fdbb84",
      fillOpacity: 0.35,
      weight: 2,
      dashArray: "6 4",
    }
  })
}

// ── Buffer toggle (called from popup button) ──────────────────────────────────

window.__toggleBuffer = async function(featureId, buttonElement) {
  if (buildingBufferLayers[featureId]) {
    map.removeLayer(buildingBufferLayers[featureId])
    delete buildingBufferLayers[featureId]
    buttonElement.textContent = "Add buffer"
    buttonElement.style.backgroundColor = ""
    return
  }

  buttonElement.textContent = "Computing…"
  buttonElement.disabled = true

  try {
    const feature = buttonElement._leafletFeature
    const slider = document.getElementById(`buffer-slider-${featureId}`)
    const distance = slider ? parseInt(slider.value, 10) : 50
    const bufferLayer = await computeAndDrawBuffer(feature, featureId, distance)

    bufferLayer.addTo(map)
    buildingBufferLayers[featureId] = bufferLayer
    buttonElement.textContent = "Remove buffer"
    buttonElement.style.backgroundColor = "#fdbb84"
  } catch (error) {
    console.error("Buffer computation failed:", error)
    buttonElement.textContent = "Error — try again"
  } finally {
    buttonElement.disabled = false
  }
}

window.__updateBufferLabel = function(featureId, value) {
  const label = document.getElementById(`buffer-label-${featureId}`)
  if (label) label.innerHTML = `<b>${value}</b> m`

  if (buildingBufferLayers[featureId]) {
    map.removeLayer(buildingBufferLayers[featureId])
    delete buildingBufferLayers[featureId]
    const btn = document.getElementById(`buffer-btn-${featureId}`)
    if (btn) {
      btn.textContent = "Add buffer"
      btn.style.backgroundColor = ""
    }
  }
}

// ── Basemap switcher (bottom-left collapsible menu) ───────────────────────────

function createBasemapControl() {
  const control = L.control({ position: 'bottomleft' })

  control.onAdd = function(mapInstance) {
    const container = L.DomUtil.create('div', 'basemap-switcher')
    container.innerHTML = `
      <button class="basemap-toggle-btn">Map style</button>
      <div class="basemap-menu">
        <label class="basemap-option">
          <input type="radio" name="basemap" value="osm" checked> OpenStreetMap
        </label>
        <label class="basemap-option">
          <input type="radio" name="basemap" value="satellite"> Satellite
        </label>
        <label class="basemap-option">
          <input type="radio" name="basemap" value="topo"> Topographic
        </label>
      </div>
    `

    L.DomEvent.disableClickPropagation(container)
    L.DomEvent.disableScrollPropagation(container)

    const toggleBtn = container.querySelector('.basemap-toggle-btn')
    const menu = container.querySelector('.basemap-menu')

    toggleBtn.addEventListener('click', () => {
      menu.classList.toggle('open')
    })

    container.querySelectorAll('input[name="basemap"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (mapInstance.hasLayer(osmLayer)) mapInstance.removeLayer(osmLayer)
        if (mapInstance.hasLayer(satelliteLayer)) mapInstance.removeLayer(satelliteLayer)
        if (mapInstance.hasLayer(topoLayer)) mapInstance.removeLayer(topoLayer)
        if (e.target.value === 'osm') osmLayer.addTo(mapInstance)
        else if (e.target.value === 'satellite') satelliteLayer.addTo(mapInstance)
        else if (e.target.value === 'topo') topoLayer.addTo(mapInstance)
      })
    })

    return container
  }

  return control
}

// ── Layer initialisation ──────────────────────────────────────────────────────

async function initializeLayers() {
  await Promise.all([
    loadDistrictsLayer(),
    loadChoroplethLayer(),
    loadHeatMapLayer(),
    loadMarkersLayer(),
  ]);

  const rescueGroup = {}
  const myDataGroup = {}

  loadWmsLayers(wmsLayers, rescueGroup, activeWmsLayers)
  await loadOgcApiLayers(ogcApiLayers, myDataGroup)

  const groupedOverlays = {
    "Districts": {
      "Tartu districts": districtsLayer,
    },
    "Cellphone towers": {
      "Choropleth layer": choroplethLayer,
      "Heatmap": heatMapLayer,
      "Markers": markersLayer,
    },
    "Rescue service coverage": rescueGroup,
    "My data": myDataGroup,
  }

  L.control.groupedLayers({}, groupedOverlays, { collapsed: false, position: 'topleft' }).addTo(map)
  createBasemapControl().addTo(map)
  osmLayer.addTo(map)
}

// ── Map event handlers ────────────────────────────────────────────────────────

map.on('overlayadd', (event) => {
  const layerId = event.layer.options.layers
  toggleActiveState(layerId, true)
})

map.on('overlayremove', (event) => {
  const layerId = event.layer.options.layers
  toggleActiveState(layerId, false)
})

map.on('click', function(event) {
  const infoWindowContent = document.getElementById('info-content')
  infoWindowContent.innerHTML = ""
  Object.entries(activeWmsLayers).forEach(([key, value]) => {
    if (value == true) {
      const fullUrl = buildRequestUrl(event, 'https://landscape-geoinformatics.ut.ee/geoserver/pa2023/wms?', key)
      fetchWmsData(fullUrl, key)
      document.getElementById('info-box').style.display = 'block'
    }
  })
})

document.getElementById('info-close').addEventListener('click', () => {
  document.getElementById('info-box').style.display = 'none'
})

export function defaultMapSettings() {
  map.setView([58.373523, 26.716045], 12);
}

initializeLayers();
turfFunctions(map);
