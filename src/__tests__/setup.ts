import "@testing-library/jest-dom"

// Set required env vars before any modules are imported
process.env.JWT_SECRET = "test-jwt-secret-that-is-at-least-32-chars-long-for-testing"
process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/healthos_test"
process.env.OPENAI_API_KEY = "sk-test-placeholder"
