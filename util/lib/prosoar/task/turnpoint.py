from prosoar.geopoint import GeoPoint
from prosoar.task.sector import Sector


class Turnpoint(GeoPoint):

    def __init__(self):
        self.name = ''
        self.id = 0
        self.comment = ''
        self.altitude = 0

        self.sector = Sector()

    def __str__(self):
        return '{}'.format(self.name)
