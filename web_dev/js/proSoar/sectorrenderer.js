/**
 *  sectorrenderer.js
 * 
 * This is proSoar. It's a software for online soaring task generation.
 * 
 * (c) 2012 - 2013, Tobias Lohner <tobias@lohner-net.de>
 *
 * Licenced under GPL v2
**/

/*
 * APIMethod: createGeodesicPolygon
 * Create a regular polygon around a radius. Useful for creating circles
 * and the like.
 *
 * Parameters:
 * origin - {<OpenLayers.Geometry.Point>} center of polygon.
 * radius - {Float} distance to vertex, in map units.
 * sides - {Integer} Number of sides. 20 approximates a circle.
 * rotation - {Float} original angle of rotation, in degrees.
 * projection - {<OpenLayers.Projection>} the map's projection
 */
OpenLayers.Geometry.Polygon.createSector = function(origin, radius,
  inner_radius, start_radial, end_radial, sides, projection){

  var angle;
  var new_lonlat, geom_point;


  if ((end_radial - start_radial)%360 == 0) {
    var points = new Array();
    for (var i = 0; i < sides; i++) {
        angle = (i * 360 / sides);
        new_lonlat = OpenLayers.Util.destinationVincenty(origin, angle, radius);
        new_lonlat.transform(this.epsg4326, projection);
        geom_point = new OpenLayers.Geometry.Point(new_lonlat.lon, new_lonlat.lat);
        points.push(geom_point);
    }
    var outer_ring = new OpenLayers.Geometry.LinearRing(points);

    var points = new Array();
    if (inner_radius > 0) {
      for (var i = 0; i < sides; i++) {
          angle = (i * 360 / sides);
          new_lonlat = OpenLayers.Util.destinationVincenty(origin, angle, inner_radius);
          new_lonlat.transform(this.epsg4326, projection);
          geom_point = new OpenLayers.Geometry.Point(new_lonlat.lon, new_lonlat.lat);
          points.push(geom_point);
      }
      var inner_ring = new OpenLayers.Geometry.LinearRing(points);

      return new OpenLayers.Geometry.Polygon([outer_ring, inner_ring]);
    } else
      return new OpenLayers.Geometry.Polygon([outer_ring]);

  } else {

    var points = new Array();
    for (var i = 0; i <= sides; i++) {
        angle = start_radial + (i * ((end_radial - start_radial + 360)%360) / sides);
        new_lonlat = OpenLayers.Util.destinationVincenty(origin, angle, radius);
        new_lonlat.transform(this.epsg4326, projection);
        geom_point = new OpenLayers.Geometry.Point(new_lonlat.lon, new_lonlat.lat);
        points.push(geom_point);
    }

    for (var i = sides; i >= 0; i--) {
        angle = start_radial + (i * ((end_radial - start_radial + 360)%360) / sides);
        new_lonlat = OpenLayers.Util.destinationVincenty(origin, angle, inner_radius);
        new_lonlat.transform(this.epsg4326, projection);
        geom_point = new OpenLayers.Geometry.Point(new_lonlat.lon, new_lonlat.lat);
        points.push(geom_point);
    }

    var ring = new OpenLayers.Geometry.LinearRing(points);
    return new OpenLayers.Geometry.Polygon([ring]);
  }

};

OpenLayers.Geometry.Polygon.createKeyholeSector = function(origin, outer_radius, inner_radius, sides, projection)
{

  var angle;
  var new_lonlat, geom_point;
  var points = new Array();

  for (var i = 0; i < sides; i++) {
    angle = (i * 360 / sides) - 45;
    if (angle >= -45 && angle <= 45) {
      new_lonlat = OpenLayers.Util.destinationVincenty(origin, angle, outer_radius);
    } else {
      new_lonlat = OpenLayers.Util.destinationVincenty(origin, angle, inner_radius);
    }
    new_lonlat.transform(this.epsg4326, projection);
    geom_point = new OpenLayers.Geometry.Point(new_lonlat.lon, new_lonlat.lat);
    points.push(geom_point);
  }

  var ring = new OpenLayers.Geometry.LinearRing(points);
  return new OpenLayers.Geometry.Polygon([ring]);
};

OpenLayers.Geometry.Polygon.createBGAEnhancedOptionSector = function(origin, outer_radius, inner_radius, sides, projection)
{

  var angle;
  var new_lonlat, geom_point;
  var points = new Array();

  for (var i = 0; i < sides; i++) {
    angle = (i * 360 / sides) - 90;
    if (angle >= -90 && angle <= 90) {
      new_lonlat = OpenLayers.Util.destinationVincenty(origin, angle, outer_radius);
    } else {
      new_lonlat = OpenLayers.Util.destinationVincenty(origin, angle, inner_radius);
    }
    new_lonlat.transform(this.epsg4326, projection);
    geom_point = new OpenLayers.Geometry.Point(new_lonlat.lon, new_lonlat.lat);
    points.push(geom_point);
  }

  var ring = new OpenLayers.Geometry.LinearRing(points);
  return new OpenLayers.Geometry.Polygon([ring]);
};


OpenLayers.Geometry.Polygon.createStartLine = function(origin, radius, projection)
{
  return OpenLayers.Geometry.Polygon.createLine(origin, radius, projection);
};

OpenLayers.Geometry.Polygon.createFinishLine = function(origin, radius, projection)
{
  return OpenLayers.Geometry.Polygon.createLine(origin, radius, projection);
};

OpenLayers.Geometry.Polygon.createLine = function(origin, radius, projection)
{
  var angle;
  var new_lonlat, geom_point;
  var points = new Array();

  new_lonlat = OpenLayers.Util.destinationVincenty(origin, -90, radius);
  new_lonlat.transform(this.epsg4326, projection);
  geom_point = new OpenLayers.Geometry.Point(new_lonlat.lon, new_lonlat.lat);
  points.push(geom_point);

  new_lonlat = origin.clone().transform(this.epsg4326, projection);
  geom_point = new OpenLayers.Geometry.Point(new_lonlat.lon, new_lonlat.lat);
  points.push(geom_point);

  new_lonlat = OpenLayers.Util.destinationVincenty(origin, +90, radius);
  new_lonlat.transform(this.epsg4326, projection);
  geom_point = new OpenLayers.Geometry.Point(new_lonlat.lon, new_lonlat.lat);
  points.push(geom_point);

  var ring = new OpenLayers.Geometry.LineString(points);
  return ring;
};


OpenLayers.Geometry.Polygon.createFAITriangleSector = function(point1, point2, side, projection) {
  var points = new Array();

  if (side > 0) side = 1;
  if (side <= 0) side = -1;

  var gamma_min = 38.2132; // (Math.acos(11/14)) * 180/Math.PI; // 38.2132 deg
  var gamma_max = 103.574; // (Math.asin(23/98) + Math.PI/2) * 180/Math.PI; // 103.574 deg
  var gamma_2_min = 38.2132; //(Math.asin(11/14) - Math.asin(23/98)) * 180/Math.PI; // 38.2132 deg = Math.acos(11/14)
  var steps = 20;

  var p1_p2_angle = calculateBearing(point1, point2);
  var p2_p1_angle = calculateBearing(point2, point1);
  var p1_p2_dist = Util_distVincenty(point1, point2);

  // first circle around point1
  for (var i = 1; i <= steps; i++) {
    var gamma = gamma_max - (gamma_max - gamma_min)/steps * i;
    var angle = p1_p2_angle + side * gamma;
    var distance = solveSphericalFAISector_1(p1_p2_dist, gamma);

    new_lonlat = OpenLayers.Util.destinationVincenty(point1, angle, distance);
    new_lonlat.transform(this.epsg4326, projection);
    var geom_point = new OpenLayers.Geometry.Point(new_lonlat.lon, new_lonlat.lat);

    points.push(geom_point);
  }

  // second circle around point2
  for (var i = 1; i <= steps; i++) {
    var gamma = gamma_min + (gamma_max - gamma_min) / steps * i;
    var angle = p2_p1_angle - side * gamma;
    var distance = solveSphericalFAISector_1(p1_p2_dist, gamma);

    new_lonlat = OpenLayers.Util.destinationVincenty(point2, angle, distance);
    new_lonlat.transform(this.epsg4326, projection);
    var geom_point = new OpenLayers.Geometry.Point(new_lonlat.lon, new_lonlat.lat);

    points.push(geom_point);
  }

  // third circle around point2
  for (var i = 1; i <= steps*2; i++) {
    var gamma = gamma_max - (gamma_max - gamma_2_min) / (steps*2) * i;
    var angle = p2_p1_angle - side * gamma;
    var distance = solveSphericalFAISector_2(p1_p2_dist, gamma);

    new_lonlat = OpenLayers.Util.destinationVincenty(point2, angle, distance);
    new_lonlat.transform(this.epsg4326, projection);
    var geom_point = new OpenLayers.Geometry.Point(new_lonlat.lon, new_lonlat.lat);

    points.push(geom_point);
  }

  return points;
};


solveSphericalFAISector_1 = function(a, gamma) {
  gamma = gamma * Math.PI/180;
  var max_iter = 3;
  var R_EARTH = 6378137;

  // initial solution
  var b = -14 * a * (7 * Math.cos(gamma) - 18) / 275;
/*
  b = b / R_EARTH;
  a = a / R_EARTH;

  for (var i = 0; i < max_iter; i++) {
    b = 7/18 * (a + Math.acos(Math.cos(a)*Math.cos(b) + Math.sin(a)*Math.sin(b)*Math.cos(gamma)));
  }

  return b * R_EARTH;
*/
  return b;
};


solveSphericalFAISector_2 = function(a, gamma) {
  gamma = gamma * Math.PI/180;
  var max_iter = 3;
  var R_EARTH = 6378137;

  // initial solution
  var b = -275 * a / (14 * (7 * Math.cos(gamma) - 18));
/*
  b = b / R_EARTH;
  a = a / R_EARTH;

  for (var i = 0; i < max_iter; i++) {
    b = 18/7 * a - Math.acos(Math.cos(a)*Math.cos(b) + Math.sin(a)*Math.sin(b)*Math.cos(gamma));
  }

  return b * R_EARTH;
*/
  return b;
};


