// NJU Life Sciences Master Thesis Template
// 南京大学生命科学学院硕士学位论文 LaTeX 模板

export const njulifeTemplate = {
  id: 'njulife',
  schoolId: 'njulife',
  name: '南京大学生命科学学院硕士学位论文',
  description: '基于《南大生科院硕士学位论文写作要求格式-2025.9更新》制作的LaTeX模板',
  requiredFields: [
    'title',
    'titleEn',
    'author',
    'authorEn',
    'major',
    'majorEn',
    'supervisor',
    'supervisorEn',
  ],
  requiredSections: [
    'abstractCn',
    'abstractEn',
    'chapters',
  ],
  // Shared fonts from templates/shared/
  assets: [
    'simsun.ttc',
  ],
  texContent: `% 南京大学生命科学学院硕士学位论文 LaTeX 模板
% NJU Life Sciences Master Thesis Template
% Auto-generated from template

\\documentclass[a4paper,zihao=-4,openany,oneside]{ctexbook}

%% ==================== 宏包加载 ====================
\\RequirePackage{geometry}
\\RequirePackage{fancyhdr}
\\RequirePackage{titlesec}
\\RequirePackage{titletoc}
\\RequirePackage{graphicx}
\\RequirePackage{booktabs}
\\RequirePackage{longtable}
\\RequirePackage{multirow}
\\RequirePackage{amsmath,amssymb,amsthm}
\\RequirePackage{hyperref}
\\RequirePackage{xcolor}
\\RequirePackage{enumitem}
\\RequirePackage{caption}
\\RequirePackage{float}
\\RequirePackage{setspace}
\\RequirePackage{zhnumber}
\\RequirePackage{array}

%% ==================== 页面设置 ====================
\\geometry{
    top=3cm,
    bottom=2.5cm,
    left=3cm,
    right=2.5cm,
    headheight=15pt,
    headsep=1em,
    footskip=1.5cm
}

%% ==================== 字体设置 ====================
% 英文使用默认Latin Modern字体 (tectonic自带，无需指定)
% 中文使用bundled字体文件
\\setCJKmainfont{simsun.ttc}[AutoFakeBold=2.5]
\\setCJKsansfont{simhei.ttf}[AutoFakeBold=2.5]

%% ==================== 字号命令 ====================
\\newcommand{\\chuhao}{\\fontsize{42pt}{50.4pt}\\selectfont}
\\newcommand{\\xiaochu}{\\fontsize{36pt}{43.2pt}\\selectfont}
\\newcommand{\\yihao}{\\fontsize{26pt}{31.2pt}\\selectfont}
\\newcommand{\\xiaoyi}{\\fontsize{24pt}{28.8pt}\\selectfont}
\\newcommand{\\erhao}{\\fontsize{22pt}{26.4pt}\\selectfont}
\\newcommand{\\xiaoer}{\\fontsize{18pt}{21.6pt}\\selectfont}
\\newcommand{\\sanhao}{\\fontsize{16pt}{19.2pt}\\selectfont}
\\newcommand{\\xiaosan}{\\fontsize{15pt}{18pt}\\selectfont}
\\newcommand{\\sihao}{\\fontsize{14pt}{16.8pt}\\selectfont}
\\newcommand{\\banxiaosi}{\\fontsize{13pt}{15.6pt}\\selectfont}
\\newcommand{\\xiaosi}{\\fontsize{12pt}{14.4pt}\\selectfont}
\\newcommand{\\dawu}{\\fontsize{11pt}{13.2pt}\\selectfont}
\\newcommand{\\wuhao}{\\fontsize{10.5pt}{12.6pt}\\selectfont}
\\newcommand{\\xiaowu}{\\fontsize{9pt}{10.8pt}\\selectfont}
\\newcommand{\\liuhao}{\\fontsize{7.5pt}{9pt}\\selectfont}

%% ==================== 论文信息 ====================
% Support both direct fields and nested metadata fields from extraction
\\newcommand{\\thesistitle}{ {{#title}}{{title}}{{/title}}{{^title}}{{#metadata}}{{title}}{{/metadata}}{{/title}} }
\\newcommand{\\thesistitleen}{ {{#titleEn}}{{titleEn}}{{/titleEn}}{{^titleEn}}{{#metadata}}{{title_en}}{{/metadata}}{{/titleEn}} }
\\newcommand{\\authorname}{ {{#author}}{{author}}{{/author}}{{^author}}{{#metadata}}{{author_name}}{{/metadata}}{{/author}} }
\\newcommand{\\authornameen}{ {{#authorEn}}{{authorEn}}{{/authorEn}}{{^authorEn}}{{#metadata}}{{author_name}}{{/metadata}}{{/authorEn}} }
\\newcommand{\\majorname}{ {{#major}}{{major}}{{/major}}{{^major}}{{#metadata}}{{major}}{{/metadata}}{{/major}} }
\\newcommand{\\majornameen}{ {{#majorEn}}{{majorEn}}{{/majorEn}}{{^majorEn}}{{#metadata}}{{major}}{{/metadata}}{{/majorEn}} }
\\newcommand{\\supervisorname}{ {{#supervisor}}{{supervisor}}{{/supervisor}}{{^supervisor}}{{#metadata}}{{supervisor}}{{/metadata}}{{/supervisor}} }
\\newcommand{\\supervisornameen}{ {{#supervisorEn}}{{supervisorEn}}{{/supervisorEn}}{{^supervisorEn}}{{#metadata}}{{supervisor}}{{/metadata}}{{/supervisorEn}} }
\\newcommand{\\supervisortitle}{ {{#supervisorTitle}}{{supervisorTitle}}{{/supervisorTitle}}{{^supervisorTitle}}教授{{/supervisorTitle}} }
\\newcommand{\\studentid}{ {{#studentId}}{{studentId}}{{/studentId}}{{^studentId}}{{#metadata}}{{student_id}}{{/metadata}}{{/studentId}} }
\\newcommand{\\researchdirection}{ {{#researchDirection}}{{researchDirection}}{{/researchDirection}} }
\\newcommand{\\thesisyear}{ {{#year}}{{year}}{{/year}}{{^year}}\\the\\year{{/year}} }
\\newcommand{\\thesismonth}{ {{#month}}{{month}}{{/month}}{{^month}}\\the\\month{{/month}} }

%% ==================== 页眉页脚设置 ====================
\\pagestyle{fancy}
\\fancyhf{}
\\fancyhead[C]{\\wuhao\\thesistitle}
\\fancyfoot[C]{\\thepage}
\\renewcommand{\\headrulewidth}{0.4pt}

\\fancypagestyle{plain}{
    \\fancyhf{}
    \\fancyhead[C]{\\wuhao\\thesistitle}
    \\fancyfoot[C]{\\thepage}
    \\renewcommand{\\headrulewidth}{0.4pt}
}

%% ==================== 章节标题格式 ====================
\\ctexset{
    chapter = {
        format = \\centering\\sanhao\\bfseries,
        name = {第,章},
        number = \\chinese{chapter},
        aftername = \\quad,
        beforeskip = 24pt,
        afterskip = 18pt,
        pagestyle = plain
    },
    section = {
        format = \\sihao\\bfseries,
        aftername = \\quad,
        beforeskip = 12pt,
        afterskip = 6pt
    },
    subsection = {
        format = \\xiaosi\\bfseries,
        aftername = \\quad,
        beforeskip = 6pt,
        afterskip = 6pt
    }
}

%% ==================== 目录格式 ====================
\\renewcommand{\\contentsname}{\\centerline{\\sanhao\\bfseries 目\\quad 录}}

\\titlecontents{chapter}[0pt]
    {\\sihao\\vspace{6pt}}
    {\\thecontentslabel\\quad}
    {}
    {\\titlerule*[0.5pc]{.}\\contentspage}

\\titlecontents{section}[2em]
    {\\sihao}
    {\\thecontentslabel\\quad}
    {}
    {\\titlerule*[0.5pc]{.}\\contentspage}

\\titlecontents{subsection}[4em]
    {\\sihao}
    {\\thecontentslabel\\quad}
    {}
    {\\titlerule*[0.5pc]{.}\\contentspage}

%% ==================== 超链接设置 ====================
\\hypersetup{
    colorlinks=true,
    linkcolor=black,
    citecolor=black,
    urlcolor=blue,
    bookmarksnumbered=true,
    pdfstartview=FitH,
    plainpages=false,
    pdfpagelabels=true
}

%% ==================== 行距设置 ====================
\\linespread{1.5}

%% ==================== 列表设置 ====================
\\setlist{noitemsep,topsep=0pt,parsep=0pt,partopsep=0pt}

%% ==================== 图表标题设置 ====================
\\captionsetup{
    font=small,
    labelsep=quad,
    skip=6pt
}
\\captionsetup[figure]{name=图,labelfont=bf}
\\captionsetup[table]{name=表,labelfont=bf}

%% ==================== 文档开始 ====================
\\begin{document}

%% ==================== 封面 ====================
\\thispagestyle{empty}
\\begin{center}
    \\begin{tabular}{p{6cm}p{6cm}}
        学校代码：\\underline{\\makebox[3cm][c]{10284}} & \\\\
        分类号：\\underline{\\makebox[3cm][c]{ {{#classificationNumber}}{{classificationNumber}}{{/classificationNumber}} }} & \\\\
        密\\quad 级：\\underline{\\makebox[3cm][c]{ {{#secretLevel}}{{secretLevel}}{{/secretLevel}}{{^secretLevel}}公开{{/secretLevel}} }} & \\\\
        UDC：\\underline{\\makebox[3cm][c]{ {{#udc}}{{udc}}{{/udc}} }} & \\\\
        学\\quad 号：\\underline{\\makebox[3cm][c]{\\studentid}} & \\\\
    \\end{tabular}

    \\vspace{2cm}
    {\\erhao\\bfseries 硕~士~学~位~论~文}
    \\vspace{2cm}
    {\\xiaoer\\bfseries\\thesistitle}
    \\vspace{3cm}

    \\begin{tabular}{>{\\sihao}r >{\\sihao}l}
        作者姓名 & \\underline{\\makebox[6cm][c]{\\authorname}} \\\\[12pt]
        专业名称 & \\underline{\\makebox[6cm][c]{\\majorname}} \\\\[12pt]
        研究方向 & \\underline{\\makebox[6cm][c]{\\researchdirection}} \\\\[12pt]
        导师姓名 & \\underline{\\makebox[6cm][c]{\\supervisorname}} \\\\[12pt]
    \\end{tabular}

    \\vfill
    {\\sihao \\thesisyear 年\\quad \\thesismonth 月\\quad 日}
\\end{center}
\\clearpage

%% ==================== 内封面 ====================
\\thispagestyle{empty}
\\begin{center}
    {\\xiaosi 南京大学硕士学位论文}
    \\vspace{2cm}
    {\\xiaoer\\bfseries\\thesistitle}
    \\vspace{1cm}
    {\\sihao\\thesistitleen}
    \\vspace{3cm}

    \\begin{tabular}{>{\\sihao}r >{\\sihao}l}
        作者： & \\authorname \\\\[12pt]
        导师： & \\supervisorname\\quad \\supervisortitle \\\\[12pt]
    \\end{tabular}

    \\vfill
    {\\sihao 生命科学学院}
    {\\sihao \\thesisyear 年\\thesismonth 月\\quad 南京}
\\end{center}
\\clearpage

%% ==================== 原创性声明 ====================
\\chapter*{南京大学学位论文原创性声明}
\\addcontentsline{toc}{chapter}{南京大学学位论文原创性声明}

本人郑重声明，所提交的学位论文是本人在导师指导下独立进行科学研究工作所取得的成果。除本论文中已经注明引用的内容外，本论文不包含其他个人或集体已经发表或撰写过的研究成果，也不包含为获得南京大学或其他教育机构的学位证书而使用过的材料。对本文的研究做出重要贡献的个人和集体，均已在论文的致谢部分明确标明。

本人郑重声明愿承担本声明的法律责任。

\\vspace{2cm}
\\begin{flushright}
    签名：\\underline{\\makebox[4cm][c]{}} \\\\[12pt]
    日期：\\underline{\\makebox[4cm][c]{}} \\\\
\\end{flushright}
\\clearpage

%% ==================== 前置部分 ====================
\\frontmatter
\\pagenumbering{Roman}

%% ==================== 目录 ====================
\\tableofcontents
\\clearpage

%% ==================== 中文摘要 ====================
\\chapter*{摘\\quad 要}
\\addcontentsline{toc}{chapter}{摘要}

{{#abstractCn}}{{{abstractCn}}}{{/abstractCn}}{{^abstractCn}}{{{abstract}}}{{/abstractCn}}

\\par\\vspace{1em}
\\noindent\\textbf{关键词：}{{#keywordsCn}}{{keywordsCn}}{{/keywordsCn}}{{^keywordsCn}}{{keywords}}{{/keywordsCn}}
\\clearpage

%% ==================== 英文摘要 ====================
\\chapter*{ABSTRACT}
\\addcontentsline{toc}{chapter}{ABSTRACT}

{\\noindent\\textbf{THESIS:} \\thesistitleen}

{\\noindent\\textbf{SPECIALIZATION:} \\majornameen}

{\\noindent\\textbf{POSTGRADUATE:} \\authornameen}

{\\noindent\\textbf{MENTOR:} \\supervisornameen}

\\vspace{1em}

{{#abstractEn}}{{{abstractEn}}}{{/abstractEn}}{{^abstractEn}}{{{abstract_en}}}{{/abstractEn}}

\\par\\vspace{1em}
\\noindent\\textbf{Keywords:} {{#keywordsEn}}{{keywordsEn}}{{/keywordsEn}}{{^keywordsEn}}{{keywords_en}}{{/keywordsEn}}
\\clearpage

{{#hasSymbols}}
%% ==================== 符号及缩写语说明 ====================
\\chapter*{符号及缩写语说明}
\\addcontentsline{toc}{chapter}{符号及缩写语说明}

{{{symbols}}}

\\clearpage
{{/hasSymbols}}

%% ==================== 正文部分 ====================
\\mainmatter
\\pagenumbering{arabic}

{{#chapters}}
%% ==================== 章节 ====================
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
%% ==================== 章节 ====================
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

%% 图片已在正文中内联显示（由 LLM 生成 LaTeX figure 代码）

%% ==================== 参考文献 ====================
\\addcontentsline{toc}{chapter}{参考文献}
\\begin{thebibliography}{99}
{{#references}}
\\bibitem{ {{key}} }
{{{citation}}}
{{/references}}
\\end{thebibliography}

{{#hasAppendix}}
%% ==================== 附录 ====================
\\chapter*{附\\quad 录}
\\addcontentsline{toc}{chapter}{附录}

{{{appendix}}}

\\clearpage
{{/hasAppendix}}

{{#hasAcknowledgements}}
%% ==================== 致谢 ====================
\\chapter*{致\\quad 谢}
\\addcontentsline{toc}{chapter}{致谢}

{{{acknowledgements}}}

\\clearpage
{{/hasAcknowledgements}}

\\end{document}
`,
};
