from flask import Blueprint, request, jsonify

import os
import tempfile

from prosoar.igc.igc_parser import SimpleParser
from prosoar.igc.analyse_flight import analyse_flight
from prosoar.igc.trace import for_openlayers

APP_DIR = os.path.abspath(__file__ + '/../../')
UPLOAD_DIR = os.path.join(APP_DIR, 'storage', 'temp')

bp = Blueprint('igc', __name__)


@bp.route('/upload', methods=['POST'])
def upload():

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
