import subprocess
import sys


__used_commands = {
    '7zr':       'Please install 7-zip (http://www.7-zip.org/).',
    'wget':      'Please install it using your distribution package manager.'
}


def check_commands():
    ret = True
    for (cmd, help) in __used_commands.items():
        try:
            subprocess.check_output(['which', cmd], stderr=subprocess.STDOUT)
        except:
            ret = False
            print('Command {} is missing on the $PATH. '.format(cmd) + help)
    if not ret:
        sys.exit(1)
