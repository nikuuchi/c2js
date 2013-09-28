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
        function Editor() {
            var $editor = $("#editor");
            this.size = new Size($editor.width(), $editor.height());
            this.editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
                lineNumbers: true,
                indentUnit: 4,
                mode: "text/x-csrc"
            });
            this.editor.setValue("#include <stdio.h>\n\nint main(int argc, char* argv[]) {\n    printf(\"hello, world!\\n\");\n    return 0;\n}");
            this.editor.setSize(this.size.width, this.size.height);
        }
        Editor.prototype.OnChange = function (callback) {
            this.editor.on("change", callback);
        };

        Editor.prototype.GetValue = function () {
            return this.editor.getValue();
        };
        return Editor;
    })();
    C2JS.Editor = Editor;

    function Compile(source, option, flag, Context, callback) {
        if (flag) {
            $.ajax({
                type: "POST",
                url: "compile.cgi",
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

    function TerminalColor(log) {
        return log.replace(/\[31m(.*)\[0m/g, '<span class="text-danger">$1</span>');
    }
    C2JS.TerminalColor = TerminalColor;
})(C2JS || (C2JS = {}));

$(function () {
    var Editor = new C2JS.Editor();

    var changeFlag = true;
    Editor.OnChange(function (e) {
        changeFlag = true;
    });

    var fileName = "Program";

    $("#file-name").text(fileName + ".c");

    var Context = {};
    var $output = $('#output');
    $output.text('$ ');

    $("#clear").click(function (e) {
        $output.text('$ ');
    });

    $("#compile").click(function (e) {
        var src = Editor.GetValue();
        var opt = '-m';
        $output.append('gcc ' + fileName + '.c -o ' + fileName);
        $output.append('<br>');
        C2JS.Compile(src, opt, changeFlag, Context, function (res) {
            changeFlag = false;
            if (res == null) {
                $output.append('Sorry, server is something wrong.');
                return;
            }
            if (res.error.length > 0) {
                $output.append(C2JS.TerminalColor(res.error.replace(/\n/g, "<br>\n").replace(/\/.*\.c/g, fileName + ".c").replace(/\/.*\/(.*\.h)/g, "$1").replace(/(note:.*)$/gm, "<span class='text-info'>$1</span>").replace(/(warning:.*)$/gm, "<span class='text-warning'>$1</span>").replace(/(error:.*)$/gm, "<span class='text-danger'>$1</span>")));
                $output.append('<br>');
            }
            $output.append('$ ');

            Context.error = res.error;
            if (!res.error.match("error:")) {
                Context.source = res.source;
                $output.append('./' + fileName);
                $output.append('<br>');
                var Module = { print: function (x) {
                        $output.append(x + "<br>");/*console.log(x);*/ 
                    } };
                try  {
                    var exe = new Function("Module", res.source);
                    exe(Module);
                } catch (e) {
                    $output.html(e);
                }
                $output.append('$ ');
            } else {
                Context.source = null;
            }
        });
    });
});
