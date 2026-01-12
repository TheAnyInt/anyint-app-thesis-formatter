# .latexmkrc
# latexmk 配置文件

# 使用 XeLaTeX 编译
$pdf_mode = 5;  # 使用 xelatex
$xelatex = 'xelatex -interaction=nonstopmode -file-line-error %O %S';

# 生成 PDF 时自动运行 bibtex
$bibtex_use = 2;

# 清理时删除的额外文件
$clean_ext = 'bbl run.xml bcf synctex.gz';

# 预览 PDF（macOS 使用 open，Linux 使用 xdg-open）
if ($^O eq 'darwin') {
    $pdf_previewer = 'open -a Preview %O %S';
} elsif ($^O eq 'linux') {
    $pdf_previewer = 'xdg-open %O %S';
}
