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

        Output.prototype.PrintLn = function (val) {
            this.$output.append(val + '\n');
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

        FileCollection.prototype.Remove = function (BaseName, Callback) {
            if (!confirm('The item "' + BaseName + '.c" will be delete immediately. Are you sure you want to continue?')) {
                return;
            }
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
                localStorage.setItem(this.ActiveFileName, GetHelloWorldSource());
                this.Append(file, Callback);
                this.AddActiveClass();
            }
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

    function Compile(source, option, isCached, Context, callback, onerror) {
        if (isCached) {
            $.ajax({
                type: "POST",
                url: "cgi-bin/compile.cgi",
                data: JSON.stringify({ source: source, option: option }),
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
                out.PrintLn(x);
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

    function TerminalColor(text) {
        return text.replace(/\[31m(.*)\[0m/g, '<span class="text-danger">$1</span>');
    }

    function ReplaceNewLine(text) {
        return text.replace(/\n/g, "<br>\n");
    }

    function OutputColor(text) {
        return text.replace(/(note:.*)$/gm, "<span class='text-info'>$1</span>").replace(/(warning:.*)$/gm, "<span class='text-warning'>$1</span>").replace(/(error:.*)$/gm, "<span class='text-danger'>$1</span>");
    }

    function RenameFile(text, fileName) {
        return text.replace(/\/.*\.c/g, fileName + ".c").replace(/\/.*\/(.*\.h)/g, "$1");
    }

    function CreateOutputView(text, fileName) {
        return OutputColor(RenameFile(TerminalColor(text), fileName));
    }
    C2JS.CreateOutputView = CreateOutputView;
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

    var changeFlag = true;
    Editor.OnChange(function (e) {
        changeFlag = true;
        DB.Save(Files.GetCurrent().GetName(), Editor.GetValue());
    });

    var ChangeCurrentFile = function (e) {
        Files.SetCurrent((e.target).id);
        Editor.SetValue(DB.Load(Files.GetCurrent().GetName()));
        //console.log(e);
    };

    Files.Show(ChangeCurrentFile);

    Output.Prompt();

    var DisableUI = function () {
        //$("#file-name").attr("disabled", "disabled"); //FIXME tab disable
        $("#open").addClass("disabled");
        $("#save").addClass("disabled");
        $("#compile").addClass("disabled");
        Editor.Disable();
    };

    var EnableUI = function () {
        //$("#file-name").removeAttr("disabled"); //FIXME tab enable
        $("#open").removeClass("disabled");
        $("#save").removeClass("disabled");
        $("#compile").removeClass("disabled");
        Editor.Enable();
    };

    $("#compile").click(function (e) {
        var src = Editor.GetValue();
        var file = Files.GetCurrent();
        var opt = '-m';
        Output.Clear();
        Output.Prompt();
        Output.PrintLn('gcc ' + file.GetName() + ' -o ' + file.GetBaseName());
        DisableUI();
        Editor.RemoveAllErrorLine();

        C2JS.Compile(src, opt, changeFlag, Context, function (res) {
            try  {
                changeFlag = false;
                if (res == null) {
                    Output.PrintErrorLn('Sorry, the server is something wrong.');
                    return;
                }
                if (res.error.length > 0) {
                    Output.PrintLn(C2JS.CreateOutputView(res.error, file.GetBaseName()));
                    var errorLineNumbers = [];
                    jQuery.each(res.error.split(".c"), (function (k, v) {
                        var match = v.match(/:(\d+):\d+:\s+error/);
                        if (match && match[1]) {
                            errorLineNumbers.push(match[1]);
                        }
                    }));
                    Editor.SetErrorLines(errorLineNumbers);
                    if (Editor.GetValue().match(/　/)) {
                        if (confirm('ソースコード中に全角スペースが入っています。半角スペースに置換しますか？')) {
                            var value = Editor.GetValue().replace(/　/g, "  ");
                            Editor.SetValue(value);
                        }
                    }
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
    });

    $("#save").click(function (e) {
        var blob = new Blob([Editor.GetValue()], { type: 'text/plain; charset=UTF-8' });
        saveAs(blob, Files.GetCurrent().GetName());
    });

    $("#open").click(function (e) {
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
                var fileModel = new C2JS.FileModel(file.name);
                Files.Append(fileModel, ChangeCurrentFile);
                Editor.SetValue((e.target).result);
                Files.SetCurrent(fileModel.GetBaseName());
                DB.Save(Files.GetCurrent().GetName(), Editor.GetValue());
            };
            reader.readAsText(file, 'utf-8');
        }
    });

    $("#create-file").click(function (e) {
        var filename = prompt("Please enter the file name.");
        if (filename == null) {
            return;
        }

        if (filename == "" || filename.match(/[\s\t]+/)) {
            alert("This file name is incorrect.");
            return;
        }

        if (filename.match(/.*\.c/) == null) {
            filename += '.c';
        }
        if (DB.Exist(filename)) {
            alert("'" + filename + "' already exists.");
            return;
        }
        var file = new C2JS.FileModel(filename);
        Files.Append(file, ChangeCurrentFile);
        Files.SetCurrent(file.GetBaseName());
        Editor.ResetHelloWorld();
    });

    $("#delete-file").click(function (e) {
        Files.Remove(Files.GetCurrent().GetBaseName(), ChangeCurrentFile);
        Editor.SetValue(DB.Load(Files.GetCurrent().GetName()));
    });

    $(window).on("beforeunload", function (e) {
        DB.Save(Files.GetCurrent().GetName(), Editor.GetValue());
    });

    if (DB.Exist(Files.GetCurrent().GetName())) {
        Editor.SetValue(DB.Load(Files.GetCurrent().GetName()));
    }
});
