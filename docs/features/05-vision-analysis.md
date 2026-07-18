# Feature Spec: Computer Vision Posture & Movement Analysis

## 1. Overview
Users upload body photos (front, side, back) and optional movement videos (walking, squatting, bending). AI estimates posture characteristics and movement patterns using pose estimation.

## 2. User Stories
- US-14: As a user, I want AI to estimate posture from my photos
- US-15: As a user, I want AI to analyze movement from my videos
- US-16: As a user, I want posture data to feed into my recommendations

## 3. Acceptance Criteria
- [ ] Privacy consent screen before upload (logged to consent_logs)
- [ ] Photo upload: Front, Side, Back (JPEG/PNG, max 10MB each)
- [ ] Video upload: Walking, Squatting, Bending (MP4, max 50MB each)
- [ ] In-browser camera capture option
- [ ] Pose guides (on-screen overlay showing ideal camera position/distance)
- [ ] Processing animation with ETA
- [ ] Posture findings: Forward head, rounded shoulders, pelvic tilt, knee valgus, flat feet
- [ ] Severity: none/mild/moderate/severe with confidence score
- [ ] Body visualization (color-coded overlay: green/yellow/red)
- [ ] "What does this mean?" expandable explanations for each finding
- [ ] Movement analysis summary (videos only)
- [ ] Clear disclaimer: observations, not diagnoses
- [ ] Delete uploaded media option
- [ ] Results feed into recommendation engine

## 4. Data Schema
- Tables: `vision_media`, `vision_analyses`, `posture_characteristics`
- Reference: `03-Database-Schema.md` §3

## 5. API Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| POST | /api/vision/photos | Upload 3 photos |
| POST | /api/vision/videos | Upload videos |
| GET | /api/vision/results | List all analyses |
| GET | /api/vision/results/latest | Most recent analysis |
| DELETE | /api/vision/media/:id | Delete specific media |

## 6. UI Components
- VisionConsentScreen (privacy notice + consent checkbox)
- PhotoCaptureStep (camera viewfinder or file picker, 3 slots)
- VideoCaptureStep (camera record or file picker, 3 slots)
- PoseGuideOverlay (transparent silhouette showing ideal pose)
- ProcessingAnimation (pulsing dots + ETA)
- BodyVisualization (simplified body outline with color-coded joints/angles)
- FindingsList (characteristic, severity badge, confidence bar)
- FindingDetailModal ("What this means" explanation)
- MovementSummaryCard (video-specific analysis)
- MediaManager (view/delete uploaded files)

## 7. Confidence & Quality Checks
| Issue | Handling |
|-------|----------|
| Face not visible | "Ensure your full body is visible in frame" |
| Poor lighting | "Results may be less accurate in low light" |
| Partial body in frame | "Stand further back to show full body" |
| Motion blur (video) | "Record in steady lighting" |
| Low confidence all findings | "Unable to analyze reliably. Retake photos." |

## 8. Error States
| Scenario | Message |
|----------|---------|
| Pose detection failed | "Could not detect body pose. Ensure full body is visible." |
| Video too short | "Video must be at least 3 seconds" |
| File size exceeded | "Max file size is X MB" |

## 9. Edge Cases
- User uploads front-facing vs back-facing camera (mirror flip handling)
- Loose clothing obscures body landmarks
- User in wheelchair (adapt expectations)
- Only photos uploaded (no videos) → posture analysis only
- Repeated analyses over time → track posture changes
