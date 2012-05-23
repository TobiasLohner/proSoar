#!/usr/bin/python2.6

import subprocess
import os, sys
from lxml import etree

app_dir = os.path.abspath(__file__ + '/../../../..')
sys.path.append(os.path.join(app_dir, 'lib'))

def analyse_flight(filename):
  process = subprocess.Popen([ os.path.join(app_dir, 'bin', 'private', 'AnalyseFlight'),
                               filename ], stdout=subprocess.PIPE)
  stdout,stderr = process.communicate()

  flight = {}

#  tree = etree.fromstring(stdout)
#  root = tree.getroot()
  root = etree.fromstring(stdout)

  if not root.tag == "analysis":
    return

  for child in root:
    if child.tag == "contest":
      flight[child.get("name")] = parse_contest(child)

    if child.tag == "times":
      flight['takeoff'] = child.get("takeoff")
      flight['landing'] = child.get("landing")

  return flight

def parse_contest(contest):
  traces = {}

  for child in contest:
    if child.tag == "trace":
      traces[child.get("name")] = { 'trace': parse_trace(child),
                                    'speed': float(child.get("speed", 0)),
                                    'duration': float(child.get("duration", 0)),
                                    'distance': float(child.get("distance", 0)),
                                    'score': float(child.get("score", 0)) }

  return traces


def parse_trace(trace):
  return 0
