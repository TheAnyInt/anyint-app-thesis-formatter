# 前端对接文档：3步论文格式化工作流

## 概述

本文档面向前端开发者，说明如何对接新的3步论文格式化工作流API。

### 新旧流程对比

```
旧流程（仍可用）：
上传 → 等待15秒 → 下载PDF

新流程（推荐）：
分析(0.1s) → 用户选择要生成什么 → 生成(3s) → 下载PDF
```

**新流程优势**：
- 用户可见缺失内容
- 用户控制AI生成范围
- 节省80%费用
- 更好的用户体验

---

## 基础配置

### API Base URL
```javascript
const API_BASE = 'http://localhost:3000';
```

### 认证
所有请求需要JWT Token：
```javascript
const headers = {
  'Authorization': `Bearer ${token}`
};
```

---

## 完整工作流程

### 第1步：分析文档

#### 接口
```
POST /thesis/analyze
Content-Type: multipart/form-data
```

#### 请求参数
```javascript
const formData = new FormData();
formData.append('file', fileObject);           // File对象
formData.append('templateId', 'njulife-2');    // 模板ID
```

#### 响应示例
```json
{
  "analysisId": "a1b2c3d4-...",
  "extractedData": {
    "metadata": {
      "title": "深度学习图像识别研究",
      "author_name": "张三",
      "supervisor": "",              // 空表示缺失
      "school": "计算机学院",
      "major": "计算机科学",
      "student_id": "",
      "date": ""
    },
    "abstract": "本文研究...",        // 可能为空或不完整
    "keywords": "深度学习、图像识别",
    "sections": [
      {
        "title": "绪论",
        "content": "本文介绍...",
        "level": 1
      }
    ],
    "references": null,
    "acknowledgements": null
  },
  "templateRequirements": {
    "requiredFields": ["metadata.title", "metadata.author_name", "abstract"],
    "requiredSections": ["sections"]
  },
  "analysis": {
    "completeness": {
      "metadata": {
        "title": "complete",         // complete | partial | missing
        "author_name": "complete",
        "supervisor": "missing",
        "school": "complete",
        "major": "complete",
        "student_id": "missing",
        "date": "missing"
      },
      "abstract": "partial",         // 不完整
      "abstract_en": "missing",
      "keywords": "complete",
      "keywords_en": "missing",
      "sections": {
        "hasContent": true,
        "count": 5,
        "qualityScore": "sparse"     // good | sparse | empty
      },
      "references": "missing",
      "acknowledgements": "missing"
    },
    "suggestions": [
      "缺少或不完整的元数据字段：supervisor, student_id, date。可以考虑使用AI生成。",
      "摘要不完整或缺失。AI可以根据内容生成全面的摘要。",
      "发现5个内容稀疏的章节。AI可以扩展和增强现有章节。",
      "参考文献部分缺失。添加引用或让AI格式化现有参考文献。",
      "致谢部分缺失。您可能想添加此部分。"
    ]
  },
  "images": [
    {
      "id": "docximg1",
      "filename": "docximg1.png",
      "contentType": "image/png",
      "url": "/thesis/analyses/a1b2c3d4-.../images/docximg1"
    }
  ],
  "createdAt": "2024-01-29T12:00:00Z",
  "expiresAt": "2024-01-29T13:00:00Z"  // 1小时有效期
}
```

#### 前端处理
```javascript
async function analyzeThesis(file, templateId) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('templateId', templateId);

  const response = await fetch(`${API_BASE}/thesis/analyze`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error(`分析失败: ${response.statusText}`);
  }

  return await response.json();
}
```

---

### 第2步：选择性生成（可选）

#### 何时调用
- 用户查看分析结果后，选择需要AI生成的字段
- 如果文档完整，可以跳过此步骤

#### 接口
```
POST /thesis/generate
Content-Type: application/json
```

#### 请求参数
```javascript
{
  "analysisId": "a1b2c3d4-...",  // 从第1步获取
  "generateFields": {
    // 选择性指定要生成的字段
    "metadata": ["supervisor", "date"],  // 数组：指定元数据字段
    "abstract": true,                     // 布尔：生成中文摘要
    "abstract_en": false,                 // 不生成英文摘要
    "keywords": false,                    // 已有关键词，不生成
    "keywords_en": true,                  // 生成英文关键词
    "sections": {
      "enhance": true,                    // 增强现有章节
      "addMissing": ["结论"]              // 生成指定的缺失章节
    },
    "references": false,                  // 已有参考文献
    "acknowledgements": true              // 生成致谢
  },
  "model": "gpt-4o"  // 可选：指定模型
}
```

#### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `metadata` | `string[]` | 要生成的元数据字段数组<br>可选值：`title`, `title_en`, `author_name`, `student_id`, `school`, `major`, `supervisor`, `date` |
| `abstract` | `boolean` | 是否生成/增强中文摘要 |
| `abstract_en` | `boolean` | 是否生成英文摘要 |
| `keywords` | `boolean` | 是否生成中文关键词 |
| `keywords_en` | `boolean` | 是否生成英文关键词 |
| `sections.enhance` | `boolean` | 是否增强现有章节内容 |
| `sections.addMissing` | `string[]` | 要生成的新章节名称数组 |
| `references` | `boolean` | 是否格式化/生成参考文献 |
| `acknowledgements` | `boolean` | 是否生成致谢 |

#### 响应示例
```json
{
  "enrichedData": {
    "metadata": {
      "title": "深度学习图像识别研究",
      "author_name": "张三",
      "supervisor": "李教授",           // ✅ AI生成
      "school": "计算机学院",
      "major": "计算机科学",
      "student_id": "2020123456",
      "date": "2024年5月"               // ✅ AI生成
    },
    "abstract": "本文针对...",          // ✅ AI增强
    "keywords": "深度学习、图像识别",
    "keywords_en": "deep learning, image recognition",  // ✅ AI生成
    "sections": [
      {
        "title": "绪论",
        "content": "本文介绍...(增强后的内容)",  // ✅ AI增强
        "level": 1
      },
      {
        "title": "结论",
        "content": "综上所述...",           // ✅ AI新生成
        "level": 1
      }
    ],
    "acknowledgements": "在此感谢..."    // ✅ AI生成
  },
  "generatedFields": [
    "metadata",
    "abstract",
    "keywords_en",
    "sections",
    "acknowledgements"
  ],
  "model": "gpt-4o"
}
```

#### 前端处理
```javascript
async function generateFields(analysisId, selectedFields) {
  const response = await fetch(`${API_BASE}/thesis/generate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      analysisId,
      generateFields: selectedFields,
      model: 'gpt-4o'  // 可选
    })
  });

  if (!response.ok) {
    throw new Error(`生成失败: ${response.statusText}`);
  }

  return await response.json();
}
```

---

### 第3步：渲染PDF

#### 接口
```
POST /thesis/render
Content-Type: application/json
```

#### 请求参数
```javascript
{
  "analysisId": "a1b2c3d4-...",  // 新流程：使用analysisId
  // 或
  "extractionId": "x1y2z3...",   // 旧流程：使用extractionId（向后兼容）

  "templateId": "njulife-2",     // 必需
  "document": {                   // 可选：手动编辑的数据
    "metadata": { ... },
    "sections": [ ... ]
  }
}
```

#### 响应示例
```json
{
  "jobId": "job-abc123",
  "status": "pending",
  "pollUrl": "/thesis/jobs/job-abc123"
}
```

#### 前端处理
```javascript
async function renderThesis(analysisId, templateId) {
  const response = await fetch(`${API_BASE}/thesis/render`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      analysisId,
      templateId
    })
  });

  if (!response.ok) {
    throw new Error(`渲染失败: ${response.statusText}`);
  }

  return await response.json();
}
```

---

### 第4步：轮询任务状态

#### 接口
```
GET /thesis/jobs/:jobId
```

#### 响应示例
```json
{
  "jobId": "job-abc123",
  "status": "completed",           // pending | processing | completed | failed
  "progress": 100,
  "createdAt": "2024-01-29T12:00:00Z",
  "updatedAt": "2024-01-29T12:05:00Z",
  "downloadUrl": "/thesis/jobs/job-abc123/download",
  "texUrl": "/thesis/jobs/job-abc123/tex"
}
```

#### 前端处理
```javascript
async function pollJobStatus(jobId, onProgress) {
  const poll = async () => {
    const response = await fetch(`${API_BASE}/thesis/jobs/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const job = await response.json();

    // 回调进度
    if (onProgress) {
      onProgress(job);
    }

    if (job.status === 'completed') {
      return job;
    } else if (job.status === 'failed') {
      throw new Error(job.error || '任务失败');
    } else {
      // 继续轮询（每2秒）
      await new Promise(resolve => setTimeout(resolve, 2000));
      return poll();
    }
  };

  return poll();
}
```

---

## 完整示例代码

### React Hooks 实现

```jsx
import { useState } from 'react';

function useThesisFormatter() {
  const [step, setStep] = useState('idle');  // idle | analyzing | analyzed | generating | rendering | polling | completed
  const [analysis, setAnalysis] = useState(null);
  const [job, setJob] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  // 第1步：分析
  const analyze = async (file, templateId) => {
    try {
      setStep('analyzing');
      setError(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('templateId', templateId);

      const response = await fetch(`${API_BASE}/thesis/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`
        },
        body: formData
      });

      if (!response.ok) throw new Error('分析失败');

      const result = await response.json();
      setAnalysis(result);
      setStep('analyzed');
      return result;
    } catch (err) {
      setError(err.message);
      setStep('idle');
      throw err;
    }
  };

  // 第2步：生成（可选）
  const generate = async (selectedFields) => {
    try {
      setStep('generating');
      setError(null);

      const response = await fetch(`${API_BASE}/thesis/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          analysisId: analysis.analysisId,
          generateFields: selectedFields
        })
      });

      if (!response.ok) throw new Error('生成失败');

      const result = await response.json();
      setStep('analyzed');  // 回到analyzed状态，用户可以继续修改
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // 第3步：渲染
  const render = async (templateId) => {
    try {
      setStep('rendering');
      setError(null);

      const response = await fetch(`${API_BASE}/thesis/render`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          analysisId: analysis.analysisId,
          templateId
        })
      });

      if (!response.ok) throw new Error('渲染失败');

      const result = await response.json();
      setJob(result);
      setStep('polling');

      // 开始轮询
      pollStatus(result.jobId);
      return result;
    } catch (err) {
      setError(err.message);
      setStep('analyzed');
      throw err;
    }
  };

  // 轮询任务状态
  const pollStatus = async (jobId) => {
    const poll = async () => {
      try {
        const response = await fetch(`${API_BASE}/thesis/jobs/${jobId}`, {
          headers: {
            'Authorization': `Bearer ${getToken()}`
          }
        });

        const jobData = await response.json();
        setJob(jobData);
        setProgress(jobData.progress);

        if (jobData.status === 'completed') {
          setStep('completed');
        } else if (jobData.status === 'failed') {
          setError(jobData.error);
          setStep('analyzed');
        } else {
          setTimeout(poll, 2000);  // 2秒后继续轮询
        }
      } catch (err) {
        setError(err.message);
        setStep('analyzed');
      }
    };

    poll();
  };

  return {
    step,
    analysis,
    job,
    error,
    progress,
    analyze,
    generate,
    render
  };
}

// 使用示例
function ThesisUploader() {
  const { step, analysis, job, error, progress, analyze, generate, render } = useThesisFormatter();
  const [selectedFields, setSelectedFields] = useState({});

  // 步骤1：上传文件
  if (step === 'idle' || step === 'analyzing') {
    return (
      <div>
        <h2>上传论文</h2>
        <input
          type="file"
          accept=".docx,.pdf,.txt,.md"
          onChange={(e) => {
            if (e.target.files[0]) {
              analyze(e.target.files[0], 'njulife-2');
            }
          }}
          disabled={step === 'analyzing'}
        />
        {step === 'analyzing' && <p>正在分析...</p>}
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  // 步骤2：显示分析结果，让用户选择
  if (step === 'analyzed') {
    return (
      <div>
        <h2>分析结果</h2>

        {/* 显示建议 */}
        <div className="suggestions">
          <h3>AI建议：</h3>
          <ul>
            {analysis.analysis.suggestions.map((suggestion, i) => (
              <li key={i}>{suggestion}</li>
            ))}
          </ul>
        </div>

        {/* 字段选择器 */}
        <FieldSelector
          analysis={analysis}
          selectedFields={selectedFields}
          onChange={setSelectedFields}
        />

        {/* 操作按钮 */}
        <div className="actions">
          <button
            onClick={() => generate(selectedFields)}
            disabled={Object.keys(selectedFields).length === 0}
          >
            生成选中字段
          </button>
          <button onClick={() => render('njulife-2')}>
            跳过生成，直接渲染
          </button>
        </div>

        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  // 步骤3：生成中
  if (step === 'generating') {
    return (
      <div>
        <h2>AI生成中...</h2>
        <p>正在生成您选择的字段，请稍候</p>
      </div>
    );
  }

  // 步骤4：渲染和下载
  if (step === 'rendering' || step === 'polling') {
    return (
      <div>
        <h2>PDF生成中...</h2>
        <ProgressBar value={progress} />
        <p>{progress}%</p>
      </div>
    );
  }

  // 步骤5：完成
  if (step === 'completed') {
    return (
      <div>
        <h2>完成！</h2>
        <a href={`${API_BASE}${job.downloadUrl}`} download>
          下载PDF
        </a>
        <a href={`${API_BASE}${job.texUrl}`} download>
          下载LaTeX源码
        </a>
        <button onClick={() => window.location.reload()}>
          处理新文档
        </button>
      </div>
    );
  }

  return null;
}

// 字段选择器组件
function FieldSelector({ analysis, selectedFields, onChange }) {
  const { completeness } = analysis.analysis;

  // 需要生成的元数据字段
  const missingMetadata = Object.entries(completeness.metadata)
    .filter(([field, status]) => status !== 'complete')
    .map(([field]) => field);

  const toggleField = (category, value) => {
    onChange({
      ...selectedFields,
      [category]: value
    });
  };

  return (
    <div className="field-selector">
      <h3>选择要AI生成的内容：</h3>

      {/* 元数据 */}
      {missingMetadata.length > 0 && (
        <div className="field-group">
          <label>
            <input
              type="checkbox"
              checked={selectedFields.metadata?.length > 0}
              onChange={(e) => toggleField('metadata', e.target.checked ? missingMetadata : [])}
            />
            生成缺失的元数据：{missingMetadata.join(', ')}
          </label>
        </div>
      )}

      {/* 摘要 */}
      {completeness.abstract !== 'complete' && (
        <div className="field-group">
          <label>
            <input
              type="checkbox"
              checked={selectedFields.abstract}
              onChange={(e) => toggleField('abstract', e.target.checked)}
            />
            生成/增强中文摘要
          </label>
        </div>
      )}

      {completeness.abstract_en !== 'complete' && (
        <div className="field-group">
          <label>
            <input
              type="checkbox"
              checked={selectedFields.abstract_en}
              onChange={(e) => toggleField('abstract_en', e.target.checked)}
            />
            生成英文摘要
          </label>
        </div>
      )}

      {/* 关键词 */}
      {completeness.keywords !== 'complete' && (
        <div className="field-group">
          <label>
            <input
              type="checkbox"
              checked={selectedFields.keywords}
              onChange={(e) => toggleField('keywords', e.target.checked)}
            />
            生成中文关键词
          </label>
        </div>
      )}

      {completeness.keywords_en !== 'complete' && (
        <div className="field-group">
          <label>
            <input
              type="checkbox"
              checked={selectedFields.keywords_en}
              onChange={(e) => toggleField('keywords_en', e.target.checked)}
            />
            生成英文关键词
          </label>
        </div>
      )}

      {/* 章节 */}
      {completeness.sections.qualityScore !== 'good' && (
        <div className="field-group">
          <label>
            <input
              type="checkbox"
              checked={selectedFields.sections?.enhance}
              onChange={(e) => toggleField('sections', {
                ...selectedFields.sections,
                enhance: e.target.checked,
                addMissing: selectedFields.sections?.addMissing || []
              })}
            />
            增强现有章节内容（当前{completeness.sections.count}个章节，质量：{completeness.sections.qualityScore}）
          </label>
        </div>
      )}

      {/* 参考文献 */}
      {completeness.references !== 'complete' && (
        <div className="field-group">
          <label>
            <input
              type="checkbox"
              checked={selectedFields.references}
              onChange={(e) => toggleField('references', e.target.checked)}
            />
            格式化/生成参考文献
          </label>
        </div>
      )}

      {/* 致谢 */}
      {completeness.acknowledgements !== 'complete' && (
        <div className="field-group">
          <label>
            <input
              type="checkbox"
              checked={selectedFields.acknowledgements}
              onChange={(e) => toggleField('acknowledgements', e.target.checked)}
            />
            生成致谢
          </label>
        </div>
      )}

      {/* 显示预估token消耗 */}
      <div className="token-estimate">
        <p>预估token消耗：约{estimateTokens(selectedFields)}（约¥{estimateCost(selectedFields)}）</p>
      </div>
    </div>
  );
}

// 预估token消耗
function estimateTokens(fields) {
  let total = 0;
  if (fields.metadata?.length) total += 500 * fields.metadata.length;
  if (fields.abstract) total += 2000;
  if (fields.abstract_en) total += 2000;
  if (fields.keywords) total += 500;
  if (fields.keywords_en) total += 500;
  if (fields.sections?.enhance) total += 5000;
  if (fields.references) total += 2000;
  if (fields.acknowledgements) total += 1000;
  return total;
}

function estimateCost(fields) {
  const tokens = estimateTokens(fields);
  const costPer1000 = 0.03;  // GPT-4o价格
  return (tokens / 1000 * costPer1000).toFixed(2);
}
```

---

## Vue 3 实现

```vue
<template>
  <div class="thesis-uploader">
    <!-- 步骤1：上传 -->
    <div v-if="step === 'idle' || step === 'analyzing'">
      <h2>上传论文</h2>
      <input
        type="file"
        @change="handleFileUpload"
        :disabled="step === 'analyzing'"
        accept=".docx,.pdf,.txt,.md"
      />
      <p v-if="step === 'analyzing'">正在分析...</p>
      <p v-if="error" class="error">{{ error }}</p>
    </div>

    <!-- 步骤2：选择生成 -->
    <div v-else-if="step === 'analyzed'">
      <h2>分析结果</h2>

      <div class="suggestions">
        <h3>AI建议：</h3>
        <ul>
          <li v-for="(suggestion, i) in analysis.analysis.suggestions" :key="i">
            {{ suggestion }}
          </li>
        </ul>
      </div>

      <FieldSelector
        :analysis="analysis"
        v-model="selectedFields"
      />

      <div class="actions">
        <button
          @click="handleGenerate"
          :disabled="!hasSelectedFields"
        >
          生成选中字段
        </button>
        <button @click="handleRender">
          跳过生成，直接渲染
        </button>
      </div>
    </div>

    <!-- 步骤3：生成中 -->
    <div v-else-if="step === 'generating'">
      <h2>AI生成中...</h2>
      <p>正在生成您选择的字段</p>
    </div>

    <!-- 步骤4：渲染中 -->
    <div v-else-if="step === 'rendering' || step === 'polling'">
      <h2>PDF生成中...</h2>
      <progress :value="progress" max="100"></progress>
      <p>{{ progress }}%</p>
    </div>

    <!-- 步骤5：完成 -->
    <div v-else-if="step === 'completed'">
      <h2>完成！</h2>
      <a :href="`${API_BASE}${job.downloadUrl}`" download>下载PDF</a>
      <a :href="`${API_BASE}${job.texUrl}`" download>下载LaTeX</a>
      <button @click="reset">处理新文档</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const API_BASE = 'http://localhost:3000';

const step = ref('idle');
const analysis = ref(null);
const job = ref(null);
const error = ref(null);
const progress = ref(0);
const selectedFields = ref({});

const hasSelectedFields = computed(() => {
  return Object.keys(selectedFields.value).length > 0;
});

async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    step.value = 'analyzing';
    error.value = null;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('templateId', 'njulife-2');

    const response = await fetch(`${API_BASE}/thesis/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`
      },
      body: formData
    });

    if (!response.ok) throw new Error('分析失败');

    analysis.value = await response.json();
    step.value = 'analyzed';
  } catch (err) {
    error.value = err.message;
    step.value = 'idle';
  }
}

async function handleGenerate() {
  try {
    step.value = 'generating';
    error.value = null;

    const response = await fetch(`${API_BASE}/thesis/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        analysisId: analysis.value.analysisId,
        generateFields: selectedFields.value
      })
    });

    if (!response.ok) throw new Error('生成失败');

    await response.json();
    step.value = 'analyzed';
  } catch (err) {
    error.value = err.message;
  }
}

async function handleRender() {
  try {
    step.value = 'rendering';
    error.value = null;

    const response = await fetch(`${API_BASE}/thesis/render`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        analysisId: analysis.value.analysisId,
        templateId: 'njulife-2'
      })
    });

    if (!response.ok) throw new Error('渲染失败');

    job.value = await response.json();
    step.value = 'polling';
    pollJobStatus(job.value.jobId);
  } catch (err) {
    error.value = err.message;
    step.value = 'analyzed';
  }
}

async function pollJobStatus(jobId) {
  const poll = async () => {
    try {
      const response = await fetch(`${API_BASE}/thesis/jobs/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });

      const jobData = await response.json();
      job.value = jobData;
      progress.value = jobData.progress;

      if (jobData.status === 'completed') {
        step.value = 'completed';
      } else if (jobData.status === 'failed') {
        error.value = jobData.error;
        step.value = 'analyzed';
      } else {
        setTimeout(poll, 2000);
      }
    } catch (err) {
      error.value = err.message;
      step.value = 'analyzed';
    }
  };

  poll();
}

function reset() {
  step.value = 'idle';
  analysis.value = null;
  job.value = null;
  error.value = null;
  progress.value = 0;
  selectedFields.value = {};
}

function getToken() {
  // 返回JWT token
  return localStorage.getItem('token');
}
</script>
```

---

## 错误处理

### 常见错误

#### 1. 分析ID过期（404）
```json
{
  "statusCode": 404,
  "message": "Analysis 'xxx' not found"
}
```

**原因**：分析数据有1小时有效期
**解决**：重新上传文件进行分析

#### 2. 文件格式错误（400）
```json
{
  "statusCode": 400,
  "message": "Only .docx, .txt, .md, .pdf files are allowed"
}
```

**解决**：检查文件格式

#### 3. 未授权（401）
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**解决**：检查Token是否有效

#### 4. 生成失败
```json
{
  "enrichedData": { ... },
  "generatedFields": [],
  "warnings": ["某个字段生成失败"]
}
```

**处理**：部分成功，提示用户重试失败的字段

### 错误处理示例

```javascript
async function safeAnalyze(file, templateId) {
  try {
    return await analyzeThesis(file, templateId);
  } catch (error) {
    if (error.status === 401) {
      // 重新登录
      redirectToLogin();
    } else if (error.status === 400) {
      // 文件格式错误
      showError('文件格式不支持，请上传.docx、.pdf、.txt或.md文件');
    } else {
      // 其他错误
      showError(`分析失败：${error.message}`);
    }
    throw error;
  }
}
```

---

## 状态管理建议

### 本地存储
```javascript
// 保存分析结果（防止刷新丢失）
localStorage.setItem('currentAnalysis', JSON.stringify(analysis));

// 恢复分析结果
const savedAnalysis = JSON.parse(localStorage.getItem('currentAnalysis'));
if (savedAnalysis) {
  // 检查是否过期
  const expiresAt = new Date(savedAnalysis.expiresAt);
  if (expiresAt > new Date()) {
    setAnalysis(savedAnalysis);
    setStep('analyzed');
  }
}
```

### Redux/Vuex 状态结构建议

```javascript
{
  thesis: {
    currentFile: File | null,
    analysis: AnalysisResult | null,
    selectedFields: GenerateFieldsRequest,
    job: Job | null,
    status: 'idle' | 'analyzing' | 'analyzed' | 'generating' | 'rendering' | 'polling' | 'completed',
    error: string | null,
    progress: number
  }
}
```

---

## 性能优化建议

### 1. 图片预览优化
```javascript
// 使用分析返回的图片URL
<img src={`${API_BASE}${image.url}`} alt={image.filename} />
```

### 2. 防抖上传
```javascript
const debouncedAnalyze = debounce(analyzeThesis, 500);
```

### 3. 轮询优化
```javascript
// 使用指数退避
let pollInterval = 2000;
const maxInterval = 10000;

function pollWithBackoff() {
  pollJobStatus(jobId);
  pollInterval = Math.min(pollInterval * 1.5, maxInterval);
  setTimeout(pollWithBackoff, pollInterval);
}
```

---

## 模板ID列表

```javascript
const TEMPLATES = [
  { id: 'njulife-2', name: '南京大学生命科学学院 v2', recommended: true },
  { id: 'njulife', name: '南京大学生命科学学院 v1' },
  { id: 'thu', name: '清华大学' },
  { id: 'njuthesis', name: '南京大学官方模板' },
  { id: 'scut', name: '华南理工大学' },
  { id: 'hunnu', name: '湖南师范大学' }
];
```

---

## 测试建议

### 单元测试
```javascript
test('analyzeThesis should return analysis', async () => {
  const mockFile = new File(['test'], 'test.docx');
  const result = await analyzeThesis(mockFile, 'njulife-2');

  expect(result.analysisId).toBeDefined();
  expect(result.analysis).toBeDefined();
  expect(result.analysis.suggestions).toBeInstanceOf(Array);
});
```

### E2E测试
```javascript
test('complete workflow', async () => {
  // 1. 上传
  await page.setInputFiles('input[type="file"]', 'test.docx');

  // 2. 等待分析完成
  await page.waitForSelector('.suggestions');

  // 3. 选择字段
  await page.click('input[name="abstract"]');
  await page.click('button:has-text("生成选中字段")');

  // 4. 等待生成完成
  await page.waitForSelector('button:has-text("直接渲染")');
  await page.click('button:has-text("直接渲染")');

  // 5. 等待PDF完成
  await page.waitForSelector('a:has-text("下载PDF")');
});
```

---

## 常见问题

**Q: 分析需要多久？**
A: 通常0.1秒，不使用AI，非常快

**Q: 生成需要多久？**
A: 取决于选择的字段，通常3-10秒

**Q: 可以同时处理多个文档吗？**
A: 可以，每个文档有独立的analysisId

**Q: 分析结果会保存多久？**
A: 1小时，超时需要重新分析

**Q: 可以编辑提取的数据吗？**
A: 可以，在第3步render时传入document参数

**Q: 旧的API还能用吗？**
A: 完全兼容，可以继续使用旧API

---

## 联系支持

- API文档：`API_DOCUMENTATION.md`
- 迁移指南：`MIGRATION_GUIDE.md`
- GitHub Issues：(your-repo-url)

---

**准备好开始对接了吗？** 从第1步的`POST /thesis/analyze`开始吧！🚀
