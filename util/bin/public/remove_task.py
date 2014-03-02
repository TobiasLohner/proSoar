#!/usr/bin/env python

import cgi
import cgitb
cgitb.enable()
import os
import sys
import re

app_dir = os.path.abspath(__file__ + '/../../..')
sys.path.append(os.path.join(app_dir, 'lib'))

from prosoar.userconfig import read_user_config, write_user_config, \
    get_user_config_as_json, get_uid_from_cookie


def main():
    uid = get_uid_from_cookie()
    uid_dir = os.path.join(app_dir, 'storage', 'users', uid['uid'])

    form = cgi.FieldStorage()
    m = re.compile('([^&+/;]*)').match(form.getvalue('task_name'))
    taskname = m.group(1)

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

    print "Content-type: text/html"
    print
    print '{'

    if success:
        print '"success":true,'
    else:
        print '"success":false,'

    print '"settings":' + get_user_config_as_json(uid)
    print '}'

if __name__ == '__main__':
    main()
