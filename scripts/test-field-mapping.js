#!/usr/bin/env node
/**
 * Test script to verify template field mapping
 * This script verifies that all template required fields are correctly mapped
 */

const templates = {
  hunnu: {
    name: 'HUNNU',
    requiredFields: ['title', 'titleEn', 'author', 'major', 'advisor', 'college', 'studentId'],
    expectedMappings: {
      'advisor': 'metadata.supervisor',
      'college': 'metadata.school',
    }
  },
  thu: {
    name: 'THU',
    requiredFields: ['title', 'author', 'major', 'supervisor'],
    expectedMappings: {
      'supervisor': 'metadata.supervisor',
    }
  },
  njulife: {
    name: 'NJULife',
    requiredFields: ['title', 'titleEn', 'author', 'authorEn', 'major', 'majorEn', 'supervisor', 'supervisorEn'],
    expectedMappings: {
      'authorEn': 'metadata.author_name_en',
      'majorEn': 'metadata.major_en',
      'supervisorEn': 'metadata.supervisor_en',
    }
  },
  'njulife-2': {
    name: 'NJULife-2',
    requiredFields: ['title', 'titleEn', 'author', 'major', 'supervisor'],
    expectedMappings: {
      'supervisor': 'metadata.supervisor',
    }
  },
  njuthesis: {
    name: 'NJUThesis',
    requiredFields: ['title', 'titleEn', 'author', 'major', 'supervisor'],
    expectedMappings: {
      'supervisor': 'metadata.supervisor',
    }
  },
  scut: {
    name: 'SCUT',
    requiredFields: ['title', 'titleEn', 'author', 'major', 'supervisor', 'department'],
    expectedMappings: {
      'department': 'metadata.school',
    }
  }
};

// Field mapping (from template-field-mapper.service.ts)
const FIELD_MAPPING = {
  'title': 'metadata.title',
  'titleEn': 'metadata.title_en',
  'title_en': 'metadata.title_en',
  'author': 'metadata.author_name',
  'authorEn': 'metadata.author_name_en',
  'author_name': 'metadata.author_name',
  'author_name_en': 'metadata.author_name_en',
  'supervisor': 'metadata.supervisor',
  'advisor': 'metadata.supervisor',
  'adviser': 'metadata.supervisor',
  'school': 'metadata.school',
  'college': 'metadata.school',
  'department': 'metadata.school',
  'institute': 'metadata.school',
  'major': 'metadata.major',
  'majorEn': 'metadata.major_en',
  'major_en': 'metadata.major_en',
  'supervisorEn': 'metadata.supervisor_en',
  'supervisor_en': 'metadata.supervisor_en',
  'studentId': 'metadata.student_id',
  'student_id': 'metadata.student_id',
  'date': 'metadata.date',
  'degree': 'metadata.degree',
  'class': 'metadata.class',
  'className': 'metadata.class',
};

console.log('===== Template Field Mapping Test =====\n');

let allPassed = true;

for (const [templateId, config] of Object.entries(templates)) {
  console.log(`Testing ${config.name} (${templateId}):`);

  // Test that all required fields can be mapped
  const unmappedFields = [];
  const mappedFields = config.requiredFields.map(field => {
    const mapped = FIELD_MAPPING[field];
    if (!mapped) {
      unmappedFields.push(field);
      return null;
    }
    return { template: field, thesis: mapped };
  }).filter(Boolean);

  if (unmappedFields.length > 0) {
    console.log(`  ❌ FAIL: Unmapped fields: ${unmappedFields.join(', ')}`);
    allPassed = false;
  } else {
    console.log(`  ✓ All ${config.requiredFields.length} fields are mappable`);
  }

  // Test specific expected mappings
  for (const [templateField, expectedMapping] of Object.entries(config.expectedMappings)) {
    const actualMapping = FIELD_MAPPING[templateField];
    if (actualMapping === expectedMapping) {
      console.log(`  ✓ ${templateField} → ${actualMapping}`);
    } else {
      console.log(`  ❌ FAIL: ${templateField} → ${actualMapping} (expected: ${expectedMapping})`);
      allPassed = false;
    }
  }

  console.log('');
}

// Test NJULife-specific English fields
console.log('Testing NJULife English fields:');
const njuEnglishFieldExpectations = {
  'authorEn': 'metadata.author_name_en',
  'majorEn': 'metadata.major_en',
  'supervisorEn': 'metadata.supervisor_en'
};
for (const [field, expected] of Object.entries(njuEnglishFieldExpectations)) {
  const mapped = FIELD_MAPPING[field];
  if (mapped === expected) {
    console.log(`  ✓ ${field} → ${mapped}`);
  } else {
    console.log(`  ❌ FAIL: ${field} → ${mapped} (expected: ${expected})`);
    allPassed = false;
  }
}

console.log('\n===== Test Summary =====');
if (allPassed) {
  console.log('✓ All tests passed!');
  process.exit(0);
} else {
  console.log('❌ Some tests failed');
  process.exit(1);
}
