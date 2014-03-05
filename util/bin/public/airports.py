from flask import Blueprint, send_from_directory

bp = Blueprint('airports', __name__)


@bp.route("/<path:filename>")
def airports(filename):
    return send_from_directory(
        'storage/airports', filename, mimetype='application/json')
