/**
 * 251 Project Intake + Private Admin
 * IMPORTANT: Keep this project separate from the Apps Script project for site 313.
 * Setup: create a dedicated Google Sheet, open Extensions > Apps Script, paste this file,
 * add an HTML file named Admin and paste Admin.html into it, then run setup().
 * Set ADMIN_PASSWORD in Project Settings > Script properties before deploying.
 */
const SHEET_NAME = "Project Requests";
const HEADERS = ["شناسه","زمان ثبت","نام","راه ارتباطی","دسته‌بندی","بودجه","عنوان پروژه","توضیحات","زمان مورد انتظار","منبع","وضعیت"];
const STATUSES = ["جدید","در حال بررسی","تأییدشده","در حال انجام","تکمیل‌شده","ردشده"];

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("ابتدا یک Google Sheet جدا برای پروژه 251 بساز و از Extensions > Apps Script وارد شو.");
  PropertiesService.getScriptProperties().setProperty("SPREADSHEET_ID", ss.getId());
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  if (!sh.getLastRow()) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1,1,1,HEADERS.length).setFontWeight("bold").setBackground("#17243b").setFontColor("#ffffff");
    sh.autoResizeColumns(1, HEADERS.length);
  }
  return "آماده شد: " + ss.getUrl();
}

function doGet(e) {
  if (e && e.parameter && e.parameter.admin === "1") {
    return HtmlService.createHtmlOutputFromFile("Admin").setTitle("پنل مدیریت پروژه‌های 251").addMetaTag("viewport","width=device-width, initial-scale=1");
  }
  return ContentService.createTextOutput(JSON.stringify({ok:true, service:"251-project-intake"})).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const p = e && e.parameter ? e.parameter : {};
  if (p.website) return json_({ok:true});
  const name = clean_(p.name,100), contact = clean_(p.contact,120), category = clean_(p.category,80);
  const budget = clean_(p.budget,80), title = clean_(p.title,150), description = clean_(p.description,5000);
  const deadline = clean_(p.deadline,100), source = clean_(p.source,500);
  if (!name || !contact || !category || !title || description.length < 10) return json_({ok:false,error:"required_fields_missing"});
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh = getSheet_();
    const id = Utilities.getUuid().slice(0,8).toUpperCase();
    sh.appendRow([id,new Date(),safeCell_(name),safeCell_(contact),safeCell_(category),safeCell_(budget),safeCell_(title),safeCell_(description),safeCell_(deadline),safeCell_(source),"جدید"]);
    return json_({ok:true,id:id});
  } catch(err) {
    console.error(err);
    return json_({ok:false,error:"server_error"});
  } finally { try { lock.releaseLock(); } catch(ignore) {} }
}

function adminLogin(password) {
  const expected = PropertiesService.getScriptProperties().getProperty("ADMIN_PASSWORD");
  if (!expected || String(password || "") !== expected) throw new Error("رمز ورود نادرست است یا ADMIN_PASSWORD تنظیم نشده.");
  return {ok:true, count:getSheet_().getLastRow()-1};
}
function adminList(password) {
  requireAdmin_(password);
  const sh = getSheet_(), values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  return values.slice(1).reverse().map((r) => ({
    id:String(r[0]||""), created:r[1] instanceof Date ? Utilities.formatDate(r[1], Session.getScriptTimeZone(), "yyyy/MM/dd HH:mm") : String(r[1]||""),
    name:String(r[2]||""), contact:String(r[3]||""), category:String(r[4]||""), budget:String(r[5]||""),
    title:String(r[6]||""), description:String(r[7]||""), deadline:String(r[8]||""), source:String(r[9]||""), status:String(r[10]||"جدید")
  }));
}
function adminUpdateStatus(password, id, status) {
  requireAdmin_(password);
  if (STATUSES.indexOf(String(status)) === -1) throw new Error("وضعیت نامعتبر است.");
  const sh = getSheet_(), values = sh.getDataRange().getValues();
  for (let i=1;i<values.length;i++) {
    if (String(values[i][0]) === String(id)) { sh.getRange(i+1,11).setValue(status); return {ok:true}; }
  }
  throw new Error("پروژه پیدا نشد.");
}
function adminDelete(password, id) {
  requireAdmin_(password);
  const sh = getSheet_(), values = sh.getDataRange().getValues();
  for (let i=1;i<values.length;i++) {
    if (String(values[i][0]) === String(id)) { sh.deleteRow(i+1); return {ok:true}; }
  }
  throw new Error("پروژه پیدا نشد.");
}
function requireAdmin_(password) {
  const expected = PropertiesService.getScriptProperties().getProperty("ADMIN_PASSWORD");
  if (!expected || String(password || "") !== expected) throw new Error("دسترسی رد شد.");
}
function getSheet_() {
  const id = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (!id) throw new Error("تابع setup را اجرا کن تا شیت ثبت شود.");
  const ss = SpreadsheetApp.openById(id);
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) { sh=ss.insertSheet(SHEET_NAME); sh.appendRow(HEADERS); sh.setFrozenRows(1); }
  return sh;
}
function clean_(v,n) { return String(v||"").trim().slice(0,n); }
function safeCell_(v) { const s=String(v||""); return /^[=+@\-]/.test(s) ? "'" + s : s; }
function json_(v) { return ContentService.createTextOutput(JSON.stringify(v)).setMimeType(ContentService.MimeType.JSON); }
