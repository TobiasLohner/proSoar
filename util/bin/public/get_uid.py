#!/usr/bin/python

import cgi
import cgitb
cgitb.enable()
import os
import sys

app_dir = os.path.abspath(__file__ + '/../../..')
sys.path.append(os.path.join(app_dir, 'lib'))

from prosoar.userconfig import get_uid_from_cookie


def main():
    print "Content-type: text/html"
    print
    print get_uid_from_cookie()

if __name__ == '__main__':
    main()
