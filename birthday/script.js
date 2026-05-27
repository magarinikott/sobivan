document.addEventListener('DOMContentLoaded', () => {
  const config = window.RSVP_CONFIG || {};
  const form = document.querySelector('.rsvp-form');
  const feedback = document.querySelector('.rsvp-feedback');
  const feedbackTitle = feedback?.querySelector('.rsvp-feedback-title');
  const feedbackText = feedback?.querySelector('.rsvp-feedback-text');
  const telegramCta = feedback?.querySelector('.rsvp-telegram-cta');

  if (form) {
    const submitButton = form.querySelector('button[type="submit"]');
    const attendanceType = form.querySelector('[name="attendance_type"]');
    const guestCount = form.querySelector('[name="guest_count"]');

    attendanceType?.addEventListener('change', () => {
      if (!guestCount) return;
      if (attendanceType.value === 'solo') guestCount.value = '1';
      if (attendanceType.value === 'plus_one' && Number(guestCount.value || 0) < 2) guestCount.value = '2';
      if (attendanceType.value === 'group' && Number(guestCount.value || 0) < 3) guestCount.value = '3';
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const validationError = validateForm(form);
      if (validationError) {
        renderFeedback({
          type: 'error',
          title: 'нужно поправить форму',
          text: validationError,
        });
        return;
      }

      if (!config.apiBaseUrl || config.apiBaseUrl.includes('PASTE_')) {
        renderFeedback({
          type: 'error',
          title: 'форма ещё не привязана',
          text: 'заполни /Users/kseniasoboleva/Desktop/кодекс /сайты/sobivan-event/rsvp-config.js: вставь URL Cloudflare Worker.',
        });
        return;
      }

      const payload = buildPayload(form, config);
      submitViaWorker(form, payload, config, submitButton);
    });
  }


  initFriendsCarousel();

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });


  function initFriendsCarousel() {
    const carousel = document.querySelector('.js-friends-carousel');
    if (!carousel) return;

    const viewport = carousel.querySelector('.friends-carousel__viewport');
    const track = carousel.querySelector('.friends-carousel__track');
    const slides = Array.from(track.querySelectorAll('.polaroid-slide'));
    if (!viewport || !track || !slides.length) return;

    shuffle(slides).forEach((slide, index) => {
      const tilt = Number.parseFloat(slide.dataset.tilt || '0') || 0;
      slide.style.setProperty('--tilt', `${tilt}deg`);
      track.appendChild(slide);
    });

    let autoTimer = null;
    let isPointerDown = false;
    let startX = 0;
    let startScroll = 0;

    const step = () => slides[0]?.getBoundingClientRect().width + 8 || 320;

    const stopAuto = () => {
      if (autoTimer) window.clearInterval(autoTimer);
      autoTimer = null;
    };

    const startAuto = () => {
      stopAuto();
      autoTimer = window.setInterval(() => {
        viewport.scrollBy({ left: step(), behavior: 'smooth' });
        window.setTimeout(() => recycleIfNeeded(), 420);
      }, 2400);
    };

    const recycleIfNeeded = () => {
      const first = track.firstElementChild;
      if (!first) return;
      const firstWidth = first.getBoundingClientRect().width + 8;
      while (viewport.scrollLeft > firstWidth) {
        viewport.scrollLeft -= firstWidth;
        track.appendChild(track.firstElementChild);
      }
      while (viewport.scrollLeft < 0 && track.lastElementChild) {
        track.prepend(track.lastElementChild);
        viewport.scrollLeft += firstWidth;
      }
    };

    viewport.addEventListener('wheel', (event) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      viewport.scrollLeft += event.deltaY;
      recycleIfNeeded();
    }, { passive: false });

    viewport.addEventListener('pointerdown', (event) => {
      isPointerDown = true;
      startX = event.clientX;
      startScroll = viewport.scrollLeft;
      viewport.classList.add('is-dragging');
      stopAuto();
    });

    window.addEventListener('pointerup', () => {
      if (!isPointerDown) return;
      isPointerDown = false;
      viewport.classList.remove('is-dragging');
      recycleIfNeeded();
      startAuto();
    });

    viewport.addEventListener('pointermove', (event) => {
      if (!isPointerDown) return;
      const dx = event.clientX - startX;
      viewport.scrollLeft = startScroll - dx;
      recycleIfNeeded();
    });

    carousel.addEventListener('mouseenter', stopAuto);
    carousel.addEventListener('mouseleave', startAuto);
    startAuto();
  }

  function shuffle(items) {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function submitViaWorker(formEl, payload, runtimeConfig, submitButton) {
    const controller = new AbortController();

    const timeout = window.setTimeout(() => {
      controller.abort();
    }, runtimeConfig.submitTimeoutMs || 18000);

    setSubmitting(submitButton, true);
    renderFeedback({
      type: 'pending',
      title: 'отправляем заявку…',
      text: 'секунду. сейчас сохраним тебя в список.',
    });

    fetch(`${runtimeConfig.apiBaseUrl.replace(/\/$/, '')}/api/rsvp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok || !data || !data.ok) {
          throw new Error(data?.message || 'не удалось отправить заявку.');
        }

        formEl.reset();
        const guestCount = formEl.querySelector('[name="guest_count"]');
        if (guestCount) guestCount.value = '1';

        renderFeedback({
          type: 'success',
          title: 'заявка принята',
          text: 'теперь открой бота и нажми start — без этого бот не сможет прислать напоминание.',
          deeplink: data.bot_deeplink,
        });
      })
      .catch((error) => {
        renderFeedback({
          type: 'error',
          title: error?.name === 'AbortError' ? 'ответ не пришёл' : 'заявку не удалось отправить',
          text: error?.name === 'AbortError'
            ? 'Worker не ответил вовремя. проверь dev server или production deploy.'
            : (error?.message || 'попробуй ещё раз чуть позже.'),
        });
      })
      .finally(() => {
        window.clearTimeout(timeout);
        setSubmitting(submitButton, false);
      });
  }

  function buildPayload(formEl, runtimeConfig) {
    const formData = new FormData(formEl);
    const attendanceType = formData.get('attendance_type');
    const guestCount = normalizeGuestCount(attendanceType, formData.get('guest_count'));

    return {
      source: 'site_form',
      event_slug: runtimeConfig.eventSlug || 'sobivan-birthday',
      event_title: runtimeConfig.eventTitle || 'День рождения SOBIVAN',
      site_origin: window.location.origin || runtimeConfig.siteOrigin || '*',
      name: `${formData.get('name') || ''}`.trim(),
      contact: `${formData.get('contact') || ''}`.trim(),
      attendance_type: attendanceType,
      guest_count: guestCount,
      note: `${formData.get('note') || ''}`.trim(),
      consent_contact: formData.get('consent_contact') === 'on',
    };
  }

  function normalizeGuestCount(attendanceType, rawValue) {
    const numeric = Number.parseInt(`${rawValue || ''}`, 10);
    if (Number.isFinite(numeric) && numeric > 0) {
      if (attendanceType === 'solo') return 1;
      if (attendanceType === 'plus_one') return Math.max(2, numeric);
      if (attendanceType === 'group') return Math.max(3, numeric);
      return numeric;
    }

    if (attendanceType === 'solo') return 1;
    if (attendanceType === 'plus_one') return 2;
    return 3;
  }

  function validateForm(formEl) {
    const name = formEl.querySelector('[name="name"]')?.value.trim();
    const contact = formEl.querySelector('[name="contact"]')?.value.trim();
    const attendanceType = formEl.querySelector('[name="attendance_type"]')?.value;
    const consent = formEl.querySelector('[name="consent_contact"]')?.checked;
    const guestCount = normalizeGuestCount(attendanceType, formEl.querySelector('[name="guest_count"]')?.value);

    if (!name || name.length < 2) return 'нужно имя хотя бы из 2 символов.';
    if (!contact || contact.length < 3) return 'нужен telegram или телефон.';
    if (!['solo', 'plus_one', 'group'].includes(attendanceType)) return 'выбери, как ты идёшь.';
    if (!Number.isFinite(guestCount) || guestCount < 1) return 'укажи корректное количество гостей.';
    if (!consent) return 'нужно согласие на связь по заявке.';
    return '';
  }

  function setSubmitting(button, isSubmitting) {
    if (!button) return;
    button.disabled = isSubmitting;
    button.classList.toggle('is-loading', isSubmitting);
    button.setAttribute('aria-busy', isSubmitting ? 'true' : 'false');
  }

  function renderFeedback({ type, title, text, deeplink }) {
    if (!feedback || !feedbackTitle || !feedbackText || !telegramCta) return;
    feedback.hidden = false;
    feedback.dataset.state = type;
    feedbackTitle.textContent = title || '';
    feedbackText.textContent = text || '';

    if (deeplink) {
      telegramCta.href = deeplink;
      telegramCta.hidden = false;
    } else {
      telegramCta.hidden = true;
      telegramCta.removeAttribute('href');
    }
  }
});
