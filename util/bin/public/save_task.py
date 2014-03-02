#!/usr/bin/env python

import cgi
import cgitb
cgitb.enable()
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


def main():
    uid = get_uid_from_cookie()
    uid_dir = os.path.join(app_dir, 'storage', 'users', uid['uid'])

    form = cgi.FieldStorage()
    if 'task' in form:
        taskstring = form.getvalue('task')
        task = parse_json_task(taskstring)

    else:
        reply_failure("No task.")
        sys.exit()

    m = re.compile('([^&+/;]*)').match(form.getvalue('task_name'))
    task_name = m.group(1)

    if task_name == '':
        reply_failure("Invalid task name.")
        sys.exit()

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
        reply_failure("Too much tasks saved already (maximum of 20 reached).")
        sys.exit()
#    raise RuntimeError('Too much tasks saved')

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
        reply_success(uid)
        exit()

    reply_failure("Unknown failure.")


def reply_failure(reason):
    print "Content-type: text/html"
    print
    print '{"success":false,'
    print '"reason":"' + reason + '"}'


def reply_success(uid):
    print "Content-type: text/html"
    print
    print '{"success":true,"settings":'
    print get_user_config_as_json(uid)
    print '}'

if __name__ == '__main__':
    main()
