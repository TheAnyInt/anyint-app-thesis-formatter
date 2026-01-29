# Thesis Formatter API Documentation

## Overview

The Thesis Formatter API provides two workflows for formatting academic theses:
1. **Legacy 2-Step Flow** - Extract + Render (all AI generation automatic)
2. **New 3-Step Flow** - Analyze + Generate (selective) + Render (user controls AI)

## Authentication

All endpoints require Bearer token authentication via the `Authorization` header:
```
Authorization: Bearer <your-jwt-token>
```

## Base URL

```
http://localhost:3000/thesis
```

---

## 🆕 New 3-Step Workflow

### Step 1: Analyze Document (AI-Powered)

**Endpoint:** `POST /thesis/analyze`

**Purpose:** Extract content using AI and analyze completeness against template requirements.

**🆕 Update:** This endpoint now uses AI for intelligent content extraction, supporting non-structured documents and natural language.

**Request:**
```http
POST /thesis/analyze
Content-Type: multipart/form-data
Authorization: Bearer <token>

file: <document-file>          # .docx, .pdf, .txt, .md (max 50MB)
templateId: "njulife-2"        # Required template ID
model: "gpt-4o"                # Optional: LLM model (default: gpt-4o)
```

**Features:**
- ✅ AI-powered extraction (handles any document format)
- ✅ Template-aware analysis (different templates → different results)
- ✅ Long document support (>45k chars auto-chunked)
- ✅ Multi-language support (Chinese + English)
- ⏱️ Processing time: ~3-5 seconds for short docs, more for long docs

**Response:**
```json
{
  "analysisId": "uuid",
  "extractedData": {
    "metadata": {
      "title": "Extracted or empty",
      "title_en": "Extracted or empty (if available)",
      "author_name": "Extracted or empty",
      "author_name_en": "Extracted or empty (for NJULife template)",
      "student_id": "Extracted or empty",
      "school": "Extracted or empty",
      "major": "Extracted or empty",
      "major_en": "Extracted or empty (for NJULife template)",
      "supervisor": "Extracted or empty",
      "supervisor_en": "Extracted or empty (for NJULife template)",
      "date": "Extracted or empty",
      ...
    },
    "abstract": "Extracted or empty",
    "sections": [
      {
        "title": "Section Title",
        "content": "Section content",
        "level": 1
      }
    ],
    "references": "Extracted or empty",
    ...
  },
  "templateRequirements": {
    "requiredFields": ["metadata.title", "abstract", ...],
    "requiredSections": ["sections"]
  },
  "analysis": {
    "completeness": {
      "metadata": {
        "title": "complete | partial | missing",
        "author_name": "complete | partial | missing",
        ...
      },
      "abstract": "complete | partial | missing",
      "sections": {
        "hasContent": true,
        "count": 5,
        "qualityScore": "good | sparse | empty"
      },
      ...
    },
    "suggestions": [
      "Missing metadata: supervisor, date",
      "Abstract is incomplete - AI can enhance",
      "Found 5 sections with sparse content"
    ]
  },
  "model": "gpt-4o",                   // LLM model used for analysis
  "images": [
    {
      "id": "docximg1",
      "filename": "docximg1.png",
      "contentType": "image/png",
      "url": "/thesis/analyses/{analysisId}/images/docximg1"
    }
  ],
  "createdAt": "2024-01-29T12:00:00Z",
  "expiresAt": "2024-01-29T13:00:00Z"  // 1 hour TTL
}
```

**Status Codes:**
- `200` - Analysis complete
- `400` - Invalid file type or missing templateId
- `401` - Unauthorized

---

### Step 2: Generate Selected Fields (Optional)

**Endpoint:** `POST /thesis/generate`

**Purpose:** Selectively generate ONLY user-specified fields with AI.

**Request:**
```json
POST /thesis/generate
Content-Type: application/json
Authorization: Bearer <token>

{
  "analysisId": "uuid-from-step-1",
  "generateFields": {
    "metadata": ["title", "supervisor", "date"],  // Optional: specific fields
    "abstract": true,                              // Optional: generate Chinese abstract
    "abstract_en": true,                           // Optional: generate English abstract
    "keywords": true,                              // Optional: generate Chinese keywords
    "keywords_en": true,                           // Optional: generate English keywords
    "sections": {                                  // Optional: section operations
      "enhance": true,                             // Enhance existing sections
      "addMissing": ["引言", "结论"]               // Generate new sections by name
    },
    "references": true,                            // Optional: format/generate references
    "acknowledgements": true                       // Optional: generate acknowledgements
  },
  "model": "gpt-4o"  // Optional: override default model
}
```

**Response:**
```json
{
  "enrichedData": {
    "metadata": {
      "title": "Original or AI-generated",
      "supervisor": "AI-generated",
      ...
    },
    "abstract": "AI-generated or original",
    "sections": [
      {
        "title": "Section",
        "content": "Enhanced or original content",
        "level": 1
      }
    ],
    ...
  },
  "generatedFields": [
    "metadata",
    "abstract",
    "sections"
  ],
  "model": "gpt-4o"
}
```

**Status Codes:**
- `200` - Generation successful
- `400` - Invalid request or model
- `404` - Analysis not found or expired
- `401` - Unauthorized

**Notes:**
- All fields are optional - generate only what you need
- Idempotent: calling again will regenerate the same fields
- Analysis data is updated with enriched content

---

### Step 3: Render PDF

**Endpoint:** `POST /thesis/render`

**Purpose:** Create PDF from analyzed/generated data.

**Request:**
```json
POST /thesis/render
Content-Type: application/json
Authorization: Bearer <token>

{
  "analysisId": "uuid-from-step-1",  // New flow (preferred)
  // OR
  "extractionId": "uuid",             // Old flow (backward compatible)

  "templateId": "njulife-2",          // Required
  "document": {                       // Optional: manual overrides
    "metadata": { ... },
    "sections": [ ... ]
  }
}
```

**Response:**
```json
{
  "jobId": "job-uuid",
  "status": "pending",
  "pollUrl": "/thesis/jobs/job-uuid"
}
```

**Status Codes:**
- `200` - Job created
- `400` - Invalid request (need either analysisId or extractionId)
- `404` - Analysis/Extraction not found
- `401` - Unauthorized

---

## 📊 Job Status and Download

### Get Job Status

**Endpoint:** `GET /thesis/jobs/:jobId`

**Response:**
```json
{
  "jobId": "job-uuid",
  "status": "pending | processing | completed | failed",
  "progress": 75,
  "createdAt": "2024-01-29T12:00:00Z",
  "updatedAt": "2024-01-29T12:01:30Z",

  // If completed:
  "downloadUrl": "/thesis/jobs/job-uuid/download",
  "texUrl": "/thesis/jobs/job-uuid/tex",

  // If failed:
  "error": "Error message"
}
```

### Download PDF

**Endpoint:** `GET /thesis/jobs/:jobId/download`

**Response:** PDF file download

### Download TeX Source

**Endpoint:** `GET /thesis/jobs/:jobId/tex`

**Response:** LaTeX source file download

---

## 📜 Legacy Workflows

### Legacy: Upload (Monolithic)

**Endpoint:** `POST /thesis/upload`

**Purpose:** Upload file and process with AI (all-or-nothing).

**Request:**
```http
POST /thesis/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

file: <document-file>
templateId: "njulife-2"
model: "gpt-4o"  # Optional
```

**Response:**
```json
{
  "jobId": "job-uuid",
  "status": "pending",
  "model": "gpt-4o",
  "pollUrl": "/thesis/jobs/job-uuid"
}
```

---

### Legacy: Extract + Render (2-Step)

#### Step 1: Extract

**Endpoint:** `POST /thesis/extract`

**Request:**
```http
POST /thesis/extract
Content-Type: multipart/form-data
Authorization: Bearer <token>

file: <document-file>
model: "gpt-4o"  # Optional
```

**Response:**
```json
{
  "extractionId": "uuid",
  "document": {
    "metadata": { ... },
    "sections": [ ... ],
    ...
  },
  "images": [ ... ],
  "createdAt": "2024-01-29T12:00:00Z",
  "model": "gpt-4o"
}
```

#### Step 2: Render

**Endpoint:** `POST /thesis/render`

Use `extractionId` instead of `analysisId`.

---

## 🔍 Utility Endpoints

### List Available Models

**Endpoint:** `GET /thesis/models`

**Response:**
```json
{
  "models": [
    "gpt-4o",
    "gpt-4-turbo",
    "DeepSeek-V3.2-Exp"
  ],
  "defaultModel": "gpt-4o"
}
```

### List User Jobs

**Endpoint:** `GET /thesis/jobs?page=1&count=10`

**Query Parameters:**
- `page` (optional): Page number (1-indexed)
- `count` (optional): Items per page (max 100)

**Response:**
```json
{
  "jobs": [
    {
      "jobId": "job-uuid",
      "status": "completed",
      "progress": 100,
      "templateId": "njulife-2",
      "createdAt": "2024-01-29T12:00:00Z",
      "updatedAt": "2024-01-29T12:05:00Z",
      "downloadUrl": "/thesis/jobs/job-uuid/download",
      "texUrl": "/thesis/jobs/job-uuid/tex"
    }
  ],
  "total": 42,
  "page": 1,
  "count": 10,
  "totalPages": 5
}
```

---

## 📝 Complete Workflow Examples

### Example 1: Minimal AI Generation

User has a complete thesis but wants AI to generate missing supervisor and abstract.

```bash
# Step 1: Analyze
curl -X POST http://localhost:3000/thesis/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@thesis.docx" \
  -F "templateId=njulife-2"

# Response: analysisId, shows supervisor and abstract are missing

# Step 2: Generate only supervisor and abstract
curl -X POST http://localhost:3000/thesis/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "analysisId": "<analysisId>",
    "generateFields": {
      "metadata": ["supervisor"],
      "abstract": true
    }
  }'

# Step 3: Render
curl -X POST http://localhost:3000/thesis/render \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "analysisId": "<analysisId>",
    "templateId": "njulife-2"
  }'

# Poll for completion
curl http://localhost:3000/thesis/jobs/<jobId> \
  -H "Authorization: Bearer $TOKEN"

# Download
curl http://localhost:3000/thesis/jobs/<jobId>/download \
  -H "Authorization: Bearer $TOKEN" \
  -o thesis.pdf
```

### Example 2: Maximum AI Generation

User has rough notes and wants AI to generate everything.

```bash
# Step 1: Analyze
curl -X POST http://localhost:3000/thesis/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@notes.txt" \
  -F "templateId=thu"

# Step 2: Generate all fields
curl -X POST http://localhost:3000/thesis/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "analysisId": "<analysisId>",
    "generateFields": {
      "metadata": ["title", "supervisor", "school", "major", "date"],
      "abstract": true,
      "abstract_en": true,
      "keywords": true,
      "keywords_en": true,
      "sections": {
        "enhance": true,
        "addMissing": ["引言", "文献综述", "研究方法", "实验结果", "结论"]
      },
      "references": true,
      "acknowledgements": true
    },
    "model": "gpt-4o"
  }'

# Step 3: Render
curl -X POST http://localhost:3000/thesis/render \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "analysisId": "<analysisId>",
    "templateId": "thu"
  }'
```

### Example 3: Iterative Enhancement

User analyzes, generates abstract, reviews, then generates sections.

```bash
# Step 1: Analyze
# ... (same as above)

# Step 2a: Generate abstract only
curl -X POST http://localhost:3000/thesis/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "analysisId": "<analysisId>",
    "generateFields": {
      "abstract": true
    }
  }'

# User reviews the abstract in the response

# Step 2b: Generate sections (idempotent - can call multiple times)
curl -X POST http://localhost:3000/thesis/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "analysisId": "<analysisId>",
    "generateFields": {
      "sections": {
        "enhance": true,
        "addMissing": []
      }
    }
  }'

# Step 3: Render
# ... (same as above)
```

---

## 🎯 Available Templates

Current supported templates:
- `njulife-2` - Nanjing University Life Sciences (v2)
- `njulife` - Nanjing University Life Sciences (v1)
- `thu` - Tsinghua University
- `njuthesis` - Nanjing University Official (v1.4.3)
- `scut` - South China University of Technology
- `hunnu` - Hunan Normal University

### Template Field Requirements

Each template has specific field requirements. The system automatically maps template-specific field names to standardized ThesisData fields:

| Template | Required Fields | Special Field Mappings |
|----------|----------------|------------------------|
| **HUNNU** | title, titleEn, author, major, advisor, college, studentId | `advisor` → `supervisor`<br>`college` → `school` |
| **THU** | title, author, major, supervisor | (standard fields) |
| **NJULife** | title, titleEn, author, authorEn, major, majorEn, supervisor, supervisorEn | `authorEn` → `author_name_en`<br>`majorEn` → `major_en`<br>`supervisorEn` → `supervisor_en` |
| **NJULife-2** | title, titleEn, author, major, supervisor | (standard fields) |
| **NJUThesis** | title, titleEn, author, major, supervisor | (standard fields) |
| **SCUT** | title, titleEn, author, major, supervisor, department | `department` → `school` |

**Note**: The API automatically handles field name variations. For example:
- When you upload to HUNNU template, the AI extracts `advisor` and stores it as `supervisor`
- When you upload to NJULife template, the AI extracts `authorEn`, `majorEn`, `supervisorEn` and stores them as `author_name_en`, `major_en`, `supervisor_en`

This ensures consistent data structure across all templates while respecting each template's unique terminology.

---

## ⚠️ Important Notes

### State Management
- Both analysis and extraction data expire after **1 hour**
- After expiration, you'll receive a `404` error
- Store the data locally if you need it longer

### File Limits
- Maximum file size: **50MB**
- Supported formats: `.docx`, `.pdf`, `.txt`, `.md`

### Model Selection
- Default model is configured server-side
- Override with `model` parameter if needed
- Check available models with `GET /thesis/models`

### Backward Compatibility
- All legacy endpoints continue to work
- New 3-step flow coexists with old workflows
- Migration is optional but recommended for better control

### Rate Limiting
- LLM calls are subject to rate limits
- Selective generation reduces token usage
- Consider using lighter models for faster processing

---

## 🔄 Migration Guide

### From 2-Step to 3-Step

**Old Code:**
```javascript
// Step 1: Extract (with LLM)
const extraction = await fetch('/thesis/extract', {
  method: 'POST',
  body: formData
});

// Step 2: Render
const job = await fetch('/thesis/render', {
  method: 'POST',
  body: JSON.stringify({
    extractionId: extraction.extractionId,
    templateId: 'njulife-2'
  })
});
```

**New Code:**
```javascript
// Step 1: Analyze (no LLM)
const analysis = await fetch('/thesis/analyze', {
  method: 'POST',
  body: formData
});

// Show user analysis.analysis.suggestions
// Let user choose what to generate

// Step 2: Generate selected fields
const generated = await fetch('/thesis/generate', {
  method: 'POST',
  body: JSON.stringify({
    analysisId: analysis.analysisId,
    generateFields: userSelection  // User controls this!
  })
});

// Step 3: Render
const job = await fetch('/thesis/render', {
  method: 'POST',
  body: JSON.stringify({
    analysisId: analysis.analysisId,
    templateId: 'njulife-2'
  })
});
```

**Benefits:**
- User sees what's missing before AI generation
- User controls token usage (cost)
- Faster initial analysis (no LLM)
- Better for partially complete documents

---

## 📞 Support

For issues or questions:
- GitHub Issues: https://github.com/your-org/thesis-formatter/issues
- Documentation: See `IMPLEMENTATION_SUMMARY.md`

---

## 🔐 Security

- All endpoints require authentication
- File uploads are validated for type and size
- Sensitive data (tokens, credentials) never logged
- State data auto-expires after 1 hour

---

## 📊 OpenAPI/Swagger

Interactive API documentation available at:
```
http://localhost:3000/api
```

Visit this URL when the server is running to explore the API interactively.
