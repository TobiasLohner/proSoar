from flask import Blueprint, request, jsonify

import os
import sys

app_dir = os.path.abspath(__file__ + '/../../..')
sys.path.append(os.path.join(app_dir, 'lib'))

from prosoar.userconfig import read_user_config, write_user_config, \
    get_user_config_as_json, get_uid_from_cookie

bp = Blueprint('remove_task', __name__)


@bp.route('/tasks/delete/<taskname>')
def tasks_delete(taskname):
    return main(taskname)


def main(taskname):
    uid = get_uid_from_cookie()
    uid_dir = os.path.join(app_dir, 'storage', 'users', uid['uid'])

    userconfig = read_user_config(uid)

    success = False

    for key, d in enumerate(userconfig['task_files']):
        if d.get('name') == taskname:
            taskfile = os.path.join(
                uid_dir, 'task_' + str(d.get('id')) + '.tsk')
            os.unlink(taskfile)
            userconfig['task_files'].pop(key)
            success = True
            break

    for key, d in enumerate(userconfig['task_files']):
        if (key + 1) != int(d.get('id')):
            taskfile_old = os.path.join(
                uid_dir, 'task_' + str(d.get('id')) + '.tsk')
            taskfile_new = os.path.join(
                uid_dir, 'task_' + str(key + 1) + '.tsk')
            os.rename(taskfile_old, taskfile_new)
            d['id'] = str(key + 1)

    write_user_config(uid, userconfig)

    return jsonify({
        'success': success,
        'settings': get_user_config_as_json(uid, encoded=False),
    })
