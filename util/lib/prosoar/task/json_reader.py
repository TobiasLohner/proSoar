from prosoar.task.task import Task
from prosoar.task.turnpoint import Turnpoint

import json

def parse_json_task(json_string):
  task = Task()

  json_decoded = json.loads(json_string)

  if not json_decoded.get('type'):
    raise RuntimeError('No Task type defined')

  task_type(task, json_decoded['type'])
  
  if json_decoded['distance']:
    task_distance(task, json_decoded['distance'])

  i = 0
  while str(i) in json_decoded:
   parse_turnpoint(task, json_decoded[str(i)])
   i = i + 1

  return task


def task_type(task, task_type):
  if task_type == 'racing':
    task.type = 'racing'
  elif task_type == 'aat':
    task.type = 'aat'
  elif task_type == 'fai':
    task.type = 'fai'

def task_distance(task, distance):
  task.distance = float(distance)


def parse_turnpoint(task, tp):
  turnpoint = Turnpoint()

  if not tp['name'] or not tp['lon'] or not tp['lat']:
    raise RuntimeError('Turnpoint not complete')

  turnpoint.name = tp['name']
  turnpoint.lon = float(tp['lon'])
  turnpoint.lat = float(tp['lat'])
  turnpoint.altitude = float(tp['altitude'])
  turnpoint.comment = tp['comment']

  if tp['type']:
    parse_sector(turnpoint.sector, tp)

  task.append(turnpoint)

def parse_sector(sector, tp):
  if tp['type'] == 'startline':
    sector.type = 'startline'
  elif tp['type'] == 'finishline':
    sector.type = 'finishline'
  elif tp['type'] == 'circle':
    sector.type = 'circle'
  elif tp['type'] == 'fai' or tp['type'] == 'faistart' or tp['type'] == 'faifinish':
    sector.type = 'fai'
  elif tp['type'] == 'daec':
    sector.type = 'daec'
  elif tp['type'] == 'bgafixedcourse':
    sector.type = 'bgafixedcourse'
  elif tp['type'] == 'bgaenhancedoption':
    sector.type = 'bgaenhancedoption'
  elif tp['type'] == 'bgastartsector':
    sector.type = 'bgastartsector'
  elif tp['type'] == 'sector':
    sector.type = 'sector'

  if 'radius' in tp:
    sector.radius = float(tp.get('radius'))

  if 'inner_radius' in tp:
    sector.inner_radius = float(tp.get('inner_radius'))

  if 'start_radial' in tp:
    sector.start_radial = float(tp.get('start_radial'))

  if 'end_radial' in tp:
    sector.end_radial = float(tp.get('end_radial'))


