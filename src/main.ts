type Theme = 'system' | 'light' | 'dark';

const themeSelect = document.querySelector<HTMLSelectElement>('#theme');
const colorPreference = window.matchMedia('(prefers-color-scheme: dark)');
let currentTheme: Theme = 'system';
try {
  const stored = localStorage.getItem('portfolio-theme');
  if (stored === 'light' || stored === 'dark') currentTheme = stored;
} catch {
  // Storage can be unavailable without preventing the rest of the site.
}
function applyTheme(): void {
  document.documentElement.dataset.theme =
    currentTheme === 'system' ? (colorPreference.matches ? 'dark' : 'light') : currentTheme;
}
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

// Move the original article: no duplicated content or IDs, and native details remain a fallback.
function restoreArticle(): void {
  if (activeArticle && activeSource) activeSource.append(activeArticle);
  activeArticle = undefined;
  activeSource = undefined;
}
function syncCaseWithUrl(): void {
  if (!dialog || !content || !title) return;
  const source = sources.get(window.location.hash.slice(1));
  if (!source) {
    if (dialog.open) dialog.close();
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
function isOutsideDialog(event: MouseEvent): boolean {
  if (!dialog) return false;
  const rect = dialog.getBoundingClientRect();
  return (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  );
}
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
    closeCase();
  });
  dialog.addEventListener('keydown', (event) => {
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
    startedOnBackdrop = event.target === dialog && isOutsideDialog(event);
  });
  dialog.addEventListener('click', (event) => {
    if (startedOnBackdrop && event.target === dialog && isOutsideDialog(event)) closeCase();
    startedOnBackdrop = false;
  });
  dialog.addEventListener('close', () => {
    restoreArticle();
    document.body.classList.remove('modal-open');
    document.title = originalTitle;
    window.scrollTo({ top: pageScroll, behavior: 'instant' });
    returnFocus?.focus({ preventScroll: true });
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
