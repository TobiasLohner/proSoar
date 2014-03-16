from flask import Blueprint, request, jsonify, current_app
from werkzeug.exceptions import NotFound

import os
import json
import tempfile
import subprocess

from prosoar.waypoints.seeyou_reader import parse_seeyou_waypoints
from prosoar.userconfig import (
    get_uid_from_cookie,
    get_user_config_as_json,
    read_user_config,
    set_user_config_from_json,
    write_user_config,
)

bp = Blueprint('waypoints', __name__)


@bp.route('/<int:tpfile_id>/lon<int:tpfile_lon>/lat<int:tpfile_lat>')
def get(tpfile_id, tpfile_lon, tpfile_lat):
    uid = get_uid_from_cookie()

    userconfig = read_user_config(uid)

    if len(userconfig['tp_files']) < tpfile_id or tpfile_id < 1:
        raise NotFound('Waypoint File does not exist')

    turnpoint_file = os.path.join(
        current_app.config['USERS_FOLDER'], uid['uid'],
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


@bp.route('/upload', methods=['POST'])
def upload():
    uid = get_uid_from_cookie()

    if 'settings' in request.values:
        settings = request.values['settings']
        write_user_config(uid, set_user_config_from_json(uid, settings))

    uploaded_file = save_uploaded_file()

    if not uploaded_file:
        return jsonify({'success': False})

    process = subprocess.Popen([
        os.path.join(current_app.config['APP_FOLDER'],
        'bin', 'private', 'add_waypoint_file_to_user'),
        '-u', uid['uid'], '-k', uid['key'], '-f', uploaded_file["tempname"],
        '-n', uploaded_file["filename"]
    ], stdout=subprocess.PIPE)
    stdout, stderr = process.communicate()

    os.remove(uploaded_file["tempname"])

    if stdout:
        return jsonify({'success': False})

    return jsonify({
        'success': True,
        'settings': get_user_config_as_json(uid, encoded=False)
    })


# save uploaded file to temp file
def save_uploaded_file():
    file = request.files.get('waypoint-upload-file')
    if not file:
        return

    folder = current_app.config['UPLOAD_FOLDER']
    if not os.path.exists(folder):
        os.makedirs(folder)

    fout = tempfile.NamedTemporaryFile(
        mode='w+b', delete=False, dir=folder)

    file.save(fout)
    fout.close()

    if os.path.getsize(fout.name) == 1024 * 128 * 5 \
       or os.path.getsize(fout.name) == 0:
        os.remove(fout.name)
        return False

    return {
        "tempname": fout.name,
        "filename": os.path.basename(file.filename)
    }


@bp.route('/<int:fileId>/remove', methods=['POST'])
def remove(fileId):
    uid = get_uid_from_cookie()
    uid_dir = os.path.join(current_app.config['USERS_FOLDER'], uid['uid'])

    if 'settings' in request.values:
        settings = request.values['settings']
        userconfig = set_user_config_from_json(uid, settings)
    else:
        userconfig = read_user_config(uid)

    if len(userconfig['tp_files']) >= fileId:
        os.remove(os.path.join(uid_dir, 'turnpoints_' + str(fileId) + '.cup'))
        userconfig['tp_files'].pop(fileId - 1)

    for f_id in range(fileId + 1, (len(userconfig['tp_files']) + 2)):
        os.rename(
            os.path.join(uid_dir, 'turnpoints_' + str(f_id) + '.cup'),
            os.path.join(uid_dir, 'turnpoints_' + str(f_id - 1) + '.cup')
        )

    write_user_config(uid, userconfig)

    return jsonify(get_user_config_as_json(uid, encoded=False))
