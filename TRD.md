# Technical Requirements Document

## 1. Architecture

The application will be a static, frontend-only site. It has no backend, database, or API. All application logic runs in the browser; user data is stored locally in the browser.

## 2. Technologies

- HTML5 for semantic structure and forms.
- CSS3 for responsive presentation.
- Vanilla JavaScript for application logic and browser storage.
- `localStorage` for persistence.
- No framework or package dependency unless explicitly approved in a later phase.

## 3. Proposed folder structure

Beginner-friendly structure for a future implementation (proposal only):

```text
project/
  index.html
  css/
    styles.css
  js/
    app.js
    dates.js
    storage.js
  assets/
    (only if approved and needed)
  PRD.md
  TRD.md
  RULES.md
  PROJECT-NOTES.md
```

Do not create this structure until implementation is explicitly approved. Keep date calculations, storage access, and UI event handling in clearly separated modules or functions; avoid unnecessary abstraction.

## 4. Data model

Use a versioned JSON object as the value for one application storage key. Dates are canonical date-only strings (`YYYY-MM-DD`), not timestamps.

```json
{
  "schemaVersion": 1,
  "periods": [
    {
      "id": "stable-unique-id",
      "startDate": "2026-09-01",
      "durationDays": 5
    }
  ],
  "monthlyStatuses": {
    "2026-09": "period_recorded"
  },
  "settings": {
    "cycleLengthDays": null
  }
}
```

The example values illustrate shape only; they are not defaults or sample user data. `durationDays` is a positive integer when known and `null` when unknown; it has no prefilled default. The end date is calculated only when duration is known and is not independently persisted. An unknown-duration record marks its start date only. Monthly status values are `period_recorded`, `period_did_not_arrive`, or `not_sure`; absence of a key means `no_information_recorded`. A `period_recorded` status can also be reflected by actual period records in that month. If they conflict, retain both pieces of information and surface the mismatch for resolution rather than silently overriding data.

`cycleLengthDays` is optional and `null` when unknown. No application behavior may assume or derive a value. Because initial functionality does not need cycle length, omit the setting entirely or keep it null; never write an assumed value.

## 5. localStorage

- **Key:** `periodTrackerData` (single versioned document).
- **Format:** UTF-8 JSON serialized with `JSON.stringify`.
- **Save:** Validate the complete in-memory document, serialize, then call `localStorage.setItem`. Report quota/security failures; do not claim a save succeeded before it does.
- **Read:** On startup, read and parse the key, validate schema version and each record/status. Missing key initializes an empty in-memory model without writing fake entries.
- **Update:** Edit a record/status in memory, validate, then persist the whole document. Keep stable record IDs.
- **Delete:** Remove only the selected period record after user confirmation, then persist. If a monthly status was explicitly set, do not silently erase it; inform the user if record deletion leaves that status inconsistent.
- **Missing/corrupt data:** Missing data means an empty state. For malformed JSON, unsupported schema, or invalid entries, do not crash or silently overwrite the original value. Show a clear recovery message; preserve the raw stored value where possible and allow a deliberate reset only after clear user confirmation. Do not create backup files or network copies.

## 6. Date handling

- **Format:** Store dates as `YYYY-MM-DD` calendar dates. Avoid parsing date-only strings through local timezone-sensitive timestamp paths.
- **Start date:** Require an actual valid Gregorian calendar date. Validate year, month, and day round-trip; reject impossible dates.
- **Duration:** `null` means unknown. When present, require a positive whole number within the supported numeric and date implementation range. Do not impose a medical maximum.
- **End date:** For known duration, inclusive end = start date plus (`durationDays - 1`) calendar days. Calculate using calendar arithmetic and validate the resulting date. For unknown duration, do not calculate an end date; mark only the start date. Do not use elapsed milliseconds across daylight-saving boundaries.
- **Month/year:** Use integer year/month calendar operations; navigation across December/January must be correct.
- **Leap years:** Follow Gregorian leap-year rules, including century exceptions.
- **Invalid dates:** Reject malformed and impossible input before saving. Existing invalid stored entries are errors requiring user-visible recovery; do not silently coerce them.
- **Overlaps:** Accept overlapping records because no medical rule is specified. Keep records distinct and visually show each record or a clear combined range. Do not merge or delete records automatically.

## 7. Monthly status logic

Represent explicit statuses separately from period records. The absence of both a record and an explicit status means `no_information_recorded`. `period_did_not_arrive` and `not_sure` can only be set through an explicit user action. A period record indicates recorded period information, but does not imply any status for a month without a record. Never infer a missed period from calendar silence. Allow status editing, clearing back to no information, and preserve a conflicting explicit status and record for user resolution.

## 8. Cycle length

Cycle length is optional and unknown by default. No default such as 28 days may exist in code, storage, or UI. The app must work when the value is absent/null. No prediction is calculated when unknown; the initial scope calculates no predictions even when a value might later be entered.

## 9. UI state

- **Empty state:** No records/statuses exist; communicate “No information recorded.”
- **Calendar state:** Current selected month/year and the records/statuses to display.
- **Add/edit period state:** Form populated only for edit; add form has no default duration or date assumption.
- **Monthly status editing state:** Current month, selected explicit status or neutral no-information choice.
- **Validation/error state:** Field-level input problems, storage failures, corrupt/unsupported data, or unexpected actions with recoverable feedback.

State transitions must not mutate persistent data until the user submits a valid change.

## 10. Validation

Validate required start dates, real calendar dates, positive integer duration when supplied, supported storage schema, unique record IDs, and supported monthly status values. Validation is technical and must not impose medical rules, cycle regularity assumptions, or unsupported duration limits. Escape or safely render user-controlled text if any is added in future scope.

## 11. Responsive behavior

- **Mobile:** Fit the month grid within the viewport; preserve usable touch targets; allow record details/forms to stack vertically; avoid horizontal page scrolling.
- **Tablet:** Use available width for calendar and detail areas while retaining readable spacing.
- **Desktop:** Use a centered, readable content width; calendar and selected-month details may sit side by side where space permits.

At all widths, preserve the same data and actions, ensure forms remain usable, and test zoom/text scaling.

## 12. Accessibility

- Use semantic landmarks, headings, buttons, and form controls.
- Support keyboard navigation for every action and visible focus states.
- Associate persistent labels and instructions with form fields.
- Provide accessible names and month context for calendar controls and date cells.
- Communicate statuses with text and accessible semantics; do not rely on color alone.
- Maintain sufficient contrast and logical reading/focus order.
- Expose validation, save, and storage errors to assistive technology without unexpectedly moving focus.

## 13. Privacy

Data remains in browser `localStorage`; no server transmission, API, external tracking, analytics, or third-party personal health data processing is permitted. Do not load third-party scripts or fonts that can receive tracking data. Explain local storage limitations in product copy.

## 14. Error handling

Invalid input stays in the form with specific correction guidance. Storage read/write exceptions produce a visible message and do not falsely report success. Corrupted or unsupported storage is preserved and reported; never silently replace it with an empty document. Unexpected state or rendering errors should fail safely, avoid modifying saved records, and provide a recovery path. Destructive reset, if implemented, requires explicit confirmation.

## 15. Testing strategy

Before release, perform manual checks and focused JavaScript tests for:

- Date parsing and validation, impossible dates, leap days, and year boundaries.
- Positive integer duration and inclusive end-date calculation, including multi-month/year boundaries.
- Unknown duration saves with no calculated end date and marks only its start date.
- Each monthly status, neutral empty months, status edits, status clearing, and record/status inconsistency.
- Missing, valid, malformed, unsupported, and inaccessible `localStorage`; save/update/delete persistence.
- Adding, editing, and deleting records, including preservation of unrelated data.
- Calendar month navigation across year boundaries and leap-year display.
- Mobile, tablet, desktop, keyboard use, focus visibility, status text, and form errors with assistive technology.

Tests must not depend on presumed cycle length or five-day periods. Test data must be clearly synthetic and must never be presented as real user health data. Testing is a future implementation requirement; no tests or application files are created in this documentation phase.
