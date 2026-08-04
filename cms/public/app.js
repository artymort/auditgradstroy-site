const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const RICH_INLINE_PREFIX = '@@CMS_RICH_INLINE@@';
const RICH_BLOCK_PREFIX = '@@CMS_RICH_BLOCK@@';
const richSelectionRanges = new WeakMap();

document.addEventListener('selectionchange', () => {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return;
  const range = selection.getRangeAt(0);
  const common = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
    ? range.commonAncestorContainer
    : range.commonAncestorContainer.parentElement;
  const surface = common?.closest?.('.rich-editor__surface');
  if (surface) richSelectionRanges.set(surface, range.cloneRange());
});

const PAGE_META = {
  home: { title: 'Главная страница', description: 'Первый экран, преимущества, риски, этапы проверки и призывы к действию.' },
  services: { title: 'Услуги', description: 'Описание услуг, тарифов, этапов работы и итоговой формы.' },
  expert: { title: 'Страница эксперта', description: 'Биография, фотография, показатели, компетенции и принципы работы.' },
  contacts: { title: 'Контакты', description: 'Заголовки страницы, режим работы и форма обратной связи.' },
  site: { title: 'Общие данные', description: 'Название, логотип, телефон, почта, меню, футер и тексты форм.' },
  blog: { title: 'Оформление блога', description: 'Заголовки и описания общей страницы блога.' },
  cases: { title: 'Оформление кейсов', description: 'Заголовки и описания общей страницы кейсов.' },
  legal: { title: 'Документы', description: 'Загрузка PDF с политикой конфиденциальности и согласием на обработку персональных данных.' },
};

const LABELS = {
  seo: 'Поисковая оптимизация',
  title: 'Заголовок',
  description: 'Описание',
  keywords: 'Ключевые слова',
  og_title: 'Заголовок для социальных сетей',
  og_description: 'Описание для социальных сетей',
  hero: 'Первый экран',
  label: 'Метка над заголовком',
  intro: 'Вводный текст',
  text: 'Текст',
  image: 'Изображение',
  image_alt: 'Описание изображения',
  name: 'Название',
  role: 'Должность',
  paragraphs: 'Абзацы',
  facts: 'Показатели',
  value: 'Значение',
  competencies: 'Компетенции',
  advantages: 'Преимущества',
  items: 'Элементы',
  number: 'Номер',
  cta: 'Финальный призыв',
  form_title: 'Заголовок формы',
  primary_action: 'Главная кнопка',
  secondary_action: 'Дополнительная кнопка',
  promise: 'Короткое обещание',
  location: 'Местоположение',
  lead: 'Основной текст',
  object_label: 'Подпись объекта',
  coordinates: 'Координаты',
  scan_status: 'Статус проверки',
  scan_title: 'Заголовок карточки проверки',
  scan_tags: 'Проверяемые параметры',
  metrics: 'Показатели первого экрана',
  form_label: 'Подпись формы',
  link: 'Текст ссылки',
  first: 'Карточка 1 — Строительство',
  second: 'Карточка 2 — Ограничения',
  third: 'Карточка 3 — Разрешённое использование',
  fourth: 'Карточка 4 — Территория',
  note: 'Предупреждение под карточками',
  action: 'Текст кнопки',
  steps: 'Этапы работы',
  cards: 'Карточки',
  style: 'Цветовое оформление',
  price: 'Стоимость',
  subtitle: 'Подзаголовок',
  benefits: 'Преимущества',
  brand: 'Бренд',
  logo: 'Логотип',
  header: 'Шапка сайта',
  menu: 'Пункты меню',
  url: 'Ссылка',
  contacts: 'Контактные данные',
  phone_display: 'Телефон на сайте',
  phone_link: 'Телефон для звонка',
  email: 'Электронная почта',
  region: 'Регион работы',
  forms: 'Формы заявок',
  cadastral_label: 'Поле кадастрового номера',
  phone_label: 'Поле телефона',
  submit: 'Текст кнопки',
  consent: 'Согласие на обработку данных',
  footer: 'Подвал сайта',
  copyright: 'Авторские права',
  requisites: 'Реквизиты',
  navigation_title: 'Заголовок навигации',
  services_title: 'Заголовок услуг',
  contacts_title: 'Заголовок контактов',
  services: 'Услуги',
  schedule: 'Режим работы',
  weekdays: 'Рабочие дни',
  weekdays_time: 'Время в рабочие дни',
  weekends: 'Выходные дни',
  weekends_time: 'Время в выходные',
  form: 'Форма обратной связи',
  name_label: 'Поле имени',
  message_label: 'Поле сообщения',
  articles: 'Материалы',
  popular: 'Популярные материалы',
  cases: 'Кейсы',
  featured: 'Избранные материалы',
  empty_title: 'Заголовок пустого раздела',
  empty_text: 'Текст пустого раздела',
  category: 'Категория',
  service: 'Услуга',
  result: 'Результат',
  excerpt_text: 'Краткое описание',
  seo_title: 'SEO-заголовок',
  seo_description: 'SEO-описание',
  featured: 'Показывать в избранном',
  published: 'Статус публикации',
  body: 'Текст материала',
  file: 'Документ PDF',
  consent: 'Согласие на обработку персональных данных',
  privacy: 'Политика конфиденциальности',
};

const PAGE_SECTIONS = {
  home: {
    seo: ['Поисковое отображение', 'Название и описание главной страницы для поисковых систем и социальных сетей.'],
    hero: ['01. Первый экран', 'Главный заголовок, поясняющий текст, кнопки, изображение и показатели в самом начале страницы.'],
    manifesto: ['02. Введение о рисках', 'Заголовок и короткий текст перед блоком с возможными проблемами участка.'],
    risks: ['03. Риски покупки участка', 'Карточки с ограничениями, фотографиями и предупреждением для покупателя.'],
    method: ['04. Как проходит проверка', 'Заголовок, пояснение и последовательность этапов работы.'],
    services: ['05. Услуги на главной', 'Карточки форматов работы, цены, описания и изображения.'],
    expert: ['06. Об эксперте', 'Фотография, имя, описание опыта и основные показатели.'],
    proof: ['07. Факты и доверие', 'Аргументы, подтверждающие опыт, независимость и безопасность работы.'],
    cta: ['08. Финальная форма', 'Последний призыв к действию и преимущества обращения.'],
  },
  services: {
    seo: ['Поисковое отображение', 'Название и описание страницы для поисковых систем.'],
    hero: ['01. Первый экран', 'Главный заголовок и вводное описание страницы услуг.'],
    cards_section: ['02. Карточки услуг', 'Названия и пояснения для списка доступных форматов работы.'],
    process: ['03. Порядок работы', 'Этапы взаимодействия с клиентом.'],
    express: ['04. Экспресс-аудит', 'Описание, состав и результат экспресс-проверки.'],
    full: ['05. Полная экспертиза', 'Описание полной градостроительной экспертизы.'],
    urban: ['06. Сопровождение проекта', 'Описание стратегического сопровождения.'],
    expert: ['07. Эксперт', 'Короткий блок об эксперте на странице услуг.'],
    cta: ['08. Финальная форма', 'Призыв оставить заявку после просмотра услуг.'],
  },
  blog: {
    seo: ['Поисковое отображение', 'Название и описание раздела для поисковых систем.'],
    hero: ['01. Первый экран', 'Заголовок и вводный текст страницы блога.'],
    articles: ['02. Список статей', 'Заголовки над основной лентой материалов.'],
    popular: ['03. Популярные статьи', 'Оформление блока с отмеченными материалами.'],
    cta: ['04. Финальная форма', 'Призыв обратиться к эксперту после чтения.'],
  },
  cases: {
    seo: ['Поисковое отображение', 'Название и описание раздела для поисковых систем.'],
    hero: ['01. Первый экран', 'Заголовок и вводный текст страницы кейсов.'],
    cases: ['02. Список кейсов', 'Оформление основной ленты выполненных проектов.'],
    featured: ['03. Избранные кейсы', 'Оформление блока с отмеченными проектами.'],
    cta: ['04. Финальная форма', 'Призыв обратиться к эксперту после просмотра кейсов.'],
  },
  expert: {
    seo: ['Поисковое отображение', 'Название и описание страницы для поисковых систем.'],
    hero: ['01. Первый экран', 'Фотография, имя, биография и главный заголовок страницы.'],
    facts: ['02. Основные показатели', 'Цифры и факты, подтверждающие опыт.'],
    competencies: ['03. Компетенции', 'Основные направления профессиональной работы.'],
    advantages: ['04. Принципы работы', 'Причины и преимущества обращения к эксперту.'],
    cta: ['05. Финальная форма', 'Призыв связаться с экспертом.'],
  },
  contacts: {
    seo: ['Поисковое отображение', 'Название и описание страницы для поисковых систем.'],
    hero: ['01. Первый экран и контакты', 'Заголовок страницы, телефон, почта и поясняющий текст.'],
    schedule: ['02. Режим работы', 'Рабочие дни и часы для связи.'],
    form: ['03. Форма обращения', 'Подписи полей и текст кнопки формы.'],
  },
  site: {
    brand: ['01. Название и логотип', 'Основные данные бренда, используемые на всех страницах.'],
    header: ['02. Шапка и меню', 'Пункты главного меню и кнопка в верхней части сайта.'],
    contacts: ['03. Контактные данные', 'Телефон, электронная почта и регион работы.'],
    forms: ['04. Общие тексты форм', 'Подписи полей, кнопок и согласий во всех формах.'],
    footer: ['05. Подвал сайта', 'Навигация, реквизиты и информация в нижней части страниц.'],
  },
  legal: {
    privacy: ['01. Политика конфиденциальности', 'Загрузите готовый PDF. Ссылка в формах и подвале сайта будет открывать этот документ в новой вкладке.'],
    consent: ['02. Согласие на обработку персональных данных', 'Загрузите готовый PDF с текстом согласия. Файл откроется в новой вкладке без оформления сайта.'],
  },
};

const state = {
  user: null,
  siteUrl: '/',
  currentView: 'dashboard',
  pageDraft: null,
  pageKey: null,
  entries: [],
  media: [],
  dashboardTimer: null,
};

const authScreen = $('#auth-screen');
const appShell = $('#app-shell');
const view = $('#view');
const dialog = $('#editor-dialog');
const toast = $('#toast');

const api = async (url, options = {}) => {
  const settings = { ...options, headers: { ...(options.headers || {}) } };
  if (settings.body && !(settings.body instanceof FormData)) {
    settings.headers['Content-Type'] = 'application/json';
    settings.body = JSON.stringify(settings.body);
  }
  const response = await fetch(url, settings);
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && url !== '/api/auth/login') showLogin();
    throw new Error(data?.error || 'Не удалось выполнить действие.');
  }
  return data;
};

const notify = (message, error = false) => {
  toast.textContent = message;
  toast.className = `toast show${error ? ' error' : ''}`;
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => { toast.className = 'toast'; }, 3200);
};

const setPublishing = (busy, error = false) => {
  const element = $('#publish-state');
  element.className = `publish-state${busy ? ' busy' : ''}${error ? ' error' : ''}`;
  element.lastChild.textContent = error ? 'Ошибка публикации' : busy ? 'Сайт обновляется…' : 'Сайт опубликован';
};

const showLogin = () => {
  state.user = null;
  authScreen.hidden = false;
  appShell.hidden = true;
};

const showApp = ({ user, siteUrl }) => {
  state.user = user;
  state.siteUrl = siteUrl || '/';
  authScreen.hidden = true;
  appShell.hidden = false;
  $('#site-link').href = state.siteUrl;
  $('#user-name').textContent = user.name;
  $('#user-email').textContent = user.email;
  $('#user-avatar').textContent = user.name.trim().charAt(0).toUpperCase() || 'А';
  $$('[data-admin-only]').forEach((item) => { item.hidden = user.role !== 'admin'; });
  navigate('dashboard');
};

$('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const error = $('#login-error');
  error.textContent = '';
  const button = $('button[type="submit"]', event.currentTarget);
  button.disabled = true;
  button.textContent = 'Входим…';
  try {
    const result = await api('/api/auth/login', {
      method: 'POST',
      body: { email: form.get('email'), password: form.get('password') },
    });
    showApp({ ...result, siteUrl: '/' });
  } catch (failure) {
    error.textContent = failure.message;
  } finally {
    button.disabled = false;
    button.textContent = 'Войти';
  }
});

$('#logout-button').addEventListener('click', async () => {
  await api('/api/auth/logout', { method: 'POST' }).catch(() => null);
  showLogin();
});

$('#menu-button').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
$('#dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});

$('#navigation').addEventListener('click', (event) => {
  const button = event.target.closest('[data-view]');
  if (!button) return;
  navigate(button.dataset.view);
  $('#sidebar').classList.remove('open');
});

const setHeading = (title, eyebrow = 'Админ-панель') => {
  $('#view-title').textContent = title;
  $('#view-eyebrow').textContent = eyebrow;
};

const formatDate = (value, withTime = false) => {
  if (!value) return 'ещё не было';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? '' : new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date);
};

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
}[character]));

const navigate = async (target) => {
  clearTimeout(state.dashboardTimer);
  state.currentView = target;
  $$('[data-view]').forEach((button) => button.classList.toggle('active', button.dataset.view === target));
  view.innerHTML = '<div class="empty-state"><strong>Загружаем раздел…</strong></div>';
  try {
    if (target === 'dashboard') return await renderDashboard();
    if (target === 'leads') return await renderLeads();
    if (target.startsWith('page-')) return await renderPageEditor(target.replace('page-', ''));
    if (target === 'articles') return await renderEntries('article');
    if (target === 'cases') return await renderEntries('case');
    if (target === 'media') return await renderMedia();
    if (target === 'users') return await renderUsers();
  } catch (error) {
    view.innerHTML = `<div class="empty-state"><strong>Не удалось открыть раздел</strong><p>${escapeHtml(error.message)}</p></div>`;
    notify(error.message, true);
  }
};

const renderDashboard = async () => {
  setHeading('Обзор', 'Управление сайтом');
  const data = await api('/api/dashboard');
  const analytics = data.analytics || {
    today: { visitors: 0, views: 0 },
    yesterday: { visitors: 0, views: 0 },
    week: { visitors: 0, views: 0 },
    month: { visitors: 0, views: 0 },
    online: 0,
    series: [],
    popular: [],
  };
  const number = (value) => new Intl.NumberFormat('ru-RU').format(value || 0);
  const chartDays = analytics.series.slice(-14);
  const chartMaximum = Math.max(1, ...chartDays.map((item) => item.views));
  const shortDay = (value) => new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(`${value}T12:00:00`));
  const actions = {
    save_page: 'Изменена страница',
    create_entry: 'Создан материал',
    update_entry: 'Изменён материал',
    delete_entry: 'Удалён материал',
    upload_media: 'Загружен файл',
    delete_media: 'Удалён файл',
    publish: 'Сайт опубликован',
    create_user: 'Добавлен пользователь',
    update_user: 'Изменён пользователь',
    handle_lead: 'Заявка обработана',
    reopen_lead: 'Заявка возвращена в работу',
    delete_lead: 'Удалена заявка',
    update_lead_email: 'Изменена почта для заявок',
    update_lead_telegram: 'Изменены настройки Telegram',
    login: 'Вход в админку',
  };
  const activityPageNames = {
    home: 'Главная',
    services: 'Услуги',
    expert: 'Эксперт',
    contacts: 'Контакты',
    site: 'Общие данные',
    blog: 'Блог',
    cases: 'Кейсы',
    legal: 'Документы',
  };
  const parseActivityTarget = (value) => {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };
  const changedFieldLabel = (pageKey, path) => {
    const parts = String(path || '').split('.').filter((part) => part && !/^\d+$/.test(part));
    const sectionKey = parts[0];
    const fieldKey = parts.at(-1);
    const sectionName = PAGE_SECTIONS[pageKey]?.[sectionKey]?.[0] || labelFor(sectionKey);
    if (!fieldKey || fieldKey === sectionKey) return sectionName;
    return `${sectionName}: ${labelFor(fieldKey)}`;
  };
  const activityDetail = (item) => {
    const target = parseActivityTarget(item.target);
    if (target?.kind === 'page') {
      const pageName = activityPageNames[target.key] || target.key;
      const fields = [...new Set((target.paths || []).map((path) => changedFieldLabel(target.key, path)))];
      if (!fields.length) return pageName;
      const visible = fields.slice(0, 2);
      const remaining = Math.max(0, fields.length - visible.length);
      return `${pageName} → ${visible.join('; ')}${remaining ? `; ещё ${remaining}` : ''}`;
    }
    if (target?.kind === 'entry') {
      const typeName = target.type === 'case' ? 'Кейс' : 'Статья';
      const title = target.title ? ` «${target.title}»` : ` №${target.id}`;
      const fields = [...new Set((target.fields || []).map((field) => labelFor(field)))];
      if (!fields.length) return `${typeName}${title}`;
      const visible = fields.slice(0, 2);
      const remaining = Math.max(0, fields.length - visible.length);
      return `${typeName}${title} → ${visible.join(', ')}${remaining ? `, ещё ${remaining}` : ''}`;
    }
    if (target?.kind === 'media') return `Файл «${target.name}»`;
    if (target?.kind === 'user') return target.name || `Пользователь №${target.id}`;
    if (target?.kind === 'lead') return `Заявка №${target.id} · ${target.phone}`;
    if (target?.kind === 'setting') return target.name || 'Настройка';
    if (item.action === 'save_page') return activityPageNames[item.target] || item.target;
    if (['create_entry', 'update_entry', 'delete_entry'].includes(item.action)) {
      const [type, id] = String(item.target || '').split(':');
      return `${type === 'case' ? 'Кейс' : 'Статья'} №${id}`;
    }
    if (['upload_media', 'delete_media'].includes(item.action)) return `Файл «${item.target}»`;
    return '';
  };
  view.innerHTML = `
    <p class="view-intro">Выберите нужное действие — изменения появятся на сайте сразу после сохранения.</p>
    <section class="dashboard-grid">
      <div class="panel">
        <h2>Быстрые действия</h2>
        <div class="quick-grid">
          <button class="quick-card" data-go="leads"><span>Обращения</span><strong>Открыть заявки →</strong></button>
          <button class="quick-card" data-go="page-home"><span>Страница</span><strong>Изменить главную →</strong></button>
          <button class="quick-card" data-go="articles"><span>Блог</span><strong>Добавить статью →</strong></button>
          <button class="quick-card" data-go="cases"><span>Портфолио</span><strong>Добавить кейс →</strong></button>
          <button class="quick-card" data-go="media"><span>Файлы</span><strong>Загрузить файл →</strong></button>
        </div>
      </div>
      <div class="panel">
        <h2>Последние изменения</h2>
        <ul class="activity-list">
          ${data.recent.length ? data.recent.map((item) => {
            const detail = activityDetail(item);
            return `<li><i></i><div><strong>${escapeHtml(actions[item.action] || item.action)}</strong>${detail ? `<span>${escapeHtml(detail)}</span>` : ''}<small>${escapeHtml(item.user_name || 'Система')} · ${formatDate(item.created_at, true)}</small></div></li>`;
          }).join('') : '<li><i></i><div>Изменений пока нет</div></li>'}
        </ul>
      </div>
    </section>
    <div class="section-divider"><span>Содержимое сайта</span></div>
    <section class="metric-grid">
      <article class="metric-card"><strong>${data.articles}</strong><span>Статей</span></article>
      <article class="metric-card"><strong>${data.cases}</strong><span>Кейсов</span></article>
      <article class="metric-card"><strong>${data.media}</strong><span>Файлов</span></article>
      <article class="metric-card"><strong>${data.newLeads}</strong><span>Новых заявок</span></article>
    </section>
    <div class="section-divider"><span>Статистика посещений</span></div>
    <p class="view-intro">Посещаемость обновляется автоматически. «Онлайн» — посетители, активные на сайте за последние пять минут.</p>
    <section class="visitor-metric-grid">
      <article class="visitor-metric visitor-metric--accent"><span>Сегодня</span><strong>${number(analytics.today.visitors)}</strong><small>посетителей · ${number(analytics.today.views)} просмотров</small></article>
      <article class="visitor-metric"><span>Вчера</span><strong>${number(analytics.yesterday.visitors)}</strong><small>посетителей · ${number(analytics.yesterday.views)} просмотров</small></article>
      <article class="visitor-metric visitor-metric--online"><span><i></i>Сейчас онлайн</span><strong>${number(analytics.online)}</strong><small>активны за последние 5 минут</small></article>
      <article class="visitor-metric"><span>За 7 дней</span><strong>${number(analytics.week.visitors)}</strong><small>посетителей · ${number(analytics.week.views)} просмотров</small></article>
      <article class="visitor-metric"><span>За 30 дней</span><strong>${number(analytics.month.visitors)}</strong><small>посетителей · ${number(analytics.month.views)} просмотров</small></article>
    </section>
    <section class="analytics-grid">
      <div class="panel analytics-chart-panel">
        <div class="panel-title"><div><h2>Посещения за 14 дней</h2><p>Просмотры страниц по дням</p></div><span>Обновление: онлайн</span></div>
        <div class="analytics-chart" aria-label="График просмотров за 14 дней">
          ${chartDays.map((item) => `
            <div class="chart-column" title="${shortDay(item.day)}: ${number(item.views)} просмотров, ${number(item.visitors)} посетителей">
              <strong>${item.views ? number(item.views) : ''}</strong>
              <i style="height:${Math.max(3, Math.round((item.views / chartMaximum) * 100))}%"></i>
              <span>${shortDay(item.day)}</span>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="panel popular-panel">
        <div class="panel-title"><div><h2>Популярные страницы</h2><p>За последние 30 дней</p></div></div>
        <ol class="popular-list">
          ${analytics.popular.length ? analytics.popular.map((item) => `
            <li>
              <div><strong>${escapeHtml(item.title || item.path)}</strong><small>${escapeHtml(item.path)}</small></div>
              <span>${number(item.views)} <small>просм.</small></span>
            </li>
          `).join('') : '<li class="popular-empty">Посещения начнут появляться после открытия сайта.</li>'}
        </ol>
      </div>
    </section>
    <p class="view-intro" style="margin-top:18px">Последняя публикация: ${formatDate(data.lastPublishedAt, true)}.</p>
  `;
  $$('[data-go]', view).forEach((button) => button.addEventListener('click', () => navigate(button.dataset.go)));
  state.dashboardTimer = setTimeout(() => {
    if (state.currentView === 'dashboard' && document.visibilityState === 'visible') renderDashboard();
  }, 30_000);
};

const renderLeads = async () => {
  setHeading('Заявки', 'Обращения с сайта');
  const leads = await api('/api/leads');
  const statusLabels = {
    new: 'Сохранена',
    queued: 'Уведомление передано',
    failed: 'Уведомление не отправлено',
    handled: 'Обработана',
  };
  const details = (lead) => [
    lead.name && ['Имя', lead.name],
    lead.phone && ['Телефон', lead.phone],
    lead.cadastral && ['Участок или адрес', lead.cadastral],
    lead.message && ['Сообщение', lead.message],
  ].filter(Boolean).map(([label, value]) => (
    `<div><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`
  )).join('');

  view.innerHTML = `
    <p class="view-intro">Все обращения сначала сохраняются здесь, а затем передаются в настроенные каналы — Telegram и почту.</p>
    <section class="leads-list">
      ${leads.length ? leads.map((lead) => `
        <article class="lead-card${lead.status === 'handled' ? ' is-handled' : ''}">
          <header>
            <div>
              <p>${escapeHtml(lead.form_name || 'Форма обратной связи')}</p>
              <h2>Заявка №${lead.id}</h2>
            </div>
            <span class="lead-status lead-status--${escapeHtml(lead.status)}">${escapeHtml(statusLabels[lead.status] || lead.status)}</span>
          </header>
          <div class="lead-details">${details(lead)}</div>
          <footer>
            <div>
              <strong>${formatDate(lead.created_at, true)}</strong>
              ${lead.page_title ? `<span>${escapeHtml(lead.page_title)}</span>` : ''}
              ${lead.page_path ? `<a href="${escapeHtml(lead.page_path)}" target="_blank" rel="noopener">Открыть страницу ↗</a>` : ''}
              ${lead.delivery_error ? `<small>Каналы уведомлений: ${escapeHtml(lead.delivery_error)}</small>` : ''}
            </div>
            <div class="lead-actions">
              <button class="secondary-button" data-handle-lead="${lead.id}">
                ${lead.status === 'handled' ? 'Вернуть в работу' : 'Отметить обработанной'}
              </button>
              <button class="danger-button" data-delete-lead="${lead.id}">Удалить заявку</button>
            </div>
          </footer>
        </article>
      `).join('') : `
        <div class="empty-state">
          <strong>Заявок пока нет</strong>
          <p>После отправки любой формы обращение сразу появится в этом разделе.</p>
        </div>
      `}
    </section>
  `;
  $$('[data-handle-lead]', view).forEach((button) => button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      await api(`/api/leads/${button.dataset.handleLead}/handled`, { method: 'PUT' });
      notify('Статус заявки обновлён.');
      await renderLeads();
    } catch (error) {
      notify(error.message, true);
      button.disabled = false;
    }
  }));
  $$('[data-delete-lead]', view).forEach((button) => button.addEventListener('click', async () => {
    const id = Number(button.dataset.deleteLead);
    if (!confirm(`Удалить заявку №${id}? Восстановить её после удаления будет нельзя.`)) return;
    button.disabled = true;
    try {
      await api(`/api/leads/${id}`, { method: 'DELETE' });
      notify(`Заявка №${id} удалена.`);
      await renderLeads();
    } catch (error) {
      notify(error.message, true);
      button.disabled = false;
    }
  }));
};

const labelFor = (key) => LABELS[key] || String(key).replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
const isLongText = (key, value) => String(value || '').length > 90 || ['text', 'description', 'intro', 'lead', 'consent', 'excerpt_text'].includes(key);
const isImageKey = (key) => ['image', 'logo'].includes(key) || key.endsWith('_image');

const getAtPath = (object, pathParts) => pathParts.reduce((value, part) => value?.[part], object);
const setAtPath = (object, pathParts, value) => {
  const parent = pathParts.slice(0, -1).reduce((current, part) => current[part], object);
  parent[pathParts.at(-1)] = value;
};

const richMode = (value) => {
  const source = String(value || '');
  if (source.startsWith(RICH_INLINE_PREFIX)) return 'inline';
  if (source.startsWith(RICH_BLOCK_PREFIX)) return 'block';
  return null;
};

const richEditorHtml = (value) => {
  const source = String(value || '');
  if (source.startsWith(RICH_INLINE_PREFIX)) return source.slice(RICH_INLINE_PREFIX.length);
  if (source.startsWith(RICH_BLOCK_PREFIX)) return source.slice(RICH_BLOCK_PREFIX.length);
  return escapeHtml(source).replace(/\r?\n/g, '<br>');
};

const plainTextKeys = new Set([
  'keywords', 'og_title', 'og_description', 'image_alt', 'url', 'anchor', 'style',
  'price', 'number', 'value', 'email', 'phone_link', 'phone_display', 'coordinates',
  'date', 'slug', 'logo', 'image', 'name', 'role', 'primary_action', 'secondary_action',
  'action', 'submit', 'link', 'file',
]);

const isRichTextField = (key, value, pathParts = []) => {
  if (typeof value !== 'string') return false;
  const stringPath = pathParts.filter((part) => typeof part === 'string');
  const path = stringPath.join('.');
  if (
    stringPath.includes('seo')
    || plainTextKeys.has(key)
    || key.endsWith('_alt')
    || key.endsWith('_url')
    || /^(?:header\.menu|footer\.services)(?:\.|$)/.test(path)
  ) return false;
  return true;
};

const createRichTextEditor = ({ value = '', mode = 'inline', compact = false, onChange, label = 'Текст' } = {}) => {
  const root = document.createElement('div');
  root.className = `rich-editor rich-editor--${mode}${compact ? ' rich-editor--compact' : ''}`;
  const toolbar = document.createElement('div');
  toolbar.className = 'rich-editor__toolbar';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', `Форматирование: ${label}`);
  const surface = document.createElement('div');
  surface.className = 'rich-editor__surface';
  surface.contentEditable = 'true';
  surface.spellcheck = true;
  surface.setAttribute('role', 'textbox');
  surface.setAttribute('aria-multiline', 'true');
  surface.setAttribute('aria-label', label);
  surface.innerHTML = richEditorHtml(value);

  const HISTORY_LIMIT = 100;
  const history = [surface.innerHTML];
  let historyIndex = 0;
  let applyingHistory = false;
  let lastInputKind = '';
  let lastInputAt = 0;
  let undoControl;
  let redoControl;

  const prefix = mode === 'block' ? RICH_BLOCK_PREFIX : RICH_INLINE_PREFIX;
  const currentValue = () => {
    const hasContent = surface.textContent.trim() || surface.querySelector('img');
    return hasContent ? `${prefix}${surface.innerHTML}` : '';
  };
  const sync = () => onChange?.(currentValue());
  const updateHistoryControls = () => {
    if (undoControl) undoControl.disabled = historyIndex <= 0;
    if (redoControl) redoControl.disabled = historyIndex >= history.length - 1;
  };
  const rememberHistory = ({ replace = false, preserveInputGroup = false } = {}) => {
    if (applyingHistory || history[historyIndex] === surface.innerHTML) return;
    history.splice(historyIndex + 1);
    if (replace && historyIndex > 0) {
      history[historyIndex] = surface.innerHTML;
    } else {
      history.push(surface.innerHTML);
    }
    if (history.length > HISTORY_LIMIT) history.shift();
    historyIndex = history.length - 1;
    if (!preserveInputGroup) resetInputGroup();
    updateHistoryControls();
  };
  const resetInputGroup = () => {
    lastInputKind = '';
    lastInputAt = 0;
  };
  const saveSelection = () => {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (surface.contains(range.commonAncestorContainer)) richSelectionRanges.set(surface, range.cloneRange());
  };
  const restoreSelection = () => {
    const savedRange = richSelectionRanges.get(surface);
    if (!savedRange) return;
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(savedRange);
  };
  const activeRange = () => {
    surface.focus();
    restoreSelection();
    const selection = window.getSelection();
    if (!selection?.rangeCount) return null;
    const range = selection.getRangeAt(0);
    return surface.contains(range.commonAncestorContainer) ? range : null;
  };
  const selectNodeContents = (node) => {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(node);
    selection.removeAllRanges();
    selection.addRange(range);
    saveSelection();
  };
  const placeCaretAtEnd = () => {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(surface);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    saveSelection();
  };
  const restoreHistory = (offset) => {
    const nextIndex = historyIndex + offset;
    if (nextIndex < 0 || nextIndex >= history.length) return;
    applyingHistory = true;
    historyIndex = nextIndex;
    surface.innerHTML = history[historyIndex];
    surface.focus();
    placeCaretAtEnd();
    applyingHistory = false;
    resetInputGroup();
    updateHistoryControls();
    sync();
  };
  const wrapSelection = (tagName, attributes = {}) => {
    const range = activeRange();
    if (!range) return;
    if (range.collapsed && tagName !== 'a') {
      const command = tagName === 'strong' ? 'bold'
        : tagName === 'em' ? 'italic'
          : 'formatBlock';
      document.execCommand(command, false, command === 'formatBlock' ? tagName : null);
      saveSelection();
      rememberHistory();
      sync();
      return;
    }
    const element = document.createElement(tagName);
    Object.entries(attributes).forEach(([name, attributeValue]) => element.setAttribute(name, attributeValue));
    if (range.collapsed) {
      element.textContent = 'ссылка';
      range.insertNode(element);
    } else {
      element.append(range.extractContents());
      range.insertNode(element);
    }
    selectNodeContents(element);
    rememberHistory();
    sync();
  };
  const insertHtmlAtSelection = (html) => {
    const range = activeRange();
    if (!range) return;
    range.deleteContents();
    const fragment = range.createContextualFragment(html);
    const lastNode = fragment.lastChild;
    range.insertNode(fragment);
    if (lastNode) {
      range.setStartAfter(lastNode);
      range.collapse(true);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      saveSelection();
    }
    rememberHistory();
    sync();
  };
  const insertList = (ordered) => {
    const range = activeRange();
    if (!range) return;
    const lines = (range.toString() || 'Новый пункт').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const list = document.createElement(ordered ? 'ol' : 'ul');
    lines.forEach((line) => {
      const item = document.createElement('li');
      item.textContent = line;
      list.append(item);
    });
    range.deleteContents();
    range.insertNode(list);
    selectNodeContents(list.lastElementChild || list);
    rememberHistory();
    sync();
  };
  const run = (command, commandValue = null) => {
    if (command === 'undo') return restoreHistory(-1);
    if (command === 'redo') return restoreHistory(1);
    surface.focus();
    restoreSelection();
    document.execCommand(command, false, commandValue);
    saveSelection();
    rememberHistory();
    sync();
  };
  const button = (text, title, action) => {
    const control = document.createElement('button');
    control.type = 'button';
    control.textContent = text;
    control.title = title;
    control.setAttribute('aria-label', title);
    control.addEventListener('mousedown', (event) => {
      event.preventDefault();
      saveSelection();
    });
    control.addEventListener('click', action);
    toolbar.append(control);
    return control;
  };

  if (mode === 'block') {
    button('Заголовок', 'Заголовок раздела', () => wrapSelection('h2'));
    button('Подзаголовок', 'Подзаголовок раздела', () => wrapSelection('h3'));
    button('Абзац', 'Обычный абзац', () => wrapSelection('p'));
  }
  button('Жирный', 'Жирное начертание', () => wrapSelection('strong'));
  button('Курсив', 'Курсивное начертание', () => wrapSelection('em'));
  button('Перенос', 'Перенос строки', () => insertHtmlAtSelection('<br>'));
  if (mode === 'block') {
    button('• Список', 'Маркированный список', () => insertList(false));
    button('1. Список', 'Нумерованный список', () => insertList(true));
  } else {
    button('• Пункт', 'Добавить пункт списка с новой строки', () => insertHtmlAtSelection('<br>• '));
    button('Новый абзац', 'Начать новый абзац', () => insertHtmlAtSelection('<br><br>'));
  }
  button('Ссылка', 'Добавить ссылку', () => {
    const href = prompt('Вставьте адрес ссылки:');
    if (href) wrapSelection('a', { href: href.trim() });
  });
  undoControl = button('↶', 'Отменить последнее изменение', () => run('undo'));
  redoControl = button('↷', 'Вернуть отменённое изменение', () => run('redo'));
  button('Очистить', 'Убрать оформление выделенного текста', () => {
    const range = activeRange();
    if (!range || range.collapsed) return;
    const text = document.createTextNode(range.toString());
    range.deleteContents();
    range.insertNode(text);
    selectNodeContents(text);
    rememberHistory();
    sync();
  });

  updateHistoryControls();
  surface.addEventListener('input', (event) => {
    const inputKind = ['insertText', 'deleteContentBackward', 'deleteContentForward'].includes(event.inputType)
      ? event.inputType
      : '';
    const now = Date.now();
    const continuesTyping = inputKind && inputKind === lastInputKind && now - lastInputAt < 900;
    rememberHistory({ replace: continuesTyping, preserveInputGroup: true });
    lastInputKind = inputKind;
    lastInputAt = inputKind ? now : 0;
    sync();
  });
  surface.addEventListener('keydown', (event) => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.key.toLowerCase() !== 'z') return;
    event.preventDefault();
    restoreHistory(event.shiftKey ? 1 : -1);
  });
  surface.addEventListener('keyup', saveSelection);
  surface.addEventListener('mouseup', saveSelection);
  surface.addEventListener('focus', saveSelection);
  surface.addEventListener('blur', () => {
    saveSelection();
    sync();
  });
  surface.addEventListener('paste', (event) => {
    event.preventDefault();
    document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
    sync();
  });
  root.append(toolbar, surface);
  return {
    root,
    surface,
    getValue: currentValue,
    insertHtml(html) {
      run('insertHTML', html);
    },
  };
};

const uploadFile = async (file) => {
  const body = new FormData();
  body.append('file', file);
  return api('/api/media', { method: 'POST', body });
};

const createField = (key, value, pathParts, refresh) => {
  if (Array.isArray(value)) return createArrayField(key, value, pathParts, refresh);
  if (value && typeof value === 'object') return createObjectGroup(key, value, pathParts, refresh, pathParts.length > 1);
  const wrapper = document.createElement('label');
  wrapper.className = `field${isLongText(key, value) ? ' field-wide' : ''}${typeof value === 'boolean' ? ' boolean-field' : ''}`;
  const label = document.createElement('span');
  label.textContent = labelFor(key);
  wrapper.append(label);

  if (state.pageKey === 'legal' && key === 'file') {
    wrapper.classList.add('field-wide', 'document-field');
    const current = document.createElement('div');
    current.className = 'document-current';
    if (value) {
      const link = document.createElement('a');
      link.href = `/${String(value).replace(/^\/+/, '')}`;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = `Открыть загруженный PDF ↗`;
      current.append(link);
    } else {
      current.textContent = 'PDF пока не загружен. Ссылка на сайте появится после сохранения.';
    }
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/pdf,.pdf';
    fileInput.hidden = true;
    const uploadButton = document.createElement('button');
    uploadButton.type = 'button';
    uploadButton.className = 'upload-button';
    uploadButton.textContent = value ? 'Заменить PDF' : 'Загрузить PDF';
    uploadButton.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
      if (!fileInput.files[0]) return;
      uploadButton.disabled = true;
      uploadButton.textContent = 'Загружаем…';
      try {
        const media = await uploadFile(fileInput.files[0]);
        setAtPath(state.pageDraft, pathParts, media.url);
        refresh();
        notify('PDF загружен. Нажмите «Сохранить и опубликовать».');
      } catch (error) {
        notify(error.message, true);
        uploadButton.disabled = false;
        uploadButton.textContent = value ? 'Заменить PDF' : 'Загрузить PDF';
      }
    });
    wrapper.append(current, uploadButton, fileInput);
    return wrapper;
  }

  if (typeof value === 'boolean') {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = value;
    input.addEventListener('change', () => setAtPath(state.pageDraft, pathParts, input.checked));
    wrapper.append(input);
    return wrapper;
  }

  if (isImageKey(key)) {
    wrapper.className = 'field image-field';
    const preview = document.createElement('div');
    preview.className = 'image-preview';
    if (value) {
      const image = document.createElement('img');
      image.src = String(value).startsWith('http') || String(value).startsWith('/') ? value : `/${value}`;
      image.alt = '';
      preview.append(image);
    } else {
      preview.textContent = 'Нет изображения';
    }
    const controls = document.createElement('div');
    controls.className = 'image-controls';
    controls.append(label);
    const input = document.createElement('input');
    input.value = value ?? '';
    input.addEventListener('input', () => setAtPath(state.pageDraft, pathParts, input.value));
    controls.append(input);
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/jpeg,image/png,image/webp';
    fileInput.hidden = true;
    const uploadButton = document.createElement('button');
    uploadButton.type = 'button';
    uploadButton.className = 'upload-button';
    uploadButton.textContent = 'Загрузить новое изображение';
    uploadButton.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
      if (!fileInput.files[0]) return;
      uploadButton.disabled = true;
      uploadButton.textContent = 'Загружаем…';
      try {
        const media = await uploadFile(fileInput.files[0]);
        setAtPath(state.pageDraft, pathParts, media.url);
        refresh();
        notify('Изображение загружено. Сохраните страницу.');
      } catch (error) {
        notify(error.message, true);
      }
    });
    controls.append(uploadButton, fileInput);
    wrapper.append(preview, controls);
    return wrapper;
  }

  if (isRichTextField(key, value, pathParts)) {
    const editor = createRichTextEditor({
      value,
      compact: !isLongText(key, value),
      label: labelFor(key),
      onChange: (nextValue) => setAtPath(state.pageDraft, pathParts, nextValue),
    });
    wrapper.append(editor.root);
    return wrapper;
  }

  const input = isLongText(key, value) ? document.createElement('textarea') : document.createElement('input');
  input.value = value ?? '';
  input.addEventListener('input', () => setAtPath(state.pageDraft, pathParts, input.value));
  wrapper.append(input);
  return wrapper;
};

const createObjectGroup = (key, value, pathParts, refresh, nested = false) => {
  const section = document.createElement('section');
  section.className = 'field-group';
  const header = document.createElement('div');
  header.className = 'group-head';
  header.innerHTML = `<div><h3>${escapeHtml(labelFor(key))}</h3>${nested ? '' : '<p>Заполните поля так, как они должны отображаться на сайте.</p>'}</div>`;
  const body = document.createElement('div');
  body.className = 'group-body';
  Object.entries(value).forEach(([childKey, childValue]) => body.append(createField(childKey, childValue, [...pathParts, childKey], refresh)));
  section.append(header, body);
  return section;
};

const createArrayField = (key, value, pathParts, refresh) => {
  const section = document.createElement('section');
  section.className = 'array-field';
  const header = document.createElement('div');
  header.className = 'array-head';
  const title = document.createElement('strong');
  title.textContent = `${labelFor(key)} · ${value.length}`;
  const add = document.createElement('button');
  add.className = 'upload-button';
  add.type = 'button';
  add.textContent = 'Добавить';
  add.addEventListener('click', () => {
    const sample = value[0];
    value.push(sample && typeof sample === 'object' ? Object.fromEntries(Object.keys(sample).map((sampleKey) => [sampleKey, typeof sample[sampleKey] === 'boolean' ? false : ''])) : '');
    refresh();
  });
  header.append(title, add);
  const items = document.createElement('div');
  items.className = 'array-items';
  value.forEach((item, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'array-item';
    if (item && typeof item === 'object') {
      const body = document.createElement('div');
      body.className = 'group-body';
      Object.entries(item).forEach(([childKey, childValue]) => body.append(createField(childKey, childValue, [...pathParts, index, childKey], refresh)));
      wrapper.append(body);
    } else {
      if (isRichTextField(key, item, [...pathParts, index])) {
        const editor = createRichTextEditor({
          value: item,
          compact: !isLongText(key, item),
          label: `${labelFor(key)} ${index + 1}`,
          onChange: (nextValue) => setAtPath(state.pageDraft, [...pathParts, index], nextValue),
        });
        wrapper.append(editor.root);
      } else {
        const input = document.createElement('textarea');
        input.value = item ?? '';
        input.addEventListener('input', () => setAtPath(state.pageDraft, [...pathParts, index], input.value));
        wrapper.append(input);
      }
    }
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove-button';
    remove.textContent = 'Удалить элемент';
    remove.addEventListener('click', () => {
      value.splice(index, 1);
      refresh();
    });
    wrapper.append(remove);
    items.append(wrapper);
  });
  section.append(header, items);
  return section;
};

const createPageSection = (key, value) => {
  const meta = PAGE_SECTIONS[state.pageKey]?.[key] || [labelFor(key), 'Содержимое этого блока на странице сайта.'];
  const section = document.createElement('section');
  section.className = 'field-group page-section';
  const header = document.createElement('div');
  header.className = 'group-head';
  header.innerHTML = `<div><h3>${escapeHtml(meta[0])}</h3><p>${escapeHtml(meta[1])}</p></div>`;
  const body = document.createElement('div');
  body.className = 'group-body';
  if (Array.isArray(value)) {
    body.append(createArrayField(key, value, [key], renderPageFields));
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([childKey, childValue]) => {
      body.append(createField(childKey, childValue, [key, childKey], renderPageFields));
    });
  } else {
    body.append(createField(key, value, [key], renderPageFields));
  }
  section.append(header, body);
  return section;
};

const renderPageFields = () => {
  const container = $('#page-fields');
  container.innerHTML = '';
  Object.entries(state.pageDraft).forEach(([key, value]) => {
    container.append(createPageSection(key, value));
  });
};

const renderPageEditor = async (key) => {
  const meta = PAGE_META[key];
  if (!meta) throw new Error('Неизвестная страница.');
  setHeading(meta.title, 'Страницы сайта');
  const [page, leadEmailSetting, telegramSetting] = await Promise.all([
    api(`/api/pages/${key}`),
    key === 'site' ? api('/api/settings/lead-email') : Promise.resolve(null),
    key === 'site' ? api('/api/settings/telegram') : Promise.resolve(null),
  ]);
  state.pageDraft = structuredClone(page.data);
  state.pageKey = key;
  view.innerHTML = `
    <p class="view-intro">${escapeHtml(meta.description)} После нажатия «Сохранить» сайт обновится автоматически.</p>
    ${key === 'site' ? `
      <div class="notification-settings-list">
        <section class="notification-settings">
          <div>
            <h2>Почта для заявок</h2>
            <p>Письма из всех форм будут отправляться на этот адрес. Публичная почта в контактах не изменится.</p>
          </div>
          <form id="lead-email-form">
            <label>Адрес получателя
              <input id="lead-email-input" type="email" value="${escapeHtml(leadEmailSetting.email)}" required maxlength="254" autocomplete="email">
            </label>
            <button class="primary-button" type="submit">Сохранить почту</button>
          </form>
        </section>
        <section class="notification-settings notification-settings--telegram">
          <div>
            <h2>Telegram-группа</h2>
            <p>${telegramSetting.botConfigured
              ? 'Добавьте бота в нужную группу. Затем найдите группу автоматически или укажите её ID. Если группа не найдётся, отправьте в ней команду /start.'
              : 'Бот ещё не подключён к серверу. Сначала добавьте его токен на VPS — токен не хранится в CMS и не попадает в GitHub.'}</p>
          </div>
          <form id="telegram-settings-form">
            <label class="checkbox-field">
              <input id="telegram-enabled-input" type="checkbox"${telegramSetting.enabled ? ' checked' : ''}>
              <span>Отправлять новые заявки в Telegram</span>
            </label>
            <label>ID группы
              <input id="telegram-chat-id-input" type="text" inputmode="numeric" value="${escapeHtml(telegramSetting.chatId)}" placeholder="-1001234567890" maxlength="24">
            </label>
            <div class="notification-settings__actions">
              <button class="secondary-button" id="telegram-discover-button" type="button"${telegramSetting.botConfigured ? '' : ' disabled'}>Найти группу</button>
              <button class="secondary-button" id="telegram-test-button" type="button"${telegramSetting.botConfigured ? '' : ' disabled'}>Проверить</button>
              <button class="primary-button" type="submit">Сохранить Telegram</button>
            </div>
          </form>
        </section>
      </div>
    ` : ''}
    <div class="editor-layout">
      <div class="editor-main" id="page-fields"></div>
      <aside class="editor-aside">
        <div class="save-card">
          <p>Последнее изменение:<br><strong>${formatDate(page.updated_at, true)}</strong></p>
          <button class="primary-button" id="save-page">Сохранить и опубликовать</button>
        </div>
      </aside>
    </div>
  `;
  renderPageFields();
  $('#save-page').addEventListener('click', savePage);
  if (key === 'site') {
    $('#lead-email-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = event.currentTarget.querySelector('button');
      button.disabled = true;
      button.textContent = 'Сохраняем…';
      try {
        const saved = await api('/api/settings/lead-email', {
          method: 'PUT',
          body: { email: $('#lead-email-input').value },
        });
        $('#lead-email-input').value = saved.email;
        notify('Почта для получения заявок сохранена.');
      } catch (error) {
        notify(error.message, true);
      } finally {
        button.disabled = false;
        button.textContent = 'Сохранить почту';
      }
    });
    $('#telegram-settings-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = event.currentTarget.querySelector('button[type="submit"]');
      button.disabled = true;
      button.textContent = 'Сохраняем…';
      try {
        const saved = await api('/api/settings/telegram', {
          method: 'PUT',
          body: {
            enabled: $('#telegram-enabled-input').checked,
            chatId: $('#telegram-chat-id-input').value,
          },
        });
        $('#telegram-enabled-input').checked = saved.enabled;
        $('#telegram-chat-id-input').value = saved.chatId;
        notify('Настройки Telegram сохранены.');
      } catch (error) {
        notify(error.message, true);
      } finally {
        button.disabled = false;
        button.textContent = 'Сохранить Telegram';
      }
    });
    $('#telegram-discover-button').addEventListener('click', async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      button.textContent = 'Ищем…';
      try {
        const result = await api('/api/settings/telegram/discover', { method: 'POST' });
        const group = result.chats[0];
        $('#telegram-chat-id-input').value = group.id;
        notify(`Найдена группа «${group.title}». Теперь нажмите «Проверить».`);
      } catch (error) {
        notify(error.message, true);
      } finally {
        button.disabled = false;
        button.textContent = 'Найти группу';
      }
    });
    $('#telegram-test-button').addEventListener('click', async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      button.textContent = 'Отправляем…';
      try {
        await api('/api/settings/telegram/test', {
          method: 'POST',
          body: { chatId: $('#telegram-chat-id-input').value },
        });
        notify('Тестовое сообщение отправлено в Telegram.');
      } catch (error) {
        notify(error.message, true);
      } finally {
        button.disabled = false;
        button.textContent = 'Проверить';
      }
    });
  }
};

const savePage = async () => {
  const button = $('#save-page');
  button.disabled = true;
  button.textContent = 'Сохраняем…';
  setPublishing(true);
  try {
    await api(`/api/pages/${state.pageKey}`, { method: 'PUT', body: { data: state.pageDraft } });
    setPublishing(false);
    notify('Страница сохранена и опубликована.');
    await renderPageEditor(state.pageKey);
  } catch (error) {
    setPublishing(false, true);
    notify(error.message, true);
    button.disabled = false;
    button.textContent = 'Сохранить и опубликовать';
  }
};

const entryName = (type) => type === 'article' ? 'статья' : 'кейс';

const renderEntries = async (type) => {
  const isArticle = type === 'article';
  setHeading(isArticle ? 'Статьи' : 'Кейсы', 'Публикации');
  state.entries = await api(`/api/entries?type=${type}`);
  view.innerHTML = `
    <div class="section-head">
      <div><h2>${isArticle ? 'Материалы блога' : 'Выполненные проекты'}</h2><p>${isArticle ? 'В одной строке сайта отображаются две карточки.' : 'Каждый кейс получает отдельную SEO-страницу.'}</p></div>
      <div class="button-row">
        <a class="secondary-button" href="/cms/preview/${type}" target="_blank" rel="noopener">Посмотреть шаблон страницы ↗</a>
        <button class="secondary-button" id="edit-list-page">Оформление раздела</button>
        <button class="primary-button" id="new-entry">Добавить ${isArticle ? 'статью' : 'кейс'}</button>
      </div>
    </div>
    <div class="content-grid">
      ${state.entries.length ? state.entries.map((item) => `
        <article class="content-card">
          <div class="content-card__image">${item.image ? `<img src="/${escapeHtml(item.image)}" alt="">` : ''}</div>
          <div class="content-card__body">
            <div class="content-card__meta"><span class="status-pill ${item.published ? '' : 'draft'}">${item.published ? 'Опубликовано' : 'Черновик'}</span><span>${escapeHtml(isArticle ? item.category : item.service)}</span></div>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.excerpt_text || item.subtitle)}</p>
            <div class="button-row">${item.published ? `<a class="text-button" href="/${isArticle ? 'blog' : 'cases'}/${escapeHtml(item.slug)}.html" target="_blank" rel="noopener">Открыть страницу</a>` : ''}<button class="text-button" data-edit="${item.id}">Редактировать</button><button class="text-button danger" data-delete="${item.id}">Удалить</button></div>
          </div>
        </article>
      `).join('') : `<div class="empty-state"><strong>${isArticle ? 'Статей пока нет' : 'Кейсов пока нет'}</strong><p>Нажмите кнопку выше, чтобы добавить первый материал.</p></div>`}
    </div>
  `;
  $('#edit-list-page').addEventListener('click', () => navigate(`page-${isArticle ? 'blog' : 'cases'}`));
  $('#new-entry').addEventListener('click', () => openEntryEditor(type));
  $$('[data-edit]', view).forEach((button) => button.addEventListener('click', () => openEntryEditor(type, Number(button.dataset.edit))));
  $$('[data-delete]', view).forEach((button) => button.addEventListener('click', () => deleteEntry(Number(button.dataset.delete), type)));
};

const localDateTime = (value) => {
  const date = value ? new Date(value) : new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.valueOf() - offset * 60_000).toISOString().slice(0, 16);
};

const openEntryEditor = async (type, id = null) => {
  const isArticle = type === 'article';
  const item = id ? await api(`/api/entries/${id}`) : {
    type,
    title: '',
    slug: '',
    subtitle: '',
    date: new Date().toISOString(),
    category: '',
    service: '',
    location: '',
    result: '',
    excerpt_text: '',
    seo_title: '',
    seo_description: '',
    image: '',
    image_alt: '',
    featured: false,
    published: true,
    body: '',
  };
  $('#dialog-eyebrow').textContent = isArticle ? 'Блог' : 'Кейсы';
  $('#dialog-title').textContent = id ? `Редактирование: ${item.title}` : `Новая ${entryName(type)}`;
  $('#dialog-body').innerHTML = `
    <form class="dialog-form" id="entry-form">
      <div class="form-grid">
        <label class="wide">Название<input name="title" required maxlength="160"></label>
        <label class="wide">Подзаголовок<div id="entry-subtitle-editor"></div><textarea name="subtitle" hidden></textarea></label>
        <label>Адрес страницы<input name="slug" maxlength="100" placeholder="Сформируется автоматически"></label>
        <label>Дата публикации<input name="date" type="datetime-local" required></label>
        ${isArticle ? '<label>Рубрика<input name="category" maxlength="100" placeholder="Например: Земельное право"></label>' : '<label>Вид услуги<input name="service" maxlength="120" placeholder="Например: Проверка участка"></label><label>Местоположение<input name="location" maxlength="120" placeholder="Москва или район"></label><label class="wide">Главный результат<div id="entry-result-editor"></div><textarea name="result" hidden></textarea></label>'}
        <label class="wide">Короткий анонс для карточки<textarea name="excerpt_text" maxlength="600" required></textarea></label>
        <label>SEO-заголовок<input name="seo_title" maxlength="160" placeholder="Можно оставить пустым"></label>
        <label>SEO-описание<textarea name="seo_description" maxlength="400" placeholder="Можно оставить пустым"></textarea></label>
        <label class="wide">Обложка
          <div class="image-controls"><input name="image" maxlength="500"><button class="upload-button" type="button" id="upload-cover">Загрузить обложку</button><input id="cover-file" type="file" accept="image/jpeg,image/png,image/webp" hidden></div>
        </label>
        <label class="wide">Описание изображения<input name="image_alt" maxlength="250"></label>
      </div>
      <div class="switch-row">
        <label><input name="published" type="checkbox">Опубликовано</label>
        <label><input name="featured" type="checkbox">${isArticle ? 'Показывать в популярных' : 'Показывать в избранных'}</label>
      </div>
      <label>Полный текст
        <div id="entry-rich-editor"></div>
        <button class="upload-button" type="button" id="insert-image">Добавить фотографию в текст</button>
        <textarea name="body" hidden></textarea>
      </label>
      <input id="body-image-file" type="file" accept="image/jpeg,image/png,image/webp" hidden>
      <div class="button-row">
        <button class="primary-button" type="submit">Сохранить и опубликовать</button>
        <button class="secondary-button" type="button" id="cancel-entry">Отмена</button>
      </div>
    </form>
  `;
  const form = $('#entry-form');
  Object.entries(item).forEach(([key, value]) => {
    const input = form.elements.namedItem(key);
    if (!input) return;
    if (input.type === 'checkbox') input.checked = Boolean(value);
    else if (key === 'date') input.value = localDateTime(value);
    else input.value = value ?? '';
  });
  const inlineEntryFields = [
    ['subtitle', '#entry-subtitle-editor', 'Подзаголовок'],
    ...(!isArticle ? [['result', '#entry-result-editor', 'Главный результат']] : []),
  ];
  inlineEntryFields.forEach(([name, selector, editorLabel]) => {
    const editor = createRichTextEditor({
      value: item[name] || '',
      label: editorLabel,
      onChange: (nextValue) => { form.elements[name].value = nextValue; },
    });
    $(selector).append(editor.root);
    form.elements[name].value = editor.getValue();
  });
  let bodyValue = item.body || '';
  if (bodyValue && !richMode(bodyValue)) {
    const converted = await api('/api/markdown-preview', { method: 'POST', body: { markdown: bodyValue } });
    bodyValue = `${RICH_BLOCK_PREFIX}${converted.html}`;
  }
  const entryEditor = createRichTextEditor({
    value: bodyValue,
    mode: 'block',
    label: `Полный текст: ${entryName(type)}`,
    onChange: (nextValue) => { form.elements.body.value = nextValue; },
  });
  $('#entry-rich-editor').append(entryEditor.root);
  form.elements.body.value = entryEditor.getValue();
  $('#cancel-entry').addEventListener('click', () => dialog.close());
  $('#upload-cover').addEventListener('click', () => $('#cover-file').click());
  $('#cover-file').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const media = await uploadFile(file);
      form.elements.image.value = media.url;
      if (!form.elements.image_alt.value) form.elements.image_alt.value = file.name.replace(/\.[^.]+$/, '');
      notify('Обложка загружена.');
    } catch (error) { notify(error.message, true); }
  });
  $('#insert-image').addEventListener('click', () => $('#body-image-file').click());
  $('#body-image-file').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const media = await uploadFile(file);
      entryEditor.insertHtml(`<p><img src="/${escapeHtml(media.url)}" alt="${escapeHtml(file.name.replace(/\.[^.]+$/, ''))}"></p>`);
      notify('Изображение добавлено в текст.');
    } catch (error) { notify(error.message, true); }
  });
  form.addEventListener('submit', (event) => saveEntry(event, item, type));
  dialog.showModal();
};

const saveEntry = async (event, original, type) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  if (!String(data.body || '').trim()) {
    notify('Добавьте полный текст материала.', true);
    return;
  }
  data.type = type;
  data.published = form.elements.published.checked;
  data.featured = form.elements.featured.checked;
  data.date = new Date(form.elements.date.value).toISOString();
  const button = $('button[type="submit"]', form);
  button.disabled = true;
  button.textContent = 'Сохраняем…';
  setPublishing(true);
  try {
    if (original.id) await api(`/api/entries/${original.id}`, { method: 'PUT', body: data });
    else await api('/api/entries', { method: 'POST', body: data });
    dialog.close();
    setPublishing(false);
    notify(`${entryName(type).replace(/^./, (letter) => letter.toUpperCase())} сохранён и опубликован.`);
    await renderEntries(type);
  } catch (error) {
    setPublishing(false, true);
    notify(error.message, true);
    button.disabled = false;
    button.textContent = 'Сохранить и опубликовать';
  }
};

const deleteEntry = async (id, type) => {
  const item = state.entries.find((entry) => entry.id === id);
  if (!confirm(`Удалить «${item?.title || 'материал'}»? Отменить это действие будет нельзя.`)) return;
  setPublishing(true);
  try {
    await api(`/api/entries/${id}`, { method: 'DELETE' });
    setPublishing(false);
    notify('Материал удалён.');
    await renderEntries(type);
  } catch (error) {
    setPublishing(false, true);
    notify(error.message, true);
  }
};

const renderMedia = async () => {
  setHeading('Файлы', 'Изображения и документы');
  state.media = await api('/api/media');
  view.innerHTML = `
    <div class="section-head">
      <div><h2>Библиотека файлов</h2><p>Здесь хранятся изображения сайта и загруженные PDF-документы.</p></div>
      <label class="primary-button">Загрузить файл<input id="media-upload" type="file" accept="image/jpeg,image/png,image/webp,application/pdf,.pdf" hidden></label>
    </div>
    <div class="media-grid">
      ${state.media.length ? state.media.map((item) => `
        <article class="media-card">
          ${item.mime_type === 'application/pdf' ? '<div class="media-card__document">PDF</div>' : `<img src="/${escapeHtml(item.url)}" alt="">`}
          <div><strong title="${escapeHtml(item.original_name)}">${escapeHtml(item.original_name)}</strong><small>${item.system ? 'Используется на сайте' : `${Math.max(1, Math.round(item.size / 1024))} КБ`}</small><div class="button-row"><button class="text-button" data-copy="${escapeHtml(item.url)}">Копировать путь</button>${state.user.role === 'admin' && !item.system ? `<button class="text-button danger" data-media-delete="${item.id}">Удалить</button>` : ''}</div></div>
        </article>
      `).join('') : '<div class="empty-state"><strong>Файлов пока нет</strong><p>Загрузите первый файл кнопкой выше.</p></div>'}
    </div>
  `;
  $('#media-upload').addEventListener('change', async (event) => {
    if (!event.target.files[0]) return;
    try {
      await uploadFile(event.target.files[0]);
      notify('Файл загружен.');
      await renderMedia();
    } catch (error) { notify(error.message, true); }
  });
  $$('[data-copy]', view).forEach((button) => button.addEventListener('click', async () => {
    await navigator.clipboard.writeText(button.dataset.copy);
    notify('Путь к файлу скопирован.');
  }));
  $$('[data-media-delete]', view).forEach((button) => button.addEventListener('click', async () => {
    if (!confirm('Удалить файл? Сначала убедитесь, что он не используется на сайте.')) return;
    try {
      await api(`/api/media/${button.dataset.mediaDelete}`, { method: 'DELETE' });
      notify('Файл удалён.');
      await renderMedia();
    } catch (error) { notify(error.message, true); }
  }));
};

const renderUsers = async () => {
  if (state.user.role !== 'admin') return navigate('dashboard');
  setHeading('Пользователи', 'Доступ к админке');
  const users = await api('/api/users');
  view.innerHTML = `
    <div class="section-head">
      <div><h2>Кто может менять сайт</h2><p>Редактор меняет содержимое. Администратор также управляет пользователями и файлами.</p></div>
      <button class="primary-button" id="new-user">Добавить пользователя</button>
    </div>
    <div class="user-list">
      ${users.map((user) => `<article class="user-row"><div class="user-avatar">${escapeHtml(user.name.charAt(0).toUpperCase())}</div><div><strong>${escapeHtml(user.name)}</strong><small>${escapeHtml(user.email)}</small></div><span class="status-pill ${user.active ? '' : 'draft'}">${user.active ? (user.role === 'admin' ? 'Администратор' : 'Редактор') : 'Отключён'}</span><button class="text-button" data-user="${user.id}">Изменить</button></article>`).join('')}
    </div>
  `;
  $('#new-user').addEventListener('click', () => openUserEditor());
  $$('[data-user]', view).forEach((button) => button.addEventListener('click', () => openUserEditor(users.find((user) => user.id === Number(button.dataset.user)))));
};

const openUserEditor = (user = null) => {
  $('#dialog-eyebrow').textContent = 'Доступ';
  $('#dialog-title').textContent = user ? `Пользователь: ${user.name}` : 'Новый пользователь';
  $('#dialog-body').innerHTML = `
    <form class="dialog-form" id="user-form">
      <div class="form-grid">
        <label>Имя<input name="name" required></label>
        <label>Электронная почта<input name="email" type="email" required></label>
        <label>Роль<select name="role"><option value="editor">Редактор</option><option value="admin">Администратор</option></select></label>
        <label>${user ? 'Новый пароль — только если хотите заменить' : 'Пароль'}<input name="password" type="password" ${user ? '' : 'required'} minlength="8" autocomplete="new-password"></label>
      </div>
      ${user ? '<div class="switch-row"><label><input name="active" type="checkbox">Доступ включён</label></div>' : ''}
      <div class="button-row"><button class="primary-button" type="submit">Сохранить</button><button class="secondary-button" type="button" id="cancel-user">Отмена</button></div>
    </form>
  `;
  const form = $('#user-form');
  if (user) {
    form.elements.name.value = user.name;
    form.elements.email.value = user.email;
    form.elements.role.value = user.role;
    form.elements.active.checked = user.active;
  }
  $('#cancel-user').addEventListener('click', () => dialog.close());
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (user) data.active = form.elements.active.checked;
    try {
      if (user) await api(`/api/users/${user.id}`, { method: 'PUT', body: data });
      else await api('/api/users', { method: 'POST', body: data });
      dialog.close();
      notify('Доступ пользователя сохранён.');
      await renderUsers();
    } catch (error) { notify(error.message, true); }
  });
  dialog.showModal();
};

api('/api/auth/me').then(showApp).catch(showLogin);
