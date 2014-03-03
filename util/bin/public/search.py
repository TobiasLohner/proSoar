from flask import Blueprint, request, jsonify

import urllib2

bp = Blueprint('search', __name__)


@bp.route('/search/<bbox>/<query>')
def search(bbox, query):
    return main(bbox, query)


@bp.route('/bin/search.py')
def bin_search():
    return main(request.values.get('bbox'), request.values.get('q'))


def main(bbox, q):
    url = 'http://nominatim.openstreetmap.org/search/' + q + \
        '?format=json&limit=1&viewbox=' + bbox + '&email=info@prosoar.de'

    try:
        request = urllib2.urlopen(url)
        return request.read()

    except:
        return '[]'
