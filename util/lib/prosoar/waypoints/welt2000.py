import os
import subprocess

from prosoar.waypoints.welt2000_reader import parse_welt2000_waypoints
from prosoar.waypoints.seeyou_writer import write_seeyou_waypoints
from prosoar.filelist import FileList

def __get_database_file(dir_data):
    path = os.path.join(dir_data, 'welt2000', 'WELT2000.TXT')

    # Create Welt2000 data folder if necessary
    if not os.path.exists(os.path.dirname(path)):
        os.makedirs(os.path.dirname(path))
    
    # Download the current file
    # (only if server file is newer than local file)
    url = 'http://www.segelflug.de/vereine/welt2000/download/WELT2000.TXT'
    subprocess.check_call(['wget', '-N', '-P', os.path.dirname(path), url])

    # Check if download succeeded
    if not os.path.exists(path):        
        raise RuntimeError('Welt2000 database not found at {}'.format(path))
    
    # Return path to the Welt2000 file
    return path

def get_database(dir_data, bounds = None):
    # Get Welt2000 file
    path = __get_database_file(dir_data)
    
    # Parse Welt2000 file
    with open(path, "r") as f:
        # Return parsed WaypointList
        return parse_welt2000_waypoints(f, bounds)

def __create_waypoint_file(database, dir_temp):
    print("Creating waypoints.cup with {} entries...".format(len(database)))
    
    # Create a Seeyou CUP file from the Welt2000 data
    path = os.path.join(dir_temp, 'waypoints.cup')
    write_seeyou_waypoints(database, path)
    return path

def create(dir_data, dir_temp, bounds = None):
    database = get_database(dir_data, bounds)
    file = __create_waypoint_file(database, dir_temp)
    
    list = FileList()
    list.add(file, True)
    return list
