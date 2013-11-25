#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import os
import time
import commands
import codecs
import json

def CreateResponseJson(source, result, error):
    return json.dumps({'source': source, 'result': result, 'error': error})

print "Content-Type: application/json"
print ""

if os.environ['REQUEST_METHOD'] != "POST":
    print '{\'error\':No Method Error\' }'
    sys.exit()

name = commands.getoutput("/bin/mktemp -q /tmp/XXXXXX.c")
req = json.load(sys.stdin)
f = codecs.open(name, 'w', 'utf-8')
f.write(req['source'])
f.close()
message = commands.getoutput('emcc -O1 -W -Wall -Qunused-arguments ' + name + ' -o ' + name + '.js')
jsfilecontent = ''
if os.path.exists(name+'.js'):
    a = open(name+'.js', 'r')
    jsfilecontent = a.read()

log = codecs.open(name+'.log', 'w', 'utf-8');
logjson = {'input': req , 'message': message, 'remote_ip': os.environ['REMOTE_ADDR'], 'env': os.environ.__dict__, 'unixtime': int(time.time()), 'time_string': time.ctime()}
log.write(json.dumps(logjson))
log.close()

print CreateResponseJson(jsfilecontent, '', message)
