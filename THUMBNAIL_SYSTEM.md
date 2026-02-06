# Thumbnail Generation System

## Overview

The thumbnail generation system creates preview images for all 6 thesis templates to help users visually select templates in the UI. Thumbnails are pre-generated and committed to the repository for immediate availability.

## Architecture

### Technology Stack
- **pdftoppm** (Poppler utils) - PDF to image conversion
- **sharp** - Image optimization and resizing
- **File system storage** - `/public/thumbnails/` directory
- **NestJS module** - ThumbnailModule with service/controller

### Directory Structure

```
public/thumbnails/
├── templates/          # Pre-generated (committed to git)
│   ├── thu.png
│   ├── njulife.png
│   ├── njulife-2.png
│   ├── njuthesis.png
│   ├── scut.png
│   └── hunnu.png
└── custom/             # Runtime generated (gitignored)

scripts/
├── generate-thumbnails.ts   # CLI script for batch generation
└── sample-documents/         # Sample data for each template
    ├── thu-sample.json
    ├── njulife-sample.json
    ├── njulife-2-sample.json
    ├── njuthesis-sample.json
    ├── scut-sample.json
    └── hunnu-sample.json

src/thumbnail/
├── thumbnail.module.ts
├── thumbnail.service.ts
├── thumbnail.controller.ts
└── dto/
    └── thumbnail-options.dto.ts
```

## Thumbnail Specifications

- **Dimensions**: 300x400px (3:4 aspect ratio)
- **Format**: PNG (lossless, better for documents)
- **Quality**: Sharp compression level 8
- **Target Size**: <100KB per thumbnail (actual: 12-29KB)
- **Source**: First page of compiled LaTeX PDF at 150 DPI

## Generation Pipeline

1. Compile sample LaTeX document using `LatexService.render()`
2. Extract first page from PDF: `pdftoppm -png -f 1 -l 1 -r 150 input.pdf output`
3. Resize and optimize using sharp: 300x400px, PNG format, compression level 8
4. Save to `/public/thumbnails/templates/[templateId].png`

## API Endpoints

### Get Template Thumbnail
```http
GET /templates/:id/thumbnail
```

Returns PNG image with cache headers (24h).

**Example:**
```bash
curl http://localhost:3077/templates/thu/thumbnail > thu-preview.png
```

### List All Thumbnails
```http
GET /templates/thumbnails
```

Returns map of template IDs to thumbnail URLs.

**Response:**
```json
{
  "thumbnails": {
    "thu": "/templates/thu/thumbnail",
    "njulife": "/templates/njulife/thumbnail",
    ...
  }
}
```

### List Templates with Thumbnails
```http
GET /templates
```

Returns template list including thumbnail metadata.

**Response:**
```json
{
  "templates": [
    {
      "id": "thu",
      "name": "清华大学本科学位论文",
      "thumbnailUrl": "/templates/thu/thumbnail",
      "hasThumbnail": true,
      ...
    }
  ]
}
```

### Regenerate Thumbnail (Admin)
```http
POST /admin/templates/:id/thumbnail/regenerate
```

Admin endpoint for regenerating thumbnails (requires sample document in CLI).

## CLI Usage

### Generate All Thumbnails

```bash
npm run thumbnails:generate
```

**Output:**
```
✅ Successfully generated:
  - njulife
  - njulife-2
  - thu
  - njuthesis
  - scut
  - hunnu

Thumbnails saved to: public/thumbnails/templates/
```

### Add New Template Thumbnail

1. Create sample document in `scripts/sample-documents/[template-id]-sample.json`
2. Run generation script: `npm run thumbnails:generate`
3. Commit generated PNG: `git add public/thumbnails/templates/[template-id].png`

## Sample Document Format

Sample documents must include all required fields for the template:

```json
{
  "metadata": {
    "title": "论文标题示例",
    "author_name": "张三",
    "major": "计算机科学与技术",
    "supervisor": "李教授"
  },
  "abstract": "摘要内容...",
  "keywords": "关键词1; 关键词2",
  "sections": [
    {
      "title": "绪论",
      "content": "章节内容...",
      "level": 1
    }
  ],
  "references": "[1] 参考文献...",
  "acknowledgements": "致谢内容..."
}
```

## Integration with Existing Code

### Template Service
- Modified `loadBuiltInTemplates()` to populate thumbnail metadata
- Checks file existence and sets `thumbnailUrl` and `hasThumbnail` fields

### Template Controller
- Updated `findTemplates()` response to include thumbnail metadata

### Main Application
- Configured static file serving for `/public/` directory

## Performance

- **Generation Time**: ~30 seconds for all 6 templates (parallel processing)
- **File Sizes**: 12-29KB per thumbnail
- **API Response**: <10ms (served from file system with caching)
- **Total Storage**: ~110KB for all 6 thumbnails

## Error Handling

- **LaTeX Compilation Fails**: Logs error, skips thumbnail generation
- **PDF Conversion Fails**: Checks pdftoppm availability, throws error
- **File System Errors**: Ensures directories exist, handles permissions
- **Missing Template**: Returns 404 for thumbnail endpoint
- **Cache Strategy**: 24-hour browser cache for static thumbnails

## Maintenance

### Update Thumbnail
1. Modify sample document or template
2. Run: `npm run thumbnails:generate`
3. Commit changes: `git add public/thumbnails/templates/[id].png`

### Verify Thumbnails
```bash
# Check all thumbnails exist
ls -lh public/thumbnails/templates/

# Verify image dimensions
file public/thumbnails/templates/*.png

# Test API endpoints
curl http://localhost:3077/templates/thumbnails | jq
```

## Future Enhancements

- Multiple thumbnail sizes (small/medium/large)
- Animated GIF showing first 3 pages
- WebP format for smaller file sizes
- User-uploaded custom thumbnails
- Dynamic thumbnail updates when template changes
- CDN integration for global distribution
