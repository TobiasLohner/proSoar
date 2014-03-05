from flask import Blueprint, request
from werkzeug.exceptions import NotFound

import os
import sys
import json

app_dir = os.path.abspath(__file__ + '/../../..')
sys.path.append(os.path.join(app_dir, 'lib'))

from prosoar.userconfig import get_uid_from_cookie, read_user_config
from prosoar.waypoints.seeyou_reader import parse_seeyou_waypoints

bp = Blueprint('get_waypoints', __name__)


@bp.route('/waypoints/<int:tpfile_id>/lon<int:tpfile_lon>/lat<int:tpfile_lat>')
def get(tpfile_id, tpfile_lon, tpfile_lat):
    uid = get_uid_from_cookie()
    storage_dir = os.path.join(app_dir, 'storage')

    userconfig = read_user_config(uid)

    if len(userconfig['tp_files']) < tpfile_id or tpfile_id < 1:
        raise NotFound('Waypoint File does not exist')

    turnpoint_file = os.path.join(
        storage_dir, 'users', uid['uid'],
        'turnpoints_' + str(tpfile_id) + '.cup'
    )
    if not os.path.exists(turnpoint_file):
        raise NotFound('Waypoint File does not exist')

    f = open(turnpoint_file, 'r')
    waypoints = parse_seeyou_waypoints(f)
    f.close()

    database = []

    for waypoint in waypoints:
        if waypoint.lon >= tpfile_lon \
           and waypoint.lon < tpfile_lon + 5 \
           and waypoint.lat >= tpfile_lat \
           and waypoint.lat < tpfile_lat + 5:

            database.append({
                'lon': waypoint.lon,
                'lat': waypoint.lat,
                'type': 'T',
                'altitude': waypoint.altitude,
                'name': unicode(waypoint.name, "ISO-8859-1"),
                'comment': '',
            })

    sorted_database = sorted(
        database, key=lambda waypoint: (waypoint['lon'], waypoint['lat']))

    sorted_database.insert(0, {
        'chunk': {
            'lon_left': tpfile_lon,
            'lat_lower': tpfile_lat,
        },
    })

    return json.dumps(sorted_database, indent=1)
