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

Deploy proSoar as described below. Just change the webroot from `web/` to `web_dev/`.


Translating
-----------

Run `deploy/gettext/prepare_pot.sh` to generate the pot file in that directory. Copy the translated `.po` files to `deploy/gettext/po/`. They are automatically copied to the webroot when depolying.

Deploying
---------

This source directory is not complete. You need some more things to get started.

1. Get OpenLayers

   Download OpenLayers from <http://www.openlayers.org> and copy the `OpenLayers/lib/` directory to `web_dev/js/OpenLayers/` and both `OpenLayers/theme/default/img` and `OpenLayers/img` to `web_dev/images/OpenLayers/`

2. Get MooTools

   Download full MooTools Core from <http://www.mootools.net> and copy it to `web_dev/js/mootools-core.js`

   Download MooTools More with the following modules:

   More, Class.Occlude, Object.Extras, Locale, Locale.en-US.Date, Date, Fx.Elements, Fx.Slide, HtmlTable, Element.Shortcuts, Class.Refactor, HtmlTable.Zebra, Events.Pseudos, Element.Event.Pseudos, String.Extras, HtmlTable.Sort, Element.Event.Pseudos.Keys, Keyboard, Keyboard.Extras, HtmlTable.Select, Locale.de-DE.Date

   Copy the MooTools More file to `web_dev/js/mootools-more.js`

3. Install required python modules

   Run `pip install -r requirements.txt`

4. Create airports json files

   Run `util/bin/private/gen_airports`

5. Install qrencode

   See <http://megaui.net/fukuchi/works/qrencode/index.en.html>

6. Configure apache

   Alter your apache configuration to use the `web/` directory as webroot. Include the config file in `config/apache.conf` to your configuration.

7. Deploy public web directory

   Run `deploy/deploy.py`
