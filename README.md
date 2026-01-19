# Thesis Formatter

NestJS microservice for formatting thesis documents using LaTeX templates.

## Features

- Upload `.docx`, `.md`, `.txt`, or `.pdf` thesis drafts via REST API
- Extract text and images using mammoth/PyMuPDF
- Parse content with LLM (OpenAI or Gateway proxy)
- Dynamic chapter extraction (adapts to any thesis structure)
- Format references according to **GB/T 7714-2015** Chinese standard
- Render thesis using LaTeX (tectonic)
- Return formatted PDF and TeX source files

## Tech Stack

- **Framework**: NestJS (TypeScript)
- **Document Extraction**: mammoth, PyMuPDF
- **LaTeX Engine**: tectonic
- **LLM**: OpenAI SDK or Gateway proxy
- **Authentication**: Casdoor JWT (JWKS)

## Server Deployment

### Prerequisites

```bash
# 1. Install Node.js (18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 2. Install tectonic (LaTeX compiler)
curl --proto '=https' --tlsv1.2 -fsSL https://drop-sh.fullyjustified.net | sh
sudo mv tectonic /usr/local/bin/

# 3. Install Python3 and PyMuPDF
sudo apt install -y python3 python3-pip
pip3 install pymupdf

# 4. Install PM2
npm install -g pm2
```

### Font Installation (Required for Chinese Templates)

```bash
# Install Microsoft core fonts (Times New Roman, Arial, etc.)
sudo apt install -y ttf-mscorefonts-installer
sudo fc-cache -f -v

# Install Chinese fonts (SimSun, SimHei, KaiTi, FangSong)
sudo apt install -y fonts-wqy-microhei fonts-wqy-zenhei

# For additional Chinese fonts (Kaiti SC, Songti SC, etc.)
# Download and install from: https://github.com/ArtifexSoftware/fonts
mkdir -p ~/.fonts
# Copy .ttf/.otf files to ~/.fonts
fc-cache -f -v

# Verify fonts are installed
fc-list :lang=zh
fc-list | grep -i "times"
fc-list | grep -i "kaiti"
```

### Quick Font Install Script

```bash
#!/bin/bash
# install-fonts.sh

# Microsoft fonts
echo "Installing Microsoft fonts..."
sudo DEBIAN_FRONTEND=noninteractive apt install -y ttf-mscorefonts-installer

# Chinese fonts
echo "Installing Chinese fonts..."
sudo apt install -y fonts-wqy-microhei fonts-wqy-zenhei fonts-arphic-ukai fonts-arphic-uming

# CJK fonts for better coverage
sudo apt install -y fonts-noto-cjk fonts-noto-cjk-extra

# Refresh font cache
echo "Refreshing font cache..."
sudo fc-cache -f -v

echo "Done! Installed fonts:"
fc-list | grep -E "(Times|SimSun|SimHei|Kaiti|Song|Hei)" | head -20
```

### Deploy Application

```bash
# Clone and install
git clone https://github.com/TheAnyInt/sight-app-thesis-formatter.git
cd sight-app-thesis-formatter
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Build and start with PM2
npm run build
pm2 start dist/main.js --name thesis-formatter

# View logs
pm2 logs thesis-formatter
```

## Configuration

```env
# Authentication (set to 'false' to disable JWT verification)
AUTH_ENABLED=true

# Casdoor JWT Validation (JWKS URI)
CASDOOR_JWKS_JSON=https://auth.example.com/.well-known/jwks

# Gateway Configuration (priority over direct OpenAI)
GATEWAY_URL=http://your-gateway:8718

# OpenAI Configuration (fallback when Gateway not configured)
OPENAI_API_KEY=your-api-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o

# Server Configuration
PORT=3000
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/templates` | GET | List available templates |
| `/thesis/upload` | POST | Upload and process thesis |
| `/thesis/jobs/:id` | GET | Check job status |
| `/thesis/jobs/:id/download` | GET | Download PDF |
| `/thesis/jobs/:id/tex` | GET | Download TeX source |
| `/api` | GET | Swagger documentation |

## Usage

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod

# With PM2
pm2 start dist/main.js --name thesis-formatter
```

## API Examples

### Upload Thesis

```bash
curl -X POST http://localhost:3000/thesis/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@thesis.md" \
  -F "templateId=njulife"
```

### Check Job Status

```bash
curl http://localhost:3000/thesis/jobs/JOB_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Download PDF

```bash
curl -o thesis.pdf http://localhost:3000/thesis/jobs/JOB_ID/download \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Available Templates

| Template ID | School | Description |
|-------------|--------|-------------|
| `njulife` | 南京大学生命科学学院 | 硕士学位论文模板 |
| `njulife-2` | 南京大学生命科学学院 | v2 (使用外部封面PDF) |
| `thu` | 清华大学 | 本科学位论文模板 |
| `njuthesis` | 南京大学 | 官方学位论文模板 (njuthesis v1.4.3) |
| `scut` | 华南理工大学 | 博士/硕士学位论文模板 |

## Template Font Requirements

> **IMPORTANT**: When adding a new template, document the required fonts below and update the install script!

### njulife / njulife-2

| Font | Type | Usage |
|------|------|-------|
| Times New Roman | English serif | Main text |
| Arial | English sans | Headers |
| Courier New | English mono | Code |
| Calibri | English | Cover page |
| SimSun (宋体) | Chinese serif | Main text |
| SimHei (黑体) | Chinese sans | Headers |
| FangSong (仿宋) | Chinese | Quotes |

### thu (ctexart default)

| Font | Type | Usage |
|------|------|-------|
| Kaiti SC / AR PL UKai (楷体) | Chinese | Italic text |
| SimSun / Songti (宋体) | Chinese serif | Main text |
| SimHei / Heiti (黑体) | Chinese sans | Headers |

### njuthesis (NJU official template v1.4.3)

| Font | Type | Usage |
|------|------|-------|
| Times New Roman | English serif | Main text |
| Noto Serif CJK SC / Source Han Serif (思源宋体) | Chinese serif | Main text |
| Noto Sans CJK SC / Source Han Sans (思源黑体) | Chinese sans | Headers |
| SimSun (宋体) | Chinese | Fallback |
| SimHei (黑体) | Chinese | Fallback |

**Installation:**
```bash
# Install Noto CJK fonts (recommended for njuthesis)
sudo apt-get install fonts-noto-cjk fonts-noto-cjk-extra
```

### scut (SCUT thesis template)

| Font | Type | Usage |
|------|------|-------|
| Times New Roman | English serif | Main text |
| SimSun (宋体) | Chinese serif | Main text (bundled: simsun.ttc) |
| SimHei (黑体) | Chinese sans | Headers (bundled: simhei.ttf) |
| KaiTi_GB2312 (楷体) | Chinese | Quotes |
| FangSong_GB2312 (仿宋) | Chinese | Special text |

> **Note:** SCUT template bundles `simsun.ttc` and `simhei.ttf` in template assets.

### Install All Required Fonts (Remote Server)

```bash
# One-liner to install all fonts for all templates
sudo DEBIAN_FRONTEND=noninteractive apt install -y \
  ttf-mscorefonts-installer \
  fonts-noto-cjk \
  fonts-noto-cjk-extra \
  fonts-arphic-ukai \
  fonts-arphic-uming \
  fonts-wqy-microhei \
  fonts-wqy-zenhei \
  && sudo fc-cache -fv

# Verify installation
fc-list | grep -iE "(times|simsun|simhei|kaiti|songti|heiti|fang)" | head -15
```

### Adding a New Template Checklist

1. [ ] Add template files to `templates/<template-id>/`
2. [ ] Register template in `src/template/template.service.ts`
3. [ ] **Document required fonts** in this README section
4. [ ] **Update install script** with any new font packages
5. [ ] Test on remote server with fresh font cache

## Troubleshooting

### Font Issues

If you see errors like `The font "Times New Roman" cannot be found`:

```bash
# Check if font is installed
fc-list | grep -i "times"

# Install Microsoft fonts
sudo apt install ttf-mscorefonts-installer
sudo fc-cache -f -v
```

For Chinese font errors (`Kaiti SC`, `SimSun`, etc.):

```bash
# Install comprehensive CJK fonts
sudo apt install -y fonts-noto-cjk fonts-noto-cjk-extra
sudo fc-cache -f -v
```

### Gateway Connection Issues

Check if Gateway URL is correct and accessible:

```bash
curl -s "http://YOUR_GATEWAY/openai/v1/chat/completions" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o","messages":[{"role":"user","content":"Hello"}],"max_tokens":10}'
```

## License

MIT
