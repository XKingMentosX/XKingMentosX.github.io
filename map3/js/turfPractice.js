import { pointsCollection } from "./points.js"

export function turfFunctions(map) {

  // ── Point: statue of Jakob Hurt ──────────────────────────────────────────
  const pointCoords = [26.71552, 58.37393]
  const myPoint = turf.point(pointCoords)
  const geoJSON_point = L.geoJSON(myPoint)
  geoJSON_point.addTo(map)

  // ── LineString: walkways in the park ─────────────────────────────────────
  const lineCoords = [
    [26.71379, 58.37476],
    [26.71554, 58.37349],
    [26.71553, 58.37434],
    [26.71630, 58.37378],
    [26.71473, 58.37407]
  ]
  const myLine = turf.lineString(lineCoords)
  L.geoJSON(myLine).addTo(map)

  // ── Polygon: park border ──────────────────────────────────────────────────
  const polygonCoords = [[
    [26.71355, 58.37468],
    [26.71404, 58.37430],
    [26.71433, 58.37429],
    [26.71550, 58.37345],
    [26.71660, 58.37388],
    [26.71615, 58.37420],
    [26.71589, 58.37431],
    [26.71552, 58.37461],
    [26.71521, 58.37496],
    [26.71480, 58.37481],
    [26.71449, 58.37502],
    [26.71355, 58.37468]
  ]]
  const myPolygon = turf.polygon(polygonCoords)
  L.geoJSON(myPolygon).addTo(map)

  // ── Distance measurement ──────────────────────────────────────────────────
  const myPondPoint = turf.point([26.71489, 58.37439])
  L.geoJSON(myPondPoint).addTo(map)

  const options = { units: 'meters' }
  const distance = turf.distance(myPoint, myPondPoint, options)
  console.log(`distance is ${Math.round(distance * 100) / 100} meters`)

  // ── Area measurement ──────────────────────────────────────────────────────
  const areaMeasurement = turf.area(myPolygon)
  console.log(`Rounded area is ${Math.round(areaMeasurement)} square meters`)

  // ── Buffer ────────────────────────────────────────────────────────────────
  const statueBuffer = turf.buffer(myPoint, 20, { units: 'meters' })
  // L.geoJSON(statueBuffer).addTo(map)
  const lineBuffer = turf.buffer(myLine, 10, { units: 'meters' })
  // L.geoJSON(lineBuffer).addTo(map)
  const parkBuffer = turf.buffer(myPolygon, 10, { units: 'meters' })
  // L.geoJSON(parkBuffer).addTo(map)
  const parkBufferNegative = turf.buffer(myPolygon, -10, { units: 'meters' })
  // L.geoJSON(parkBufferNegative).addTo(map)

  // ── Envelope ──────────────────────────────────────────────────────────────
  const myNewPoint = turf.point([26.71216, 58.37428])
  // L.geoJSON(myNewPoint).addTo(map)

  const features = turf.featureCollection([myPoint, myNewPoint, myLine, myPolygon])
  const enveloped = turf.envelope(features)
  // L.geoJSON(enveloped).addTo(map)

  // ── Points within polygon ─────────────────────────────────────────────────
  const points = turf.points(pointsCollection)
  // L.geoJSON(points).addTo(map)  // show all points

  const pointsWithinBorders = turf.pointsWithinPolygon(points, myPolygon)
  console.log(pointsWithinBorders)
  L.geoJSON(pointsWithinBorders).addTo(map)

  // ── Click event: log coordinates & add point on click ────────────────────
  // map.on('click', function(event) {
  //   console.log(`[${event.latlng.lng}, ${event.latlng.lat}]`)
  //   let clickedPoint = turf.point([event.latlng.lng, event.latlng.lat])
  //   L.geoJSON(clickedPoint).addTo(map)
  // })

  // ── Extra: centroid of the park polygon (bonus turf function) ─────────────
  const parkCentroid = turf.centroid(myPolygon)
  L.geoJSON(parkCentroid, {
    pointToLayer: function(feature, latlng) {
      return L.circleMarker(latlng, {
        radius: 8,
        fillColor: '#ff7800',
        color: '#000',
        weight: 1,
        fillOpacity: 0.9
      })
    }
  }).addTo(map)
}
