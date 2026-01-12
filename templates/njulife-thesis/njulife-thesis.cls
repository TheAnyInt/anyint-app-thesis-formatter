% njulife-thesis.cls
% 南京大学生命科学学院硕士学位论文 LaTeX 模板
% Nanjing University School of Life Sciences Master's Thesis Template
% Based on: 南大生科院硕士学位论文写作要求格式-2025.9更新

\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{njulife-thesis}[2025/01/06 NJU Life Sciences Master Thesis]

% 基于 ctexbook 文档类
\LoadClass[a4paper,zihao=-4,openany,oneside]{ctexbook}

%% ==================== 宏包加载 ====================
\RequirePackage{geometry}
\RequirePackage{fancyhdr}
\RequirePackage{titlesec}
\RequirePackage{titletoc}
\RequirePackage{graphicx}
\RequirePackage{booktabs}
\RequirePackage{longtable}
\RequirePackage{multirow}
\RequirePackage{amsmath,amssymb,amsthm}
\RequirePackage{hyperref}
\RequirePackage{xcolor}
\RequirePackage{enumitem}
\RequirePackage{caption}
\RequirePackage{subcaption}
\RequirePackage{float}
\RequirePackage{pdfpages}
\RequirePackage{setspace}
\RequirePackage{etoolbox}
\RequirePackage{xparse}
\RequirePackage{zhnumber}
\RequirePackage{gbt7714}

%% ==================== 页面设置 ====================
% 页面设置：上边距3cm、下边距2.5cm、左边距3cm、右边距2.5cm
\geometry{
    top=3cm,
    bottom=2.5cm,
    left=3cm,
    right=2.5cm,
    headheight=15pt,
    headsep=1em,
    footskip=1.5cm
}

%% ==================== 字体设置 ====================
% 设置英文字体为 Times New Roman
\setmainfont{Times New Roman}
\setsansfont{Arial}
\setmonofont{Courier New}

% 中文字体
\setCJKmainfont{SimSun}[AutoFakeBold=2.5, AutoFakeSlant=0.2]
\setCJKsansfont{SimHei}[AutoFakeBold=2.5]
\setCJKmonofont{FangSong}

% 定义字号命令
\newcommand{\chuhao}{\fontsize{42pt}{50.4pt}\selectfont}
\newcommand{\xiaochu}{\fontsize{36pt}{43.2pt}\selectfont}
\newcommand{\yihao}{\fontsize{26pt}{31.2pt}\selectfont}
\newcommand{\xiaoyi}{\fontsize{24pt}{28.8pt}\selectfont}
\newcommand{\erhao}{\fontsize{22pt}{26.4pt}\selectfont}
\newcommand{\xiaoer}{\fontsize{18pt}{21.6pt}\selectfont}
\newcommand{\sanhao}{\fontsize{16pt}{19.2pt}\selectfont}
\newcommand{\xiaosan}{\fontsize{15pt}{18pt}\selectfont}
\newcommand{\sihao}{\fontsize{14pt}{16.8pt}\selectfont}
\newcommand{\banxiaosi}{\fontsize{13pt}{15.6pt}\selectfont}
\newcommand{\xiaosi}{\fontsize{12pt}{14.4pt}\selectfont}
\newcommand{\dawu}{\fontsize{11pt}{13.2pt}\selectfont}
\newcommand{\wuhao}{\fontsize{10.5pt}{12.6pt}\selectfont}
\newcommand{\xiaowu}{\fontsize{9pt}{10.8pt}\selectfont}
\newcommand{\liuhao}{\fontsize{7.5pt}{9pt}\selectfont}
\newcommand{\xiaoliu}{\fontsize{6.5pt}{7.8pt}\selectfont}
\newcommand{\qihao}{\fontsize{5.5pt}{6.6pt}\selectfont}
\newcommand{\bahao}{\fontsize{5pt}{6pt}\selectfont}

%% ==================== 论文信息命令 ====================
\newcommand{\thesistitle}[1]{\def\@thesistitle{#1}}
\newcommand{\thesistitleen}[1]{\def\@thesistitleen{#1}}
\newcommand{\schoolcode}[1]{\def\@schoolcode{#1}}
\newcommand{\classificationnumber}[1]{\def\@classificationnumber{#1}}
\newcommand{\secretlevel}[1]{\def\@secretlevel{#1}}
\newcommand{\udc}[1]{\def\@udc{#1}}
\newcommand{\studentid}[1]{\def\@studentid{#1}}
\newcommand{\authorname}[1]{\def\@authorname{#1}}
\newcommand{\authornameen}[1]{\def\@authornameen{#1}}
\newcommand{\majorname}[1]{\def\@majorname{#1}}
\newcommand{\majornameen}[1]{\def\@majornameen{#1}}
\newcommand{\researchdirection}[1]{\def\@researchdirection{#1}}
\newcommand{\supervisorname}[1]{\def\@supervisorname{#1}}
\newcommand{\supervisornameen}[1]{\def\@supervisornameen{#1}}
\newcommand{\supervisortitle}[1]{\def\@supervisortitle{#1}}
\newcommand{\thesisdate}[1]{\def\@thesisdate{#1}}
\newcommand{\thesisyear}[1]{\def\@thesisyear{#1}}
\newcommand{\thesismonth}[1]{\def\@thesismonth{#1}}
\newcommand{\defensedate}[1]{\def\@defensedate{#1}}
\newcommand{\chairperson}[1]{\def\@chairperson{#1}}
\newcommand{\reviewers}[1]{\def\@reviewers{#1}}

% 默认值
\def\@schoolcode{10284}
\def\@classificationnumber{}
\def\@secretlevel{}
\def\@udc{}
\def\@studentid{}
\def\@thesistitle{论文题目}
\def\@thesistitleen{Thesis Title}
\def\@authorname{作者姓名}
\def\@authornameen{Author Name}
\def\@majorname{专业名称}
\def\@majornameen{Major Name}
\def\@researchdirection{研究方向}
\def\@supervisorname{导师姓名}
\def\@supervisornameen{Supervisor Name}
\def\@supervisortitle{教授}
\def\@thesisyear{\the\year}
\def\@thesismonth{\the\month}
\def\@defensedate{\the\year 年\the\month 月}
\def\@chairperson{}
\def\@reviewers{}

%% ==================== 页眉页脚设置 ====================
\pagestyle{fancy}
\fancyhf{}

% 页眉：学位论文题目、5号宋体居中
\fancyhead[C]{\wuhao\@thesistitle}
\fancyfoot[C]{\thepage}

% 重定义 plain 样式（章节首页使用）
\fancypagestyle{plain}{
    \fancyhf{}
    \fancyhead[C]{\wuhao\@thesistitle}
    \fancyfoot[C]{\thepage}
    \renewcommand{\headrulewidth}{0.4pt}
    \renewcommand{\footrulewidth}{0pt}
}

% 前置页样式（罗马数字页码）
\fancypagestyle{frontmatter}{
    \fancyhf{}
    \fancyhead[C]{\wuhao\@thesistitle}
    \fancyfoot[C]{\thepage}
    \renewcommand{\headrulewidth}{0.4pt}
}

% 无页眉页脚样式
\fancypagestyle{empty}{
    \fancyhf{}
    \renewcommand{\headrulewidth}{0pt}
    \renewcommand{\footrulewidth}{0pt}
}

%% ==================== 章节标题格式 ====================
% 章标题格式：第X章 XXX，三号宋体加粗居中
\ctexset{
    chapter = {
        format = \centering\sanhao\bfseries,
        nameformat = {},
        titleformat = {},
        name = {第,章},
        number = \chinese{chapter},
        aftername = \quad,
        beforeskip = 24pt,
        afterskip = 18pt,
        pagestyle = plain
    },
    section = {
        format = \sihao\bfseries,
        aftername = \quad,
        beforeskip = 12pt,
        afterskip = 6pt
    },
    subsection = {
        format = \xiaosi\bfseries,
        aftername = \quad,
        beforeskip = 6pt,
        afterskip = 6pt
    },
    subsubsection = {
        format = \xiaosi,
        aftername = \quad,
        beforeskip = 6pt,
        afterskip = 6pt
    }
}

%% ==================== 目录格式 ====================
% 目录标题："目录"两字用三号宋体加粗居中
\renewcommand{\contentsname}{\centerline{\sanhao\bfseries 目\quad 录}}

% 目录条目格式：四号宋体
\titlecontents{chapter}[0pt]
    {\sihao\vspace{6pt}}
    {第\thecontentslabel 章\quad}
    {}
    {\titlerule*[0.5pc]{.}\contentspage}

\titlecontents{section}[2em]
    {\sihao}
    {\thecontentslabel\quad}
    {}
    {\titlerule*[0.5pc]{.}\contentspage}

\titlecontents{subsection}[4em]
    {\sihao}
    {\thecontentslabel\quad}
    {}
    {\titlerule*[0.5pc]{.}\contentspage}

%% ==================== 封面 ====================
\newcommand{\makecover}{
    \thispagestyle{empty}
    \begin{center}
        % 学校代码等信息
        \begin{tabular}{p{6cm}p{6cm}}
            学校代码：\underline{\makebox[3cm][c]{\@schoolcode}} & \\
            分类号：\underline{\makebox[3cm][c]{\@classificationnumber}} & \\
            密\quad 级：\underline{\makebox[3cm][c]{\@secretlevel}} & \\
            UDC：\underline{\makebox[3cm][c]{\@udc}} & \\
            学\quad 号：\underline{\makebox[3cm][c]{\@studentid}} & \\
        \end{tabular}

        \vspace{2cm}

        % 硕士学位论文
        {\erhao\bfseries 硕~士~学~位~论~文}

        \vspace{2cm}

        % 论文题目
        {\xiaoer\bfseries\@thesistitle}

        \vspace{3cm}

        % 作者信息
        \begin{tabular}{>{\sihao}r >{\sihao}l}
            作者姓名 & \underline{\makebox[6cm][c]{\@authorname}} \\[12pt]
            专业名称 & \underline{\makebox[6cm][c]{\@majorname}} \\[12pt]
            研究方向 & \underline{\makebox[6cm][c]{\@researchdirection}} \\[12pt]
            导师姓名 & \underline{\makebox[6cm][c]{\@supervisorname}} \\[12pt]
        \end{tabular}

        \vfill

        % 日期
        {\sihao \@thesisyear 年\quad \@thesismonth 月\quad 日}
    \end{center}
    \clearpage
}

%% ==================== 答辩信息页 ====================
\newcommand{\makedefensepage}{
    \thispagestyle{empty}
    \vspace*{5cm}
    \begin{center}
        \begin{tabular}{>{\sihao}r >{\sihao}l}
            答辩委员会主席 & \underline{\makebox[6cm][c]{\@chairperson}} \\[12pt]
            评\quad 阅\quad 人 & \underline{\makebox[6cm][c]{\@reviewers}} \\[12pt]
            论文答辩日期 & \underline{\makebox[6cm][c]{\@defensedate}} \\[12pt]
        \end{tabular}
    \end{center}
    \clearpage
}

%% ==================== 签名页 ====================
\newcommand{\makesignaturepage}{
    \thispagestyle{empty}
    \vspace*{10cm}
    \begin{flushright}
        \sihao
        研究生签名：\underline{\makebox[4cm][c]{}} \\[12pt]
        导师签名：\underline{\makebox[4cm][c]{}} \\
    \end{flushright}
    \clearpage
}

%% ==================== 内封面 ====================
\newcommand{\makeinnercover}{
    \thispagestyle{empty}
    \begin{center}
        {\xiaosi 南京大学硕士学位论文}

        \vspace{2cm}

        % 中文题目
        {\xiaoer\bfseries\@thesistitle}

        \vspace{1cm}

        % 英文题目
        {\sihao\@thesistitleen}

        \vspace{3cm}

        % 作者导师信息
        \begin{tabular}{>{\sihao}r >{\sihao}l}
            作者： & \@authorname \\[12pt]
            导师： & \@supervisorname\quad \@supervisortitle \\[12pt]
        \end{tabular}

        \vfill

        {\sihao 生命科学学院}

        {\sihao \@thesisyear 年\@thesismonth 月\quad 南京}
    \end{center}
    \clearpage
}

%% ==================== 原创性声明 ====================
\newcommand{\makedeclaration}{
    \chapter*{南京大学学位论文原创性声明}
    \addcontentsline{toc}{chapter}{南京大学学位论文原创性声明}

    本人郑重声明，所提交的学位论文是本人在导师指导下独立进行科学研究工作所取得的成果。除本论文中已经注明引用的内容外，本论文不包含其他个人或集体已经发表或撰写过的研究成果，也不包含为获得南京大学或其他教育机构的学位证书而使用过的材料。对本文的研究做出重要贡献的个人和集体，均已在论文的致谢部分明确标明。

    本人郑重声明愿承担本声明的法律责任。

    \vspace{2cm}

    \begin{flushright}
        签名：\underline{\makebox[4cm][c]{}} \\[12pt]
        日期：\underline{\makebox[4cm][c]{}} \\
    \end{flushright}
    \clearpage
}

%% ==================== 中文摘要环境 ====================
\newenvironment{cnabstract}[1]{
    \chapter*{摘\quad 要}
    \addcontentsline{toc}{chapter}{摘要}
    \def\@cnkeywords{#1}
}{
    \par\vspace{1em}
    \noindent\textbf{关键词：}\@cnkeywords
    \clearpage
}

%% ==================== 英文摘要环境 ====================
\newenvironment{enabstract}[1]{
    \chapter*{ABSTRACT}
    \addcontentsline{toc}{chapter}{ABSTRACT}

    {\noindent\textbf{THESIS:} \@thesistitleen}

    {\noindent\textbf{SPECIALIZATION:} \@majornameen}

    {\noindent\textbf{POSTGRADUATE:} \@authornameen}

    {\noindent\textbf{MENTOR:} \@supervisornameen}

    \vspace{1em}

    \def\@enkeywords{#1}
}{
    \par\vspace{1em}
    \noindent\textbf{Keywords:} \@enkeywords
    \clearpage
}

%% ==================== 符号及缩写语说明环境 ====================
\newenvironment{symbollist}{
    \chapter*{符号及缩写语说明}
    \addcontentsline{toc}{chapter}{符号及缩写语说明}
}{
    \clearpage
}

%% ==================== 附录环境 ====================
\renewenvironment{appendix}{
    \chapter*{附\quad 录}
    \addcontentsline{toc}{chapter}{附录}
    \setcounter{section}{0}
    \renewcommand{\thesection}{\Alph{section}}
}{
    \clearpage
}

%% ==================== 致谢环境 ====================
\newenvironment{acknowledgements}{
    \chapter*{致\quad 谢}
    \addcontentsline{toc}{chapter}{致谢}
}{
    \clearpage
}

%% ==================== 参考文献设置 ====================
% 使用 gbt7714 宏包的数字编号样式
\bibliographystyle{gbt7714-numerical}

% 参考文献标题
\renewcommand{\bibname}{参考文献}

%% ==================== 图表标题设置 ====================
\captionsetup{
    font=small,
    labelsep=quad,
    skip=6pt
}

\captionsetup[figure]{
    name=图,
    labelfont=bf
}

\captionsetup[table]{
    name=表,
    labelfont=bf
}

%% ==================== 超链接设置 ====================
\hypersetup{
    colorlinks=true,
    linkcolor=black,
    citecolor=black,
    urlcolor=blue,
    bookmarksnumbered=true,
    bookmarksopen=true,
    pdfstartview=FitH
}

%% ==================== 行距设置 ====================
\linespread{1.5}

%% ==================== 列表设置 ====================
\setlist{noitemsep,topsep=0pt,parsep=0pt,partopsep=0pt}

%% ==================== 定理环境 ====================
\theoremstyle{plain}
\newtheorem{theorem}{定理}[chapter]
\newtheorem{lemma}[theorem]{引理}
\newtheorem{proposition}[theorem]{命题}
\newtheorem{corollary}[theorem]{推论}

\theoremstyle{definition}
\newtheorem{definition}{定义}[chapter]
\newtheorem{example}{例}[chapter]

\theoremstyle{remark}
\newtheorem{remark}{注}[chapter]

%% ==================== 前置部分命令 ====================
\newcommand{\frontmattersetup}{
    \frontmatter
    \pagestyle{frontmatter}
    \pagenumbering{Roman}
}

%% ==================== 正文部分命令 ====================
\newcommand{\mainmattersetup}{
    \mainmatter
    \pagestyle{fancy}
    \pagenumbering{arabic}
}

%% ==================== 后置部分命令 ====================
\newcommand{\backmattersetup}{
    \backmatter
}

\endinput
