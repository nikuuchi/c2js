///<reference path='d.ts/jquery_plugins.d.ts'/>

declare var CodeMirror: any;
declare function saveAs(data :Blob, filename: String): void;

module C2JS {

    export function GetHelloWorldSource(): string {
        return "#include <stdio.h>\n\nint main() {\n    printf(\"hello, world!\\n\");\n    return 0;\n}";
    }

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
            this.ResetHelloWorld();
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

        RemoveAllErrorLine(): void {
            for(var i = 0; i < this.markedErrorLines.length; ++i){
                this.editor.removeLineClass(this.markedErrorLines[i], "text", "errorLine");
            }
            this.markedErrorLines = [];
        }

        ResetHelloWorld(): void {
            this.SetValue(GetHelloWorldSource());
        }
    }

    export class Output {
        constructor(public $output: JQuery){
        }

        PrintLn(val: string): void {
            this.$output.append(val + '<br>');
        }

        PrintErrorLn(val: string): void {
            this.$output.append('<span class="text-danger">' + val + '</span><br>');
        }

        Prompt(): void {
            this.$output.append('$ ');
        }

        Clear(): void {
            this.$output.text('');
        }

    }

    export class FileModel {
        private BaseName: string;
        private Name: string;

        constructor(Name: string) {
            this.SetName(Name);
        }

        SetName(text: string): void {
            this.Name = text.replace(/\..*/, ".c");
            this.BaseName = this.Name.replace(/\..*/, "");
        }

        GetName(): string {
            return this.Name;
        }

        GetBaseName(): string {
            return this.BaseName;
        }
    }

    export class FileCollection {
        private FileModels: FileModel[] = [];
        private UI: JQuery;
        private ActiveFileName: string;
        private ActiveFileIndex: number;
        private defaultNameKey: string = 'filename:defaultNameKey';

        constructor() {
            this.UI = $('#file-name-lists');
            this.ActiveFileName = localStorage.getItem(this.defaultNameKey) || "program.c";
            this.ActiveFileIndex = 0;

            for(var i = 0; i < localStorage.length; i++) {
                var key = localStorage.key(i);
                if(key == this.defaultNameKey) {
                    continue;
                }
                var file = new FileModel(localStorage.key(i));
                var index = this.FileModels.push(file) - 1;
                if(key == this.ActiveFileName) {
                    this.ActiveFileIndex = index;
                }
            }

            //First access for c2js
            if(this.FileModels.length == 0) {
                var file = new FileModel(this.ActiveFileName);
                var index = this.FileModels.push(file) - 1;
                this.ActiveFileIndex = index;
                localStorage.setItem(this.defaultNameKey, "program.c");
                localStorage.setItem("program.c", GetHelloWorldSource());
            }
        }

        Append(NewFile: FileModel, callback: (e:Event) => void) {
            this.FileModels.push(NewFile);
            this.UI.prepend($('#file-list-template').tmpl([NewFile]));
            $("#" + NewFile.GetBaseName()).click(callback);
        }

        private GetIndexOf(BaseName: string): number {
            for(var i = 0; i < this.FileModels.length; i++) {
                if(this.FileModels[i].GetBaseName() == BaseName) {
                    return i;
                }
            }
            return -1;
        }

        GetCurrent(): FileModel {
            return this.FileModels[this.ActiveFileIndex];
        }

        private RemoveActiveClass(): void {
            $($("#" + this.GetCurrent().GetBaseName()).parent().get(0)).removeClass('active');
        }

        private AddActiveClass(): void {
            $($("#" + this.GetCurrent().GetBaseName()).parent().get(0)).addClass('active');
        }

        SetCurrent(BaseName: string): void {
            this.RemoveActiveClass();
            this.ActiveFileName = BaseName + '.c';
            this.ActiveFileIndex = this.GetIndexOf(BaseName);
            this.AddActiveClass();
            localStorage.setItem(this.defaultNameKey, this.ActiveFileName);
        }

        Show(callback: (e:Event)=>void): void {
            this.UI.prepend($('#file-list-template').tmpl(this.FileModels));
            $($("#" + this.GetCurrent().GetBaseName()).parent().get(0)).addClass('active');
            for(var i = 0; i < this.FileModels.length; i++) {
                $("#" + this.FileModels[i].GetBaseName()).click(callback);
            }
        }

        private RemoveByBaseName(BaseName: string): void {
            var i = this.GetIndexOf(BaseName);
            if(i == -1) {
                return;
            }
            $($("#" + BaseName).parent().get(0)).remove();
            this.FileModels.splice(i,1);
            localStorage.removeItem(BaseName + '.c');
        }

        Remove(BaseName: string): void {
            var i = this.GetIndexOf(BaseName);
            i--;
            if(i < 0) {
                i = 0;
            }
            if(this.FileModels.length > 1) {
                this.SetCurrent(this.FileModels[i].GetBaseName());
                this.RemoveByBaseName(BaseName);
                this.AddActiveClass(); //FIXME for remove 0-th file
            }
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

        Delete(fileName: string): void {
            return localStorage.removeItem(fileName);
        }

        Exist(fileName: string): boolean {
            return localStorage.getItem(fileName) != null;
        }

    }

    export function Compile(source, option, isCached, Context, callback, onerror) {
        if(isCached) {
            $.ajax({
                type: "POST",
                url: "cgi-bin/compile.cgi",
                data: JSON.stringify({source: source, option: option}),
                dataType: 'json',
                contentType: "application/json; charset=utf-8",
                success: callback,
                error: onerror
            });
        } else {
            setTimeout(callback,200,Context);
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
    var Files: C2JS.FileCollection = new C2JS.FileCollection();

    Aspen.Editor = Editor;
    Aspen.Output = Output;
    Aspen.Source = DB;
    Aspen.Context = Context;
    Aspen.Files = Files;

    var changeFlag = true;
    Editor.OnChange((e: Event)=> {
        changeFlag = true;
        DB.Save(Files.GetCurrent().GetName(), Editor.GetValue());
    });

    var ChangeCurrentFile = (e: Event) => {
        Files.SetCurrent((<any>e.target).id);
        Editor.SetValue(DB.Load(Files.GetCurrent().GetName()));
        //console.log(e);
    };

    Files.Show(ChangeCurrentFile);

    Output.Prompt();

    var DisableUI = () => {
        //$("#file-name").attr("disabled", "disabled"); //FIXME tab disable
        $("#open").addClass("disabled");
        $("#save").addClass("disabled");
        $("#compile").addClass("disabled");
        Editor.Disable();
    }

    var EnableUI = () => {
        //$("#file-name").removeAttr("disabled"); //FIXME tab enable
        $("#open").removeClass("disabled");
        $("#save").removeClass("disabled");
        $("#compile").removeClass("disabled");
        Editor.Enable();
    }

    $("#compile").click((e: Event)=> {
        var src = Editor.GetValue();
        var file = Files.GetCurrent();
        var opt = '-m'; //TODO
        Output.Clear();
        Output.Prompt();
        Output.PrintLn('gcc '+file.GetName()+' -o '+file.GetBaseName());
        DisableUI();
        Editor.RemoveAllErrorLine();

        C2JS.Compile(src, opt, changeFlag, Context, function(res){
            try{
                changeFlag = false;
                if(res == null) {
                    Output.PrintErrorLn('Sorry, the server is something wrong.');
                    return;
                }
                if(res.error.length > 0) {
                    Output.PrintLn(C2JS.CreateOutputView(res.error, file.GetBaseName()));
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
                    Output.PrintLn('./' + file.GetBaseName());
                    C2JS.Run(res.source, Context, Output);
                } else {
                    Context.source = null;
                }
            }finally{
                EnableUI();
            }
        }, ()=>{
            Output.PrintErrorLn('Sorry, the server is something wrong.');
            EnableUI();
        });
    });

    $("#save").click((e: Event)=> {
        var blob = new Blob([Editor.GetValue()], {type: 'text/plain; charset=UTF-8'});
        saveAs(blob, Files.GetCurrent().GetName());
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
                //FIXME current file
                var fileModel = new C2JS.FileModel(file.name);
                Files.Append(fileModel, ChangeCurrentFile);
                Editor.SetValue((<any>e.target).result);
            };
            reader.readAsText(file, 'utf-8');
        }
    });

    $("#create-file").click((e: Event) => {
        var filename = prompt("Please enter the file name.");
        if(filename == null) {
            return;
        }
        if(filename.match(/.*\.c/) == null) {
            filename += '.c';
        }
        if(DB.Exist(filename)) {
            alert("'"+filename+"' already exists.");
            return;
        }
        var file = new C2JS.FileModel(filename);
        Files.Append(file, ChangeCurrentFile);
        Files.SetCurrent(file.GetBaseName());
        Editor.ResetHelloWorld();
    });

    $("#delete-file").click((e: Event) => {
        Files.Remove(Files.GetCurrent().GetBaseName());
        Editor.SetValue(DB.Load(Files.GetCurrent().GetName()));
    });
    //$("#file-name").change(function(e: Event) {
    //    FileModel.SetName(this.value);
    //});

    $(window).on("beforeunload", (e: Event)=> {
        DB.Save(Files.GetCurrent().GetName(), Editor.GetValue());
    });

    if(DB.Exist(Files.GetCurrent().GetName())) {
        Editor.SetValue(DB.Load(Files.GetCurrent().GetName()));
    }
});
