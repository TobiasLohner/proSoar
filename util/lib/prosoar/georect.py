import math
from prosoar.geopoint import GeoPoint


class GeoRect:

    def __init__(self, left=0, right=0, top=0, bottom=0):
        self.left = left
        self.right = right
        self.top = top
        self.bottom = bottom

    def __str__(self):
        return 'left={}, right={}, top={}, bottom={}'.format(
            self.left, self.right, self.top, self.bottom
        )

    def height(self):
        return self.top - self.bottom

    def width(self):
        return self.right - self.left

    def intersects(self, other):
        return (self.inside(other.top, other.left) or
                self.inside(other.top, other.right) or
                self.inside(other.bottom, other.left) or
                self.inside(other.bottom, other.right) or
                other.inside(self.top, self.left) or
                other.inside(self.top, self.right) or
                other.inside(self.bottom, self.left) or
                other.inside(self.bottom, self.right))

    def __get_projected_point(self, point, distance, direction):
        lat1 = point[0] * (math.pi / 180.)
        lon1 = point[1] * (math.pi / 180.)
        distance_rad = (distance / 1.852) * math.pi / (180. * 60.)
        direction = direction * (math.pi / 180.)

        lat2 = math.asin(
            math.sin(lat1) * math.cos(distance_rad) +
            math.cos(lat1) * math.sin(distance_rad) * math.cos(direction)
        )

        lon2 = ((-lon1 - math.asin(
            math.sin(direction) * math.sin(distance_rad) / math.cos(lat2)
        ) + math.pi) % (2 * math.pi)) - math.pi

        lat2 = lat2 * (180 / math.pi)
        lon2 = -lon2 * (180 / math.pi)

        return [lat2, lon2]

    def expand(self, distance):
        midlat = (self.top + self.bottom) / 2.
        midlon = (self.top + self.bottom) / 2.

        left = self.__get_projected_point([midlat, self.left], distance, 270)
        right = self.__get_projected_point([midlat, self.right], distance, 90)
        top = self.__get_projected_point([self.top, midlon], distance, 0)
        bottom = self.__get_projected_point(
            [self.bottom, midlon], distance, 180)

        self.left = left[1]
        self.right = right[1]
        self.top = top[0]
        self.bottom = bottom[0]

    def inside(self, y, x):
        return (
            y <= self.top and y >= self.bottom and
            x <= self.right and x >= self.left
        )

    def get_center(self):
        return GeoPoint((self.left + self.right) / 2.,
                        (self.top + self.bottom) / 2.)
