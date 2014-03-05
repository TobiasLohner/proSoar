class GeoPoint:
    def __init__(self, lon, lat):
        self.lon = lon
        self.lat = lat

    def __str__(self):
        return '{}, {}'.format(self.lat, self.lon)
