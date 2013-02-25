#!/usr/bin/python

import cgi
import cgitb; cgitb.enable()
import subprocess
import re
import math
import os

def main():
  srtm_dir = "/home/tobias/srtm_v4"
  gdallocationinfo = os.path.join(srtm_dir, 'gdallocationinfo')

  form = cgi.FieldStorage()

  m = re.compile('([-\d.]*)').match(form.getvalue('lon'))
  lon = float(m.group(1))

  m = re.compile('([-\d.]*)').match(form.getvalue('lat'))
  lat = float(m.group(1))

  if lon >= -180 and lon <= 180 \
     and lat >= -60 and lat <= 60:

    file_lat = int(math.ceil((60 - lat)/5))
    file_lon = int(math.ceil((175 + lon)/5) + 1)

    srtm_file_basename = 'srtm_' + '{0:02d}'.format(file_lon) + '_' +  '{0:02d}'.format(file_lat)

    srtm_file = '/vsizip/' + srtm_dir + '/' + srtm_file_basename + '.zip' + '/' + srtm_file_basename + '.tif' 

    process = subprocess.Popen([gdallocationinfo, '-b', '1', '-valonly', '-lifonly', '-wgs84',
      srtm_file, str(lon), str(lat)], stdout=subprocess.PIPE)
    stdout, stderr = process.communicate()

    m = re.compile('([-\d.]*)').match(stdout)

  if not m == None and not m.group(1) == '':
    height = int(m.group(1))
  else:
    height = -999
  
  if height == -32768:
    height = 0

  print "Content-type: text/plain"
  print
  print '{"lon":' + str(lon) + ',"lat":' + str(lat) + ',"height":' + str(height) + '}'


if __name__ == '__main__':
  main()

