 # Menstrual Tracker

A private, browser-based journal for recording period dates and reviewing monthly history. The app keeps its data in the browser on your device and does not send it to a server.

## Features

* Add, edit, and delete period records.
* Enter a start date and an optional duration. When a duration is entered, the calendar range and inclusive end date are calculated from that value; when it is unknown, only the start date is recorded.
* Browse records in a month calendar, including ranges that cross month boundaries.
* Set an explicit monthly status: **Period recorded**, **Period did not arrive**, or **Not sure**. Clear a status to return to **No information recorded**.
* Review a year summary with monthly statuses and counts.
* Keep records and statuses in browser `localStorage` without an account, backend, external API, or third-party tracking.

The app does not predict periods, infer a missed period from a blank month, or provide medical advice or assessments.

## Run Locally

No package installation or build step is needed.

From the project directory, start a local static server:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000` in a browser.

Stop the server with `Ctrl+C` when finished.

You can also open `index.html` directly, but using a local server provides a consistent browser origin for local storage.

## Run End-to-End Tests

The project includes a Playwright end-to-end test suite covering the application's core user workflows and responsive layouts.

Install the development dependency:

```bash
npm install
```

Run the test suite:

```bash
npm test
```

The tests:

* Run in an installed Google Chrome window in visible mode.
* Start a temporary static server at `http://127.0.0.1:4173`.
* Use isolated browser contexts so test records do not enter regular browser storage.
* Slow actions slightly to make the test flow easier to follow.

Google Chrome and Python are required to run the test suite.

## Using the Tracker

1. Enter a period start date. Add a duration only when you know it; it must be a positive whole number of days.
2. Save the record. Edit or delete it later from the period records list.
3. Use the calendar controls to browse months. A recorded duration marks its inclusive date range; an unknown duration marks only the start date.
4. Choose a monthly status when you want to record one. A month with no record or selected status remains **No information recorded**. The app preserves a status and period record separately and flags conflicts for review.
5. Select a year to review the year summary.

## Privacy and Data

Records are stored under the `periodTrackerData` key in this browser's `localStorage`.

They are not synchronized or backed up by the app. Data may not be available in another browser or device and can be removed when browser site data is cleared.

Use the same browser and local server address to return to the same local data.

If saved data is malformed, unsupported, or inaccessible, the app reports the problem and avoids silently replacing the stored value.

## Project Structure

```text
project/
|
|-- index.html              # App structure and forms
|
|-- css/
|   `-- styles.css          # Layout, visual design, and responsive styles
|
|-- js/
|   `-- app.js              # Calendar, records, statuses, and local persistence

## Technology

The app uses semantic HTML, CSS, and vanilla JavaScript.

It has no framework, package dependencies, backend, database, or external API.

Playwright is included as a development dependency for end-to-end testing.

## Health Information Notice

Menstrual Tracker is a personal record-keeping tool, not a medical device or a substitute for professional medical advice, diagnosis, or care.
