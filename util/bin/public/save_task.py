from flask import Blueprint, request, jsonify

import os
import sys
from datetime import datetime
import re

app_dir = os.path.abspath(__file__ + '/../../..')
sys.path.append(os.path.join(app_dir, 'lib'))

from prosoar.userconfig import get_uid_from_cookie, get_user_config_as_json, \
    read_user_config, write_user_config
from prosoar.task.json_reader import parse_json_task
from prosoar.task.xcsoar_writer import create_xcsoar_task

bp = Blueprint('save_task', __name__)


@bp.route('/tasks/save/<name>', methods=['POST'])
def tasks_save(name):
    return main(name)


@bp.route('/bin/save_task.py', methods=['POST'])
def bin_save_task():
    return main(request.values.get('task_name'))


def main(task_name):
    uid = get_uid_from_cookie()
    uid_dir = os.path.join(app_dir, 'storage', 'users', uid['uid'])

    if 'task' in request.values:
        taskstring = request.values['task']
        task = parse_json_task(taskstring)

    else:
        return jsonify({'success': False, 'reason': 'No task.'})

    m = re.compile('([^&+/;]*)').match(task_name)
    task_name = m.group(1)

    if task_name == '':
        return jsonify({'success': False, 'reason': 'Invalid task name.'})

    userconfig = read_user_config(uid)

    if not os.path.exists(uid_dir):
        write_user_config(uid, userconfig)

    replace = False

    taskid = len(userconfig['task_files'])

    for key, value in enumerate(userconfig['task_files']):

        if value['name'] == task_name:
            replace = True
            taskid = key
            break

    if taskid >= 20:
        return jsonify({
            'success': False,
            'reason': 'Too much tasks saved already (maximum of 20 reached).'
        })

    filename = 'task_' + str(taskid + 1) + '.tsk'
    d = datetime.today()

    with open(os.path.join(uid_dir, filename), 'w') as f:
        f.write(create_xcsoar_task(task))

        if not replace:
            userconfig['task_files'].append({
                'id': taskid + 1,
                'name': task_name,
                'distance': task.distance,
                'type': task.type,
                'turnpoints': len(task),
                'date': d.isoformat()
            })
        else:
            userconfig['task_files'][taskid] = {
                'id': taskid + 1,
                'name': task_name,
                'distance': task.distance,
                'type': task.type,
                'turnpoints': len(task),
                'date': d.isoformat()
            }

        write_user_config(uid, userconfig)
        return jsonify({
            'success': True,
            'settings': get_user_config_as_json(uid, encoded=False)
        })

    return jsonify({'success': False, 'reason': 'Unknown failure.'})
