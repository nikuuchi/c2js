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
    f.write(contents)
    f.close()

def Compile(name):
    return commands.getoutput('emcc -O1 -W -Wall -Qunused-arguments ' + name + ' -o ' + name + '.js')

class MessageParser:
    def __init__(self):
        self.checker = [
                "identifier",
                "redefinition of",
                "expected ';'",
                "invalid operands to binary expression",
                "too few arguments to function call",
                "extraneous" ]

    def isErrorLine(self, line):
        return line.find("error:") != -1

    def getErrorMessage(self, line):
        x = line[line.find("error:")+7:]
        ret = {"type": "error"}

        for it in self.checker:
            if x.find(it) != -1:
                idx = x.find(it)+len(it)
                ret["message"] = x[:idx]
                return ret
        ret["message"] = x
        return ret

def loadConfig():
    config = {}
    default_path = os.path.join(os.path.dirname(__file__), 'default.yaml')
    if os.path.exists(default_path):
        with open(default_path) as f:
            config.update(yaml.load(f))
    dev_path = os.path.join(os.path.dirname(__file__), 'development.yaml')
    pro_path = os.path.join(os.path.dirname(__file__), 'production.yaml')
    if os.path.exists(dev_path):
        with open(dev_path) as f:
            config.update(yaml.load(f))
    elif os.path.exists(pro_path):
        with open(pro_path) as f:
            config.update(yaml.load(f))
    return config

def saveMessage(db, message):
    if len(message) <= 0:
        return
    mp = MessageParser()
    for x in message.split('\n'):
        if mp.isErrorLine(x):
            db.compile_message.save(mp.getErrorMessage(x))

def WriteLog(name, input_log, compile_flag, message, env, unix_time, ctime, addr):
    conn = MongoClient(addr)
    db = conn.test
    logjson = {'input': input_log , 'runnable': compile_flag, 'message': message, 'env': env, 'unixtime': unix_time, 'time_string': ctime}
    log = codecs.open(name+'.log', 'w', 'utf-8');
    log.write(json.dumps(logjson))
    log.close()
    db.raw_compile_data.save(logjson)
    saveMessage(db, message)


if __name__ == '__main__':
    print "Content-Type: application/json"
    print ""

    if os.environ['REQUEST_METHOD'] != "POST":
        print '{\'error\':No Method Error\' }'
        sys.exit()

    config = loadConfig()
    ip_addr = config["mongo"]["ip"]

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
