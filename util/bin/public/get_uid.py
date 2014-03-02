from flask import Blueprint, jsonify

import os
import sys

app_dir = os.path.abspath(__file__ + '/../../..')
sys.path.append(os.path.join(app_dir, 'lib'))

from prosoar.userconfig import get_uid_from_cookie

bp = Blueprint('get_uid', __name__)


@bp.route('/bin/get_uid.py')
def main():
    return jsonify(get_uid_from_cookie())
