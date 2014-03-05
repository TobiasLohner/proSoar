import os
import json
import re
from datetime import datetime
from random import randint

from flask import request

app_dir = os.path.abspath(__file__ + '/../..')
storage_dir = os.path.join(app_dir, 'storage')
users_dir = os.path.join(storage_dir, 'users')

# read user configuration


def read_user_config(uid):
    tp_files = []
    task_files = []
    lastvisit = 0

    uid_dir = os.path.join(users_dir, uid['uid'])

    if not os.path.exists(uid_dir):
        return {
            'tp_files': tp_files,
            'task_files': task_files,
            'lastvisit': lastvisit
        }

    config_file = os.path.join(uid_dir, 'config')

    if os.path.exists(config_file):
        f = open(config_file, 'r')

        for line in f:
            if line.startswith('tp_file'):
                line.rstrip()
                tp_files.append({'name': line[12:].rstrip(),
                                 'display': int(line[10])})

            if line.startswith('lastvisit'):
                lastvisit = line[12:].rstrip()

            if line.startswith('task'):
                line = line.rstrip('\r\n')
                temp = line.split(' ', 6)
                task_files.append({'id': temp[1],
                                   'name': temp[6],
                                   'distance': float(temp[2]),
                                   'type': temp[3],
                                   'turnpoints': int(temp[4]),
                                   'date': temp[5]})

        f.close()

    return {
        'tp_files': tp_files,
        'task_files': task_files,
        'lastvisit': lastvisit
    }


# write user configuration
def write_user_config(uid, userconfig):
    uid_dir = os.path.join(users_dir, uid['uid'])

    if not os.path.exists(uid_dir):
        os.makedirs(uid_dir)
        open(os.path.join(uid_dir, 'key_' + uid['key']), 'w').close()

    config_file = os.path.join(uid_dir, 'config')

    f = open(config_file, 'w')

    d = datetime.today()
    userconfig['lastvisit'] = d.isoformat()
    f.write("lastvisit " + str(userconfig['lastvisit']) + "\n")

    f.write("\n#tpfile num display name\n")
    for key, value in enumerate(userconfig['tp_files']):
        f.write("tp_file " + str(key + 1) + " " +
                str(value['display']) + " " + value['name'] + "\n")

    f.write("\n#task_num distance type turnpoints date taskname\n")
    for key, value in enumerate(userconfig['task_files']):
        f.write(
            "task " + str(value['id']) + " " + str(value['distance']) + " " +
            value['type'] + " " + str(value['turnpoints']) + " " +
            value['date'] + " " + value['name'] + "\n")

    f.close()


def get_user_config_as_json(
        uid, lastvisit=True, turnpointFiles=True, taskFiles=True,
        encoded=True):

    userconfig = read_user_config(uid)

    json_string = {}

    json_string['uid'] = uid['uid'] + "." + uid['key']

    if turnpointFiles:
        json_string['turnpointFiles'] = {}

        for key, value in enumerate(userconfig['tp_files']):
            json_string['turnpointFiles'][key] = {
                'filename': value['name'],
                'id': (key + 1),
                'display': value['display']
            }

    if taskFiles:
        json_string['taskFiles'] = {}

        for key, value in enumerate(userconfig['task_files']):
            json_string['taskFiles'][key] = {
                'name': value['name'],
                'distance': value['distance'],
                'type': value['type'],
                'turnpoints': value['turnpoints'],
                'date': value['date']
            }

    if lastvisit:
        json_string['lastvisit'] = userconfig['lastvisit']

    if encoded:
        return json.dumps(json_string, indent=1)

    return json_string


def set_user_config_from_json(uid, settings):
    settings_decoded = json.loads(settings)

    userconfig = read_user_config(uid)

    for item in settings_decoded:
        item['fileId'] = int(item['fileId'])

        if item['fileId'] > 0 and item['fileId'] <= len(userconfig['tp_files']):
            userconfig['tp_files'][item['fileId']
                                   - 1]['display'] = int(item['display'])

    return userconfig


def get_uid_from_cookie():
    if 'uid' not in request.cookies:
        return create_uid()

    p = re.compile('([0-9a-z]*)\.([0-9a-z]*)')
    m = p.match(request.cookies['uid'].lower())
    if not m:
        return create_uid()

    uid = {'uid': m.group(1), 'key': m.group(2)}
    path = os.path.join(users_dir, uid['uid'], 'key_' + uid['key'])
    if not os.path.exists(path):
        return create_uid()

    return uid


def create_uid():
    d = datetime.now()

    uid_unenc = str(d.microsecond) + \
        str(d.second + d.minute * 60 + d.hour * 3600) + \
        str(d.strftime('%j%y'))

    random = randint(0, 36 ** 6)

    return {'uid': base36encode(int(uid_unenc)), 'key': base36encode(random)}


def base36encode(number):
    if not isinstance(number, (int, long)):
        raise TypeError('number must be an integer')
    if number < 0:
        raise ValueError('number must be positive')

    alphabet = '0123456789abcdefghijklmnopqrstuvwxyz'

    base36 = ''
    while number:
        number, i = divmod(number, 36)
        base36 = alphabet[i] + base36

    return base36 or alphabet[0]


def base36decode(number):
    return int(number, 36)
