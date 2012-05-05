from prosoar.waypoints.waypoint import Waypoint
from prosoar.georect import GeoRect

class WaypointList:
    def __init__(self):
        self.__list = []

    def __len__(self):
        return len(self.__list)

    def __getitem__(self, i):
        if i < 0 or i > len(self):
            return None
        return self.__list[i]

    def __iter__(self):
        return iter(self.__list)

    def append(self, wp):
        if not isinstance(wp, Waypoint):
            raise TypeError("Waypoint expected")
        
        self.__list.append(wp)

    def extend(self, wp_list):
        if not isinstance(wp_list, WaypointList):
            raise TypeError("WaypointList expected")
        
        self.__list.extend(wp_list)

    def get_bounds(self, offset_distance = 15.):
        rc = GeoRect(180, -180, -90, 90)
        for wp in self.__list:
            rc.left = min(rc.left, wp.lon)
            rc.right = max(rc.right, wp.lon)
            rc.top = max(rc.top, wp.lat)
            rc.bottom = min(rc.bottom, wp.lat)
        
        rc.expand(offset_distance)
        return rc
