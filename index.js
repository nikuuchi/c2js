var C2JS;
(function (C2JS) {
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
            this.SetValue("#include <stdio.h>\n\nint main() {\n    printf(\"hello, world!\\n\");\n    return 0;\n}");
        };
        return Editor;
    })();
    C2JS.Editor = Editor;

    var Output = (function () {
        function Output($output) {
            this.$output = $output;
        }
        Output.prototype.PrintLn = function (val) {
            this.$output.append(val + '<br>');
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

    var FileName = (function () {
        function FileName() {
            this.defaultNameKey = 'filename:defaultNameKey';
            var name = localStorage.getItem(this.defaultNameKey) || "program.c";
            this.SetName(name);
        }
        FileName.prototype.Show = function () {
            $("#file-name").val(this.name);
        };

        FileName.prototype.SetName = function (text) {
            this.name = text.replace(/\..*/, ".c");
            localStorage.setItem(this.defaultNameKey, this.name);
            document.title = "Aspen - " + this.name;
            $("#file-name").val(this.name);
        };

        FileName.prototype.GetName = function () {
            return this.name;
        };

        FileName.prototype.GetBaseName = function () {
            return this.name.replace(/\..*/, "");
        };
        return FileName;
    })();
    C2JS.FileName = FileName;

    var SourceDB = (function () {
        function SourceDB() {
        }
        SourceDB.prototype.Save = function (fileName, source) {
            localStorage.setItem(fileName, source);
        };

        SourceDB.prototype.Load = function (fileName) {
            return localStorage.getItem(fileName);
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
            callback(Context);
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
            out.PrintLn(e);
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
        return OutputColor(RenameFile(ReplaceNewLine(TerminalColor(text)), fileName));
    }
    C2JS.CreateOutputView = CreateOutputView;
})(C2JS || (C2JS = {}));

var Aspen = {};

$(function () {
    var Editor = new C2JS.Editor($("#editor"));
    var Output = new C2JS.Output($("#output"));
    var DB = new C2JS.SourceDB();
    var Context = {};
    var Name = new C2JS.FileName();

    Aspen.Editor = Editor;
    Aspen.Output = Output;
    Aspen.Source = DB;
    Aspen.Context = Context;
    Aspen.FileName = Name;

    var changeFlag = true;
    Editor.OnChange(function (e) {
        changeFlag = true;
        DB.Save(Name.GetName(), Editor.GetValue());
    });

    Name.Show();

    Output.Prompt();

    var DisableUI = function () {
        $("#file-name").attr("disabled", "disabled");
        $("#open").addClass("disabled");
        $("#save").addClass("disabled");
        $("#compile").addClass("disabled");
        Editor.Disable();
    };

    var EnableUI = function () {
        $("#file-name").removeAttr("disabled");
        $("#open").removeClass("disabled");
        $("#save").removeClass("disabled");
        $("#compile").removeClass("disabled");
        Editor.Enable();
    };

    $("#compile").click(function (e) {
        var src = Editor.GetValue();
        var opt = '-m';
        Output.Clear();
        Output.Prompt();
        Output.PrintLn('gcc ' + Name.GetName() + ' -o ' + Name.GetBaseName());
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
                    Output.PrintLn(C2JS.CreateOutputView(res.error, Name.GetBaseName()));
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
                    Output.PrintLn('./' + Name.GetBaseName());
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
        saveAs(blob, Name.GetName());
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
                Name.SetName(file.name);
                Name.Show();
                Editor.SetValue((e.target).result);
            };
            reader.readAsText(file, 'utf-8');
        }
    });

    $("#file-name").change(function (e) {
        Name.SetName(this.value);
    });

    $("#reset").click(function (e) {
        if (confirm("Your changes will be lost. ")) {
            Editor.ResetHelloWorld();
        }
    });

    $(window).on("beforeunload", function (e) {
        DB.Save(Name.GetName(), Editor.GetValue());
    });

    if (DB.Exist(Name.GetName())) {
        Editor.SetValue(DB.Load(Name.GetName()));
    }
});
