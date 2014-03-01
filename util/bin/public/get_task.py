#!/usr/bin/python

import cgi
import cgitb
cgitb.enable()
import os
import sys
import re

app_dir = os.path.abspath(__file__ + '/../../..')
sys.path.append(os.path.join(app_dir, 'lib'))

from prosoar.task.xcsoar_reader import parse_xcsoar_task
from prosoar.task.json_writer import write_json_task
from prosoar.userconfig import get_uid_from_cookie, read_user_config

#from prosoar.userconfig import get_user_config_as_json


def main():
    uid = get_uid_from_cookie()
    storage_dir = os.path.join(app_dir, 'storage')
    uid_dir = os.path.join(storage_dir, 'users', uid['uid'])
    userconfig = read_user_config(uid)

    form = cgi.FieldStorage()

    m = re.compile('([^&+/;]*)').match(form.getvalue('task_name'))
    taskname = m.group(1)

    taskfile = ''

    for d in userconfig['task_files']:
        if d.get('name') == taskname:
            taskfile = os.path.join(
                uid_dir, 'task_' + str(d.get('id')) + '.tsk')

    if taskfile == '' or not os.path.exists(taskfile):
        raise RuntimeError('Task File does not exist')

    task = parse_xcsoar_task(taskfile)

    print "Content-Type: text/html"
    print
    print write_json_task(task)


if __name__ == '__main__':
    main()
