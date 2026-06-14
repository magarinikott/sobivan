document.addEventListener('DOMContentLoaded', () => {
  const config = window.RSVP_CONFIG || {};
  const form = document.querySelector('.rsvp-form');
  const feedback = document.querySelector('.rsvp-feedback');
  const feedbackTitle = feedback?.querySelector('.rsvp-feedback-title');
  const feedbackText = feedback?.querySelector('.rsvp-feedback-text');
  const telegramCta = feedback?.querySelector('.rsvp-telegram-cta');

  if (form) {
    const submitButton = form.querySelector('button[type="submit"]');

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
          text: 'форма ещё не привязана: нужно указать URL обработчика RSVP.',
        });
        return;
      }

      const payload = buildPayload(form, config);
      submitViaWorker(form, payload, config, submitButton);
    });
  }


  initGiftModal();
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



  function initGiftModal() {
    const modal = document.getElementById('gift-modal');
    const openButton = document.querySelector('[data-gift-modal-open]');
    if (!modal || !openButton) return;

    const dialog = modal.querySelector('.gift-modal__dialog');
    const closeButtons = modal.querySelectorAll('[data-gift-modal-close]');
    const copyButtons = modal.querySelectorAll('[data-copy-text]');
    const body = document.body;
    let lastFocused = null;
    let scrollY = 0;

    const lockBodyScroll = () => {
      scrollY = window.scrollY || window.pageYOffset || 0;
      body.style.position = 'fixed';
      body.style.top = `-${scrollY}px`;
      body.style.left = '0';
      body.style.right = '0';
      body.style.width = '100%';
      body.style.overflow = 'hidden';
    };

    const unlockBodyScroll = () => {
      body.style.position = '';
      body.style.top = '';
      body.style.left = '';
      body.style.right = '';
      body.style.width = '';
      body.style.overflow = '';
      window.scrollTo(0, scrollY);
    };

    const closeModal = () => {
      modal.hidden = true;
      modal.setAttribute('aria-hidden', 'true');
      body.classList.remove('gift-modal-open');
      unlockBodyScroll();
      lastFocused?.focus?.();
    };

    const openModal = () => {
      lastFocused = document.activeElement;
      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
      body.classList.add('gift-modal-open');
      lockBodyScroll();
      if (dialog) dialog.scrollTop = 0;
      window.setTimeout(() => {
        modal.querySelector('.gift-modal__close')?.focus();
      }, 20);
    };

    openButton.addEventListener('click', openModal);
    closeButtons.forEach((button) => button.addEventListener('click', closeModal));

    modal.addEventListener('click', (event) => {
      if (!dialog.contains(event.target)) closeModal();
    });

    dialog?.addEventListener('click', (event) => {
      event.stopPropagation();
    });

    modal.addEventListener('touchmove', (event) => {
      if (!dialog?.contains(event.target)) {
        event.preventDefault();
      }
    }, { passive: false });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !modal.hidden) closeModal();
    });

    copyButtons.forEach((button) => {
      button.addEventListener('click', async () => {
        const text = button.dataset.copyText || '';
        if (!text) return;
        const original = button.textContent;
        const copied = await copyText(text);
        button.textContent = copied ? 'номер скопирован' : 'не скопировалось';
        button.classList.toggle('is-copied', copied);
        window.setTimeout(() => {
          button.textContent = original;
          button.classList.remove('is-copied');
        }, 1800);
      });
    });
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (error) {
      // fallback below
    }

    try {
      const helper = document.createElement('textarea');
      helper.value = text;
      helper.setAttribute('readonly', '');
      helper.style.position = 'absolute';
      helper.style.left = '-9999px';
      document.body.appendChild(helper);
      helper.select();
      const copied = document.execCommand('copy');
      helper.remove();
      return copied;
    } catch (error) {
      return false;
    }
  }

  function initFriendsCarousel() {
    const carousel = document.querySelector('.js-friends-carousel');
    if (!carousel) return;

    const viewport = carousel.querySelector('.friends-carousel__viewport');
    const track = carousel.querySelector('.friends-carousel__track');
    const slides = Array.from(track.querySelectorAll('.polaroid-slide'));
    if (!viewport || !track || !slides.length) return;

    const controls = document.createElement('div');
    controls.className = 'friends-carousel__controls';
    controls.innerHTML = `
      <button class="friends-carousel__button friends-carousel__button--prev" type="button" aria-label="предыдущее фото">←</button>
      <button class="friends-carousel__button friends-carousel__button--next" type="button" aria-label="следующее фото">→</button>
    `;
    carousel.appendChild(controls);

    const prevButton = controls.querySelector('.friends-carousel__button--prev');
    const nextButton = controls.querySelector('.friends-carousel__button--next');

    const orderedSlides = shuffle(slides);
    orderedSlides.forEach((slide) => {
      const tilt = Number.parseFloat(slide.dataset.tilt || '0') || 0;
      slide.style.setProperty('--tilt', `${tilt}deg`);
      track.appendChild(slide);
    });

    let isPointerDown = false;
    let activePointerId = null;
    let startX = 0;
    let startScroll = 0;
    let autoTimer = null;

    const getCenterX = () => viewport.scrollLeft + viewport.clientWidth / 2;

    const getClosestSlide = () => {
      const centerX = getCenterX();
      return orderedSlides.reduce((closest, slide) => {
        const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
        if (!closest) return slide;
        const closestCenter = closest.offsetLeft + closest.offsetWidth / 2;
        return Math.abs(slideCenter - centerX) < Math.abs(closestCenter - centerX) ? slide : closest;
      }, null);
    };

    const centerSlide = (slide, behavior = 'smooth') => {
      if (!slide) return;
      const left = slide.offsetLeft - (viewport.clientWidth - slide.offsetWidth) / 2;
      viewport.scrollTo({ left: Math.max(0, left), behavior });
    };

    const getNextSlide = () => {
      const current = getClosestSlide();
      const currentIndex = Math.max(0, orderedSlides.indexOf(current));
      const isLast = currentIndex >= orderedSlides.length - 1;
      return {
        slide: orderedSlides[isLast ? 0 : currentIndex + 1],
        wraps: isLast,
      };
    };

    const getPrevSlide = () => {
      const current = getClosestSlide();
      const currentIndex = Math.max(0, orderedSlides.indexOf(current));
      const isFirst = currentIndex <= 0;
      return {
        slide: orderedSlides[isFirst ? orderedSlides.length - 1 : currentIndex - 1],
        wraps: isFirst,
      };
    };

    const stopAuto = () => {
      if (autoTimer) window.clearInterval(autoTimer);
      autoTimer = null;
    };

    const startAuto = () => {
      stopAuto();
      autoTimer = window.setInterval(() => {
        if (isPointerDown) return;
        const next = getNextSlide();
        if (!next?.slide) return;
        centerSlide(next.slide, next.wraps ? 'auto' : 'smooth');
      }, 2600);
    };

    viewport.addEventListener('wheel', (event) => {
      const absX = Math.abs(event.deltaX);
      const absY = Math.abs(event.deltaY);
      if (absY <= absX) return;
      event.preventDefault();
      viewport.scrollLeft += event.deltaY;
    }, { passive: false });

    viewport.addEventListener('pointerdown', (event) => {
      isPointerDown = true;
      activePointerId = event.pointerId;
      startX = event.clientX;
      startScroll = viewport.scrollLeft;
      viewport.classList.add('is-dragging');
      viewport.setPointerCapture?.(event.pointerId);
      stopAuto();
    });

    viewport.addEventListener('pointermove', (event) => {
      if (!isPointerDown || event.pointerId !== activePointerId) return;
      const dx = event.clientX - startX;
      viewport.scrollLeft = startScroll - dx;
    });

    const releasePointer = () => {
      if (!isPointerDown) return;
      isPointerDown = false;
      activePointerId = null;
      viewport.classList.remove('is-dragging');
      centerSlide(getClosestSlide(), 'smooth');
      startAuto();
    };

    viewport.addEventListener('pointerup', releasePointer);
    viewport.addEventListener('pointercancel', releasePointer);
    viewport.addEventListener('lostpointercapture', releasePointer);

    carousel.addEventListener('mouseenter', stopAuto);
    carousel.addEventListener('mouseleave', startAuto);
    prevButton?.addEventListener('click', () => {
      stopAuto();
      const prev = getPrevSlide();
      centerSlide(prev?.slide, prev?.wraps ? 'auto' : 'smooth');
      startAuto();
    });
    nextButton?.addEventListener('click', () => {
      stopAuto();
      const next = getNextSlide();
      centerSlide(next?.slide, next?.wraps ? 'auto' : 'smooth');
      startAuto();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopAuto();
      else startAuto();
    });

    centerSlide(orderedSlides[0], 'auto');
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

  function reportClientIssue(runtimeConfig, details = {}) {
    const apiBaseUrl = String(runtimeConfig?.apiBaseUrl || '').trim();
    if (!apiBaseUrl || apiBaseUrl.includes('PASTE_')) return;

    const body = JSON.stringify({
      ...details,
      page_url: window.location.href,
      user_agent: navigator.userAgent || ''
    });

    const url = `${apiBaseUrl.replace(/\/$/, '')}/api/client-error`;

    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'text/plain;charset=UTF-8' });
        navigator.sendBeacon(url, blob);
        return;
      }
    } catch (error) {
      // fallback below
    }

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body,
      keepalive: true,
    }).catch(() => {});
  }

  async function submitViaWorker(formEl, payload, runtimeConfig, submitButton) {
    const apiBase = runtimeConfig.apiBaseUrl.replace(/\/$/, '');
    const apiUrl = `${apiBase}/api/rsvp`;
    const fallbackUrl = `${apiBase}/api/rsvp-lite`;
    const statusUrl = `${apiBase}/api/rsvp-status`;

    function isTransientError(error) {
      return error?.name === 'AbortError' || error instanceof TypeError;
    }

    async function checkSubmissionStatus(timeoutMs) {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => {
        controller.abort();
      }, timeoutMs);

      try {
        const params = new URLSearchParams({
          event_slug: String(payload.event_slug || ''),
          contact: String(payload.contact || ''),
          _ts: String(Date.now()),
        });
        const response = await fetch(`${statusUrl}?${params.toString()}`, {
          method: 'GET',
          signal: controller.signal,
          cache: 'no-store',
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.ok || !data?.found || !data?.bot_deeplink) return null;
        return data;
      } catch (error) {
        return null;
      } finally {
        window.clearTimeout(timeout);
      }
    }

    async function parseResponse(response) {
      const data = await response.json().catch(() => null);
      if (!response.ok || !data || !data.ok) {
        throw new Error(data?.message || 'не удалось отправить заявку.');
      }
      return data;
    }

    async function attemptPost(timeoutMs) {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => {
        controller.abort();
      }, timeoutMs);

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=UTF-8',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
          cache: 'no-store',
        });

        return await parseResponse(response);
      } finally {
        window.clearTimeout(timeout);
      }
    }

    async function attemptGetFallback(timeoutMs) {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => {
        controller.abort();
      }, timeoutMs);

      try {
        const params = new URLSearchParams();
        Object.entries(payload).forEach(([key, value]) => {
          if (value === undefined || value === null) return;
          params.set(key, String(value));
        });
        params.set('_ts', String(Date.now()));

        const response = await fetch(`${fallbackUrl}?${params.toString()}`, {
          method: 'GET',
          signal: controller.signal,
          cache: 'no-store',
        });

        return await parseResponse(response);
      } finally {
        window.clearTimeout(timeout);
      }
    }

    setSubmitting(submitButton, true);
    renderFeedback({
      type: 'pending',
      title: 'отправляем заявку…',
      text: 'секунду. сейчас сохраним тебя в список.',
    });

    try {
      const baseTimeout = Math.max(8000, Number(runtimeConfig.submitTimeoutMs || 12000));
      let data;

      try {
        data = await attemptPost(baseTimeout);
      } catch (error) {
        if (!isTransientError(error)) throw error;

        renderFeedback({
          type: 'pending',
          title: 'пробуем ещё раз…',
          text: 'соединение нестабильно. повторяем отправку автоматически.',
          deeplink: '',
        });
        await new Promise((resolve) => window.setTimeout(resolve, 900));

        try {
          data = await attemptPost(baseTimeout + 4000);
        } catch (secondError) {
          if (!isTransientError(secondError)) throw secondError;

          renderFeedback({
            type: 'pending',
            title: 'есть запасной путь…',
            text: 'telegram браузер иногда тупит. отправляем заявку облегчённым способом.',
            deeplink: '',
          });
          await new Promise((resolve) => window.setTimeout(resolve, 700));
          data = await attemptGetFallback(baseTimeout + 4000);
        }
      }

      formEl.reset();
      renderFeedback({
        type: 'success',
        title: 'заявка принята',
        text: 'теперь открой бота и нажми start — без этого бот не сможет прислать напоминание.',
        deeplink: data.bot_deeplink,
      });
    } catch (error) {
      const recovered = await checkSubmissionStatus(6000);
      if (recovered?.bot_deeplink) {
        formEl.reset();
        renderFeedback({
          type: 'success',
          title: 'заявка принята',
          text: 'заявка уже сохранилась. теперь открой бота и нажми start — без этого бот не сможет прислать напоминание.',
          deeplink: recovered.bot_deeplink,
        });
      } else {
        const isAbort = error?.name === 'AbortError';
        reportClientIssue(runtimeConfig, {
          type: isAbort ? 'submit_timeout' : 'submit_error',
          title: isAbort ? 'ответ не пришёл вовремя' : 'заявку не удалось отправить',
          message: error?.message || '',
          request: payload,
        });
        renderFeedback({
          type: 'error',
          title: isAbort ? 'ответ задержался' : 'заявку не удалось отправить',
          text: isAbort
            ? 'у вас нестабильное интернет-соединение. попробуйте позднее.'
            : 'не удалось отправить заявку. попробуйте ещё раз чуть позже.',
          deeplink: '',
        });
      }
    } finally {
      setSubmitting(submitButton, false);
    }
  }

  function buildPayload(formEl, runtimeConfig) {
    const formData = new FormData(formEl);
    const attendanceType = formData.get('attendance_type');

    return {
      source: 'site_form',
      event_slug: runtimeConfig.eventSlug || 'sobivan-birthday',
      event_title: runtimeConfig.eventTitle || 'День рождения SOBIVAN',
      site_origin: window.location.origin || runtimeConfig.siteOrigin || '*',
      name: `${formData.get('name') || ''}`.trim(),
      contact: `${formData.get('contact') || ''}`.trim(),
      attendance_type: attendanceType,
      guest_count: normalizeGuestCount(attendanceType),
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

    if (!name || name.length < 2) return 'нужно имя хотя бы из 2 символов.';
    if (!contact || contact.length < 3) return 'нужен telegram или телефон.';
    if (!['solo', 'plus_one', 'group'].includes(attendanceType)) return 'выбери, как ты идёшь.';
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
