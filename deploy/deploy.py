#!/usr/bin/env python

import sys
import os
import shutil
import subprocess

import mergejs
import pojson


def main():
    web_dev_dir = "../web_dev"
    web_dir = "../web"
    web_temp_dir = "../web.tmp"

    proSoar_merge = "merge_proSoar.conf"
    proSoar_javascript = "proSoar.js"

    mooTools_merge = "merge_mooTools.conf"
    mooTools_javascript = "mooTools.js"

    OpenLayers_merge = "merge_OpenLayers.conf"
    OpenLayers_javascript = "OpenLayers.js"

    print "Depolying proSoar from " + web_dev_dir + " to " + web_dir

    if os.path.exists(web_temp_dir):
        shutil.rmtree(web_temp_dir)

    os.mkdir(web_temp_dir)
    os.mkdir(os.path.join(web_temp_dir, 'LC_MESSAGES'))
    os.mkdir(os.path.join(web_temp_dir, 'js'))
    os.mkdir(os.path.join(web_temp_dir, 'js', 'OpenLayers'))
    os.mkdir(os.path.join(web_temp_dir, 'js', 'MooTools'))

    # merge proSoar javascript files
    print "Merging proSoar javascript files"
    try:
        proSoar_merged = mergejs.run(
            os.path.join(web_dev_dir, 'js'), None, proSoar_merge,
        )
    except mergejs.MissingImport, E:
        print "\nAbnormal termination."
        sys.exit("ERROR: %s" % E)

    path = os.path.join(web_temp_dir, 'js', proSoar_javascript)
    print "Writing merged proSoar javascript to " + path

    file(path, 'w').write(minify(proSoar_merged))

    # merge mooTools javascript files
    print "Merging mooTools javascript files"
    try:
        mooTools_merged = mergejs.run(
            os.path.join(web_dev_dir, 'js'), None, mooTools_merge)
    except mergejs.MissingImport, E:
        print "\nAbnormal termination."
        sys.exit("ERROR: %s" % E)

    path = os.path.join(web_temp_dir, 'js', mooTools_javascript)
    print "Writing merged mooTools javascript to " + path
    file(path, 'w').write(minify(mooTools_merged))

    # merge OpenLayers javascript files
    print "Merging OpenLayers javascript files"
    try:
        OpenLayers_merged = mergejs.run(
            os.path.join(web_dev_dir, 'js', 'OpenLayers', 'lib'),
            None, OpenLayers_merge,
        )
    except mergejs.MissingImport, E:
        print "\nAbnormal termination."
        sys.exit("ERROR: %s" % E)

    path = os.path.join(
        web_temp_dir, 'js', 'OpenLayers', OpenLayers_javascript)
    print "Writing merged OpenLayers javascript to " + path
    file(path, 'w').write(minify(OpenLayers_merged))

    # compressing other javascript libs
    print "Compressing misc. javascript libs"
    js_files = [os.path.join('js', 'MooTools', 'mootools-core.js'),
                os.path.join('js', 'MooTools', 'mootools-more.js'),
                os.path.join('js', 'Gettext.js')]

    for f in js_files:
        print f
        temp = file(os.path.join(web_dev_dir, f), 'r').read()
        file(os.path.join(web_temp_dir, f), 'w').write(minify(temp))

    # copy all other files to their destination
    print "Copying the other files to " + web_temp_dir
    shutil.copytree(os.path.join(web_dev_dir, 'images'),
                    os.path.join(web_temp_dir, 'images'))
    shutil.copytree(os.path.join(web_dev_dir, 'css'),
                    os.path.join(web_temp_dir, 'css'))

    # prepare translations
    print "Converting .po to .json and copying them to " + web_temp_dir
    translations_folder = os.path.join('..', 'prosoar', 'translations')
    for translation in os.listdir(translations_folder):
        if len(translation) != 2: continue

        po_file = os.path.join(translations_folder, translation,
                               'LC_MESSAGES', 'messages.po')
        result = u'{"%s":%s}' % (translation, pojson.convert(po_file))

        path = os.path.join(web_temp_dir, 'LC_MESSAGES', translation + '.json')
        file(path, 'w').write(result.encode('utf-8'))

    # move temp directory to web dir
    if os.path.exists(web_dir):
        shutil.move(web_dir, web_dir + ".old")

    shutil.move(web_temp_dir, web_dir)

    if os.path.exists(web_dir + ".old"):
        shutil.rmtree(web_dir + ".old")

    print "Done."


def minify(source):
    try:
        print "minifying..."

        process = subprocess.Popen(
            ['yui-compressor', '--type', 'js'],
            stdout=subprocess.PIPE,
            stdin=subprocess.PIPE,
        )

        stdout, stderr = process.communicate(input=source)
        if stderr:
            raise stderr

        return stdout

    except:
        return source


if __name__ == '__main__':
    main()
