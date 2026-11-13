/* Lakeside quote form: the 3-question flow on the homepage (#quote) and on /quote/.
   Field names and values are the Netlify form contract ("quote-request"); don't rename them.
   Without JS the form still posts natively and Netlify sends people to /thank-you/ (the form's action).
   On success: the first name and the two answers are kept in this tab's sessionStorage so
   /thank-you/ can say "Thanks, <name>" (never in the URL), then the browser goes to /thank-you/.
   /quote/?sell=<one of the Q1 answers> (the industry links) pre-picks Q1 and opens on Q2. */
(function () {
'use strict';
var W = window;
var $ = function (s, c) { return (c || document).querySelector(s); };
var $$ = function (s, c) { return [].slice.call((c || document).querySelectorAll(s)); };
var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
var motionOK = !!(W.matchMedia && matchMedia('screen and (prefers-reduced-motion: no-preference)').matches);
try {
var form = $('#quote-form');
if (!form) return;
var steps = $$('.qf-step', form), rail = $$('.qf-rail i', form), live = $('#qf-live'), card = $('#q-card'), cur = 1;
var sell = $('#qf-sell'), vol = $('#qf-vol');
form.setAttribute('novalidate', ''); // JS validates inline; without JS the browser's own required checks stay on
form.classList.add('qf-js');
var hint = function (n, msg) {
var h = $('#qf-hint' + n); if (!h) return;
if (n === 2) h.hidden = !msg;
if (msg) { h.textContent = msg; h.classList.add('warn'); }
else if (n === 1) { h.classList.remove('warn'); h.innerHTML = 'Tap an answer to continue<span class="kb"> · Arrow keys or 1–6 work too</span>'; }
};
var recap = function () {
$$('[data-show=sell]', form).forEach(function (el) { el.textContent = sell.value; });
$$('[data-show=vol]', form).forEach(function (el) { el.textContent = vol.value ? vol.value + ' orders / mo' : ''; });
$('#qf-picked2').hidden = !sell.value;
$('#qf-picked3').hidden = !(sell.value && vol.value);
};
var go = function (n, focus) {
cur = n;
steps.forEach(function (s, i) { s.classList.toggle('on', i === n - 1); });
rail.forEach(function (r, i) { r.className = i < n - 1 ? 'done' : i === n - 1 ? 'cur' : ''; });
$('#qf-stepno').textContent = 'Question ' + n + ' of 3';
$('#qf-time').textContent = n === 3 ? 'Last one' : 'About ' + (20 - (n - 1) * 7) + ' seconds';
recap();
var step = steps[n - 1];
live.textContent = 'Question ' + n + ' of 3: ' + $('.qf-q', step).textContent;
if (focus) {
var r = card.getBoundingClientRect();
if (r.top < 64 || r.top > innerHeight * 0.55) scrollTo({ top: r.top + scrollY - 76, behavior: motionOK ? 'smooth' : 'auto' });
var t = n === 3 ? $('#qf-fn') : ($('[aria-pressed="true"]', step) || $('.qf-choice', step));
setTimeout(function () { t.focus({ preventScroll: true }); }, 60);
}
};
var pick = function (btn, carrier, next) {
$$('.qf-choice', btn.parentNode).forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
carrier.value = btn.dataset.sell || btn.dataset.vol;
hint(next - 1, '');
setTimeout(function () { go(next, true); }, motionOK ? 220 : 0);
};
$$('#qf-1 .qf-choice').forEach(function (b) { b.addEventListener('click', function () { pick(b, sell, 2); }); });
$$('#qf-2 .qf-choice').forEach(function (b) { b.addEventListener('click', function () { pick(b, vol, 3); }); });
$$('[data-go]', form).forEach(function (b) { b.addEventListener('click', function () { go(+b.dataset.go, true); }); });
$$('.qf-choices', form).forEach(function (g) {
g.addEventListener('keydown', function (e) {
var bs = $$('.qf-choice', g), i = bs.indexOf(document.activeElement), j;
if (i < 0) return;
var cols = getComputedStyle(g).gridTemplateColumns.split(' ').length;
var mv = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols };
if (/^[1-6]$/.test(e.key) && bs[+e.key - 1]) { e.preventDefault(); bs[+e.key - 1].click(); return; }
if (e.key in mv) j = i + mv[e.key]; else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = bs.length - 1; else return;
e.preventDefault();
bs[clamp(j, 0, bs.length - 1)].focus();
});
});
var err = $('#qf-err'), btn = $('#submit-btn'), btnT = $('.btn-t', btn);
['#qf-fn', '#qf-em'].forEach(function (q) { var i = $(q); if (i) i.setAttribute('aria-describedby', 'qf-err'); });
var showErr = function (html, kind) { err.innerHTML = html; err.dataset.kind = kind || 'send'; err.hidden = false; };
form.addEventListener('submit', function (e) {
e.preventDefault();
if (!sell.value) { go(1, true); hint(1, 'Pick what you sell first, then we’ll take your details.'); return; }
if (!vol.value) { go(2, true); hint(2, 'Pick your monthly order volume first.'); return; }
if (cur !== 3) { go(3, true); return; }
err.hidden = true; err.textContent = '';
var bad = $$('#qf-3 input[required]', form).filter(function (i) {
var ok = i.checkValidity() && !!i.value.trim();
i.setAttribute('aria-invalid', ok ? 'false' : 'true');
return !ok;
});
if (bad.length) {
showErr(bad[0].type === 'email' && bad[0].value ? 'That email doesn’t look quite right. Check it and try again.' : 'Add your first name and business email so we know where to send your quote.', 'fields');
bad[0].focus();
return;
}
btn.disabled = true; btnT.textContent = 'Sending…';
fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(new FormData(form)).toString() })
.then(function (res) {
if (!res.ok) throw new Error('HTTP ' + res.status);
try { sessionStorage.setItem('lf-quote', JSON.stringify({ n: $('#qf-fn').value.trim().slice(0, 40), s: sell.value, v: vol.value })); } catch (x) {}
btnT.textContent = 'Sent';
location.assign('/thank-you/');
})
.catch(function () {
btn.disabled = false; btnT.textContent = 'Get my custom quote';
showErr('We couldn’t send that just now. Call <a href="tel:+17373432348">(737) 343-2348</a> or email <a href="mailto:inboundleads@lakesidefulfillment.com">inboundleads@lakesidefulfillment.com</a> and we’ll start your quote.');
});
});
$$('#qf-3 input', form).forEach(function (i) {
i.addEventListener('input', function () {
if (i.getAttribute('aria-invalid') === 'true' && i.checkValidity()) i.setAttribute('aria-invalid', 'false');
/* a "fill these in" note goes away once every required field is filled; a send-failure note stays */
if (!err.hidden && err.dataset.kind === 'fields' && $$('#qf-3 input[required]', form).every(function (r) { return r.checkValidity() && !!r.value.trim(); })) { err.hidden = true; err.textContent = ''; }
});
});
hint(1, '');
var pre = null;
try { pre = new URLSearchParams(location.search).get('sell'); } catch (x) {}
var preBtn = pre ? $$('#qf-1 .qf-choice').filter(function (x) { return x.dataset.sell === pre; })[0] : null;
if (preBtn) {
$$('#qf-1 .qf-choice').forEach(function (x) { x.setAttribute('aria-pressed', x === preBtn ? 'true' : 'false'); });
sell.value = preBtn.dataset.sell;
go(2, false);
} else {
go(1, false);
}
} catch (e) { if (W.console) console.warn('quote flow:', e); }
})();
