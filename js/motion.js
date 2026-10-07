// ?motion=1 forces JS animations on (remembered), ?motion=0 restores the OS preference.
window.prefersReducedMotion = function () {
  try {
    const flag = new URLSearchParams(location.search).get("motion");
    if (flag) localStorage.setItem("motion", flag);
    if (localStorage.getItem("motion") === "1") return false;
  } catch (e) {}
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};
