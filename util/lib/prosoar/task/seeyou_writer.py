from prosoar.task.task import Task
from prosoar.waypoints.waypoint import Waypoint
from prosoar.waypoints.seeyou_writer import __compose_line
from prosoar.geopoint import GeoPoint

def create_seeyou_task(task, taskname = ''):

  taskline = []
  turnpoints = []
 
  if taskname == '':
    taskline.append('')
  else:
    taskline.append('"'+taskname+'"')

  taskline.append(set_task_options(task));
  
  for key, turnpoint in enumerate(task):
    if turnpoint.name == 'Free turnpoint':
      turnpoint.name = '{:02d} '.format(key+1) + turnpoint.name
    
    if key == 0:
      point_type = 'start'
      taskline[0] += ',"'+turnpoint.name+'"'

    elif key == len(task)-1:
      point_type = 'finish'
      taskline[0] += ',"'+turnpoint.name+'"'

    else:
      if task.type == 'aat':
        point_type = 'area'
      else:
        point_type = 'turn'

    tp = Waypoint()
    tp.lon = float(turnpoint.lon)
    tp.lat = float(turnpoint.lat)
    #turnpoint.comment
    tp.altitude = float(turnpoint.altitude)
    
    
    tp.name = turnpoint.name
    
    taskline[0] += ',"'+turnpoint.name+'"'

    taskline.append(create_obsZone(turnpoint, key, point_type))
    turnpoints.append(__compose_line(tp))

  return 'name,code,country,lat,lon,elev,style,rwdir,rwlen,freq,desc\n' + \
         '\n'.join(turnpoints) + '\n' \
         '-----Related Tasks-----\n' + '\n'.join(taskline)

def set_task_options(task):
  taskline = 'Options'

  #taskline += ',NoStart='
  taskline += ',TaskTime=' + hms(task.aat_min_time)

  if task.type == 'aat':
    taskline += ',WpDis=False'
  else:
    taskline += ',WpDis=True'

  taskline += ',MinDis=True'
  taskline += ',RandomOrder=False'
  taskline += ',MaxPts=' + str(task.max_points)
  #taskline += ',NearDis='
  #taskline += ',NearAlt='
  #taskline += ',BeforePts='
  #taskline += ',AfterPts='
  #taskline += ',Bonus='

  return taskline

def hms(seconds):
  h = int(seconds/3600)
  m = int((seconds - 3600*h)/60)
  s = seconds - h*3600 - m*60

  return '{0:02d}:{1:02d}:{2:02d}'.format(h, m, s)


def create_obsZone(turnpoint, key, point_type):

  obsZone = 'ObsZone=' + str(key)

  sector = turnpoint.sector

  if point_type == 'start':
    obsZone += ',Style=2'
  elif point_type == 'finish':
    obsZone += ',Style=3'
  else:
    if sector.type == 'sector':
      obsZone += ',Style=0'
    else:
      obsZone += ',Style=1'


  if sector.type == 'startline' or sector.type == 'finishline':
    obsZone += ',R1={0:0d}m'.format(int(sector.radius * 1000))
#    obsZone += ',A1=180'
    obsZone += ',Line=1'

  elif sector.type == 'circle':
    obsZone += ',R1={0:0d}m'.format(int(sector.radius * 1000))
    obsZone += ',A1=180'

  elif sector.type == 'fai':
    obsZone += ',R1=10000m'
    obsZone += ',A1=45'

  elif sector.type == 'daec':
    obsZone += ',R1=10000m'
    obsZone += ',A1=45'
    obsZone += ',R2=500m'
    obsZone += ',A2=180'

  elif sector.type == 'bgastartsector':
    obsZone += ',R1=5000m'
    obsZone += ',A1=90'

  elif sector.type == 'bgafixedcourse':
    obsZone += ',R1=20000m'
    obsZone += ',A1=90'
    obsZone += ',R2=500m'
    obsZone += ',A2=180'

  elif sector.type == 'bgaenhancedoption':
    obsZone += ',R1=10000m'
    obsZone += ',A1=90'
    obsZone += ',R2=500m'
    obsZone += ',A2=180'

# not supported by now... 
#  elif sector.type == 'sector':
#    obsZone += ',R1={0:0d}m'.format(int(sector.radius * 1000))
#    obsZone += ',A1={0:0f}'.format(sector.start_radial-sector_end_radial)
#    obsZone += ',R2=500m'
#    obsZone += ',A2=180'
    #observation_zone.set("type", "Sector")
    #observation_zone.set("radius", str(sector.radius * 1000))
    #observation_zone.set("start_radial", str(sector.start_radial))
    #observation_zone.set("end_radial", str(sector.end_radial))

    #if sector.inner_radius:
      #observation_zone.set("inner_radius", str(sector.inner_radius * 1000))
  
  return obsZone

