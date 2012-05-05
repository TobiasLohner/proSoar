#!/usr/bin/python

import cgi
import cgitb; cgitb.enable()
import subprocess

def main():
  fine_file = "/home/tobias/hillshading/fine.shp"

  form = cgi.FieldStorage()

  m = re.compile('([-\d.]*)').match(form.getvalue('lon'))
  lon = m.group(1)

  m = re.compile('([-\d.]*)').match(form.getvalue('lat'))
  lat = m.group(1)

  if lon > -180 and lon < 180 \
     and lat > -90 and lat < 90:
    process = subprocess.Popen(['gdallocationinfo -b 1 -valonly -lifonly -wgs84', \
      fine_file, '-lon', lon, '-lat', lat])
    stdout, stderr = process.communicate()
 
    m = re.compile('([-\d.]*)\s([-\d.]*)\s([-\d.]*)').match(stdout)
    height = m.group(3)
  else:
    height = -999
  
  print "Content-type: text/plain"
  print
  print "{'lon':" + str(lon) + ",'lat':" + str(lat) + ",'height':" + str(height) + "}"


if __name__ == '__main__':
  main()

