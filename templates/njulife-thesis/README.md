# 南京大学生命科学学院硕士学位论文 LaTeX 模板

基于《南大生科院硕士学位论文写作要求格式-2025.9更新》制作。

## 文件说明

- `njulife-thesis.cls` - LaTeX 文档类文件
- `thesis.tex` - 论文主文件（示例）
- `Makefile` - 编译脚本
- `README.md` - 说明文档

## 使用方法

### 1. 环境要求

- TeX Live 2020 或更新版本（推荐 TeX Live 2023+）
- 或 MiKTeX 最新版本
- 需要安装 XeLaTeX 引擎

### 2. 字体要求

模板使用以下字体：
- **中文字体**：宋体（SimSun）、黑体（SimHei）、仿宋（FangSong）
- **英文字体**：Times New Roman、Arial、Courier New

Windows 系统通常自带这些字体。macOS/Linux 用户需要安装相应字体或修改 `njulife-thesis.cls` 中的字体设置。

### 3. 编译方法

#### 方法一：使用 Makefile（推荐）

```bash
make        # 完整编译（xelatex -> bibtex -> xelatex -> xelatex）
make clean  # 清理临时文件
make distclean  # 清理所有生成文件
```

#### 方法二：手动编译

```bash
xelatex thesis.tex
bibtex thesis
xelatex thesis.tex
xelatex thesis.tex
```

#### 方法三：使用 latexmk

```bash
latexmk -xelatex thesis.tex
```

### 4. 论文结构

论文按以下顺序组织：

1. **封面** - `\makecover`
2. **答辩信息页** - `\makedefensepage`
3. **签名页** - `\makesignaturepage`
4. **内封面** - `\makeinnercover`
5. **原创性声明** - `\makedeclaration`
6. **目录** - `\tableofcontents`
7. **中文摘要** - `cnabstract` 环境
8. **英文摘要** - `enabstract` 环境
9. **符号及缩写语说明** - `symbollist` 环境（可选）
10. **正文** - `\chapter{}`, `\section{}` 等
11. **参考文献** - `thebibliography` 环境或 BibTeX
12. **附录** - `appendix` 环境（可选）
13. **致谢** - `acknowledgements` 环境

### 5. 论文信息设置

在 `thesis.tex` 文件开头设置论文信息：

```latex
% 基本信息
\schoolcode{10284}           % 学校代码
\classificationnumber{Q78}   % 中国图书分类号
\secretlevel{公开}           % 密级
\udc{577.2}                  % UDC分类号
\studentid{MG1234567}        % 学号

% 论文题目
\thesistitle{论文中文题目}
\thesistitleen{Thesis English Title}

% 作者信息
\authorname{张三}
\authornameen{Zhang San}
\majorname{专业名称}
\majornameen{Major Name}
\researchdirection{研究方向}

% 导师信息
\supervisorname{李四}
\supervisornameen{Prof. Li Si}
\supervisortitle{教授}

% 日期信息
\thesisyear{2025}
\thesismonth{6}
\defensedate{2025年6月15日}

% 答辩信息
\chairperson{王五 教授}
\reviewers{赵六 教授、钱七 教授}
```

### 6. 主要环境说明

#### 中文摘要
```latex
\begin{cnabstract}{关键词1；关键词2；关键词3}
摘要内容...
\end{cnabstract}
```

#### 英文摘要
```latex
\begin{enabstract}{keyword1; keyword2; keyword3}
Abstract content...
\end{enabstract}
```

#### 符号说明
```latex
\begin{symbollist}
\begin{longtable}{ll}
缩写 & 说明 \\
...
\end{longtable}
\end{symbollist}
```

#### 附录
```latex
\begin{appendix}
\section{附录标题}
附录内容...
\end{appendix}
```

#### 致谢
```latex
\begin{acknowledgements}
致谢内容...
\end{acknowledgements}
```

## 格式要求对照

| 项目 | 要求 | 模板实现 |
|------|------|----------|
| 页面设置 | A4纸，上3cm、下2.5cm、左3cm、右2.5cm | ✅ |
| 页眉 | 学位论文题目，5号宋体居中 | ✅ |
| 页脚 | 前置部分罗马数字，正文阿拉伯数字 | ✅ |
| 目录标题 | "目录"三号宋体加粗居中 | ✅ |
| 目录条目 | 四号宋体 | ✅ |
| 章标题 | "第X章"三号宋体加粗 | ✅ |
| 节标题 | 四号宋体加粗 | ✅ |
| 正文 | 小四号宋体 | ✅ |
| 英文/数字 | Times New Roman | ✅ |
| 参考文献 | 方括号编号，最多3作者 | ✅ (gbt7714) |

## 常见问题

### Q: 编译时提示找不到字体？

A: 请确保系统安装了所需字体。Windows 用户通常无需额外安装。macOS/Linux 用户可以：
1. 安装 Windows 字体
2. 或修改 `njulife-thesis.cls` 中的字体设置为系统可用字体

### Q: 如何使用 BibTeX 管理参考文献？

A: 模板默认使用 `gbt7714-numerical` 样式，支持 BibTeX：
```latex
\bibliography{refs}  % refs.bib 文件
```

### Q: 如何添加图片？

A: 将图片放在同目录或子目录下：
```latex
\begin{figure}[htbp]
\centering
\includegraphics[width=0.8\textwidth]{figures/example.pdf}
\caption{图片标题}
\label{fig:example}
\end{figure}
```

## 版本历史

- 2025.01.06 - 初始版本，基于2025.9更新的写作规范

## 许可证

本模板仅供南京大学生命科学学院硕士研究生学位论文撰写使用。
