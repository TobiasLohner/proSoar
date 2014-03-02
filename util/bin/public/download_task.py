#!/usr/bin/env python

import cgi
import cgitb
cgitb.enable()
import os
import sys
import re

app_dir = os.path.abspath(__file__ + '/../../..')
sys.path.append(os.path.join(app_dir, 'lib'))

from prosoar.task.xcsoar_reader import parse_xcsoar_task
from prosoar.task.xcsoar_writer import create_xcsoar_task
from prosoar.task.seeyou_writer import create_seeyou_task
from prosoar.userconfig import read_user_config


def main():
    form = cgi.FieldStorage()

    m = re.compile('([0-9a-z]*)').match(form.getvalue('uid'))
    uid = {'uid': m.group(1)}

    storage_dir = os.path.join(app_dir, 'storage')
    uid_dir = os.path.join(storage_dir, 'users', uid['uid'])
    userconfig = read_user_config(uid)

    m = re.compile('([^&+/;]*)').match(form.getvalue('task'))
    taskname = m.group(1)

    temptask = form.getvalue('temp', 0)
    taskfile = ''

    if not temptask:
        for d in userconfig['task_files']:
            if d.get('name') == taskname:
                taskfile = os.path.join(
                    uid_dir, 'task_' + str(d.get('id')) + '.tsk')

    else:
        taskfile = os.path.join(uid_dir, 'tasktemp_' + str(taskname) + '.tsk')

    if taskfile == '' or not os.path.exists(taskfile):
        print "Status: 404 Not Found"
        print "Content-type: text/html"
        print
        print "Task file not found: " + taskname
        sys.exit()

    task = parse_xcsoar_task(taskfile)

    if (form.getvalue('filetype') == 'xcsoar'):
        print "Content-Type: application/xcsoar"
        print "Content-disposition: attachment; filename=" + taskname + ".tsk"
        print
        print create_xcsoar_task(task)

    elif (form.getvalue('filetype') == 'seeyou'):
        print "Content-Type: application/seeyou"
        print "Content-disposition: attachment; filename=" + taskname + ".cup"
        print
        print create_seeyou_task(task, taskname)


if __name__ == '__main__':
    main()
