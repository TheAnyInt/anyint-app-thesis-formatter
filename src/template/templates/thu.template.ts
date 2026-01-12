// Tsinghua University Undergraduate Thesis Template
// 清华大学本科学位论文 LaTeX 模板

export const thuTemplate = {
  id: 'thu',
  schoolId: 'thu',
  name: '清华大学本科学位论文',
  description: '清华大学本科学位论文 LaTeX 模板',
  requiredFields: [
    'title',
    'author',
    'major',
    'supervisor',
  ],
  requiredSections: [
    'abstract',
    'abstract_en',
    'sections',
  ],
  texContent: `% 清华大学本科学位论文 LaTeX 模板
% Tsinghua University Undergraduate Thesis Template
% Auto-generated from template

\\documentclass[12pt,a4paper,fontset=none]{ctexart}

% 页面设置
\\usepackage[top=3.8cm, bottom=3.2cm, left=3.2cm, right=3cm]{geometry}

% 字体设置
\\usepackage{fontspec}
\\setmainfont{Times New Roman}
\\setCJKmainfont{Songti SC}
\\setCJKsansfont{Heiti SC}
\\setCJKmonofont{PingFang SC}
\\newCJKfontfamily\\heiti{Heiti SC}
\\newCJKfontfamily\\songti{Songti SC}
\\newCJKfontfamily\\kaishu{STKaiti}

% 其他包
\\usepackage{titlesec}
\\usepackage{titletoc}
\\usepackage{fancyhdr}
\\usepackage{setspace}
\\usepackage{enumitem}
\\usepackage{graphicx}
\\usepackage{float}
\\usepackage[colorlinks=true,linkcolor=black,anchorcolor=black,citecolor=black,urlcolor=black,bookmarks=true,bookmarksnumbered=true]{hyperref}
\\usepackage{bookmark}

% 行距设置
\\setstretch{1.5}

% 章节标题格式
\\titleformat{\\section}{\\centering\\zihao{-3}\\heiti}{\\thesection}{1em}{}
\\titlespacing{\\section}{0pt}{40pt}{20pt}

\\titleformat{\\subsection}{\\zihao{4}\\heiti}{\\thesubsection}{1em}{}
\\titlespacing{\\subsection}{0pt}{25pt}{12pt}

\\titleformat{\\subsubsection}{\\zihao{-4}\\heiti}{\\thesubsubsection}{1em}{}
\\titlespacing{\\subsubsection}{0pt}{12pt}{6pt}

% 重定义section编号格式
\\renewcommand{\\thesection}{第\\chinese{section}章}
\\renewcommand{\\thesubsection}{\\arabic{section}.\\arabic{subsection}}
\\renewcommand{\\thesubsubsection}{\\arabic{section}.\\arabic{subsection}.\\arabic{subsubsection}}

% 页眉页脚
\\pagestyle{fancy}
\\fancyhf{}
\\fancyhead[C]{\\zihao{5}清华大学本科学位论文}
\\fancyfoot[C]{\\thepage}
\\renewcommand{\\headrulewidth}{0.4pt}

% 目录格式
\\titlecontents{section}[0em]{\\zihao{-4}\\heiti}{\\thecontentslabel\\quad}{}{\\titlerule*[0.5pc]{.}\\contentspage}
\\titlecontents{subsection}[2em]{\\zihao{-4}}{\\thecontentslabel\\quad}{}{\\titlerule*[0.5pc]{.}\\contentspage}

% 论文信息
\\newcommand{\\thesistitle}{ {{#title}}{{title}}{{/title}}{{^title}}{{#metadata}}{{title}}{{/metadata}}{{/title}} }
\\newcommand{\\authorname}{ {{#author}}{{author}}{{/author}}{{^author}}{{#metadata}}{{author_name}}{{/metadata}}{{/author}} }
\\newcommand{\\majorname}{ {{#major}}{{major}}{{/major}}{{^major}}{{#metadata}}{{major}}{{/metadata}}{{/major}} }
\\newcommand{\\departmentname}{ {{#department}}{{department}}{{/department}}{{^department}}{{#metadata}}{{school}}{{/metadata}}{{/department}} }
\\newcommand{\\supervisorname}{ {{#supervisor}}{{supervisor}}{{/supervisor}}{{^supervisor}}{{#metadata}}{{supervisor}}{{/metadata}}{{/supervisor}} }
\\newcommand{\\thesisyear}{ {{#year}}{{year}}{{/year}}{{^year}}\\the\\year{{/year}} }
\\newcommand{\\thesismonth}{ {{#month}}{{month}}{{/month}}{{^month}}\\the\\month{{/month}} }

\\begin{document}

% ==================== 封面 ====================
\\thispagestyle{empty}
\\begin{center}
\\vspace*{2cm}

{\\zihao{-0}\\heiti 清华大学}

\\vspace{1cm}

{\\zihao{2}\\heiti 本科学位论文}

\\vspace{3cm}

{\\zihao{2}\\heiti\\thesistitle}

\\vspace{4cm}

{\\zihao{4}
\\begin{tabular}{rl}
系\\hspace{2em}别： & \\departmentname \\\\[0.5em]
专\\hspace{2em}业： & \\majorname \\\\[0.5em]
姓\\hspace{2em}名： & \\authorname \\\\[0.5em]
指导教师： & \\supervisorname \\\\
\\end{tabular}
}

\\vspace{3cm}

{\\zihao{4} \\thesisyear 年 \\thesismonth 月}

\\end{center}
\\newpage

% ==================== 授权说明 ====================
\\thispagestyle{empty}
\\begin{center}
{\\zihao{-3}\\heiti 关于学位论文使用授权的说明}
\\end{center}
\\vspace{1cm}

本人完全了解清华大学有关保留、使用学位论文的规定，即：

学校有权保留并向国家有关部门或机构送交论文的复印件和电子版，允许论文被查阅和借阅；学校可以公布论文的全部或部分内容，可以采用影印、缩印或其他复制手段保存论文。

\\vspace{2cm}

\\begin{flushright}
签 名：\\underline{\\hspace{4cm}} \\quad 导师签名：\\underline{\\hspace{4cm}}

日 期：\\underline{\\hspace{6cm}}
\\end{flushright}
\\newpage

% ==================== 中文摘要 ====================
\\thispagestyle{empty}
\\begin{center}
{\\zihao{-3}\\heiti 摘\\quad 要}
\\end{center}
\\vspace{1cm}

{{#abstract}}{{{abstract}}}{{/abstract}}

\\vspace{1cm}

\\noindent\\textbf{关键词：}{{keywords}}
\\newpage

% ==================== 英文摘要 ====================
\\thispagestyle{empty}
\\begin{center}
{\\zihao{-3}\\heiti ABSTRACT}
\\end{center}
\\vspace{1cm}

{{#abstract_en}}{{{abstract_en}}}{{/abstract_en}}

\\vspace{1cm}

\\noindent\\textbf{Keywords:} {{keywords_en}}
\\newpage

% ==================== 目录 ====================
\\thispagestyle{empty}
\\tableofcontents
\\newpage

% ==================== 正文 ====================
\\setcounter{page}{1}

{{#sections}}
{{#isLevel1}}
\\section{ {{title}} }
{{/isLevel1}}
{{#isLevel2}}
\\subsection{ {{title}} }
{{/isLevel2}}
{{#isLevel3}}
\\subsubsection{ {{title}} }
{{/isLevel3}}

{{{content}}}

{{/sections}}

%% 图片已在正文中内联显示（由 LLM 生成 LaTeX figure 代码）

% ==================== 参考文献 ====================
\\newpage
\\section*{参考文献}
\\addcontentsline{toc}{section}{参考文献}

{{#references}}{{{references}}}{{/references}}

{{#hasAcknowledgements}}
% ==================== 致谢 ====================
\\newpage
\\section*{致\\quad 谢}
\\addcontentsline{toc}{section}{致谢}

{{{acknowledgements}}}
{{/hasAcknowledgements}}

% ==================== 声明 ====================
\\newpage
\\section*{声\\quad 明}
\\addcontentsline{toc}{section}{声明}

本人郑重声明：所呈交的学位论文，是本人在导师指导下，独立进行研究工作所取得的成果。除文中已经注明引用的内容外，本论文不包含任何其他个人或集体已经发表或撰写过的研究成果。对本文的研究做出贡献的个人和集体，均已在文中以明确方式标明。本人完全意识到本声明的法律结果由本人承担。

\\vspace{2cm}

\\begin{flushright}
学位论文作者签名：\\underline{\\hspace{4cm}}

日期：\\underline{\\hspace{2cm}}年\\underline{\\hspace{1.5cm}}月\\underline{\\hspace{1.5cm}}日
\\end{flushright}

\\end{document}
`,
};
