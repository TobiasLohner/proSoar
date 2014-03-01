import os
import hashlib
import shutil
import subprocess
import json

from prosoar.util import slurp, spew


class Downloader:

    def __init__(self, dir):
        self.__base_url = 'http://www.prosoar.de/'
        self.__cmd_7zip = '7zr'
        self.__cmd_wget = 'wget'
        self.__dir = os.path.abspath(dir)
        self.__manifest = None
        if not os.path.exists(self.__dir):
            os.makedirs(self.__dir)
        subprocess.check_call([
            self.__cmd_wget, '-q', '-N', '-P',
            self.__dir, self.__base_url + 'checksums'
        ])
        self.__checksums = {}
        for line in slurp(os.path.join(self.__dir, 'checksums')).split("\n"):
            line = line.strip()
            if line != '':
                line = line.split(None, 1)
                self.__checksums[line[1]] = line[0]

    def manifest(self):
        if not self.__manifest:
            self.__manifest = json.loads(slurp(self.retrieve('manifest')))
        return self.__manifest

    def retrieve_extracted(self, file):
        '''
        Retrieve file from server and extract it.
        @param file: Filename on server
        @return: Path of directory where file was extracted to
        '''
        dest_file = os.path.join(self.__dir, file)
        dest_dir = os.path.splitext(dest_file)[0]
        if not self.__is_valid(file, dest_file):
            self.__remove(dest_file, dest_file + '.md5', dest_dir)
        if not os.path.exists(dest_dir):
            self.__download(file, dest_file)
            if not self.__is_valid(file, dest_file):
                self.__remove(dest_file, dest_file + '.md5', dest_dir)
                raise RuntimeError(
                    'File is not valid after download ' + dest_file)
            if file.endswith('.7z'):
                print('Decompressing file {} ...'.format(dest_file))
                subprocess.check_call([
                    self.__cmd_7zip, 'x', '-y',
                    '-o' + os.path.dirname(dest_file), dest_file
                ])
                os.unlink(dest_file)
            else:
                raise RuntimeError(
                    'Could not extract file {}.'.format(dest_file))
        return dest_dir

    def retrieve(self, file):
        '''
        Retrieve file from server.
        @param file: Filename on server
        @return: Path of the downloaded file
        '''
        dest = os.path.join(self.__dir, file)
        if self.__is_valid(file, dest) and os.path.exists(dest):
            return dest
        self.__remove(dest, dest + '.md5')
        self.__download(file, dest)
        if not self.__is_valid(file, dest):
            self.__remove(dest, dest + '.md5')
            raise RuntimeError(
                'File {} is not valid after download.'.format(dest))
        return dest

    def __is_valid(self, file, dest):
        checksum = self.__get_local_checksum(dest)
        return checksum and checksum == self.__checksums[file]

    def __get_local_checksum(self, file):
        md5_path = file + '.md5'
        if os.path.exists(md5_path):
            return slurp(md5_path)
        if not os.path.isfile(file):
            return None
        md5 = hashlib.md5()
        file = open(file, 'rb')
        try:
            while True:
                data = file.read(0xFFFF)
                if not data:
                    break
                md5.update(data)
        finally:
            file.close()
        md5 = md5.hexdigest()
        spew(md5_path, md5)
        return md5

    def __download(self, file, dest):
        if not os.path.exists(dest):
            if not file in self.__checksums:
                raise RuntimeError(
                    '{} does not exist on the server.'.format(file))
            url = self.__base_url + file
            if not os.path.exists(os.path.dirname(dest)):
                os.makedirs(os.path.dirname(dest))
            subprocess.check_call([self.__cmd_wget, '-O', dest, url])

    def __remove(self, *files):
        for file in files:
            if os.path.exists(file):
                print('Removing outdated/invalid file {} ...'.format(file))
                if os.path.isdir(file):
                    shutil.rmtree(file)
                else:
                    os.unlink(file)
