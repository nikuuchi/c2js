#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import os
import commands
import json

def CreateResponseJson(source, result, error):
    return json.dumps({'source': source, 'result': result, 'error': error})

print "Content-Type: application/json"
print ""

#if os.environ['REQUEST_METHOD'] != "POST":
#    print '{\'error\':No Method Error\' }'
#    sys.exit()

name = commands.getoutput("/bin/mktemp -q /tmp/XXXXXX.c")
req = json.load(sys.stdin)
f = open(name, 'w')
f.write(req['source'])
f.close()
message = commands.getoutput('emcc ' + name + ' -o ' + name + '.js')
jsfilecontent = ''
if os.path.exists(name+'.js'):
    a = open(name+'.js', 'r')
    jsfilecontent = a.read()

print CreateResponseJson(jsfilecontent, '', message)
