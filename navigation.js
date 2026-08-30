(function () {
  'use strict';

  function initDesktopNavigation() {
    var dropdowns = document.querySelectorAll('[data-nav-dropdown]');

    Array.prototype.forEach.call(dropdowns, function (dropdown) {
      if (dropdown.getAttribute('data-dropdown-ready') === 'true') return;

      var button = dropdown.querySelector('[data-nav-dropdown-button]');
      if (!button) return;
      dropdown.setAttribute('data-dropdown-ready', 'true');

      function setOpen(open) {
        dropdown.classList.toggle('is-open', open);
        button.setAttribute('aria-expanded', String(open));
      }

      button.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        setOpen(button.getAttribute('aria-expanded') !== 'true');
      });

      dropdown.addEventListener('mouseleave', function () {
        if (!dropdown.contains(document.activeElement)) setOpen(false);
      });

      dropdown.addEventListener('focusout', function (event) {
        if (!dropdown.contains(event.relatedTarget)) setOpen(false);
      });

      document.addEventListener('click', function (event) {
        if (!dropdown.contains(event.target)) setOpen(false);
      });

      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') {
          setOpen(false);
          button.focus();
        }
      });
    });
  }

  function initMobileNavigation() {
    var buttons = document.querySelectorAll('[data-menu-button]');

    Array.prototype.forEach.call(buttons, function (button) {
      if (button.getAttribute('data-menu-ready') === 'true') return;

      var header = button.closest('.header');
      var menu = header && header.querySelector('[data-mobile-menu]');
      if (!header || !menu) return;

      button.setAttribute('data-menu-ready', 'true');
      var submenuButtons = menu.querySelectorAll('[data-mobile-submenu-button]');

      Array.prototype.forEach.call(submenuButtons, function (submenuButton) {
        submenuButton.addEventListener('click', function (event) {
          event.preventDefault();
          event.stopPropagation();
          var submenu = submenuButton.closest('[data-mobile-submenu]');
          var open = submenuButton.getAttribute('aria-expanded') !== 'true';
          submenu.classList.toggle('is-open', open);
          submenuButton.setAttribute('aria-expanded', String(open));
        });
      });

      function setOpen(open) {
        button.classList.toggle('is-open', open);
        menu.classList.toggle('is-open', open);
        button.setAttribute('aria-expanded', String(open));
        button.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
        menu.setAttribute('aria-hidden', String(!open));
        if (!open) {
          Array.prototype.forEach.call(submenuButtons, function (submenuButton) {
            submenuButton.setAttribute('aria-expanded', 'false');
            submenuButton.closest('[data-mobile-submenu]').classList.remove('is-open');
          });
        }
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
    document.addEventListener('DOMContentLoaded', function () {
      initDesktopNavigation();
      initMobileNavigation();
    }, { once: true });
  } else {
    initDesktopNavigation();
    initMobileNavigation();
  }
}());
