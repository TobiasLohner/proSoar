import sys
import os.path

from flask import Flask, request, render_template
from babel.core import negotiate_locale

from views.airports import bp as airports
from views.height import bp as height
from views.igc import bp as igc
from views.search import bp as search
from views.settings import bp as settings
from views.tasks import bp as tasks
from views.waypoints import bp as waypoints

AVAILABLE_LOCALES = ['en', 'de', 'cs']

app = Flask(__name__, static_folder='web', static_url_path='')
app.register_blueprint(airports, url_prefix='/airports')
app.register_blueprint(height, url_prefix='/height')
app.register_blueprint(igc, url_prefix='/igc')
app.register_blueprint(tasks, url_prefix='/tasks')
app.register_blueprint(search, url_prefix='/search')
app.register_blueprint(settings, url_prefix='/settings')
app.register_blueprint(waypoints, url_prefix='/waypoints')

app.config['APP_FOLDER'] = os.path.abspath(os.path.join(__file__, '..'))
app.config['STORAGE_FOLDER'] = os.path.join(
    app.config['APP_FOLDER'], 'storage')
app.config['UPLOAD_FOLDER'] = os.path.join(
    app.config['STORAGE_FOLDER'], 'temp')
app.config['USERS_FOLDER'] = os.path.join(
    app.config['STORAGE_FOLDER'], 'users')


@app.route("/")
def hello():
    preferred = map(lambda x: x.replace('-', '_'),
                    request.accept_languages.values())
    locale = negotiate_locale(preferred, AVAILABLE_LOCALES)

    return render_template('index.html.' + locale)


if __name__ == "__main__":
    app.run(debug=True)
