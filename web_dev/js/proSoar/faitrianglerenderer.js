/**
 *  faitrianglerenderer.js
 *
 * This is proSoar. It's a software for online soaring task generation.
 *
 * (c) 2013, Tobias Lohner <tobias@lohner-net.de>
 *
 * FAI sector rendering taken from the XCSoar project:
 *  XCSoar Glide Computer - http://www.xcsoar.org/
 *  Copyright (C) 2000-2013 The XCSoar Project
 *
 * Licenced under GPL v2
**/

SMALL_MIN_LEG = 0.28;
SMALL_MAX_LEG = 1 - SMALL_MIN_LEG * 2;

LARGE_THRESHOLD = 750000;
LARGE_MIN_LEG = 0.25;
LARGE_MAX_LEG = 0.45;

STEPS = 20;

CalcAlpha = function(dist_a, dist_b, dist_c) {
  var cos_alpha = (Math.pow(dist_b, 2) + Math.pow(dist_c, 2) - Math.pow(dist_a, 2)) /
    (dist_c * dist_b * 2);
  return Math.acos(cos_alpha);
};

CalcAngle = function(angle, dist_a, dist_b, dist_c, reverse) {
  var alpha = CalcAlpha(dist_a, dist_b, dist_c);
  return reverse ? angle + alpha : angle - alpha;
};

CalcGeoPoint = function(origin, angle, dist_a, dist_b, dist_c, reverse) {
  var lonlat = new OpenLayers.Util.destinationVincenty(origin,
    CalcAngle(angle, dist_a, dist_b, dist_c, reverse) * 180 / Math.PI,
    dist_b);
  return new OpenLayers.Geometry.Point(lonlat.lon, lonlat.lat);
};

GenerateFAITriangleRight = function(points, origin, bearing_c, dist_c, dist_min, dist_max, reverse) {
  var delta_distance = (dist_max - dist_min) / STEPS;
  var total_distance = dist_min;

  for (var i = 0; i < STEPS /*&& total_distance < LARGE_THRESHOLD*/; i++,
         total_distance += delta_distance) {
    var dist_a = SMALL_MIN_LEG * total_distance;
    var dist_b = total_distance - dist_a - dist_c;
    points.push(CalcGeoPoint(origin, bearing_c, dist_a, dist_b, dist_c, reverse));
  }

  return points;
};

GenerateFAITriangleTop = function(points, origin, bearing_c, dist_c, dist_max, reverse) {
  var delta_distance = dist_max * (1 - 3 * SMALL_MIN_LEG) / STEPS;
  var dist_a = dist_c;
  var dist_b = dist_max - dist_a - dist_c;

  for (var i = 0; i < STEPS; i++,
         dist_a += delta_distance,
         dist_b -= delta_distance) {
    points.push(CalcGeoPoint(origin, bearing_c, dist_a, dist_b, dist_c, reverse));
  }

  return points;
};

GenerateFAITriangleLeft = function(points, origin, bearing_c, dist_c, dist_min, dist_max, reverse) {
  var delta_distance = (dist_max - dist_min) / STEPS;
  var total_distance = dist_max;

  for (var i = 0; i < STEPS; i++,
         total_distance -= delta_distance) {
    //if (total_distance >= LARGE_THRESHOLD) continue;

    var dist_b = SMALL_MIN_LEG * total_distance;
    var dist_a = total_distance - dist_b - dist_c;

    points.push(CalcGeoPoint(origin, bearing_c, dist_a, dist_b, dist_c, reverse));
  }

  return points;
};

GenerateFAITriangleLargeBottomRight = function(points, origin, bearing_c, dist_c, reverse) {
  var max_leg = LARGE_THRESHOLD * LARGE_MAX_LEG;
  var min_leg = LARGE_THRESHOLD - max_leg - dist_c;

  var min_a = LARGE_THRESHOLD / 4;

  var a_start = LARGE_THRESHOLD * SMALL_MIN_LEG;
  var a_end = Math.max(min_leg, min_a);

  if (a_start <= a_end) return points;

  var dist_a = a_start;
  var dist_b = LARGE_THRESHOLD - dist_c - dist_a;

  var delta_distance = (a_start - a_end) / STEPS;

  for (var i = 0; i < STEPS; i++,
         dist_a -= delta_distance,
         dist_b += delta_distance) {

    points.push(CalcGeoPoint(origin, bearing_c, dist_a, dist_b, dist_c, reverse));
  }

  return points;
};

GenerateFAITriangleLargeRight1 = function(points, origin, bearing_c, dist_c, dist_min, dist_max, reverse) {
  if (dist_min >= LARGE_THRESHOLD) return points;

  var delta_distance = (dist_max - LARGE_THRESHOLD) / STEPS;
  var total_distance = LARGE_THRESHOLD;

  for (var i = 0; i < STEPS; i++,
         total_distance += delta_distance) {

    var dist_a = total_distance / 4;
    var dist_b = total_distance - dist_a - dist_c;
    if (dist_b > total_distance * LARGE_MAX_LEG) break;

    points.push(CalcGeoPoint(origin, bearing_c, dist_a, dist_b, dist_c, reverse));
  }

  return points;
};

GenerateFAITriangleLargeRight2 = function(points, origin, bearing_c, dist_c, dist_min, dist_max, reverse) {
  var min_total_for_a = dist_c / (1 - LARGE_MAX_LEG - LARGE_MIN_LEG);

  var delta_distance = (dist_max - dist_min) / STEPS;
  var total_distance = Math.max(Math.max(dist_min, LARGE_THRESHOLD), min_total_for_a);

  for (var i = 0; i < STEPS && total_distance < dist_max; i++,
         total_distance += delta_distance) {

    var dist_b = total_distance * LARGE_MAX_LEG;
    var dist_a = total_distance - dist_b - dist_c;

    points.push(CalcGeoPoint(origin, bearing_c, dist_a, dist_b, dist_c, reverse));
  }

  return points;
};

GenerateFAITriangleLargeTop = function(points, origin, bearing_c, dist_c, dist_max, reverse) {
  var max_leg = dist_max * LARGE_MAX_LEG;
  var min_leg = dist_max - dist_c - max_leg;

  var delta_distance = (max_leg - min_leg) / STEPS;
  var dist_a = min_leg;
  var dist_b = max_leg;

  for (var i = 0; i < STEPS; i++,
         dist_a += delta_distance,
         dist_b -= delta_distance) {

    points.push(CalcGeoPoint(origin, bearing_c, dist_a, dist_b, dist_c, reverse));
  }

  return points;
};

GenerateFAITriangleLargeLeft2 = function(points, origin, bearing_c, dist_c, dist_min, dist_max, reverse) {
  var delta_distance = (dist_max - dist_min) / STEPS;
  var total_distance = dist_max;

  for (var i = 0; i < STEPS; i++,
         total_distance -= delta_distance) {

    if (total_distance < LARGE_THRESHOLD) break;

    var dist_a = total_distance * LARGE_MAX_LEG;
    var dist_b = total_distance - dist_a - dist_c;
    if (dist_b < total_distance / 4) break;

    points.push(CalcGeoPoint(origin, bearing_c, dist_a, dist_b, dist_c, reverse));
  }

  return points;
};

GenerateFAITriangleLargeLeft1 = function(points, origin, bearing_c, dist_c, dist_min, dist_max, reverse) {
  if (dist_min >= LARGE_THRESHOLD) return points;

  var max_total_for_a = dist_c / (1 - LARGE_MAX_LEG - LARGE_MIN_LEG);

  var total_start = Math.min(dist_max, max_total_for_a);
  var total_end = LARGE_THRESHOLD;

  var delta_distance = (total_start - total_end) / STEPS;
  var total_distance = total_start;

  for (var i = 0; i < STEPS; i++,
         total_distance -= delta_distance) {

    var dist_b = total_distance / 4;
    var dist_a = total_distance - dist_b - dist_c;

    points.push(CalcGeoPoint(origin, bearing_c, dist_a, dist_b, dist_c, reverse));
  }

  return points;
};

GenerateFAITriangleLargeBottomLeft = function(points, origin, bearing_c, dist_c, reverse) {
  var max_leg = LARGE_THRESHOLD * LARGE_MAX_LEG;
  var min_leg = LARGE_THRESHOLD - max_leg - dist_c;

  var min_b = LARGE_THRESHOLD / 4;

  var b_start = Math.max(min_leg, min_b);
  var b_end = LARGE_THRESHOLD * SMALL_MIN_LEG;

  if (b_start >= b_end) return points;

  var dist_b = b_start;
  var dist_a = LARGE_THRESHOLD - dist_c - dist_b;

  var delta_distance = (b_end - b_start) / STEPS;

  for (var i = 0; i < STEPS; i++,
         dist_a -= delta_distance,
         dist_b += delta_distance) {

    points.push(CalcGeoPoint(origin, bearing_c, dist_a, dist_b, dist_c, reverse));
  }

  return points;
};

GenerateFAITriangleArea = function(point1, point2, reverse) {
  var bearing_c = calculateBearing(point1, point2) * Math.PI / 180;
  var dist_c = Util_distVincenty(point1, point2);

  var dist_max = dist_c / SMALL_MIN_LEG;
  var dist_min = dist_c / SMALL_MAX_LEG;

  var large_dist_min = dist_c / LARGE_MAX_LEG;
  var large_dist_max = dist_c / LARGE_MIN_LEG;

  var points = [];

  points = GenerateFAITriangleRight(points, point1, bearing_c, dist_c, dist_min, dist_max, reverse);

/*
  if (large_dist_max > LARGE_THRESHOLD) {
    points = GenerateFAITriangleLargeBottomRight(points, point1, bearing_c, dist_c,
                                                 reverse);
    points = GenerateFAITriangleLargeRight1(points, point1, bearing_c, dist_c,
                                            large_dist_min, large_dist_max,
                                            reverse);

    points = GenerateFAITriangleLargeRight2(points, point1, bearing_c, dist_c,
                                            large_dist_min, large_dist_max,
                                            reverse);

    points = GenerateFAITriangleLargeTop(points, point1, bearing_c, dist_c,
                                         large_dist_max,
                                         reverse);

    points = GenerateFAITriangleLargeLeft2(points, point1, bearing_c, dist_c,
                                           large_dist_min, large_dist_max,
                                           reverse);

    points = GenerateFAITriangleLargeLeft1(points, point1, bearing_c, dist_c,
                                           large_dist_min, large_dist_max,
                                           reverse);

    points = GenerateFAITriangleLargeBottomLeft(points, point1, bearing_c, dist_c,
                                                reverse);
  } else */ {
    points = GenerateFAITriangleTop(points, point1, bearing_c, dist_c,
                                    dist_max,
                                    reverse);
  }

  points = GenerateFAITriangleLeft(points, point1, bearing_c, dist_c,
                                   dist_min, dist_max,
                                   reverse);

  return points;
};
