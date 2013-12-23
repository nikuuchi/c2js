#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import os
import time
import commands
import codecs
import json
import yaml
from pymongo import MongoClient

def CreateResponseJson(source, result, error):
    return json.dumps({'source': source, 'result': result, 'error': error})

def CreateCSourceFile(name, contents):
    f = codecs.open(name, 'w', 'utf-8')
    #f.write(req['source'])
    f.write(contents)
    f.close()

def Compile(name):
    return commands.getoutput('emcc -O1 -W -Wall -Qunused-arguments ' + name + ' -o ' + name + '.js')

def WriteLog(name, input_log, compile_flag, message, env, unix_time, ctime, addr):
    conn = MongoClient(addr)
    db = conn.test
    logjson = {'input': input_log , 'runnable': compile_flag, 'message': message, 'env': env, 'unixtime': unix_time, 'time_string': ctime}
    log = codecs.open(name+'.log', 'w', 'utf-8');
    log.write(json.dumps(logjson))
    log.close()
    db.raw_compile_data.save(logjson)

print "Content-Type: application/json"
print ""

if os.environ['REQUEST_METHOD'] != "POST":
    print '{\'error\':No Method Error\' }'
    sys.exit()

ip_addr = "127.0.0.1"
config_file = "default.yaml"
if os.path.exists("production.yaml"):
    config_file = "production.yaml"

with open(config_file, "r") as f:
    y = yaml.load(f)
    if y["mongo"] is not None:
        if y["mongo"]["ip"] is not None:
            ip_addr = y["mongo"]["ip"]

name = commands.getoutput("/bin/mktemp -q /tmp/XXXXXX.c")
req = json.load(sys.stdin)

CreateCSourceFile(name, req["source"])
message = Compile(name)

jsfilecontent = ''
compile_flag = os.path.exists(name+".js")
if compile_flag:
    a = open(name+'.js', 'r')
    jsfilecontent = a.read()

WriteLog(name, req, compile_flag, message, os.environ.__dict__, int(time.time()), time.ctime(), ip_addr)

print CreateResponseJson(jsfilecontent, '', message)
