import sys
import os.path

from flask import Flask, request, send_from_directory
from babel.core import negotiate_locale

sys.path.append(os.path.join('util', 'bin'))

from public.airports import bp as airports
from public.download_task import bp as download_task
from public.download_task_qr import bp as download_task_qr
from public.height import bp as height
from public.get_task import bp as get_task
from public.get_waypoints import bp as get_waypoints
from public.remove_task import bp as remove_task
from public.remove_waypoint_file import bp as remove_waypoint_file
from public.save_task import bp as save_task_bp
from public.save_temp_task import bp as save_temp_task_bp
from public.search import bp as search
from public.settings import bp as settings
from public.upload_igc_file import bp as upload_igc_file_bp
from public.upload_waypoint_file import bp as upload_waypoint_file

AVAILABLE_LOCALES = ['en', 'de', 'cs']

app = Flask(__name__, static_folder='web', static_url_path='')
app.register_blueprint(airports, url_prefix='/airports')
app.register_blueprint(download_task)
app.register_blueprint(download_task_qr)
app.register_blueprint(height, url_prefix='/height')
app.register_blueprint(get_task)
app.register_blueprint(get_waypoints)
app.register_blueprint(remove_task)
app.register_blueprint(remove_waypoint_file)
app.register_blueprint(save_task_bp)
app.register_blueprint(save_temp_task_bp)
app.register_blueprint(search)
app.register_blueprint(settings, url_prefix='/settings')
app.register_blueprint(upload_igc_file_bp)
app.register_blueprint(upload_waypoint_file)


@app.route("/")
def hello():
    preferred = map(lambda x: x.replace('-', '_'),
                    request.accept_languages.values())
    locale = negotiate_locale(preferred, AVAILABLE_LOCALES)

    return send_from_directory(
        'web', 'index.html.' + locale, mimetype='text/html')


if __name__ == "__main__":
    app.run(debug=True)
