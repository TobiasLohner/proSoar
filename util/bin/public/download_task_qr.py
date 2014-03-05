from flask import Blueprint, request, send_file

import qrcode
from StringIO import StringIO

bp = Blueprint('download_task_qr', __name__)


@bp.route('/tasks/<uid>/temp/<task>/<filetype>/qr')
def qr_temp(uid, task, filetype):
    return qr(uid, task, filetype, tempfile=True)


@bp.route('/tasks/<uid>/<task>/<filetype>/qr')
def qr(uid, task, filetype, tempfile=False):
    if tempfile:
        url = request.host_url + \
            'tasks/' + uid + '/temp/' + task + '/' + filetype
    else:
        url = request.host_url + \
            'tasks/' + uid + '/' + task + '/' + filetype

    img = StringIO()
    qrcode.make(url, box_size=3).save(img)
    img.seek(0)

    return send_file(img, mimetype="image/png")
