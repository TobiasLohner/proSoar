#!/usr/bin/python2.6

from pyproj import Proj, transform
import math

def for_openlayers(data):
# convert latlon from WGS84 to epsg:3785 (google spherical mercator)
# then simplify the trace with douglas-peucker's algorithm
# in the end, each fix contains of [x, y, lod]

  fixes = []

  proj_wgs84 = Proj(proj='latlong', datum='WGS84') #init = 'epsg:4326')
  proj_smerc = Proj(init = 'epsg:3785')

  for fix in data:
    x, y = transform(proj_wgs84, proj_smerc, fix.latlon.lon, fix.latlon.lat)
#    fixes.append({'x': int(x), 'y': int(y)})
    fixes.append([int(x), int(y)])

  fixes = douglas_peucker(fixes)

  fixes = compress(fixes)

  return fixes


def compress(points):
  i = len(points)-1
  while i >= 1:
#    points[i]['x'] = points[i]['x'] - points[i-1]['x']
#    points[i]['y'] = points[i]['y'] - points[i-1]['y']
    points[i][0] = points[i][0] - points[i-1][0]
    points[i][1] = points[i][1] - points[i-1][1]
    i -= 1

  return points

def douglas_peucker(points):
# pure-Python Douglas-Peucker line simplification/generalization
#
# this code was written by Schuyler Erle <schuyler@nocat.net> and is
# made available in the public domain.
#
# the code was ported from a freely-licensed example at
# http://www.3dsoftware.com/Cartography/Programming/PolyLineReduction/
#
# the original page is no longer available, but is mirrored at
# http://www.mappinghacks.com/code/PolyLineReduction/
#
# modifications for level of detail classification by Tobias Lohner
#

  anchor = 0
  floater = len(points) - 1
  stack = []
  lod = [-1] * len(points)
  tolerance = [1500, 300, 75, 5]

  tolerance = [t**2 for t in tolerance]

  stack.append((anchor, floater))
  while stack:
    anchor, floater = stack.pop()

    # initialize line segment
    if points[floater] != points[anchor]:
#      anchorX = float(points[floater]['x'] - points[anchor]['x'])
#      anchorY = float(points[floater]['y'] - points[anchor]['y'])
      anchorX = points[floater][0] - points[anchor][0]
      anchorY = points[floater][1] - points[anchor][1]
      seg_len = math.sqrt(anchorX ** 2 + anchorY ** 2)
      seg_len = math.sqrt(anchorX ** 2 + anchorY ** 2)
      # get the unit vector
      anchorX /= seg_len
      anchorY /= seg_len
    else:
      anchorX = anchorY = seg_len = 0.0

    # inner loop:
    max_dist_sqr = 0.0
    farthest = anchor + 1
    for i in range(anchor + 1, floater):
      dist_to_seg_sqr = 0.0
      # compare to anchor
#      vecX = float(points[i]['x'] - points[anchor]['x'])
#      vecY = float(points[i]['y'] - points[anchor]['y'])
      vecX = points[i][0] - points[anchor][0]
      vecY = points[i][1] - points[anchor][1]
      seg_len_sqr = vecX ** 2 + vecY ** 2
      # dot product:
      proj = vecX * anchorX + vecY * anchorY
      if proj < 0.0:
        dist_to_seg_sqr = seg_len_sqr
      else:
        # compare to floater
#        vecX = float(points[i]['x'] - points[floater]['x'])
#        vecY = float(points[i]['y'] - points[floater]['y'])
        vecX = points[i][0] - points[floater][0]
        vecY = points[i][1] - points[floater][1]
        #seg_len = math.sqrt( vecX ** 2 + vecY ** 2 )
        seg_len_sqr = vecX ** 2 + vecY ** 2
        # dot product:
        proj = vecX * (-anchorX) + vecY * (-anchorY)
        if proj < 0.0:
          dist_to_seg_sqr = seg_len_sqr
        else: # calculate perpendicular distance to line (pythagorean theorem):
          #dist_to_seg = math.sqrt(abs(seg_len ** 2 - proj ** 2))
          dist_to_seg_sqr = abs(seg_len_sqr - proj ** 2)

        if max_dist_sqr < dist_to_seg_sqr:
          max_dist_sqr = dist_to_seg_sqr
          farthest = i

    for i, tol in reversed(list(enumerate(tolerance))):
      if max_dist_sqr <= tol:
        if lod[anchor] == -1:
          lod[anchor] = i
        if lod[floater] == -1:
          lod[floater] = i

    if max_dist_sqr > tolerance[-1]:
      stack.append((anchor, farthest))
      stack.append((farthest, floater))

  # keep first and last point in all levels of detail
  lod[0] = 0
  lod[-1] = 0

#  return [{'x': points[i]['x'], 'y': points[i]['y'], 'l': lod[i]} \
  return [[points[i][0], points[i][1], lod[i]] \
    for i in range(len(points)) if lod[i] != -1]

