from flask import Flask, request, send_from_directory
from babel.core import negotiate_locale

AVAILABLE_LOCALES = ['en', 'de', 'cs']

app = Flask(__name__, static_folder='web', static_url_path='')


@app.route("/")
def hello():
    preferred = map(lambda x: x.replace('-', '_'),
                    request.accept_languages.values())
    locale = negotiate_locale(preferred, AVAILABLE_LOCALES)

    return send_from_directory(
        'web', 'index.html.' + locale, mimetype='text/html')


if __name__ == "__main__":
    app.run(debug=True)
