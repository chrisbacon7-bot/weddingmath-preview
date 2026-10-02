const input = document.querySelector("[data-metro-filter]");
if (input) {
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    for (const row of document.querySelectorAll("[data-metro-row]")) {
      const name = row.firstElementChild.textContent.toLowerCase();
      row.hidden = q.length > 1 && !name.includes(q);
    }
  });
}
