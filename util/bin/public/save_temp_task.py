#!/usr/bin/python

import cgi
import cgitb; cgitb.enable()
import os, sys
import json
from datetime import datetime

app_dir = os.path.abspath(__file__ + '/../../..')
sys.path.append(os.path.join(app_dir, 'lib'))

from prosoar.userconfig import get_uid_from_cookie, get_user_config_as_json, \
  read_user_config, write_user_config
from prosoar.task.json_reader import parse_json_task
from prosoar.task.xcsoar_writer import create_xcsoar_task

def main():
  uid = get_uid_from_cookie()
  uid_dir = os.path.join(app_dir, 'storage', 'users', uid['uid'])

  form = cgi.FieldStorage()
  if form.has_key('task'):
    taskstring = form.getvalue('task')
    task = parse_json_task(form.getvalue('task'))

  else:
    reply_failure("No task.")
    sys.exit()

  userconfig = read_user_config(uid)

  if not os.path.exists(uid_dir):
    write_user_config(uid, userconfig)
 
  d = datetime.now()
  taskname = d.strftime('%w') + str(d.hour*3600+d.minute*60+d.second)
  filename = 'tasktemp_'+ taskname +'.tsk'

  with open(os.path.join(uid_dir, filename), 'w') as f:
    f.write(create_xcsoar_task(task))
    reply_success(uid, taskname)
    sys.exit()

  reply_failure("Unknown failure.")


def reply_failure(reason):
  print "Content-type: text/html"
  print
  print '{"success":false,'
  print '"reason":"'+reason+'"}'


def reply_success(uid, taskname):
  print "Content-type: text/html"
  print
  print '{"success":true,"settings":'
  print get_user_config_as_json(uid)
  print ',"download":{'
  print '"xcsoar":{"url":"tasks/'+uid['uid']+'/temp/'+taskname+'/xcsoar",'
  print '"qrcode":"tasks/'+uid['uid']+'/temp/'+taskname+'/xcsoar/qr",'
  print '"name":"XCSoar (*.tsk)"},'
  print '"seeyou":{"url":"tasks/'+uid['uid']+'/temp/'+taskname+'/seeyou",'
  print '"qrcode":"tasks/'+uid['uid']+'/temp/'+taskname+'/seeyou/qr",'
  print '"name":"SeeYou (*.cup)"}'
  print '}}'

if __name__ == '__main__':
  main()

