from prosoar.geopoint import GeoPoint

class Waypoint(GeoPoint):
    def __init__(self):
        self.altitude = 0
        self.name = ''
        self.short_name = ''
        self.icao = ''
        self.country_code = ''
        self.surface = None
        self.runway_len = None
        self.runway_dir = None
        self.freq = None
        self.type = None

    def __str__(self):
        return '{}, {}, {}'.format(self.name, super(), self.altitude)

