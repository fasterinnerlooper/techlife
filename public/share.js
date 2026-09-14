const slug = window.location.pathname.split('/').filter(Boolean).at(-1);
const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

function renderStat(label, value) {
  return `<div class="stat-card"><span class="muted">${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

async function loadSharePage() {
  const response = await fetch(`/api/u/${slug}`);
  const payload = await response.json();
  if (!response.ok) {
    document.querySelector('#share-subtitle').textContent = payload.error || 'Profile not found.';
    return;
  }

  document.querySelector('#share-title').textContent = payload.profile.headline;
  document.querySelector('#share-subtitle').textContent = `${payload.profile.username} · ${payload.stats.devices} devices across ${payload.stats.categories} categories`;
  document.querySelector('#share-stats').innerHTML = [
    renderStat('Devices', payload.stats.devices),
    renderStat('Categories', payload.stats.categories),
  ].join('');
  document.querySelector('#share-timeline').innerHTML = payload.timeline.length
    ? payload.timeline
        .map(
          (item) => `
            <article class="timeline-item">
              <strong>${escapeHtml(item.product)}</strong>
              <div class="timeline-meta">${escapeHtml(item.manufacturer)} · ${escapeHtml(item.category)}</div>
              <div class="timeline-meta">${escapeHtml(item.startDateText || 'Unknown')} → ${escapeHtml(item.endDateText || 'Unknown')}</div>
              <div class="timeline-meta">${escapeHtml(item.memories || '')}</div>
            </article>`,
        )
        .join('')
    : '<p class="muted">No public timeline entries yet.</p>';
}

loadSharePage().catch(() => {
  document.querySelector('#share-subtitle').textContent = 'Unable to load this public timeline.';
});
