(function () {
  "use strict";
  function boot() {
    Ash.ui.bind();
    Ash.ui.render();
  }
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
  }
})();
