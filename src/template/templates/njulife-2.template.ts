// NJU Life Sciences Master Thesis Template v2
// 南京大学生命科学学院硕士学位论文 LaTeX 模板 (基于 ctexart)

export const njulife2Template = {
  id: 'njulife-2',
  schoolId: 'njulife',
  name: '南京大学生命科学学院硕士学位论文 v2',
  description: '基于 ctexart 的南大生科院硕士学位论文模板，使用外部封面 PDF',
  requiredFields: [
    'title',
    'titleEn',
    'author',
    'major',
    'supervisor',
  ],
  requiredSections: [
    'abstractCn',
    'abstractEn',
    'chapters',
  ],
  // 需要复制到输出目录的资源文件
  assets: [
    'cover.pdf',
    'calibri.ttf',
    'simsun.ttc',
    '1.png',
  ],
  texContent: `% 南京大学生命科学学院硕士学位论文 LaTeX 模板 v2
% NJU Life Sciences Master Thesis Template (ctexart based)
% Auto-generated from template

\\documentclass[openany,a4paper,12pt,AutoFakeBold,oneside]{ctexart}
\\usepackage[left=3cm, right=2.5cm, top=3cm, bottom=2.50cm]{geometry}
\\CTEXsetup[format={\\zihao{3}\\songti\\bf\\filcenter}]{section}
\\CTEXsetup[name={第,章}]{section}
\\CTEXsetup[number={\\arabic{section}}]{section}
\\CTEXsetup[format={\\zihao{4}\\songti\\bf}]{subsection}
\\CTEXsetup[format={\\zihao{-4}\\songti\\bf}]{subsubsection}
\\setlength{\\headheight}{0.8cm}
\\usepackage{setspace}
\\linespread{1.5}
\\newfontfamily{\\myCalibri}{calibri.ttf}

\\usepackage{fontspec}
\\usepackage{amsmath, amsfonts, amssymb, mathrsfs}
\\usepackage{color}
\\usepackage{graphicx}
\\usepackage{subfigure}
\\usepackage{url}
\\usepackage{bm}
\\usepackage{multirow}
\\usepackage{booktabs}
\\usepackage{epstopdf}
\\usepackage{epsfig}
\\usepackage{longtable}
\\usepackage{supertabular}
\\usepackage{algorithm}
\\usepackage{algorithmic}
\\usepackage{changepage}
\\usepackage{indentfirst}
\\newcommand{\\upcitep}[1]{\\textsuperscript{\\cite{#1}}}
\\usepackage{caption}
\\DeclareCaptionFormat{myformat}{\\heiti\\zihao{-4} #1#2#3}
\\captionsetup{labelsep=space,format={myformat}}

\\numberwithin{equation}{section}
\\renewcommand\\theequation{\\thesection-\\arabic{equation}}

\\setCJKmainfont{simsun.ttc}
\\usepackage{pdfpages}
\\setmainfont{Times New Roman}

\\renewcommand{\\algorithmicrequire}{ \\textbf{输入:}}
\\renewcommand{\\algorithmicensure}{ \\textbf{初始化:}}
\\renewcommand{\\algorithmicreturn}{ \\textbf{输出:}}
\\renewcommand{\\abstractname}{\\heiti\\zihao{4} 摘\\quad 要}
\\renewcommand{\\contentsname}{\\centerline{\\songti\\bf\\zihao{3} 目\\quad 录}}
\\newcommand{\\xiaosi}{\\fontsize{12pt}{\\baselineskip}\\selectfont}
\\newcommand{\\sihao}{\\fontsize{14pt}{\\baselineskip}}
\\newcommand{\\wuhao}{\\fontsize{10.5pt}{10.5pt}\\selectfont}
\\newcommand{\\RNum}[1]{\\uppercase\\expandafter{\\romannumeral #1\\relax}}
\\renewcommand{\\baselinestretch}{1.5}
\\usepackage{fancyhdr}
\\pagestyle{fancy}

\\usepackage{hyperref}
\\hypersetup{colorlinks, bookmarks, unicode}
\\hypersetup{colorlinks=true,linkcolor=black,citecolor=black}
\\setcounter{tocdepth}{3}

\\usepackage{titletoc}
\\titlecontents{section}[5.2em]{\\songti\\zihao{4}\\vspace{0.25ex}}{\\contentslabel{5em}\\hspace*{-0.5cm}}{\\hspace*{-5em}}{~\\titlerule*[0.3pc]{$.$}~\\contentspage}
\\titlecontents{subsection}[3.4em]{\\songti\\zihao{4}\\vspace{0.25ex}}{\\contentslabel{2em}}{}{~\\titlerule*[0.3pc]{$.$}~\\contentspage}
\\titlecontents{subsubsection}[5.7em]{\\songti\\zihao{4}\\vspace{0.25ex}}{\\contentslabel{2.7em}}{}{~\\titlerule*[0.3pc]{$.$}~\\contentspage}

%% ==================== 论文信息 ====================
\\newcommand{\\thesistitle}{ {{#title}}{{title}}{{/title}}{{^title}}{{#metadata}}{{title}}{{/metadata}}{{/title}} }
\\newcommand{\\thesistitleen}{ {{#titleEn}}{{titleEn}}{{/titleEn}}{{^titleEn}}{{#metadata}}{{title_en}}{{/metadata}}{{/titleEn}} }
\\newcommand{\\authorname}{ {{#author}}{{author}}{{/author}}{{^author}}{{#metadata}}{{author_name}}{{/metadata}}{{/author}} }
\\newcommand{\\authornameen}{ {{#authorEn}}{{authorEn}}{{/authorEn}}{{^authorEn}}{{#metadata}}{{author_name}}{{/metadata}}{{/authorEn}} }
\\newcommand{\\majorname}{ {{#major}}{{major}}{{/major}}{{^major}}{{#metadata}}{{major}}{{/metadata}}{{/major}} }
\\newcommand{\\majornameen}{ {{#majorEn}}{{majorEn}}{{/majorEn}}{{^majorEn}}{{#metadata}}{{major}}{{/metadata}}{{/majorEn}} }
\\newcommand{\\supervisorname}{ {{#supervisor}}{{supervisor}}{{/supervisor}}{{^supervisor}}{{#metadata}}{{supervisor}}{{/metadata}}{{/supervisor}} }
\\newcommand{\\supervisornameen}{ {{#supervisorEn}}{{supervisorEn}}{{/supervisorEn}}{{^supervisorEn}}{{#metadata}}{{supervisor}}{{/metadata}}{{/supervisorEn}} }
\\newcommand{\\supervisortitle}{ {{#supervisorTitle}}{{supervisorTitle}}{{/supervisorTitle}}{{^supervisorTitle}}教授{{/supervisorTitle}} }
\\newcommand{\\gradeyear}{ {{#gradeYear}}{{gradeYear}}{{/gradeYear}}{{^gradeYear}}2022{{/gradeYear}} }

\\begin{document}
\\zihao{-4}

%% ==================== 封面 (外部 PDF) ====================
\\includepdf[pages={1,2,3,4}]{cover.pdf}

\\newpage
\\fancyhf{}
\\pagenumbering{Roman}
\\renewcommand{\\headrulewidth}{0pt}
\\fancyfoot[C]{\\zihao{5}\\thepage}
\\fancypagestyle{plain}{\\pagestyle{fancy}}

%% ==================== 中文摘要 ====================
\\begin{center}
\\underline{\\underline{\\kaishu\\zihao{-2}\\bf 南京大学研究生毕业论文中文摘要首页用纸}}
\\end{center}

\\noindent {\\zihao{4}\\kaishu 毕业论文题目：\\underline{\\makebox[12cm][l]{\\thesistitle}} \\vspace*{0.3cm}

\\noindent \\underline{\\hspace{\\textwidth}}

\\vspace*{0.3cm}

\\noindent \\underline{\\makebox[4cm][l]{\\majorname}}专业\\underline{\\makebox[3cm][c]{\\gradeyear}}级硕士生姓名：\\underline{\\makebox[4cm][l]{\\authorname}}

\\vspace*{0.3cm}

\\noindent 指导教师（姓名、职称）：\\underline{\\makebox[10cm][l]{\\supervisorname\\quad \\supervisortitle}}
}

\\quad

\\centerline{\\songti\\zihao{3}\\bf 摘要}
\\addcontentsline{toc}{section}{摘要}
\\vspace{12 pt}

{{#abstractCn}}{{{abstractCn}}}{{/abstractCn}}{{^abstractCn}}{{{abstract}}}{{/abstractCn}}

\\par\\vspace{1em}
\\noindent{\\heiti 关键词：}{{#keywordsCn}}{{keywordsCn}}{{/keywordsCn}}{{^keywordsCn}}{{keywords}}{{/keywordsCn}}

\\newpage

%% ==================== 英文摘要 ====================
\\begin{center}
\\underline{\\underline{\\kaishu\\zihao{-2}\\bf 南京大学研究生毕业论文英文摘要首页用纸}}
\\end{center}

\\vspace{12 pt}

{\\zihao{4}\\noindent\\myCalibri THESIS: \\thesistitleen

\\quad

\\noindent SPECIALIZATION: \\majornameen
\\vspace*{0.3cm}

\\noindent POSTGRADUATE: \\authornameen
\\vspace*{0.3cm}

\\noindent MENTOR: \\supervisornameen
}

\\quad

\\centerline{\\zihao{3}{\\textbf{\\textrm{Abstract}}}}
\\addcontentsline{toc}{section}{Abstract}
\\vspace{12 pt}

{{#abstractEn}}{{{abstractEn}}}{{/abstractEn}}{{^abstractEn}}{{{abstract_en}}}{{/abstractEn}}

\\par\\vspace{1em}
\\noindent\\textbf{Keywords:} {{#keywordsEn}}{{keywordsEn}}{{/keywordsEn}}{{^keywordsEn}}{{keywords_en}}{{/keywordsEn}}

\\newpage

%% ==================== 目录 ====================
{\\renewcommand{\\baselinestretch}{1}
\\begin{spacing}{1.5}
\\tableofcontents
\\end{spacing}
}

{{#hasSymbols}}
\\newpage
\\section*{符号及缩写语说明}
\\addcontentsline{toc}{section}{符号及缩写语说明}
\\zihao{-4}

{{{symbols}}}

{{/hasSymbols}}

%% ==================== 正文设置 ====================
\\CTEXsetup[name = {第,章},
number={\\chinese{section}}
]{section}

\\newpage
\\setcounter{page}{1}
\\fancyhf{}
\\pagenumbering{arabic}
\\renewcommand{\\headrulewidth}{0.8pt}
\\fancyhead[C]{\\zihao{5} \\thesistitle}
\\fancyfoot[C]{\\zihao{5}\\thepage}
\\fancypagestyle{plain}{\\pagestyle{fancy}}

{{#hasIntroduction}}
%% ==================== 引言 ====================
\\section*{引\\quad 言}
\\addcontentsline{toc}{section}{引\\quad 言}

{{{introduction}}}

\\newpage
{{/hasIntroduction}}

%% ==================== 正文章节 ====================
{{#chapters}}
{{#isLevel1}}
\\newpage
\\section{ {{title}} }
{{/isLevel1}}
{{#isLevel2}}
\\subsection{ {{title}} }
{{/isLevel2}}
{{#isLevel3}}
\\subsubsection{ {{title}} }
{{/isLevel3}}
{{#isLevel4}}
\\paragraph{ {{title}} }
{{/isLevel4}}

{{{content}}}

{{/chapters}}
{{^chapters}}
{{#sections}}
{{#isLevel1}}
\\newpage
\\section{ {{title}} }
{{/isLevel1}}
{{#isLevel2}}
\\subsection{ {{title}} }
{{/isLevel2}}
{{#isLevel3}}
\\subsubsection{ {{title}} }
{{/isLevel3}}
{{#isLevel4}}
\\paragraph{ {{title}} }
{{/isLevel4}}

{{{content}}}

{{/sections}}
{{/chapters}}

{{#hasConclusion}}
%% ==================== 结语 ====================
\\newpage
\\section*{结\\quad 语}
\\addcontentsline{toc}{section}{结\\quad 语}
\\zihao{-4}

{{{conclusion}}}

{{/hasConclusion}}

%% ==================== 参考文献 ====================
\\newpage
{\\zihao{5}
\\renewcommand{\\baselinestretch}{1}
\\begin{center}
\\begin{thebibliography}{99}
\\setlength{\\itemsep}{-0.75ex}
\\addcontentsline{toc}{section}{参考文献}
{{#references}}
\\bibitem{ {{key}} }
{{{citation}}}
{{/references}}
\\end{thebibliography}
\\end{center}
}

{{#hasAppendix}}
%% ==================== 附录 ====================
\\newpage
\\section*{附\\quad 录}
\\addcontentsline{toc}{section}{附\\quad 录}

{{{appendix}}}

{{/hasAppendix}}

{{#hasPublications}}
%% ==================== 在校期间发表论文情况 ====================
\\newpage
\\section*{在校期间发表论文情况、参与课题与获奖情况}
\\addcontentsline{toc}{section}{在校期间发表论文情况、参与课题与获奖情况}

{{{publications}}}

{{/hasPublications}}

{{#hasAcknowledgements}}
%% ==================== 致谢 ====================
\\newpage
\\section*{致\\quad 谢}
\\addcontentsline{toc}{section}{致\\quad 谢}
\\zihao{-4}

{{{acknowledgements}}}

{{/hasAcknowledgements}}

\\end{document}
`,
};
