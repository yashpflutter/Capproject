const ADMIN_KEY = 'matchState';
const bc = ('BroadcastChannel' in window) ? new BroadcastChannel('match-updates') : null;
const adminAreas = document.getElementById('admin-areas');

function loadState(){
  const raw = localStorage.getItem(ADMIN_KEY);
  return raw ? JSON.parse(raw) : null;
}

function saveState(state){
  localStorage.setItem(ADMIN_KEY, JSON.stringify(state));
  if(bc) bc.postMessage({type:'state', state});
}

function ensureStateFromJsonThenRender(){
  const existing = loadState();
  if(existing){
    renderAdmin(existing);
    return;
  }
  // fallback load players.json once to initialize state
  fetch('data/players.json').then(r=>r.json()).then(json=>{
    const init = { teams: json.teams };
    saveState(init);
    renderAdmin(init);
  }).catch(err=>{
    adminAreas.innerHTML = '<p class="subtle">Failed to load data/players.json</p>';
    console.error(err);
  });
}

function renderAdmin(state){
  adminAreas.innerHTML = '';
  state.teams.forEach(team=>{
    const teamDiv = document.createElement('div');
    teamDiv.className = 'team-admin';
    teamDiv.innerHTML = `<h3>${team.name}</h3><div id="players-${team.name}"></div>`;
    adminAreas.appendChild(teamDiv);
    const list = teamDiv.querySelector(`#players-${team.name}`);
    list.innerHTML = team.players.map((p, idx) => `
      <div class="player-row" data-team="${team.name}" data-idx="${idx}">
        <img src="${p.image || 'https://avatars.dicebear.com/api/identicon/' + encodeURIComponent(p.name) + '.svg'}" alt="${p.name}" />
        <div>
          <strong>${p.name}</strong>
          <div class="subtle">${p.role} — ${p.isPlaying ? 'Playing' : 'Substitute'}</div>
        </div>
        <div class="controls">
          <label><input type="checkbox" class="playing-checkbox" ${p.isPlaying ? 'checked' : ''}/> Playing</label>
          <button class="injured-btn">${p.isPlaying ? 'Mark injured / Replace' : 'Mark injured'}</button>
        </div>
      </div>
    `).join('');
  });

  // attach handlers
  adminAreas.querySelectorAll('.playing-checkbox').forEach(cb=>{
    cb.addEventListener('change', (ev)=>{
      const row = ev.target.closest('.player-row');
      const teamName = row.dataset.team;
      const idx = Number(row.dataset.idx);
      const st = loadState();
      const team = st.teams.find(t=>t.name===teamName);
      team.players[idx].isPlaying = ev.target.checked;
      saveState(st);
      renderAdmin(st);
    });
  });

  adminAreas.querySelectorAll('.injured-btn').forEach(btn=>{
    btn.addEventListener('click', (ev)=>{
      const row = ev.target.closest('.player-row');
      const teamName = row.dataset.team;
      const idx = Number(row.dataset.idx);
      const st = loadState();
      const team = st.teams.find(t=>t.name===teamName);
      // if player is playing, prompt to pick a substitute to promote
      if(team.players[idx].isPlaying){
        // collect subs
        const subs = team.players.map((p,i)=>({p,i})).filter(x=>!x.p.isPlaying);
        if(subs.length === 0){
          alert('No substitutes available to promote.');
          return;
        }
        const choices = subs.map(s => `${s.i}: ${s.p.name}`).join('\n');
        const sel = prompt('Select substitute index to promote:\n' + choices);
        const selIdx = Number(sel);
        const chosen = subs.find(s => s.i === selIdx);
        if(!chosen){
          alert('Invalid selection.');
          return;
        }
        // swap: playing -> sub, chosen sub -> playing
        team.players[idx].isPlaying = false;
        team.players[chosen.i].isPlaying = true;
        saveState(st);
        renderAdmin(st);
        return;
      } else {
        // marking a substitute injured - just annotate description
        team.players[idx].desc = (team.players[idx].desc || '') + ' (Injured)';
        saveState(st);
        renderAdmin(st);
      }
    });
  });
}

// respond to broadcasts from other tabs (viewer/admin)
if(bc){
  bc.onmessage = (ev) => {
    if(ev.data && ev.data.type === 'state'){
      saveState(ev.data.state); // will overwrite localStorage and keep consistent
      renderAdmin(ev.data.state);
    }
  };
}

// also respond to storage events (other tab wrote)
window.addEventListener('storage', (e)=>{
  if(e.key === ADMIN_KEY){
    const s = loadState();
    if(s) renderAdmin(s);
  }
});

ensureStateFromJsonThenRender();