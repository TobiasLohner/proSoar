from prosoar.task.task import Task
from prosoar.task.turnpoint import Turnpoint
from lxml import etree


def parse_xcsoar_task(filename):
    task = Task()

    tree = etree.parse(filename)

    root = tree.getroot()

    if not root.tag == "Task":
        return

    task_type(task, root.get("type"))

    for child in root:
        if not child.tag == "Point":
            return

        parse_point(task, child)

    return task


def task_type(task, task_type):
    if task_type == 'FAIGeneral':
        task.type = 'fai'
    elif task_type == 'FAITriangle':
        task.type = 'triangle'
    elif task_type == 'FAIOR':
        task.type = 'outreturn'
    elif task_type == 'FAIGoal':
        task.type = 'goal'
    elif task_type == 'RT':
        task.type = 'racing'
    elif task_type == 'AAT':
        task.type = 'aat'
    elif task_type == 'Mixed':
        task.type = 'mixed'
    elif task_type == 'Touring':
        task.type = 'touring'


def parse_point(task, el):
    turnpoint = Turnpoint()

    point_type = el.get("type")

    for child in el:
        if child.tag == "Waypoint":
            parse_waypoint(turnpoint, child)

        if child.tag == "ObservationZone":
            parse_sector(turnpoint.sector, child, point_type)

    task.append(turnpoint)


def parse_waypoint(turnpoint, el):
    turnpoint.name = el.get("name")
    turnpoint.id = el.get("id")
    turnpoint.comment = el.get("comment")
    turnpoint.altitude = el.get("altitude")

    location = el.find("Location")

    if location is not None:
        turnpoint.lon = location.get("longitude")
        turnpoint.lat = location.get("latitude")


def parse_sector(sector, el, point_type):
    if el.get("type") == "Line":
        if point_type == "Start":
            sector.type = "startline"
        elif point_type == "Finish":
            sector.type = "finishline"
        else:
            sector.type = "line"

        sector.radius = float(el.get("length")) / 2 / 1000

    elif el.get("type") == "Cylinder":
        sector.type = "circle"
        sector.radius = float(el.get("radius")) / 1000

    elif el.get("type") == "FAISector":
        if point_type == "Start":
            sector.type = "faistart"
        elif point_type == "Finish":
            sector.type = "faifinish"
        else:
            sector.type = "fai"

    elif el.get("type") == "Keyhole":
        sector.type = "daec"

    elif el.get("type") == "BGAFixedCorse":
        sector.type = "bgafixedcourse"

    elif el.get("type") == "BGAEnhancedOption":
        sector.type = "bgaenhancedoption"

    elif el.get("type") == "BGAStartSector":
        sector.type = "bgastartsector"

    elif el.get("type") == "Sector":
        sector.type = "sector"
        sector.radius = float(el.get("radius")) / 1000
        sector.start_radial = float(el.get("start_radial"))
        sector.end_radial = float(el.get("end_radial"))

        if el.get("inner_radius"):
            sector.inner_radius = float(el.get("inner_radius")) / 1000
