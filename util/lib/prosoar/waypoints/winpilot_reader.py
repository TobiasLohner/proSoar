from prosoar.waypoints.waypoint import Waypoint
from prosoar.waypoints.list import WaypointList

def __parse_altitude(str):
    str = str.lower()
    if str.endswith('ft') or str.endswith('f'):
        str = str.rstrip('ft')
        return int(str) * 0.3048
    else:
        str = str.rstrip('m')
        return int(str)

def __parse_coordinate(str):
    str = str.lower()
    negative = str.endswith('s') or str.endswith('w')
    str = str.rstrip('sw') if negative else str.rstrip('ne')

    str = str.split(':')
    if len(str) < 2: return None

    if len(str) == 2:
      # degrees + minutes / 60
      a = int(str[0]) + float(str[1]) / 60

    if len(str) == 3:
      # degrees + minutes / 60 + seconds / 3600
      a = int(str[0]) + float(str[1]) / 60 + float(str[2]) / 3600

    if (negative): a *= -1
    return a

def parse_winpilot_waypoints(lines):
    waypoint_list = WaypointList()
    
    for line in lines:
        line = line.strip()
        if line == '' or line.startswith('*'):
            continue

        fields = line.split(',')
        if len(fields) < 6:
            continue

        wp = Waypoint()
        wp.lat = __parse_coordinate(fields[1]);
        wp.lon = __parse_coordinate(fields[2]);
        wp.altitude = __parse_altitude(fields[3]);
        wp.name = fields[5].strip();
        
        waypoint_list.append(wp)
        
    return waypoint_list
