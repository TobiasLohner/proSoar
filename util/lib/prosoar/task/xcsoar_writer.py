from prosoar.task.task import Task
from lxml import etree

def create_xcsoar_task(task):
  root = etree.Element("Task")

  set_task_type(root, task)
  set_task_opts(root, task)
  
  for key, turnpoint in enumerate(task):
    if key == 0:
      point_type = 'start'
    elif key == len(task)-1:
      point_type = 'finish'
    else:
      if task.type == 'aat':
        point_type = 'area'
      else:
        point_type = 'turn'

    root.append(create_point(turnpoint, point_type))

  return etree.tostring(root, pretty_print=True, encoding='utf-8')

def set_task_type(el, task):
  if task.type == 'fai':
    el.set('type', 'FAIGeneral')
  elif task.type == 'triangle':
    el.set('type', 'FAITriangle')
  elif task.type == 'outreturn':
    el.set('type', 'FAIOR')
  elif task.type == 'goal':
    el.set('type', 'FAIGoal')
  elif task.type == 'racing':
    el.set('type', 'RT')
  elif task.type == 'aat':
    el.set('type', 'AAT')
  elif task.type == 'mixed':
    el.set('type', 'Mixed')
  elif task.type == 'touring':
    el.set('type', 'Touring')

def set_task_opts(el, task):
  el.set('task_scored', str(task.task_scored))
  el.set('aat_min_time', str(task.aat_min_time))
  el.set('start_max_speed', str(task.start_max_speed))
  el.set('start_max_height', str(task.start_max_height))
  el.set('start_max_height_ref', task.start_max_height_ref)
  el.set('finish_min_height', str(task.finish_min_height))
  el.set('finish_min_height_ref', task.finish_min_height_ref)
  el.set('fai_finish', str(task.fai_finish))
  el.set('min_points', str(task.min_points))
  el.set('max_points', str(task.max_points))
  el.set('homogeneous_tps', str(task.homogeneous_tps))
  el.set('is_closed', str(task.is_closed))


def create_point(turnpoint, point_type):
  point = etree.Element("Point")

  if point_type == 'start':
    point.set("type", "Start")
  elif point_type == 'turn':
    point.set("type", "Turn")
  elif point_type == 'area':
    point.set("type", "Area")
  elif point_type == 'finish':
    point.set("type", "Finish")

  point.append(create_waypoint(turnpoint))
  point.append(create_obsZone(turnpoint.sector))

  return point

def create_waypoint(turnpoint):
  waypoint = etree.Element("Waypoint")

  waypoint.set('name', turnpoint.name)
  waypoint.set('id', str(turnpoint.id))
  waypoint.set('comment', turnpoint.comment)
  waypoint.set('altitude', str(turnpoint.altitude))
  
  location = etree.Element("Location")
  location.set("longitude", str(turnpoint.lon))
  location.set("latitude", str(turnpoint.lat))

  waypoint.append(location)

  return waypoint

def create_obsZone(sector):
  observation_zone = etree.Element("ObservationZone")

  if sector.type == 'startline' or sector.type == 'finishline':
    observation_zone.set("type", "Line")
    observation_zone.set("length", str(sector.radius * 2 * 1000))

  elif sector.type == 'circle':
    observation_zone.set("type", "Cylinder")
    observation_zone.set("radius", str(sector.radius * 1000))

  elif sector.type == 'fai':
    observation_zone.set("type", "FAISector")

  elif sector.type == 'daec':
    observation_zone.set("type", "Keyhole")

  elif sector.type == 'bgastartsector':
    observation_zone.set("type", "BGAStartSector")

  elif sector.type == 'bgafixedcourse':
    observation_zone.set("type", "BGAFixedCourse")

  elif sector.type == 'bgaenhancedoption':
    observation_zone.set("type", "BGAEnhancedOption")
 
  elif sector.type == 'sector':
    observation_zone.set("type", "Sector")
    observation_zone.set("radius", str(sector.radius * 1000))
    observation_zone.set("start_radial", str(sector.start_radial))
    observation_zone.set("end_radial", str(sector.end_radial))

    if sector.inner_radius:
      observation_zone.set("inner_radius", str(sector.inner_radius * 1000))



  return observation_zone

