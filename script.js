// Preferences are optional: the portfolio also works when storage is disabled.
const preferences = {
  get(key) { try { return localStorage.getItem(key); } catch (_) { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch (_) { /* Session-only preference. */ } }
};

const i18n = {
  currentLanguage: 'en',
  translations: {},
  request: 0,
  get(key, fallback = '') {
    const find = language => key.split('.').reduce((value, part) => value?.[part], this.translations[language]);
    return find(this.currentLanguage) ?? find('en') ?? fallback;
  },
  async load(language) {
    if (this.translations[language]) return true;
    try {
      const response = await fetch(`lang/${language}.json`);
      if (!response.ok) return false;
      this.translations[language] = await response.json();
      return true;
    } catch (_) { return false; }
  },
  async translatePage(language, { updateUrl = false } = {}) {
    if (!['en', 'de'].includes(language)) language = 'en';
    const request = ++this.request;
    const loaded = await this.load(language);
    if (request !== this.request) return;
    this.currentLanguage = loaded ? language : 'en';
    document.documentElement.lang = this.currentLanguage;
    preferences.set('preferredLanguage', this.currentLanguage);

    document.querySelectorAll('[data-i18n]').forEach(element => {
      const match = element.dataset.i18n.match(/^(?:\[([^\]]+)\])?(.+)$/);
      if (!match) return;
      const value = this.get(match[2]);
      if (typeof value !== 'string' || !value) return;
      if (match[1]) element.setAttribute(match[1], value);
      else element.textContent = value;
    });
    document.querySelectorAll('.lang-btn').forEach(button => {
      const active = button.dataset.lang === this.currentLanguage;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    // Carry the language across pages even when browser storage is unavailable.
    document.querySelectorAll('a[href]').forEach(link => {
      if (link.getAttribute('href').startsWith('#')) return;
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin) return;
      if (!/(?:index|about|experience)\.html$/.test(url.pathname) && !link.hasAttribute('data-project-open')) return;
      url.searchParams.set('lang', this.currentLanguage);
      link.href = url.pathname + url.search + url.hash;
    });
    if (updateUrl) {
      const url = new URL(location.href);
      url.searchParams.set('lang', this.currentLanguage);
      history.replaceState(history.state, '', url);
    }
    window.dispatchEvent(new CustomEvent('languagechange'));
  },
  async init() {
    await this.load('en');
    const language = new URL(location.href).searchParams.get('lang') ||
      preferences.get('preferredLanguage') || navigator.language.split('-')[0];
    await this.translatePage(language);
    document.querySelectorAll('.lang-btn').forEach(button => {
      button.addEventListener('click', () => this.translatePage(button.dataset.lang, { updateUrl: true }));
    });
    window.addEventListener('popstate', () => {
      const language = new URL(location.href).searchParams.get('lang');
      if (['en', 'de'].includes(language) && language !== this.currentLanguage) this.translatePage(language);
    });
  }
};

function initTheme() {
  const toggle = document.querySelector('.theme-toggle');
  const update = theme => {
    document.documentElement.dataset.theme = theme;
    toggle?.setAttribute('aria-pressed', String(theme === 'dark'));
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#18201b' : '#f7f8f4');
  };
  update(document.documentElement.dataset.theme || 'light');
  toggle?.addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    preferences.set('theme', theme);
    update(theme);
  });
  window.addEventListener('storage', event => {
    if (event.key === 'theme' && ['dark', 'light'].includes(event.newValue)) update(event.newValue);
  });
}

function initDisclosures() {
  const revealHash = () => {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch (_) { return; }
    const target = document.getElementById(id);
    const disclosure = target?.closest('details');
    if (disclosure) {
      disclosure.open = true;
      target.scrollIntoView({ block: 'start' });
    }
  };
  window.addEventListener('hashchange', revealHash);
  revealHash();
}

function initJobDurations() {
  const update = () => {
    const parts = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Bucharest', year: 'numeric', month: 'numeric' }).formatToParts(new Date());
    const currentYear = Number(parts.find(part => part.type === 'year').value);
    const currentMonth = Number(parts.find(part => part.type === 'month').value);
    document.querySelectorAll('.job-duration').forEach(element => {
      let months = Number(element.dataset.jobMonths);
      if (!months) {
        const [startYear, startMonth] = element.dataset.jobStart.split('-').map(Number);
        const [endYear, endMonth] = element.dataset.jobEnd ? element.dataset.jobEnd.split('-').map(Number) : [currentYear, currentMonth];
        // The CV gives month ranges. Count calendar months inclusively to round up.
        months = Math.max(1, (endYear - startYear) * 12 + endMonth - startMonth + 1);
      }
      const years = Math.floor(months / 12);
      const remainder = months % 12;
      const format = (count, unit) => new Intl.NumberFormat(i18n.currentLanguage, { style: 'unit', unit, unitDisplay: 'long' }).format(count);
      element.textContent = [years ? format(years, 'year') : '', remainder ? format(remainder, 'month') : ''].filter(Boolean).join(' ');
    });
  };
  window.addEventListener('languagechange', update);
  update();
}

function initProjects() {
  const dialog = document.getElementById('project-dialog');
  if (!dialog) return;
  const cards = [...document.querySelectorAll('[data-project]')];
  const title = document.getElementById('dialog-title');
  const tech = document.getElementById('dialog-tech');
  const flightProfile = document.getElementById('dialog-flight-profile');
  const description = document.getElementById('dialog-description');
  const extendedDescription = document.getElementById('dialog-details');
  const technicalNotes = document.getElementById('dialog-notes');
  const media = document.getElementById('dialog-media');
  const progress = document.getElementById('dialog-progress');
  const links = document.getElementById('dialog-links');
  let currentCard = null;
  let returnFocus = null;
  const demos = {
    project7: { src: 'source/robocar_demo.mp4', poster: 'source/robocar-preview.jpg' },
    project8: { src: 'source/fpv_video2.mp4', poster: 'source/drone-preview.jpg' },
    project1: { src: 'source/LaneAnalysis.mp4', poster: 'source/lane_localication_preview.png' }
  };

  const fill = card => {
    const id = card.dataset.project;
    title.textContent = card.querySelector('h2').textContent;
    tech.textContent = card.querySelector('.project-tech').textContent;
    const profile = card.querySelector('.project-flight-profile');
    flightProfile.replaceChildren(...(profile ? [profile.cloneNode(true)] : []));
    flightProfile.hidden = !profile;
    description.textContent = card.querySelector('.project-description').textContent;
    extendedDescription.textContent = i18n.get(`projects.${id}.details`);
    extendedDescription.hidden = !extendedDescription.textContent;
    const roadmap = card.querySelector('.project-progress');
    progress.replaceChildren(...(roadmap ? [roadmap.cloneNode(true)] : []));
    progress.hidden = !roadmap;
    // Keep alternate demos, but omit the exact video already embedded here.
    const embeddedVideo = demos[id]?.src;
    const resources = [...card.querySelectorAll('.project-resources a')].filter(link =>
      !embeddedVideo || link.href !== new URL(embeddedVideo, location.href).href
    );
    links.replaceChildren(...resources.map(link => link.cloneNode(true)));
  };
  const fillMedia = card => {
    media.replaceChildren();
    const demo = demos[card.dataset.project];
    if (demo) {
      const video = document.createElement('video');
      video.controls = true;
      video.playsInline = true;
      video.preload = 'none';
      video.src = demo.src;
      if (demo.poster) video.poster = demo.poster;
      video.setAttribute('aria-label', card.querySelector('h2').textContent);
      media.append(video);
    } else {
      const preview = card.querySelector('.project-media img');
      if (preview) {
        const image = preview.cloneNode();
        image.alt = card.querySelector('h2').textContent;
        image.loading = 'eager';
        media.append(image);
      }
    }
  };
  const hide = () => {
    if (!dialog.open) return;
    dialog.close();
    media.querySelector('video')?.pause();
    media.replaceChildren();
    currentCard = null;
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  };
  const open = (card, { updateUrl = true, trigger = null } = {}) => {
    returnFocus = trigger || card.querySelector('[data-project-open]');
    currentCard = card;
    technicalNotes.open = false;
    fill(card);
    fillMedia(card);
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    if (updateUrl) {
      const url = new URL(location.href);
      url.searchParams.set('project', card.dataset.project);
      history.pushState({ portfolioProject: card.dataset.project }, '', url);
    }
  };
  const close = () => {
    hide();
    const url = new URL(location.href);
    if (!url.searchParams.has('project')) return;
    if (history.state?.portfolioProject) history.back();
    else {
      url.searchParams.delete('project');
      history.replaceState(history.state, '', url);
    }
  };
  const syncFromUrl = () => {
    const id = new URL(location.href).searchParams.get('project');
    const card = cards.find(item => item.dataset.project === id);
    if (card) open(card, { updateUrl: false });
    else hide();
  };
  document.querySelectorAll('[data-project-open]').forEach(trigger => {
    trigger.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const card = cards.find(item => item.dataset.project === trigger.dataset.projectOpen);
      if (!card) return;
      event.preventDefault();
      open(card, { trigger });
    });
  });
  dialog.querySelector('.dialog-close').addEventListener('click', close);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('click', event => {
    // A native dialog backdrop targets the dialog, while its padding belongs to .dialog-inner.
    if (event.target === dialog) {
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
    }
  });
  window.addEventListener('popstate', syncFromUrl);
  window.addEventListener('languagechange', () => {
    if (currentCard) {
      fill(currentCard);
      media.querySelector('video')?.setAttribute('aria-label', title.textContent);
    }
  });
  syncFromUrl();
}

async function initApp() {
  initTheme();
  await i18n.init();
  initDisclosures();
  initJobDurations();
  initProjects();
}

window.appReady = initApp();
