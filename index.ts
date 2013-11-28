///<reference path='d.ts/jquery_plugins.d.ts'/>

declare var CodeMirror: any;
declare function saveAs(data :Blob, filename: String): void;
var _ua: any;

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

        ClearHistory(): void {
            this.editor.clearHistory();
        }

        ContainsMultiByteSpace(): boolean {
            return this.editor.getValue().match(/　/);
        }

        ReplaceMultiByteSpace(): void {
            this.editor.setValue(this.editor.getValue().replace(/　/g, "  "));
        }
    }

    export class Output {
        constructor(public $output: JQuery){
        }

        Print(val: string): void {
            this.$output.append(val);
        }

        private static ExpandTab(val: string, width: number): string {
            var tsv = val.split("\t");
            var ret = "";
            var spase = "                "; // 16 spaces
            var n = tsv.length;
            for(var i = 0; i < n; ++i){
                ret += tsv[i];
                if(n - i > 1){
                    ret += spase.substr(0, width - ret.length % width);
                }
            }
            return ret;
        }

        PrintFromC(val: string): void {
            val = Output.ExpandTab(val, 4);
            var obj = document.createElement('samp');
            if (typeof obj.textContent != 'undefined') {
                obj.textContent = val;
            } else {
                obj.innerText = val;
            }
            this.$output.append("<samp>" + obj.innerHTML.replace(/ /g, "&nbsp;") + "</samp><br>");
        }

        PrintLn(val: string): void {
            this.$output.append(val + '<br>\n');
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
                if(key == this.defaultNameKey || !key.match(/.*\.c/)) {
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

        Rename(oldBaseName: string, newname: string, contents: string, Callback: any, DB: SourceDB): void {
            this.Remove(oldBaseName, Callback);
            var file = new FileModel(newname);
            this.Append(file, Callback);
            this.SetCurrent(file.GetBaseName());
            DB.Save(file.GetName(), contents);
        }

        IsRemove(BaseName: string): boolean {
            return confirm('The item "'+BaseName+'.c" will be delete immediately. Are you sure you want to continue?');
        }

        Remove(BaseName: string, Callback: any): void {
            var i = this.GetIndexOf(BaseName);
            i--;
            if(i < 0) {
                i = 0;
            }
            if(this.FileModels.length > 1) {
                this.SetCurrent(this.FileModels[i].GetBaseName());
                this.RemoveByBaseName(BaseName);
                this.AddActiveClass(); //FIXME for remove 0-th file
            } else if(this.FileModels.length == 1) {
                this.SetCurrent(this.FileModels[0].GetBaseName());
                this.RemoveByBaseName(BaseName);

                this.ActiveFileName = 'program.c';
                var file = new FileModel(this.ActiveFileName);
                this.ActiveFileIndex = 0;
                localStorage.setItem(this.defaultNameKey, this.ActiveFileName);
                localStorage.setItem(this.ActiveFileName, "");//GetHelloWorldSource());
                this.Append(file, Callback);
                this.AddActiveClass();
            }
        }

        GetLength(): number {
            return this.FileModels.length;
        }

        RenameExistName(Name: string): string {
            for(var i = 0; i < this.FileModels.length; i++) {
                if(this.FileModels[i].GetName() == Name) {
                    return Name.replace(/\.c/g,"_1.c");
                }
            }
            return Name;
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

    export function Compile(source, option, filename, isCached, Context, callback, onerror) {
        if(isCached) {
            $.ajax({
                type: "POST",
                url: "cgi-bin/compile.cgi",
                data: JSON.stringify({source: source, option: option, filename: filename}),
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
        var Module = { print: function(x){ out.PrintFromC(x); } };
        try {
            var exe = new Function("Module", source);
            exe(Module);
        }catch(e) {
            out.Print(e);
        }
        out.Prompt();
    }

    function ConvertTerminalColor(text: string): string {
        return text.replace(/\[31m(.*)\[0m/g,'<span class="text-danger">$1</span>');
    }

    function ReplaceNewLine(text: string): string {
        return text.replace(/[\r\n|\r|\n]/g,"<br>\n");
    }

    function FormatMessage(text: string, filename: string): string {
        text = text.replace(/ERROR.*$/gm,"") // To remove a message that is not Clang one but Emscripten's.
                   .replace(/</gm, "&lt;")
                   .replace(/>/gm, "&gt;");

        var textlines: string[] = text.split(/[\r\n|\r|\n]/g);
        for(var i = 0; i < textlines.length; ++i){
            if(textlines[i].lastIndexOf(filename, 0) == 0){
                textlines[i] = textlines[i].replace(/ \[.*\]/gm, "");
                var code = textlines[i+1];
                var indicator = textlines[i+2];
                var begin = indicator.indexOf("~");
                var end = indicator.lastIndexOf("~") + 1;
                var replacee = code.substring(begin, end);
                var code = replacee.length > 0 ? code.replace(replacee, "<strong>" + replacee + "</strong>") : code;
                textlines[i+1] = "<code>" + code.replace(/ /gm, "&nbsp;") + "</code>";
                textlines[i+2] = "<samp>" + indicator.replace("~", " ")
                                          .replace(/ /gm, "&nbsp;")
                                          .replace(/\^/, "<span class='glyphicon glyphicon-arrow-up'></span>") + "</samp>";
                if(textlines[i+3].lastIndexOf(filename, 0) != 0){
                    textlines[i+3] = "<samp>" + textlines[i+3].replace(/ /gm, "&nbsp;") + "</samp>";
                }
                i += 2;
            }
        }

        return textlines.join("<br>\n")
            .replace(/(\d+:\d+): (note):(.*)$/gm,"<b>$1</b>: <span class='label label-info'>$2</span> <span class='text-info'>$3</span>")
            .replace(/(\d+:\d+): (warning):(.*)$/gm,"<b>$1</b>: <span class='label label-warning'>$2</span> <span class='text-warning'>$3</span>")
            .replace(/(\d+:\d+): (error):(.*)$/gm,"<b>$1</b>: <span class='label label-danger'>$2</span> <span class='text-danger'>$3</span>");
    }


    function FormatFilename(text:string, fileName: string): string {
        return text.replace(/\/.*\.c/g,fileName+".c")
                   .replace(/\/.*\/(.*\.h)/g, "$1");
    }

    export function FormatClangErrorMessage(text: string, fileName: string): string {
        return FormatMessage(FormatFilename(ConvertTerminalColor(text), fileName), fileName);
    }

    export function CheckFileName(name: string, DB: SourceDB): string {
        var filename = name;
        if(filename == null) {
            return null;
        }

        if(filename == "") {
            filename = "file"+ new Date().toJSON().replace(/\/|:|\./g,"-").replace(/20..-/,"").replace(/..-..T/,"").replace(/Z/g,"").replace(/-/g,"");
        }

        if(filename.match(/[\s\t\\/:\*\?\"\<\>\|]+/)) {//"
            alert("This file name is incorrect.");
            return null;
        }

        if(filename.match(/.*\.c/) == null) {
            filename += '.c';
        }
        if(DB.Exist(filename)) {
            alert("'"+filename+"' already exists.");
            return null;
        }
        return filename;
    }

    export function ConfirmAllRemove(): boolean {
        return confirm('All items will be delete immediately. Are you sure you want to continue?');
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
    Aspen.Debug = {};
    Aspen.Debug.DeleteAllKey = () => {
        while(localStorage.length > 1) {
            localStorage.removeItem(localStorage.key(0));
        }
    };
    Aspen.Debug.OutputClangMessage = (message, filename) => {
        Output.PrintLn('DEBUG');
        Output.PrintLn(C2JS.FormatClangErrorMessage(message, filename));
    };
    Aspen.Debug.PrintC = (message) => {
        Output.PrintFromC(message);
    };

    var changeFlag = true;
    Editor.OnChange((e: Event)=> {
        changeFlag = true;
        DB.Save(Files.GetCurrent().GetName(), Editor.GetValue());
    });

    var ChangeCurrentFile = (e: Event) => {
        Files.SetCurrent((<any>e.target).id);
        Editor.SetValue(DB.Load(Files.GetCurrent().GetName()));
        Editor.ClearHistory();
    };

    Files.Show(ChangeCurrentFile);

    Output.Prompt();

    var DisableUI = () => {
        //$("#file-name").attr("disabled", "disabled"); //FIXME tab disable
        $("#open-file-menu").addClass("disabled");
        $("#save-file-menu").addClass("disabled");
        $("#compile").addClass("disabled");
        Editor.Disable();
    }

    var EnableUI = () => {
        //$("#file-name").removeAttr("disabled"); //FIXME tab enable
        $("#open-file-menu").removeClass("disabled");
        $("#save-file-menu").removeClass("disabled");
        $("#compile").removeClass("disabled");
        Editor.Enable();
    }

    var CompileCallback = (e: Event)=> {
        if(Editor.ContainsMultiByteSpace()) {
            if(confirm('ソースコード中に全角スペースが含まれています。半角スペースに置換しますか？\n(C言語では全角スペースを使えません)')) {
                Editor.ReplaceMultiByteSpace();
            }
        }
        var src = Editor.GetValue();
        var file = Files.GetCurrent();
        var opt = '-m'; //TODO
        Output.Clear();
        Output.Prompt();
        Output.PrintLn('gcc '+file.GetName()+' -o '+file.GetBaseName());
        try{
            DisableUI();
            Editor.RemoveAllErrorLine();

            C2JS.Compile(src, opt, file.GetName(), changeFlag, Context, function(res){
                try{
                    changeFlag = false;
                    if(res == null) {
                        Output.PrintErrorLn('Sorry, the server is something wrong.');
                        return;
                    }
                    if(res.error.length > 0) {
                        Output.PrintLn(C2JS.FormatClangErrorMessage(res.error, file.GetBaseName()));
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
        }finally{
            EnableUI();
        }
    };

    $("#compile").click(CompileCallback);
    (<any>$("#compile")).tooltip({placement: "bottom", html: true});
    document.onkeydown = (ev: KeyboardEvent) => {
        if(ev.keyCode == 13/*Enter*/ && ev.ctrlKey) {
            CompileCallback(ev);
            return false;
        }
    };

    $("#save-file-menu").click((e: Event)=> {
        var blob = new Blob([Editor.GetValue()], {type: 'text/plain; charset=UTF-8'});
        saveAs(blob, Files.GetCurrent().GetName());
    });

    $("#open-file-menu").click((e: Event)=> {
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
                DB.Save(Files.GetCurrent().GetName(), Editor.GetValue());
                var fileModel = new C2JS.FileModel(Files.RenameExistName(file.name));
                Files.Append(fileModel, ChangeCurrentFile);
                Files.SetCurrent(fileModel.GetBaseName());
                Editor.SetValue((<any>e.target).result);
                DB.Save(Files.GetCurrent().GetName(), Editor.GetValue());
                Editor.ClearHistory();
            };
            reader.readAsText(file, 'utf-8');
        }
    });

    var CreateFileFunction = (e: Event) => {
        var filename = prompt("Please enter the file name.", C2JS.CheckFileName("", DB));
        filename = C2JS.CheckFileName(filename, DB);
        if(filename == null) {
            return;
        }

        var file = new C2JS.FileModel(filename);
        Files.Append(file, ChangeCurrentFile);
        Files.SetCurrent(file.GetBaseName());
        Editor.ResetHelloWorld();
        Editor.ClearHistory();
    };
    (<any>$("#create-file")).tooltip({placement: "bottom", html: true});
    $("#create-file").click(CreateFileFunction);
    $("#create-file-menu").click(CreateFileFunction);

    var RenameFunction = (e: Event) => {
        DB.Save(Files.GetCurrent().GetName(), Editor.GetValue());
        var oldfilebasename = Files.GetCurrent().GetBaseName();
        var oldfilecontents = Editor.GetValue();

        var filename = prompt("Rename: Please enter the file name.", oldfilebasename+".c");
        filename = C2JS.CheckFileName(filename, DB);
        if(filename == null) {
            return;
        }
        Files.Rename(oldfilebasename, filename, oldfilecontents, ChangeCurrentFile, DB);
        Editor.SetValue(oldfilecontents);
        DB.Save(Files.GetCurrent().GetName(), Editor.GetValue());
    };
    $("#rename-menu").click(RenameFunction);

    var DeleteFileFunction = (e: Event) => {
        var BaseName = Files.GetCurrent().GetBaseName();
        if(Files.IsRemove(BaseName)) {
            Files.Remove(BaseName, ChangeCurrentFile);
        }
        Editor.SetValue(DB.Load(Files.GetCurrent().GetName()));
    };
    (<any>$("#delete-file")).tooltip({placement: "bottom", html: true});
    $("#delete-file").click(DeleteFileFunction);
    $("#delete-file-menu").click(DeleteFileFunction);

    var DeleteAllFilesFunction = (e: Event) => {
        var BaseName = Files.GetCurrent().GetBaseName();
        if(C2JS.ConfirmAllRemove()) {
            while(Files.GetLength() > 1) {
                Files.Remove(BaseName, ChangeCurrentFile);
                BaseName = Files.GetCurrent().GetBaseName();
            }
            Files.Remove(BaseName, ChangeCurrentFile);
        }
        Editor.SetValue(DB.Load(Files.GetCurrent().GetName()));
    };
    $("#delete-all-file-menu").click(DeleteAllFilesFunction);

    $(window).on("beforeunload", (e: Event)=> {
        DB.Save(Files.GetCurrent().GetName(), Editor.GetValue());
    });

    if(DB.Exist(Files.GetCurrent().GetName())) {
        Editor.SetValue(DB.Load(Files.GetCurrent().GetName()));
    }

    if(_ua.Trident && _ua.ltIE9){
        $("#NotSupportedBrouserAlert").show();
        DisableUI();
    }
});
