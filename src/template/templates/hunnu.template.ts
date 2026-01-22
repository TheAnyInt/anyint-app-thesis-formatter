// HUNNU Bachelor Thesis Template
// 湖南师范大学树达学院本科毕业论文 LaTeX 模板

export const hunnuTemplate = {
  id: 'hunnu',
  schoolId: 'hunnu',
  name: '湖南师范大学本科毕业论文',
  description: '湖南师范大学树达学院本科毕业论文 LaTeX 模板',
  requiredFields: [
    'title',
    'titleEn',
    'author',
    'major',
    'advisor',
    'college',
    'studentId',
  ],
  requiredSections: [
    'abstractCn',
    'abstractEn',
    'chapters',
  ],
  assets: [
    'figures/hunnu.bmp',
    'kaiti_GB2312.TTF',
    'simsun.ttc',
    'simhei.ttf',
    'simfang.ttf',
  ],
  texContent: `% !TEX TS-program = xelatex
% !TEX encoding = UTF-8
%%
%% 湖南师范大学树达学院本科毕业论文 LaTeX 模板
%% HUNNU Bachelor Thesis Template - Standalone version with embedded fonts
%%
\\documentclass[a4paper,twoside,openright,zihao=-4]{ctexbook}

%% ==================== 字体设置 (必须在最前面) ====================
\\usepackage{fontspec}
\\usepackage{xeCJK}

% 设置中文字体 - 使用本地字体文件
\\setCJKmainfont{simsun.ttc}[AutoFakeBold=2.5, AutoFakeSlant=0.2]
\\setCJKsansfont{simhei.ttf}[AutoFakeBold=2.5]
\\setCJKmonofont{simhei.ttf}

% 定义字体族
\\setCJKfamilyfont{zhsong}{simsun.ttc}[AutoFakeBold=2.5]
\\setCJKfamilyfont{zhhei}{simhei.ttf}[AutoFakeBold=2.5]
\\setCJKfamilyfont{zhfs}{simfang.ttf}[AutoFakeBold=2.5]
\\setCJKfamilyfont{zhkai}{kaiti_GB2312.TTF}[AutoFakeBold=2.5]

\\newcommand{\\songti}{\\CJKfamily{zhsong}}
\\newcommand{\\heiti}{\\CJKfamily{zhhei}}
\\newcommand{\\fangsong}{\\CJKfamily{zhfs}}
\\newcommand{\\kaiti}{\\CJKfamily{zhkai}}

% 英文字体
\\setmainfont{Times New Roman}[
  BoldFont=Times New Roman,
  ItalicFont=Times New Roman,
  BoldItalicFont=Times New Roman,
  AutoFakeBold=2.5,
  AutoFakeSlant=0.2
]

%% ==================== 页面设置 ====================
\\usepackage[top=2.54cm, bottom=2.54cm, outer=2.54cm, inner=2.27cm, headheight=1.5cm, footskip=1.75cm, heightrounded]{geometry}

%% ==================== 宏包加载 ====================
\\usepackage[numbers,sort&compress]{natbib}
\\usepackage[perpage, bottom]{footmisc}
\\usepackage{amsmath,amsfonts,amssymb}
\\usepackage{amsthm}
\\usepackage{graphicx}
\\usepackage{subfigure}
\\usepackage{setspace}
\\usepackage{float}
\\usepackage[T1]{fontenc}
\\usepackage{booktabs}
\\usepackage{longtable}
\\usepackage{listings}
\\usepackage{xcolor}
\\usepackage{multirow}
\\usepackage{fancyhdr}
\\usepackage{etoolbox}
\\usepackage[titles,subfigure]{tocloft}
\\usepackage{array}
\\usepackage{makecell}
\\usepackage{forloop}
\\usepackage{xstring}
\\usepackage[unicode,psdextra]{hyperref}
\\usepackage[nameinlink]{cleveref}
\\usepackage{enumitem}
\\usepackage[amsmath,thmmarks,hyperref]{ntheorem}
\\usepackage{algorithm}
\\usepackage{algorithmic}
\\usepackage{caption}
\\usepackage{ifthen}
\\usepackage{titlesec}

%% ==================== 字号定义 ====================
\\newcommand{\\chuhao}{\\fontsize{42pt}{\\baselineskip}\\selectfont}
\\newcommand{\\xiaochu}{\\fontsize{36pt}{\\baselineskip}\\selectfont}
\\newcommand{\\yihao}{\\fontsize{28pt}{\\baselineskip}\\selectfont}
\\newcommand{\\erhao}{\\fontsize{21pt}{\\baselineskip}\\selectfont}
\\newcommand{\\xiaoer}{\\fontsize{18pt}{\\baselineskip}\\selectfont}
\\newcommand{\\sanhao}{\\fontsize{15.75pt}{\\baselineskip}\\selectfont}
\\newcommand{\\sihao}{\\fontsize{14pt}{\\baselineskip}\\selectfont}
\\newcommand{\\xiaosi}{\\fontsize{12pt}{\\baselineskip}\\selectfont}
\\newcommand{\\wuhao}{\\fontsize{10.5pt}{\\baselineskip}\\selectfont}
\\newcommand{\\xiaowu}{\\fontsize{9pt}{\\baselineskip}\\selectfont}
\\newcommand{\\liuhao}{\\fontsize{7.875pt}{\\baselineskip}\\selectfont}
\\newcommand{\\qihao}{\\fontsize{5.25pt}{\\baselineskip}\\selectfont}

%% ==================== 参考文献上标 ====================
\\newcommand{\\upcite}[1]{{\\setcitestyle{square,super}\\cite{#1}}}

%% ==================== 页眉页脚设置 ====================
\\newboolean{PicAndTabIndex}
\\pagestyle{fancy}
\\fancypagestyle{frontmatterstyle}{
    \\fancyhf{}
    \\renewcommand{\\headrulewidth}{0pt}
    \\fancyfoot{}
    \\fancyfoot[C]{\\thepage}
    \\renewcommand{\\thepage}{\\Roman{page}}
}
\\appto\\frontmatter{\\pagestyle{frontmatterstyle}}

\\fancypagestyle{mainmatterstyle}{
    \\fancyhf{}
    \\renewcommand{\\headrulewidth}{0pt}
    \\fancyfoot{}
    \\fancyfoot[C]{\\thepage}
}
\\appto\\mainmatter{\\pagestyle{mainmatterstyle}}
\\appto\\mainmatter{\\linespread{1.3889}\\selectfont}
\\fancypagestyle{plain}{
    \\thispagestyle{mainmatterstyle}
}
\\AtBeginDocument{\\addtocontents{toc}{\\protect\\thispagestyle{frontmatterstyle}}}

%% ==================== 标题样式 ====================
\\ctexset{
    chapter/name={,.},
    chapter/number=\\arabic{chapter}
}
\\renewcommand{\\cftdot}{$\\cdot$}
\\renewcommand{\\cftdotsep}{0}
\\renewcommand{\\cftchapleader}{\\cftdotfill{\\cftchapdotsep}}
\\renewcommand{\\cftchapdotsep}{\\cftdotsep}
\\setlength{\\cftbeforechapskip}{4pt}
\\setlength{\\cftbeforesecskip}{4pt}
\\setlength{\\cftbeforesubsecskip}{4pt}
\\cftsetpnumwidth{1.5em}

\\renewcommand\\cftchapfont{\\heiti\\zihao{4}}
\\renewcommand\\cftsecfont{\\fangsong\\zihao{4}}
\\renewcommand\\cftsubsecfont{\\fangsong\\zihao{4}}
\\renewcommand\\cftchappagefont{\\mdseries}
\\setlength\\cftbeforetoctitleskip{18pt}

%% ==================== 章节样式 ====================
\\setcounter{secnumdepth}{4}
\\setlength{\\parindent}{2em}

\\newcommand\\prechaptername{ }
\\renewcommand{\\chaptername}{\\prechaptername}
\\titleformat{\\chapter}{\\centering\\zihao{4}\\heiti}{\\chaptername}{0.5em}{}
\\titlespacing{\\chapter}{0pt}{0pt}{18pt}
\\titleformat{\\section}{\\zihao{4}\\fangsong}{\\thesection}{0.5em}{}
\\titlespacing{\\section}{0pt}{12pt}{12pt}
\\titleformat{\\subsection}{\\zihao{4}\\fangsong}{\\thesubsection}{0.5em}{}
\\titlespacing{\\subsection}{0pt}{6pt}{6pt}
\\titleformat{\\subsubsection}{\\zihao{4}\\fangsong}{\\thesubsubsection}{0.5em}{}
\\titlespacing{\\subsubsection}{0pt}{6pt}{6pt}

%% ==================== 目录名称 ====================
\\ctexset{
    contentsname={目\\hspace{1em}录},
    chapter/lofskip=0pt,
    chapter/lotskip=0pt
}

%% ==================== 下划线命令 ====================
\\makeatletter
\\def\\HUNNU@underline[#1]#2{%
    \\underline{\\hbox to #1{\\hfill#2\\hfill}}}
\\def\\HUNNUunderline{\\@ifnextchar[\\HUNNU@underline\\underline}
\\makeatother

%% ==================== 超链接设置 ====================
\\hypersetup{hidelinks,breaklinks=true,bookmarksopen=false}

%% ==================== 列表样式 ====================
\\setenumerate[1]{itemsep=0pt,partopsep=0pt,parsep=\\parskip,topsep=5pt}
\\setitemize[1]{itemsep=0pt,partopsep=0pt,parsep=\\parskip,topsep=0pt}
\\setdescription{itemsep=0pt,partopsep=0pt,parsep=\\parskip,topsep=5pt}

%% ==================== 定理环境 ====================
\\theorembodyfont{\\rmfamily\\songti}
\\theoremheaderfont{\\rmfamily\\heiti}
\\theoremsymbol{\\ensuremath{\\square}}
\\newtheorem*{proof}{证明}
\\theoremstyle{plain}
\\theoremsymbol{}
\\qedsymbol{\\ensuremath{\\square}}
\\newtheorem{assumption}{假设}[chapter]
\\newtheorem{definition}{定义}[chapter]
\\newtheorem{proposition}{命题}[chapter]
\\newtheorem{lemma}{引理}[chapter]
\\newtheorem{theorem}{定理}[chapter]
\\newtheorem{axiom}{公理}[chapter]
\\newtheorem{corollary}{推论}[chapter]
\\newtheorem{example}{例}[chapter]
\\newtheorem{conjecture}{猜想}[chapter]

\\crefname{theorem}{定理}{定理}
\\crefname{assumption}{假设}{假设}
\\crefname{definition}{定义}{定义}
\\crefname{proposition}{命题}{命题}
\\crefname{lemma}{引理}{引理}
\\crefname{axiom}{公理}{公理}
\\crefname{corollary}{推论}{推论}
\\crefname{example}{例}{例}
\\crefname{remark}{注释}{注释}
\\crefname{conjecture}{猜想}{猜想}

%% ==================== 算法环境 ====================
\\floatname{algorithm}{算法}
\\renewcommand{\\algorithmicrequire}{\\textbf{输入:}}
\\renewcommand{\\algorithmicensure}{\\textbf{输出:}}

%% ==================== 图表编号格式 ====================
\\captionsetup[table]{labelsep=space}
\\captionsetup[figure]{labelsep=space}
\\renewcommand{\\tablename}{表}
\\renewcommand{\\figurename}{图}
\\renewcommand{\\thefigure}{\\arabic{chapter}.\\arabic{figure}}
\\renewcommand{\\thetable}{\\arabic{chapter}.\\arabic{table}}
\\renewcommand{\\theequation}{\\arabic{chapter}.\\arabic{equation}}
\\renewcommand{\\thesubfigure}{(\\alph{subfigure})}
\\renewcommand{\\thesubtable}{(\\alph{subtable})}

%% ==================== 空格命令 ====================
\\newcommand\\HUNNUspace{\\phantom{永}}

%% ==================== 图片路径 ====================
\\graphicspath{{figures/}}
\\setboolean{PicAndTabIndex}{false}

%% ==================== 中文摘要命令 ====================
\\newcommand{\\ZhAbstract}[2]{%
    \\phantomsection
    \\addcontentsline{toc}{chapter}{摘\\quad 要}
    \\begin{center}
        \\setlength{\\parskip}{24pt}
        \\begin{minipage}{0.8\\textwidth}
            \\singlespacing
            \\centering
             \\zihao{3}\\heiti\\noindent\\@HUNNUtitle%
        \\end{minipage}
    \\end{center}
    \\setlength{\\parskip}{0pt}
    \\singlespacing
    \\zihao{4}\\fangsong\\centerline{\\@HUNNUmajor\\quad\\@HUNNUauthor}
    \\singlespacing
    \\par\\noindent\\bf\\heiti\\zihao{4}{摘要:}
    \\fangsong\\zihao{-4}#1
    \\\\
    \\par \\noindent\\heiti\\zihao{4}{关键词：}\\fangsong\\zihao{-4}#2
    \\newpage
}

%% ==================== 英文摘要命令 ====================
\\newcommand{\\EnAbstract}[2]{
    \\phantomsection
    \\addcontentsline{toc}{chapter}{Abstract}
    \\begin{center}
        \\setlength{\\parskip}{24pt}
        \\begin{minipage}{\\textwidth}
            \\singlespacing
            \\selectfont
            \\centering
            \\bf\\zihao{3}\\noindent{\\@HUNNUentitle}
        \\end{minipage}
    \\end{center}
    \\setlength{\\parskip}{0pt}
    {
    \\singlespacing
    \\par\\noindent\\bf\\zihao{4}\\text{Abstract: }\\zihao{-4} #1
    \\\\
    \\par \\noindent\\zihao{4}\\text{Key words: } \\zihao{-4} #2}
}

%% ==================== 封面信息变量 ====================
\\makeatletter
\\newcommand{\\@HUNNUcode}{}
\\newcommand{\\@HUNNUcollege}{}
\\newcommand{\\@HUNNUserialnumber}{}
\\newcommand{\\@HUNNUmajor}{}
\\newcommand{\\@HUNNUenmajor}{}
\\newcommand{\\@HUNNUenauthor}{}
\\newcommand{\\@HUNNUadvisor}{}
\\newcommand{\\@HUNNUtitle}{}
\\newcommand{\\@HUNNUentitle}{}
\\newcommand{\\@HUNNUauthor}{}
\\newcommand{\\@HUNNUsubmityear}{}
\\newcommand{\\@HUNNUsubmitmonth}{}

\\newcommand{\\HUNNUcode}[1]{\\renewcommand{\\@HUNNUcode}{#1}}
\\newcommand{\\HUNNUcollege}[1]{\\renewcommand{\\@HUNNUcollege}{#1}}
\\newcommand{\\HUNNUserialnumber}[1]{\\renewcommand{\\@HUNNUserialnumber}{#1}}
\\newcommand{\\HUNNUmajor}[1]{\\renewcommand{\\@HUNNUmajor}{#1}}
\\newcommand{\\HUNNUenmajor}[1]{\\renewcommand{\\@HUNNUenmajor}{#1}}
\\newcommand{\\HUNNUenauthor}[1]{\\renewcommand{\\@HUNNUenauthor}{#1}}
\\newcommand{\\HUNNUadvisor}[1]{\\renewcommand{\\@HUNNUadvisor}{#1}}
\\newcommand{\\HUNNUtitle}[1]{\\renewcommand{\\@HUNNUtitle}{#1}}
\\newcommand{\\HUNNUentitle}[1]{\\renewcommand{\\@HUNNUentitle}{#1}}
\\newcommand{\\HUNNUauthor}[1]{\\renewcommand{\\@HUNNUauthor}{#1}}
\\newcommand{\\HUNNUsubmityear}[1]{\\renewcommand{\\@HUNNUsubmityear}{#1}}
\\newcommand{\\HUNNUsubmitmonth}[1]{\\renewcommand{\\@HUNNUsubmitmonth}{#1}}

%% ==================== 封面命令 ====================
\\newcommand{\\makeHUNNUtitle}{%
    \\cleardoublepage
    \\thispagestyle{empty}
    \\begin{center}
    \\rightline{\\bf\\heiti\\zihao{-4}专业代码\\HUNNUunderline[2.5cm]{\\heiti\\zihao{4}\\@HUNNUcode}}
        \\vspace{0.25cm}
        \\includegraphics[width=10.5cm]{hunnu.bmp}\\\\
         \\vspace{0.25cm}
        {\\bf\\heiti\\fontsize{45}{45}\\selectfont 树~~达~~学~~院\\\\本~~科~~毕~~业~~论~~文\\\\}
        \\vspace{0.25cm}
        \\zihao{-2}
        \\def\\tabcolsep{6pt}
        \\vspace*{50pt}
        \\begin{tabular}{rl}
            {\\heiti\\zihao{-2}{题~~~目}\\zihao{-4}（中文）\\zihao{3}:}
            & {\\HUNNUunderline[258pt]{\\kaiti\\zihao{-2}\\@HUNNUtitle}}\\\\[0.40cm]
            {\\heiti\\zihao{-2}{题~~~目\\zihao{-4}（外文）}\\zihao{3}:}
            & {\\HUNNUunderline[258pt]{\\zihao{-2}\\@HUNNUentitle}}\\\\[0.40cm]
            {\\heiti\\zihao{-2}学~~生~~姓~~名:} &
            {\\HUNNUunderline[258pt]{ \\kaiti\\zihao{-2}\\@HUNNUauthor}}\\\\[0.40cm]
            {\\heiti \\zihao{-2}{学~~~~~~~~~~~~~~号:}} &
            {\\HUNNUunderline[258pt]{\\zihao{-2}  \\@HUNNUserialnumber}}\\\\[0.40cm]
            {\\heiti \\zihao{-2}指~~导~~教~~师:} &
            {\\HUNNUunderline[258pt]{\\kaiti\\zihao{-2} \\@HUNNUadvisor}} \\\\[0.40cm]
            {\\heiti \\zihao{-2}学~~~~~~~~~~~~~~院:} &
            {\\HUNNUunderline[258pt]{\\kaiti\\zihao{-2}\\@HUNNUcollege}} \\\\[0.40cm]
            {\\heiti \\zihao{-2}专~~业~~班~~级:} &
            {\\HUNNUunderline[258pt]{ \\kaiti\\zihao{-2}\\@HUNNUmajor}}\\\\[0.40cm]
        \\end{tabular}
        \\par
        \\vspace{60pt}
        {\\heiti\\zihao{-2}二〇{\\@HUNNUsubmityear}年{\\@HUNNUsubmitmonth}月}
    \\end{center}
    \\pagestyle{empty}
    \\cleardoublepage
}
\\makeatother

%% ==================== 封面信息 ====================
\\HUNNUtitle{ {{#title}}{{title}}{{/title}}{{^title}}论文题目{{/title}} }
\\HUNNUentitle{ {{#titleEn}}{{titleEn}}{{/titleEn}}{{^titleEn}}English Title{{/titleEn}} }
\\HUNNUauthor{ {{#author}}{{author}}{{/author}}{{^author}}作者姓名{{/author}} }
\\HUNNUenauthor{ {{#authorEn}}{{authorEn}}{{/authorEn}}{{^authorEn}}Author Name{{/authorEn}} }
\\HUNNUmajor{ {{#major}}{{major}}{{/major}}{{^major}}专业名称~~20XX级{{/major}} }
\\HUNNUenmajor{ {{#majorEn}}{{majorEn}}{{/majorEn}}{{^majorEn}}Major Name 20XX{{/majorEn}} }
\\HUNNUadvisor{ {{#advisor}}{{advisor}}{{/advisor}}{{^advisor}}指导教师{{/advisor}} }
\\HUNNUcollege{ {{#college}}{{college}}{{/college}}{{^college}}学院名称{{/college}} }
\\HUNNUserialnumber{ {{#studentId}}{{studentId}}{{/studentId}}{{^studentId}}20XXXXXXXXXX{{/studentId}} }
\\HUNNUcode{ {{#code}}{{code}}{{/code}}{{^code}}000000{{/code}} }
\\HUNNUsubmityear{ {{#submitYear}}{{submitYear}}{{/submitYear}}{{^submitYear}}二六{{/submitYear}} }
\\HUNNUsubmitmonth{ {{#submitMonth}}{{submitMonth}}{{/submitMonth}}{{^submitMonth}}六{{/submitMonth}} }

\\begin{document}

%% ==================== 封面 ====================
\\makeHUNNUtitle

%% ==================== 诚信声明 ====================
\\begin{center}
\\heiti\\zihao{-2}湖南师范大学树达学院本科毕业设计诚信声明
\\end{center}
\\vspace{1cm}

\\fangsong\\zihao{4}本人郑重声明：所呈交的本科毕业论文，是本人在指导老师的指导下，独立进行研究工作所取得的成果，成果不存在知识产权争议，除文中已经注明引用的内容外，本设计不含任何其他个人或集体已经发表或撰写过的作品成果。对本设计的研究做出重要贡献的个人和集体均已在文中以明确方式标明。本人完全意识到本声明的法律结果由本人承担。\\vspace{9cm}

\\begin{flushright}
本科毕业设计作者签名：\\qquad\\qquad\\qquad\\vspace{0.25cm}

二〇{{#submitYear}}{{submitYear}}{{/submitYear}}{{^submitYear}}二六{{/submitYear}}\\quad 年\\quad 月\\quad 日\\quad\\qquad
\\end{flushright}

\\cleardoublepage

%% ==================== 前言部分 ====================
\\frontmatter
\\tableofcontents

%% ==================== 正文部分 ====================
\\mainmatter

%% ==================== 中文摘要 ====================
\\ZhAbstract{%
{{#abstractCn}}{{{abstractCn}}}{{/abstractCn}}{{^abstractCn}}{{{abstract}}}{{/abstractCn}}
}{%
{{#keywordsCn}}{{keywordsCn}}{{/keywordsCn}}{{^keywordsCn}}{{keywords}}{{/keywordsCn}}
}

%% ==================== 英文摘要 ====================
\\EnAbstract{%
{{#abstractEn}}{{{abstractEn}}}{{/abstractEn}}{{^abstractEn}}{{{abstract_en}}}{{/abstractEn}}
}{%
{{#keywordsEn}}{{keywordsEn}}{{/keywordsEn}}{{^keywordsEn}}{{keywords_en}}{{/keywordsEn}}
}

\\fangsong\\zihao{4}

%% ==================== 正文章节 ====================
{{#chapters}}
{{#isLevel1}}
\\chapter{ {{title}} }
{{/isLevel1}}
{{#isLevel2}}
\\section{ {{title}} }
{{/isLevel2}}
{{#isLevel3}}
\\subsection{ {{title}} }
{{/isLevel3}}
{{#isLevel4}}
\\subsubsection{ {{title}} }
{{/isLevel4}}

{{{content}}}

{{/chapters}}
{{^chapters}}
{{#sections}}
{{#isLevel1}}
\\chapter{ {{title}} }
{{/isLevel1}}
{{#isLevel2}}
\\section{ {{title}} }
{{/isLevel2}}
{{#isLevel3}}
\\subsection{ {{title}} }
{{/isLevel3}}
{{#isLevel4}}
\\subsubsection{ {{title}} }
{{/isLevel4}}

{{{content}}}

{{/sections}}
{{/chapters}}

%% ==================== 结论 ====================
{{#hasConclusion}}
\\chapter*{结论}
\\addcontentsline{toc}{chapter}{结论}

{{{conclusion}}}

{{/hasConclusion}}

%% ==================== 后文部分 ====================
\\backmatter

%% ==================== 参考文献 ====================
{{#hasReferences}}
\\fangsong\\zihao{4}
\\addcontentsline{toc}{chapter}{参考文献}
\\begin{thebibliography}{99}
{{#references}}
\\bibitem{ {{key}} }
{{{citation}}}
{{/references}}
\\end{thebibliography}
{{/hasReferences}}

%% ==================== 致谢 ====================
{{#hasAcknowledgements}}
\\chapter*{致谢}
\\addcontentsline{toc}{chapter}{致谢}

{{{acknowledgements}}}

{{/hasAcknowledgements}}

%% ==================== 附录 ====================
{{#hasAppendix}}
\\appendix

{{{appendix}}}

{{/hasAppendix}}

\\end{document}
`,
};
