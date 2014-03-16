import sys
import os.path

from flask import Flask, request, render_template
from flask.ext.babel import Babel, get_locale
from babel.core import negotiate_locale

from views.airports import bp as airports
from views.height import bp as height
from views.igc import bp as igc
from views.search import bp as search
from views.settings import bp as settings
from views.tasks import bp as tasks
from views.waypoints import bp as waypoints

APP_FOLDER = os.path.abspath(os.path.join(__file__, '..', '..'))
STORAGE_FOLDER = os.path.join(APP_FOLDER, 'storage')

AVAILABLE_LOCALES = ['en', 'de', 'cs']

app = Flask(
    __name__,
    static_folder=os.path.join(APP_FOLDER, 'web'),
    static_url_path=''
)

app.config['APP_FOLDER'] = APP_FOLDER
app.config['STORAGE_FOLDER'] = STORAGE_FOLDER
app.config['UPLOAD_FOLDER'] = os.path.join(STORAGE_FOLDER, 'temp')
app.config['USERS_FOLDER'] = os.path.join(STORAGE_FOLDER, 'users')

babel = Babel(app)

@babel.localeselector
def get_locale():
    preferred = map(lambda x: x.replace('-', '_'),
                    request.accept_languages.values())
    return negotiate_locale(preferred, AVAILABLE_LOCALES)

app.register_blueprint(airports, url_prefix='/airports')
app.register_blueprint(height, url_prefix='/height')
app.register_blueprint(igc, url_prefix='/igc')
app.register_blueprint(tasks, url_prefix='/tasks')
app.register_blueprint(search, url_prefix='/search')
app.register_blueprint(settings, url_prefix='/settings')
app.register_blueprint(waypoints, url_prefix='/waypoints')


@app.route("/")
def hello():
    return render_template('index.html.' + get_locale())
