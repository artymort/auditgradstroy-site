(() => {
  if (location.pathname.startsWith('/cms')) return;

  const endpoint = '/api/leads';
  const forms = document.querySelectorAll('[data-static-form]');
  let noticeTimer = 0;

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
      if (phone.replace(/\D/g, '').length < 7) {
        const message = 'Укажите корректный номер телефона.';
        showStatus(status, message, 'error');
        showNotice('Проверьте номер телефона', message, 'error');
        findField(form, 'phone')?.focus();
        return;
      }

      if (button) {
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        if (buttonLabel) buttonLabel.textContent = 'Отправляем…';
      }
      showStatus(status, '', 'loading');

      const controller = new AbortController();
      const requestTimeout = window.setTimeout(() => controller.abort(), 15_000);
      try {
        const lead = {
          name: fieldValue(form, 'name'),
          phone,
          cadastral: fieldValue(form, 'cadastral'),
          message: fieldValue(form, 'message'),
          form: formTitle(form),
          page: `${location.pathname}${location.search}`,
          pageTitle: document.title,
          website: fieldValue(form, 'website'),
          startedAt,
        };
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
        const message = error.name === 'AbortError'
          ? 'Сервер не ответил. Повторите попытку или свяжитесь с нами по телефону.'
          : error.message || 'Попробуйте ещё раз или свяжитесь с нами по телефону.';
        showStatus(status, message, 'error');
        showNotice('Заявка не отправлена', message, 'error');
      } finally {
        window.clearTimeout(requestTimeout);
        if (button) {
          button.disabled = false;
          button.removeAttribute('aria-busy');
          if (buttonLabel) buttonLabel.textContent = originalLabel;
        }
      }
    });
  });
})();
