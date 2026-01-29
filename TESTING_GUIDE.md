# Template-Aware Field Extraction Testing Guide

## Quick Start

### 1. Run Field Mapping Tests

Verify that all template field mappings are correct:

```bash
node scripts/test-field-mapping.js
```

Expected output:
```
===== Template Field Mapping Test =====

Testing HUNNU (hunnu):
  ✓ All 7 fields are mappable
  ✓ advisor → metadata.supervisor
  ✓ college → metadata.school

Testing THU (thu):
  ✓ All 4 fields are mappable
  ✓ supervisor → metadata.supervisor

Testing NJULife (njulife):
  ✓ All 8 fields are mappable
  ✓ authorEn → metadata.author_name_en
  ✓ majorEn → metadata.major_en
  ✓ supervisorEn → metadata.supervisor_en

Testing NJULife-2 (njulife-2):
  ✓ All 5 fields are mappable
  ✓ supervisor → metadata.supervisor

Testing NJUThesis (njuthesis):
  ✓ All 5 fields are mappable
  ✓ supervisor → metadata.supervisor

Testing SCUT (scut):
  ✓ All 6 fields are mappable
  ✓ department → metadata.school

Testing NJULife English fields:
  ✓ authorEn → metadata.author_name_en
  ✓ majorEn → metadata.major_en
  ✓ supervisorEn → metadata.supervisor_en

===== Test Summary =====
✓ All tests passed!
```

### 2. Start the Server

```bash
npm run start:dev
```

Wait for the server to start and show:
```
[TemplateService] Loaded built-in template: 南京大学生命科学学院硕士学位论文 (njulife)
[TemplateService] Loaded built-in template: 南京大学生命科学学院硕士学位论文 v2 (njulife-2)
[TemplateService] Loaded built-in template: 清华大学学位论文 (thu)
[TemplateService] Loaded built-in template: 南京大学学位论文 (njuthesis)
[TemplateService] Loaded built-in template: 华南理工大学学位论文 (scut)
[TemplateService] Loaded built-in template: 湖南师范大学本科毕业论文 (hunnu)
```

### 3. Test Each Template

#### Test 1: HUNNU Template (advisor/college fields)

```bash
curl -X POST http://localhost:3077/thesis/analyze \
  -F "file=@test-files/test-thesis.docx" \
  -F "templateId=hunnu" \
  -F "model=gpt-4o" | jq '.extractedData.metadata'
```

**Expected fields**:
```json
{
  "title": "...",
  "title_en": "...",
  "author_name": "...",
  "supervisor": "... (mapped from advisor)",
  "school": "... (mapped from college)",
  "major": "...",
  "student_id": "..."
}
```

**Verify**: `supervisor` and `school` should be populated even though template uses `advisor` and `college`.

#### Test 2: NJULife Template (English fields)

```bash
curl -X POST http://localhost:3077/thesis/analyze \
  -F "file=@test-files/test-thesis.docx" \
  -F "templateId=njulife" \
  -F "model=gpt-4o" | jq '.extractedData.metadata'
```

**Expected fields**:
```json
{
  "title": "...",
  "title_en": "...",
  "author_name": "...",
  "author_name_en": "... (NEW)",
  "major": "...",
  "major_en": "... (NEW)",
  "supervisor": "...",
  "supervisor_en": "... (NEW)"
}
```

**Verify**: The three English fields (`author_name_en`, `major_en`, `supervisor_en`) should be present.

#### Test 3: THU Template (standard fields)

```bash
curl -X POST http://localhost:3077/thesis/analyze \
  -F "file=@test-files/test-thesis.docx" \
  -F "templateId=thu" \
  -F "model=gpt-4o" | jq '.extractedData.metadata'
```

**Expected fields**:
```json
{
  "title": "...",
  "author_name": "...",
  "major": "...",
  "supervisor": "..."
}
```

**Verify**: Only required fields are extracted (no `title_en` if not in document).

#### Test 4: SCUT Template (department field)

```bash
curl -X POST http://localhost:3077/thesis/analyze \
  -F "file=@test-files/test-scut.docx" \
  -F "templateId=scut" \
  -F "model=gpt-4o" | jq '.extractedData.metadata'
```

**Expected fields**:
```json
{
  "title": "...",
  "title_en": "...",
  "author_name": "...",
  "major": "...",
  "supervisor": "...",
  "school": "... (mapped from department)"
}
```

**Verify**: `school` should be populated from the `department` field in template.

### 4. Check Server Logs

When analyzing a document, the server should log template-aware extraction:

```
[LlmService] Parsing thesis content with LLM (model: gpt-4o)...
[LlmService] Template-aware extraction for fields: title, titleEn, author, authorEn, major, majorEn, supervisor, supervisorEn
```

This confirms the template's required fields are being passed to the LLM.

## Detailed Testing Checklist

### Field Mapping Tests

- [ ] All HUNNU fields map correctly (especially advisor→supervisor, college→school)
- [ ] All THU fields map correctly
- [ ] All NJULife fields map correctly (including English fields)
- [ ] All NJULife-2 fields map correctly
- [ ] All NJUThesis fields map correctly
- [ ] All SCUT fields map correctly (especially department→school)

### Integration Tests

- [ ] Server starts without errors
- [ ] All 6 templates load successfully
- [ ] Template-aware extraction logs appear for each analysis
- [ ] HUNNU template extracts advisor/college correctly
- [ ] NJULife template extracts all English fields
- [ ] THU template extracts only required fields
- [ ] SCUT template extracts department correctly
- [ ] Backward compatibility: Analysis without template still works

### End-to-End Tests

- [ ] Upload DOCX → Analyze with HUNNU → Render LaTeX → Check supervisor/school in output
- [ ] Upload DOCX → Analyze with NJULife → Render LaTeX → Check English fields in output
- [ ] Upload PDF → Analyze with SCUT → Render LaTeX → Check department mapping

## Common Issues and Solutions

### Issue: "Template-aware extraction" log doesn't appear

**Cause**: Template parameter not being passed to LLM service

**Solution**: Check that `analyzeDocument()` is getting the template and passing it to `parseContent()`

### Issue: Required fields are null even though they're in the document

**Cause**: Field mapping might not match what LLM returns

**Solution**:
1. Check LLM response in logs
2. Verify field names in `validateAndNormalize()`
3. Ensure `FIELD_MAPPING` includes the template field

### Issue: English fields not extracted for NJULife

**Cause**: LLM might not recognize these as required

**Solution**: Check that:
1. `prompt-builder.ts` includes English fields in `optionalFields`
2. `llm.service.ts` shows examples for English fields in metadata table
3. Template's `requiredFields` includes `authorEn`, `majorEn`, `supervisorEn`

### Issue: Build fails with TypeScript errors

**Cause**: New fields not added to interfaces

**Solution**: Ensure `ThesisMetadata` interface includes:
- `author_name_en?: string`
- `major_en?: string`
- `supervisor_en?: string`

## Performance Testing

Test with large documents to ensure template-aware extraction doesn't significantly impact performance:

```bash
time curl -X POST http://localhost:3077/thesis/analyze \
  -F "file=@test-files/test_large.docx" \
  -F "templateId=njulife" \
  -F "model=gpt-4o" > /dev/null
```

Expected: Similar performance to non-template analysis (difference should be < 5%).

## Regression Testing

Ensure existing functionality still works:

```bash
# Test backward compatibility (no template)
curl -X POST http://localhost:3077/thesis/extract \
  -F "file=@test-files/test-thesis.docx" \
  -F "model=gpt-4o" | jq '.metadata | keys'

# Should return at least: ["title", "author_name"]
```

## Success Criteria

All tests pass when:
1. ✅ Field mapping test shows all templates supported
2. ✅ Server starts and loads all 6 templates
3. ✅ Each template extracts its required fields correctly
4. ✅ Field aliases work (advisor→supervisor, college→school, etc.)
5. ✅ NJULife extracts all 3 English fields
6. ✅ Backward compatibility maintained (no template parameter works)
7. ✅ No TypeScript compilation errors
8. ✅ Performance impact is minimal

## Troubleshooting Commands

```bash
# Check TypeScript compilation
npm run build

# View server logs with more detail
npm run start:dev | grep -E "(Template|LlmService|FieldMapper)"

# Test specific template configuration
node -e "const t = require('./dist/template/templates/njulife.template.js'); console.log(t.njulifeTemplate.requiredFields)"

# Verify field mapper service
node -e "const { TemplateFieldMapper } = require('./dist/template/template-field-mapper.service.js'); const m = new TemplateFieldMapper(); console.log(m.mapTemplateFieldsToThesisData(['authorEn', 'majorEn']))"
```

## Contact

If you encounter issues not covered in this guide, please check:
1. `FIELD_MAPPING_IMPLEMENTATION.md` - Implementation details
2. Server logs - Look for errors or warnings
3. Template configuration files in `src/template/templates/`
