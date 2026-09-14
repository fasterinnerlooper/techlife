const state = {
  token: localStorage.getItem('techlife-token') || '',
  review: null,
};

const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

function setStatus(message) {
  const banner = $('#status-banner');
  if (!banner) return;
  banner.textContent = message;
  banner.classList.add('visible');
  window.clearTimeout(setStatus.timeout);
  setStatus.timeout = window.setTimeout(() => banner.classList.remove('visible'), 3200);
}

function headers(json = true) {
  const base = {};
  if (json) base['Content-Type'] = 'application/json';
  if (state.token) base.Authorization = ['Bearer', state.token].join(' ');
  return base;
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const payload = response.headers.get('content-type')?.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    throw new Error(payload?.error || 'Request failed');
  }
  return payload;
}

function rememberToken(token) {
  state.token = token;
  localStorage.setItem('techlife-token', token);
}

function statEntries(stats) {
  return [
    ['Devices owned', stats.totalDevices],
    ['Years represented', stats.yearsRepresented],
    ['Categories', stats.categoryCount],
    ['Manufacturers', stats.manufacturerCount],
    ['Currently owned', stats.currentlyOwned],
    ['Most-used category', stats.mostUsedCategory || '—'],
    ['Most common maker', stats.mostCommonManufacturer || '—'],
    ['Approx total spent', stats.approximateTotalSpent == null ? '—' : `~${stats.approximateTotalSpent}`],
    ['Average ownership', stats.averageOwnershipYears == null ? '—' : `~${stats.averageOwnershipYears} years`],
    ['Upgrades', stats.upgradeCount],
    ['Longest-owned device', stats.longestOwnedDevice ? `${stats.longestOwnedDevice.product} (~${stats.longestOwnedDevice.approximateYears}y)` : '—'],
    ['Shortest ownership', stats.shortestOwnershipDevice ? `${stats.shortestOwnershipDevice.product} (~${stats.shortestOwnershipDevice.approximateYears}y)` : '—'],
  ];
}

function renderStats(stats) {
  const container = $('#stats-grid');
  if (!container) return;
  container.innerHTML = statEntries(stats)
    .map(
      ([label, value]) =>
        `<div class="stat-card"><span class="muted">${escapeHtml(label)}</span><strong>${escapeHtml(value ?? '—')}</strong></div>`,
    )
    .join('');
}

function renderTimeline(items) {
  const container = $('#timeline-list');
  if (!container) return;
  if (!items.length) {
    container.innerHTML = '<p class="muted">No timeline entries yet.</p>';
    return;
  }

  container.innerHTML = items
    .map(
      (item) => `
      <article class="timeline-item">
        <strong>${escapeHtml(item.product)}</strong>
        <div class="timeline-meta">${escapeHtml(item.manufacturer)} · ${escapeHtml(item.category)}</div>
        <div class="timeline-meta">${escapeHtml(item.startDateText || 'Unknown start')} → ${escapeHtml(item.endDateText || 'Present / unknown end')}</div>
        <div class="timeline-meta">${escapeHtml(item.memories || item.notes || '')}</div>
      </article>`,
    )
    .join('');
}

function candidateActionButtons(candidate) {
  const base = `<button type="button" data-confirm="${escapeHtml(candidate.id)}">Confirm</button>`;
  const override = candidate.status === 'NEEDS_REVIEW'
    ? `<button type="button" class="secondary" data-override="${escapeHtml(candidate.id)}">Choose model</button>`
    : '';
  const duplicate = Array.isArray(candidate.ambiguityJson?.duplicateMatches) && candidate.ambiguityJson.duplicateMatches.length
    ? `<button type="button" class="secondary" data-duplicate="${escapeHtml(candidate.id)}">Merge evidence</button>`
    : '';
  return `${base}${override}${duplicate}`;
}

function renderReview(review) {
  state.review = review;
  $('#import-summary').innerHTML = `
    <span class="pill success">${review.grouped.confirmed.length} confirmed</span>
    <span class="pill warning">${review.grouped.needsReview.length} needs review</span>
    <span class="pill warning">${review.grouped.possibleDuplicates.length} possible duplicates</span>
  `;

  const groups = [
    ['Confirmed', review.grouped.confirmed],
    ['Needs review', review.grouped.needsReview],
    ['Possible duplicates', review.grouped.possibleDuplicates],
  ];
  $('#review-groups').innerHTML = groups
    .map(
      ([label, items]) => `
        <section class="review-group">
          <h3>${label}</h3>
          ${
            items.length
              ? items
                  .map(
                    (candidate) => `
                    <article class="candidate-card">
                      <strong>${escapeHtml(candidate.extractedName)}</strong>
                      <div class="candidate-meta">${escapeHtml(candidate.startDateText || 'Unknown start')} → ${escapeHtml(candidate.endDateText || 'Unknown end')}</div>
                      <div class="candidate-meta">${escapeHtml(((candidate.evidenceJson || []).slice(0, 2).join(' · ')) || 'No evidence snippets stored')}</div>
                      ${
                        candidate.ambiguityJson?.duplicateMatches?.length
                          ? `<div class="candidate-meta">Possible duplicate of ${candidate.ambiguityJson.duplicateMatches
                              .map((match) => `${escapeHtml(match.product)} (${escapeHtml(match.startDateText || 'unknown')})`)
                              .join(', ')}</div>`
                          : ''
                      }
                      ${
                        candidate.ambiguityJson?.ambiguousModels?.length
                          ? `<div class="candidate-meta">Ambiguous models: ${escapeHtml(candidate.ambiguityJson.ambiguousModels.join(', '))}</div>`
                          : ''
                      }
                      <div class="candidate-actions">${candidateActionButtons(candidate)}</div>
                    </article>`,
                  )
                  .join('')
              : '<p class="muted">Nothing here.</p>'
          }
        </section>`,
    )
    .join('');
}

async function confirmCandidate(candidateId, extra = {}) {
  if (!state.review) return;
  await request(`/api/imports/${state.review.importId}/confirm`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ confirmations: [{ candidateId, ...extra }] }),
  });
  const updatedReview = await request(`/api/imports/${state.review.importId}/review`, { headers: headers(false) });
  renderReview(updatedReview);
  await loadDashboard();
  setStatus('Candidate confirmed.');
}

async function loadDashboard() {
  if (!state.token) return;
  const [timeline, stats, profile] = await Promise.all([
    request('/api/timeline', { headers: headers(false) }),
    request('/api/timeline/stats', { headers: headers(false) }),
    request('/api/profile/public', { headers: headers(false) }),
  ]);
  renderTimeline(timeline);
  renderStats(stats);
  if (profile) {
    const form = $('#public-profile-form');
    form.slug.value = profile.slug || '';
    form.headline.value = profile.headline || '';
    form.isPublic.checked = Boolean(profile.isPublic);
    $('#public-profile-status').textContent = profile.isPublic ? `Public at /u/${profile.slug}` : 'Profile is private.';
  }
}

async function handleAuth(endpoint, form) {
  const body = Object.fromEntries(new FormData(form).entries());
  const payload = await request(`/api/auth/${endpoint}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  rememberToken(payload.token);
  await loadDashboard();
  setStatus(endpoint === 'register' ? 'Account created.' : 'Signed in.');
}

function wireJsonForm(selector, callback) {
  const form = $(selector);
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await callback(form);
    } catch (error) {
      setStatus(error.message);
    }
  });
}

wireJsonForm('#register-form', (form) => handleAuth('register', form));
wireJsonForm('#login-form', (form) => handleAuth('login', form));
wireJsonForm('#manual-entry-form', async (form) => {
  const data = Object.fromEntries(new FormData(form).entries());
  data.isPrivate = form.isPrivate.checked;
  await request('/api/ownership-records', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data),
  });
  form.reset();
  form.isPrivate.checked = true;
  await loadDashboard();
  setStatus('Timeline entry added.');
});

wireJsonForm('#text-import-form', async (form) => {
  const data = Object.fromEntries(new FormData(form).entries());
  const result = await request('/api/imports', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data),
  });
  const review = await request(`/api/imports/${result.importId}/review`, { headers: headers(false) });
  renderReview(review);
  setStatus(`We found ${result.found} pieces of technology.`);
});

wireJsonForm('#freeform-import-form', async (form) => {
  const data = Object.fromEntries(new FormData(form).entries());
  const result = await request('/api/imports', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ ...data, method: 'FREEFORM_DESCRIPTION' }),
  });
  const review = await request(`/api/imports/${result.importId}/review`, { headers: headers(false) });
  renderReview(review);
  setStatus(`We found ${result.found} pieces of technology.`);
});

const imageForm = $('#image-import-form');
imageForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const formData = new FormData(imageForm);
    const result = await request('/api/imports/upload', {
      method: 'POST',
      headers: state.token ? { Authorization: ['Bearer', state.token].join(' ') } : {},
      body: formData,
    });
    const review = await request(`/api/imports/${result.importId}/review`, { headers: headers(false) });
    renderReview(review);
    setStatus(`We found ${result.found} pieces of technology.`);
  } catch (error) {
    setStatus(error.message);
  }
});

wireJsonForm('#public-profile-form', async (form) => {
  const body = Object.fromEntries(new FormData(form).entries());
  body.isPublic = form.isPublic.checked;
  const profile = await request('/api/profile/public', {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(body),
  });
  $('#public-profile-status').textContent = profile.isPublic ? `Public at /u/${profile.slug}` : 'Profile is private.';
  setStatus('Public profile updated.');
});

wireJsonForm('#owned-at-form', async (form) => {
  const params = new URLSearchParams({ year: form.year.value });
  const result = await request(`/api/timeline/owned-at?${params}`, { headers: headers(false) });
  $('#owned-at-results').innerHTML = result.items.length
    ? result.items
        .map(
          (item) =>
            `<div class="timeline-item"><strong>${escapeHtml(item.product)}</strong><div class="timeline-meta">${escapeHtml(item.startDateText || 'Unknown')} → ${escapeHtml(item.endDateText || 'Unknown')}</div></div>`,
        )
        .join('')
    : '<p class="muted">No devices overlap that year.</p>';
});

$('#review-groups')?.addEventListener('click', async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  try {
    if (target.dataset.confirm) {
      await confirmCandidate(target.dataset.confirm);
      return;
    }
    if (target.dataset.override) {
      const value = window.prompt('Choose the corrected model name');
      if (!value) return;
      await confirmCandidate(target.dataset.override, { overrideModel: value });
      return;
    }
    if (target.dataset.duplicate) {
      const candidate = Object.values(state.review.grouped)
        .flat()
        .find((entry) => entry.id === target.dataset.duplicate);
      const duplicateId = candidate?.ambiguityJson?.duplicateMatches?.[0]?.ownershipId;
      if (!duplicateId) return;
      await confirmCandidate(target.dataset.duplicate, { markDuplicateOfOwnershipId: duplicateId });
    }
  } catch (error) {
    setStatus(error.message);
  }
});

if (state.token) {
  loadDashboard().catch((error) => setStatus(error.message));
}
