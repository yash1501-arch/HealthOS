# Feature Spec: Medical Report Upload & Analysis

## 1. Overview
Users upload medical reports (blood work, MRI, X-ray, CT, DEXA) as PDFs or images. AI extracts data via OCR, structures it, generates explanations, and tracks trends over time.

## 2. User Stories
- US-04: As a user, I want to upload blood report PDFs so the AI can extract and explain values
- US-05: As a user, I want to upload MRI/X-ray/CT reports so the AI can summarize findings

## 3. Acceptance Criteria
- [ ] Upload PDF, JPEG, PNG (max 20MB)
- [ ] Drag-and-drop + file picker
- [ ] Upload progress indicator
- [ ] OCR text extraction
- [ ] Structured parsing into test name/value/unit/range/flag
- [ ] Patient-friendly explanation (plain language)
- [ ] Doctor-friendly summary (expandable)
- [ ] Lab results table with color-coded flags (green/amber/red)
- [ ] Trend analysis when multiple reports exist
- [ ] Trend chart (per test over time)
- [ ] Manual edit/correct extracted values
- [ ] Delete report
- [ ] Report list view with status badges

## 4. Data Schema
- Tables: `medical_reports`, `report_analyses`, `lab_results`
- Reference: `03-Database-Schema.md` §4

## 5. API Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| POST | /api/reports/upload | Upload report (multipart) |
| GET | /api/reports | List reports |
| GET | /api/reports/:id | Get report + analysis |
| DELETE | /api/reports/:id | Delete report |
| PUT | /api/reports/:id/values | Edit extracted values |

## 6. UI Components
- ReportUploader (dropzone + file preview)
- UploadProgress (animated bar)
- ReportList (cards with status: pending/processing/completed/failed)
- ReportDetail (analysis tab: summary, table, trends)
- LabResultsTable (test, value, range, flag, trend arrow)
- TrendChart (multi-point line chart per test)
- ValueEditor (inline edit for corrected values)
- PatientSummaryCard (highlighted explanation box)
- DoctorSummaryCard (collapsible)

## 7. Processing States
| State | UI |
|-------|-----|
| pending | "Queued for processing" |
| processing | Skeleton shimmer + "Extracting data..." |
| completed | Show full results |
| failed | Error message with retry button |
| partial | "Some values extracted. Review and correct." |

## 8. Error States
| Scenario | Message |
|----------|---------|
| Blurry image | "Could not read clearly. Try a clearer scan." |
| Unreadable handwriting | "Some text could not be read. Review extracted values." |
| Wrong file type | "Please upload a PDF, JPEG, or PNG file." |
| OCR confidence low | Flag for manual review |

## 9. Edge Cases
- Report contains no lab values (e.g., radiology report)
- Same test with different units across labs (unit normalization)
- User uploads the same report twice (dedup check)
- Report date is in the future
- All values normal vs all abnormal
