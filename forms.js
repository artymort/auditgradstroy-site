(() => {
  if (location.pathname.startsWith('/cms')) return;

  const endpoint = '/api/leads';
  const forms = document.querySelectorAll('[data-static-form]');
  const attributionKey = 'gradstroyaudit:lead-attribution:v1';
  const trackingKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'yclid', 'gclid'];
  const readAttribution = () => {
    let saved = {};
    try {
      saved = JSON.parse(sessionStorage.getItem(attributionKey) || '{}') || {};
    } catch {
      // Private browsing can disable session storage; current-page tags still work.
    }
    const params = new URLSearchParams(location.search);
    const tagged = Object.fromEntries(trackingKeys
      .map((key) => [key, (params.get(key) || '').trim().slice(0, 200)])
      .filter(([, value]) => value));
    if (Object.keys(tagged).length) {
      saved = { ...tagged, landingPage: location.pathname };
    } else if (!saved.landingPage) {
      saved.landingPage = location.pathname;
      try {
        const referrer = new URL(document.referrer);
        if (referrer.host !== location.host) saved.referrerHost = referrer.host;
      } catch {
        // Referrer is optional and may be withheld by the browser.
      }
    }
    try {
      sessionStorage.setItem(attributionKey, JSON.stringify(saved));
    } catch {
      // Submission remains available without browser storage.
    }
    return saved;
  };
  const attribution = readAttribution();
  let noticeTimer = 0;
  let captchaScriptPromise;
  const captchaConfigPromise = fetch('/api/captcha/config', {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  }).then(async (response) => {
    if (!response.ok) throw new Error('Настройки проверки недоступны.');
    return response.json();
  }).catch(() => ({ unavailable: true }));

  const loadSmartCaptcha = () => {
    if (window.smartCaptcha) return Promise.resolve(window.smartCaptcha);
    if (!captchaScriptPromise) {
      captchaScriptPromise = new Promise((resolve, reject) => {
        const callbackName = '__gradstroySmartCaptchaReady';
        const script = document.createElement('script');
        let finished = false;
        const finish = (error) => {
          if (finished) return;
          finished = true;
          window.clearTimeout(timeout);
          delete window[callbackName];
          if (error || !window.smartCaptcha) {
            script.remove();
            reject(error || new Error('Не удалось загрузить проверку.'));
          } else {
            resolve(window.smartCaptcha);
          }
        };
        window[callbackName] = () => finish();
        script.src = `https://smartcaptcha.cloud.yandex.ru/captcha.js?render=onload&onload=${callbackName}`;
        script.async = true;
        script.onerror = () => finish(new Error('Не удалось загрузить проверку.'));
        const timeout = window.setTimeout(() => finish(new Error('Проверка не ответила.')), 12_000);
        document.head.append(script);
      }).catch((error) => {
        captchaScriptPromise = null;
        throw error;
      });
    }
    return captchaScriptPromise;
  };

  const getCaptchaToken = (siteKey) => new Promise((resolve, reject) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'lead-captcha-dialog';
    dialog.setAttribute('aria-labelledby', 'lead-captcha-title');
    dialog.innerHTML = `
      <div class="lead-captcha-dialog__head">
        <h2 id="lead-captcha-title">Подтвердите отправку заявки</h2>
        <button type="button" aria-label="Закрыть проверку">×</button>
      </div>
      <p>Перед отправкой передвиньте ползунок вправо.</p>
      <div class="lead-captcha-dialog__widget"></div>
    `;
    document.body.append(dialog);

    let finished = false;
    let widgetId;
    const finish = (error, token) => {
      if (finished) return;
      finished = true;
      if (dialog.open) dialog.close();
      if (widgetId !== undefined && window.smartCaptcha) {
        try {
          window.smartCaptcha.destroy(widgetId);
        } catch {
          // The widget may already be gone after closing the challenge.
        }
      }
      dialog.remove();
      if (error) reject(error);
      else resolve(token);
    };
    dialog.querySelector('button').addEventListener('click', () => {
      const error = new Error('Проверка отменена.');
      error.cancelled = true;
      finish(error);
    });
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      const error = new Error('Проверка отменена.');
      error.cancelled = true;
      finish(error);
    });
    dialog.showModal();

    loadSmartCaptcha().then((captcha) => {
      if (finished) return;
      widgetId = captcha.render(dialog.querySelector('.lead-captcha-dialog__widget'), {
        sitekey: siteKey,
        hl: 'ru',
        callback: (token) => {
          if (token) finish(null, token);
        },
      });
      captcha.subscribe(widgetId, 'network-error', () => {
        finish(new Error('Проверка не загрузилась. Повторите попытку или позвоните нам.'));
      });
      captcha.subscribe(widgetId, 'javascript-error', () => {
        finish(new Error('Проверка не загрузилась. Повторите попытку или позвоните нам.'));
      });
    }).catch((error) => finish(error));
  });

  const notice = document.createElement('div');
  notice.className = 'form-notice';
  notice.setAttribute('aria-live', 'polite');
  notice.innerHTML = `
    <span class="form-notice__icon" aria-hidden="true">✓</span>
    <div>
      <strong></strong>
      <p></p>
    </div>
    <button type="button" aria-label="Закрыть уведомление">×</button>
  `;
  document.body.append(notice);

  const hideNotice = () => {
    notice.classList.remove('is-visible');
  };

  notice.querySelector('button').addEventListener('click', hideNotice);

  const showNotice = (title, message, state) => {
    clearTimeout(noticeTimer);
    notice.className = `form-notice form-notice--${state}`;
    notice.setAttribute('role', state === 'error' ? 'alert' : 'status');
    notice.querySelector('strong').textContent = title;
    notice.querySelector('p').textContent = message;
    notice.querySelector('.form-notice__icon').textContent = state === 'error' ? '!' : '✓';
    requestAnimationFrame(() => notice.classList.add('is-visible'));
    noticeTimer = window.setTimeout(hideNotice, state === 'error' ? 9_000 : 6_000);
  };

  const findField = (form, name) => (
    form.querySelector(`[name="${name}"]`)
    || form.querySelector(`[id*="${name}"]`)
  );

  const fieldValue = (form, name) => String(findField(form, name)?.value || '').trim();
  const isValidRussianPhone = (value) => (
    value.length <= 24
    && /^(?:8\d{10}|\+7\d{10})$/.test(value.replace(/[\s()-]/g, ''))
  );

  const formTitle = (form) => {
    if (form.dataset.formName) return form.dataset.formName;
    const section = form.closest('section');
    const heading = section?.querySelector('h1, h2, h3');
    return heading?.textContent?.trim() || 'Форма обратной связи';
  };

  const showStatus = (status, message, state) => {
    status.textContent = message;
    status.dataset.state = state;
  };

  forms.forEach((form) => {
    let startedAt = Date.now();
    let submitting = false;
    const trap = document.createElement('label');
    trap.className = 'form-trap';
    trap.setAttribute('aria-hidden', 'true');
    trap.innerHTML = '<span>Не заполняйте это поле</span><input name="website" tabindex="-1" autocomplete="off">';
    form.append(trap);

    const status = document.createElement('p');
    status.className = 'form-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    form.append(status);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (submitting) return;
      const button = form.querySelector('button[type="submit"]');
      const buttonLabel = button?.querySelector('span');
      const originalLabel = buttonLabel?.textContent || '';
      const phone = fieldValue(form, 'phone');

      if (!endpoint) {
        const message = 'Отправка временно недоступна. Позвоните нам по телефону.';
        showStatus(status, message, 'error');
        showNotice('Заявка не отправлена', message, 'error');
        return;
      }
      if (!isValidRussianPhone(phone)) {
        const message = 'Введите корректный номер телефона.';
        showStatus(status, message, 'error');
        showNotice('Проверьте номер телефона', message, 'error');
        findField(form, 'phone')?.focus();
        return;
      }

      submitting = true;
      if (button) {
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        if (buttonLabel) buttonLabel.textContent = 'Проверяем…';
      }
      showStatus(status, '', 'loading');

      let requestTimeout = 0;
      try {
        const captchaConfig = await captchaConfigPromise;
        if (captchaConfig.unavailable || (captchaConfig.enabled && !captchaConfig.siteKey)) {
          throw new Error('Проверка временно недоступна. Повторите попытку позже или позвоните нам.');
        }
        const captchaToken = captchaConfig.enabled
          ? await getCaptchaToken(captchaConfig.siteKey)
          : '';
        if (buttonLabel) buttonLabel.textContent = 'Отправляем…';
        const lead = {
          name: fieldValue(form, 'name'),
          phone,
          cadastral: fieldValue(form, 'cadastral'),
          message: fieldValue(form, 'message'),
          form: formTitle(form),
          page: `${location.pathname}${location.search}`,
          pageTitle: document.title,
          attribution,
          website: fieldValue(form, 'website'),
          startedAt,
          captchaToken,
        };
        const controller = new AbortController();
        requestTimeout = window.setTimeout(() => controller.abort(), 15_000);
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify(lead),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.success === false) {
          throw new Error(result.error || result.message || 'Не удалось отправить заявку.');
        }

        form.reset();
        startedAt = Date.now();
        const message = 'Спасибо! Мы получили ваши данные и скоро свяжемся с вами.';
        showStatus(status, 'Заявка успешно отправлена.', 'success');
        showNotice('Заявка успешно отправлена', message, 'success');
      } catch (error) {
        if (error.cancelled) {
          showStatus(status, '', 'idle');
          return;
        }
        const message = error.name === 'AbortError'
          ? 'Сервер не ответил. Повторите попытку или свяжитесь с нами по телефону.'
          : error.message || 'Попробуйте ещё раз или свяжитесь с нами по телефону.';
        showStatus(status, message, 'error');
        showNotice('Заявка не отправлена', message, 'error');
      } finally {
        window.clearTimeout(requestTimeout);
        submitting = false;
        if (button) {
          button.disabled = false;
          button.removeAttribute('aria-busy');
          if (buttonLabel) buttonLabel.textContent = originalLabel;
        }
      }
    });
  });
})();
