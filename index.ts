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

        Clear(): void{
            this.SetValue("");
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
            if(!this.Empty()){
                $("#" + this.GetCurrent().GetBaseName()).parent().removeClass('active');
            }
        }

        private AddActiveClass(): void {
            if(!this.Empty()){
                $("#" + this.GetCurrent().GetBaseName()).parent().addClass('active');
            }
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
            this.AddActiveClass();
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
            this.Remove(oldBaseName);
            var file = new FileModel(newname);
            this.Append(file, Callback);
            this.SetCurrent(file.GetBaseName());
            DB.Save(file.GetName(), contents);
        }

        Remove(BaseName: string): void {
            if(this.FileModels.length > 0){
                var removedIndex = this.GetIndexOf(BaseName);
                var newIndex = removedIndex <= 0 ? 0 : removedIndex - 1;
                this.SetCurrent(this.FileModels[newIndex].GetBaseName());
                this.RemoveByBaseName(BaseName);
                this.AddActiveClass();
            }
        }

        Clear(): void {
            if(this.FileModels.length > 0){
                $(".file-tab").remove();
                this.FileModels = [];
                for(var name in localStorage){
                    localStorage.removeItem(name);
                }
            }
        }

        Empty(): boolean {
            return this.FileModels.length == 0;
        }

        MakeUniqueName(Name: string): string {
            for(var i = 0; i < this.FileModels.length; i++) {
                if(this.FileModels[i].GetName() == Name) {
                    return Name.replace(/\.c/g, "_1.c");
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

    function TranslateMessageToJapanese(text: string): string{
        text = text.replace(/&nbsp;/g, " ");
        var wordtable = {
            "variable":"変数",
            "parameter":"引数",
            "argument":"引数",
            "identifier":"変数または関数",
            "pointer":"ポインタ",
            "integer":"整数",
            "struct":"構造体",
            "union":"共用体",
        };
        var rules: any = {};
        rules["unused (\\w+) ('.*?')"]
            = (()=>{ return wordtable[RegExp.$1] + " " + RegExp.$2 + " は使われていません"; });
        rules["expression result unused"]
            = (()=>{ return "計算結果が使われていません"; });
        rules["equality comparison result unused"]
            = (()=>{ return "比較結果が使われていません"; });
        rules["self-comparison always evaluates to true"]
            = (()=>{ return "自分自身との比較は常に真です (この式には意味がありません)"; });
        rules["explicitly assigning a variable of type ('.*?') to itself"]
            = (()=>{ return "自分自身への代入は意味がありません"; });
        rules["using the result of an assignment as a condition without parentheses"]
            = (()=>{ return "代入演算の結果を条件式に使用しています (代入 '=' と比較 '==' を間違えていませんか？)"; });
        rules["(\\w+) (loop|statement) has empty body"]
            = (()=>{ return RegExp.$1 + "文の中身がありません"; });
        rules["type specifier missing, defaults to 'int'"]
            = (()=>{ return "型名がありません (int型と判断しました…型名の省略は推奨されません)"; });
        rules["implicitly declaring library function ('.*?').*"]
            = (()=>{ return "標準ライブラリ関数 " + RegExp.$1 + " を暗黙的に使用しています (警告を消すには正しいヘッダファイルをインクルードしてください)"; });
       　rules["incompatible redeclaration of library function ('.*?')"]
            = (()=>{ return "標準ライブラリ関数 " + RegExp.$1 + " を異なる定義で再宣言しています"; });
        rules["implicit declaration of function ('.*?') is invalid in C99"]
            = (()=>{ return "関数 " + RegExp.$1 + " は宣言されていません"; });
        rules["implicit conversion from ('.*?') to ('.*?') changes value from (.+?) to (.+)"]
            = (()=>{ return RegExp.$1 + "型から" + RegExp.$2 + "型への暗黙の変換により、値が " + RegExp.$3 + " から " + RegExp.$4 + "に変化します (警告を消すには ("+RegExp.$2+")"+RegExp.$3+"と書き、明示的に変換してください)"; });
        rules["incompatible (\\w+) to (\\w+) conversion returning ('.*?') from a function with result type ('.*?')"]
            = (()=>{ return wordtable[RegExp.$1] + "から" + wordtable[RegExp.$2] + "への不正な変換です。戻り値は " + RegExp.$4 + " 型ですが、" + RegExp.$3 + " 型の値を返そうとしています"; });
        rules["incompatible (\\w+) to (\\w+) conversion passing ('.*?') to parameter of type ('.*?')"]
            = (()=>{ return wordtable[RegExp.$1] + "から" + wordtable[RegExp.$2] + "への不正な変換です。引数は " + RegExp.$4 + " 型ですが、" + RegExp.$3 + " 型の値を渡そうとしています"; });
        rules["incompatible (\\w+) to (\\w+) conversion assigning to ('.*?') from ('.*?')"]
            = (()=>{ return wordtable[RegExp.$1] + "から" + wordtable[RegExp.$2] + "への不正な変換です。 " + RegExp.$3 + " 型の変数に" + RegExp.$4 + " 型の値を代入しています"; });
       　rules["data argument not used by format string"]
            = (()=>{ return "使われていない引数があります (フォーマット文字列を確認してください)"; });
       　rules["more '%' conversions than data arguments"]
            = (()=>{ return "指定されたフォーマット文字列に対して引数が足りません (フォーマット文字列を確認してください)"; });
       　rules["control reaches end of non-void function"]
            = (()=>{ return "戻り値を返さないまま関数が終了しています (return文を書くか、戻り値の型をvoidに変更してください)"; });
       　rules["control may reaches end of non-void function"]
            = (()=>{ return "戻り値を返さないまま関数が終了する可能性があります (すべての分岐で値を返していることを確認してください)"; });
       　rules["variable ('.*?') is uninitialized when used here"]
            = (()=>{ return "初期化されていない変数 " + RegExp.$1 + " が参照されました (変数は、参照する前に必ず初期値を代入しましょう)"; });
       　rules["excess elements in array initializer"]
            = (()=>{ return "配列初期化子の要素が配列のサイズに対して多すぎます"; });

        rules['expected "FILENAME" or <FILENAME>']
            = (()=>{ return 'インクルードファイル名は "ファイル名" または <ファイル名> と書く必要があります'; });
        rules["('.*?') file not found"]
            = (()=>{ return "インクルードファイル " + RegExp.$1 + " が見つかりません。ファイル名が間違っているか、対応していないライブラリです (コンパイルは中断されました)"; });
        rules["void function ('.*?') should not return a value"]
            = (()=>{ return "関数 " + RegExp.$1 + " の戻り値はvoid型なので、値を返すことはできません。単にreturn;と書くか、戻り値の型を修正してください"; });
        rules["non-void function ('.*?') should return a value"]
            = (()=>{ return "関数 " + RegExp.$1 + " の戻り値はvoidではないため、値を返す必要があります。return文を書くか、戻り値の型をvoidに修正してください"; });
        rules["too many arguments to function call, expected (\\d+), have (\\d+)"]
            = (()=>{ return RegExp.$1 + "引数の関数に" + RegExp.$2 + "個の引数を渡しています (引数が多すぎます)"; });
        rules["too many arguments to function call, single argument ('.*?'), have (\\d+) arguments"]
            = (()=>{ return "1引数の関数に" + RegExp.$2 + "個の引数を渡しています (引数が多すぎます)"; });
        rules["too few arguments to function call, expected (\\d+), have 0"]
            = (()=>{ return RegExp.$1 + "引数の関数に引数を渡していません (引数が少なすぎます)"; });
        rules["too few arguments to function call, expected (\\d+), have (\\d+)"]
            = (()=>{ return RegExp.$1 + "引数の関数に" + RegExp.$2 + "個の引数を渡しています (引数が少なすぎます)"; });
        rules["passing ('.*?') to parameter of incompatible type ('.*?')"]
            = (()=>{ return RegExp.$2 + " 型の引数に対し、変換できない " + RegExp.$2 + " 型の値を渡すことはできません"; });
        rules["use of undeclared identifier ('.*?')"]
            = (()=>{ return "変数 " + RegExp.$1 + " は宣言されていません。変数を使用するにはあらかじめ宣言を記述する必要があります"; });
        rules["expression is not assignable"]
            = (()=>{ return "この式には代入できません"; });
        rules["called object type ('.*?') is not a function or function pointer"]
            = (()=>{ return "呼び出しを試みた型" + RegExp.$1 + "は関数ではありません"; });
        rules["non-object type ('.*?') is not assignable"]
            = (()=>{ return RegExp.$1 + "型には代入できません"; });
        rules["array type ('.*?') is not assignable"]
            = (()=>{ return "配列には代入できません (配列の要素に代入するには添字を付けてください)"; });
        rules["invalid operands to binary expression \\(('.*?') and ('.*?')\\)"]
            = (()=>{ return "不正な二項演算です (" + RegExp.$1 + "型と" + RegExp.$2 + "型の間に演算が定義されていません)"; });
        rules["invalid suffix ('.*?') on integer constant"]
            = (()=>{ return "整数定数に対する不正な接尾辞です"; });
        rules["unknown type name 'include'"]
            = (()=>{ return "未知の型名 'include' です (#include の間違いではありませんか？)"; });
        rules["unknown type name ('.*?')"]
            = (()=>{ return "未知の型名 " + RegExp.$1 + "　です"; });
        rules["redefinition of ('.*?').*"]
            = (()=>{ return RegExp.$1 + " はすでに定義されています"; });
        rules["expected ';'.*"]
            = (()=>{ return "セミコロン ; が必要です"; });
        rules["expected '}'"]
            = (()=>{ return "中括弧 } が閉じていません"; });
        rules["extraneous closing brace.*"]
            = (()=>{ return "閉じ中括弧 } が多すぎます"; });
        rules["expected '\\)'"]
            = (()=>{ return "括弧 ) が閉じていません"; });
        rules["extraneous '\\)'.*"]
            = (()=>{ return "閉じ括弧 ) が多すぎます"; });
        rules["expected expression"]
            = (()=>{ return "条件式が必要です"; });
        rules["expected parameter declarator"]
            = (()=>{ return "引数の宣言が必要です"; });
        rules["expected 'while'.*"]
            = (()=>{ return "do-while文は while(...); で終わる必要があります"; });
        rules["expected identifier or ('.*?')"]
            = (()=>{ return "関数名、変数名、または " + RegExp.$1 + " が必要です"; });
        rules["expected function body after function declarator"]
            = (()=>{ return "関数の本体が必要です"; });
        rules["expected ('.*?') after ('.*?')"]
            = (()=>{ return RegExp.$1 + " の後に " + RegExp.$2 + " が必要です"; });
        rules["must use '(.*?)' tag to refer to type ('.*?')"]
            = (()=>{ return wordtable[RegExp.$1] + "名の前に 'struct' が必要です"; });
        rules["'(.*?)' declared as an array with a negative size"]
            = (()=>{ return "負のサイズの配列は宣言できません"; });

        rules["to match this '{'"]
            = (()=>{ return "ブロックは以下の位置で開始しています"; });
        rules["to match this '\\('"]
            = (()=>{ return "括弧は以下の位置で開いています"; });
        rules["('.*?') declared here"]
            = (()=>{ return RegExp.$1 + " の宣言は以下の通りです："; });
        rules["passing argument to parameter ('.*?') here"]
            = (()=>{ return "引数 " + RegExp.$1 + " の宣言は以下の通りです："; });
        rules["please include the header (<.*?>) or explicitly provide a declaration for ('.*?')"]
            = (()=>{ return RegExp.$2 + " を使用するには #include " + RegExp.$1 + " と記述してください"; });
        rules["put the semicolon on a separate line to silence this warning"]
            = (()=>{ return "警告を消すには行末にセミコロンを書いてください"; });
        rules["previous definition is here"]
            = (()=>{ return "最初の定義は以下の通りです"; });
        rules["use '==' to turn this assignment into an equality comparison"]
            = (()=>{ return "値の比較には比較演算子 '==' を使用します"; });
        rules["use '=' to turn this equality comparison into an assignment"]
            = (()=>{ return "代入には代入演算子 '=' を使用します"; });
        rules["place parentheses around the assignment to silence this warning"]
            = (()=>{ return "間違いでない場合は、警告を消すために代入演算を()で囲んでください"; });
        rules["initialize the variable ('.*?') to silence this warning"]
            = (()=>{ return "警告を消すためには " + RegExp.$1 + " に初期値を代入してください"; });
        rules["('.*?') is a builtin with type ('.*?')"]
            = (()=>{ return RegExp.$1 + " は組み込み関数です"; });
        rules["uninitialized use occurs here"]
            = (()=>{ "ここで未初期化のまま参照されています"; });
        rules["remove the 'if' if its condition is always false"]
            = (()=>{ "本当に常に真でよい場合、if文は不要です"; });

        for(var rule in rules){
            try{
                if(text.match(new RegExp(rule))){
                    return (<any>RegExp).leftContext + rules[rule]() + (<any>RegExp).rightContext;
                }
            }catch(e){
                console.log(e);
                console.log(rule);
            }
        }
        return text;
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
                if(Aspen.Language == "ja"){
                    textlines[i] = TranslateMessageToJapanese(textlines[i]);
                }
                if(textlines[i+1].lastIndexOf(filename, 0) != 0){
                    var code = textlines[i+1];
                    var indicator = textlines[i+2];
                    var begin = indicator.indexOf("~");
                    var end = indicator.lastIndexOf("~") + 1;
                    var replacee = code.substring(begin, end);
                    var code = replacee.length > 0 ? code.replace(replacee, "<u>" + replacee + "</u>") : code;
                    var consumedLines = 1;
                    textlines[i+1] = "<code>" + code.replace(/ /gm, "&nbsp;") + "</code>";
                    if(textlines[i+2].lastIndexOf(filename, 0) != 0){
                        textlines[i+2] = "<samp>" + indicator.replace(/~/g, " ")
                                                  .replace(/ /gm, "&nbsp;")
                                                  .replace(/\^/, "<span class='glyphicon glyphicon-arrow-up'></span>") + "</samp>";
                        consumedLines++;
                    }
                    if(textlines[i+3].lastIndexOf(filename, 0) != 0){
                        textlines[i+3] = "<samp>" + textlines[i+3].replace(/ /gm, "&nbsp;") + "</samp>";
                        consumedLines++;
                    }
                    i += consumedLines;
                }
            }
        }

        return textlines.join("<br>\n")
            .replace(/(\d+).\d+: (note):(.*)$/gm,    " <b>line $1</b>: <span class='label label-info'>$2</span> <span class='text-info'>$3</span>")
            .replace(/(\d+).\d+: (warning):(.*)$/gm, " <b>line $1</b>: <span class='label label-warning'>$2</span> <span class='text-warning'>$3</span>")
            .replace(/(\d+).\d+: (error):(.*)$/gm,   " <b>line $1</b>: <span class='label label-danger'>$2</span> <span class='text-danger'>$3</span>")
            .replace(/(\d+).\d+: (fatal error):(.*)$/gm,   " <b>line $1</b>: <span class='label label-danger'>$2</span> <span class='text-danger'>$3</span>");
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

    export function ConfirmToRemove(BaseName: string): boolean {
        return confirm('The item "'+BaseName+'.c" will be delete immediately. Are you sure you want to continue?');
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
    Aspen.Language = "en";
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
        if(!Files.Empty()){
            changeFlag = true;
            DB.Save(Files.GetCurrent().GetName(), Editor.GetValue());
        }
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

    var FindErrorNumbersInErrorMessage = (message: string) => {
        var errorLineNumbers = [];
        jQuery.each(message.split(".c"), (function(k, v){
            var match = v.match(/:(\d+):\d+:\s+error/);
            if(match && match[1]){
                errorLineNumbers.push(match[1]);
            }
        }));
        return errorLineNumbers;
    }

    var CompileCallback = (e: Event)=> {
        if(Files.Empty()) return;
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
                    Editor.SetErrorLines(FindErrorNumbersInErrorMessage(res.error));
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
    };

    $("#compile").click(CompileCallback);
    (<any>$("#compile")).tooltip({placement: "bottom", html: true});

    var SaveFunction = (e: Event)=> {
        if(Files.Empty()) return;
        var blob = new Blob([Editor.GetValue()], {type: 'text/plain; charset=UTF-8'});
        saveAs(blob, Files.GetCurrent().GetName());
    };
    $("#save-file-menu").click(SaveFunction);


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
                var fileModel = new C2JS.FileModel(Files.MakeUniqueName(file.name));
                Files.Append(fileModel, ChangeCurrentFile);
                Files.SetCurrent(fileModel.GetBaseName());
                Editor.SetValue((<any>e.target).result);
                DB.Save(Files.GetCurrent().GetName(), Editor.GetValue());
                Editor.ClearHistory();
            };
            reader.readAsText(file, 'utf-8');
        }
    });

    var OnFilesBecomeEmpty = () => {
        $("#delete-file").hide();
        $(".disabled-on-files-empty").addClass("disabled");
        Editor.Clear();
        Editor.Disable();
    };
    var OnFilesBecomeNotEmpty = () => {
        $("#delete-file").show();
        $(".disabled-on-files-empty").removeClass("disabled");
        Editor.Enable();
    };

    var CreateFileFunction = (e: Event) => {
        var filename = prompt("Please enter the file name.", C2JS.CheckFileName("", DB));
        filename = C2JS.CheckFileName(filename, DB);
        if(filename == null) {
            return;
        }

        var file = new C2JS.FileModel(filename);
        Files.Append(file, ChangeCurrentFile);
        Files.SetCurrent(file.GetBaseName());
        OnFilesBecomeNotEmpty();
        Editor.ResetHelloWorld();
        Editor.ClearHistory();
    };
    (<any>$("#create-file")).tooltip({placement: "bottom", html: true});
    $("#create-file").click(CreateFileFunction);
    $("#create-file-menu").click(CreateFileFunction);

    var RenameFunction = (e: Event) => {
        if(Files.Empty()) return;
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
        if(Files.Empty()) return;
        var BaseName = Files.GetCurrent().GetBaseName();
        if(C2JS.ConfirmToRemove(BaseName)) {
            Files.Remove(BaseName);
            if(Files.Empty()){
                OnFilesBecomeEmpty();
            }else{
                Editor.SetValue(DB.Load(Files.GetCurrent().GetName()));
            }
        }
    };

    (<any>$("#delete-file")).tooltip({placement: "bottom", html: true});
    $("#delete-file").click(DeleteFileFunction);
    $("#delete-file-menu").click(DeleteFileFunction);

    var DeleteAllFilesFunction = (e: Event) => {
        if(Files.Empty()) return;
        var BaseName = Files.GetCurrent().GetBaseName();
        if(C2JS.ConfirmAllRemove()) {
            Files.Clear();
        }
        OnFilesBecomeEmpty();
    };
    $("#delete-all-file-menu").click(DeleteAllFilesFunction);

    var JpModeCheckFunction = (function(e: Event) {
        Aspen.Language = this.checked ? "ja" : "en";
    });
    $("#JpModeCheck").click(JpModeCheckFunction);

    document.onkeydown = (ev: KeyboardEvent) => {
        if(ev.ctrlKey) {
            switch(ev.keyCode){
                case 13:/*Enter*/
                    ev.preventDefault();
                    ev.stopPropagation();
                    CompileCallback(ev);
                    return;
                case 78:/*n*/
                    ev.preventDefault();
                    ev.stopPropagation();
                    CreateFileFunction(ev);
                    return;
                case 87:/*w*/
                    ev.preventDefault();
                    ev.stopPropagation();
                    DeleteFileFunction(ev);
                    return;
                case 82:/*r*/
                    ev.preventDefault();
                    ev.stopPropagation();
                    RenameFunction(ev);
                    return;
                case 83:/*s*/
                    ev.preventDefault();
                    ev.stopPropagation();
                    SaveFunction(ev);
                    return;
                case 79:/*o*/
                    ev.preventDefault();
                    ev.stopPropagation();
                    $("#file-open-dialog").click();
                    return;
            }
        }
    };

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
