(function () {
  'use strict';
  // Independent enhancement: never overwrite FitnessPlus' existing app.js.
  const API = '/api/';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let currentCard = null;
  let loading = false;
  async function request(path, payload) {
    const response = await fetch(API + path, {
      method: payload ? 'POST' : 'GET',
      credentials: 'same-origin',
      headers: payload ? {'content-type':'application/json'} : {},
      body: payload ? JSON.stringify(payload) : undefined
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Serverfehler');
    return data;
  }
  function findCodeCard() {
    return [...document.querySelectorAll('.card')].find(card =>
      !card.id && [...card.querySelectorAll('b, h2, h3')].some(el =>
        /^\s*(?:🔑\s*)?Mein Freundes-Code\s*$/i.test(el.textContent.trim())
      )
    );
  }
  function mount() {
    const anchor = findCodeCard();
    if (!anchor) return;
    if (currentCard && currentCard.isConnected && currentCard.previousElementSibling === anchor) return;
    if (currentCard && currentCard.isConnected) currentCard.remove();
    const card = document.createElement('div');
    card.className = 'card';
    card.id = 'fp-inline-duels';
    card.innerHTML = '<b>⚔️ Freunde-Duelle</b><p class="sub">Fordere einen bestätigten Freund zu einem 7-Tage-Duell heraus.</p><div id="fp-duels-content">Duelle werden geladen …</div>';
    anchor.insertAdjacentElement('afterend', card);
    currentCard = card;
    refresh();
  }
  async function refresh() {
    if (loading || !currentCard || !currentCard.isConnected) return;
    loading = true;
    const area = currentCard.querySelector('#fp-duels-content');
    try {
      const [d, f] = await Promise.all([request('duels'), request('friends')]);
      if (!currentCard.isConnected) return;
      const mine = String(d.me);
      const friends = (f.friends || []).filter(friend => String(friend.id) !== mine);
      const options = friends.map(friend => '<option value="' + esc(friend.id) + '">' + esc(friend.name) + '</option>').join('');
      const duels = (d.duels || []).map(duel => {
        const challenger = String(duel.challengerId) === mine;
        const opponent = challenger ? duel.opponentName : duel.challengerName;
        const minePoints = challenger ? duel.challengerPoints : duel.opponentPoints;
        const theirPoints = challenger ? duel.opponentPoints : duel.challengerPoints;
        let status = ({pending: 'Einladung offen',active: 'Läuft',finished: 'Beendet',declined: 'Abgelehnt'})[duel.status] || duel.status;
        const actions = duel.status === 'pending' && !challenger ?
          '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:9px"><button class="btn" data-fp-duel-reply="accept" data-fp-duel-id="' + esc(duel.id) + '">Annehmen</button><button class="btn" data-fp-duel-reply="decline" data-fp-duel-id="' + esc(duel.id) + '">Ablehnen</button></div>' : '';
        const score = ['active','finished'].includes(duel.status) ?
          '<div class="sub">Du: ' + Number(minePoints || 0) + ' Übungen · ' + esc(opponent) + ': ' + Number(theirPoints || 0) + ' Übungen</div>' : '';
        return '<div style="padding:13px 0;border-top:1px solid #dce8e2"><b>⚔️ ' + esc(opponent) + '</b><div class="sub">' + esc(status) + '</div>' + score + actions + '</div>';
      }).join('');
      area.innerHTML = '<label class="sub" for="fp-duel-friend">Freund herausfordern</label>' +
        '<select class="input" id="fp-duel-friend" style="width:100%;margin:8px 0 12px">' + (options || '<option value="">Noch keine Freunde</option>') + '</select>' +
        '<button class="primary" data-fp-duel-start="1" ' + (!options ? 'disabled' : '') + '>⚔️ 7-Tage-Duell starten</button>' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:18px;gap:8px"><b>Deine Duelle</b><button class="btn" data-fp-duel-refresh="1">Aktualisieren</button></div>' +
        (duels || '<p class="sub">Noch keine Duelle.</p>');
    } catch (error) {
      area.textContent = 'Duelle konnten nicht geladen werden: ' + error.message;
    } finally {
      loading = false;
    }
  }
  document.addEventListener('click', async event => {
    const button = event.target.closest('#fp-inline-duels button');
    if (!button) return;
    if (button.dataset.fpDuelStart === undefined && button.dataset.fpDuelReply === undefined && button.dataset.fpDuelRefresh === undefined) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (button.dataset.fpDuelRefresh !== undefined) return refresh();
    const area = currentCard && currentCard.querySelector('#fp-duels-content');
    button.disabled = true;
    try {
      if (button.dataset.fpDuelStart !== undefined) {
        const opponentId = currentCard.querySelector('#fp-duel-friend')?.value;
        if (!opponentId) return;
        await request('duels/challenge', {opponentId});
      } else {
        await request('duels/respond', {id:button.dataset.fpDuelId,decision:button.dataset.fpDuelReply});
      }
      await refresh();
    } catch (error) {
      if (area) {
        const message = document.createElement('p');
        message.className = 'sub';
        message.textContent = error.message;
        area.appendChild(message);
      }
    } finally {
      button.disabled = false;
    }
  }, true);
  const observer = new MutationObserver(mount);
  function start() {
    observer.observe(document.body, {childList:true,subtree:true});
    mount();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
