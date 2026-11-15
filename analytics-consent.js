(() => {
  'use strict';
  const key = 'sobivan-analytics-consent-v1';
  let loaded = false;
  const read = () => { try { return localStorage.getItem(key); } catch { return null; } };
  const save = value => { try { localStorage.setItem(key, value); } catch { /* Choice remains valid for this page. */ } };
  function start() {
    if (loaded) return;
    loaded = true;
    window.ym = window.ym || function () { (window.ym.a = window.ym.a || []).push(arguments); };
    window.ym.l = Date.now();
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://mc.yandex.ru/metrika/tag.js?id=114260647';
    document.head.append(script);
    window.ym(114260647, 'init', {
      ssr: true, webvisor: false, clickmap: false,
      referrer: document.referrer, url: location.href,
      accurateTrackBounce: true, trackLinks: true
    });
  }
  const style = document.createElement('style');
  style.textContent = `.analytics-consent{position:fixed;bottom:16px;left:16px;right:16px;margin:auto;max-width:600px;z-index:10000;background:#181614;color:#eee7df;border:1px solid #655044;padding:20px;box-shadow:0 8px 40px #0008;font:14px/1.5 system-ui,sans-serif}.analytics-consent[hidden]{display:none}.analytics-consent p{margin:0 0 14px}.analytics-consent a{color:inherit;text-decoration:underline}.analytics-actions{display:flex;gap:10px;flex-wrap:wrap}.analytics-actions button,.analytics-settings{font:inherit;cursor:pointer;color:inherit;background:#29231f;border:1px solid #796658;padding:10px 16px;border-radius:4px}.analytics-settings{display:block;margin:24px auto;color:#c7bbb0;background:#181614;font:12px system-ui,sans-serif}.analytics-actions button:focus-visible,.analytics-settings:focus-visible{outline:2px solid #eee;outline-offset:3px}`;
  document.head.append(style);
  const panel = document.createElement('section');
  panel.className = 'analytics-consent';
  panel.setAttribute('aria-label', 'Настройки аналитики');
  panel.innerHTML = '<p>Разрешить Яндекс Метрику? Она использует cookie и данные о посещениях, чтобы мы понимали, как пользуются сайтом и переходят слушать музыку. Без Вебвизора. Отказ не ограничивает работу сайта. <a href="https://yandex.ru/legal/confidential/" target="_blank" rel="noopener noreferrer">Политика Яндекса</a></p><div class="analytics-actions"><button type="button" data-accept>Разрешить</button><button type="button" data-decline>Без аналитики</button></div>';
  const settings = document.createElement('button');
  settings.type = 'button';
  settings.className = 'analytics-settings';
  settings.textContent = 'Настройки аналитики';
  settings.addEventListener('click', () => { panel.hidden = false; panel.querySelector('[data-accept]').focus(); });
  panel.querySelector('[data-accept]').addEventListener('click', () => { save('accepted'); panel.hidden = true; start(); settings.focus(); });
  panel.querySelector('[data-decline]').addEventListener('click', () => {
    save('declined'); panel.hidden = true;
    if (loaded) {
      window.ym(114260647, 'destruct');
      // Reload without loading the counter again, stopping its pending work.
      location.reload();
    } else { settings.focus(); }
  });
  document.body.append(panel, settings);
  const choice = read();
  panel.hidden = choice === 'accepted' || choice === 'declined';
  if (choice === 'accepted') start();
})();
