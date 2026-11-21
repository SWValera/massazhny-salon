const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('#navigation');
function closeMenu() { nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', 'Открыть меню'); }
menu.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  nav.classList.toggle('open', open);
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
});
document.addEventListener('click', e => { if (!e.target.closest('.site-header')) closeMenu(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
window.matchMedia('(min-width: 901px)').addEventListener('change', closeMenu);

const dialog = document.querySelector('#booking');
const service = document.querySelector('#booking-service');
const send = document.querySelector('#booking-send');
function updateBooking() {
  const message = `Здравствуйте! Хочу записаться на ${service.value}. Подскажите, пожалуйста, стоимость и свободное время.`;
  send.href = `https://wa.me/${document.body.dataset.sitePhone}?text=${encodeURIComponent(message)}`;
}
document.querySelectorAll('[data-book]').forEach(link => link.addEventListener('click', e => {
  if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || typeof dialog.showModal !== 'function') return;
  e.preventDefault();
  closeMenu();
  service.value = link.dataset.book || 'массаж или шугаринг';
  updateBooking();
  dialog.showModal();
  document.body.classList.add('dialog-open');
}));
service.addEventListener('change', updateBooking);
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => document.body.classList.remove('dialog-open'));
dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });

const choices = {
  relax: ['Классический массаж', 'Спокойная пауза и внимание к телу. Общий сеанс или выбранная зона — обсудите комфортный формат.', '/massazh/klassicheskiy/'],
  active: ['Спортивный массаж', 'Внимание мышцам после активных дней. Расскажите мастеру о нагрузке и зонах, которым хочется уделить время.', '/massazh/sportivnyy/'],
  zone: ['Массаж по зонам', 'Спина, шейно-воротниковая зона, ноги или стопы. Начните с той области, которой хочется уделить внимание.', '/massazh/po-zonam/'],
  care: ['Шугаринг', 'Удаление нежелательных волос сахарной пастой. Выбранную зону, подготовку и точную стоимость уточните у мастера.', '/shugaring/']
};
document.querySelectorAll('[data-choice]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-choice]').forEach(b => { b.classList.toggle('selected', b === button); b.setAttribute('aria-pressed', String(b === button)); });
  const [title, description, url] = choices[button.dataset.choice];
  document.querySelector('#choice-title').textContent = title;
  document.querySelector('#choice-description').textContent = description;
  document.querySelector('#choice-link').href = url;
}));
// Native details keeps route selection usable even without JavaScript.
const routePickers = document.querySelectorAll('.route-picker');
document.addEventListener('click', event => {
  routePickers.forEach(picker => {
    if (!picker.contains(event.target)) picker.open = false;
  });
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  routePickers.forEach(picker => {
    if (!picker.open) return;
    const focused = picker.contains(document.activeElement);
    picker.open = false;
    if (focused) picker.querySelector('summary').focus();
  });
});

// Return to the previous site page; direct visits retain a useful parent link.
document.querySelectorAll('[data-back]').forEach(link => link.addEventListener('click', event => {
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  if (!document.referrer || history.length < 2) return;
  const previous = new URL(document.referrer);
  if (previous.origin !== location.origin || previous.pathname === location.pathname) return;
  event.preventDefault();
  history.back();
}));
