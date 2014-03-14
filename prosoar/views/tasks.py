from flask import Blueprint, request, jsonify, send_file, current_app, url_for
from werkzeug.exceptions import NotFound

import os
import re
from datetime import datetime
from StringIO import StringIO

import qrcode

from prosoar.task.json_reader import parse_json_task
from prosoar.task.json_writer import write_json_task
from prosoar.task.seeyou_writer import create_seeyou_task
from prosoar.task.xcsoar_reader import parse_xcsoar_task
from prosoar.task.xcsoar_writer import create_xcsoar_task

from prosoar.userconfig import (
    get_uid_from_cookie,
    get_user_config_as_json,
    read_user_config,
    write_user_config,
)

bp = Blueprint('tasks', __name__)


@bp.route("/load/<taskname>")
def load(taskname):
    uid = get_uid_from_cookie()
    uid_dir = os.path.join(current_app.config['USERS_FOLDER'], uid['uid'])
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


@bp.route('/<uid>/temp/<taskname>/<filetype>')
def download_temp(uid, taskname, filetype):
    return download(uid, taskname, filetype, temptask=True)


@bp.route('/<uid>/<taskname>/<filetype>')
def download(uid, taskname, filetype, temptask=False):
    uid = {'uid': uid}

    uid_dir = os.path.join(current_app.config['USERS_FOLDER'], uid['uid'])
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


@bp.route('/<uid>/temp/<task>/<filetype>/qr')
def qr_temp(uid, task, filetype):
    return qr(uid, task, filetype, tempfile=True)


@bp.route('/<uid>/<task>/<filetype>/qr')
def qr(uid, task, filetype, tempfile=False):
    endpoint = '.download_temp' if tempfile else '.download'
    url = url_for(
        endpoint, uid=uid, taskname=task, filetype=filetype, _external=True)

    img = StringIO()
    qrcode.make(url, box_size=3).save(img)
    img.seek(0)

    return send_file(img, mimetype="image/png")


@bp.route('/delete/<taskname>', methods=['POST'])
def delete(taskname):
    uid = get_uid_from_cookie()
    uid_dir = os.path.join(current_app.config['USERS_FOLDER'], uid['uid'])

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


@bp.route('/save/<task_name>', methods=['POST'])
def save(task_name):
    uid = get_uid_from_cookie()
    uid_dir = os.path.join(current_app.config['USERS_FOLDER'], uid['uid'])

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


@bp.route('/save_temp', methods=['POST'])
def save_temp():
    uid = get_uid_from_cookie()
    uid_dir = os.path.join(current_app.config['USERS_FOLDER'], uid['uid'])

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
