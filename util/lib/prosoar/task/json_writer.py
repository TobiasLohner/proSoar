import json

def write_json_task(task):
  database = {}

  database['type'] = task.type
  database['distance'] = task.distance
  database['aat_min_time'] = task.aat_min_time
  database['start_max_speed'] = task.start_max_speed
  database['start_max_height'] = task.start_max_height
  database['start_max_height_ref'] = task.start_max_height_ref
  database['finish_min_height'] = task.finish_min_height
  database['finish_min_height_ref'] = task.finish_min_height_ref
  database['fai_finish'] = task.fai_finish
  database['min_points'] = task.min_points
  database['max_points'] = task.max_points
  database['homogeneous_tps'] = task.homogeneous_tps
  database['is_closed'] = task.is_closed
  database['task_scored'] = task.task_scored

  for key, turnpoint in enumerate(task):
    database[key] = {'lon': turnpoint.lon,
                     'lat': turnpoint.lat,
                     'name': turnpoint.name,
                     'id': turnpoint.id,
                     'comment': turnpoint.comment,
                     'altitude': turnpoint.altitude,
                     'type': turnpoint.sector.type,
                     'radius': turnpoint.sector.radius,
                     'inner_radius': turnpoint.sector.inner_radius,
                     'start_radial': turnpoint.sector.start_radial,
                     'end_radial': turnpoint.sector.end_radial }

  return json.dumps(database, indent = 1)

