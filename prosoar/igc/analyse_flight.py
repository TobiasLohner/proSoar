import os
import sys
from xcsoar.analysis import analyse_flight as _analyse_flight


def analyse_flight(filename):
    root = _analyse_flight(filename)

    flight = {}

    if 'contest' in root:
        child = root['contest']
        flight[child.get("name")] = parse_contest(child)

    if 'times' in root:
        child = root['times']
        flight['takeoff'] = child.get("takeoff")
        flight['landing'] = child.get("landing")

    return flight


def parse_contest(contests):
    traces = {}

    for contest in contests:
        name = contest
        contest = contests[name]

        traces[name] = {
            'trace': parse_trace(contest),
            'speed': float(contest.get("speed", 0)),
            'duration': float(contest.get("duration", 0)),
            'distance': float(contest.get("distance", 0)),
            'score': float(contest.get("score", 0))
        }

    return traces


def parse_trace(trace):
    return 0
