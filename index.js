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
            this.size = new Size($editor.width(), $editor.height());
            this.editor = CodeMirror.fromTextArea($editor[0], {
                lineNumbers: true,
                indentUnit: 4,
                mode: "text/x-csrc"
            });
            this.SetValue("#include <stdio.h>\n\nint main(int argc, char* argv[]) {\n    printf(\"hello, world!\\n\");\n    return 0;\n}");
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

        Output.prototype.Prompt = function () {
            this.$output.append('$ ');
        };

        Output.prototype.Clear = function () {
            this.$output.text('');
        };
        return Output;
    })();
    C2JS.Output = Output;

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

    function Compile(source, option, flag, Context, callback) {
        if (flag) {
            $.ajax({
                type: "POST",
                url: "cgi-bin/compile.cgi",
                data: JSON.stringify({ source: source, option: option }),
                dataType: 'json',
                contentType: "application/json; charset=utf-8",
                success: callback,
                error: function () {
                    alert("error");
                }
            });
        } else {
            callback(Context);
        }
    }
    C2JS.Compile = Compile;

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

$(function () {
    var Editor = new C2JS.Editor($("#editor"));
    var Output = new C2JS.Output($("#output"));
    var DB = new C2JS.SourceDB();

    var Context = {};

    var fileName = "Program";

    var changeFlag = true;
    Editor.OnChange(function (e) {
        changeFlag = true;
        DB.Save(fileName, Editor.GetValue());
    });

    $("#file-name").text(fileName + ".c");

    Output.Prompt();

    $("#clear").click(function (e) {
        Output.Clear();
        Output.Prompt();
    });

    $("#compile").click(function (e) {
        var src = Editor.GetValue();
        var opt = '-m';
        Output.PrintLn('gcc ' + fileName + '.c -o ' + fileName);
        $("#compile").addClass("disabled");
        Editor.Disable();

        C2JS.Compile(src, opt, changeFlag, Context, function (res) {
            Editor.Enable();
            changeFlag = false;
            $("#compile").removeClass("disabled");
            if (res == null) {
                Output.PrintLn('Sorry, server is something wrong.');
                return;
            }
            if (res.error.length > 0) {
                Output.PrintLn(C2JS.CreateOutputView(res.error, fileName));
            }
            Output.Prompt();

            Context.error = res.error;
            if (!res.error.match("error:")) {
                Context.source = res.source;
                Output.PrintLn('./' + fileName);
                var Module = { print: function (x) {
                        Output.PrintLn(x);
                    } };
                try  {
                    var exe = new Function("Module", res.source);
                    exe(Module);
                } catch (e) {
                    Output.PrintLn(e);
                }
                Output.Prompt();
            } else {
                Context.source = null;
            }
        });
    });

    $("#save").click(function (e) {
        var blob = new Blob([Editor.GetValue()]);
        saveAs(blob, fileName + ".c");
    });

    $("#open").click(function (e) {
        $("#file-open-dialog").click();
    });

    $("#file-open-dialog").change(function (e) {
        var file = this.files[0];
        if (file) {
            var reader = new FileReader();
            reader.onerror = function (e) {
                alert(e);
            };
            reader.onload = function (e) {
                Editor.SetValue((e.target).result);
            };
            reader.readAsText(file, 'utf-8');
        }
    });

    $(window).on("beforeunload", function (e) {
        DB.Save(fileName, Editor.GetValue());
    });

    if (DB.Exist(fileName)) {
        Editor.SetValue(DB.Load(fileName));
    }
});
