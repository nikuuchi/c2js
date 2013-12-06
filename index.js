var _ua;

var C2JS;
(function (C2JS) {
    function GetHelloWorldSource() {
        return "#include <stdio.h>\n\nint main() {\n    printf(\"hello, world!\\n\");\n    return 0;\n}";
    }
    C2JS.GetHelloWorldSource = GetHelloWorldSource;

    var Size = (function () {
        function Size(width, height) {
            this.width = width;
            this.height = height;
        }
        return Size;
    })();
    C2JS.Size = Size;

    var Editor = (function () {
        function Editor($editor) {
            this.markedErrorLines = [];
            this.size = new Size($editor.width(), $editor.height());
            this.editor = CodeMirror.fromTextArea($editor[0], {
                lineNumbers: true,
                indentUnit: 4,
                mode: "text/x-csrc"
            });
            this.ResetHelloWorld();
            this.editor.setSize(this.size.width, this.size.height);
        }
        Editor.prototype.OnChange = function (callback) {
            this.editor.on("change", callback);
        };

        Editor.prototype.GetValue = function () {
            return this.editor.getValue();
        };

        Editor.prototype.SetValue = function (text) {
            this.editor.setValue(text);
        };

        Editor.prototype.Clear = function () {
            this.SetValue("");
        };

        Editor.prototype.SetSize = function (size) {
            this.editor.setSize(size.width, size.height);
            this.size = size;
        };

        Editor.prototype.Disable = function () {
            this.editor.setOption("readOnly", "nocursor");
            $(".CodeMirror-scroll").css({ "background-color": "#eee" });
        };

        Editor.prototype.Enable = function () {
            this.editor.setOption("readOnly", false);
            $(".CodeMirror-scroll").css({ "background-color": "#fff" });
        };

        Editor.prototype.SetErrorLine = function (line) {
            this.editor.addLineClass(line - 1, "text", "errorLine");
            this.markedErrorLines.push(line - 1);
        };

        Editor.prototype.SetErrorLines = function (lines) {
            for (var i = 0; i < lines.length; ++i) {
                this.SetErrorLine(lines[i]);
            }
        };

        Editor.prototype.RemoveAllErrorLine = function () {
            for (var i = 0; i < this.markedErrorLines.length; ++i) {
                this.editor.removeLineClass(this.markedErrorLines[i], "text", "errorLine");
            }
            this.markedErrorLines = [];
        };

        Editor.prototype.ResetHelloWorld = function () {
            this.SetValue(GetHelloWorldSource());
        };

        Editor.prototype.ClearHistory = function () {
            this.editor.clearHistory();
        };

        Editor.prototype.ContainsMultiByteSpace = function () {
            return this.editor.getValue().match(/　/);
        };

        Editor.prototype.ReplaceMultiByteSpace = function () {
            this.editor.setValue(this.editor.getValue().replace(/　/g, "  "));
        };
        return Editor;
    })();
    C2JS.Editor = Editor;

    var Output = (function () {
        function Output($output) {
            this.$output = $output;
        }
        Output.prototype.Print = function (val) {
            this.$output.append(val);
        };

        Output.ExpandTab = function (val, width) {
            var tsv = val.split("\t");
            var ret = "";
            var spase = "                ";
            var n = tsv.length;
            for (var i = 0; i < n; ++i) {
                ret += tsv[i];
                if (n - i > 1) {
                    ret += spase.substr(0, width - ret.length % width);
                }
            }
            return ret;
        };

        Output.prototype.PrintFromC = function (val) {
            val = Output.ExpandTab(val, 4);
            var obj = document.createElement('samp');
            if (typeof obj.textContent != 'undefined') {
                obj.textContent = val;
            } else {
                obj.innerText = val;
            }
            this.$output.append("<samp>" + obj.innerHTML.replace(/ /g, "&nbsp;") + "</samp><br>");
        };

        Output.prototype.PrintLn = function (val) {
            this.$output.append(val + '<br>\n');
        };

        Output.prototype.PrintErrorLn = function (val) {
            this.$output.append('<span class="text-danger">' + val + '</span><br>');
        };

        Output.prototype.Prompt = function () {
            this.$output.append('$ ');
        };

        Output.prototype.Clear = function () {
            this.$output.text('');
        };
        return Output;
    })();
    C2JS.Output = Output;

    var FileModel = (function () {
        function FileModel(Name) {
            this.SetName(Name);
        }
        FileModel.prototype.SetName = function (text) {
            this.Name = text.replace(/\..*/, ".c");
            this.BaseName = this.Name.replace(/\..*/, "");
        };

        FileModel.prototype.GetName = function () {
            return this.Name;
        };

        FileModel.prototype.GetBaseName = function () {
            return this.BaseName;
        };
        return FileModel;
    })();
    C2JS.FileModel = FileModel;

    var FileCollection = (function () {
        function FileCollection() {
            this.FileModels = [];
            this.defaultNameKey = 'filename:defaultNameKey';
            this.UI = $('#file-name-lists');
            this.ActiveFileName = localStorage.getItem(this.defaultNameKey) || "program.c";
            this.ActiveFileIndex = 0;

            for (var i = 0; i < localStorage.length; i++) {
                var key = localStorage.key(i);
                if (key == this.defaultNameKey || !key.match(/.*\.c/)) {
                    continue;
                }
                var file = new FileModel(localStorage.key(i));
                var index = this.FileModels.push(file) - 1;
                if (key == this.ActiveFileName) {
                    this.ActiveFileIndex = index;
                }
            }

            if (this.FileModels.length == 0) {
                var file = new FileModel(this.ActiveFileName);
                var index = this.FileModels.push(file) - 1;
                this.ActiveFileIndex = index;
                localStorage.setItem(this.defaultNameKey, "program.c");
                localStorage.setItem("program.c", GetHelloWorldSource());
            }
        }
        FileCollection.prototype.Append = function (NewFile, callback) {
            this.FileModels.push(NewFile);
            this.UI.prepend($('#file-list-template').tmpl([NewFile]));
            $("#" + NewFile.GetBaseName()).click(callback);
        };

        FileCollection.prototype.GetIndexOf = function (BaseName) {
            for (var i = 0; i < this.FileModels.length; i++) {
                if (this.FileModels[i].GetBaseName() == BaseName) {
                    return i;
                }
            }
            return -1;
        };

        FileCollection.prototype.GetCurrent = function () {
            return this.FileModels[this.ActiveFileIndex];
        };

        FileCollection.prototype.RemoveActiveClass = function () {
            if (!this.Empty()) {
                $("#" + this.GetCurrent().GetBaseName()).parent().removeClass('active');
            }
        };

        FileCollection.prototype.AddActiveClass = function () {
            if (!this.Empty()) {
                $("#" + this.GetCurrent().GetBaseName()).parent().addClass('active');
            }
        };

        FileCollection.prototype.SetCurrent = function (BaseName) {
            this.RemoveActiveClass();
            this.ActiveFileName = BaseName + '.c';
            this.ActiveFileIndex = this.GetIndexOf(BaseName);
            this.AddActiveClass();
            localStorage.setItem(this.defaultNameKey, this.ActiveFileName);
        };

        FileCollection.prototype.Show = function (callback) {
            this.UI.prepend($('#file-list-template').tmpl(this.FileModels));
            this.AddActiveClass();
            for (var i = 0; i < this.FileModels.length; i++) {
                $("#" + this.FileModels[i].GetBaseName()).click(callback);
            }
        };

        FileCollection.prototype.RemoveByBaseName = function (BaseName) {
            var i = this.GetIndexOf(BaseName);
            if (i == -1) {
                return;
            }
            $($("#" + BaseName).parent().get(0)).remove();
            this.FileModels.splice(i, 1);
            localStorage.removeItem(BaseName + '.c');
        };

        FileCollection.prototype.Rename = function (oldBaseName, newname, contents, Callback, DB) {
            this.Remove(oldBaseName);
            var file = new FileModel(newname);
            this.Append(file, Callback);
            this.SetCurrent(file.GetBaseName());
            DB.Save(file.GetName(), contents);
        };

        FileCollection.prototype.Remove = function (BaseName) {
            if (this.FileModels.length > 0) {
                var removedIndex = this.GetIndexOf(BaseName);
                var newIndex = removedIndex <= 0 ? 0 : removedIndex - 1;
                this.SetCurrent(this.FileModels[newIndex].GetBaseName());
                this.RemoveByBaseName(BaseName);
                this.AddActiveClass();
            }
        };

        FileCollection.prototype.Clear = function () {
            if (this.FileModels.length > 0) {
                $(".file-tab").remove();
                this.FileModels = [];
                for (var name in localStorage) {
                    localStorage.removeItem(name);
                }
            }
        };

        FileCollection.prototype.Empty = function () {
            return this.FileModels.length == 0;
        };

        FileCollection.prototype.MakeUniqueName = function (Name) {
            for (var i = 0; i < this.FileModels.length; i++) {
                if (this.FileModels[i].GetName() == Name) {
                    return Name.replace(/\.c/g, "_1.c");
                }
            }
            return Name;
        };
        return FileCollection;
    })();
    C2JS.FileCollection = FileCollection;

    var SourceDB = (function () {
        function SourceDB() {
        }
        SourceDB.prototype.Save = function (fileName, source) {
            localStorage.setItem(fileName, source);
        };

        SourceDB.prototype.Load = function (fileName) {
            return localStorage.getItem(fileName);
        };

        SourceDB.prototype.Delete = function (fileName) {
            return localStorage.removeItem(fileName);
        };

        SourceDB.prototype.Exist = function (fileName) {
            return localStorage.getItem(fileName) != null;
        };
        return SourceDB;
    })();
    C2JS.SourceDB = SourceDB;

    function Compile(source, option, filename, isCached, Context, callback, onerror) {
        if (isCached) {
            $.ajax({
                type: "POST",
                url: "cgi-bin/compile.cgi",
                data: JSON.stringify({ source: source, option: option, filename: filename }),
                dataType: 'json',
                contentType: "application/json; charset=utf-8",
                success: callback,
                error: onerror
            });
        } else {
            setTimeout(callback, 200, Context);
        }
    }
    C2JS.Compile = Compile;

    function Run(source, ctx, out) {
        ctx.source = source;
        var Module = { print: function (x) {
                out.PrintFromC(x);
            } };
        try  {
            var exe = new Function("Module", source);
            exe(Module);
        } catch (e) {
            out.Print(e);
        }
        out.Prompt();
    }
    C2JS.Run = Run;

    function TranslateMessageToJapanese(text) {
        text = text.replace(/&nbsp;/g, " ");
        var wordtable = {
            "variable": "変数",
            "parameter": "引数",
            "argument": "引数",
            "identifier": "変数または関数",
            "pointer": "ポインタ",
            "integer": "整数",
            "struct": "構造体",
            "union": "共用体"
        };
        var rules = {};
        rules["unused (\\w+) ('.*?')"] = (function () {
            return wordtable[RegExp.$1] + " " + RegExp.$2 + " は使われていません";
        });
        rules["expression result unused"] = (function () {
            return "計算結果が使われていません";
        });
        rules["equality comparison result unused"] = (function () {
            return "比較結果が使われていません";
        });
        rules["self-comparison always evaluates to true"] = (function () {
            return "自分自身との比較は常に真です (この式には意味がありません)";
        });
        rules["explicitly assigning a variable of type ('.*?') to itself"] = (function () {
            return "自分自身への代入は意味がありません";
        });
        rules["using the result of an assignment as a condition without parentheses"] = (function () {
            return "代入演算の結果を条件式に使用しています (代入 '=' と比較 '==' を間違えていませんか？)";
        });
        rules["(\\w+) (loop|statement) has empty body"] = (function () {
            return RegExp.$1 + "文の中身がありません";
        });
        rules["type specifier missing, defaults to 'int'"] = (function () {
            return "型名がありません (int型と判断しました…型名の省略は推奨されません)";
        });
        rules["implicitly declaring library function ('.*?').*"] = (function () {
            return "標準ライブラリ関数 " + RegExp.$1 + " を暗黙的に使用しています (警告を消すには正しいヘッダファイルをインクルードしてください)";
        });
        rules["incompatible redeclaration of library function ('.*?')"] = (function () {
            return "標準ライブラリ関数 " + RegExp.$1 + " を異なる定義で再宣言しています";
        });
        rules["implicit declaration of function ('.*?') is invalid in C99"] = (function () {
            return "関数 " + RegExp.$1 + " は宣言されていません";
        });
        rules["implicit conversion from ('.*?') to ('.*?') changes value from (.+?) to (.+)"] = (function () {
            return RegExp.$1 + "型から" + RegExp.$2 + "型への暗黙の変換により、値が " + RegExp.$3 + " から " + RegExp.$4 + "に変化します (警告を消すには (" + RegExp.$2 + ")" + RegExp.$3 + "と書き、明示的に変換してください)";
        });
        rules["incompatible (\\w+) to (\\w+) conversion returning ('.*?') from a function with result type ('.*?')"] = (function () {
            return wordtable[RegExp.$1] + "から" + wordtable[RegExp.$2] + "への不正な変換です。戻り値は " + RegExp.$4 + " 型ですが、" + RegExp.$3 + " 型の値を返そうとしています";
        });
        rules["incompatible (\\w+) to (\\w+) conversion passing ('.*?') to parameter of type ('.*?')"] = (function () {
            return wordtable[RegExp.$1] + "から" + wordtable[RegExp.$2] + "への不正な変換です。引数は " + RegExp.$4 + " 型ですが、" + RegExp.$3 + " 型の値を渡そうとしています";
        });
        rules["incompatible (\\w+) to (\\w+) conversion assigning to ('.*?') from ('.*?')"] = (function () {
            return wordtable[RegExp.$1] + "から" + wordtable[RegExp.$2] + "への不正な変換です。 " + RegExp.$3 + " 型の変数に" + RegExp.$4 + " 型の値を代入しています";
        });
        rules["data argument not used by format string"] = (function () {
            return "使われていない引数があります (フォーマット文字列を確認してください)";
        });
        rules["more '%' conversions than data arguments"] = (function () {
            return "指定されたフォーマット文字列に対して引数が足りません (フォーマット文字列を確認してください)";
        });
        rules["control reaches end of non-void function"] = (function () {
            return "戻り値を返さないまま関数が終了しています (return文を書くか、戻り値の型をvoidに変更してください)";
        });
        rules["control may reaches end of non-void function"] = (function () {
            return "戻り値を返さないまま関数が終了する可能性があります (すべての分岐で値を返していることを確認してください)";
        });
        rules["variable ('.*?') is uninitialized when used here"] = (function () {
            return "初期化されていない変数 " + RegExp.$1 + " が参照されました (変数は、参照する前に必ず初期値を代入しましょう)";
        });
        rules["excess elements in array initializer"] = (function () {
            return "配列初期化子の要素が配列のサイズに対して多すぎます";
        });

        rules['expected "FILENAME" or <FILENAME>'] = (function () {
            return 'インクルードファイル名は "ファイル名" または <ファイル名> と書く必要があります';
        });
        rules["('.*?') file not found"] = (function () {
            return "インクルードファイル " + RegExp.$1 + " が見つかりません。ファイル名が間違っているか、対応していないライブラリです (コンパイルは中断されました)";
        });
        rules["void function ('.*?') should not return a value"] = (function () {
            return "関数 " + RegExp.$1 + " の戻り値はvoid型なので、値を返すことはできません。単にreturn;と書くか、戻り値の型を修正してください";
        });
        rules["non-void function ('.*?') should return a value"] = (function () {
            return "関数 " + RegExp.$1 + " の戻り値はvoidではないため、値を返す必要があります。return文を書くか、戻り値の型をvoidに修正してください";
        });
        rules["too many arguments to function call, expected (\\d+), have (\\d+)"] = (function () {
            return RegExp.$1 + "引数の関数に" + RegExp.$2 + "個の引数を渡しています (引数が多すぎます)";
        });
        rules["too many arguments to function call, single argument ('.*?'), have (\\d+) arguments"] = (function () {
            return "1引数の関数に" + RegExp.$2 + "個の引数を渡しています (引数が多すぎます)";
        });
        rules["too few arguments to function call, expected (\\d+), have 0"] = (function () {
            return RegExp.$1 + "引数の関数に引数を渡していません (引数が少なすぎます)";
        });
        rules["too few arguments to function call, expected (\\d+), have (\\d+)"] = (function () {
            return RegExp.$1 + "引数の関数に" + RegExp.$2 + "個の引数を渡しています (引数が少なすぎます)";
        });
        rules["passing ('.*?') to parameter of incompatible type ('.*?')"] = (function () {
            return RegExp.$2 + " 型の引数に対し、変換できない " + RegExp.$2 + " 型の値を渡すことはできません";
        });
        rules["use of undeclared identifier ('.*?')"] = (function () {
            return "変数 " + RegExp.$1 + " は宣言されていません。変数を使用するにはあらかじめ宣言を記述する必要があります";
        });
        rules["expression is not assignable"] = (function () {
            return "この式には代入できません";
        });
        rules["called object type ('.*?') is not a function or function pointer"] = (function () {
            return "呼び出しを試みた型" + RegExp.$1 + "は関数ではありません";
        });
        rules["non-object type ('.*?') is not assignable"] = (function () {
            return RegExp.$1 + "型には代入できません";
        });
        rules["array type ('.*?') is not assignable"] = (function () {
            return "配列には代入できません (配列の要素に代入するには添字を付けてください)";
        });
        rules["invalid operands to binary expression \\(('.*?') and ('.*?')\\)"] = (function () {
            return "不正な二項演算です (" + RegExp.$1 + "型と" + RegExp.$2 + "型の間に演算が定義されていません)";
        });
        rules["invalid suffix ('.*?') on integer constant"] = (function () {
            return "整数定数に対する不正な接尾辞です";
        });
        rules["unknown type name 'include'"] = (function () {
            return "未知の型名 'include' です (#include の間違いではありませんか？)";
        });
        rules["unknown type name ('.*?')"] = (function () {
            return "未知の型名 " + RegExp.$1 + "　です";
        });
        rules["redefinition of ('.*?').*"] = (function () {
            return RegExp.$1 + " はすでに定義されています";
        });
        rules["expected ';'.*"] = (function () {
            return "セミコロン ; が必要です";
        });
        rules["expected '}'"] = (function () {
            return "中括弧 } が閉じていません";
        });
        rules["extraneous closing brace.*"] = (function () {
            return "閉じ中括弧 } が多すぎます";
        });
        rules["expected '\\)'"] = (function () {
            return "括弧 ) が閉じていません";
        });
        rules["extraneous '\\)'.*"] = (function () {
            return "閉じ括弧 ) が多すぎます";
        });
        rules["expected expression"] = (function () {
            return "条件式が必要です";
        });
        rules["expected parameter declarator"] = (function () {
            return "引数の宣言が必要です";
        });
        rules["expected 'while'.*"] = (function () {
            return "do-while文は while(...); で終わる必要があります";
        });
        rules["expected identifier or ('.*?')"] = (function () {
            return "関数名、変数名、または " + RegExp.$1 + " が必要です";
        });
        rules["expected function body after function declarator"] = (function () {
            return "関数の本体が必要です";
        });
        rules["expected ('.*?') after ('.*?')"] = (function () {
            return RegExp.$1 + " の後に " + RegExp.$2 + " が必要です";
        });
        rules["must use '(.*?)' tag to refer to type ('.*?')"] = (function () {
            return wordtable[RegExp.$1] + "名の前に 'struct' が必要です";
        });
        rules["'(.*?)' declared as an array with a negative size"] = (function () {
            return "負のサイズの配列は宣言できません";
        });

        rules["to match this '{'"] = (function () {
            return "ブロックは以下の位置で開始しています";
        });
        rules["to match this '\\('"] = (function () {
            return "括弧は以下の位置で開いています";
        });
        rules["('.*?') declared here"] = (function () {
            return RegExp.$1 + " の宣言は以下の通りです：";
        });
        rules["passing argument to parameter ('.*?') here"] = (function () {
            return "引数 " + RegExp.$1 + " の宣言は以下の通りです：";
        });
        rules["please include the header (<.*?>) or explicitly provide a declaration for ('.*?')"] = (function () {
            return RegExp.$2 + " を使用するには #include " + RegExp.$1 + " と記述してください";
        });
        rules["put the semicolon on a separate line to silence this warning"] = (function () {
            return "警告を消すには行末にセミコロンを書いてください";
        });
        rules["previous definition is here"] = (function () {
            return "最初の定義は以下の通りです";
        });
        rules["use '==' to turn this assignment into an equality comparison"] = (function () {
            return "値の比較には比較演算子 '==' を使用します";
        });
        rules["use '=' to turn this equality comparison into an assignment"] = (function () {
            return "代入には代入演算子 '=' を使用します";
        });
        rules["place parentheses around the assignment to silence this warning"] = (function () {
            return "間違いでない場合は、警告を消すために代入演算を()で囲んでください";
        });
        rules["initialize the variable ('.*?') to silence this warning"] = (function () {
            return "警告を消すためには " + RegExp.$1 + " に初期値を代入してください";
        });
        rules["('.*?') is a builtin with type ('.*?')"] = (function () {
            return RegExp.$1 + " は組み込み関数です";
        });
        rules["uninitialized use occurs here"] = (function () {
            "ここで未初期化のまま参照されています";
        });
        rules["remove the 'if' if its condition is always false"] = (function () {
            "本当に常に真でよい場合、if文は不要です";
        });

        for (var rule in rules) {
            try  {
                if (text.match(new RegExp(rule))) {
                    return (RegExp).leftContext + rules[rule]() + (RegExp).rightContext;
                }
            } catch (e) {
                console.log(e);
                console.log(rule);
            }
        }
        return text;
    }

    function ConvertTerminalColor(text) {
        return text.replace(/\[31m(.*)\[0m/g, '<span class="text-danger">$1</span>');
    }

    function ReplaceNewLine(text) {
        return text.replace(/[\r\n|\r|\n]/g, "<br>\n");
    }

    function FormatMessage(text, filename) {
        text = text.replace(/ERROR.*$/gm, "").replace(/</gm, "&lt;").replace(/>/gm, "&gt;");

        var textlines = text.split(/[\r\n|\r|\n]/g);
        for (var i = 0; i < textlines.length; ++i) {
            if (textlines[i].lastIndexOf(filename, 0) == 0) {
                textlines[i] = textlines[i].replace(/ \[.*\]/gm, "");
                if (Aspen.Language == "ja") {
                    textlines[i] = TranslateMessageToJapanese(textlines[i]);
                }
                if (textlines[i + 1].lastIndexOf(filename, 0) != 0) {
                    var code = textlines[i + 1];
                    var indicator = textlines[i + 2];
                    var begin = indicator.indexOf("~");
                    var end = indicator.lastIndexOf("~") + 1;
                    var replacee = code.substring(begin, end);
                    var code = replacee.length > 0 ? code.replace(replacee, "<u>" + replacee + "</u>") : code;
                    var consumedLines = 1;
                    textlines[i + 1] = "<code>" + code.replace(/ /gm, "&nbsp;") + "</code>";
                    if (textlines[i + 2].lastIndexOf(filename, 0) != 0) {
                        textlines[i + 2] = "<samp>" + indicator.replace(/~/g, " ").replace(/ /gm, "&nbsp;").replace(/\^/, "<span class='glyphicon glyphicon-arrow-up'></span>") + "</samp>";
                        consumedLines++;
                    }
                    if (textlines[i + 3].lastIndexOf(filename, 0) != 0) {
                        textlines[i + 3] = "<samp>" + textlines[i + 3].replace(/ /gm, "&nbsp;") + "</samp>";
                        consumedLines++;
                    }
                    i += consumedLines;
                }
            }
        }

        return textlines.join("<br>\n").replace(/(\d+).\d+: (note):(.*)$/gm, " <b>line $1</b>: <span class='label label-info'>$2</span> <span class='text-info'>$3</span>").replace(/(\d+).\d+: (warning):(.*)$/gm, " <b>line $1</b>: <span class='label label-warning'>$2</span> <span class='text-warning'>$3</span>").replace(/(\d+).\d+: (error):(.*)$/gm, " <b>line $1</b>: <span class='label label-danger'>$2</span> <span class='text-danger'>$3</span>").replace(/(\d+).\d+: (fatal error):(.*)$/gm, " <b>line $1</b>: <span class='label label-danger'>$2</span> <span class='text-danger'>$3</span>");
    }

    function FormatFilename(text, fileName) {
        return text.replace(/\/.*\.c/g, fileName + ".c").replace(/\/.*\/(.*\.h)/g, "$1");
    }

    function FormatClangErrorMessage(text, fileName) {
        return FormatMessage(FormatFilename(ConvertTerminalColor(text), fileName), fileName);
    }
    C2JS.FormatClangErrorMessage = FormatClangErrorMessage;

    function CheckFileName(name, DB) {
        var filename = name;
        if (filename == null) {
            return null;
        }

        if (filename == "") {
            filename = "file" + new Date().toJSON().replace(/\/|:|\./g, "-").replace(/20..-/, "").replace(/..-..T/, "").replace(/Z/g, "").replace(/-/g, "");
        }

        if (filename.match(/[\s\t\\/:\*\?\"\<\>\|]+/)) {
            alert("This file name is incorrect.");
            return null;
        }

        if (filename.match(/.*\.c/) == null) {
            filename += '.c';
        }
        if (DB.Exist(filename)) {
            alert("'" + filename + "' already exists.");
            return null;
        }
        return filename;
    }
    C2JS.CheckFileName = CheckFileName;

    function ConfirmAllRemove() {
        return confirm('All items will be delete immediately. Are you sure you want to continue?');
    }
    C2JS.ConfirmAllRemove = ConfirmAllRemove;

    function ConfirmToRemove(BaseName) {
        return confirm('The item "' + BaseName + '.c" will be delete immediately. Are you sure you want to continue?');
    }
    C2JS.ConfirmToRemove = ConfirmToRemove;
})(C2JS || (C2JS = {}));

var Aspen = {};

$(function () {
    var Editor = new C2JS.Editor($("#editor"));
    var Output = new C2JS.Output($("#output"));
    var DB = new C2JS.SourceDB();
    var Context = {};
    var Files = new C2JS.FileCollection();

    Aspen.Editor = Editor;
    Aspen.Output = Output;
    Aspen.Source = DB;
    Aspen.Context = Context;
    Aspen.Files = Files;
    Aspen.Language = "en";
    Aspen.Debug = {};
    Aspen.Debug.DeleteAllKey = function () {
        while (localStorage.length > 1) {
            localStorage.removeItem(localStorage.key(0));
        }
    };
    Aspen.Debug.OutputClangMessage = function (message, filename) {
        Output.PrintLn('DEBUG');
        Output.PrintLn(C2JS.FormatClangErrorMessage(message, filename));
    };
    Aspen.Debug.PrintC = function (message) {
        Output.PrintFromC(message);
    };

    var changeFlag = true;
    Editor.OnChange(function (e) {
        if (!Files.Empty()) {
            changeFlag = true;
            DB.Save(Files.GetCurrent().GetName(), Editor.GetValue());
        }
    });

    var running = false;

    var DisableUI = function () {
        $(".disabled-on-running").addClass("disabled");
        Editor.Disable();
        running = true;
    };

    var EnableUI = function () {
        $(".disabled-on-running").removeClass("disabled");
        Editor.Enable();
        running = false;
    };

    var ChangeCurrentFile = function (e) {
        if (running)
            return;
        Files.SetCurrent((e.target).id);
        Editor.SetValue(DB.Load(Files.GetCurrent().GetName()));
        Editor.ClearHistory();
    };

    Files.Show(ChangeCurrentFile);
    Output.Prompt();

    Aspen.Debug.SetRunning = function (flag) {
        if (flag) {
            DisableUI();
        } else {
            EnableUI();
        }
    };

    var FindErrorNumbersInErrorMessage = function (message) {
        var errorLineNumbers = [];
        jQuery.each(message.split(".c"), (function (k, v) {
            var match = v.match(/:(\d+):\d+:\s+error/);
            if (match && match[1]) {
                errorLineNumbers.push(match[1]);
            }
        }));
        return errorLineNumbers;
    };

    var CompileCallback = function (e) {
        if (Files.Empty() || running)
            return;
        if (Editor.ContainsMultiByteSpace()) {
            if (confirm('ソースコード中に全角スペースが含まれています。半角スペースに置換しますか？\n(C言語では全角スペースを使えません)')) {
                Editor.ReplaceMultiByteSpace();
            }
        }
        var src = Editor.GetValue();
        var file = Files.GetCurrent();
        var opt = '-m';
        Output.Clear();
        Output.Prompt();
        Output.PrintLn('gcc ' + file.GetName() + ' -o ' + file.GetBaseName());
        DisableUI();
        Editor.RemoveAllErrorLine();

        C2JS.Compile(src, opt, file.GetName(), changeFlag, Context, function (res) {
            try  {
                changeFlag = false;
                if (res == null) {
                    Output.PrintErrorLn('Sorry, the server is something wrong.');
                    return;
                }
                if (res.error.length > 0) {
                    Output.PrintLn(C2JS.FormatClangErrorMessage(res.error, file.GetBaseName()));
                    Editor.SetErrorLines(FindErrorNumbersInErrorMessage(res.error));
                }
                Output.Prompt();

                Context.error = res.error;
                if (!res.error.match("error:")) {
                    Output.PrintLn('./' + file.GetBaseName());
                    C2JS.Run(res.source, Context, Output);
                } else {
                    Context.source = null;
                }
            } finally {
                EnableUI();
            }
        }, function () {
            Output.PrintErrorLn('Sorry, the server is something wrong.');
            EnableUI();
        });
    };

    $("#compile").click(CompileCallback);
    ($("#compile")).tooltip({ placement: "bottom", html: true });

    var SaveFunction = function (e) {
        if (Files.Empty())
            return;
        var blob = new Blob([Editor.GetValue()], { type: 'text/plain; charset=UTF-8' });
        saveAs(blob, Files.GetCurrent().GetName());
    };
    $("#save-file-menu").click(SaveFunction);

    $("#open-file-menu").click(function (e) {
        $("#file-open-dialog").click();
    });

    var endsWith = function (str, suffix) {
        return str.indexOf(suffix, str.length - suffix.length) !== -1;
    };

    $("#file-open-dialog").change(function (e) {
        var file = this.files[0];
        if (file) {
            if (!endsWith(file.name, ".c")) {
                alert("Unsupported file type.\nplease select '*.c' file.");
                return;
            }
            var reader = new FileReader();
            reader.onerror = function (e) {
                alert(e);
            };
            reader.onload = function (e) {
                DB.Save(Files.GetCurrent().GetName(), Editor.GetValue());
                var fileModel = new C2JS.FileModel(Files.MakeUniqueName(file.name));
                Files.Append(fileModel, ChangeCurrentFile);
                Files.SetCurrent(fileModel.GetBaseName());
                Editor.SetValue((e.target).result);
                DB.Save(Files.GetCurrent().GetName(), Editor.GetValue());
                Editor.ClearHistory();
            };
            reader.readAsText(file, 'utf-8');
        }
    });

    var OnFilesBecomeEmpty = function () {
        $("#delete-file").hide();
        $(".disabled-on-files-empty").addClass("disabled");
        Editor.Clear();
        Editor.Disable();
    };
    var OnFilesBecomeNotEmpty = function () {
        $("#delete-file").show();
        $(".disabled-on-files-empty").removeClass("disabled");
        Editor.Enable();
    };

    var CreateFileFunction = function (e) {
        if (running)
            return;
        var filename = prompt("Please enter the file name.", C2JS.CheckFileName("", DB));
        filename = C2JS.CheckFileName(filename, DB);
        if (filename == null) {
            return;
        }

        var file = new C2JS.FileModel(filename);
        Files.Append(file, ChangeCurrentFile);
        Files.SetCurrent(file.GetBaseName());
        OnFilesBecomeNotEmpty();
        Editor.ResetHelloWorld();
        Editor.ClearHistory();
    };
    ($("#create-file")).tooltip({ placement: "bottom", html: true });
    $("#create-file").click(CreateFileFunction);
    $("#create-file-menu").click(CreateFileFunction);

    var RenameFunction = function (e) {
        if (Files.Empty() || running)
            return;
        DB.Save(Files.GetCurrent().GetName(), Editor.GetValue());
        var oldfilebasename = Files.GetCurrent().GetBaseName();
        var oldfilecontents = Editor.GetValue();

        var filename = prompt("Rename: Please enter the file name.", oldfilebasename + ".c");
        filename = C2JS.CheckFileName(filename, DB);
        if (filename == null) {
            return;
        }
        Files.Rename(oldfilebasename, filename, oldfilecontents, ChangeCurrentFile, DB);
        Editor.SetValue(oldfilecontents);
        DB.Save(Files.GetCurrent().GetName(), Editor.GetValue());
    };
    $("#rename-menu").click(RenameFunction);

    var DeleteFileFunction = function (e) {
        if (Files.Empty() || running)
            return;
        var BaseName = Files.GetCurrent().GetBaseName();
        if (C2JS.ConfirmToRemove(BaseName)) {
            Files.Remove(BaseName);
            if (Files.Empty()) {
                OnFilesBecomeEmpty();
            } else {
                Editor.SetValue(DB.Load(Files.GetCurrent().GetName()));
            }
        }
    };

    ($("#delete-file")).tooltip({ placement: "bottom", html: true });
    $("#delete-file").click(DeleteFileFunction);
    $("#delete-file-menu").click(DeleteFileFunction);

    var DeleteAllFilesFunction = function (e) {
        if (Files.Empty() || running)
            return;
        var BaseName = Files.GetCurrent().GetBaseName();
        if (C2JS.ConfirmAllRemove()) {
            Files.Clear();
        }
        OnFilesBecomeEmpty();
    };
    $("#delete-all-file-menu").click(DeleteAllFilesFunction);

    var JpModeCheckFunction = (function (e) {
        Aspen.Language = this.checked ? "ja" : "en";
    });
    $("#JpModeCheck").click(JpModeCheckFunction);

    document.onkeydown = function (ev) {
        if (ev.ctrlKey) {
            switch (ev.keyCode) {
                case 13:
                    ev.preventDefault();
                    ev.stopPropagation();
                    CompileCallback(ev);
                    return;
            }
        }
    };

    $(window).on("beforeunload", function (e) {
        DB.Save(Files.GetCurrent().GetName(), Editor.GetValue());
    });

    if (DB.Exist(Files.GetCurrent().GetName())) {
        Editor.SetValue(DB.Load(Files.GetCurrent().GetName()));
    }

    if (_ua.Trident && _ua.ltIE9) {
        $("#NotSupportedBrouserAlert").show();
        DisableUI();
    }
});
