const views = ["allocation", "funnel", "strategy", "review", "reports", "care"];
const buttons = [...document.querySelectorAll('[data-view]')];
function show(view) {
  if (!views.includes(view)) view = "allocation";
  for (const id of views) {
    const selected = id === view;
    document.getElementById(id).hidden = !selected;
    const button = buttons.find(item => item.dataset.view === id);
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
  }
  if (location.hash !== `#${view}`) history.replaceState(null, "", `#${view}`);
}
buttons.forEach(button => button.addEventListener("click", () => show(button.dataset.view)));
window.addEventListener("hashchange", () => show(location.hash.slice(1)));
show(location.hash.slice(1));
