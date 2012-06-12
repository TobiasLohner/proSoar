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

from prosoar.userconfig import get_user_config_as_json, set_user_config_from_json, \
  write_user_config, get_uid_from_cookie

def main():
  upload_dir = os.path.join(app_dir, 'storage', 'temp')
  uid = get_uid_from_cookie()
  uid_dir = os.path.join(app_dir, 'storage', 'users', uid['uid'])

  form = cgi.FieldStorage()
  if form.has_key('settings'):
    settings = form.getvalue('settings')
    write_user_config(uid, set_user_config_from_json(uid, settings))

  uploaded_file = save_uploaded_file(form, "waypoint-upload-file", upload_dir)

  if not uploaded_file:
    reply_failure()
    sys.exit()

#  stdout = subprocess.call([ os.path.join(app_dir, 'bin', 'add_waypoint_file_to_user'),
#                   '-u', uid['uid'], '-k', uid['key'], '-f', uploaded_file["tempname"],
#                   '-n', uploaded_file["filename"] ])

  process = subprocess.Popen([ os.path.join(app_dir, 'bin', 'private', 'add_waypoint_file_to_user'),
                   '-u', uid['uid'], '-k', uid['key'], '-f', uploaded_file["tempname"],
                   '-n', uploaded_file["filename"] ], stdout=subprocess.PIPE)
  stdout,stderr = process.communicate()

  os.remove(uploaded_file["tempname"])

  if not stdout == '':
    reply_failure()
  else:
    reply_success(uid)


# save uploaded file to temp file
def save_uploaded_file (form, form_field, upload_dir):
  if not form.has_key(form_field): return
  
  if not os.path.exists(upload_dir):
    os.makedirs(upload_dir)
 
  fileitem = form[form_field]
  if not fileitem.file: return
  
  fout = tempfile.NamedTemporaryFile(mode = 'w+b', delete = False, dir = upload_dir)
#  fout = file (os.path.join(upload_dir, fileitem.filename), 'wb')
 
  chunks = 0
  max_size = 5 # * 128kb

  # maximum 3*128kb file size
  while chunks < max_size:
    chunks += 1
    chunk = fileitem.file.read(1024*128)
    if not chunk: break
    fout.write (chunk)
 
  fout.close()

  if os.path.getsize(fout.name) == 1024*128*max_size \
     or os.path.getsize(fout.name) == 0:
    os.remove(fout.name)
    return False

  return { "tempname": fout.name,
           "filename": os.path.basename(fileitem.filename) }


def reply_failure():
  print "Content-type: text/html"
  print
  print '{"success":false}'


def reply_success(uid):
  print "Content-type: text/html"
  print
  print '{"success":true,"settings":'
  print get_user_config_as_json(uid)
  print '}'

if __name__ == '__main__':
  main()

