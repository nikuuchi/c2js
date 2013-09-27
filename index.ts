///<reference path='d.ts/jquery.d.ts'/>

declare var CodeMirror: any;

module C2JS {
    export function Compile(source, option, flag, Context, callback) {
        if(flag) {
            $.ajax({
                type: "POST",
                url: "compile.cgi",
                data: JSON.stringify({source: source, option: option}),
                dataType: 'json',
                contentType: "application/json; charset=utf-8",
                success: callback,
                error: function() { alert("error"); }
            });
        } else {
            callback(Context);
        }
    }

    export function TerminalColor(log) {
        return log.replace(/\[31m(.*)\[0m/g,'<span class="text-danger">$1</span>');
    }
}

$(function () {

    var $editor = $("#editor-gs");
    var editorSize = { width: $editor.width(), height: $editor.height() };
    var editor_gs = CodeMirror.fromTextArea(document.getElementById("editor-gs"), {
        lineNumbers: true,
        indentUnit: 4,
        mode: "text/x-csrc"
    });
    editor_gs.setValue("#include <stdio.h>\n\nint main(int argc, char* argv[]) {\n    printf(\"hello, world!\\n\");\n    return 0;\n}");
    editor_gs.setSize(editorSize.width, editorSize.height);

    var changeFlag = true;
    editor_gs.on("change", function(e){
        changeFlag = true;
    });

    var fileName = "Program";

    $("#file-name").text(fileName+".c");

    var Context: any = {};
    var $output = $('#editor-error');
    $output.text('$ ');

    $("#clear").click(function(e){
        $output.text('$ ');
    });

    $("#compile").click(function(e){
        var src = editor_gs.getValue();
        var opt = '-m'; //TODO
        $output.append('gcc '+fileName+'.c -o '+fileName);
        $output.append('<br>');
        C2JS.Compile(src, opt, changeFlag, Context, function(res){
            changeFlag = false;
            if(res == null) {
                $output.append('Sorry, server is something wrong.');
                return;
            }
            if(res.error.length > 0) {
                $output.append(C2JS.TerminalColor(res.error.replace(/\n/g,"<br>\n")
                        .replace(/\/.*\.c/g,fileName+".c")
                        .replace(/\/.*\/(.*\.h)/g, "$1")
                        .replace(/(note:.*)$/gm,"<span class='text-info'>$1</span>")
                        .replace(/(warning:.*)$/gm,"<span class='text-warning'>$1</span>")
                        .replace(/(error:.*)$/gm,"<span class='text-danger'>$1</span>")
                ));
                $output.append('<br>');
            }
            $output.append('$ ');

            Context.error = res.error;
            if(!res.error.match("error:")) {
                Context.source = res.source;
                $output.append('./'+fileName);
                $output.append('<br>');
                var Module = {print:function(x){$output.append(x+"<br>");/*console.log(x);*/}};
                try {
                    var exe = new Function("Module",res.source);
                    exe(Module);
                }catch(e) {
                    $output.html(e);
                }
                $output.append('$ ');
            } else {
                Context.source = null;
            }
        });
    });

});
