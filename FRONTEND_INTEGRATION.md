# 前端对接指南 - Thesis Formatter API

## 服务地址

- **生产环境**: `http://35.213.100.193:3055`
- **Swagger 文档**: `http://35.213.100.193:3055/api`

## API 概览

| 端点 | 方法 | 描述 |
|------|------|------|
| `/templates` | GET | 获取可用模板列表 |
| `/thesis/upload` | POST | 上传文档并开始处理 |
| `/thesis/jobs/:jobId` | GET | 轮询任务状态 |
| `/thesis/jobs/:jobId/download` | GET | 下载生成的 PDF |
| `/thesis/jobs/:jobId/tex` | GET | 下载 LaTeX 源文件 |
| `/thesis/jobs/:jobId/docx` | GET | 下载 DOCX 文件 |

---

## 完整对接流程

### 第一步：获取可用模板

```javascript
const response = await fetch('http://35.213.100.193:3055/templates');
const data = await response.json();
console.log(data.templates);
```

**响应示例：**
```json
{
  "templates": [
    {
      "id": "njulife",
      "schoolId": "njulife",
      "name": "南京大学生命科学学院硕士学位论文",
      "description": "基于《南大生科院硕士学位论文写作要求格式-2025.9更新》制作的LaTeX模板",
      "requiredFields": ["title", "titleEn", "author", "major", "supervisor"]
    },
    {
      "id": "njulife-2",
      "schoolId": "njulife",
      "name": "南京大学生命科学学院硕士学位论文 v2",
      "description": "基于 ctexart 的南大生科院硕士学位论文模板，使用外部封面 PDF"
    }
  ]
}
```

### 第二步：上传文档

```javascript
async function uploadThesis(file, templateId) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('templateId', templateId);

  const response = await fetch('http://35.213.100.193:3055/thesis/upload', {
    method: 'POST',
    body: formData,
    // 如果启用了认证，需要添加 Authorization header
    // headers: { 'Authorization': `Bearer ${token}` }
  });

  return await response.json();
}

// 使用示例
const result = await uploadThesis(fileInput.files[0], 'njulife');
console.log(result);
// { jobId: "xxx", status: "processing", pollUrl: "/thesis/jobs/xxx" }
```

**支持的文件格式：**
- `.docx` - Word 文档
- `.md` - Markdown 文件
- `.txt` - 纯文本文件
- `.pdf` - PDF 文件（提取文本）

**文件大小限制：** 50MB

### 第三步：轮询任务状态

```javascript
async function pollJobStatus(jobId, onProgress, onComplete, onError) {
  const poll = async () => {
    const response = await fetch(`http://35.213.100.193:3055/thesis/jobs/${jobId}`);
    const job = await response.json();

    onProgress(job.progress);

    if (job.status === 'completed') {
      onComplete(job);
      return;
    }

    if (job.status === 'failed') {
      onError(job.error);
      return;
    }

    // 继续轮询（每2秒）
    setTimeout(poll, 2000);
  };

  poll();
}

// 使用示例
pollJobStatus(
  result.jobId,
  (progress) => console.log(`进度: ${progress}%`),
  (job) => {
    console.log('完成！');
    console.log('PDF 下载地址:', job.downloadUrl);
    console.log('TeX 下载地址:', job.texUrl);
  },
  (error) => console.error('失败:', error)
);
```

**任务状态：**
| 状态 | 描述 |
|------|------|
| `pending` | 等待处理 |
| `processing` | 正在处理 |
| `completed` | 处理完成 |
| `failed` | 处理失败 |

**响应示例（处理中）：**
```json
{
  "jobId": "98572a66-cce9-4fc1-ba69-1ac1d7074357",
  "status": "processing",
  "progress": 30,
  "createdAt": "2026-01-12T08:31:22.993Z",
  "updatedAt": "2026-01-12T08:31:22.993Z"
}
```

**响应示例（已完成）：**
```json
{
  "jobId": "98572a66-cce9-4fc1-ba69-1ac1d7074357",
  "status": "completed",
  "progress": 100,
  "downloadUrl": "/thesis/jobs/98572a66-cce9-4fc1-ba69-1ac1d7074357/download",
  "texUrl": "/thesis/jobs/98572a66-cce9-4fc1-ba69-1ac1d7074357/tex"
}
```

### 第四步：下载文件

```javascript
async function downloadFile(url, filename) {
  const response = await fetch(`http://35.213.100.193:3055${url}`);
  const blob = await response.blob();

  // 创建下载链接
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(downloadUrl);
}

// 下载 PDF
downloadFile(job.downloadUrl, 'thesis.pdf');

// 下载 TeX 源文件
downloadFile(job.texUrl, 'thesis.tex');

// 下载 DOCX（通过 Pandoc 转换）
downloadFile(`/thesis/jobs/${jobId}/docx`, 'thesis.docx');
```

---

## 完整 React 示例

```jsx
import React, { useState } from 'react';

const API_BASE = 'http://35.213.100.193:3055';

function ThesisUploader() {
  const [file, setFile] = useState(null);
  const [templateId, setTemplateId] = useState('njulife');
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleUpload = async () => {
    if (!file) return;

    setStatus('uploading');
    setError(null);

    try {
      // 上传文件
      const formData = new FormData();
      formData.append('file', file);
      formData.append('templateId', templateId);

      const uploadRes = await fetch(`${API_BASE}/thesis/upload`, {
        method: 'POST',
        body: formData,
      });

      const { jobId } = await uploadRes.json();
      setStatus('processing');

      // 轮询状态
      const pollStatus = async () => {
        const res = await fetch(`${API_BASE}/thesis/jobs/${jobId}`);
        const job = await res.json();

        setProgress(job.progress);

        if (job.status === 'completed') {
          setStatus('completed');
          setResult(job);
          return;
        }

        if (job.status === 'failed') {
          setStatus('failed');
          setError(job.error);
          return;
        }

        setTimeout(pollStatus, 2000);
      };

      pollStatus();
    } catch (err) {
      setStatus('failed');
      setError(err.message);
    }
  };

  return (
    <div>
      <h2>论文格式化工具</h2>

      <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
        <option value="njulife">南京大学生命科学学院硕士学位论文</option>
        <option value="thu">清华大学本科学位论文</option>
      </select>

      <input
        type="file"
        accept=".docx,.md,.txt,.pdf"
        onChange={(e) => setFile(e.target.files[0])}
      />

      <button onClick={handleUpload} disabled={!file || status === 'processing'}>
        {status === 'processing' ? `处理中 ${progress}%` : '上传并转换'}
      </button>

      {error && <p style={{ color: 'red' }}>错误: {error}</p>}

      {result && (
        <div>
          <p>转换完成！</p>
          <a href={`${API_BASE}${result.downloadUrl}`} download>下载 PDF</a>
          {' | '}
          <a href={`${API_BASE}${result.texUrl}`} download>下载 TeX</a>
        </div>
      )}
    </div>
  );
}

export default ThesisUploader;
```

---

## cURL 测试命令

### 1. 获取模板列表
```bash
curl http://35.213.100.193:3055/templates
```

### 2. 上传 Markdown 文件
```bash
curl -X POST http://35.213.100.193:3055/thesis/upload \
  -F "file=@test-thesis.md" \
  -F "templateId=njulife"
```

### 3. 上传 Word 文档
```bash
curl -X POST http://35.213.100.193:3055/thesis/upload \
  -F "file=@test-thesis.docx" \
  -F "templateId=njulife"
```

### 4. 查询任务状态
```bash
curl http://35.213.100.193:3055/thesis/jobs/{jobId}
```

### 5. 下载 PDF
```bash
curl -o thesis.pdf http://35.213.100.193:3055/thesis/jobs/{jobId}/download
```

### 6. 下载 TeX
```bash
curl -o thesis.tex http://35.213.100.193:3055/thesis/jobs/{jobId}/tex
```

---

## 错误处理

| HTTP 状态码 | 描述 |
|-------------|------|
| 400 | 请求参数错误（如不支持的文件类型） |
| 401 | 未授权（需要 JWT Token，当 AUTH_ENABLED=true 时） |
| 404 | 任务不存在 |
| 500 | 服务器内部错误 |

**常见错误：**
```json
{
  "statusCode": 400,
  "message": "Only .docx, .txt, .md, .pdf files are allowed"
}
```

```json
{
  "jobId": "xxx",
  "status": "failed",
  "error": "No template found for school 'invalid-template'"
}
```

---

## 测试文件

测试文件位于 `test-files/` 目录：
- `test-thesis.md` - Markdown 格式测试论文
- `test-thesis.docx` - Word 格式测试论文
- `test-thesis.pdf` - PDF 格式测试论文

---

## 注意事项

1. **模板选择**: `templateId` 使用 `schoolId` 字段（如 `njulife`），不是模板的 `id`
2. **文件大小**: 最大 50MB
3. **处理时间**: 通常 10-30 秒，取决于文档长度和 LLM 响应速度
4. **轮询间隔**: 建议 2 秒一次
5. **认证**: 当前 `AUTH_ENABLED=false`，无需 Token；启用后需要在 Header 中传递 `Authorization: Bearer <token>`
