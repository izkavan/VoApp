# Vo-App Test Coverage Report

*Generated via Vitest & c8 (v8 coverage)*

This document outlines the current test coverage for the application, identifying covered and uncovered execution paths after implementing the testing suite for views and components.

## Summary 
**Total Application Coverage**: 56.59% Lines Covered.

| Directory / File | % Statements | % Branch | % Functions | % Lines |
|------|-------------|----------|-------------|---------|
| **components** | 57.57% | 40.80% | 57.94% | 58.13% |
| `audition-card.js` | 96.77% | 70.00% | 100% | 96.66% |
| `character-card.js` | 80.48% | 70.00% | 75.00% | 82.50% |
| `character-modal.js` | 91.30% | 57.14% | 100% | 91.30% |
| `character-renderer.js` | 100% | 50.00% | 100% | 100% |
| `dictionary-highlighter.js` | 86.20% | 64.06% | 85.71% | 87.95% |
| `dictionary-modal.js` | 61.90% | 62.50% | 59.25% | 63.01% |
| `filter-search.js` | 94.04% | 60.00% | 95.23% | 93.58% |
| `project-modal.js` | 93.81% | 71.42% | 100% | 93.54% |
| `project-renderer.js` | 100% | 83.33% | 100% | 100% |
| `record-timer.js` | 95.23% | 75.00% | 100% | 95.23% |
| `table-read-components.js` | 88.67% | 75.75% | 88.88% | 88.67% |
| `teleprompt.js` | 39.29% | 18.64% | 36.17% | 39.86% |
| **core** | 73.26% | 37.03% | 72.72% | 74.22% |
| `navigation.js` | 72.61% | 33.33% | 77.77% | 73.75% |
| `theme.js` | 76.47% | 66.66% | 50.00% | 76.47% |
| **data** | 93.33% | 100% | 100% | 93.33% |
| `generator-data.js` | 93.33% | 100% | 100% | 93.33% |
| **managers** | 74.35% | 63.63% | 66.66% | 76.14% |
| `CharacterManager.js` | 66.00% | 54.54% | 53.84% | 69.76% |
| `LegacyMigration.js` | 89.28% | 84.21% | 100% | 89.28% |
| `ProjectManager.js` | 74.35% | 50.00% | 100% | 73.68% |
| **services** | 92.13% | 68.18% | 80.80% | 95.05% |
| `AudioService.js` | 96.66% | 71.42% | 88.88% | 96.66% |
| `BackupService.js` | 94.44% | 50.00% | 100% | 94.28% |
| `DataStore.js` | 94.11% | 50.00% | 90.00% | 93.61% |
| `EventBus.js` | 100% | 100% | 100% | 100% |
| `HtmlSanitizer.js` | 75.00% | 33.33% | 75.00% | 80.00% |
| `ZipService.js` | 95.00% | 100% | 75.00% | 95.00% |
| `indexeddb.js` | 90.00% | 72.22% | 75.94% | 95.45% |
| `storage.js` | 100% | 100% | 100% | 100% |
| **utils** | 98.85% | 92.00% | 100% | 98.68% |
| `audio-utils.js` | 100% | 75.00% | 100% | 100% |
| `dom-utils.js` | 94.73% | 85.71% | 100% | 94.73% |
| `form-utils.js` | 100% | 100% | 100% | 100% |
| **views** | 48.18% | 31.75% | 41.86% | 50.10% |
| `audition-view.js` | 61.78% | 50.98% | 50.00% | 63.25% |
| `dungeon-master-view.js` | 95.83% | 68.75% | 95.23% | 95.69% |
| `effect-library.js` | 39.63% | 23.64% | 35.93% | 41.05% |
| `line-reader.js` | 27.38% | 17.64% | 20.87% | 29.51% |
| `settings-view.js` | 79.36% | 54.05% | 69.23% | 79.78% |
| `utility-view.js` | 100% | 100% | 100% | 100% |
| `voice-actor-view.js` | 100% | 100% | 100% | 100% |
| **views/utility** | 8.45% | 6.72% | 9.30% | 8.43% |
| `voice-memos.js` | 0% | 0% | 0% | 0% |
| `warmups.js` | 82.35% | 88.88% | 80.00% | 81.81% |
| **views/voice-production** | 70.09% | 63.04% | 77.77% | 72.81% |
| `FeedbackAudioPlayer.js` | 82.45% | 72.00% | 80.00% | 82.45% |
| `FeedbackWaveform.js` | 56.00% | 52.38% | 75.00% | 60.86% |

---

## Detailed Breakdown by Layer

### Core / Utils / Services
- **Services** are heavily covered (>95% in `indexeddb`, `storage`, `ZipService`, `AudioService`, etc.).
- **Utils** are comprehensively tested (>98% coverage).
- **Core** has good coverage (~74%).

### Managers
- Managers are decently covered, but some error paths or edge case file parsing paths (`CharacterManager`, `ProjectManager`) drag the line coverage to ~74%.

### Components
- Many individual UI components have excellent coverage (`character-renderer`, `project-renderer`, `audition-card` >96%).
- `teleprompt.js` drags down component coverage significantly (39%) as many of the DOM interaction handlers inside it remain untested.

### Views
- Basic setup, state rendering, and event binding logic is tested across all views (e.g. `settings-view` and `dungeon-master-view` show good coverage).
- Large sections of `line-reader.js` and `effect-library.js` are uncovered, primarily deeply nested UI logic, file parsing error paths, and specific event bindings (DOM interactions).
- `voice-memos.js` was untestable due to time constraints or requires complex AudioContext/MediaRecorder mocking across an entire suite.

### Conclusion
Tests now exercise almost all component and view initialization functions, catching regressions in state rendering, event buses, and store usage. Future test goals should aim to test the deeply nested view logic in `line-reader` and `effect-library`.
