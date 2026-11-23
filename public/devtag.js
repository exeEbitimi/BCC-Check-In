// Quiet developer credit, pinned to the bottom of the screen on the public pages.
// Admins switch it on or off from the check-in admin page. Change DEV_URL to your portfolio address.
(function () {
  var DEV_NAME = "Ebitimi";
  var DEV_URL = "https://ebitimibodmas.netlify.app/";
  function show() {
    var d = document.createElement("div");
    d.id = "devtag";
    d.style.cssText = "position:fixed;left:50%;bottom:.6rem;transform:translateX(-50%);z-index:5;background:rgba(0,0,0,.74);color:#fff;" +
      "font:500 .72rem/1.3 Manrope,system-ui,sans-serif;padding:.28rem .8rem;white-space:nowrap;opacity:.75;transition:opacity .2s;" +
      "box-shadow:0 0 0 1px rgba(255,255,255,.2)";
    d.onmouseenter = function () { d.style.opacity = "1"; };
    d.onmouseleave = function () { d.style.opacity = ".75"; };
    d.append("Built by ");
    var a = document.createElement("a");
    a.href = DEV_URL; a.target = "_blank"; a.rel = "noopener"; a.textContent = DEV_NAME;
    a.style.cssText = "color:#fff;text-decoration:underline;text-underline-offset:3px";
    d.append(a);
    document.body.append(d);
  }
  fetch("/api/settings", { cache: "no-store" }).then(function (r) { return r.json(); })
    .then(function (s) { if (s.devtag !== false) show(); }).catch(show);
})();
