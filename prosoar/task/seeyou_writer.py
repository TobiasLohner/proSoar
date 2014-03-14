import datetime
from io import BytesIO

from aerofiles.seeyou import Writer


def create_seeyou_task(task, taskname=''):
    io = BytesIO()
    write_seeyou_task(io, task, taskname)
    return io.getvalue()


def write_seeyou_task(fp, task, taskname=''):
    writer = Writer(fp)

    turnpoints = []

    for key, turnpoint in enumerate(task):
        if turnpoint.name == 'Free turnpoint':
            name = '{0:0=2d} '.format(key + 1) + turnpoint.name
        else:
            name = turnpoint.name

        writer.write_waypoint(
            name, '', '', float(turnpoint.lat), float(turnpoint.lon),
            turnpoint.altitude,
        )

        if key == 0 or key == len(task) - 1:
            turnpoints.append(name)

        turnpoints.append(name)

    writer.write_task(taskname, turnpoints)
    writer.write_task_options(
        task_time=datetime.timedelta(seconds=task.aat_min_time),
        waypoint_distance=(task.type != 'aat'),
        min_distance=True,
        random_order=False,
        max_points=task.max_points,
    )

    for key, turnpoint in enumerate(task):
        if key == 0:
            point_type = 'start'

        elif key == len(task) - 1:
            point_type = 'finish'

        elif task.type == 'aat':
            point_type = 'area'

        else:
            point_type = 'turn'

        write_obsZone(writer, turnpoint, key, point_type)


def write_obsZone(writer, turnpoint, key, point_type):
    params = {}

    sector = turnpoint.sector

    if point_type == 'start':
        params['style'] = 2
    elif point_type == 'finish':
        params['style'] = 3
    elif sector.type == 'sector':
        params['style'] = 0
    else:
        params['style'] = 1

    if sector.type == 'startline' or sector.type == 'finishline':
        params['radius'] = sector.radius * 1000
        params['line'] = True

    elif sector.type == 'circle':
        params['radius'] = sector.radius * 1000
        params['angle'] = 180

    elif sector.type == 'fai':
        params['radius'] = 10000
        params['angle'] = 45

    elif sector.type == 'daec':
        params['radius'] = 10000
        params['angle'] = 45
        params['radius2'] = 500
        params['angle2'] = 180

    elif sector.type == 'bgastartsector':
        params['radius'] = 5000
        params['angle'] = 90

    elif sector.type == 'bgafixedcourse':
        params['radius'] = 20000
        params['angle'] = 90
        params['radius2'] = 500
        params['angle2'] = 180

    elif sector.type == 'bgaenhancedoption':
        params['radius'] = 10000
        params['angle'] = 90
        params['radius2'] = 500
        params['angle2'] = 180

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

# if sector.inner_radius:
    #observation_zone.set("inner_radius", str(sector.inner_radius * 1000))

    writer.write_observation_zone(key, **params)
