# Product Requirements Document

## 1. Project overview

Period Tracker is a private, frontend-only application for recording period start dates and user-entered durations, viewing records by month, and keeping an explicit monthly status when useful. It is a personal record-keeping tool, not a diagnostic or predictive health service.

## 2. Problem statement

People may want a simple way to remember and review when a period occurred. An incomplete calendar should not be interpreted as a missed period, and individual duration and cycle information must not be guessed by the application.

## 3. Target user

An individual who wants to record their own period dates and optionally annotate monthly status. The application should remain usable when the person does not know their cycle length.

## 4. Goals

- Record, review, edit, and delete period entries.
- Show a calendar and monthly record summary that reflects only saved information.
- Let the user explicitly set or revise a month's status.
- Keep data in the user's browser without sending it to a server or third party.
- Make the interface understandable, keyboard-accessible, and usable on common screen sizes.

## 5. Non-goals

- Predicting future periods or ovulation.
- Inferring that a period was missed from an empty month.
- Diagnosing conditions, interpreting symptoms, or making medical claims.
- Accounts, synchronization, sharing, reminders, or cloud backup in the initial version.

## 6. Core features

- Month-by-month calendar navigation.
- Period record creation with a start date and required user-entered duration.
- Display of the end date calculated only from that record's entered duration.
- Editing and deleting period records.
- Explicit monthly status selection and later editing.
- Persistent browser-local storage with clear handling of unavailable or invalid saved data.

## 7. Period recording

Each period record has a start date and duration supplied by the user. The duration is required for a saved record; there is no preselected duration. The user may enter a different duration for every record and may edit it later. The application must not assume that periods last five days, even if the user says that five days is usual.

The record should present its calculated end date. The end date is derived solely from the entered start date and duration; it is not a prediction. Records can be edited or deleted by the user.

## 8. Monthly tracking

The calendar and month summary show saved records and explicit statuses. A month without a record remains “No information recorded” unless the user chooses another status. Monthly views must not imply that an entry is complete or that a period occurred outside the dates the user recorded.

## 9. Monthly status editing

Each month supports these distinct statuses:

- **Period recorded** — the user indicates a period was recorded for that month; saved period entries are shown with it.
- **Period did not arrive** — explicitly selected by the user.
- **Not sure** — explicitly selected by the user.
- **No information recorded** — the neutral state when no explicit status has been selected and no period record establishes a recorded period.

The user can change a month's status later, including returning it to “No information recorded.” A period record does not cause another month to be marked as a missed period. If record data and an explicit status appear inconsistent, preserve the user's data and present the discrepancy clearly for the user to resolve; do not silently discard or rewrite either value.

## 10. Calendar behavior

- Show dates in a navigable month grid with controls for previous and next months and a way to identify the displayed month and year.
- Mark recorded period dates using the start date and calculated duration range.
- Present monthly status in text as well as any visual styling.
- Do not display predicted dates.
- Support month and year boundaries, including leap years.
- Calendar display must not change saved data merely because the user navigates.

## 11. Date validation

Accept a valid calendar date entered by the user. Reject blank, malformed, or impossible dates (for example, a day that does not exist in that month). Do not add medical or age-related constraints. Validation errors should identify the field and explain how to correct it. Date parsing and display should avoid timezone shifts that change the selected calendar day.

## 12. Period duration behavior

Duration is required and must be a positive whole number of calendar days that the interface can represent safely. There is no default duration, including five days. The user enters or edits each record's duration. For a duration of N days, the inclusive end date is the start date plus N−1 calendar days. Invalid, blank, fractional, zero, or negative durations cannot be saved. Do not impose an unstated medical maximum.

## 13. Cycle-length behavior

Cycle length is unknown by default. The application must work fully without it and must never assume 28 days or another value. The initial version does not calculate predictions. If a later version offers cycle length as an optional preference, it must be entered by the user, remain clearly optional, and must not enable predictions without separately approved requirements.

## 14. Data and privacy requirements

Period records and monthly statuses remain in browser localStorage. No server, API, external tracking, analytics, or third-party transmission is used. Explain that browser-local data may be unavailable in another browser/device and may be cleared by the user or browser. Do not store more personal data than required for the specified features.

## 15. UI/UX requirements

- Use plain, calm, nonjudgmental language.
- Make add, edit, delete, month navigation, and status editing discoverable.
- Confirm destructive deletion before removing a record.
- Show an honest empty state that says no information has been recorded, not that a period was missed.
- Provide visible validation and storage error messages with a clear next step.
- Avoid presenting estimates or medical interpretations as facts.

## 16. Accessibility requirements

- Use semantic HTML and correctly associated form labels.
- Support keyboard operation and visible focus.
- Provide accessible names for calendar navigation and record actions.
- Communicate status in text; color must not be the only distinction.
- Maintain readable contrast, scalable text, and a logical focus order.
- Announce validation and save/error feedback to assistive technology.

## 17. Future scope

Potential future work, requiring separate approval and requirements, may include optional user-entered cycle-length notes, export/import, reminders, localization, and additional accessibility refinements. Predictions, accounts, synchronization, and medical features are outside the initial scope and require explicit product and privacy review before consideration.
