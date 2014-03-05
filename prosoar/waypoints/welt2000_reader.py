import re

from prosoar.waypoints.waypoint import Waypoint
from prosoar.waypoints.list import WaypointList


def __parse_line(line, bounds=None):
    if line.startswith('$'):
        return None

    lat = line[45:52]
    lat_neg = lat.startswith('S')
    lat = float(lat[1:3]) + float(lat[3:5]) / 60. + float(lat[5:7]) / 3600.
    if lat_neg:
        lat = -lat

    if bounds and (lat > bounds.top or lat < bounds.bottom):
        return None

    lon = line[52:60]
    lon_neg = lon.startswith('W')
    lon = float(lon[1:4]) + float(lon[4:6]) / 60. + float(lon[6:8]) / 3600.
    if lon_neg:
        lon = -lon

    if bounds and (lon > bounds.right or lon < bounds.left):
        return None

    wp = Waypoint()
    wp.lat = lat
    wp.lon = lon

    elev = line[41:45].strip()
    if elev != '':
        wp.altitude = float(elev)
    else:
        wp.altitude = 0.0

    wp.short_name = line[:6]
    if wp.short_name.endswith('1'):
        wp.type = 'airport'
    elif wp.short_name.endswith('2'):
        wp.type = 'outlanding'

    wp.short_name = wp.short_name.strip()

    wp.name = line[7:41].strip()

    if 'GLD' in wp.name:
        wp.type = 'glider_site'
    if 'ULM' in wp.name:
        wp.type = 'ulm'

    pos = -1
    if '#' in wp.name:
        pos = wp.name.find('#')
    if '*' in wp.name:
        pos = wp.name.find('*')

    if pos > -1:
        data = wp.name[pos + 1:]
        wp.name = wp.name[:pos].strip()

        icao = data[:4]
        if not icao.startswith('GLD') and not icao.startswith('ULM'):
            wp.icao = icao

        if data[4:5] == 'A':
            wp.surface = 'asphalt'
        elif data[4:5] == 'C':
            wp.surface = 'concrete'
        elif data[4:5] == 'L':
            wp.surface = 'loam'
        elif data[4:5] == 'S':
            wp.surface = 'sand'
        elif data[4:5] == 'Y':
            wp.surface = 'clay'
        elif data[4:5] == 'G':
            wp.surface = 'gras'
        elif data[4:5] == 'V':
            wp.surface = 'gravel'
        elif data[4:5] == 'D':
            wp.surface = 'dirt'

        runway_len = data[5:8].strip()
        if runway_len != '':
            wp.runway_len = int(runway_len) * 10

        runway_dir = data[8:10].strip()
        if runway_dir != '':
            wp.runway_dir = int(runway_dir) * 10

        freq = data[12:17].strip()
        if len(freq) == 5:
            if freq.endswith('2') or freq.endswith('7'):
                freq += '5'
            else:
                freq += '0'
            wp.freq = float(freq) / 1000.

    if wp.name.endswith('GLD'):
        wp.name = wp.name[:-3].strip()
    else:
        wp.name = wp.name.rstrip('!?1 ')

    if re.search('(^|\s)BERG($|\s)', wp.name):
        wp.type = 'mountain top'
    if re.search('(^|\s)COL($|\s)', wp.name):
        wp.type = 'mountain pass'
    if re.search('(^|\s)PASS($|\s)', wp.name):
        wp.type = 'mountain pass'
    if re.search('(^|\s)TOP($|\s)', wp.name):
        wp.type = 'mountain top'
    if re.search('(\s)A(\d){0,3}($|\s)', wp.name):
        wp.type = 'highway exit'
    if re.search('(\s)AB(\d){0,3}($|\s)', wp.name):
        wp.type = 'highway exit'
    if re.search('(\s)BAB(\d){0,3}($|\s)', wp.name):
        wp.type = 'highway exit'
    if re.search('(\s)(\w){0,3}XA(\d){0,3}($|\s)', wp.name):
        wp.type = 'highway cross'
    if re.search('(\s)(\w){0,3}YA(\d){0,3}($|\s)', wp.name):
        wp.type = 'highway junction'
    if re.search('(\s)STR($|\s)', wp.name):
        wp.type = 'road'
    if re.search('(\s)SX($|\s)', wp.name):
        wp.type = 'road cross'
    if re.search('(\s)SY($|\s)', wp.name):
        wp.type = 'road junction'
    if re.search('(\s)EX($|\s)', wp.name):
        wp.type = 'railway cross'
    if re.search('(\s)EY($|\s)', wp.name):
        wp.type = 'railway junction'
    if re.search('(\s)TR($|\s)', wp.name):
        wp.type = 'gas station'
    if re.search('(\s)BF($|\s)', wp.name):
        wp.type = 'railway station'
    if re.search('(\s)RS($|\s)', wp.name):
        wp.type = 'railway station'
    if re.search('(\s)BR($|\s)', wp.name):
        wp.type = 'bridge'
    if re.search('(\s)TV($|\s)', wp.name):
        wp.type = 'tower'
    if re.search('(\s)KW($|\s)', wp.name):
        wp.type = 'powerplant'

    wp.name = wp.name.title()

    while '  ' in wp.name:
        wp.name = wp.name.replace('  ', ' ')

    wp.country_code = line[60:62].strip()

    return wp


def parse_welt2000_waypoints(lines, bounds=None):
    waypoint_list = WaypointList()

    for line in lines:
        wp = __parse_line(line, bounds)
        if wp:
            waypoint_list.append(wp)

    return waypoint_list
