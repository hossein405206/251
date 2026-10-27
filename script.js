/* Project 251 browser logic — extracted from index.html. */
/* پس از ساخت Web App در Google Apps Script، آدرس /exec را اینجا قرار بده. */
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzxzk2yB6AjzxeSxng3vAk8PMRMSe4yYagEByNYY5f7AqobQW5sPGpSZ5WlUgDHhxKy/exec";
const form = document.getElementById("projectForm");
const button = document.getElementById("submitBtn");
const statusBox = document.getElementById("status");
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = Object.fromEntries(new FormData(form).entries());
  if (data.website) return;
  if (!SCRIPT_URL.startsWith("https://script.google.com/")) {
    showStatus("فرم آماده است؛ برای فعال‌شدن ثبت درخواست باید آدرس Web App گوگل اسکریپت را در کد سایت قرار بدهی.", "err");
    return;
  }
  button.disabled = true; button.textContent = "در حال ارسال...";
  try {
    const body = new URLSearchParams();
    Object.entries(data).forEach(([key, value]) => body.append(key, value));
    body.append("source", location.href);
    // Apps Script redirects its response; no-cors avoids browser CORS blocking.
    // The UI can confirm dispatch, but not verify the server-side write.
    await fetch(SCRIPT_URL, { method: "POST", mode: "no-cors", body });
    form.reset();
    showStatus("درخواستت ارسال شد. اگر اطلاعاتت درست باشه، برای هماهنگی باهات تماس می‌گیرم.", "ok");
  } catch (error) {
    showStatus("ارسال انجام نشد. اتصال اینترنت رو بررسی کن و دوباره تلاش کن.", "err");
  } finally {
    button.disabled = false; button.textContent = "ارسال درخواست پروژه ←";
  }
});
function showStatus(message, kind) {
  statusBox.textContent = message;
  statusBox.className = "status show " + kind;
}
