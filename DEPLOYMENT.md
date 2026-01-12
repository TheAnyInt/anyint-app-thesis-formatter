# Deployment Guide

## Prerequisites

### System Dependencies

1. **Node.js** (v18+)
2. **Python 3** with PyMuPDF:
   ```bash
   pip3 install pymupdf
   ```
3. **Tectonic** (LaTeX compiler):
   ```bash
   # macOS
   brew install tectonic

   # Linux
   curl --proto '=https' --tlsv1.2 -fsSL https://drop-sh.fullyjustified.net | sh
   ```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Required
OPENAI_API_KEY=sk-xxx           # For LLM parsing
OPENAI_BASE_URL=https://api.openai.com/v1

# Authentication (Casdoor)
CASDOOR_ENDPOINT=https://auth.example.com
CASDOOR_CLIENT_ID=xxx
CASDOOR_CLIENT_SECRET=xxx

# Optional
PORT=3077                        # Default: 3077
```

## Installation

```bash
cd thesis-formatter
npm install
```

## Running

### Development
```bash
npm run start:dev
```

### Production
```bash
npm run build
npm run start:prod
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/thesis/upload` | POST | Upload and process thesis file |
| `/thesis/extract` | POST | Extract content only (step 1) |
| `/thesis/render` | POST | Render from extraction (step 2) |
| `/thesis/jobs/:jobId` | GET | Get job status |
| `/thesis/jobs/:jobId/download` | GET | Download output PDF |
| `/templates` | GET | List available templates |

## Cover PDF Modification

The `njulife-2` template supports automatic cover PDF modification.

### How it works

1. When rendering with `njulife-2` template, the system calls `scripts/modify_cover_pdf.py`
2. The script uses PyMuPDF to:
   - Fill Page 1 fields (论文题目, 作者姓名, 专业名称, 研究方向, 导师姓名)
   - Replace Page 3 placeholders (中文题目, 英文题目) with actual titles
   - Insert author/supervisor names on Page 3
3. The modified cover.pdf is included in the final thesis PDF

### Required document fields

For cover modification to work, provide these fields in your document:

```json
{
  "title": "中文标题",
  "titleEn": "English Title",
  "author": "作者姓名",
  "major": "专业名称",
  "researchDirection": "研究方向",
  "supervisor": "导师姓名"
}
```

### Troubleshooting

If cover modification fails:
- Check Python 3 and PyMuPDF are installed
- Verify `scripts/modify_cover_pdf.py` exists
- Check logs for specific errors
- The system will fall back to the original cover.pdf

## File Structure

```
thesis-formatter/
├── src/                    # NestJS source code
│   ├── latex/             # LaTeX rendering service
│   ├── thesis/            # Thesis processing
│   └── template/          # Template management
├── scripts/               # Python helper scripts
│   ├── extract_pdf.py     # PDF text extraction
│   ├── generate_docx.py   # DOCX generation
│   └── modify_cover_pdf.py # Cover PDF modification
├── templates/             # Template assets
│   └── njulife-2/         # NJU Life Sciences template v2
│       ├── cover.pdf      # Cover template
│       ├── simsun.ttc     # Chinese font
│       ├── calibri.ttf    # English font
│       └── main.tex       # LaTeX template
└── output/                # Generated files (per job)
```

## Health Check

```bash
curl http://localhost:3077/templates
```

Should return list of available templates.
