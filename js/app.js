(function () {
  'use strict';

  const STORAGE_KEY = 'periodTrackerData';
  const STORAGE_VERSION = 1;
  const STATUS_LABELS = {
    period_recorded: 'Period recorded',
    period_did_not_arrive: 'Period did not arrive',
    not_sure: 'Not sure',
    no_information_recorded: 'No information recorded'
  };
  const SAVED_STATUSES = ['period_recorded', 'period_did_not_arrive', 'not_sure'];

  const elements = {
    calendar: document.getElementById('calendar'),
    calendarMonth: document.getElementById('calendar-month'),
    previousMonth: document.getElementById('previous-month'),
    nextMonth: document.getElementById('next-month'),
    currentStatus: document.getElementById('current-status'),
    statusIcon: document.getElementById('status-icon'),
    monthStatus: document.getElementById('monthly-status-card'),
    statusForm: document.getElementById('status-form'),
    statusMonth: document.getElementById('status-month'),
    statusConflict: document.getElementById('status-conflict'),
    statusError: document.getElementById('status-error'),
    periodForm: document.getElementById('period-form'),
    periodId: document.getElementById('period-id'),
    startDate: document.getElementById('start-date'),
    duration: document.getElementById('duration'),
    calculatedDate: document.getElementById('calculated-date'),
    periodError: document.getElementById('period-error'),
    savePeriod: document.getElementById('save-period'),
    cancelEdit: document.getElementById('cancel-edit'),
    periodList: document.getElementById('period-list'),
    summaryYear: document.getElementById('summary-year'),
    trackedMonths: document.getElementById('tracked-months'),
    arrivedMonths: document.getElementById('arrived-months'),
    missedMonths: document.getElementById('missed-months'),
    unsureMonths: document.getElementById('unsure-months'),
    unknownMonths: document.getElementById('unknown-months'),
    yearChart: document.getElementById('year-chart'),
    monthlyPattern: document.getElementById('monthly-pattern'),
    appMessage: document.getElementById('app-message'),
    storageError: document.getElementById('storage-error')
  };

  let data = emptyData();
  let selectedMonth = '';
  let selectedSummaryYear = '';
  let safeMode = false;

  function emptyData() {
    return { schemaVersion: STORAGE_VERSION, periods: [], monthlyStatuses: {} };
  }

  function makeUtcDate(year, month, day) {
    const date = new Date(0);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCFullYear(year, month - 1, day);
    return date;
  }

  function parseDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const parts = value.split('-').map(Number);
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return null;
    const date = makeUtcDate(year, month, day);
    if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) return null;
    return date;
  }

  function dateString(date) {
    const year = String(date.getUTCFullYear()).padStart(4, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  function calculateEndDate(startDate, durationDays) {
    const start = parseDate(startDate);
    if (!start || !Number.isSafeInteger(durationDays) || durationDays < 1) return null;
    start.setUTCDate(start.getUTCDate() + durationDays - 1);
    if (!Number.isFinite(start.getTime())) return null;
    if (start.getUTCFullYear() > 9999 || start.getUTCFullYear() < 1) return null;
    return dateString(start);
  }

  function monthKeyIsValid(value) {
    return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && Number(value.slice(0, 4)) > 0;
  }

  function validateData(candidate) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return 'Saved data has an invalid structure.';
    if (candidate.schemaVersion !== STORAGE_VERSION) return 'Saved data uses an unsupported version.';
    if (!Array.isArray(candidate.periods)) return 'Saved period records are invalid.';
    if (!candidate.monthlyStatuses || typeof candidate.monthlyStatuses !== 'object' || Array.isArray(candidate.monthlyStatuses)) {
      return 'Saved monthly statuses are invalid.';
    }
    if (candidate.settings !== undefined && (!candidate.settings || typeof candidate.settings !== 'object' || Array.isArray(candidate.settings) || (candidate.settings.cycleLengthDays !== undefined && candidate.settings.cycleLengthDays !== null))) {
      return 'Saved settings are invalid.';
    }

    const ids = new Set();
    for (const period of candidate.periods) {
      if (!period || typeof period !== 'object' || typeof period.id !== 'string' || !period.id || ids.has(period.id)) return 'A saved period record has an invalid or duplicate ID.';
      if (!parseDate(period.startDate)) return 'A saved period record has an invalid start date.';
      if (period.durationDays !== null && (!Number.isSafeInteger(period.durationDays) || period.durationDays < 1)) return 'A saved period record has an invalid duration.';
      if (period.durationDays !== null && !calculateEndDate(period.startDate, period.durationDays)) return 'A saved period record has an end date outside the supported calendar range.';
      ids.add(period.id);
    }

    for (const key of Object.keys(candidate.monthlyStatuses)) {
      if (!monthKeyIsValid(key) || !SAVED_STATUSES.includes(candidate.monthlyStatuses[key])) return 'A saved monthly status is invalid.';
    }
    return '';
  }

  function readStoredData() {
    let raw;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      enterSafeMode('Browser storage could not be read. Your data has not been changed. Check browser storage permissions and reload the page.');
      return;
    }
    if (raw === null) return;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      enterSafeMode('Saved data could not be read because it is malformed. It has been left untouched. Do not clear browser storage if you need to keep it.');
      return;
    }
    const validationError = validateData(parsed);
    if (validationError) {
      enterSafeMode(validationError + ' The saved value has been left untouched.');
      return;
    }
    data = parsed;
  }

  function enterSafeMode(message) {
    safeMode = true;
    elements.storageError.hidden = false;
    elements.storageError.textContent = message;
    document.querySelectorAll('input, button').forEach(function (control) { control.disabled = true; });
  }

  function persist(nextData) {
    const validationError = validateData(nextData);
    if (validationError) {
      showMessage('This change could not be saved: ' + validationError);
      return false;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
    } catch (error) {
      showMessage('Your change was not saved. Browser storage is unavailable or full; your previous saved data is unchanged.');
      return false;
    }
    data = nextData;
    return true;
  }

  function cloneData() {
    return JSON.parse(JSON.stringify(data));
  }

  function showMessage(message) {
    elements.appMessage.textContent = message;
    const isError = /could not be saved|was not saved|could not be read|invalid/i.test(message);
    elements.appMessage.classList.toggle('is-error', isError);
    elements.appMessage.setAttribute('role', isError ? 'alert' : 'status');
    elements.appMessage.setAttribute('aria-live', isError ? 'assertive' : 'polite');
  }

  function formatDate(value) {
    const date = parseDate(value);
    if (!date) return value;
    return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date);
  }

  function monthLabel(key) {
    const parts = key.split('-').map(Number);
    return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long', timeZone: 'UTC' }).format(makeUtcDate(parts[0], parts[1], 1));
  }

  function datesInSelectedMonth() {
    return data.periods.filter(function (period) {
      const end = calculateEndDate(period.startDate, period.durationDays) || period.startDate;
      return period.startDate.slice(0, 7) <= selectedMonth && end.slice(0, 7) >= selectedMonth;
    });
  }

  function recordsByDay() {
    const marked = new Set();
    const monthYear = Number(selectedMonth.slice(0, 4));
    const monthNumber = Number(selectedMonth.slice(5, 7));
    const daysInMonth = makeUtcDate(monthYear, monthNumber + 1, 0).getUTCDate();
    datesInSelectedMonth().forEach(function (period) {
      const start = parseDate(period.startDate);
      const end = parseDate(calculateEndDate(period.startDate, period.durationDays) || period.startDate);
      for (let day = 1; day <= daysInMonth; day += 1) {
        const date = makeUtcDate(monthYear, monthNumber, day);
        if (date >= start && date <= end) marked.add(dateString(date));
      }
    });
    return marked;
  }

  function renderCalendar() {
    const year = Number(selectedMonth.slice(0, 4));
    const month = Number(selectedMonth.slice(5, 7));
    const firstWeekday = (makeUtcDate(year, month, 1).getUTCDay() + 6) % 7;
    const daysInMonth = makeUtcDate(year, month + 1, 0).getUTCDate();
    const markedDays = recordsByDay();
    const today = new Date();
    const todayDate = String(today.getFullYear()).padStart(4, '0') + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    const weekdayRow = document.createElement('div');
    weekdayRow.className = 'calendar-weekday-row';
    weekdayRow.setAttribute('role', 'row');
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].forEach(function (name) {
      const heading = document.createElement('div');
      heading.className = 'weekday';
      heading.setAttribute('role', 'columnheader');
      heading.textContent = name.slice(0, 3);
      weekdayRow.appendChild(heading);
    });
    elements.calendar.replaceChildren(weekdayRow);
    elements.calendar.setAttribute('aria-label', monthLabel(selectedMonth) + ' period calendar');

    const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
    for (let offset = 0; offset < cellCount; offset += 7) {
      const week = document.createElement('div');
      week.className = 'calendar-week';
      week.setAttribute('role', 'row');
      for (let column = 0; column < 7; column += 1) {
        const day = offset + column - firstWeekday + 1;
        const cell = document.createElement('div');
        cell.className = 'calendar-day';
        cell.setAttribute('role', 'gridcell');
        if (day >= 1 && day <= daysInMonth) {
          const isoDate = selectedMonth + '-' + String(day).padStart(2, '0');
          cell.textContent = String(day);
          cell.setAttribute('aria-label', formatDate(isoDate) + (markedDays.has(isoDate) ? ', period recorded' : ', no period record'));
          if (isoDate === todayDate) {
            cell.classList.add('today-day');
            cell.setAttribute('aria-current', 'date');
          }
          if (markedDays.has(isoDate)) {
            cell.classList.add('period-day');
            cell.setAttribute('title', 'Period recorded');
          }
        } else {
          cell.setAttribute('aria-hidden', 'true');
        }
        week.appendChild(cell);
      }
      elements.calendar.appendChild(week);
    }
    elements.calendarMonth.value = selectedMonth;
    elements.previousMonth.disabled = selectedMonth === '0001-01';
    elements.nextMonth.disabled = selectedMonth === '9999-12';
  }

  function effectiveStatus(month) {
    const explicit = data.monthlyStatuses[month];
    if (explicit) return explicit;
    return datesInMonth(month).length ? 'period_recorded' : 'no_information_recorded';
  }

  function datesInMonth(month) {
    return data.periods.filter(function (period) {
      const end = calculateEndDate(period.startDate, period.durationDays) || period.startDate;
      return period.startDate.slice(0, 7) <= month && end.slice(0, 7) >= month;
    });
  }

  function renderStatus() {
    const explicit = data.monthlyStatuses[selectedMonth];
    const status = effectiveStatus(selectedMonth);
    elements.currentStatus.textContent = monthLabel(selectedMonth) + ': ' + STATUS_LABELS[status];
    elements.statusIcon.textContent = status === 'period_recorded' ? '✓' : status === 'not_sure' ? '?' : '·';
    elements.monthStatus.setAttribute('data-status', status);
    elements.statusMonth.value = selectedMonth;
    const radioValue = explicit || status;
    const selectedRadio = elements.statusForm.querySelector('input[name="monthlyStatus"][value="' + radioValue + '"]');
    if (selectedRadio) selectedRadio.checked = true;
    const hasRecords = datesInMonth(selectedMonth).length > 0;
    const isMismatch = Boolean(explicit && ((hasRecords && explicit !== 'period_recorded') || (!hasRecords && explicit === 'period_recorded')));
    elements.statusConflict.textContent = isMismatch
      ? 'This month has period records and the saved status is “' + STATUS_LABELS[explicit] + '”. Both are kept. Review the record and saved status if this is not what you intended.'
      : '';
  }

  function createRecordCard(period) {
    const card = document.createElement('article');
    card.className = 'record-card';
    const details = document.createElement('div');
    details.className = 'record-details';
    const title = document.createElement('p');
    title.className = 'record-title';
    const endDate = calculateEndDate(period.startDate, period.durationDays);
    title.textContent = endDate ? formatDate(period.startDate) + ' – ' + formatDate(endDate) : formatDate(period.startDate);
    const duration = document.createElement('p');
    duration.className = 'record-duration';
    duration.textContent = period.durationDays === null
      ? 'Duration unknown'
      : 'Duration: ' + period.durationDays + ' ' + (period.durationDays === 1 ? 'day' : 'days');
    details.append(title, duration);

    const actions = document.createElement('div');
    actions.className = 'record-actions';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'record-action';
    edit.textContent = 'Edit';
    edit.setAttribute('aria-label', 'Edit period starting ' + formatDate(period.startDate));
    edit.addEventListener('click', function () { beginEdit(period); });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'record-action delete-action';
    remove.textContent = 'Delete';
    remove.setAttribute('aria-label', 'Delete period starting ' + formatDate(period.startDate));
    remove.addEventListener('click', function () { deletePeriod(period); });
    actions.append(edit, remove);
    card.append(details, actions);
    return card;
  }

  function renderPeriods() {
    elements.periodList.replaceChildren();
    const records = datesInMonth(selectedMonth).slice().sort(function (left, right) {
      return left.startDate.localeCompare(right.startDate);
    });
    if (!records.length) {
      const empty = document.createElement('div');
      empty.className = 'records-empty';
      const title = document.createElement('p');
      title.textContent = 'No information recorded for this month.';
      const details = document.createElement('span');
      details.textContent = 'A blank month does not indicate a missed period.';
      empty.append(title, details);
      elements.periodList.appendChild(empty);
      return;
    }
    const heading = document.createElement('h3');
    heading.className = 'records-heading';
    heading.textContent = 'Period records in ' + monthLabel(selectedMonth);
    elements.periodList.appendChild(heading);
    records.forEach(function (period) { elements.periodList.appendChild(createRecordCard(period)); });
  }

  function renderYearlyOverview() {
    const years = new Set([String(new Date().getFullYear())]);
    data.periods.forEach(function (period) {
      const firstYear = Number(period.startDate.slice(0, 4));
      const endDate = calculateEndDate(period.startDate, period.durationDays) || period.startDate;
      const lastYear = Number(endDate.slice(0, 4));
      for (let year = firstYear; year <= lastYear; year += 1) years.add(String(year).padStart(4, '0'));
    });
    Object.keys(data.monthlyStatuses).forEach(function (month) { years.add(month.slice(0, 4)); });
    const orderedYears = Array.from(years).sort();
    const currentYear = selectedSummaryYear || selectedMonth.slice(0, 4);
    elements.summaryYear.replaceChildren();
    orderedYears.forEach(function (year) {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      elements.summaryYear.appendChild(option);
    });
    elements.summaryYear.value = orderedYears.includes(currentYear) ? currentYear : orderedYears[orderedYears.length - 1];
    const year = elements.summaryYear.value;
    selectedSummaryYear = year;
    const counts = { period_recorded: 0, period_did_not_arrive: 0, not_sure: 0, no_information_recorded: 0 };
    const pattern = [];
    for (let monthNumber = 1; monthNumber <= 12; monthNumber += 1) {
      const month = year + '-' + String(monthNumber).padStart(2, '0');
      const status = effectiveStatus(month);
      counts[status] += 1;
      pattern.push({ month: month, status: status });
    }
    const tracked = 12 - counts.no_information_recorded;
    elements.trackedMonths.textContent = String(tracked);
    elements.arrivedMonths.textContent = String(counts.period_recorded);
    elements.missedMonths.textContent = String(counts.period_did_not_arrive);
    elements.unsureMonths.textContent = String(counts.not_sure);
    elements.unknownMonths.textContent = String(counts.no_information_recorded);

    const decided = counts.period_recorded + counts.period_did_not_arrive;
    const arrivedPercent = decided ? Math.round(counts.period_recorded / decided * 100) : 0;
    elements.yearChart.style.setProperty('--arrived-share', arrivedPercent + '%');
    elements.yearChart.classList.toggle('has-data', decided > 0);
    elements.yearChart.setAttribute('aria-label', decided
      ? 'Among ' + decided + ' months marked arrived or did not arrive, ' + counts.period_recorded + ' period arrived and ' + counts.period_did_not_arrive + " period didn't arrive"
      : 'No arrived or did not arrive months recorded');
    elements.monthlyPattern.replaceChildren();
    pattern.forEach(function (item) {
      const cell = document.createElement('div');
      cell.className = 'month-pattern-item status-' + item.status;
      const name = document.createElement('span');
      name.className = 'pattern-month-name';
      name.textContent = new Intl.DateTimeFormat(undefined, { month: 'short', timeZone: 'UTC' }).format(makeUtcDate(Number(year), Number(item.month.slice(5, 7)), 1));
      const mark = document.createElement('span');
      mark.className = 'pattern-month-mark';
      mark.setAttribute('aria-hidden', 'true');
      mark.textContent = item.status === 'period_recorded' ? '✓' : item.status === 'period_did_not_arrive' ? '×' : item.status === 'not_sure' ? '?' : '·';
      cell.setAttribute('aria-label', name.textContent + ': ' + STATUS_LABELS[item.status]);
      cell.append(name, mark);
      elements.monthlyPattern.appendChild(cell);
    });
  }

  function render() {
    renderCalendar();
    renderStatus();
    renderPeriods();
    renderYearlyOverview();
  }

  function updateDatePreview() {
    const date = elements.startDate.value;
    const durationText = elements.duration.value;
    const duration = Number(durationText);
    const end = date && durationText && Number.isSafeInteger(duration) && duration > 0 ? calculateEndDate(date, duration) : null;
    let text;
    if (!date) text = 'Enter a start date. Leave duration blank if it is unknown.';
    else if (!parseDate(date)) text = 'Enter a valid start date.';
    else if (!durationText) text = 'Duration is unknown; no end date will be calculated.';
    else if (!Number.isSafeInteger(duration) || duration < 1) text = 'Enter a positive whole number of days, or leave duration blank if unknown.';
    else if (!end) text = 'That duration goes beyond the supported calendar date range.';
    else text = 'Calculated end date: ' + formatDate(end) + ' (inclusive).';
    elements.calculatedDate.lastElementChild.textContent = text;
  }

  function clearPeriodError() {
    elements.periodError.textContent = '';
    elements.startDate.removeAttribute('aria-invalid');
    elements.duration.removeAttribute('aria-invalid');
  }

  function submitPeriod(event) {
    event.preventDefault();
    clearPeriodError();
    if (safeMode) return;
    const startDate = elements.startDate.value;
    const durationRaw = elements.duration.value;
    const duration = durationRaw === '' ? null : Number(durationRaw);
    if (!parseDate(startDate)) {
      elements.periodError.textContent = 'Enter a valid start date.';
      elements.startDate.setAttribute('aria-invalid', 'true');
      elements.startDate.focus();
      return;
    }
    if (duration !== null && (!Number.isSafeInteger(duration) || duration < 1)) {
      elements.periodError.textContent = 'Enter a positive whole number of days, or leave duration blank if unknown.';
      elements.duration.setAttribute('aria-invalid', 'true');
      elements.duration.focus();
      return;
    }
    if (duration !== null && !calculateEndDate(startDate, duration)) {
      elements.periodError.textContent = 'That duration goes beyond the supported calendar date range. Reduce the duration.';
      elements.duration.setAttribute('aria-invalid', 'true');
      elements.duration.focus();
      return;
    }

    const next = cloneData();
    const existingId = elements.periodId.value;
    if (existingId) {
      const index = next.periods.findIndex(function (period) { return period.id === existingId; });
      if (index < 0) {
        elements.periodError.textContent = 'This record is no longer available. Reload the page and try again.';
        return;
      }
      next.periods[index] = { id: existingId, startDate: startDate, durationDays: duration };
    } else {
      next.periods.push({ id: createId(), startDate: startDate, durationDays: duration });
    }
    if (persist(next)) {
      const savedMonth = startDate.slice(0, 7);
      if (!data.monthlyStatuses[savedMonth]) selectedMonth = savedMonth;
      resetPeriodForm();
      render();
      showMessage(existingId ? 'Period record updated.' : 'Period record saved.');
    }
  }

  let idCounter = 0;
  function createId() {
    let candidate;
    do {
      idCounter += 1;
      candidate = window.crypto && typeof window.crypto.randomUUID === 'function'
        ? window.crypto.randomUUID()
        : 'period-' + Date.now().toString(36) + '-' + idCounter.toString(36);
    } while (data.periods.some(function (period) { return period.id === candidate; }));
    return candidate;
  }

  function resetPeriodForm() {
    elements.periodForm.reset();
    elements.periodId.value = '';
    elements.savePeriod.textContent = 'Save period';
    elements.cancelEdit.hidden = true;
    clearPeriodError();
    updateDatePreview();
  }

  function beginEdit(period) {
    elements.periodId.value = period.id;
    elements.startDate.value = period.startDate;
    elements.duration.value = period.durationDays === null ? '' : String(period.durationDays);
    elements.savePeriod.textContent = 'Update period';
    elements.cancelEdit.hidden = false;
    clearPeriodError();
    updateDatePreview();
    elements.startDate.focus();
  }

  function deletePeriod(period) {
    const confirmed = window.confirm('Delete the period record starting ' + formatDate(period.startDate) + '? This cannot be undone.');
    if (!confirmed || safeMode) return;
    const next = cloneData();
    next.periods = next.periods.filter(function (item) { return item.id !== period.id; });
    if (persist(next)) {
      if (elements.periodId.value === period.id) resetPeriodForm();
      render();
      showMessage('Period record deleted. Saved monthly statuses were kept.');
    }
  }

  function submitStatus(event) {
    event.preventDefault();
    elements.statusError.textContent = '';
    if (safeMode) return;
    const month = elements.statusMonth.value;
    if (!monthKeyIsValid(month)) {
      elements.statusError.textContent = 'Choose a valid month.';
      elements.statusMonth.setAttribute('aria-invalid', 'true');
      elements.statusMonth.focus();
      return;
    }
    elements.statusMonth.removeAttribute('aria-invalid');
    const selected = elements.statusForm.querySelector('input[name="monthlyStatus"]:checked');
    if (!selected) {
      elements.statusError.textContent = 'Choose a monthly status.';
      return;
    }
    const next = cloneData();
    if (selected.value === 'no_information_recorded') delete next.monthlyStatuses[month];
    else next.monthlyStatuses[month] = selected.value;
    if (persist(next)) {
      selectedMonth = month;
      render();
      showMessage('Monthly status saved.');
    }
  }

  function shiftMonth(amount) {
    const parts = selectedMonth.split('-').map(Number);
    let year = parts[0];
    let month = parts[1] + amount;
    if (month < 1) { month = 12; year -= 1; }
    if (month > 12) { month = 1; year += 1; }
    if (year < 1 || year > 9999) return;
    selectedMonth = String(year).padStart(4, '0') + '-' + String(month).padStart(2, '0');
    render();
  }

  elements.calendarMonth.addEventListener('change', function () {
    if (monthKeyIsValid(elements.calendarMonth.value)) {
      selectedMonth = elements.calendarMonth.value;
      render();
    }
  });
  elements.previousMonth.addEventListener('click', function () { shiftMonth(-1); });
  elements.nextMonth.addEventListener('click', function () { shiftMonth(1); });
  elements.statusForm.addEventListener('submit', submitStatus);
  elements.startDate.addEventListener('input', updateDatePreview);
  elements.duration.addEventListener('input', updateDatePreview);
  elements.periodForm.addEventListener('submit', submitPeriod);
  elements.cancelEdit.addEventListener('click', resetPeriodForm);
  elements.statusMonth.addEventListener('change', function () {
    const month = elements.statusMonth.value;
    if (!monthKeyIsValid(month)) return;
    const explicit = data.monthlyStatuses[month];
    const current = explicit || (datesInMonth(month).length ? 'period_recorded' : 'no_information_recorded');
    const radio = elements.statusForm.querySelector('input[name="monthlyStatus"][value="' + current + '"]');
    if (radio) radio.checked = true;
  });
  elements.summaryYear.addEventListener('change', function () {
    selectedSummaryYear = elements.summaryYear.value;
    renderYearlyOverview();
  });
  const today = new Date();
  selectedMonth = String(today.getFullYear()).padStart(4, '0') + '-' + String(today.getMonth() + 1).padStart(2, '0');
  readStoredData();
  render();
  updateDatePreview();
}());
