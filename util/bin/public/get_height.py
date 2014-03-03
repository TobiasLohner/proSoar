from flask import Blueprint, request, jsonify

import subprocess
import re
import math
import os

bp = Blueprint('get_height', __name__)


@bp.route('/height/lon<float:lon>/lat<float:lat>')
def height(lon, lat):
    return get_height(lon, lat)


@bp.route('/bin/get_height.py')
def bin_get_height():
    return get_height(request.values.get('lon', type=float),
                      request.values.get('lat', type=float))


def get_height(lon, lat):
    srtm_dir = "/home/tobs/srtm_v4"
    gdallocationinfo = os.path.join(srtm_dir, 'gdallocationinfo')

    height = -999

    if lon >= -180 and lon <= 180 \
       and lat >= -60 and lat <= 60:

        file_lat = int(math.ceil((60 - lat) / 5))
        file_lon = int(math.ceil((175 + lon) / 5) + 1)

        srtm_file_basename = 'srtm_' + \
            '{0:02d}'.format(file_lon) + '_' + '{0:02d}'.format(file_lat)

        srtm_file = '/vsizip/' + srtm_dir + '/' + srtm_file_basename + \
            '.zip' + '/' + srtm_file_basename + '.tif'

        process = subprocess.Popen(
            [gdallocationinfo, '-b', '1', '-valonly', '-lifonly', '-wgs84',
             srtm_file, str(lon), str(lat)], stdout=subprocess.PIPE)
        stdout, stderr = process.communicate()

        m = re.compile('([-\d.]*)').match(stdout)

        if m is not None and m.group(1) != '':
            height = int(m.group(1))

        if height == -32768:
            height = 0

    return jsonify({
        'lon': lon,
        'lat': lat,
        'height': height,
    })
