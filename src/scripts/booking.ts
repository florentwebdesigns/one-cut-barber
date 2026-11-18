import qrcode from 'qrcode-generator';
import { smsLink } from '../lib/links';

type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
type Hours = Record<DayKey, { open: string; close: string } | null>;
type Config = { hours: Hours; timezone: string; sms: string; shop: string };

const KEYS: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SLOT = 30; // minutes
const DAYS_AHEAD = 14;

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const fmt = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

/** Today's calendar date and current minutes in the shop's timezone. */
function shopToday(tz: string) {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const g = (t: string) => Number(p.find((x) => x.type === t)?.value);
  return { y: g('year'), m: g('month') - 1, d: g('day'), minutes: (g('hour') % 24) * 60 + g('minute') };
}

type Day = { iso: string; key: DayKey; label: string; dow: string; num: number; mon: string; slots: number[] };

function upcomingDays(cfg: Config): Day[] {
  const t = shopToday(cfg.timezone);
  const out: Day[] = [];
  for (let i = 0; out.length < 10 && i < DAYS_AHEAD; i++) {
    const date = new Date(Date.UTC(t.y, t.m, t.d + i, 12));
    const key = KEYS[date.getUTCDay()];
    const h = cfg.hours[key];
    if (!h) continue;
    const open = toMin(h.open);
    const close = toMin(h.close);
    const slots: number[] = [];
    for (let s = open; s <= close - SLOT; s += SLOT) {
      if (i === 0 && s < t.minutes + 30) continue;
      slots.push(s);
    }
    if (!slots.length) continue;
    out.push({
      iso: date.toISOString().slice(0, 10),
      key,
      label: `${i === 0 ? 'Today, ' : i === 1 ? 'Tomorrow, ' : ''}${DOW[date.getUTCDay()]} ${MON[date.getUTCMonth()]} ${date.getUTCDate()}`,
      dow: i === 0 ? 'Today' : i === 1 ? 'Tmrw' : DOW[date.getUTCDay()],
      num: date.getUTCDate(),
      mon: MON[date.getUTCMonth()],
      slots,
    });
  }
  return out;
}

const isApple = () => /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
const isTouch = () => matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod/.test(navigator.userAgent);

export function initBooking() {
  const form = document.querySelector<HTMLFormElement>('[data-booking]');
  if (!form) return;
  const cfg: Config = JSON.parse(form.dataset.config || '{}');
  if (isTouch()) document.documentElement.classList.add('is-touch');

  const daysBox = form.querySelector<HTMLElement>('[data-days]')!;
  const timeSel = form.querySelector<HTMLSelectElement>('[data-times]')!;
  const stepForm = form.querySelector<HTMLElement>('[data-step="form"]')!;
  const stepDone = form.querySelector<HTMLElement>('[data-step="done"]')!;
  const nameInput = form.querySelector<HTMLInputElement>('input[name="name"]')!;
  const nameErr = form.querySelector<HTMLElement>('[data-error="name"]')!;

  const days = upcomingDays(cfg);
  daysBox.innerHTML = '';
  days.forEach((d, i) => {
    const label = document.createElement('label');
    label.className = 'bk__chip bk__day';
    label.innerHTML = `<input type="radio" name="day" value="${d.iso}" ${i === 0 ? 'checked' : ''} aria-label="${d.label}">
      <span class="bk__day-dow">${d.dow}</span><span class="bk__day-num tnum">${d.num}</span><span class="bk__day-mon">${d.mon}</span>`;
    daysBox.appendChild(label);
  });

  const fillTimes = () => {
    const iso = (form.querySelector<HTMLInputElement>('input[name="day"]:checked') || ({} as HTMLInputElement)).value;
    const day = days.find((d) => d.iso === iso);
    const prev = timeSel.value;
    timeSel.innerHTML = '<option value="">First available</option>';
    day?.slots.forEach((s) => {
      const o = document.createElement('option');
      o.value = fmt(s);
      o.textContent = fmt(s);
      timeSel.appendChild(o);
    });
    if ([...timeSel.options].some((o) => o.value === prev)) timeSel.value = prev;
  };
  daysBox.addEventListener('change', fillTimes);
  fillTimes();

  // Pre-select a service from any "Book" button on the page: <a data-book-service="Kids Haircut">
  document.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-book-service]');
    if (!t) return;
    const radio = form.querySelector<HTMLInputElement>(`input[name="service"][value="${CSS.escape(t.dataset.bookService!)}"]`);
    if (radio) radio.checked = true;
  });

  const compose = () => {
    const fd = new FormData(form);
    const svc = String(fd.get('service') || '');
    const svcInput = form.querySelector<HTMLInputElement>(`input[name="service"][value="${CSS.escape(svc)}"]`);
    const price = svcInput?.dataset.price ? ` ($${svcInput.dataset.price})` : '';
    const iso = String(fd.get('day') || fd.get('date') || '');
    const day = days.find((d) => d.iso === iso);
    const time = String(fd.get('time') || '') || 'First available';
    const name = String(fd.get('name') || '').trim();
    const notes = String(fd.get('notes') || '').trim();
    const lines = [
      `Hi ${cfg.shop}! I'd like to book an appointment.`,
      `Service: ${svc}${price}`,
      `Day: ${day ? day.label : iso || 'Flexible'}`,
      `Time: ${time}`,
      `Name: ${name}`,
    ];
    if (notes) lines.push(`Notes: ${notes}`);
    lines.push('(Sent from the One Cut website)');
    return lines.join('\n');
  };

  const renderQR = (text: string) => {
    const box = form.querySelector<HTMLElement>('[data-qr]')!;
    try {
      (qrcode as unknown as { stringToBytes: unknown; stringToBytesFuncs: Record<string, unknown> }).stringToBytes =
        (qrcode as unknown as { stringToBytesFuncs: Record<string, unknown> }).stringToBytesFuncs['UTF-8'];
      const qr = qrcode(0, 'M');
      qr.addData(`SMSTO:${cfg.sms}:${text}`);
      qr.make();
      const n = qr.getModuleCount();
      let path = '';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) path += `M${c} ${r}h1v1h-1z`;
      box.innerHTML = `<svg viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" aria-hidden="true"><path d="${path}" fill="#0d0c0b"/></svg>`;
    } catch {
      form.querySelector<HTMLElement>('[data-qr-wrap]')!.hidden = true;
    }
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!nameInput.value.trim()) {
      nameInput.setAttribute('aria-invalid', 'true');
      nameErr.hidden = false;
      nameInput.focus();
      return;
    }
    nameInput.removeAttribute('aria-invalid');
    nameErr.hidden = true;

    const text = compose();
    const href = smsLink(text, isApple(), cfg.sms);
    form.querySelector<HTMLAnchorElement>('[data-sms-open]')!.href = href;
    form.querySelector<HTMLElement>('[data-preview]')!.textContent = text;
    renderQR(text);
    stepForm.hidden = true;
    stepDone.hidden = false;
    stepDone.focus({ preventScroll: true });
    form.closest('.book__card')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (isTouch()) window.location.href = href;
  });

  nameInput.addEventListener('input', () => {
    if (nameInput.value.trim()) {
      nameInput.removeAttribute('aria-invalid');
      nameErr.hidden = true;
    }
  });

  form.querySelector('[data-edit]')!.addEventListener('click', () => {
    stepDone.hidden = true;
    stepForm.hidden = false;
    nameInput.focus({ preventScroll: true });
  });

  form.querySelector('[data-copy]')!.addEventListener('click', async (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    const text = form.querySelector<HTMLElement>('[data-preview]')!.textContent || '';
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = 'Copied';
    } catch {
      const r = document.createRange();
      r.selectNodeContents(form.querySelector('[data-preview]')!);
      const s = getSelection();
      s?.removeAllRanges();
      s?.addRange(r);
      btn.textContent = 'Selected — copy it';
    }
    window.setTimeout(() => (btn.textContent = 'Copy text'), 2400);
  });
}
