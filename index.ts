///<reference path='d.ts/jquery.d.ts'/>

declare var CodeMirror: any;
declare function saveAs(data :Blob, filename: String): void;

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
        private markedErrorLines: number[] = [];
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

        SetErrorLine(line: number){
            this.editor.addLineClass(line-1, "text", "errorLine");
            this.markedErrorLines.push(line-1);
        }

        SetErrorLines(lines: number[]){
            for(var i = 0; i < lines.length; ++i){
                this.SetErrorLine(lines[i]);
            }
        }

        RemoveAllErrorLine(){
            for(var i = 0; i < this.markedErrorLines.length; ++i){
                this.editor.removeLineClass(this.markedErrorLines[i], "text", "errorLine");
            }
            this.markedErrorLines = [];
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

    export class FileName {
        private name: string;
        private defaultNameKey: string;
        constructor() {
            this.defaultNameKey = 'filename:defaultNameKey';
            var name = localStorage.getItem(this.defaultNameKey) || "program.c";
            this.SetName(name);
        }

        Show(): void {
            $("#file-name").val(this.name);
        }

        SetName(text: string): void {
            this.name = text.replace(/\..*/, ".c");
            localStorage.setItem(this.defaultNameKey, this.name);
            document.title = "Aspen - " + this.name;
            $("#file-name").val(this.name);
        }

        GetName(): string {
            return this.name;
        }

        GetBaseName(): string {
            return this.name.replace(/\..*/, "");
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

    export function Run(source: string, ctx, out){
        ctx.source = source;
        var Module = { print: function(x){ out.PrintLn(x); } };
        try {
            var exe = new Function("Module", source);
            exe(Module);
        }catch(e) {
            out.PrintLn(e);
        }
        out.Prompt();
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

var Aspen: any = {};

$(function () {

    var Editor: C2JS.Editor   = new C2JS.Editor($("#editor"));
    var Output: C2JS.Output   = new C2JS.Output($("#output"));
    var DB:     C2JS.SourceDB = new C2JS.SourceDB();
    var Context: any = {}; //TODO refactor C2JS.Response
    var Name: C2JS.FileName = new C2JS.FileName();

    Aspen.Editor = Editor;
    Aspen.Output = Output;
    Aspen.Source = DB;
    Aspen.Context = Context;
    Aspen.FileName = Name;

    var changeFlag = true;
    Editor.OnChange((e: Event)=> {
        changeFlag = true;
        DB.Save(Name.GetName(), Editor.GetValue());
    });

    Name.Show();

    Output.Prompt();

    $("#clear").click((e: Event)=> {
        Output.Clear();
        Output.Prompt();
        Editor.RemoveAllErrorLine();
    });

    $("#compile").click((e: Event)=> {
        var src = Editor.GetValue();
        var opt = '-m'; //TODO
        Output.PrintLn('gcc '+Name.GetName()+' -o '+Name.GetBaseName());
        $("#compile").addClass("disabled");
        Editor.Disable();
        Editor.RemoveAllErrorLine();

        C2JS.Compile(src, opt, changeFlag, Context, function(res){
            try{
                Editor.Enable();
                changeFlag = false;
                if(res == null) {
                    Output.PrintLn('Sorry, the server is something wrong.');
                    return;
                }
                if(res.error.length > 0) {
                    Output.PrintLn(C2JS.CreateOutputView(res.error, Name.GetBaseName()));
                    var errorLineNumbers = [];
                    jQuery.each(res.error.split(".c"), (function(k, v){
                        var match = v.match(/:(\d+):\d+:\s+error/);
                        if(match && match[1]){
                            errorLineNumbers.push(match[1]);
                        }
                    }));
                    Editor.SetErrorLines(errorLineNumbers);
                }
                Output.Prompt();

                Context.error = res.error;
                if(!res.error.match("error:")) {
                    Output.PrintLn('./' + Name.GetBaseName());
                    C2JS.Run(res.source, Context, Output);
                } else {
                    Context.source = null;
                }
            }finally{
                $("#compile").removeClass("disabled");
            }
        });
    });

    $("#save").click((e: Event)=> {
        var blob = new Blob([Editor.GetValue()], {type: 'text/plain; charset=UTF-8'});
        saveAs(blob, Name.GetName());
    });

    $("#open").click((e: Event)=> {
        $("#file-open-dialog").click();
    });

    var endsWith = function(str, suffix) {
        return str.indexOf(suffix, str.length - suffix.length) !== -1;
    }

    $("#file-open-dialog").change(function(e: Event) {
        var file: File = this.files[0];
        if(file) {
            if(!endsWith(file.name, ".c")){
                alert("Unsupported file type.\nplease select '*.c' file.");
                return;
            }
            var reader = new FileReader();
            reader.onerror = (e: Event)=> {
                alert(<any>e);
            };
            reader.onload = (e: Event)=> {
                Name.SetName(file.name);
                Name.Show();
                Editor.SetValue((<any>e.target).result);
            };
            reader.readAsText(file, 'utf-8');
        }
    });

    $("#file-name").change(function(e: Event) {
        Name.SetName(this.value);
    });

    $(window).on("beforeunload", (e: Event)=> {
        DB.Save(Name.GetName(), Editor.GetValue());
    });

    if(DB.Exist(Name.GetName())) {
        Editor.SetValue(DB.Load(Name.GetName()));
    }
});
