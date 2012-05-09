#!/usr/bin/python

import cgi
import cgitb; cgitb.enable()
import os, sys
import GeoIP

app_dir = os.path.abspath(__file__ + '/../../..')
sys.path.append(os.path.join(app_dir, 'lib'))

from prosoar.userconfig import get_uid_from_cookie, get_user_config_as_json

def main():
  uid = get_uid_from_cookie()

  form = cgi.FieldStorage();

  if form.getvalue('as') == 'js':
    geoip = GeoIP.open(os.path.join(app_dir, 'storage', 'GeoLiteCity.dat'), GeoIP.GEOIP_STANDARD)
    location = geoip.record_by_addr(os.environ['REMOTE_ADDR'])

    print "Content-type: text/html"
    print
    print 'var initialSettings = '+get_user_config_as_json(uid)+';'
    
    if location:
      print 'var initialLocation = {lon: '+str(location['longitude'])+', lat: '+str(location['latitude'])+'};'
    else:
      print 'var initialLocation = {lon: 10, lat: 50};'

    print 'var initialLanguage = "de"'
#    print os.environ['HTTP_ACCEPT_LANGUAGE']

  elif form.getvalue('as') == 'json':
    print "Content-type: text/html"
    print
    print get_user_config_as_json(uid)


if __name__ == '__main__':
  main()
  
