# Migration Guide: 2-Step to 3-Step Workflow

## Overview

The Thesis Formatter now offers a new **3-step workflow** that gives users granular control over AI generation. The old 2-step workflow continues to work for backward compatibility.

## Why Migrate?

### Old Flow Problems
- ❌ AI generates **everything** automatically
- ❌ No control over what gets AI-generated
- ❌ Wastes tokens on fields that don't need generation
- ❌ Slow for users with mostly-complete documents

### New Flow Benefits
- ✅ **See what's missing** before AI generation
- ✅ **Choose exactly** what AI generates
- ✅ **Save tokens** by generating only what's needed
- ✅ **Faster analysis** (no LLM in first step)
- ✅ **Better UX** for partial documents

## Comparison

### Old 2-Step Flow

```
┌─────────────┐
│   Upload    │──► Extract + Parse with LLM ──► All fields AI-generated
└─────────────┘         (slow, all-or-nothing)
        │
        ▼
┌─────────────┐
│   Render    │──► Create PDF
└─────────────┘
```

**Characteristics:**
- Single AI call generates everything
- No user input on what to generate
- Fixed token cost regardless of needs

### New 3-Step Flow

```
┌─────────────┐
│   Analyze   │──► Extract (NO LLM) ──► Completeness report + Suggestions
└─────────────┘         (fast, free)
        │
        ▼
┌─────────────┐
│  Generate   │──► Selective AI generation ──► Only requested fields
└─────────────┘         (user controls)
        │
        ▼
┌─────────────┐
│   Render    │──► Create PDF
└─────────────┘
```

**Characteristics:**
- Analysis is fast (no AI)
- User decides what to generate
- Variable token cost based on selection
- Can skip Step 2 entirely if document is complete

## Migration Examples

### Example 1: Basic Frontend Integration

#### Before (Old 2-Step)

```javascript
// Step 1: Extract with AI
async function extractThesis(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/thesis/extract', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  return response.json();
}

// Step 2: Render
async function renderThesis(extractionId, templateId) {
  const response = await fetch('/thesis/render', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      extractionId,
      templateId
    })
  });

  return response.json();
}

// Usage
const extraction = await extractThesis(file);
const job = await renderThesis(extraction.extractionId, 'njulife-2');
```

#### After (New 3-Step)

```javascript
// Step 1: Analyze (no AI)
async function analyzeThesis(file, templateId) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('templateId', templateId);

  const response = await fetch('/thesis/analyze', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  return response.json();
}

// Step 2: Generate selected fields
async function generateFields(analysisId, fieldsToGenerate) {
  const response = await fetch('/thesis/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      analysisId,
      generateFields: fieldsToGenerate
    })
  });

  return response.json();
}

// Step 3: Render
async function renderThesis(analysisId, templateId) {
  const response = await fetch('/thesis/render', {
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

  return response.json();
}

// Usage
const analysis = await analyzeThesis(file, 'njulife-2');

// Show user the analysis
console.log('Completeness:', analysis.analysis.completeness);
console.log('Suggestions:', analysis.analysis.suggestions);

// Let user choose what to generate
const userSelection = {
  metadata: ['supervisor', 'date'],
  abstract: true
};

const generated = await generateFields(analysis.analysisId, userSelection);
const job = await renderThesis(analysis.analysisId, 'njulife-2');
```

### Example 2: React Component Migration

#### Before

```jsx
function ThesisUploader() {
  const [loading, setLoading] = useState(false);

  const handleUpload = async (file) => {
    setLoading(true);

    // Extract with AI
    const extraction = await extractThesis(file);

    // Render immediately
    const job = await renderThesis(extraction.extractionId, 'njulife-2');

    // Poll for completion
    pollJobStatus(job.jobId);
    setLoading(false);
  };

  return (
    <div>
      <input type="file" onChange={e => handleUpload(e.target.files[0])} />
      {loading && <Spinner />}
    </div>
  );
}
```

#### After

```jsx
function ThesisUploader() {
  const [step, setStep] = useState(1);
  const [analysis, setAnalysis] = useState(null);
  const [selectedFields, setSelectedFields] = useState({});

  const handleAnalyze = async (file) => {
    setStep(1);
    const result = await analyzeThesis(file, 'njulife-2');
    setAnalysis(result);
    setStep(2);
  };

  const handleGenerate = async () => {
    setStep(3);
    await generateFields(analysis.analysisId, selectedFields);
    const job = await renderThesis(analysis.analysisId, 'njulife-2');
    pollJobStatus(job.jobId);
  };

  return (
    <div>
      {step === 1 && (
        <div>
          <input type="file" onChange={e => handleAnalyze(e.target.files[0])} />
        </div>
      )}

      {step === 2 && (
        <div>
          <h3>Analysis Results</h3>
          <CompletionReport analysis={analysis.analysis} />

          <h3>Choose What to Generate</h3>
          <FieldSelector
            analysis={analysis}
            selected={selectedFields}
            onChange={setSelectedFields}
          />

          <button onClick={handleGenerate}>
            Generate & Render
          </button>

          <button onClick={() => renderThesis(analysis.analysisId, 'njulife-2')}>
            Skip AI Generation (Use As-Is)
          </button>
        </div>
      )}

      {step === 3 && <Spinner />}
    </div>
  );
}

function CompletionReport({ analysis }) {
  return (
    <div>
      {analysis.suggestions.map((suggestion, i) => (
        <div key={i} className="alert">
          {suggestion}
        </div>
      ))}
    </div>
  );
}

function FieldSelector({ analysis, selected, onChange }) {
  const missingMetadata = Object.entries(analysis.completeness.metadata)
    .filter(([_, status]) => status !== 'complete')
    .map(([field, _]) => field);

  return (
    <div>
      {missingMetadata.length > 0 && (
        <label>
          <input
            type="checkbox"
            checked={selected.metadata?.length > 0}
            onChange={e => onChange({
              ...selected,
              metadata: e.target.checked ? missingMetadata : []
            })}
          />
          Generate missing metadata: {missingMetadata.join(', ')}
        </label>
      )}

      {analysis.completeness.abstract !== 'complete' && (
        <label>
          <input
            type="checkbox"
            checked={selected.abstract}
            onChange={e => onChange({
              ...selected,
              abstract: e.target.checked
            })}
          />
          Generate abstract
        </label>
      )}

      {analysis.completeness.sections.qualityScore !== 'good' && (
        <label>
          <input
            type="checkbox"
            checked={selected.sections?.enhance}
            onChange={e => onChange({
              ...selected,
              sections: {
                ...selected.sections,
                enhance: e.target.checked
              }
            })}
          />
          Enhance sections ({analysis.completeness.sections.count} sections, quality: {analysis.completeness.sections.qualityScore})
        </label>
      )}
    </div>
  );
}
```

### Example 3: Backend Service Migration

#### Before

```typescript
// Service that processes theses
class ThesisProcessor {
  async processThesis(fileBuffer: Buffer, templateId: string) {
    // Old flow: extract with AI
    const extraction = await this.thesisClient.extract(fileBuffer);

    // Render
    const job = await this.thesisClient.render({
      extractionId: extraction.extractionId,
      templateId
    });

    return job;
  }
}
```

#### After

```typescript
class ThesisProcessor {
  async processThesis(
    fileBuffer: Buffer,
    templateId: string,
    options: {
      autoGenerate?: boolean;  // Whether to auto-generate missing fields
      generateFields?: GenerateFieldsRequest;  // Specific fields to generate
    } = {}
  ) {
    // New flow: analyze first
    const analysis = await this.thesisClient.analyze(fileBuffer, templateId);

    // Check completeness
    const isComplete = analysis.analysis.suggestions.some(s =>
      s.includes('Document appears complete')
    );

    if (!isComplete && (options.autoGenerate || options.generateFields)) {
      // Generate fields if requested
      const fieldsToGenerate = options.generateFields ||
        this.determineFieldsToGenerate(analysis);

      await this.thesisClient.generate({
        analysisId: analysis.analysisId,
        generateFields: fieldsToGenerate
      });
    }

    // Render
    const job = await this.thesisClient.render({
      analysisId: analysis.analysisId,
      templateId
    });

    return job;
  }

  private determineFieldsToGenerate(analysis: AnalysisResult) {
    // Smart logic to determine what to generate
    const fields: any = {};

    // Generate missing metadata
    const missingMetadata = Object.entries(analysis.analysis.completeness.metadata)
      .filter(([_, status]) => status !== 'complete')
      .map(([field, _]) => field);

    if (missingMetadata.length > 0) {
      fields.metadata = missingMetadata;
    }

    // Generate abstract if missing
    if (analysis.analysis.completeness.abstract !== 'complete') {
      fields.abstract = true;
    }

    // Enhance sparse sections
    if (analysis.analysis.completeness.sections.qualityScore === 'sparse') {
      fields.sections = { enhance: true, addMissing: [] };
    }

    return fields;
  }
}
```

## Backward Compatibility

### Can I Keep Using the Old Endpoints?

**Yes!** All old endpoints continue to work:
- `POST /thesis/upload` - Monolithic flow
- `POST /thesis/extract` - 2-step flow
- `POST /thesis/render` with `extractionId` - 2-step flow

No breaking changes. You can migrate at your own pace.

### Gradual Migration Strategy

1. **Phase 1**: Keep old code, add new endpoints alongside
2. **Phase 2**: A/B test new flow with subset of users
3. **Phase 3**: Default to new flow for new users
4. **Phase 4**: Migrate existing users gradually
5. **Phase 5**: Deprecate old endpoints (6-12 months notice)

## Common Patterns

### Pattern 1: Always Generate Everything

If you want new flow but always generate all fields (like old behavior):

```javascript
const analysis = await analyzeThesis(file, templateId);

// Always generate everything
const generated = await generateFields(analysis.analysisId, {
  metadata: ['title', 'author_name', 'supervisor', 'school', 'major', 'date'],
  abstract: true,
  abstract_en: true,
  keywords: true,
  keywords_en: true,
  sections: { enhance: true, addMissing: [] },
  references: true,
  acknowledgements: true
});

const job = await renderThesis(analysis.analysisId, templateId);
```

### Pattern 2: Smart Auto-Selection

Let the analysis suggest what to generate:

```javascript
const analysis = await analyzeThesis(file, templateId);

// Parse suggestions to determine what to generate
const generateFields = parseAnalysisSuggestions(analysis.analysis.suggestions);

if (Object.keys(generateFields).length > 0) {
  await generateFields(analysis.analysisId, generateFields);
}

const job = await renderThesis(analysis.analysisId, templateId);
```

### Pattern 3: User Confirmation

Show user what will be generated, get confirmation:

```javascript
const analysis = await analyzeThesis(file, templateId);

// Show user suggestions
showAnalysisReport(analysis);

// User selects fields
const userSelection = await promptUserForFields(analysis);

if (userSelection && Object.keys(userSelection).length > 0) {
  await generateFields(analysis.analysisId, userSelection);
}

const job = await renderThesis(analysis.analysisId, templateId);
```

## Token Cost Comparison

### Example Document

Let's say a user has:
- ✅ Complete title, author, sections
- ❌ Missing supervisor, abstract

### Old Flow
```
Extract + Parse: ~15,000 tokens (full document + generation of ALL fields)
Cost: ~$0.30
```

### New Flow
```
Analyze: 0 tokens (no LLM)
Generate (supervisor + abstract only): ~3,000 tokens
Cost: ~$0.06
```

**Savings: 80% on tokens, 5x faster analysis**

## Testing Checklist

After migrating to new flow, test:

- [ ] Analysis returns expected completeness data
- [ ] Suggestions are helpful and actionable
- [ ] Selective generation only generates requested fields
- [ ] Idempotent generation (can call multiple times)
- [ ] Rendering works with analysisId
- [ ] State expires after 1 hour
- [ ] Images are accessible during analysis
- [ ] Error handling for expired analysisId
- [ ] Backward compatibility (old extractionId still works)

## Troubleshooting

### Analysis Expired (404)

**Problem:** `Analysis '<id>' not found`

**Solution:** Analysis data expires after 1 hour. Re-analyze the document.

```javascript
// Store analysis data locally if you need it longer
const analysis = await analyzeThesis(file, templateId);
localStorage.setItem('analysis', JSON.stringify(analysis));

// Later...
const storedAnalysis = JSON.parse(localStorage.getItem('analysis'));
// But you'll need to re-analyze if analysisId expired
```

### No Fields Generated

**Problem:** Called `/generate` but no fields were generated

**Solution:** Check that you passed valid field specifications:

```javascript
// ❌ Wrong - empty object
await generateFields(analysisId, {});

// ✅ Correct - specify fields
await generateFields(analysisId, {
  abstract: true
});
```

### Can't Mix Flows

**Problem:** Used `extractionId` with analysis-specific operations

**Solution:** Stick to one flow. Don't mix `extractionId` and `analysisId`.

```javascript
// ❌ Wrong
const extraction = await extractThesis(file);
await generateFields(extraction.extractionId, { ... });  // Won't work

// ✅ Correct
const analysis = await analyzeThesis(file, templateId);
await generateFields(analysis.analysisId, { ... });
```

## FAQ

**Q: Do I have to migrate?**
A: No, old endpoints will continue working indefinitely. Migration is optional.

**Q: Can I use both flows in the same app?**
A: Yes! They coexist peacefully. You can even let users choose.

**Q: Is the new flow slower?**
A: Analysis is faster (no LLM). If you generate all fields, total time is similar. If you generate selectively, it's much faster.

**Q: What happens after 1 hour?**
A: Analysis data expires. You'll need to re-analyze. Consider storing extracted data locally if you need it longer.

**Q: Can I edit the extracted data before generation?**
A: Yes! The analysis returns `extractedData`. Edit it locally, then pass it in the `document` parameter to `/render`.

**Q: Does this change the output PDF?**
A: No, the final PDF is identical. Only the workflow changes.

## Support

Need help migrating? Check:
- `API_DOCUMENTATION.md` - Full API reference
- `IMPLEMENTATION_SUMMARY.md` - Technical details
- GitHub Issues - Ask questions

---

**Happy Migrating! 🚀**
