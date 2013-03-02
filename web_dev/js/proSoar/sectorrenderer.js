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
 */
OpenLayers.Geometry.Polygon.createSector = function(origin, radius,
  inner_radius, start_radial, end_radial, sides){

  var angle;
  var new_lonlat, geom_point;

  if ((end_radial - start_radial)%360 == 0) {
    var points = new Array();
    for (var i = 0; i < sides; i++) {
        angle = (i * 360 / sides);
        new_lonlat = OpenLayers.Util.destinationVincenty(origin, angle, radius);
        geom_point = new OpenLayers.Geometry.Point(new_lonlat.lon, new_lonlat.lat);
        points.push(geom_point);
    }
    var outer_ring = new OpenLayers.Geometry.LinearRing(points);

    var points = new Array();
    if (inner_radius > 0) {
      for (var i = 0; i < sides; i++) {
          angle = (i * 360 / sides);
          new_lonlat = OpenLayers.Util.destinationVincenty(origin, angle, inner_radius);
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
        geom_point = new OpenLayers.Geometry.Point(new_lonlat.lon, new_lonlat.lat);
        points.push(geom_point);
    }

    for (var i = sides; i >= 0; i--) {
        angle = start_radial + (i * ((end_radial - start_radial + 360)%360) / sides);
        new_lonlat = OpenLayers.Util.destinationVincenty(origin, angle, inner_radius);
        geom_point = new OpenLayers.Geometry.Point(new_lonlat.lon, new_lonlat.lat);
        points.push(geom_point);
    }

    var ring = new OpenLayers.Geometry.LinearRing(points);
    return new OpenLayers.Geometry.Polygon([ring]);
  }

};

OpenLayers.Geometry.Polygon.createKeyholeSector = function(origin, outer_radius, inner_radius, sides)
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
    geom_point = new OpenLayers.Geometry.Point(new_lonlat.lon, new_lonlat.lat);
    points.push(geom_point);
  }

  var ring = new OpenLayers.Geometry.LinearRing(points);
  return new OpenLayers.Geometry.Polygon([ring]);
};

OpenLayers.Geometry.Polygon.createBGAEnhancedOptionSector = function(origin, outer_radius, inner_radius, sides)
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
    geom_point = new OpenLayers.Geometry.Point(new_lonlat.lon, new_lonlat.lat);
    points.push(geom_point);
  }

  var ring = new OpenLayers.Geometry.LinearRing(points);
  return new OpenLayers.Geometry.Polygon([ring]);
};


OpenLayers.Geometry.Polygon.createStartLine = function(origin, radius)
{
  return OpenLayers.Geometry.Polygon.createLine(origin, radius);
};

OpenLayers.Geometry.Polygon.createFinishLine = function(origin, radius)
{
  return OpenLayers.Geometry.Polygon.createLine(origin, radius);
};

OpenLayers.Geometry.Polygon.createLine = function(origin, radius)
{
  var angle;
  var new_lonlat, geom_point;
  var points = new Array();

  new_lonlat = OpenLayers.Util.destinationVincenty(origin, -90, radius);
  geom_point = new OpenLayers.Geometry.Point(new_lonlat.lon, new_lonlat.lat);
  points.push(geom_point);

  new_lonlat = origin.clone();
  geom_point = new OpenLayers.Geometry.Point(new_lonlat.lon, new_lonlat.lat);
  points.push(geom_point);

  new_lonlat = OpenLayers.Util.destinationVincenty(origin, +90, radius);
  geom_point = new OpenLayers.Geometry.Point(new_lonlat.lon, new_lonlat.lat);
  points.push(geom_point);

  var ring = new OpenLayers.Geometry.LineString(points);
  return ring;
};

