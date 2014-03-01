#!/usr/bin/env python

import cgi
import cgitb
cgitb.enable()
import os
import sys
from geoip import geolite2

app_dir = os.path.abspath(__file__ + '/../../..')
sys.path.append(os.path.join(app_dir, 'lib'))

from prosoar.userconfig import get_uid_from_cookie, get_user_config_as_json


def main():
    uid = get_uid_from_cookie()

    form = cgi.FieldStorage()

    if form.getvalue('as') == 'js':
        match = geolite2.lookup(os.environ['REMOTE_ADDR'])

        print "Content-type: text/html"
        print
        print 'var initialSettings = ' + get_user_config_as_json(uid) + ';'

        if match and match.location:
            print 'var initialLocation = {lon: ' + \
                str(match.location[1]) + ', lat: ' + \
                str(match.location[0]) + '};'
        else:
            print 'var initialLocation = {lon: 10, lat: 50};'

    elif form.getvalue('as') == 'json':
        print "Content-type: text/html"
        print
        print get_user_config_as_json(uid)


if __name__ == '__main__':
    main()
