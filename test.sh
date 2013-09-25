#!/bin/bash
http -v POST http://localhost/c2js/index.cgi source="#include <stdio.h>\nint main(int argc, char* argv[]) {\n	printf(\"hello, world!\\\n\");\n	return 0;\n}" option="-m"
