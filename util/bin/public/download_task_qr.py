from flask import Blueprint, request, send_file

import os
import re
import qrcode
from StringIO import StringIO

bp = Blueprint('download_task_qr', __name__)


@bp.route('/tasks/<uid>/<task>/<filetype>/qr')
def tasks(uid, task, filetype):
    return main(uid, task, filetype)


@bp.route('/tasks/<uid>/temp/<task>/<filetype>/qr')
def tasks_temp(uid, task, filetype):
    return main(uid, task, filetype, tempfile=True)


@bp.route('/bin/download_task_qr.py')
def bin_download_task_qr():
    return main(
        request.values['uid'],
        request.values['task'],
        request.values['filetype'],
        tempfile=('temp' in request.values)
    )


def main(uid, task, filetype, tempfile=False):
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
