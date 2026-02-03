// NJU Thesis Template (njuthesis v1.4.3)
// 南京大学学位论文 LaTeX 模板 (官方 njuthesis 宏包)

export const njuthesisTemplate = {
  id: 'njuthesis',
  schoolId: 'nju',
  name: '南京大学学位论文 (njuthesis v1.4.3)',
  description: '南京大学官方学位论文模板，支持本科/硕士/博士',
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
  assets: [
    'njuthesis.cls',
    'njuthesis-setup.def',
    'njuthesis-graduate.def',
    'njuthesis-undergraduate.def',
    'njuthesis-postdoctoral.def',
    'njuthesis-sample.bib',
    'references.bib',
    'nju-emblem.pdf',
    'nju-emblem-purple.pdf',
    'nju-name.pdf',
    'nju-name-purple.pdf',
  ],
  texContent: `%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% njuthesis 南京大学学位论文模板 v1.4.3
% https://github.com/nju-lug/NJUThesis
% Auto-generated from template with Mustache placeholders
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

\\documentclass[
    type = {{#degreeType}}{{degreeType}}{{/degreeType}}{{^degreeType}}master{{/degreeType}},
    % type = bachelor|master|doctor|postdoc
    % degree = academic|professional,
    % oneside,  % 单面模式
    % twoside,  % 双面模式
  ]{njuthesis}

% 模板选项设置
\\njusetup[info]{
    title = { {{#title}}{{title}}{{/title}}{{^title}}论文题目{{/title}} },
    title* = { {{#titleEn}}{{titleEn}}{{/titleEn}}{{^titleEn}}Thesis Title{{/titleEn}} },
    author = { {{#author}}{{author}}{{/author}}{{^author}}作者姓名{{/author}} },
    author* = { {{#authorEn}}{{authorEn}}{{/authorEn}}{{^authorEn}}Author Name{{/authorEn}} },
    keywords = { {{#keywordsCn}}{{keywordsCn}}{{/keywordsCn}}{{^keywordsCn}}关键词1,关键词2,关键词3{{/keywordsCn}} },
    keywords* = { {{#keywordsEn}}{{keywordsEn}}{{/keywordsEn}}{{^keywordsEn}}Keyword1,Keyword2,Keyword3{{/keywordsEn}} },
    grade = { {{#grade}}{{grade}}{{/grade}}{{^grade}}2020{{/grade}} },
    student-id = { {{#studentId}}{{studentId}}{{/studentId}}{{^studentId}}123456789{{/studentId}} },
    department = { {{#department}}{{department}}{{/department}}{{^department}}院系名称{{/department}} },
    department* = { {{#departmentEn}}{{departmentEn}}{{/departmentEn}}{{^departmentEn}}Department Name{{/departmentEn}} },
    major = { {{#major}}{{major}}{{/major}}{{^major}}专业名称{{/major}} },
    major* = { {{#majorEn}}{{majorEn}}{{/majorEn}}{{^majorEn}}Major Name{{/majorEn}} },
    supervisor = { {{#supervisor}}{{supervisor}}{{/supervisor}}{{^supervisor}}导师姓名,教授{{/supervisor}} },
    supervisor* = { {{#supervisorEn}}{{supervisorEn}}{{/supervisorEn}}{{^supervisorEn}}Professor Supervisor Name{{/supervisorEn}} },
    {{#supervisorSecond}}
    supervisor-ii = { {{supervisorSecond}} },
    {{/supervisorSecond}}
    submit-date = { {{#submitDate}}{{submitDate}}{{/submitDate}}{{^submitDate}}{{currentDate}}{{/submitDate}} },
    field = { {{#field}}{{field}}{{/field}}{{^field}}研究领域{{/field}} },
    field* = { {{#fieldEn}}{{fieldEn}}{{/fieldEn}}{{^fieldEn}}Research Field{{/fieldEn}} },
    {{#chairman}}
    chairman = { {{chairman}} },
    {{/chairman}}
    {{#clc}}
    clc = { {{clc}} },
    {{/clc}}
    {{#secretLevel}}
    secret-level = { {{secretLevel}} },
    {{/secretLevel}}
    {{#defendDate}}
    defend-date = { {{defendDate}} },
    {{/defendDate}}
    {{#email}}
    email = { {{email}} },
    {{/email}}
}

% 参考文献设置
\\njusetup[bib]{
    resource = {references.bib},
}

% 图片设置
\\njusetup[image]{
    nju-emblem = {nju-emblem-purple},
    nju-name = {nju-name-purple},
}

% 摘要设置
\\njusetup[abstract]{
    toc-entry = false,
}

% 目录设置
\\njusetup[tableofcontents/dotline]{chapter}

% 自定义宏包
\\usepackage{float}  % Required for [H] float placement
% \\usepackage{subcaption}
% \\usepackage{siunitx}

% Hyperref options for TOC page numbers and PDF labels
\\hypersetup{plainpages=false,pdfpagelabels}

\\begin{document}

%---------------------------------------------------------------------
%  封面、摘要、前言和目录
%---------------------------------------------------------------------

% 生成封面页
\\maketitle

% 抑制 underfull \\vbox 信息
\\raggedbottom

% 中文摘要
\\begin{abstract}
{{#abstractCn}}{{{abstractCn}}}{{/abstractCn}}{{^abstractCn}}{{{abstract}}}{{/abstractCn}}
\\end{abstract}

% 英文摘要
\\begin{abstract*}
{{#abstractEn}}{{{abstractEn}}}{{/abstractEn}}{{^abstractEn}}{{{abstract_en}}}{{/abstractEn}}
\\end{abstract*}

% 生成目录
\\tableofcontents

{{#hasSymbols}}
%---------------------------------------------------------------------
%  符号表
%---------------------------------------------------------------------
\\begin{notation}[10cm]
{{{symbols}}}
\\end{notation}
{{/hasSymbols}}

%---------------------------------------------------------------------
%  正文部分
%---------------------------------------------------------------------
\\mainmatter

{{#hasIntroduction}}
\\chapter*{引言}
\\addcontentsline{toc}{chapter}{引言}

{{{introduction}}}

{{/hasIntroduction}}

%---------------------------------------------------------------------
%  正文章节
%---------------------------------------------------------------------
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

{{#hasConclusion}}
%---------------------------------------------------------------------
%  结论
%---------------------------------------------------------------------
\\chapter*{结论}
\\addcontentsline{toc}{chapter}{结论}

{{{conclusion}}}

{{/hasConclusion}}

%---------------------------------------------------------------------
%  参考文献
%---------------------------------------------------------------------
{{#hasReferences}}
\\printbibliography
{{/hasReferences}}
{{^hasReferences}}
{{#referencesArray}}
% 手动参考文献 (无 .bib 文件时)
\\begin{thebibliography}{99}
{{#referencesArray}}
\\bibitem{ {{key}} }
{{{citation}}}
{{/referencesArray}}
\\end{thebibliography}
{{/referencesArray}}
{{/hasReferences}}

{{#hasAcknowledgements}}
%---------------------------------------------------------------------
%  致谢
%---------------------------------------------------------------------
\\begin{acknowledgement}
{{{acknowledgements}}}
\\end{acknowledgement}
{{/hasAcknowledgements}}

{{#hasPublications}}
%---------------------------------------------------------------------
%  学术成果
%---------------------------------------------------------------------
\\njuchapter{学术成果}

{{{publications}}}

{{/hasPublications}}

{{#hasAppendix}}
%---------------------------------------------------------------------
%  附录部分
%---------------------------------------------------------------------
\\appendix

{{{appendix}}}

{{/hasAppendix}}

\\end{document}
`,
};
