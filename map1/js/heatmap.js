"use strict";

let map = L.map("map").setView([58.373523, 26.716045], 12);

const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "OpenStreetMap contributors",
});

osm.addTo(map);

// default map settings
function defaultMapSettings() {
  map.setView([58.373523, 26.716045], 12);
}

addGeoJson("geojson/tartu_city_celltowers_edu.geojson");

// add geoJSON layer
async function addGeoJson(url) {
  const response = await fetch(url);
  const data = await response.json();

  const heatData = data.features.map(heatDataConvert).filter(Boolean);
  const heatMap = L.heatLayer(heatData, { radius: 10 });
  heatMap.addTo(map);
}

function heatDataConvert(feature) {
  const coords = feature.geometry && feature.geometry.coordinates;
  if (!coords || coords.length < 2) return null;

  const weight = feature.properties && feature.properties.area;

  return [coords[1], coords[0], typeof weight === "number" ? weight : 0];
}
