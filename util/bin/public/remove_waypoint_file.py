#!/usr/bin/env python

import cgi
import cgitb
cgitb.enable()
import os
import sys

app_dir = os.path.abspath(__file__ + '/../../..')
sys.path.append(os.path.join(app_dir, 'lib'))

from prosoar.userconfig import read_user_config, write_user_config, \
    get_user_config_as_json, set_user_config_from_json, \
    get_uid_from_cookie


def main():
    uid = get_uid_from_cookie()
    uid_dir = os.path.join(app_dir, 'storage', 'users', uid['uid'])

    form = cgi.FieldStorage()
    fileId = int(form.getvalue('fileId'))

    if 'settings' in form:
        settings = form.getvalue('settings')
        userconfig = set_user_config_from_json(uid, settings)
    else:
        userconfig = read_user_config(uid)

    if len(userconfig['tp_files']) >= fileId:
        os.remove(os.path.join(uid_dir, 'turnpoints_' + str(fileId) + '.cup'))
        userconfig['tp_files'].pop(fileId - 1)

    for f_id in range(fileId + 1, (len(userconfig['tp_files']) + 2)):
        os.rename(os.path.join(uid_dir, 'turnpoints_' + str(f_id) + '.cup'),
                  os.path.join(uid_dir, 'turnpoints_' + str(f_id - 1) + '.cup'))

    write_user_config(uid, userconfig)

    print "Content-type: text/html"
    print
    print get_user_config_as_json(uid, encoded=False)


if __name__ == '__main__':
    main()
