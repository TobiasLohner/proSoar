from flask import Blueprint, request, jsonify

import os
import sys
import tempfile

app_dir = os.path.abspath(__file__ + '/../../..')
sys.path.append(os.path.join(app_dir, 'lib'))

from prosoar.igc.igc_parser import SimpleParser
from prosoar.igc.analyse_flight import analyse_flight
from prosoar.igc.trace import for_openlayers

UPLOAD_DIR = os.path.join(app_dir, 'storage', 'temp')

bp = Blueprint('upload_igc_file', __name__)


@bp.route('/igc/upload', methods=['POST'])
@bp.route('/bin/upload_igc_file.py', methods=['POST'])
def main():

    uploaded_file = save_uploaded_file()

    if not uploaded_file:
        return jsonify({'success': False})

    flight = {}

    parser = SimpleParser()
    flight['trace'] = for_openlayers(
        parser.parse(file(uploaded_file["tempname"])))
    flight['info'] = analyse_flight(uploaded_file["tempname"])
    flight['filename'] = uploaded_file["filename"]

    os.remove(uploaded_file["tempname"])

    if flight['trace'] is not None:
        return jsonify({'success': True, 'flight': flight})
    else:
        return jsonify({'success': False})


# save uploaded file to temp file
def save_uploaded_file():
    file = request.files['igcfile-upload-file']
    if not file:
        return

    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)

    fout = tempfile.NamedTemporaryFile(
        mode='w+b', delete=False, dir=UPLOAD_DIR,
        suffix='.igc')

    file.save(fout)
    fout.close()

    if os.path.getsize(fout.name) == 1024 * 128 * 10 \
       or os.path.getsize(fout.name) == 0:
        os.remove(fout.name)
        return False

    return {
        "tempname": fout.name,
        "filename": os.path.basename(file.filename)
    }
