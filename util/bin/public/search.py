from flask import Blueprint, request

import urllib2

bp = Blueprint('search', __name__)


@bp.route('/search/<bbox>/<query>')
def search(bbox, query):
    return main(bbox, query)


def main(bbox, q):
    url = 'http://nominatim.openstreetmap.org/search/' + q + \
        '?format=json&limit=1&viewbox=' + bbox + '&email=info@prosoar.de'

    try:
        request = urllib2.urlopen(url)
        return request.read()

    except:
        return '[]'
