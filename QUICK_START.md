# Quick Start: 3-Step Thesis Formatting

## TL;DR

The new 3-step workflow gives you control over AI generation:

```
1. Analyze  → See what's missing (fast, no AI)
2. Generate → Choose what AI generates (optional)
3. Render   → Create PDF
```

## Why Use the New Workflow?

### Old Way (Still Works)
```javascript
POST /thesis/upload
→ AI generates EVERYTHING automatically
→ No control, wastes tokens on complete fields
```

### New Way (Recommended)
```javascript
POST /thesis/analyze
→ Shows what's missing/incomplete

POST /thesis/generate (only if needed)
→ YOU choose what to generate

POST /thesis/render
→ Create PDF
```

**Benefits**: 80% token savings, 5x faster analysis, better UX

---

## Quick Example

### JavaScript/Fetch

```javascript
// Step 1: Analyze (no AI)
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('templateId', 'njulife-2');

const analysis = await fetch('/thesis/analyze', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
}).then(r => r.json());

// Check what's missing
console.log('Suggestions:', analysis.analysis.suggestions);
// Example: ["Missing metadata: supervisor, date", "Abstract is incomplete"]

// Step 2: Generate only what's needed
const generated = await fetch('/thesis/generate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    analysisId: analysis.analysisId,
    generateFields: {
      metadata: ['supervisor', 'date'],  // Only these fields
      abstract: true                      // And the abstract
    }
  })
}).then(r => r.json());

// Step 3: Render PDF
const job = await fetch('/thesis/render', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    analysisId: analysis.analysisId,
    templateId: 'njulife-2'
  })
}).then(r => r.json());

// Poll for completion
const pollJob = async (jobId) => {
  const status = await fetch(`/thesis/jobs/${jobId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(r => r.json());

  if (status.status === 'completed') {
    window.location.href = status.downloadUrl;
  } else if (status.status === 'failed') {
    console.error('Job failed:', status.error);
  } else {
    setTimeout(() => pollJob(jobId), 2000);
  }
};

pollJob(job.jobId);
```

### cURL

```bash
# Step 1: Analyze
ANALYSIS=$(curl -X POST http://localhost:3000/thesis/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@thesis.docx" \
  -F "templateId=njulife-2")

ANALYSIS_ID=$(echo $ANALYSIS | jq -r '.analysisId')

# Step 2: Generate selected fields
curl -X POST http://localhost:3000/thesis/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"analysisId\": \"$ANALYSIS_ID\",
    \"generateFields\": {
      \"metadata\": [\"supervisor\"],
      \"abstract\": true
    }
  }"

# Step 3: Render
JOB=$(curl -X POST http://localhost:3000/thesis/render \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"analysisId\": \"$ANALYSIS_ID\",
    \"templateId\": \"njulife-2\"
  }")

JOB_ID=$(echo $JOB | jq -r '.jobId')

# Poll for completion
while true; do
  STATUS=$(curl -H "Authorization: Bearer $TOKEN" \
    "http://localhost:3000/thesis/jobs/$JOB_ID")

  STATE=$(echo $STATUS | jq -r '.status')

  if [ "$STATE" = "completed" ]; then
    echo "Download: http://localhost:3000/thesis/jobs/$JOB_ID/download"
    break
  elif [ "$STATE" = "failed" ]; then
    echo "Failed: $(echo $STATUS | jq -r '.error')"
    break
  fi

  sleep 2
done
```

---

## Common Scenarios

### Scenario 1: Complete Thesis, Just Need PDF

```javascript
// Analyze
const analysis = await analyzeThesis(file, 'njulife-2');

// Skip generation if complete
if (analysis.analysis.suggestions.includes('Document appears complete')) {
  // Render directly
  const job = await renderThesis(analysis.analysisId, 'njulife-2');
}
```

### Scenario 2: Missing Metadata Only

```javascript
const analysis = await analyzeThesis(file, 'njulife-2');

// Generate only missing metadata
await generateFields(analysis.analysisId, {
  metadata: ['supervisor', 'school', 'date']
});

const job = await renderThesis(analysis.analysisId, 'njulife-2');
```

### Scenario 3: Rough Draft, Need Everything

```javascript
const analysis = await analyzeThesis(roughDraft, 'thu');

// Generate all fields
await generateFields(analysis.analysisId, {
  metadata: ['title', 'supervisor', 'school', 'major', 'date'],
  abstract: true,
  abstract_en: true,
  keywords: true,
  keywords_en: true,
  sections: {
    enhance: true,
    addMissing: ['引言', '文献综述', '研究方法', '实验结果', '结论']
  },
  references: true,
  acknowledgements: true
});

const job = await renderThesis(analysis.analysisId, 'thu');
```

### Scenario 4: Iterative Enhancement

```javascript
// Analyze
const analysis = await analyzeThesis(file, 'njulife-2');

// First: Generate abstract
await generateFields(analysis.analysisId, {
  abstract: true
});

// Review abstract...

// Then: Enhance sections
await generateFields(analysis.analysisId, {
  sections: { enhance: true, addMissing: [] }
});

// Finally: Render
const job = await renderThesis(analysis.analysisId, 'njulife-2');
```

---

## Field Options Reference

### Metadata Fields
```javascript
metadata: [
  'title',        // 论文标题
  'title_en',     // English title
  'author_name',  // 作者姓名
  'student_id',   // 学号
  'school',       // 学院
  'major',        // 专业
  'supervisor',   // 导师
  'date'          // 日期
]
```

### Abstract & Keywords
```javascript
abstract: true,        // 中文摘要
abstract_en: true,     // English abstract
keywords: true,        // 中文关键词
keywords_en: true      // English keywords
```

### Sections
```javascript
sections: {
  enhance: true,                    // Enhance existing sections
  addMissing: ['引言', '结论']      // Generate new sections by name
}
```

### Other
```javascript
references: true,        // Format/generate references
acknowledgements: true   // Generate acknowledgements
```

---

## React Hook Example

```jsx
function useThesisFormatter() {
  const [step, setStep] = useState('idle');
  const [analysis, setAnalysis] = useState(null);
  const [job, setJob] = useState(null);

  const analyze = async (file, templateId) => {
    setStep('analyzing');
    const result = await analyzeThesis(file, templateId);
    setAnalysis(result);
    setStep('analyzed');
    return result;
  };

  const generate = async (fields) => {
    setStep('generating');
    await generateFields(analysis.analysisId, fields);
    setStep('generated');
  };

  const render = async (templateId) => {
    setStep('rendering');
    const result = await renderThesis(analysis.analysisId, templateId);
    setJob(result);
    setStep('polling');
    pollJobStatus(result.jobId);
  };

  return { step, analysis, job, analyze, generate, render };
}

// Usage
function ThesisUploader() {
  const { step, analysis, analyze, generate, render } = useThesisFormatter();

  if (step === 'analyzed') {
    return (
      <div>
        <h3>Analysis Results</h3>
        <ul>
          {analysis.analysis.suggestions.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>

        <button onClick={() => generate({ abstract: true })}>
          Generate Abstract
        </button>

        <button onClick={() => render('njulife-2')}>
          Skip Generation & Render
        </button>
      </div>
    );
  }

  return <input type="file" onChange={e => analyze(e.target.files[0], 'njulife-2')} />;
}
```

---

## Still Want the Old Way?

The old endpoints still work:

```javascript
// Old monolithic upload
POST /thesis/upload
→ Automatic AI generation of everything

// Old 2-step extract + render
POST /thesis/extract
POST /thesis/render (with extractionId)
```

No migration required. Both flows coexist.

---

## Templates Available

- `njulife-2` - Nanjing University Life Sciences (v2) ⭐ Recommended
- `njulife` - Nanjing University Life Sciences (v1)
- `thu` - Tsinghua University
- `njuthesis` - Nanjing University Official
- `scut` - South China University of Technology
- `hunnu` - Hunan Normal University

---

## Need Help?

- **Full API Docs**: See `API_DOCUMENTATION.md`
- **Migration Guide**: See `MIGRATION_GUIDE.md`
- **Technical Details**: See `IMPLEMENTATION_SUMMARY.md`
- **Interactive Docs**: Visit `http://localhost:3000/api` when server is running

---

## Tips

### 💡 Save Tokens
Only generate fields you actually need. Analyze first, generate selectively.

### 💡 Iterative Workflow
Generate abstract first, review it, then generate sections. You're in control!

### 💡 State Expires
Analysis data expires after 1 hour. Store it locally if you need it longer.

### 💡 Idempotent Generation
Calling `/generate` again will regenerate the same fields. Use this to tweak results.

### 💡 Model Selection
Override default model with `model: "gpt-4o"` parameter in generate request.

---

**Ready to start?** Upload a thesis and see the magic! ✨
