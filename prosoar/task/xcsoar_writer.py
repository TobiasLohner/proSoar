from aerofiles.xcsoar import Writer


def write_xcsoar_task(fp, task):
    writer = Writer(fp)

    params = {
        'type': get_task_type(task),
        'task_scored': task.task_scored,
        'aat_min_time': task.aat_min_time,
        'start_max_speed': task.start_max_speed,
        'start_max_height': task.start_max_height,
        'start_max_height_ref': task.start_max_height_ref,
        'finish_min_height': task.finish_min_height,
        'finish_min_height_ref': task.finish_min_height_ref,
        'fai_finish': task.fai_finish,
        'min_points': task.min_points,
        'max_points': task.max_points,
        'homogeneous_tps': task.homogeneous_tps,
        'is_closed': task.is_closed,
    }

    # Write <Task> tag
    with writer.write_task(**params):

        # Iterate over turnpoints
        for i, turnpoint in enumerate(task):

            # Write <Point> tag
            with writer.write_point(type=get_point_type(task, i)):

                # Write <Waypoint> tag
                writer.write_waypoint(
                    name=turnpoint.name,
                    latitude=turnpoint.lat,
                    longitude=turnpoint.lon,
                    id=turnpoint.id,
                    comment=turnpoint.comment,
                    altitude=turnpoint.altitude,
                )

                # Write <ObservationZone> tag
                params = get_observation_zone_params(turnpoint.sector)
                writer.write_observation_zone(**params)


def get_task_type(task):
    if task.type == 'fai':
        return 'FAIGeneral'
    elif task.type == 'triangle':
        return 'FAITriangle'
    elif task.type == 'outreturn':
        return 'FAIOR'
    elif task.type == 'goal':
        return 'FAIGoal'
    elif task.type == 'racing':
        return 'RT'
    elif task.type == 'aat':
        return 'AAT'
    elif task.type == 'mixed':
        return 'Mixed'
    elif task.type == 'touring':
        return 'Touring'


def get_point_type(task, i):
    if i == 0:
        return 'Start'
    elif i == len(task) - 1:
        return 'Finish'
    elif task.type == 'aat':
        return 'Area'
    else:
        return 'Turn'


def get_observation_zone_params(sector):
    params = {}

    if sector.type == 'startline' or sector.type == 'finishline':
        params["type"] = "Line"
        params["length"] = sector.radius * 2 * 1000

    elif sector.type == 'circle':
        params["type"] = "Cylinder"
        params["radius"] = sector.radius * 1000

    elif sector.type == 'fai':
        params["type"] = "FAISector"

    elif sector.type == 'daec':
        params["type"] = "Keyhole"

    elif sector.type == 'bgastartsector':
        params["type"] = "BGAStartSector"

    elif sector.type == 'bgafixedcourse':
        params["type"] = "BGAFixedCourse"

    elif sector.type == 'bgaenhancedoption':
        params["type"] = "BGAEnhancedOption"

    elif sector.type == 'sector':
        params["type"] = "Sector"
        params["radius"] = sector.radius * 1000
        params["start_radial"] = sector.start_radial
        params["end_radial"] = sector.end_radial

        if sector.inner_radius:
            params["inner_radius"] = sector.inner_radius * 1000

    return params
