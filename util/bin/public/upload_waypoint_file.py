from flask import Blueprint, request, jsonify

import os
import sys
import tempfile
import subprocess

app_dir = os.path.abspath(__file__ + '/../../..')
sys.path.append(os.path.join(app_dir, 'lib'))

from prosoar.userconfig import (
    get_user_config_as_json, set_user_config_from_json,
    write_user_config, get_uid_from_cookie,
)

UPLOAD_DIR = os.path.join(app_dir, 'storage', 'temp')

bp = Blueprint('upload_waypoint_file', __name__)


@bp.route('/waypoints/upload', methods=['POST'])
def main():
    uid = get_uid_from_cookie()

    if 'settings' in request.values:
        settings = request.values['settings']
        write_user_config(uid, set_user_config_from_json(uid, settings))

    uploaded_file = save_uploaded_file()

    if not uploaded_file:
        return jsonify({'success': False})

    process = subprocess.Popen(
        [os.path.join(app_dir, 'bin', 'private', 'add_waypoint_file_to_user'),
         '-u', uid['uid'], '-k', uid['key'], '-f', uploaded_file["tempname"],
         '-n', uploaded_file["filename"]], stdout=subprocess.PIPE)
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

    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)

    fout = tempfile.NamedTemporaryFile(
        mode='w+b', delete=False, dir=UPLOAD_DIR)

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
