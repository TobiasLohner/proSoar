import sys
import os.path

from flask import Flask, request, send_from_directory
from babel.core import negotiate_locale

sys.path.append(os.path.join('util', 'bin'))

from public.airports import bp as airports
from public.height import bp as height
from public.igc import bp as igc
from public.search import bp as search
from public.settings import bp as settings
from public.tasks import bp as tasks
from public.waypoints import bp as waypoints

AVAILABLE_LOCALES = ['en', 'de', 'cs']

app = Flask(__name__, static_folder='web', static_url_path='')
app.register_blueprint(airports, url_prefix='/airports')
app.register_blueprint(height, url_prefix='/height')
app.register_blueprint(igc, url_prefix='/igc')
app.register_blueprint(tasks, url_prefix='/tasks')
app.register_blueprint(search, url_prefix='/search')
app.register_blueprint(settings, url_prefix='/settings')
app.register_blueprint(waypoints, url_prefix='/waypoints')


@app.route("/")
def hello():
    preferred = map(lambda x: x.replace('-', '_'),
                    request.accept_languages.values())
    locale = negotiate_locale(preferred, AVAILABLE_LOCALES)

    return send_from_directory(
        'web', 'index.html.' + locale, mimetype='text/html')


if __name__ == "__main__":
    app.run(debug=True)
