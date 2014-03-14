from io import BytesIO

from aerofiles.xcsoar import Writer


def create_xcsoar_task(task):
    io = BytesIO()
    write_xcsoar_task(io, task)
    return io.getvalue()


def write_xcsoar_task(fp, task):
    writer = Writer(fp)

    with writer.write_task(
        type=get_task_type(task),
        task_scored=task.task_scored,
        aat_min_time=task.aat_min_time,
        start_max_speed=task.start_max_speed,
        start_max_height=task.start_max_height,
        start_max_height_ref=task.start_max_height_ref,
        finish_min_height=task.finish_min_height,
        finish_min_height_ref=task.finish_min_height_ref,
        fai_finish=task.fai_finish,
        min_points=task.min_points,
        max_points=task.max_points,
        homogeneous_tps=task.homogeneous_tps,
        is_closed=task.is_closed,
    ):
        for key, turnpoint in enumerate(task):
            if key == 0:
                point_type = 'Start'
            elif key == len(task) - 1:
                point_type = 'Finish'
            elif task.type == 'aat':
                point_type = 'Area'
            else:
                point_type = 'Turn'

            create_point(writer, turnpoint, point_type)


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


def create_point(writer, turnpoint, point_type):
    with writer.write_point(type=point_type):
        create_waypoint(writer, turnpoint)
        create_obsZone(writer, turnpoint.sector)


def create_waypoint(writer, turnpoint):
    writer.write_waypoint(
        name=turnpoint.name,
        latitude=turnpoint.lat,
        longitude=turnpoint.lon,
        id=turnpoint.id,
        comment=turnpoint.comment,
        altitude=turnpoint.altitude,
    )


def create_obsZone(writer, sector):
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

    writer.write_observation_zone(**params)
