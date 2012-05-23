#!/usr/bin/python2.6

import cgi
import cgitb; cgitb.enable()
import os, sys
import tempfile
import json
import subprocess

try: # Windows needs stdio set for binary mode.
  import msvcrt
  msvcrt.setmode (0, os.O_BINARY) # stdin  = 0
  msvcrt.setmode (1, os.O_BINARY) # stdout = 1
except ImportError:
  pass

app_dir = os.path.abspath(__file__ + '/../../..')
sys.path.append(os.path.join(app_dir, 'lib'))

#from prosoar.userconfig import get_user_config_as_json, set_user_config_from_json, \
#  write_user_config, get_uid_from_cookie

from prosoar.igc.igc_parser import SimpleParser
from prosoar.igc.analyse_flight import analyse_flight
from prosoar.igc.trace import for_openlayers

def main():
  upload_dir = os.path.join(app_dir, 'storage', 'temp')
#  uid = get_uid_from_cookie()
#  uid_dir = os.path.join(app_dir, 'storage', 'users', uid['uid'])

  form = cgi.FieldStorage()
#  if form.has_key('settings'):
#    settings = form.getvalue('settings')
#    write_user_config(uid, set_user_config_from_json(uid, settings))

  uploaded_file = save_uploaded_file(form, "igcfile-upload-file", upload_dir)

  if not uploaded_file:
    reply_failure()
    sys.exit()

  flight = {}

  parser = SimpleParser()
  flight['trace'] = for_openlayers(parser.parse(file(uploaded_file["tempname"])))
  flight['info'] = analyse_flight(uploaded_file["tempname"])
  flight['filename'] = uploaded_file["filename"];

#  process = subprocess.Popen([ os.path.join(app_dir, 'bin', 'private', 'AnalyseFlight'),
#                               uploaded_file["tempname"] ], stdout=subprocess.PIPE)
#  stdout,stderr = process.communicate()
#
  os.remove(uploaded_file["tempname"])

  if flight['trace'] is not None:
    reply_success(flight)
  else:
    reply_failure()


# save uploaded file to temp file
def save_uploaded_file (form, form_field, upload_dir):
  if not form.has_key(form_field): return

  if not os.path.exists(upload_dir):
    os.makedirs(upload_dir)

  fileitem = form[form_field]
  if not fileitem.file: return

  fout = tempfile.NamedTemporaryFile(mode = 'w+b', delete = False, dir = upload_dir,
    suffix = '.igc')
#  fout = file (os.path.join(upload_dir, fileitem.filename), 'wb')

  chunks = 0

  # maximum 10*128kb file size
  while chunks < 10:
    chunks += 1
    chunk = fileitem.file.read(1024*128)
    if not chunk: break
    fout.write (chunk)

  fout.close()

  if os.path.getsize(fout.name) == 1024*128*10 \
     or os.path.getsize(fout.name) == 0:
    os.remove(fout.name)
    return False

  return { "tempname": fout.name,
           "filename": os.path.basename(fileitem.filename) }


def reply_failure():
  print "Content-type: text/html"
  print
  print '{"success":false}'


def reply_success(flight):
  print "Content-type: text/html"
  print
  print '{"success":true,"flight":'
  print json.dumps(flight)
  print '}'

if __name__ == '__main__':
  main()

