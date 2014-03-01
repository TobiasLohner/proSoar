#!/usr/bin/python

import cgi
import cgitb
cgitb.enable()
import subprocess
import os
import re


def main():
    form = cgi.FieldStorage()

    m = re.compile('([a-z0-9]*)').match(form.getvalue('uid'))
    uid = m.group(1)

    m = re.compile('([^&+/;]*)').match(form.getvalue('task'))
    task = m.group(1)

    m = re.compile('([\w]*)').match(form.getvalue('filetype'))
    filetype = m.group(1)

    tempfile = form.getvalue('temp', 0)

    if tempfile:
        url = 'http://' + os.environ['HTTP_HOST'] + \
            '/tasks/' + uid + '/temp/' + task + '/' + filetype
    else:
        url = 'http://' + os.environ['HTTP_HOST'] + \
            '/tasks/' + uid + '/' + task + '/' + filetype

#  stdout = subprocess.check_output(['qrencode', '-l', 'M', '-o', '-', url])
    process = subprocess.Popen(
        ['qrencode', '-l', 'M', '-o', '-', url], stdout=subprocess.PIPE)
    stdout, stderr = process.communicate()

    print "Content-type: image/png"
    print
    print stdout


if __name__ == '__main__':
    main()
