from flask import Blueprint, request
from werkzeug.exceptions import NotFound

import os
import sys

app_dir = os.path.abspath(__file__ + '/../../..')
sys.path.append(os.path.join(app_dir, 'lib'))

from prosoar.task.xcsoar_reader import parse_xcsoar_task
from prosoar.task.json_writer import write_json_task
from prosoar.userconfig import get_uid_from_cookie, read_user_config

bp = Blueprint('get_task', __name__)


@bp.route("/tasks/load/<taskname>")
def tasks_load(taskname):
    return main(taskname)


def main(taskname):
    uid = get_uid_from_cookie()
    storage_dir = os.path.join(app_dir, 'storage')
    uid_dir = os.path.join(storage_dir, 'users', uid['uid'])
    userconfig = read_user_config(uid)

    taskfile = ''

    for d in userconfig['task_files']:
        if d.get('name') == taskname:
            taskfile = os.path.join(
                uid_dir, 'task_' + str(d.get('id')) + '.tsk')

    if taskfile == '' or not os.path.exists(taskfile):
        raise NotFound('Task File does not exist')

    task = parse_xcsoar_task(taskfile)

    return write_json_task(task)
