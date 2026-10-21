type Theme = 'system' | 'light' | 'dark';

const themeSelect = document.querySelector<HTMLSelectElement>('#theme');
const themeButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.theme-segment-btn'));
const colorPreference = window.matchMedia('(prefers-color-scheme: dark)');
let currentTheme: Theme = 'system';

try {
  const stored = localStorage.getItem('portfolio-theme');
  if (stored === 'light' || stored === 'dark') currentTheme = stored;
} catch {
  // Storage can be unavailable without preventing the rest of the site.
}

function updateThemeUI(): void {
  themeButtons.forEach((btn) => {
    const isActive = btn.dataset.themeVal === currentTheme;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
  });
  if (themeSelect && themeSelect.value !== currentTheme) {
    themeSelect.value = currentTheme;
  }
}

function applyTheme(): void {
  document.documentElement.dataset.theme =
    currentTheme === 'system' ? (colorPreference.matches ? 'dark' : 'light') : currentTheme;
  updateThemeUI();
}

themeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const val = btn.dataset.themeVal as Theme;
    if (val && ['system', 'light', 'dark'].includes(val)) {
      currentTheme = val;
      applyTheme();
      try {
        localStorage.setItem('portfolio-theme', currentTheme);
      } catch {
        /* Session-only choice. */
      }
    }
  });
});

if (themeSelect) {
  themeSelect.value = currentTheme;
  themeSelect.addEventListener('change', () => {
    currentTheme = themeSelect.value as Theme;
    applyTheme();
    try {
      localStorage.setItem('portfolio-theme', currentTheme);
    } catch {
      /* Session-only choice. */
    }
  });
}
colorPreference.addEventListener('change', applyTheme);
applyTheme();

// Dialog & Cases Management
const dialog = document.querySelector<HTMLDialogElement>('#case-dialog');
const content = document.querySelector<HTMLDivElement>('#dialog-content');
const title = document.querySelector<HTMLElement>('#dialog-title');
const sources = new Map(
  Array.from(document.querySelectorAll<HTMLDetailsElement>('.case-detail')).map((detail) => [
    detail.id,
    detail,
  ]),
);
const originalTitle = document.title;
let activeSource: HTMLDetailsElement | undefined;
let activeArticle: HTMLElement | undefined;
let returnFocus: HTMLElement | undefined;
let openedFromCard = false;
let preCaseHash = '';
let pageScroll = 0;

function restoreArticle(): void {
  if (activeArticle && activeSource) activeSource.append(activeArticle);
  activeArticle = undefined;
  activeSource = undefined;
}

function syncCaseWithUrl(): void {
  if (!dialog || !content || !title) return;
  const source = sources.get(window.location.hash.slice(1));
  if (!source) {
    if (dialog.open) {
      dialog.close();
      restoreArticle();
      document.body.classList.remove('modal-open');
      document.title = originalTitle;
      window.scrollTo({ top: pageScroll, behavior: 'instant' });
      returnFocus?.focus({ preventScroll: true });
    }
    return;
  }
  if (activeSource === source && dialog.open) return;
  restoreArticle();
  const article = source.querySelector<HTMLElement>('.case-body');
  if (!article) return;
  activeSource = source;
  activeArticle = article;
  content.replaceChildren(article);
  title.textContent = article.dataset.title || 'Кейс';
  document.title = title.textContent + ' — Вадим Баранов';
  if (!dialog.open) {
    pageScroll = window.scrollY;
    if (!returnFocus)
      returnFocus =
        document.querySelector<HTMLElement>('[href="#' + source.id + '"][data-case]') || undefined;
    document.body.classList.add('modal-open');
    dialog.showModal();
    dialog.querySelector<HTMLButtonElement>('.dialog-close')?.focus({ preventScroll: true });
  }
  dialog.scrollTop = 0;
  initMarkdownDemo();
}

function closeCase(): void {
  if (!dialog?.open) return;
  if (openedFromCard) {
    openedFromCard = false;
    history.back();
  } else {
    history.replaceState(null, '', location.pathname + location.search + preCaseHash);
    syncCaseWithUrl();
  }
}

function isOutsideDialog(event: MouseEvent, targetDialog: HTMLDialogElement): boolean {
  const rect = targetDialog.getBoundingClientRect();
  return (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  );
}

// Lightbox setup
const lightboxDialog = document.querySelector<HTMLDialogElement>('#lightbox-dialog');
const lightboxImg = document.querySelector<HTMLImageElement>('#lightbox-img');
const lightboxCaption = document.querySelector<HTMLElement>('#lightbox-caption');
const lightboxClose = document.querySelector<HTMLButtonElement>('.lightbox-close');

function openLightbox(src: string, alt: string, captionText: string): void {
  if (!lightboxDialog || !lightboxImg) return;
  lightboxImg.src = src;
  lightboxImg.alt = alt;
  if (lightboxCaption) lightboxCaption.textContent = captionText;
  lightboxDialog.showModal();
}

function closeLightbox(): void {
  if (lightboxDialog?.open) {
    lightboxDialog.close();
  }
}

lightboxClose?.addEventListener('click', closeLightbox);
lightboxDialog?.addEventListener('click', (event) => {
  if (lightboxDialog && isOutsideDialog(event, lightboxDialog)) {
    closeLightbox();
  }
});
lightboxDialog?.addEventListener('cancel', (e) => {
  e.preventDefault();
  closeLightbox();
});

// Intercept image clicks for lightbox
document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const link = target?.closest<HTMLAnchorElement>('.case-image a, figure.case-image a');
  if (link && lightboxDialog) {
    event.preventDefault();
    const img = link.querySelector('img');
    const figcaption = link.closest('figure')?.querySelector('figcaption');
    openLightbox(link.href, img?.alt || '', figcaption?.textContent || '');
  }
});

if (dialog && content && title && typeof dialog.showModal === 'function') {
  document.documentElement.classList.add('enhanced');
  document.querySelectorAll<HTMLAnchorElement>('[data-case]').forEach((link) => {
    link.setAttribute('aria-haspopup', 'dialog');
    link.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)
        return;
      event.preventDefault();
      returnFocus = link;
      preCaseHash = location.hash.startsWith('#case-') ? '' : location.hash;
      openedFromCard = true;
      history.pushState({ portfolioCase: true }, '', link.hash);
      syncCaseWithUrl();
    });
  });
  dialog
    .querySelectorAll<HTMLButtonElement>('.dialog-close')
    .forEach((button) => button.addEventListener('click', closeCase));
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    if (lightboxDialog?.open) {
      closeLightbox();
      return;
    }
    closeCase();
  });
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (lightboxDialog?.open) {
        event.stopPropagation();
        closeLightbox();
        return;
      }
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex="0"]'),
    ).filter((element) => element.getClientRects().length > 0);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  });
  let startedOnBackdrop = false;
  dialog.addEventListener('pointerdown', (event) => {
    startedOnBackdrop = event.target === dialog && isOutsideDialog(event, dialog);
  });
  dialog.addEventListener('click', (event) => {
    if (startedOnBackdrop && event.target === dialog && isOutsideDialog(event, dialog)) closeCase();
    startedOnBackdrop = false;
  });
  window.addEventListener('popstate', syncCaseWithUrl);
  window.addEventListener('hashchange', syncCaseWithUrl);
  syncCaseWithUrl();
} else {
  function expandLinkedCase(): void {
    const source = sources.get(location.hash.slice(1));
    if (source) source.open = true;
  }
  window.addEventListener('hashchange', expandLinkedCase);
  expandLinkedCase();
}

// Markdown Pipeline Animated Demo
let markdownTimer: number | undefined;
function initMarkdownDemo(): void {
  const demo = document.querySelector<HTMLElement>('#markdown-demo');
  if (!demo) return;
  const stepButtons = Array.from(demo.querySelectorAll<HTMLButtonElement>('.demo-step-btn'));
  const stageFrames = Array.from(demo.querySelectorAll<HTMLElement>('.stage-frame'));
  if (stepButtons.length === 0 || stageFrames.length === 0) return;

  let currentStep = 0;
  function setStep(step: number): void {
    currentStep = step;
    stepButtons.forEach((btn, idx) => {
      const active = idx === step;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    stageFrames.forEach((frame, idx) => {
      frame.classList.toggle('active', idx === step);
    });
  }

  function nextStep(): void {
    setStep((currentStep + 1) % stepButtons.length);
  }

  stepButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const step = parseInt(btn.dataset.step || '0', 10);
      setStep(step);
      if (markdownTimer) clearInterval(markdownTimer);
      markdownTimer = window.setInterval(nextStep, 3600);
    });
  });

  if (markdownTimer) clearInterval(markdownTimer);
  markdownTimer = window.setInterval(nextStep, 3600);
}
initMarkdownDemo();
