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
        private editor: any; //TODO CodeMirror
        constructor($editor: JQuery) {
            this.size = new Size($editor.width(), $editor.height());
            this.editor = CodeMirror.fromTextArea($editor[0], {
                lineNumbers: true,
                indentUnit: 4,
                mode: "text/x-csrc"
            });
            this.SetValue("#include <stdio.h>\n\nint main(int argc, char* argv[]) {\n    printf(\"hello, world!\\n\");\n    return 0;\n}");
            this.editor.setSize(this.size.width, this.size.height);
        }

        OnChange(callback: (e: Event)=>void): void {
            this.editor.on("change", callback);
        }

        GetValue(): string {
            return this.editor.getValue();
        }

        SetValue(text: string): void {
            this.editor.setValue(text);
        }

        SetSize(size: Size): void {
            this.editor.setSize(size.width, size.height);
            this.size = size;
        }

        Disable(): void {
            this.editor.setOption("readOnly", "nocursor");
            $(".CodeMirror-scroll").css({"background-color": "#eee"});
        }

        Enable(): void {
            this.editor.setOption("readOnly", false);
            $(".CodeMirror-scroll").css({"background-color": "#fff"});
        }
    }

    export class Output {
        constructor(public $output: JQuery){
        }

        PrintLn(val: string): void {
            this.$output.append(val + '<br>');
        }

        Prompt(): void {
            this.$output.append('$ ');
        }

        Clear(): void {
            this.$output.text('');
        }

    }

    export class SourceDB {
        constructor() {
        }

        Save(fileName: string, source: string): void {
            localStorage.setItem(fileName, source);
        }

        Load(fileName: string): string {
            return localStorage.getItem(fileName);
        }

        Exist(fileName: string): boolean {
            return localStorage.getItem(fileName) != null;
        }
    }

    export function Compile(source, option, flag, Context, callback) {
        if(flag) {
            $.ajax({
                type: "POST",
                url: "cgi-bin/compile.cgi",
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

    function TerminalColor(text: string): string {
        return text.replace(/\[31m(.*)\[0m/g,'<span class="text-danger">$1</span>');
    }

    function ReplaceNewLine(text: string): string {
        return text.replace(/\n/g,"<br>\n");
    }

    function OutputColor(text: string): string {
        return text.replace(/(note:.*)$/gm,"<span class='text-info'>$1</span>")
                   .replace(/(warning:.*)$/gm,"<span class='text-warning'>$1</span>")
                   .replace(/(error:.*)$/gm,"<span class='text-danger'>$1</span>");
    }

    function RenameFile(text:string, fileName: string): string {
        return text.replace(/\/.*\.c/g,fileName+".c")
                   .replace(/\/.*\/(.*\.h)/g, "$1");
    }

    export function CreateOutputView(text: string, fileName: string): string {
        return OutputColor(RenameFile(ReplaceNewLine(TerminalColor(text)), fileName));
    }
}

$(function () {

    var Editor: C2JS.Editor   = new C2JS.Editor($("#editor"));
    var Output: C2JS.Output   = new C2JS.Output($("#output"));
    var DB:     C2JS.SourceDB = new C2JS.SourceDB();

    var Context: any = {}; //TODO refactor C2JS.Response

    var fileName = "Program";

    var changeFlag = true;
    Editor.OnChange((e: Event)=> {
        changeFlag = true;
        DB.Save(fileName, Editor.GetValue());
    });


    $("#file-name").text(fileName+".c");

    Output.Prompt();

    $("#clear").click((e: Event)=> {
        Output.Clear();
        Output.Prompt();
    });

    $("#compile").click((e: Event)=> {
        var src = Editor.GetValue();
        var opt = '-m'; //TODO
        Output.PrintLn('gcc '+fileName+'.c -o '+fileName);
        $("#compile").addClass("disabled");
        Editor.Disable();

        C2JS.Compile(src, opt, changeFlag, Context, function(res){
            Editor.Enable();
            changeFlag = false;
            $("#compile").removeClass("disabled");
            if(res == null) {
                Output.PrintLn('Sorry, server is something wrong.');
                return;
            }
            if(res.error.length > 0) {
                Output.PrintLn(C2JS.CreateOutputView(res.error, fileName));
            }
            Output.Prompt();

            Context.error = res.error;
            if(!res.error.match("error:")) {
                Context.source = res.source;
                Output.PrintLn('./'+fileName);
                var Module = {print:function(x){Output.PrintLn(x);/*console.log(x);*/}};
                try {
                    var exe = new Function("Module",res.source);
                    exe(Module);
                }catch(e) {
                    Output.PrintLn(e);
                }
                Output.Prompt();
            } else {
                Context.source = null;
            }
        });
    });

    $("#save").click((e: Event)=> {
        var blob = new Blob([Editor.GetValue()]);
        var url = (<any>window).URL || (<any>window).webkitURL;
        var blobURL = url.createObjectURL(blob);
        window.location.href = blobURL;
    });

    $("#open").click((e: Event)=> {
        $("#file-open-dialog").click();
    });

    $("#file-open-dialog").change(function(e: Event) {
        var file: File = this.files[0];
        if(file) {
            var reader = new FileReader();
            reader.onerror = (e: Event)=> {
                alert(<any>e);
            };
            reader.onload = (e: Event)=> {
                Editor.SetValue((<any>e.target).result);
            };
            reader.readAsText(file, 'utf-8');
        }
    });

    $(window).on("beforeunload", (e: Event)=> {
        DB.Save(fileName, Editor.GetValue());
    });

    if(DB.Exist(fileName)) {
        Editor.SetValue(DB.Load(fileName));
    }
});
