from aerofiles.flarmcfg import Writer


def write_flarm_task(fp, task, taskname=''):
    writer = Writer(fp)

    writer.write_waypoint(None, None, 'TAKEOFF')

    for i, turnpoint in enumerate(task):
        if turnpoint.name == 'Free turnpoint':
            name = '{0:0=2d} '.format(i + 1) + turnpoint.name
        else:
            name = turnpoint.name

        writer.write_waypoint(
            latitude=float(turnpoint.lat),
            longitude=float(turnpoint.lon),
            description=name,
        )

    writer.write_waypoint(None, None, 'LANDING')
