const form = document.querySelector("#suggest-form");
const status = document.querySelector("#suggest-status");
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const text = [
    `Venue: ${data.get("venue")}`,
    `City: ${data.get("city")}`,
    `Pricing page: ${data.get("url")}`,
    `Note: ${data.get("note") || ""}`,
  ].join("\n");
  try {
    await navigator.clipboard.writeText(text);
    status.textContent = "Copied. Paste it into an email. This form does not send yet.";
  } catch {
    status.textContent = text;
  }
});
