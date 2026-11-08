'use strict';

/* =========================================================
   Конфіг
   ========================================================= */
const CONFIG = {
    DEFAULT_HUE: 300,                 // seed-відтінок за замовчуванням (фіолетовий, як було)
    USE_COVER_COLOR: true,            // брати акцентний колір з обкладинки (як PixelPlayer)
    COVER_SRC: './assets/cover.png',
    SEEK_STEP: 10                     // секунд для кнопок «назад/вперед»
};

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const root = document.documentElement;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

document.addEventListener('contextmenu', e => { if (!e.target.closest('a')) e.preventDefault(); });
document.addEventListener('dragstart', e => { if (e.target.tagName === 'IMG') e.preventDefault(); });

/* =========================================================
   i18n
   ========================================================= */
const translations = {
    en: {
        nickname: 'Kruger',
        last_track: 'FAVORITE TRACK',
        projects_title: 'My Projects',
        project1_name: 'Zeed',
        project1_desc: 'A lightweight and fast asynchronous framework for Telegram bots.',
        abandoned: 'ABANDONED',
        stack_title: 'My Tech Stack',
        stack_hint: 'Drag the icons',
        avatar_hint: 'Change shape',
        lang_label: 'Language',
        seek: 'Seek',
        play: 'Play',
        pause: 'Pause',
        rewind: 'Rewind 10 seconds',
        forward: 'Forward 10 seconds',
        theme_dark: 'Dark theme',
        theme_light: 'Light theme',
        theme_amoled: 'AMOLED black theme',
        quotes: ['JS Stack', 'There must be something else here...', 'JavaScript is my love', "Hi, I'm Kruger!"]
    },
    uk: {
        nickname: 'Kruger',
        last_track: 'УЛЮБЛЕНИЙ ТРЕК',
        projects_title: 'Мої Проєкти',
        project1_name: 'Zeed',
        project1_desc: 'Легкий та швидкий асинхронний фреймворк для Telegram-ботів.',
        abandoned: 'ЗАКИНУТИЙ',
        stack_title: 'Мій Тех. Стек',
        stack_hint: 'Тягни іконки',
        avatar_hint: 'Змінити форму',
        lang_label: 'Мова',
        seek: 'Перемотування',
        play: 'Грати',
        pause: 'Пауза',
        rewind: 'Назад на 10 секунд',
        forward: 'Вперед на 10 секунд',
        theme_dark: 'Темна тема',
        theme_light: 'Світла тема',
        theme_amoled: 'Чорна AMOLED-тема',
        quotes: ['JS Stack', 'Тут повинно бути щось ще...', 'JavaScript is my love', 'Ку, я Kruger!']
    },
    ru: {
        nickname: 'Kruger',
        last_track: 'ЛЮБИМЫЙ ТРЕК',
        projects_title: 'Мои Проекты',
        project1_name: 'Zeed',
        project1_desc: 'Легкий и быстрый асинхронный фреймворк для Telegram-ботов.',
        abandoned: 'ЗАБРОШЕН',
        stack_title: 'Мой Тех. Стек',
        stack_hint: 'Тяни иконки',
        avatar_hint: 'Сменить форму',
        lang_label: 'Язык',
        seek: 'Перемотка',
        play: 'Играть',
        pause: 'Пауза',
        rewind: 'Назад на 10 секунд',
        forward: 'Вперёд на 10 секунд',
        theme_dark: 'Тёмная тема',
        theme_light: 'Светлая тема',
        theme_amoled: 'Чёрная AMOLED-тема',
        quotes: ['JS Stack', 'Тут должно быть что-то ещё...', 'JavaScript is my love', 'Ку, я Kruger!']
    }
};

let currentLang = 'en';
let currentLangDict = translations.en;
const t = key => currentLangDict[key] ?? translations.en[key] ?? key;

/* =========================================================
   Тема: dark / light / amoled
   ========================================================= */
const THEMES = ['dark', 'light', 'amoled'];
const THEME_META = { dark: '#141218', light: '#fcf8fd', amoled: '#000000' };
const THEME_ICON = { dark: 'dark_mode', light: 'light_mode', amoled: 'contrast' };
const themeBtn = $('#themeBtn');
const themeIcon = $('#themeIcon');
const metaTheme = $('#metaTheme');

function refreshThemeUi() {
    const th = root.dataset.theme;
    themeIcon.textContent = THEME_ICON[th] || 'dark_mode';
    const label = t('theme_' + th);
    themeBtn.title = label;
    themeBtn.setAttribute('aria-label', label);
    if (metaTheme) metaTheme.setAttribute('content', THEME_META[th] || '#141218');
}

function setTheme(next, animate = true) {
    const apply = () => {
        root.dataset.theme = next;
        try { localStorage.setItem('theme', next); } catch (e) {}
        refreshThemeUi();
    };
    if (animate && !REDUCED && typeof document.startViewTransition === 'function') {
        document.startViewTransition(apply);
    } else {
        apply();
    }
    themeBtn.classList.remove('spin');
    void themeBtn.offsetWidth;
    themeBtn.classList.add('spin');
}

themeBtn.addEventListener('click', () => {
    const i = THEMES.indexOf(root.dataset.theme);
    setTheme(THEMES[(i + 1) % THEMES.length]);
});

/* =========================================================
   Shape morphing (набір форм у стилі M3 Expressive)
   Форма = масив радіусів r(θ) → SVG-path. Перехід — пружина з легким овершутом.
   ========================================================= */
const N = 144; // кількість точок контуру

const flower = (n, base, amp) => th => base + amp * Math.cos(n * th);
const superellipse = n => th =>
    Math.pow(Math.pow(Math.abs(Math.cos(th)), n) + Math.pow(Math.abs(Math.sin(th)), n), -1 / n);

// закруглені «пелюстки» з вузькими западинами (cookie / scallop)
function lobes(n, base, amp, soft) {
    const vmin = Math.sqrt(soft), vmax = Math.sqrt(1 + soft);
    return th => {
        const c = Math.cos(n * th / 2);
        return base + amp * (Math.sqrt(c * c + soft) - vmin) / (vmax - vmin);
    };
}
// гострі, трохи згладжені промені (sunny / burst)
function burst(n, base, amp, soft) {
    const vmin = Math.sqrt(soft), vmax = Math.sqrt(1 + soft);
    return th => {
        const s = Math.sin(n * th / 2);
        return base + amp * (1 - (Math.sqrt(s * s + soft) - vmin) / (vmax - vmin));
    };
}

const SHAPE_FUNCS = {
    circle:    () => 1,
    squircle:  superellipse(4),
    cookie:    lobes(9, 0.84, 0.16, 0.07),
    sunny:     burst(8, 0.80, 0.20, 0.05),
    clover:    flower(4, 0.78, 0.22),
    flower6:   flower(6, 0.80, 0.20),
    pentagon:  flower(5, 0.90, 0.10),
    gem:       th => superellipse(2.6)(th - Math.PI / 4)
};

const SHAPES = {};
for (const [name, fn] of Object.entries(SHAPE_FUNCS)) {
    const r = new Float32Array(N);
    let ext = 0;
    for (let i = 0; i < N; i++) {
        const th = (i / N) * TAU;
        r[i] = fn(th);
        ext = Math.max(ext, Math.abs(r[i] * Math.cos(th)), Math.abs(r[i] * Math.sin(th)));
    }
    for (let i = 0; i < N; i++) r[i] /= ext; // вписуємо в габарит ±1
    SHAPES[name] = r;
}

function buildPath(r) {
    let d = '';
    for (let i = 0; i < N; i++) {
        const th = (i / N) * TAU - Math.PI / 2; // перший «пелюсток» дивиться вгору
        const x = 50 + 50 * r[i] * Math.cos(th);
        const y = 50 + 50 * r[i] * Math.sin(th);
        d += (i ? 'L' : 'M') + x.toFixed(2) + ' ' + y.toFixed(2);
    }
    return d + 'Z';
}

class ShapeMorph {
    constructor(pathEl, name) {
        this.path = pathEl;
        this.cur = Float32Array.from(SHAPES[name]);
        this.from = Float32Array.from(this.cur);
        this.to = SHAPES[name];
        this.t = 1;
        this.v = 0;
        this.raf = 0;
        this.name = name;
        this.render();
    }
    morphTo(name) {
        const to = SHAPES[name];
        if (!to || name === this.name) return;
        this.name = name;
        this.from = Float32Array.from(this.cur);
        this.to = to;
        this.t = 0;
        this.v = 0;
        if (REDUCED) { this.t = 1; this.render(); return; }
        this.run();
    }
    run() {
        if (this.raf) return;
        let last = performance.now();
        const K = 420, C = 26; // жорсткість / демпфування → ζ≈0.63, невеликий овершут
        const tick = now => {
            const dt = Math.min(0.032, (now - last) / 1000);
            last = now;
            this.v += (-K * (this.t - 1) - C * this.v) * dt;
            this.t += this.v * dt;
            if (Math.abs(this.t - 1) < 0.0008 && Math.abs(this.v) < 0.01) {
                this.t = 1;
                this.raf = 0;
                this.render();
                return;
            }
            this.render();
            this.raf = requestAnimationFrame(tick);
        };
        this.raf = requestAnimationFrame(tick);
    }
    render() {
        const { cur, from, to, t } = this;
        for (let i = 0; i < N; i++) cur[i] = clamp(from[i] + (to[i] - from[i]) * t, 0.2, 1.3);
        this.path.setAttribute('d', buildPath(cur));
    }
}

/* ---------- Loader ---------- */
const loader = $('#loader');
const loaderMorph = new ShapeMorph($('#loaderPath'), 'cookie');
const loaderSeq = ['cookie', 'sunny', 'clover', 'gem', 'flower6', 'pentagon', 'circle'];
let loaderIdx = 0;
const loaderTimer = setInterval(() => loaderMorph.morphTo(loaderSeq[++loaderIdx % loaderSeq.length]), 650);

window.addEventListener('load', () => {
    setTimeout(() => {
        loader.classList.add('hidden');
        setTimeout(() => clearInterval(loaderTimer), 700);
    }, 800);
});

/* ---------- Аватар ---------- */
const AVATAR_SEQ = ['cookie', 'circle', 'sunny', 'squircle', 'clover', 'gem', 'flower6', 'pentagon'];
let avatarIdx = 0;
const avatarMorph = new ShapeMorph($('#avatarPath'), AVATAR_SEQ[0]);
$('#avatarBtn').addEventListener('click', () => {
    avatarIdx = (avatarIdx + 1) % AVATAR_SEQ.length;
    avatarMorph.morphTo(AVATAR_SEQ[avatarIdx]);
});

/* ---------- Обкладинка: squircle ↔ cookie ---------- */
const coverMorph = new ShapeMorph($('#coverPath'), 'squircle');

/* =========================================================
   Динамічний колір з обкладинки (OKLab → hue)
   ========================================================= */
function srgbToOklab(r, g, b) {
    const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const R = lin(r), G = lin(g), B = lin(b);
    const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
    const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
    const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
    return [
        0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
        1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
        0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
    ];
}

function dominantHue(img) {
    const S = 48;
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, S, S);
    const data = ctx.getImageData(0, 0, S, S).data; // кине SecurityError на file:// — ловимо нижче
    const BINS = 36;
    const bins = new Float64Array(BINS);
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 200) continue;
        const [L, a, b] = srgbToOklab(data[i], data[i + 1], data[i + 2]);
        const chroma = Math.hypot(a, b);
        if (chroma < 0.05 || L < 0.2 || L > 0.95) continue;
        let hue = Math.atan2(b, a) * 180 / Math.PI;
        if (hue < 0) hue += 360;
        bins[Math.floor(hue / (360 / BINS)) % BINS] += chroma * chroma;
    }
    let best = 0;
    for (let i = 1; i < BINS; i++) if (bins[i] > bins[best]) best = i;
    if (bins[best] === 0) return null;
    // уточнення: кругове середнє по сусідніх бінах
    let x = 0, y = 0;
    for (let k = -1; k <= 1; k++) {
        const idx = (best + k + BINS) % BINS;
        const ang = ((idx + 0.5) * (360 / BINS)) * Math.PI / 180;
        x += Math.cos(ang) * bins[idx];
        y += Math.sin(ang) * bins[idx];
    }
    let h = Math.atan2(y, x) * 180 / Math.PI;
    return h < 0 ? h + 360 : h;
}

function applyHue(h) { root.style.setProperty('--h', Number(h).toFixed(1)); }

if (CONFIG.USE_COVER_COLOR) {
    const img = new Image();
    img.onload = () => {
        try {
            const h = dominantHue(img);
            if (h !== null) applyHue(h);
        } catch (e) {
            // файл відкрито через file:// → canvas «брудний». Залишаємо стандартний hue.
        }
    };
    img.src = CONFIG.COVER_SRC;
}

/* =========================================================
   Applying language + typewriter
   ========================================================= */
const bioText = $('#bioText');
let typingSession = 0;
let currentQuoteIndex = 0;

async function startTyping(sessionId) {
    while (true) {
        if (sessionId !== typingSession) return;
        const quotes = currentLangDict.quotes;
        if (!quotes || !quotes.length) { await sleep(500); continue; }

        const text = quotes[currentQuoteIndex % quotes.length];
        currentQuoteIndex++;

        for (let i = 0; i < text.length; i++) {
            if (sessionId !== typingSession) return;
            bioText.textContent += text[i];
            await sleep(80);
        }
        for (let i = 0; i < 40; i++) { if (sessionId !== typingSession) return; await sleep(50); }
        for (let i = bioText.textContent.length; i > 0; i--) {
            if (sessionId !== typingSession) return;
            bioText.textContent = bioText.textContent.slice(0, -1);
            await sleep(50);
        }
        for (let i = 0; i < 10; i++) { if (sessionId !== typingSession) return; await sleep(50); }
    }
}

const langSeg = $('#langSeg');
const langBtns = $$('button[data-lang]', langSeg);

function updateSeg() {
    const active = langBtns.find(b => b.dataset.lang === currentLang);
    if (!active) return;
    langSeg.style.setProperty('--x', active.offsetLeft + 'px');
    langSeg.style.setProperty('--w', active.offsetWidth + 'px');
    langBtns.forEach(b => b.setAttribute('aria-checked', String(b === active)));
}

function applyLanguage(lang) {
    const dict = translations[lang] || translations.en;
    currentLang = translations[lang] ? lang : 'en';
    currentLangDict = dict;
    root.lang = currentLang;

    $$('[data-i18n]').forEach(el => { if (dict[el.dataset.i18n]) el.textContent = dict[el.dataset.i18n]; });
    $$('[data-i18n-label]').forEach(el => {
        const v = dict[el.dataset.i18nLabel];
        if (v) { el.setAttribute('aria-label', v); el.title = v; }
    });

    try { localStorage.setItem('preferred_lang', currentLang); } catch (e) {}

    updateSeg();
    refreshThemeUi();
    if (typeof refreshPlayLabel === 'function') refreshPlayLabel();

    bioText.textContent = '';
    currentQuoteIndex = 0;
    typingSession++;
    startTyping(typingSession);
}

langBtns.forEach(btn => btn.addEventListener('click', () => applyLanguage(btn.dataset.lang)));
window.addEventListener('resize', updateSeg);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(updateSeg);

/* =========================================================
   Music player + wavy slider
   ========================================================= */
const audio = $('#audioPlayer');
const player = $('#player');
const playBtn = $('#playBtn');
const playIcon = $('#playIcon');
const coverBtn = $('#coverBtn');
const prevBtn = $('#prevBtn');
const nextBtn = $('#nextBtn');
const seekEl = $('#seek');
const waveSvg = $('#wavySvg');
const waveActive = $('#waveActive');
const waveInactive = $('#waveInactive');
const waveThumb = $('#waveThumb');
const currentTimeEl = $('#currentTime');
const totalDurationEl = $('#totalDuration');

function formatTime(seconds) {
    if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

let playing = false;
const hasDuration = () => isFinite(audio.duration) && audio.duration > 0;

function refreshPlayLabel() {
    const label = playing ? t('pause') : t('play');
    [playBtn, coverBtn].forEach(el => { el.title = label; el.setAttribute('aria-label', label); });
}

function setPlaying(on) {
    playing = on;
    player.classList.toggle('playing', on);
    playBtn.classList.toggle('playing', on);
    playIcon.textContent = on ? 'pause' : 'play_arrow';
    coverMorph.morphTo(on ? 'cookie' : 'squircle');
    refreshPlayLabel();
    kickWave();
}

function togglePlay() {
    if (audio.paused) {
        const p = audio.play();
        if (p && p.catch) p.catch(() => setPlaying(false));
    } else {
        audio.pause();
    }
}

playBtn.addEventListener('click', togglePlay);
coverBtn.addEventListener('click', togglePlay);
prevBtn.addEventListener('click', () => { audio.currentTime = Math.max(0, audio.currentTime - CONFIG.SEEK_STEP); syncProgress(true); });
nextBtn.addEventListener('click', () => { audio.currentTime = Math.min(hasDuration() ? audio.duration : audio.currentTime, audio.currentTime + CONFIG.SEEK_STEP); syncProgress(true); });

audio.addEventListener('play', () => setPlaying(true));
audio.addEventListener('pause', () => setPlaying(false));
audio.addEventListener('ended', () => { audio.currentTime = 0; setPlaying(false); syncProgress(true); });
audio.addEventListener('loadedmetadata', () => { totalDurationEl.textContent = formatTime(audio.duration); if (hasDuration()) seekEl.setAttribute('aria-valuemax', Math.round(audio.duration)); });
audio.addEventListener('durationchange', () => { totalDurationEl.textContent = formatTime(audio.duration); });
audio.addEventListener('timeupdate', () => syncProgress(false));

/* --- Хвиляста смужка (SVG) --- */
const WAVE = { H: 32, PAD: 5, STROKE: 5, WAVELENGTH: 26, AMP: REDUCED ? 0 : 3.2, GAP: 6, SPEED: 5.5 };
const wave = { raf: 0, last: 0, amp: 0, phase: 0, progress: 0, pressed: false, thumbW: 4, W: 0 };
let dragging = false;

function layoutWave() {
    wave.W = seekEl.clientWidth;
    waveSvg.setAttribute('viewBox', `0 0 ${wave.W} ${WAVE.H}`);
    drawWave();
}

function drawWave() {
    const { W } = wave;
    if (!W) return;
    const pad = WAVE.PAD;
    const cy = WAVE.H / 2;
    const x = pad + wave.progress * (W - 2 * pad);
    const half = wave.thumbW / 2;
    const activeEnd = x - half - WAVE.GAP;
    const inactiveStart = x + half + WAVE.GAP;

    // активна (хвиляста) частина
    let d = '';
    if (activeEnd > pad) {
        for (let px = pad; px < activeEnd; px += 2) {
            const ramp = Math.min(1, (px - pad) / 12);
            const y = cy + wave.amp * ramp * Math.sin((px / WAVE.WAVELENGTH) * TAU - wave.phase);
            d += (d ? 'L' : 'M') + px.toFixed(1) + ' ' + y.toFixed(2);
        }
        const yEnd = cy + wave.amp * Math.sin((activeEnd / WAVE.WAVELENGTH) * TAU - wave.phase);
        d += 'L' + activeEnd.toFixed(1) + ' ' + yEnd.toFixed(2);
    }
    waveActive.setAttribute('d', d);
    waveActive.style.opacity = d ? '1' : '0';

    // неактивна рівна частина
    if (inactiveStart < W - pad) {
        waveInactive.setAttribute('d', `M${inactiveStart.toFixed(1)} ${cy}L${(W - pad).toFixed(1)} ${cy}`);
        waveInactive.style.opacity = '1';
    } else {
        waveInactive.style.opacity = '0';
    }

    // «ручка» — вертикальна пілюля, при дотику звужується
    waveThumb.setAttribute('x', (x - half).toFixed(2));
    waveThumb.setAttribute('y', cy - 14);
    waveThumb.setAttribute('width', wave.thumbW.toFixed(2));
    waveThumb.setAttribute('height', 28);
    waveThumb.setAttribute('rx', (wave.thumbW / 2).toFixed(2));
}

function waveFrame(now) {
    const dt = Math.min(0.05, (now - wave.last) / 1000) || 0.016;
    wave.last = now;

    wave.amp += ((playing ? WAVE.AMP : 0) - wave.amp) * Math.min(1, dt * 9);
    if (playing) wave.phase += dt * WAVE.SPEED;
    const thumbTarget = wave.pressed ? 2 : 4;
    wave.thumbW += (thumbTarget - wave.thumbW) * Math.min(1, dt * 18);
    if (!dragging && hasDuration()) wave.progress = clamp(audio.currentTime / audio.duration, 0, 1);

    drawWave();

    const settled = !playing && wave.amp < 0.02 && Math.abs(wave.thumbW - thumbTarget) < 0.02;
    if (settled) {
        wave.amp = 0;
        wave.thumbW = thumbTarget;
        drawWave();
        wave.raf = 0;
        return;
    }
    wave.raf = requestAnimationFrame(waveFrame);
}

function kickWave() {
    if (wave.raf) return;
    wave.last = performance.now();
    wave.raf = requestAnimationFrame(waveFrame);
}

function syncProgress(force) {
    const dur = audio.duration;
    if (!dragging && hasDuration()) wave.progress = clamp(audio.currentTime / dur, 0, 1);
    currentTimeEl.textContent = formatTime(audio.currentTime);
    seekEl.setAttribute('aria-valuenow', Math.round(audio.currentTime));
    seekEl.setAttribute('aria-valuetext', `${formatTime(audio.currentTime)} / ${formatTime(dur)}`);
    if (force || !wave.raf) { drawWave(); }
}

function seekFromPointer(e) {
    const rect = seekEl.getBoundingClientRect();
    const p = clamp((e.clientX - rect.left - WAVE.PAD) / (rect.width - 2 * WAVE.PAD), 0, 1);
    wave.progress = p;
    if (hasDuration()) audio.currentTime = p * audio.duration;
    currentTimeEl.textContent = formatTime(audio.currentTime);
    seekEl.setAttribute('aria-valuenow', Math.round(audio.currentTime));
    kickWave();
    drawWave();
}

seekEl.addEventListener('pointerdown', e => {
    dragging = true;
    wave.pressed = true;
    seekEl.setPointerCapture(e.pointerId);
    seekFromPointer(e);
});
seekEl.addEventListener('pointermove', e => { if (dragging) seekFromPointer(e); });
const endDrag = e => {
    if (!dragging) return;
    dragging = false;
    wave.pressed = false;
    if (seekEl.hasPointerCapture(e.pointerId)) seekEl.releasePointerCapture(e.pointerId);
    kickWave();
};
seekEl.addEventListener('pointerup', endDrag);
seekEl.addEventListener('pointercancel', endDrag);

seekEl.addEventListener('keydown', e => {
    const dur = hasDuration() ? audio.duration : 0;
    let handled = true;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') audio.currentTime = Math.min(dur, audio.currentTime + 5);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') audio.currentTime = Math.max(0, audio.currentTime - 5);
    else if (e.key === 'Home') audio.currentTime = 0;
    else if (e.key === 'End') audio.currentTime = Math.max(0, dur - 0.1);
    else handled = false;
    if (handled) { e.preventDefault(); syncProgress(true); }
});

if (typeof ResizeObserver !== 'undefined') new ResizeObserver(layoutWave).observe(seekEl);
else window.addEventListener('resize', layoutWave);
layoutWave();

/* --- Media Session (керування з шторки / lock-screen) --- */
try {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: $('.track-title').textContent,
            artist: $('.track-author').textContent,
            artwork: [{ src: CONFIG.COVER_SRC, sizes: '500x500', type: 'image/png' }]
        });
        navigator.mediaSession.setActionHandler('play', () => audio.play());
        navigator.mediaSession.setActionHandler('pause', () => audio.pause());
        navigator.mediaSession.setActionHandler('seekbackward', () => { audio.currentTime = Math.max(0, audio.currentTime - CONFIG.SEEK_STEP); });
        navigator.mediaSession.setActionHandler('seekforward', () => { audio.currentTime = Math.min(hasDuration() ? audio.duration : audio.currentTime, audio.currentTime + CONFIG.SEEK_STEP); });
        navigator.mediaSession.setActionHandler('seekto', d => { if (d.seekTime != null) audio.currentTime = d.seekTime; });
    }
} catch (e) {}

/* =========================================================
   Ripple (state-layer ефект на кнопках)
   ========================================================= */
document.addEventListener('pointerdown', e => {
    const host = e.target.closest('.btn, .icon-btn, .play-btn, .seg button, .social');
    if (!host || REDUCED) return;
    const rect = host.getBoundingClientRect();
    const size = Math.hypot(Math.max(e.clientX - rect.left, rect.right - e.clientX), Math.max(e.clientY - rect.top, rect.bottom - e.clientY)) * 2;
    const r = document.createElement('span');
    r.className = 'ripple';
    r.style.width = r.style.height = size + 'px';
    r.style.left = (e.clientX - rect.left - size / 2) + 'px';
    r.style.top = (e.clientY - rect.top - size / 2) + 'px';
    host.appendChild(r);
    r.addEventListener('animationend', () => r.remove(), { once: true });
});

/* =========================================================
   Init: тема + мова
   ========================================================= */
refreshThemeUi();

let savedLang = null;
try { savedLang = localStorage.getItem('preferred_lang'); } catch (e) {}
const browserLang = (navigator.language || 'en').slice(0, 2).toLowerCase();
applyLanguage(savedLang && translations[savedLang] ? savedLang : (translations[browserLang] ? browserLang : 'en'));

/* =========================================================
   Physics (Matter.js) — тех-стек
   ========================================================= */
if (typeof Matter !== 'undefined') {
    const { Engine, Runner, Bodies, Composite, Mouse, MouseConstraint, Events, Body } = Matter;
    const container = $('#techStackContainer');
    const stackBlock = $('#stackBlock');
    const icons = $$('.tech-icon');

    let engine, runner, mouseConstraint;
    let iconBodies = [];
    let isPhysicsActive = false;

    const makeWalls = (cw, ch) => {
        const wt = 300;
        return [
            Bodies.rectangle(cw / 2, -wt / 2, cw + wt * 2, wt, { isStatic: true }),
            Bodies.rectangle(cw / 2, ch + wt / 2, cw + wt * 2, wt, { isStatic: true }),
            Bodies.rectangle(-wt / 2, ch / 2, wt, ch + wt * 2, { isStatic: true }),
            Bodies.rectangle(cw + wt / 2, ch / 2, wt, ch + wt * 2, { isStatic: true })
        ];
    };

    function initPhysics() {
        if (isPhysicsActive) return;
        isPhysicsActive = true;
        stackBlock.classList.add('stack-used');

        const cw = container.clientWidth;
        const ch = container.clientHeight;
        const containerRect = container.getBoundingClientRect();

        const initialPositions = icons.map(icon => {
            const rect = icon.getBoundingClientRect();
            return {
                x: rect.left - containerRect.left + rect.width / 2,
                y: rect.top - containerRect.top + rect.height / 2,
                w: rect.width,
                h: rect.height
            };
        });

        container.classList.add('active');

        engine = Engine.create();
        engine.world.gravity.y = 0.8;
        engine.world.gravity.x = 0;

        Composite.add(engine.world, makeWalls(cw, ch));

        icons.forEach((icon, index) => {
            const pos = initialPositions[index];
            const body = Bodies.rectangle(pos.x, pos.y, pos.w, pos.h, {
                chamfer: { radius: Math.min(pos.w, pos.h) * 0.3 }, // скруглені «плитки»
                restitution: 0.6,
                friction: 0.1,
                frictionAir: 0.02,
                density: 0.001
            });
            iconBodies.push({ el: icon, body, w: pos.w, h: pos.h });
            Composite.add(engine.world, body);
        });

        const mouse = Mouse.create(container);
        if (mouse.element.removeEventListener) {
            mouse.element.removeEventListener('wheel', mouse.mousewheel);
            mouse.element.removeEventListener('DOMMouseScroll', mouse.mousewheel);
        }

        mouseConstraint = MouseConstraint.create(engine, {
            mouse,
            constraint: { stiffness: 0.2, angularStiffness: 0.1, render: { visible: false } }
        });
        Composite.add(engine.world, mouseConstraint);

        Events.on(engine, 'beforeUpdate', () => {
            const cW = container.clientWidth;
            const cH = container.clientHeight;
            const m = mouseConstraint.mouse;

            m.position.x = clamp(m.position.x, 0, cW);
            m.position.y = clamp(m.position.y, 0, cH);

            if (mouseConstraint.body) {
                const b = mouseConstraint.body;
                const bounds = b.bounds;
                let adjustX = 0, adjustY = 0;
                if (bounds.min.x < 0) adjustX = -bounds.min.x;
                else if (bounds.max.x > cW) adjustX = cW - bounds.max.x;
                if (bounds.min.y < 0) adjustY = -bounds.min.y;
                else if (bounds.max.y > cH) adjustY = cH - bounds.max.y;
                if (adjustX !== 0 || adjustY !== 0) {
                    Body.setPosition(b, { x: b.position.x + adjustX, y: b.position.y + adjustY });
                }
            }

            iconBodies.forEach(({ body, w, h }) => {
                const hw = w / 2, hh = h / 2;
                let nx = body.position.x, ny = body.position.y, changed = false;
                if (nx - hw < 0) { nx = hw; changed = true; } else if (nx + hw > cW) { nx = cW - hw; changed = true; }
                if (ny - hh < 0) { ny = hh; changed = true; } else if (ny + hh > cH) { ny = cH - hh; changed = true; }
                if (changed) {
                    Body.setPosition(body, { x: nx, y: ny });
                    Body.setVelocity(body, { x: 0, y: 0 });
                }
            });
        });

        runner = Runner.create();
        Runner.run(runner, engine);

        (function syncDOM() {
            iconBodies.forEach(({ el, body }) => {
                el.style.transform = `translate(${body.position.x}px, ${body.position.y}px) translate(-50%, -50%) rotate(${body.angle}rad)`;
            });
            requestAnimationFrame(syncDOM);
        })();
    }

    container.addEventListener('pointerdown', initPhysics, { once: true });

    window.addEventListener('resize', () => {
        if (!isPhysicsActive || !engine) return;
        const cw = container.clientWidth;
        const ch = container.clientHeight;

        Composite.allBodies(engine.world).filter(b => b.isStatic).forEach(w => Composite.remove(engine.world, w));
        Composite.add(engine.world, makeWalls(cw, ch));

        iconBodies.forEach(({ body, w, h }) => {
            const hw = w / 2, hh = h / 2;
            let nx = body.position.x, ny = body.position.y, changed = false;
            if (nx - hw < 0) { nx = hw; changed = true; } else if (nx + hw > cw) { nx = cw - hw; changed = true; }
            if (ny - hh < 0) { ny = hh; changed = true; } else if (ny + hh > ch) { ny = ch - hh; changed = true; }
            if (changed) {
                Body.setPosition(body, { x: nx, y: ny });
                Body.setVelocity(body, { x: 0, y: 0 });
            }
        });
    });
}
