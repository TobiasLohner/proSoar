#!/usr/bin/env python2.7

from flask.ext.script import Manager

from prosoar.app import app


manager = Manager(app)

if __name__ == "__main__":
    manager.run()
