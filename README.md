proSoar README
==============

proSoar online soaring tool is a online task planner for cross country flights
aimed mainly for glider pilots.

proSoar is developed by Tobias Lohner <tobias@lohner-net.de>


Getting the source
------------------

proSoar's source code is hosted at GitHub. You can get it with the following
command:

    git clone git://github.com/TobiasLohner/proSoar.git


Developing
----------

Deploy proSoar as described below. Just change the `static_folder` parameter in `app.py` from `web` to `web_dev`.


Translating
-----------

Run `deploy/gettext/prepare_pot.sh` to generate the pot file in that directory. Copy the translated `.po` files to `deploy/gettext/po/`. They are automatically copied to the webroot when depolying.


Deploying
---------

This source directory is not complete. You need some more things to get started.

1. Install required python modules

   Run `pip install -r requirements.txt`

2. Download and compile necessary JS/CSS files

   Run `make`

3. Deploy by running the debug server or use some other deployment method for flask apps:

   Run `python manage.py runserver` to start the debug server
