#!/usr/bin/python

import sys
import os
import shutil
import subprocess

import mergejs


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
    proSoar_merged = mergejs.run(os.path.join(web_dev_dir, 'js'), None, proSoar_merge)
  except mergejs.MissingImport, E:
    print "\nAbnormal termination."
    sys.exit("ERROR: %s" % E)

  print "Writing merged proSoar javascript to " + os.path.join(web_temp_dir, 'js', proSoar_javascript)
  file(os.path.join(web_temp_dir, 'js', proSoar_javascript), 'w').write(minify(proSoar_merged))

# merge mooTools javascript files
  print "Merging mooTools javascript files"
  try:
    mooTools_merged = mergejs.run(os.path.join(web_dev_dir, 'js'), None, mooTools_merge)
  except mergejs.MissingImport, E:
    print "\nAbnormal termination."
    sys.exit("ERROR: %s" % E)

  print "Writing merged mooTools javascript to " + os.path.join(web_temp_dir, 'js', mooTools_javascript)
  file(os.path.join(web_temp_dir, 'js', mooTools_javascript), 'w').write(minify(mooTools_merged))

# merge OpenLayers javascript files
  print "Merging OpenLayers javascript files"
  try:
    OpenLayers_merged = mergejs.run(os.path.join(web_dev_dir, 'js', 'OpenLayers', 'lib'), None, OpenLayers_merge)
  except mergejs.MissingImport, E:
    print "\nAbnormal termination."
    sys.exit("ERROR: %s" % E)

  print "Writing merged OpenLayers javascript to " + os.path.join(web_temp_dir, 'js', 'OpenLayers', OpenLayers_javascript)
  file(os.path.join(web_temp_dir, 'js', 'OpenLayers', OpenLayers_javascript), 'w').write(minify(OpenLayers_merged))

# compressing other javascript libs
  print "Compressing misc. javascript libs"
  js_files = [os.path.join('js', 'MooTools', 'mootools-core.js'), \
              os.path.join('js', 'MooTools', 'mootools-more.js'), \
              os.path.join('js', 'Gettext.js') ]

  for f in js_files:
    print f
    temp = file(os.path.join(web_dev_dir, f), 'r').read()
    file(os.path.join(web_temp_dir, f), 'w').write(minify(temp))


# copy all other files to their destination
  print "Copying the other files to " + web_temp_dir
  shutil.copytree(os.path.join(web_dev_dir, 'images'), os.path.join(web_temp_dir, 'images'))
  shutil.copytree(os.path.join(web_dev_dir, 'css'), os.path.join(web_temp_dir, 'css'))
  shutil.copy2(os.path.join(web_dev_dir, '.htaccess'), os.path.join(web_temp_dir, '.htaccess'))
  shutil.copy2(os.path.join(web_dev_dir, 'index.html.en'), os.path.join(web_temp_dir, 'index.html.en'))
  shutil.copy2(os.path.join(web_dev_dir, 'index.html.de'), os.path.join(web_temp_dir, 'index.html.de'))

# prepare translations
  print "Converting .po to .json and copying them to " + web_temp_dir
  po_files = os.listdir(os.path.join('gettext', 'po'))
  for po in po_files:
    po = po[:-3]
    process = subprocess.Popen(['./po2json', os.path.join('gettext', 'po', po + '.po')], stdout=subprocess.PIPE)
    stdout,stderr = process.communicate()
    file(os.path.join(web_temp_dir, 'LC_MESSAGES', po + '.json'), 'w').write(stdout)

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
    process = subprocess.Popen(['yui-compressor', '--type', 'js'], stdout=subprocess.PIPE, stdin=subprocess.PIPE)
    stdout,stderr = process.communicate(input=source)

    if stderr == None:
      return stdout
    else:
      raise stderr

  except:
    return source


if __name__ == '__main__':
  main()

