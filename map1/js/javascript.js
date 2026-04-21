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

// add popup to each feature
function popUPinfo(feature, layer) {
  layer.bindPopup(feature.properties.NIMI);
}

// get color from feature property
function getColor(property) {
  switch (property) {
    case 1:
      return "#ff0000";
    case 2:
      return "#ff9900";
    case 3:
      return "#ffcc00";
    case 4:
      return "#99cc00";
    case 5:
      return "#009933";
    case 6:
      return "#0000ff";
    case 7:
      return "#ff0066";
    case 8:
      return "#cc00ff";
    case 9:
      return "#00ccff";
    case 10:
      return "#00cc99";
    case 11:
      return "#996633";
    case 12:
      return "#6666ff";
    case 13:
      return "#00a86b";
    case 14:
      return "#ff66cc";
    case 15:
      return "#ff6666";
    case 16:
      return "#66ff66";
    case 17:
      return "#666666";
    case 30:
      return "#ffffff";
    default:
      return "#ffffff";
  }
}

// polygon style
function polygonStyle(feature) {
  return {
    fillColor: getColor(feature.properties.OBJECTID),
    fillOpacity: 0.5,
    weight: 1,
    opacity: 1,
    color: "grey",
  };
}

// add geoJSON polygons layer
async function addDistrictsGeoJson(url) {
  const response = await fetch(url);
  const data = await response.json();

  const polygons = L.geoJson(data, {
    onEachFeature: popUPinfo,
    style: polygonStyle,
  });

  polygons.addTo(map);
}

addDistrictsGeoJson("geojson/tartu_city_districts_edu.geojson");

// add geoJSON layer
async function addCelltowersGeoJson(url) {
  const response = await fetch(url);
  const data = await response.json();
  const markers = L.geoJson(data);
  const clusters = L.markerClusterGroup();
  clusters.addLayer(markers);
  clusters.addTo(map);
}

addCelltowersGeoJson("geojson/tartu_city_celltowers_edu.geojson");
