# Thesis Formatter API Documentation

Base URL: `http://localhost:3077`

---

## Overview

Thesis Formatter is a service that converts thesis documents (DOCX, Markdown, TXT) into formatted PDF using LaTeX templates. It supports dynamic section extraction and multiple conversion workflows.

### Workflows

1. **Direct Conversion** - Single request, immediate PDF response
2. **Two-Step Flow** - Extract → Preview/Edit → Render (for frontend integration)
3. **Async Job** - Upload → Poll → Download (for large documents)

---

## Thesis Endpoints

### 1. Direct Conversion (Recommended)

Convert document to PDF in a single request.

```
POST /thesis/convert
```

**Content-Type:** `multipart/form-data`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| file | File | Yes | Document file (.docx, .md, .txt) |
| templateId | string | Yes | Template school ID (e.g., "sjtu") |

**Response:** PDF file (application/pdf)

**Example:**
```bash
curl -X POST http://localhost:3077/thesis/convert \
  -F "file=@thesis.docx" \
  -F "templateId=sjtu" \
  -o output.pdf
```

---

### 2. Extract Content (Step 1 of Two-Step Flow)

Extract structured content and images from document for preview/editing.

```
POST /thesis/extract
```

**Content-Type:** `multipart/form-data`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| file | File | Yes | Document file (.docx, .md, .txt) |

**Response:**
```json
{
  "extractionId": "uuid",
  "document": {
    "metadata": {
      "title": "论文标题",
      "title_en": "English Title",
      "author_name": "作者姓名",
      "student_id": "学号",
      "school": "学院",
      "major": "专业",
      "supervisor": "导师",
      "date": "2024年12月"
    },
    "abstract": "中文摘要内容...",
    "abstract_en": "English abstract...",
    "keywords": "关键词1；关键词2",
    "keywords_en": "keyword1; keyword2",
    "sections": [
      {
        "title": "引言",
        "content": "章节内容...",
        "level": 1
      },
      {
        "title": "研究方法",
        "content": "章节内容...",
        "level": 1
      }
    ],
    "references": "参考文献内容",
    "acknowledgements": "致谢内容"
  },
  "images": [
    {
      "id": "image-uuid",
      "filename": "image-uuid.png",
      "contentType": "image/png",
      "url": "/thesis/extractions/{extractionId}/images/{imageId}"
    }
  ],
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Example:**
```bash
curl -X POST http://localhost:3077/thesis/extract \
  -F "file=@thesis.docx" | jq .
```

---

### 3. Get Extraction Image

Retrieve an image from an extraction for preview.

```
GET /thesis/extractions/:extractionId/images/:imageId
```

**Response:** Image file (image/png, image/jpeg, etc.)

**Example:**
```bash
curl http://localhost:3077/thesis/extractions/{extractionId}/images/{imageId} \
  -o image.png
```

---

### 4. Render from Extraction (Step 2 of Two-Step Flow)

Render PDF from a previous extraction. Optionally provide modified document data.

```
POST /thesis/render
```

**Content-Type:** `application/json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| extractionId | string | Yes | ID from extract response |
| templateId | string | Yes | Template school ID |
| document | object | No | Modified document data (overrides extracted) |

**Response:**
```json
{
  "jobId": "uuid",
  "status": "processing",
  "pollUrl": "/thesis/jobs/{jobId}"
}
```

**Example:**
```bash
curl -X POST http://localhost:3077/thesis/render \
  -H "Content-Type: application/json" \
  -d '{
    "extractionId": "uuid",
    "templateId": "sjtu"
  }'
```

---

### 5. Async Upload (Job-based)

Upload file and start async processing.

```
POST /thesis/upload
```

**Content-Type:** `multipart/form-data`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| file | File | Yes | Document file (.docx, .md, .txt) |
| templateId | string | Yes | Template school ID |

**Response:**
```json
{
  "jobId": "uuid",
  "status": "pending",
  "pollUrl": "/thesis/jobs/{jobId}"
}
```

---

### 6. Get Job Status

Poll job status for async operations.

```
GET /thesis/jobs/:jobId
```

**Response (Processing):**
```json
{
  "jobId": "uuid",
  "status": "processing",
  "progress": 50,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:01.000Z"
}
```

**Response (Completed):**
```json
{
  "jobId": "uuid",
  "status": "completed",
  "progress": 100,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:10.000Z",
  "downloadUrl": "/thesis/jobs/{jobId}/download",
  "texUrl": "/thesis/jobs/{jobId}/tex"
}
```

**Response (Failed):**
```json
{
  "jobId": "uuid",
  "status": "failed",
  "error": "Error message"
}
```

**Job Status Values:**
- `pending` - Job created, waiting to start
- `processing` - Job in progress
- `completed` - Job finished successfully
- `failed` - Job failed with error

---

### 7. Download PDF

Download generated PDF from completed job.

```
GET /thesis/jobs/:jobId/download
```

**Response:** PDF file (application/pdf)

---

### 8. Download TeX Source

Download generated LaTeX source from completed job.

```
GET /thesis/jobs/:jobId/tex
```

**Response:** TeX file (application/x-tex)

---

### 9. Parse Content

Parse text content without file upload.

```
POST /thesis/parse
```

**Content-Type:** `application/json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| content | string | Yes | Text content to parse |
| format | string | No | "txt" or "markdown" (default: "txt") |

**Response:**
```json
{
  "document": { ... }
}
```

---

## Template Endpoints

### 1. List Templates (Public)

Get available templates, optionally filtered by school.

```
GET /templates?school={schoolId}
```

**Response:**
```json
{
  "templates": [
    {
      "id": "uuid",
      "name": "SJTU Thesis",
      "description": "Shanghai Jiao Tong University thesis template",
      "requiredFields": [],
      "requiredSections": []
    }
  ]
}
```

---

### 2. Validate Document

Validate document against template requirements.

```
POST /validate
```

**Content-Type:** `application/json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| templateId | string | Yes | Template ID |
| document | object | Yes | Document data to validate |

---

### 3. List All Templates (Admin)

```
GET /admin/templates
```

---

### 4. Get Template (Admin)

```
GET /admin/templates/:id
```

---

### 5. Create Template (Admin)

```
POST /admin/templates
```

**Content-Type:** `application/json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| schoolId | string | Yes | School identifier (e.g., "sjtu") |
| name | string | Yes | Template name |
| description | string | No | Template description |
| texContent | string | Yes | LaTeX template content |
| requiredFields | string[] | Yes | Required metadata fields |
| requiredSections | string[] | Yes | Required sections |

**Example:**
```bash
curl -X POST http://localhost:3077/admin/templates \
  -H "Content-Type: application/json" \
  -d '{
    "schoolId": "sjtu",
    "name": "SJTU Thesis",
    "texContent": "\\documentclass...",
    "requiredFields": [],
    "requiredSections": []
  }'
```

---

### 6. Update Template (Admin)

```
PUT /admin/templates/:id
```

---

### 7. Delete Template (Admin)

```
DELETE /admin/templates/:id
```

---

## Data Structures

### ThesisData

```typescript
interface ThesisData {
  metadata: {
    title: string;
    title_en?: string;
    author_name: string;
    student_id?: string;
    school?: string;
    major?: string;
    supervisor?: string;
    date?: string;
  };
  abstract?: string;
  abstract_en?: string;
  keywords?: string;
  keywords_en?: string;
  sections: Array<{
    title: string;
    content: string;
    level: 1 | 2 | 3;  // 1=section, 2=subsection, 3=subsubsection
  }>;
  references?: string;
  acknowledgements?: string;
  figures?: Array<{
    id: string;
    filename: string;
    index: number;
    label: string;
    caption?: string;
  }>;
}
```

---

## Error Responses

All errors return JSON with the following structure:

```json
{
  "message": "Error description",
  "error": "Error type",
  "statusCode": 400
}
```

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - Missing or invalid parameters |
| 404 | Not Found - Resource not found |
| 500 | Internal Server Error |

---

## Usage Examples

### Quick Start: Direct Conversion

```bash
# Convert DOCX to PDF
curl -X POST http://localhost:3077/thesis/convert \
  -F "file=@my_thesis.docx" \
  -F "templateId=sjtu" \
  -o my_thesis.pdf
```

### Two-Step Flow (Frontend Integration)

```bash
# Step 1: Extract for preview
EXTRACTION=$(curl -s -X POST http://localhost:3077/thesis/extract \
  -F "file=@my_thesis.docx")

EXTRACTION_ID=$(echo $EXTRACTION | jq -r '.extractionId')

# Preview images
curl http://localhost:3077/thesis/extractions/$EXTRACTION_ID/images/{imageId} -o preview.png

# Step 2: Render (after user confirms/edits)
JOB=$(curl -s -X POST http://localhost:3077/thesis/render \
  -H "Content-Type: application/json" \
  -d "{\"extractionId\": \"$EXTRACTION_ID\", \"templateId\": \"sjtu\"}")

JOB_ID=$(echo $JOB | jq -r '.jobId')

# Poll until complete
curl http://localhost:3077/thesis/jobs/$JOB_ID

# Download PDF
curl http://localhost:3077/thesis/jobs/$JOB_ID/download -o output.pdf
```

### Async Job Flow

```bash
# Upload and start processing
JOB=$(curl -s -X POST http://localhost:3077/thesis/upload \
  -F "file=@my_thesis.docx" \
  -F "templateId=sjtu")

JOB_ID=$(echo $JOB | jq -r '.jobId')

# Poll until complete
while true; do
  STATUS=$(curl -s http://localhost:3077/thesis/jobs/$JOB_ID | jq -r '.status')
  echo "Status: $STATUS"
  if [ "$STATUS" = "completed" ]; then break; fi
  if [ "$STATUS" = "failed" ]; then exit 1; fi
  sleep 2
done

# Download
curl http://localhost:3077/thesis/jobs/$JOB_ID/download -o output.pdf
```
