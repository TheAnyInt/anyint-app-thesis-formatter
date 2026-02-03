// SCUT Thesis Template
// 华南理工大学博士学位论文 LaTeX 模板

export const scutTemplate = {
  id: 'scut',
  schoolId: 'scut',
  name: '华南理工大学博士学位论文',
  description: '华南理工大学博士/硕士学位论文 LaTeX 模板 (SCUTthesis)',
  requiredFields: [
    'title',
    'titleEn',
    'author',
    'major',
    'supervisor',
    'department',
  ],
  requiredSections: [
    'abstractCn',
    'abstractEn',
    'chapters',
  ],
  assets: [
    'SCUTthesis.cls',
    'SCUTthesis_bibliographystyle.bst',
    'TITLEPAGE/FIGs/SCUTemblem.png',
    'simsun.ttc',
    'simhei.ttf',
    'kaiti_GB2312.TTF',
  ],
  texContent: `%%
%% 华南理工大学博士/硕士学位论文 LaTeX 模板
%% SCUTThesis - Auto-generated from template with Mustache placeholders
%%
\\documentclass[unicode]{SCUTthesis}
\\usepackage{fontspec}
\\usepackage{setspace}
\\usepackage{ulem}
\\usepackage{CJKulem}
\\usepackage{fix-cm}
\\usepackage{comment}
\\usepackage{xcolor}
\\usepackage{array}
\\usepackage{longtable}
\\usepackage{multirow}
\\usepackage{booktabs}
\\usepackage{graphicx}
\\usepackage{subfig}
\\usepackage{amsmath,dsfont,amssymb}
\\usepackage{mathrsfs}
\\usepackage{bm}
\\usepackage{amstext}
\\usepackage{pifont}
\\usepackage{algorithmic}
\\usepackage[colorlinks=true,plainpages=false,pdfpagelabels]{hyperref}
\\usepackage{bookmark}
\\usepackage{float}
\\usepackage{caption}
\\usepackage{amsthm}
\\usepackage[UTF8,fontset=none]{ctex}  % fontset=none to avoid redefining \\songti etc.

%% 超链接设置
\\hypersetup{
 linkcolor=blue, citecolor=blue, urlcolor=blue,
 anchorcolor=blue, filecolor=magenta, menucolor=red,
 unicode=true, breaklinks=false,
 bookmarksnumbered=true, bookmarksopen=true,
 pdfborder={0 0 1}, pdfstartview=FitH,
 pdftitle={ {{#title}}{{title}}{{/title}}{{^title}}论文题目{{/title}} },
 pdfauthor={ {{#author}}{{author}}{{/author}}{{^author}}作者姓名{{/author}} },
 pdfsubject={华南理工大学{{#degree}}{{degree}}{{/degree}}{{^degree}}博士{{/degree}}学位论文},
}

\\makeatletter
%% 自定义指定长度的下划线
\\newcommand\\dlmu[2][150mm]{\\hskip1pt\\underline{\\hb@xt@ #1{\\hss#2\\hss}}\\hskip3pt}
%% 参考文献序号对齐方式
\\renewcommand{\\@biblabel}[1]{[#1]\\hfill}
\\providecommand{\\tabularnewline}{\\\\}
\\makeatother

%% 定义单盲/双盲评审格式
\\newif\\ifSingleBlindReview
\\SingleBlindReviewtrue % 单盲评审格式【即最终上交格式】

\\begin{document}

\\institute{华南理工大学}
\\degree{ {{#degree}}{{degree}}{{/degree}}{{^degree}}博士{{/degree}} }
\\submitdate{ {{#submitDate}}{{submitDate}}{{/submitDate}}{{^submitDate}}{\\the\\year}~年~{\\the\\month}~月~{\\the\\day}~日{{/submitDate}} }

%================================================================================
%% 封面
%================================================================================
\\clearpage
\\pagestyle{empty}

\\begin{center}
\\noindent

\\vspace{2.5cm}

\\begin{figure}[!h]
  \\centering
  \\includegraphics[width=12.1cm,height=2.76cm]{TITLEPAGE/FIGs/SCUTemblem}
\\end{figure}

\\vspace{0.5em}
{\\heiti\\chuhao
\\makebox[9.1cm][s]{\\thesissubject}
}\\\\

\\noindent\\rule{\\textwidth}{0.4pt}

\\vspace{1.5cm}

% 论文题目
{\\heiti\\erhao
   \\uline{\\hfill{ {{#title}}{{title}}{{/title}}{{^title}}论文题目{{/title}} }\\hfill}
}

\\vspace{3cm}
\\end{center}

\\ifSingleBlindReview
%% 单盲评审/终版提交封面
\\begin{minipage}[!h]{0.75\\linewidth}
\\centering
\\heiti\\sanhao
\\makebox[4cm][s]{作者姓名}~~\\uline{\\hfill{ {{#author}}{{author}}{{/author}}{{^author}}作者姓名{{/author}} }\\hfill}\\hfill\\\\
\\makebox[4cm][s]{学科专业}~~\\uline{\\hfill{ {{#major}}{{major}}{{/major}}{{^major}}专业名称{{/major}} }\\hfill}\\hfill\\\\
\\makebox[4cm][s]{指导教师}~~\\uline{\\hfill{ {{#supervisor}}{{supervisor}}{{/supervisor}}{{^supervisor}}导师姓名{{/supervisor}} }\\hfill}\\hfill\\\\
\\makebox[4cm][s]{所在学院}~~\\uline{\\hfill{ {{#department}}{{department}}{{/department}}{{^department}}学院名称{{/department}} }\\hfill}\\hfill\\\\
\\makebox[4cm][s]{论文提交日期}~~\\uline{\\hfill{\\thesissubmitdate}\\hfill}\\hfill\\\\
\\end{minipage}
\\fi

\\vfill

\\ifSingleBlindReview
%% 英文内封
\\newpage
\\begin{center}
\\noindent

\\vspace{4cm}

%% 论文的英文标题
\\textbf{\\xiaoerhao
{{#titleEn}}{{titleEn}}{{/titleEn}}{{^titleEn}}English Title{{/titleEn}}
}

\\vspace{2cm}

{\\sihao
A Dissertation Submitted for the Degree of {{#degreeEn}}{{degreeEn}}{{/degreeEn}}{{^degreeEn}}Doctor of Philosophy{{/degreeEn}}
}

\\vspace{3cm}

\\begin{minipage}[!h]{0.4\\linewidth}
\\raggedright
\\textbf{\\xiaosanhao
\\makebox[2.8cm][s]{Candidate:}  {{#authorEn}}{{authorEn}}{{/authorEn}}{{^authorEn}}Author Name{{/authorEn}} \\hfill\\\\
\\makebox[2.8cm][s]{Supervisor:}  {{#supervisorEn}}{{supervisorEn}}{{/supervisorEn}}{{^supervisorEn}}Prof. Supervisor Name{{/supervisorEn}} \\hfill\\\\
}
\\end{minipage}

\\vspace{3.5cm}

{\\xiaosanhao
South China University of Technology \\par
Guangzhou, China
}

\\end{center}

\\vfill

%% 题名页
\\newpage
\\null

\\begin{flushleft}
\\noindent
\\textbf{\\heiti\\sihao
分类号：{{#clc}}{{clc}}{{/clc}}{{^clc}}TP242{{/clc}} {\\hfill}
学校代号：10561
{\\\\}
学{\\quad}号：{{#studentId}}{{studentId}}{{/studentId}}{{^studentId}}20**********{{/studentId}}
}
\\end{flushleft}

\\vspace{2.5cm}

\\begin{center}
{\\heiti\\xiaoerhao
华南理工大学{\\thesissubject}
}

\\vspace{2cm}

%% 论文题名和副题名
\\textbf{\\heiti\\xiaoyihao
华南理工大学{{#degree}}{{degree}}{{/degree}}{{^degree}}博士{{/degree}}学位论文
{\\\\}{\\vspace{0.5em}}
{{#title}}{{title}}{{/title}}{{^title}}论文题目{{/title}}
}
\\end{center}

\\vspace{3.5cm}

\\begin{minipage}[!h]{14cm}
\\raggedright
\\songti\\wuhao
\\makebox[7cm][s]{作者姓名：{{#author}}{{author}}{{/author}}{{^author}}作者姓名{{/author}} {\\hfill}}%
\\makebox[7cm][s]{指导教师姓名、职称：{{#supervisor}}{{supervisor}}{{/supervisor}}{{^supervisor}}导师姓名{{/supervisor}} {\\hfill}} \\\\
\\makebox[7cm][s]{申请学位级别：{{#degreeName}}{{degreeName}}{{/degreeName}}{{^degreeName}}工学博士{{/degreeName}} {\\hfill}}%
\\makebox[7cm][s]{学科专业名称：{{#major}}{{major}}{{/major}}{{^major}}专业名称{{/major}} {\\hfill}} \\\\
\\makebox[14cm][s]{研究方向：{{#field}}{{field}}{{/field}}{{^field}}研究方向{{/field}} {\\hfill}} \\\\
\\makebox[7cm][s]{论文提交日期：{\\thesissubmitdate}{\\hfill}}%
\\makebox[7cm][s]{论文答辩日期：{{#defendDate}}{{defendDate}}{{/defendDate}}{{^defendDate}}{\\qquad}年{~~}月{~~}日{{/defendDate}}{\\hfill}} \\\\
\\makebox[7cm][s]{学位授予单位：华南理工大学 {\\hfill}}%
\\makebox[7cm][s]{学位授予日期：{{#grantDate}}{{grantDate}}{{/grantDate}}{{^grantDate}}{\\qquad}年{~~}月{~~}日{{/grantDate}}{\\hfill}} \\\\
{{#chairman}}
\\makebox[14cm][s]{答辩委员会成员：{\\hfill}} \\\\
\\makebox[4cm][s]{主席：\\uline{\\qquad {{chairman}} \\hfill}} \\\\
{{/chairman}}
{{#committee}}
\\makebox[13cm][s]{委员：\\uline{\\qquad {{committee}} \\hfill}} \\\\
{{/committee}}
\\end{minipage}

\\vfill

%% 原创性声明
\\newpage
\\null

\\begin{center}
\\noindent
\\textbf{\\songti\\erhao
华南理工大学
{\\\\}
学位论文原创性声明
}
\\end{center}

{%
\\raggedright
\\parindent=1cm
\\songti\\sihao
\\baselineskip=20pt
本人郑重声明：所呈交的论文是本人在导师的指导下独立进行研究所取得的研究成果。除了文中特别加以标注引用的内容外，本论文不包含任何其他个人或集体已经发表或撰写的成果作品。对本文的研究做出重要贡献的个人和集体，均已在文中以明确方式标明。本人完全意识到本声明的法律后果由本人承担。

\\bigskip
作者签名：\\makebox[5cm][s]{\\hfill}
日期：{{#signDate}}{{signDate}}{{/signDate}}{{^signDate}}{\\qquad}年{\\qquad}月{\\qquad}日{{/signDate}}
}%

%% 使用授权书
\\bigskip
\\begin{center}
\\noindent
\\textbf{\\songti\\erhao
学位论文版权使用授权书
}
\\end{center}

{%
\\raggedright
\\parindent=1cm
\\songti\\sihao
\\baselineskip=20pt
本学位论文作者完全了解学校有关保留、使用学位论文的规定，即：研究生在校攻读学位期间论文工作的知识产权单位属华南理工大学。学校有权保存并向国家有关部门或机构送交论文的复印件和电子版，允许学位论文被查阅（除在保密期内的保密论文外）；学校可以公布学位论文的全部或部分内容，可以允许采用影印、缩印或其它复制手段保存、汇编学位论文。本人电子文档的内容和纸质论文的内容相一致。

本学位论文属于：

$\\Box$保密（校保密委员会审定为涉密学位论文时间：{\\underline{\\;~\\quad}年\\underline{\\quad}月\\underline{\\quad}日}），于{\\underline{\\qquad} 年\\underline{\\quad}月\\underline{\\quad}日}解密后适用本授权书。

$\\Box$不保密,同意在校园网上发布，供校内师生和与学校有共享协议的单位浏览；同意将本人学位论文编入有关数据库进行检索，传播学位论文的全部或部分内容。

{\\quad}（请在以上相应方框内打"$\\surd$"）

\\bigskip
作者签名：{\\qquad}\\makebox[5cm][s]{\\hfill}
日期：{\\hfill}\\par
指导教师签名：\\makebox[5cm][s]{\\hfill}
日期：{\\hfill}\\par
作者联系电话：\\makebox[5cm][s]{\\hfill}
电子邮箱：{\\hfill}\\par
联系地址(含邮编)：
}%

\\vfill
\\fi

\\baselineskip=1\\baselineskip
\\normalsize

%================================================================================
%% 中英文摘要
%================================================================================
\\frontmatter

%% 中文摘要
\\begin{abstractCN}
{{#abstractCn}}{{{abstractCn}}}{{/abstractCn}}{{^abstractCn}}{{{abstract}}}{{/abstractCn}}
\\end{abstractCN}

%% 中文关键词
\\keywordsCN{%
{{#keywordsCn}}{{keywordsCn}}{{/keywordsCn}}{{^keywordsCn}}{{keywords}}{{/keywordsCn}}
}%

%% 英文摘要
\\begin{abstractEN}
{{#abstractEn}}{{{abstractEn}}}{{/abstractEn}}{{^abstractEn}}{{{abstract_en}}}{{/abstractEn}}
\\end{abstractEN}

%% 英文关键词
\\keywordsEN{%
{{#keywordsEn}}{{keywordsEn}}{{/keywordsEn}}{{^keywordsEn}}{{keywords_en}}{{/keywordsEn}}
}%

%================================================================================
%% 目录
%================================================================================
\\tableofcontents
\\addcontentsline{toc}{chapter}{目录}

%% 表格清单
\\listoftables

%% 插图清单
\\listoffigures

%================================================================================
%% 正文
%================================================================================
\\mainmatter

{{#hasIntroduction}}
\\chapter*{引言}
\\addcontentsline{toc}{chapter}{引言}

{{{introduction}}}

{{/hasIntroduction}}

%% 正文章节
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

%================================================================================
%% 结论、参考文献、致谢
%================================================================================
\\backmatter

{{#hasConclusion}}
%% 结论
\\chapter*{结论}
\\addcontentsline{toc}{chapter}{结论}

{{{conclusion}}}

{{/hasConclusion}}

%% 参考文献
\\chapter*{参考文献}
\\addcontentsline{toc}{chapter}{参考文献}
\\begin{thebibliography}{99}
{{#referencesArray}}
\\bibitem{ {{key}} }
{{{citation}}}
{{/referencesArray}}
\\end{thebibliography}

{{#hasPublications}}
%% 攻读学位期间取得的研究成果
\\chapter*{攻读{{#degree}}{{degree}}{{/degree}}{{^degree}}博士{{/degree}}学位期间取得的研究成果}
\\addcontentsline{toc}{chapter}{攻读{{#degree}}{{degree}}{{/degree}}{{^degree}}博士{{/degree}}学位期间取得的研究成果}

{{{publications}}}

{{/hasPublications}}

{{#hasAcknowledgements}}
%% 致谢
\\chapter*{致谢}
\\addcontentsline{toc}{chapter}{致谢}

{{{acknowledgements}}}

{{/hasAcknowledgements}}

{{#hasAppendix}}
%% 附录
\\appendix

{{{appendix}}}

{{/hasAppendix}}

\\end{document}
`,
};
