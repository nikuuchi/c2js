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
            $($("#" + this.GetCurrent().GetBaseName()).parent().get(0)).removeClass('active');
        };

        FileCollection.prototype.AddActiveClass = function () {
            $($("#" + this.GetCurrent().GetBaseName()).parent().get(0)).addClass('active');
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
            $($("#" + this.GetCurrent().GetBaseName()).parent().get(0)).addClass('active');
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
            this.Remove(oldBaseName, Callback);
            var file = new FileModel(newname);
            this.Append(file, Callback);
            this.SetCurrent(file.GetBaseName());
            DB.Save(file.GetName(), contents);
        };

        FileCollection.prototype.IsRemove = function (BaseName) {
            return confirm('The item "' + BaseName + '.c" will be delete immediately. Are you sure you want to continue?');
        };

        FileCollection.prototype.Remove = function (BaseName, Callback) {
            var i = this.GetIndexOf(BaseName);
            i--;
            if (i < 0) {
                i = 0;
            }
            if (this.FileModels.length > 1) {
                this.SetCurrent(this.FileModels[i].GetBaseName());
                this.RemoveByBaseName(BaseName);
                this.AddActiveClass();
            } else if (this.FileModels.length == 1) {
                this.SetCurrent(this.FileModels[0].GetBaseName());
                this.RemoveByBaseName(BaseName);

                this.ActiveFileName = 'program.c';
                var file = new FileModel(this.ActiveFileName);
                this.ActiveFileIndex = 0;
                localStorage.setItem(this.defaultNameKey, this.ActiveFileName);
                localStorage.setItem(this.ActiveFileName, "");
                this.Append(file, Callback);
                this.AddActiveClass();
            }
        };

        FileCollection.prototype.GetLength = function () {
            return this.FileModels.length;
        };

        FileCollection.prototype.RenameExistName = function (Name) {
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
                var code = textlines[i + 1];
                var indicator = textlines[i + 2];
                var begin = indicator.indexOf("~");
                var end = indicator.lastIndexOf("~") + 1;
                var replacee = code.substring(begin, end);
                var code = replacee.length > 0 ? code.replace(replacee, "<strong>" + replacee + "</strong>") : code;
                textlines[i + 1] = "<code>" + code.replace(/ /gm, "&nbsp;") + "</code>";
                textlines[i + 2] = "<samp>" + indicator.replace("~", " ").replace(/ /gm, "&nbsp;").replace(/\^/, "<span class='glyphicon glyphicon-arrow-up'></span>") + "</samp>";
                if (textlines[i + 3].lastIndexOf(filename, 0) != 0) {
                    textlines[i + 3] = "<samp>" + textlines[i + 3].replace(/ /gm, "&nbsp;") + "</samp>";
                }
                i += 2;
            }
        }

        return textlines.join("<br>\n").replace(/(\d+:\d+): (note):(.*)$/gm, "<b>$1</b>: <span class='label label-info'>$2</span> <span class='text-info'>$3</span>").replace(/(\d+:\d+): (warning):(.*)$/gm, "<b>$1</b>: <span class='label label-warning'>$2</span> <span class='text-warning'>$3</span>").replace(/(\d+:\d+): (error):(.*)$/gm, "<b>$1</b>: <span class='label label-danger'>$2</span> <span class='text-danger'>$3</span>");
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
        changeFlag = true;
        DB.Save(Files.GetCurrent().GetName(), Editor.GetValue());
    });

    var ChangeCurrentFile = function (e) {
        Files.SetCurrent((e.target).id);
        Editor.SetValue(DB.Load(Files.GetCurrent().GetName()));
        Editor.ClearHistory();
    };

    Files.Show(ChangeCurrentFile);

    Output.Prompt();

    var DisableUI = function () {
        //$("#file-name").attr("disabled", "disabled"); //FIXME tab disable
        $("#open-file-menu").addClass("disabled");
        $("#save-file-menu").addClass("disabled");
        $("#compile").addClass("disabled");
        Editor.Disable();
    };

    var EnableUI = function () {
        //$("#file-name").removeAttr("disabled"); //FIXME tab enable
        $("#open-file-menu").removeClass("disabled");
        $("#save-file-menu").removeClass("disabled");
        $("#compile").removeClass("disabled");
        Editor.Enable();
    };

    var CompileCallback = function (e) {
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
        try  {
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
                        var errorLineNumbers = [];
                        jQuery.each(res.error.split(".c"), (function (k, v) {
                            var match = v.match(/:(\d+):\d+:\s+error/);
                            if (match && match[1]) {
                                errorLineNumbers.push(match[1]);
                            }
                        }));
                        Editor.SetErrorLines(errorLineNumbers);
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
        } finally {
            EnableUI();
        }
    };

    $("#compile").click(CompileCallback);
    ($("#compile")).tooltip({ placement: "bottom", html: true });
    document.onkeydown = function (ev) {
        if (ev.keyCode == 13 && ev.ctrlKey) {
            CompileCallback(ev);
            return false;
        }
    };

    $("#save-file-menu").click(function (e) {
        var blob = new Blob([Editor.GetValue()], { type: 'text/plain; charset=UTF-8' });
        saveAs(blob, Files.GetCurrent().GetName());
    });

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
                var fileModel = new C2JS.FileModel(Files.RenameExistName(file.name));
                Files.Append(fileModel, ChangeCurrentFile);
                Files.SetCurrent(fileModel.GetBaseName());
                Editor.SetValue((e.target).result);
                DB.Save(Files.GetCurrent().GetName(), Editor.GetValue());
                Editor.ClearHistory();
            };
            reader.readAsText(file, 'utf-8');
        }
    });

    var CreateFileFunction = function (e) {
        var filename = prompt("Please enter the file name.", C2JS.CheckFileName("", DB));
        filename = C2JS.CheckFileName(filename, DB);
        if (filename == null) {
            return;
        }

        var file = new C2JS.FileModel(filename);
        Files.Append(file, ChangeCurrentFile);
        Files.SetCurrent(file.GetBaseName());
        Editor.ResetHelloWorld();
        Editor.ClearHistory();
    };
    ($("#create-file")).tooltip({ placement: "bottom", html: true });
    $("#create-file").click(CreateFileFunction);
    $("#create-file-menu").click(CreateFileFunction);

    var RenameFunction = function (e) {
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
        var BaseName = Files.GetCurrent().GetBaseName();
        if (Files.IsRemove(BaseName)) {
            Files.Remove(BaseName, ChangeCurrentFile);
        }
        Editor.SetValue(DB.Load(Files.GetCurrent().GetName()));
    };
    ($("#delete-file")).tooltip({ placement: "bottom", html: true });
    $("#delete-file").click(DeleteFileFunction);
    $("#delete-file-menu").click(DeleteFileFunction);

    var DeleteAllFilesFunction = function (e) {
        var BaseName = Files.GetCurrent().GetBaseName();
        if (C2JS.ConfirmAllRemove()) {
            while (Files.GetLength() > 1) {
                Files.Remove(BaseName, ChangeCurrentFile);
                BaseName = Files.GetCurrent().GetBaseName();
            }
            Files.Remove(BaseName, ChangeCurrentFile);
        }
        Editor.SetValue(DB.Load(Files.GetCurrent().GetName()));
    };
    $("#delete-all-file-menu").click(DeleteAllFilesFunction);

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
