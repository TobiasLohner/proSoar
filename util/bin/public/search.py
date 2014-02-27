#!/usr/bin/python

import cgi
import cgitb
cgitb.enable()
import re
import urllib2


def main():
    form = cgi.FieldStorage()

    m = re.compile(
        '^(([-]?\d*\.?\d*?),([-]?\d*\.?\d*?),([-]?\d*\.?\d*?),([-]?\d*\.?\d*?))$').match(form.getvalue('bbox'))
    bbox = m.group(1)

    m = re.compile('^(.*)$').match(form.getvalue('q'))
    q = urllib2.quote(m.group(1))

    url = 'http://nominatim.openstreetmap.org/search/' + q + \
        '?format=json&limit=1&viewbox=' + bbox + '&email=info@prosoar.de'

    try:
        request = urllib2.urlopen(url)
        reply = request.read()

    except:
        reply = '[]'

    print "Content-type: text/plain"
    print
    print reply


if __name__ == '__main__':
    main()
