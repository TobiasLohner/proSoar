from flask import Blueprint, request, send_file
from werkzeug.exceptions import NotFound

import os
import sys
from StringIO import StringIO

app_dir = os.path.abspath(__file__ + '/../../..')
sys.path.append(os.path.join(app_dir, 'lib'))

from prosoar.task.xcsoar_reader import parse_xcsoar_task
from prosoar.task.xcsoar_writer import create_xcsoar_task
from prosoar.task.seeyou_writer import create_seeyou_task
from prosoar.userconfig import read_user_config

bp = Blueprint('download_task', __name__)


@bp.route('/tasks/<uid>/<task>/<filetype>')
def tasks(uid, task, filetype):
    return main(uid, task, filetype)


@bp.route('/tasks/<uid>/temp/<task>/<filetype>')
def tasks_temp(uid, task, filetype):
    return main(uid, task, filetype, temptask=True)


def main(uid, taskname, filetype, temptask=False):
    uid = {'uid': uid}

    storage_dir = os.path.join(app_dir, 'storage')
    uid_dir = os.path.join(storage_dir, 'users', uid['uid'])
    userconfig = read_user_config(uid)

    taskfile = ''

    if not temptask:
        for d in userconfig['task_files']:
            if d.get('name') == taskname:
                taskfile = os.path.join(
                    uid_dir, 'task_' + str(d.get('id')) + '.tsk')

    else:
        taskfile = os.path.join(uid_dir, 'tasktemp_' + str(taskname) + '.tsk')

    if taskfile == '' or not os.path.exists(taskfile):
        raise NotFound('Task file not found: ' + taskname)

    task = parse_xcsoar_task(taskfile)

    if filetype == 'xcsoar':
        mimetype = 'application/xcsoar'
        file_extension = 'tsk'
        task = create_xcsoar_task(task)

    elif filetype == 'seeyou':
        mimetype = 'application/seeyou'
        file_extension = 'cup'
        task = create_seeyou_task(task, taskname)

    io = StringIO()
    io.write(task.encode('utf-8'))
    io.seek(0)

    return send_file(io, mimetype=mimetype, as_attachment=True,
                     attachment_filename=(taskname + '.' + file_extension))
