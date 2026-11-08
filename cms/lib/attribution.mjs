const fields = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'yclid', 'gclid'];

const clean = (value, limit = 200) => String(typeof value === 'string' ? value : '')
  .replace(/[\u0000-\u001f\u007f]/g, ' ')
  .trim()
  .slice(0, limit);

export const normalizeAttribution = (input) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const result = {};
  for (const key of fields) {
    const value = clean(input[key]);
    if (value) result[key] = value;
  }
  const landingPage = clean(input.landingPage, 300);
  if (landingPage.startsWith('/') && !landingPage.startsWith('//')) result.landingPage = landingPage;
  const referrerHost = clean(input.referrerHost, 200).toLowerCase();
  if (/^[a-z0-9а-яё.-]+(?::\d{1,5})?$/iu.test(referrerHost)) result.referrerHost = referrerHost;
  return result;
};

export const attributionLabel = (data) => {
  const source = (data.utm_source || '').toLowerCase();
  const medium = (data.utm_medium || '').toLowerCase();
  if (data.yclid) return 'Реклама — Яндекс';
  if (data.gclid) return 'Реклама — Google';
  if (['cpc', 'ppc', 'paid', 'paidsearch', 'display', 'cpm'].includes(medium)) {
    return source ? `Платная реклама — ${data.utm_source}` : 'Платная реклама (UTM)';
  }
  if (data.utm_source || data.utm_medium || data.utm_campaign) return 'Переход с UTM-метками';
  if (/^(www\.)?(yandex\.|google\.|ya\.ru|bing\.)/iu.test(data.referrerHost || '')) {
    return 'Поиск — вероятно органический';
  }
  if (data.referrerHost) return `Переход с ${data.referrerHost}`;
  return 'Прямой переход или источник не определён';
};

export const attributionRows = (data) => [
  ['Источник', attributionLabel(data)],
  ['UTM source', data.utm_source],
  ['UTM medium', data.utm_medium],
  ['UTM campaign', data.utm_campaign],
  ['UTM content', data.utm_content],
  ['UTM term', data.utm_term],
  ['Yandex click ID', data.yclid],
  ['Google click ID', data.gclid],
  ['Сайт перехода', data.referrerHost],
  ['Первая страница', data.landingPage],
].filter(([, value]) => value);
