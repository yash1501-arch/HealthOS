# ADR-002: Database Schema Strategy — JSONB for Flexible Health Data

## Status
Accepted

## Context
Health data is highly variable. Lab results have different tests per report. Pain assessments vary by body area. Occupations have different attributes. Using rigid relational schemas would require frequent migrations for new fields.

## Decision
Use a hybrid approach:
1. **Fixed relational tables** for core entities (users, profiles, media, reports)
2. **JSONB columns** for extensible/flexible data (assessment sections, lab parsed data, findings)
3. **pgvector extension** for embedding storage (no separate vector DB)

## Consequences
- JSONB allows schema-less evolution — add new assessment fields without migrations
- JSONB is indexable (GIN indexes) for query performance
- pgvector eliminates need for Pinecone/Weaviate — simpler ops
- Trade-off: less type safety on JSONB fields (mitigated by Zod validation at API layer)
- Trade-off: more storage than fully normalized (acceptable for single-user MVP)

## Schema Examples
```sql
-- Flexible assessment data stored as JSONB
CREATE TABLE assessments (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  assessment_data JSONB NOT NULL,  -- {personal_info: {}, occupation: {}, lifestyle: {}}
  version INTEGER DEFAULT 1
);

-- Lab results parsed from reports
CREATE TABLE lab_results (
  id UUID PRIMARY KEY,
  test_name VARCHAR(255),
  value DECIMAL,
  unit VARCHAR(50),
  -- extracted as structured rows from JSONB parsing
);
```

## Alternatives Considered
- **Fully normalized**: Many tables, frequent migration pain, high join complexity
- **MongoDB document store**: Loses ACID, Prisma ORM, and pgvector
- **EAV (Entity-Attribute-Value)**: Query complexity, poor performance
