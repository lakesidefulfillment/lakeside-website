/* /quote/ and /thank-you/: the menu sheet and the header's day/night tone.
   (The homepage has its own copy of both inside its main script.) */
(function () {
'use strict';
var root = document.documentElement, W = window;
var $ = function (s, c) { return (c || document).querySelector(s); };
var $$ = function (s, c) { return [].slice.call((c || document).querySelectorAll(s)); };

/* ---------- menu sheet ---------- */
try {
var sheet = $('#sheet'), mbtn = $('#menu-btn'), lastFocus = null;
mbtn.setAttribute('role', 'button');
var openMenu = function () {
lastFocus = document.activeElement;
sheet.hidden = false; root.classList.add('menu-open'); mbtn.setAttribute('aria-expanded', 'true');
setTimeout(function () { $('.sheet-x', sheet).focus(); }, 30);
};
var closeMenu = function (restore) {
if (sheet.hidden) return;
sheet.hidden = true; root.classList.remove('menu-open'); mbtn.setAttribute('aria-expanded', 'false');
if (restore && lastFocus) lastFocus.focus();
};
mbtn.addEventListener('click', function (e) { e.preventDefault(); openMenu(); });
mbtn.addEventListener('keydown', function (e) { if (e.key === ' ') { e.preventDefault(); openMenu(); } });
$$('[data-close]', sheet).forEach(function (el) { el.addEventListener('click', function () { closeMenu(el.tagName === 'BUTTON'); }); });
document.addEventListener('keydown', function (e) {
if (sheet.hidden) return;
if (e.key === 'Escape') { closeMenu(true); return; }
if (e.key === 'Tab') {
var f = $$('a,button', sheet), a = f[0], z = f[f.length - 1];
if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
}
});
addEventListener('resize', function () { if (innerWidth > 1060) closeMenu(false); });
} catch (e) { if (W.console) console.warn('menu:', e); }

/* ---------- header tone: dark over a night band, light elsewhere (a hard cut, like the homepage) ---------- */
try {
var hdr = $('#hdr'), meta = $('meta[name="theme-color"]'), nights = $$('.night, .sky'), night = null, ticking = false;
var tone = function () {
ticking = false;
var line = hdr.getBoundingClientRect().bottom - 1;
var on = nights.some(function (n) { var r = n.getBoundingClientRect(); return r.top <= line && r.bottom > line; });
if (on === night) return;
night = on; root.classList.add('tone-snap'); root.classList.toggle('on-night', on);
if (meta) meta.setAttribute('content', on ? '#0a111d' : '#f4f2ec');
requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.remove('tone-snap'); }); });
};
addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(tone); } }, { passive: true });
addEventListener('resize', tone);
tone();
} catch (e) { if (W.console) console.warn('tone:', e); }
})();
