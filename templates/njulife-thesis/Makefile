# Makefile for NJU Life Sciences Master Thesis
# 南京大学生命科学学院硕士学位论文 LaTeX 编译脚本

MAIN = thesis
LATEX = xelatex
BIBTEX = bibtex
LATEXFLAGS = -interaction=nonstopmode -file-line-error

# 临时文件扩展名
CLEAN_EXT = aux log out toc lof lot bbl blg bcf run.xml fdb_latexmk fls synctex.gz

.PHONY: all clean distclean view

# 默认目标：完整编译
all: $(MAIN).pdf

# 编译 PDF
$(MAIN).pdf: $(MAIN).tex njulife-thesis.cls
	$(LATEX) $(LATEXFLAGS) $(MAIN).tex
	-$(BIBTEX) $(MAIN)
	$(LATEX) $(LATEXFLAGS) $(MAIN).tex
	$(LATEX) $(LATEXFLAGS) $(MAIN).tex

# 快速编译（单次）
quick:
	$(LATEX) $(LATEXFLAGS) $(MAIN).tex

# 清理临时文件
clean:
	@for ext in $(CLEAN_EXT); do \
		rm -f $(MAIN).$$ext; \
	done
	@echo "Cleaned temporary files."

# 完全清理（包括 PDF）
distclean: clean
	rm -f $(MAIN).pdf
	@echo "Cleaned all generated files."

# 查看 PDF
view: $(MAIN).pdf
	@if [ "$$(uname)" = "Darwin" ]; then \
		open $(MAIN).pdf; \
	elif [ "$$(uname)" = "Linux" ]; then \
		xdg-open $(MAIN).pdf; \
	else \
		start $(MAIN).pdf; \
	fi

# 使用 latexmk 编译
latexmk:
	latexmk -xelatex -interaction=nonstopmode $(MAIN).tex

# 持续编译（监视文件变化）
watch:
	latexmk -xelatex -interaction=nonstopmode -pvc $(MAIN).tex

# 帮助信息
help:
	@echo "南京大学生命科学学院硕士学位论文 LaTeX 模板"
	@echo ""
	@echo "使用方法:"
	@echo "  make          - 完整编译 (xelatex -> bibtex -> xelatex -> xelatex)"
	@echo "  make quick    - 快速编译 (单次 xelatex)"
	@echo "  make clean    - 清理临时文件"
	@echo "  make distclean- 清理所有生成文件"
	@echo "  make view     - 查看生成的 PDF"
	@echo "  make latexmk  - 使用 latexmk 编译"
	@echo "  make watch    - 持续编译（监视文件变化）"
	@echo "  make help     - 显示此帮助信息"
