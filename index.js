var C2JS;

(function (C2JS) {
    C2JS.Compile = function(source, option, callback) {
        $.ajax({
            type: "POST",
            url: "compile.cgi",
            data: JSON.stringify({source: source, option: option}),
            dataType: 'json',
            contentType: "application/json; charset=utf-8",
            success: callback,
            error: function() { alert("error"); }
        });
    }

    C2JS.TerminalColor = function(log) {
        return log.replace(/\[31m(.*)\[0m/g,'<span class="text-danger">$1</span>');
    }

})(C2JS || (C2JS = {}));

$(function () {

    var editor_gs = CodeMirror.fromTextArea(document.getElementById("editor-gs"), {
        lineNumbers: true,
        indentUnit: 4,
        mode: "text/x-csrc"
    });
    editor_gs.setValue("#include <stdio.h>\n\nint main(int argc, char* argv[]) {\n    printf(\"hello, world!\\n\");\n    return 0;\n}");

    $("#compile").click(function(e){
        var src = editor_gs.getValue();
        var opt = '-m'; //TODO
        var $output = $('#editor-error');
        $output.text('$ gcc program.c -o program');
        $output.append('<br>');
        C2JS.Compile(src, opt, function(res){
            if(res == null) {
                $output.append('Sorry, server is something wrong.');
                return;
            }
            $output.append('$ ./program');
            $output.append('<br>');
            if(res.error.length > 0) {
                $output.append(C2JS.TerminalColor(res.error.replace(/\n/g,"<br>\n")
                        .replace(/\/.*\.c/g,"program.c")
                        .replace(/\/.*\/(.*\.h)/g, "$1")
                        .replace(/(note:.*)$/gm,"<span class='text-info'>$1</span>")
                        .replace(/(warning:.*)$/gm,"<span class='text-warning'>$1</span>")
                        .replace(/(error:.*)$/gm,"<span class='text-danger'>$1</span>")
                ));
            }else {
                var Module = {print:function(x){$output.append(x+"<br>");/*console.log(x);*/}};
                try {
                    var exe = new Function("Module",res.source);
                    exe(Module);
                }catch(e) {
                    $output.html(e);
                }
            }
        });
    });
});
