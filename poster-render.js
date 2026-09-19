(async () => {
  const grid = document.querySelector('[data-poster-grid]');
  const archiveList = document.querySelector('[data-poster-archive-list]');
  const archiveCount = document.querySelector('[data-poster-archive-count]');
  const archiveWrap = document.querySelector('[data-poster-archive-wrap]');
  const archivePrev = document.querySelector('[data-archive-prev]');
  const archiveNext = document.querySelector('[data-archive-next]');

  if (!grid || !archiveList || !archiveCount || !archiveWrap) return;

  function createPosterItem(item, archived = false) {
    const article = document.createElement('article');
    article.className = archived ? 'poster-item poster-item--archive' : 'poster-item';

    const img = document.createElement('img');
    img.src = item.image;
    img.alt = item.alt || item.title || 'Афиша SOBIVAN';
    img.loading = 'lazy';

    const meta = document.createElement('div');
    meta.className = 'poster-meta';

    const strong = document.createElement('strong');
    strong.textContent = item.title || '';

    if (item.subtitle) {
      const span = document.createElement('span');
      span.textContent = item.subtitle;
      meta.append(strong, span);
    } else {
      meta.append(strong);
    }
    article.append(img, meta);
    return article;
  }

  function scrollArchive(direction) {
    const firstCard = archiveList.firstElementChild;
    const gap = parseFloat(getComputedStyle(archiveList).gap) || 16;
    const step = firstCard ? firstCard.getBoundingClientRect().width + gap : archiveList.clientWidth * 0.8;
    archiveList.scrollBy({ left: direction * step, behavior: 'smooth' });
  }

  archivePrev?.addEventListener('click', () => scrollArchive(-1));
  archiveNext?.addEventListener('click', () => scrollArchive(1));

  try {
    const response = await fetch('./posters/posters.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`posters.json: ${response.status}`);
    const data = await response.json();
    const items = Array.isArray(data.items) ? data.items : [];

    const active = items.filter((item) => item.status === 'active');
    const archive = items.filter((item) => item.status === 'archive');

    grid.replaceChildren(...active.map((item) => createPosterItem(item, false)));
    archiveList.replaceChildren(...archive.map((item) => createPosterItem(item, true)));
    archiveCount.textContent = String(archive.length);
    archiveWrap.hidden = archive.length === 0;
  } catch (error) {
    console.error('failed to render posters', error);
  }
})();
