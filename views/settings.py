from flask import Blueprint, request, jsonify

import os
import sys
from geoip import geolite2

app_dir = os.path.abspath(__file__ + '/../../')
sys.path.append(os.path.join(app_dir, 'util', 'lib'))

from prosoar.userconfig import get_uid_from_cookie, get_user_config_as_json

bp = Blueprint('settings', __name__)


@bp.route('/initial.js')
def initial_js():
    return load(type='js')


@bp.route('/load')
def load(type='json'):
    uid = get_uid_from_cookie()

    type = request.values.get('as', type)

    if type == 'js':
        match = geolite2.lookup(request.remote_addr)

        settings = \
            'var initialSettings = ' + get_user_config_as_json(uid) + ';'

        if match and match.location:
            location = 'var initialLocation = {lon: ' + \
                str(match.location[1]) + ', lat: ' + \
                str(match.location[0]) + '};'
        else:
            location = 'var initialLocation = {lon: 10, lat: 50};'

        return settings + location

    elif type == 'json':
        return jsonify(get_user_config_as_json(uid), encoded=False)
