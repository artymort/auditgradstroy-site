(function () {
  'use strict';

  function initMobileNavigation() {
    var buttons = document.querySelectorAll('[data-menu-button]');

    Array.prototype.forEach.call(buttons, function (button) {
      if (button.getAttribute('data-menu-ready') === 'true') return;

      var header = button.closest('.header');
      var menu = header && header.querySelector('[data-mobile-menu]');
      if (!header || !menu) return;

      button.setAttribute('data-menu-ready', 'true');

      function setOpen(open) {
        button.classList.toggle('is-open', open);
        menu.classList.toggle('is-open', open);
        button.setAttribute('aria-expanded', String(open));
        button.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
        menu.setAttribute('aria-hidden', String(!open));
      }

      button.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        setOpen(button.getAttribute('aria-expanded') !== 'true');
      });

      menu.addEventListener('click', function (event) {
        if (event.target.closest('a')) setOpen(false);
      });

      document.addEventListener('click', function (event) {
        if (button.getAttribute('aria-expanded') === 'true' && !header.contains(event.target)) {
          setOpen(false);
        }
      });

      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') {
          setOpen(false);
          button.focus();
        }
      });

      window.addEventListener('resize', function () {
        if (window.innerWidth > 1180) setOpen(false);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileNavigation, { once: true });
  } else {
    initMobileNavigation();
  }
}());
