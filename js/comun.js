document.addEventListener("DOMContentLoaded", () => {
  const fechaSpan = document.getElementById("fecha-actual");
  if (fechaSpan) {
    fechaSpan.textContent = new Intl.DateTimeFormat("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(new Date());
  }
});