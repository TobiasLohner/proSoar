import os.path

from flask import Blueprint, current_app, send_from_directory

bp = Blueprint('airports', __name__)


@bp.route("/<path:filename>")
def airports(filename):
    return send_from_directory(
        os.path.join(current_app.config['STORAGE_FOLDER'], 'airports'),
        filename, mimetype='application/json'
    )
