import sys
import os.path

from flask import Flask, request, send_from_directory
from babel.core import negotiate_locale

sys.path.append(os.path.join('util', 'bin'))

from public.get_height import bp as get_height
from public.get_uid import bp as get_uid
from public.get_userconfig import bp as get_userconfig_bp
from public.upload_igc_file import bp as upload_igc_file_bp

AVAILABLE_LOCALES = ['en', 'de', 'cs']

app = Flask(__name__, static_folder='web', static_url_path='')
app.register_blueprint(get_height)
app.register_blueprint(get_uid)
app.register_blueprint(get_userconfig_bp)
app.register_blueprint(upload_igc_file_bp)


@app.route("/")
def hello():
    preferred = map(lambda x: x.replace('-', '_'),
                    request.accept_languages.values())
    locale = negotiate_locale(preferred, AVAILABLE_LOCALES)

    return send_from_directory(
        'web', 'index.html.' + locale, mimetype='text/html')


if __name__ == "__main__":
    app.run(debug=True)
