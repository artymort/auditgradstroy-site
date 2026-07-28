(() => {
  if (location.pathname.startsWith('/cms')) return;

  const recipient = String(document.currentScript?.dataset.formRecipient || '').trim();
  const endpoint = recipient.includes('@')
    ? `https://formsubmit.co/ajax/${recipient}`
    : '';
  const forms = document.querySelectorAll('[data-static-form]');

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
      const originalHtml = button?.innerHTML || '';
      const phone = fieldValue(form, 'phone');

      if (!endpoint) {
        showStatus(status, 'Отправка временно недоступна. Позвоните нам по телефону.', 'error');
        return;
      }
      if (phone.replace(/\D/g, '').length < 7) {
        showStatus(status, 'Укажите корректный номер телефона.', 'error');
        findField(form, 'phone')?.focus();
        return;
      }

      if (button) {
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        button.textContent = 'Отправляем…';
      }
      showStatus(status, '', 'loading');

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            Имя: fieldValue(form, 'name'),
            Телефон: phone,
            'Кадастровый номер или адрес': fieldValue(form, 'cadastral'),
            Сообщение: fieldValue(form, 'message'),
            Форма: formTitle(form),
            Страница: location.href,
            '_subject': `Новая заявка с сайта — ${formTitle(form)}`,
            '_template': 'table',
            '_captcha': 'false',
            '_honey': fieldValue(form, 'website'),
          }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.success === false) {
          throw new Error(result.message || 'Не удалось отправить заявку.');
        }

        form.reset();
        showStatus(status, 'Спасибо! Заявка отправлена. Мы скоро свяжемся с вами.', 'success');
      } catch (error) {
        showStatus(status, error.message || 'Не удалось отправить заявку. Попробуйте ещё раз.', 'error');
      } finally {
        if (button) {
          button.disabled = false;
          button.removeAttribute('aria-busy');
          button.innerHTML = originalHtml;
        }
      }
    });
  });
})();
