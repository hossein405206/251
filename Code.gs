/**
 * Project 251 - Google Apps Script backend
 * 1) Run setup() once from the Apps Script editor and authorize access.
 * 2) Deploy > New deployment > Web app.
 * 3) Execute as: Me | Who has access: Anyone
 * 4) Copy the deployment URL ending in /exec into index.html (SCRIPT_URL).
 */
const SHEET_NAME = "Project Requests";
const HEADERS = [
  "زمان ثبت", "نام", "راه ارتباطی", "دسته‌بندی", "بودجه",
  "عنوان پروژه", "توضیحات", "زمان مورد انتظار", "منبع"
];

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("یک Google Sheet باز کن و از Extensions > Apps Script وارد شو.");
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
    sheet.autoResizeColumns(1, HEADERS.length);
  }
  return "Setup complete: " + ss.getUrl();
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: "251-project-intake" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const p = (e && e.parameter) ? e.parameter : {};
    // Honeypot field: silently ignore likely bot submissions.
    if (p.website) return json_({ ok: true });
    const name = clean_(p.name, 100);
    const contact = clean_(p.contact, 120);
    const category = clean_(p.category, 80);
    const budget = clean_(p.budget, 80);
    const title = clean_(p.title, 150);
    const description = clean_(p.description, 5000);
    const deadline = clean_(p.deadline, 100);
    const source = clean_(p.source, 500);

    if (!name || !contact || !category || !title || description.length < 10) {
      return json_({ ok: false, error: "required_fields_missing" });
    }

    lock.waitLock(10000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error("No spreadsheet attached");
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(HEADERS);
      sheet.setFrozenRows(1);
    }
    sheet.appendRow([
      new Date(), safeCell_(name), safeCell_(contact), safeCell_(category),
      safeCell_(budget), safeCell_(title), safeCell_(description),
      safeCell_(deadline), safeCell_(source)
    ]);
    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: "server_error" });
  } finally {
    try { lock.releaseLock(); } catch (ignored) {}
  }
}

function clean_(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

// Prevent user-entered text from being interpreted as a spreadsheet formula.
function safeCell_(value) {
  const s = String(value || "");
  return /^[=+@\-]/.test(s) ? "'" + s : s;
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
