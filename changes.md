# Project Layout & Interface Enhancements

This document lists the visual, structural, and behavioral changes made to the **Shorts Maker** project.

---

## Summary of Changes

### 1. In-place Project Renaming (Docs/Sheets Metaphor)
- **State Management**: Added `projectName` to the workflow context state initialized to `"Untitled Project"`.
- **Trigger**: When a file is loaded/drag-dropped in `Choose Content`, the project name automatically defaults to the file name.
- **Editable Element**: Added a new custom component `<EditableProjectName />` in the top left header (during creation) and in the sidebar (during active workflow).
- **Backend Sync**: Renaming an active project automatically issues a `PATCH` request to the backend `/api/projects/{project_id}` endpoint to persist the change.

### 2. Aspect Ratio Visual Controls
- **Icons**: Added emojis (`📱` for 9:16 and `💻` for 16:9) next to the labels.
- **Layout Reference**: Constructed live CSS-drawn aspect ratio indicator boxes demonstrating portrait and landscape formats.
- **Descriptions**: Included clarifying platform subtitles (*Shorts, TikToks & Reels* and *YouTube videos & PC screens*).

### 3. Desktop Width Expansions
- Changed the main outer container width from `max-w-lg` (512px) to `max-w-5xl` (1024px) for the creation steps to fill desktop screens.
- Redesigned the `SourcePicker` layout into a responsive two-column grid on desktop.
- Adjusted the `FormatChooser` format options to lay out side-by-side.
- Enabled container expansion to `max-w-5xl` for the `ENTRY_REVIEW` and `BACKGROUND_CHOICE` screens.

### 4. Interactive & Editable 'Review Entries' Step
- Arranged scene and quote items into a 2-column responsive layout.
- Enlarged labels, inputs, and textareas (`text-lg` titles and `text-base` body text) for a comfortable reading experience.
- Built-in inline input fields that auto-save to the backend database using `onBlur` (clicking away), featuring a visual green `✓ Saved` feedback badge.
- **Scroll Fix**: Replaced constrained height textareas with an auto-expanding height textarea hook that eliminates internal scrollbars and reveals the entire entry.

### 5. Large & Uniform Navigation (Mobile Optimized)
- **Standardized Top Header**: Added a consistent top navbar across all pages (library, pre-project, and active project).
- **Home Button**: Enlarged and standardized the Home `🎬` button to a prominent, easy-to-click size (`h-12 w-12 text-3xl`) everywhere.
- **Mobile Drawer Menu**: Optimized active project sidebar lists for mobile devices. The sidebar collapses into a sliding overlay drawer on mobile viewports (toggleable via a mobile menu button in the header), keeping the main editor clean and readable.

### 6. Expanded Choose Background Page Layout
- Redesigned `BackgroundChooser` settings into a dual-column layout on desktop.
- Left column groups background type selection, prompt parameters, and AI model configurations.
- Right column groups typography alignments, color palette templates, and font pairings.

---

## Detailed File Diff Guide

### Frontend Changes

#### 1. Context & State
* **File**: [WorkflowContext.tsx](file:///home/master/Software/text-to-video/shorts_maker/frontend/src/context/WorkflowContext.tsx)
  - Added `projectName: string` to the state interface and default state.
  - Added `SET_PROJECT_NAME` reducer action.
  - Modified `SET_PROJECT` to load the current project name into the active editing text.

#### 2. Reusable Renaming Input
* **File**: [EditableProjectName.tsx](file:///home/master/Software/text-to-video/shorts_maker/frontend/src/components/EditableProjectName.tsx) (New)
  - Manages internal editing state, handling text changes, Enter keys (saves), Escape (reverts), and blur actions.
  - Triggers either the local context update or database PATCH rename API.

#### 3. Choose Content Screen
* **File**: [SourcePicker.tsx](file:///home/master/Software/text-to-video/shorts_maker/frontend/src/components/SourcePicker.tsx)
  - Upgraded styling to split layout into controls (left) and file drop box (right) on desktop.
  - Added emojis, descriptive captions, and visual aspect boxes.
  - Updates the context name upon file loading.

#### 4. Choose Format Screen
* **File**: [FormatChooser.tsx](file:///home/master/Software/text-to-video/shorts_maker/frontend/src/components/FormatChooser.tsx)
  - Structured selections as side-by-side panels.
  - Attached big emojis (`🖼️` and `💬`).
  - Reads `projectName` from context on project creation.

#### 5. Active Container & Header View
* **File**: [App.tsx](file:///home/master/Software/text-to-video/shorts_maker/frontend/src/App.tsx)
  - Integrated `<EditableProjectName />` in headers.
  - Set pre-project screens container width to `max-w-5xl`.
  - Set active review & background screen container width to `max-w-5xl` conditionally during `ENTRY_REVIEW` and `BACKGROUND_CHOICE`.
  - Implemented responsive top navbar and toggleable mobile sidebar drawer.

#### 6. Interactive Review Screen
* **File**: [EntryList.tsx](file:///home/master/Software/text-to-video/shorts_maker/frontend/src/components/EntryList.tsx)
  - Transformed read-only lists into an auto-saving card editor layout.
  - Re-ordered to a double-column grid with a larger text editor.
  - Added `useRef` auto-resizing hook to the textareas to clear scrollbar restrictions.

#### 7. Client API Support
* **File**: [client.ts](file:///home/master/Software/text-to-video/shorts_maker/frontend/src/api/client.ts)
  - Added `updateScene` patch request under `images`.
  - Added `updateQuote` patch request under `quotes`.

#### 8. Expanded Choose Background Screen
* **File**: [BackgroundChooser.tsx](file:///home/master/Software/text-to-video/shorts_maker/frontend/src/components/BackgroundChooser.tsx)
  - Expanded layout to double columns on desktop view.
  - Grouped background source configurations (left) and typography/color schemes (right).

---

## Backend Changes

#### 1. Image Scene Update Route
* **File**: [images.py](file:///home/master/Software/text-to-video/shorts_maker/backend/routers/images.py)
  - Created `UpdateSceneRequest` Pydantic model.
  - Added `PATCH /scenes/{scene_id}` route to update scene `subject` field on disk.

#### 2. Quote Post Update Route
* **File**: [quotes.py](file:///home/master/Software/text-to-video/shorts_maker/backend/routers/quotes.py)
  - Created `UpdateQuoteRequest` Pydantic model.
  - Added `PATCH /quotes/{quote_id}` route to update the `term` and `raw_body` fields on disk.
