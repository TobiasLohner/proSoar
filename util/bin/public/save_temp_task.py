from flask import Blueprint, request, jsonify

import os
import sys
from datetime import datetime

app_dir = os.path.abspath(__file__ + '/../../..')
sys.path.append(os.path.join(app_dir, 'lib'))

from prosoar.userconfig import get_uid_from_cookie, get_user_config_as_json, \
    read_user_config, write_user_config
from prosoar.task.json_reader import parse_json_task
from prosoar.task.xcsoar_writer import create_xcsoar_task

bp = Blueprint('save_temp_task', __name__)


@bp.route('/tasks/save_temp', methods=['POST'])
def main():
    uid = get_uid_from_cookie()
    uid_dir = os.path.join(app_dir, 'storage', 'users', uid['uid'])

    if 'task' in request.values:
        taskstring = request.values['task']
        task = parse_json_task(taskstring)

    else:
        return jsonify({'success': False, 'reason': 'No task.'})

    userconfig = read_user_config(uid)

    if not os.path.exists(uid_dir):
        write_user_config(uid, userconfig)

    d = datetime.now()
    taskname = d.strftime('%w') + str(d.hour * 3600 + d.minute * 60 + d.second)
    filename = 'tasktemp_' + taskname + '.tsk'

    with open(os.path.join(uid_dir, filename), 'w') as f:
        f.write(create_xcsoar_task(task))

        base_url = 'tasks/' + uid['uid'] + '/temp/' + taskname
        return jsonify({
            'success': True,
            'settings': get_user_config_as_json(uid, encoded=False),
            'download': {
                'xcsoar': {
                    'name': 'XCSoar (*.tsk)',
                    'url': base_url + '/xcsoar',
                    'qrcode': base_url + '/xcsoar/qr',
                },
                'seeyou': {
                    'name': 'SeeYou (*.cup)',
                    'url': base_url + '/seeyou',
                    'qrcode': base_url + '/seeyou/qr',
                },
            }
        })

    return jsonify({'success': False, 'reason': 'Unknown failure.'})
