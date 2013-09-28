///<reference path='d.ts/jquery.d.ts'/>

declare var CodeMirror: any;

module C2JS {
    export interface Response {
        source:   string;
        error:    string;
        message:  string;
    }

    export class Size {
        constructor(public width: number, public height: number) {
        }
    }

    export class Editor {
        size: Size;
        editor: any; //TODO CodeMirror
        constructor() {
            var $editor = $("#editor");
            this.size = new Size($editor.width(), $editor.height());
            this.editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
                lineNumbers: true,
                indentUnit: 4,
                mode: "text/x-csrc"
            });
            this.editor.setValue("#include <stdio.h>\n\nint main(int argc, char* argv[]) {\n    printf(\"hello, world!\\n\");\n    return 0;\n}");
            this.editor.setSize(this.size.width, this.size.height);
        }

        OnChange(callback: (e: Event)=>void): void {
            this.editor.on("change", callback);
        }

        GetValue(): string {
            return this.editor.getValue();
        }
    }

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

    var Editor: C2JS.Editor = new C2JS.Editor();

    var changeFlag = true;
    Editor.OnChange((e: Event)=> {
        changeFlag = true;
    });

    var fileName = "Program";

    $("#file-name").text(fileName+".c");

    var Context: any = {}; //TODO refactor C2JS.Response
    var $output = $('#output');
    $output.text('$ ');

    $("#clear").click(function(e){
        $output.text('$ ');
    });

    $("#compile").click(function(e){
        var src = Editor.GetValue();
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
