var C2JS;

(function (C2JS) {
    C2JS.Compile = function(source, option, callback) {
        $.ajax({
            type: "POST",
            url: "compile.cgi",
            data: JSON.stringify({source: source, option: option}),
            dataType: 'json',
            contentType: "application/json; charset=utf-8",
            success: callback,
            error: function() { alert("error"); }
        });
    }
})(C2JS || (C2JS = {}));

$(function () {

    var editor_gs = CodeMirror.fromTextArea(document.getElementById("editor-gs"), {
        lineNumbers: true,
        mode: "text/x-csrc"
    });
    editor_gs.setValue("#include <stdio.h>\n\nint main(int argc, char* argv[]) {\n\tprintf(\"hello, world!\\n\");\n\treturn 0;\n}");

    $("#compile").click(function(e){
        var src = editor_gs.getValue();
        var opt = '-m'; //TODO
        var $output = $('#editor-error');
        $output.text('Waiting for compilation ...');
        C2JS.Compile(src, opt, function(res){
            $output.text('');
            if(res.error.length > 0) {
                $output.html(res.error);
            }else {
                var printBuf = "";
                var Module = {print:function(x){$output.append(x+"<br>");printBuf += x;console.log(x);}};
                eval(res.source);
            }
        });
    });
});
