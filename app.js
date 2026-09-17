(() => {
  const D = window.FK_DATA;
  const C = window.FK_CONFIG;
  const page = document.body.dataset.page || 'home';
  const configured = C.SUPABASE_URL && C.SUPABASE_ANON_KEY && !C.SUPABASE_URL.includes('YOUR-PROJECT') && !C.SUPABASE_ANON_KEY.includes('YOUR_');
  const client = configured && window.supabase ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY) : null;

  const state = { marks: [], teamScores: [], gallery: [] };
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const esc = (v='') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function teamName(id) { return D.teams.find(t => t.id === id)?.name || id; }
  function memberById(id) { return D.members.find(m => m.id === id); }
  function programmeById(id) { return D.programmes.find(p => p.id === id); }
  function initials(name) { return name.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase(); }
  function sum(list) { return list.reduce((a,b)=>a + Number(b.points || 0), 0); }
  function memberTotal(memberId) { return sum(state.marks.filter(m=>m.participant_id === memberId)); }
  function teamTotal(teamId, category=null) {
    const ids = new Set(D.members.filter(m=>m.team===teamId && (!category || m.category===category)).map(m=>m.id));
    const individual = sum(state.marks.filter(m=>ids.has(m.participant_id)));
    const directTeam = sum(state.teamScores.filter(t=>t.team_id===teamId && (!category || programmeById(t.programme_id)?.category===category)));
    return individual + directTeam;
  }
  function teamProgrammeTotal(teamId, programmeId) {
    const ids = new Set(D.members.filter(m=>m.team===teamId).map(m=>m.id));
    return sum(state.marks.filter(m=>m.programme_id===programmeId && ids.has(m.participant_id))) + sum(state.teamScores.filter(t=>t.team_id===teamId && t.programme_id===programmeId));
  }

  function buildChrome() {
    const nav = [
      ['home','index.html','Home'], ['competitions','competitions.html','Competitions'],
      ['individual','individual-marks.html','Individual Marks'], ['gallery','gallery.html','Gallery'],
      ['about','about.html','About'], ['contact','contact.html','Contact']
    ];
    const header = document.createElement('header');
    header.className='site-header';
    header.innerHTML = `<div class="shell nav-wrap">
      <a class="brand" href="index.html"><span class="brand-mark">FK</span><span class="brand-copy"><strong>Fasthabiqul Khairath</strong><span>Melaad Fest 2026</span></span></a>
      <button class="menu-btn" aria-label="Open navigation">Menu</button>
      <nav class="nav-links">${nav.map(([id,href,label])=>`<a href="${href}" class="${page===id?'active':''}">${label}</a>`).join('')}<a class="nav-admin ${page==='admin'?'active':''}" href="admin.html">Admin</a></nav>
    </div>`;
    document.body.prepend(header);
    $('.menu-btn',header)?.addEventListener('click',()=>$('.nav-links',header).classList.toggle('open'));

    const footer = document.createElement('footer');
    footer.className='site-footer';
    footer.innerHTML=`<div class="shell footer-grid"><div><strong>Thalameez Sayyid Marhoom Ramanthali</strong><br>Fasthabiqul Khairath · Melaad Fest 2026</div><div>Live Competition & Results Portal</div></div>`;
    document.body.append(footer);
  }

  async function loadMarks() {
    if (!client) {
      try { state.marks = JSON.parse(localStorage.getItem('fk_demo_marks') || '[]'); } catch { state.marks=[]; }
      return;
    }
    const [{ data, error }, { data: teamData, error: teamError }] = await Promise.all([client.from('scores').select('*'), client.from('team_scores').select('*')]);
    if (!error) state.marks = data || [];
    if (!teamError) state.teamScores = teamData || [];
  }

  async function loadGallery() {
    if (!client) { state.gallery=[]; return; }
    const { data, error } = await client.from('gallery').select('*').order('created_at',{ascending:false});
    if (!error) state.gallery=data || [];
  }

  function renderHome() {
    const totals = Object.fromEntries(D.teams.map(t=>[t.id,{senior:teamTotal(t.id,'Senior'), junior:teamTotal(t.id,'Junior'), overall:teamTotal(t.id)}]));
    $$('[data-score]').forEach(el=>{
      const [team,cat]=el.dataset.score.split(':'); el.textContent = totals[team]?.[cat] ?? 0;
    });
    const leader = D.teams.slice().sort((a,b)=>totals[b.id].overall-totals[a.id].overall);
    const banner=$('#teamChampion');
    if (banner) {
      const tied = totals[leader[0].id].overall === totals[leader[1].id].overall;
      banner.textContent = tied ? `Overall Team Standing: Level at ${totals[leader[0].id].overall} points` : `Overall Team Leader: ${leader[0].name} — ${totals[leader[0].id].overall} points`;
    }
    const list=$('#championList');
    if(list){
      const ranked=D.members.map(m=>({...m,total:memberTotal(m.id)})).sort((a,b)=>b.total-a.total || a.name.localeCompare(b.name));
      list.innerHTML=ranked.map((m,i)=>`<div class="champion-row"><div class="rank">${i+1}</div><div><strong>${esc(m.name)}</strong><small>${esc(teamName(m.team))} · ${m.category}</small></div><div class="champion-points">${m.total}</div></div>`).join('');
    }
  }

  function renderCompetitions() {
    D.teams.forEach(team=>{
      const root=$(`#competition-${team.id}`); if(!root) return;
      root.innerHTML=['Senior','Junior'].map(category=>{
        return ['Stage','Non-Stage'].map(mode=>{
          const programmes=D.programmes.filter(p=>p.category===category && p.mode===mode);
          return `<div class="category-block"><div class="category-label">${category} · ${mode}</div><div class="programme-list">${programmes.map(p=>`<div class="programme-row"><div><strong>${esc(p.name)}</strong><div class="meta">${category} ${mode}</div></div><div class="programme-points">${teamProgrammeTotal(team.id,p.id)}</div></div>`).join('')}</div></div>`;
        }).join('');
      }).join('');
    });
  }

  function renderIndividual() {
    D.teams.forEach(team=>{
      const root=$(`#people-${team.id}`); if(!root) return;
      root.innerHTML=['Senior','Junior'].map(category=>{
        const members=D.members.filter(m=>m.team===team.id && m.category===category);
        return `<div class="category-block"><div class="category-label">${category}s</div><div class="person-list">${members.map(m=>`<div class="person-card" data-person="${m.id}"><div class="avatar">${initials(m.name)}</div><div class="person-copy"><strong>${esc(m.name)}</strong><small>${esc(m.role || category)}</small></div><div class="person-total">${memberTotal(m.id)}</div></div>`).join('')}</div></div>`;
      }).join('');
    });
    $$('[data-person]').forEach(el=>el.addEventListener('click',()=>openPerson(el.dataset.person)));
  }

  function openPerson(id){
    const m=memberById(id); const modal=$('#personModal'); if(!m||!modal) return;
    $('#personModalName').textContent=m.name;
    $('#personModalMeta').textContent=`${teamName(m.team)} · ${m.category}${m.role?' · '+m.role:''}`;
    $('#personModalTotal').textContent=memberTotal(m.id);
    const rows=state.marks.filter(x=>x.participant_id===id).sort((a,b)=>{
      const pa=programmeById(a.programme_id), pb=programmeById(b.programme_id); return (pa?.name||'').localeCompare(pb?.name||'');
    });
    $('#personBreakdown').innerHTML=rows.length?rows.map(r=>{const p=programmeById(r.programme_id);return `<div class="breakdown-row"><div><b>${esc(p?.name||r.programme_id)}</b><small>${esc(p?.category||'')} · ${esc(p?.mode||'')}</small></div><strong>${Number(r.points||0)}</strong></div>`}).join(''):`<div class="empty">No programme points have been added yet.</div>`;
    modal.classList.add('open');
  }

  function renderGallery(){
    const root=$('#galleryGrid'); if(!root) return;
    if(!state.gallery.length){ root.innerHTML=`<div class="empty" style="grid-column:1/-1">Gallery items will appear here after the admin uploads photos or videos.</div>`; return; }
    root.innerHTML=state.gallery.map(item=>{
      const isVideo=(item.media_type||'').startsWith('video');
      const media=isVideo?`<video controls preload="metadata"><source src="${esc(item.file_url)}"></video>`:`<img src="${esc(item.file_url)}" alt="${esc(item.title||'Gallery photo')}" loading="lazy">`;
      return `<article class="gallery-card"><div class="gallery-media">${media}</div><div class="gallery-body"><h3>${esc(item.title||'Melaad Fest 2026')}</h3><p>${new Date(item.created_at).toLocaleString()}</p><div class="gallery-actions"><button class="btn btn-secondary btn-small" data-gallery-download="${esc(item.file_url)}" data-gallery-title="${esc(item.title||'melaad-fest-2026')}">Download</button></div></div></article>`;
    }).join('');
    $$('[data-gallery-download]').forEach(btn=>btn.addEventListener('click',async()=>{
      const original=btn.textContent; btn.disabled=true; btn.textContent='Downloading…';
      try {
        const res=await fetch(btn.dataset.galleryDownload); if(!res.ok) throw new Error('Download failed');
        const blob=await res.blob(); const u=URL.createObjectURL(blob); const a=document.createElement('a');
        const ext=(blob.type.split('/')[1]||'file').split(';')[0].replace('jpeg','jpg');
        a.href=u; a.download=(btn.dataset.galleryTitle||'melaad-fest').replace(/[^a-z0-9-_]+/gi,'-')+'.'+ext; document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(u);
      } catch { window.open(btn.dataset.galleryDownload,'_blank','noopener'); }
      btn.disabled=false; btn.textContent=original;
    }));
  }

  function installPersonModal(){
    if(!$('#personModal')) return;
    $('#closePersonModal').addEventListener('click',()=>$('#personModal').classList.remove('open'));
    $('#personModal').addEventListener('click',e=>{ if(e.target.id==='personModal') e.currentTarget.classList.remove('open'); });
  }

  function installAccessGate(){
    if(page==='admin') return;
    if(localStorage.getItem('fk_visitor')) return;
    const gate=document.createElement('div'); gate.className='access-gate open'; gate.id='accessGate';
    gate.innerHTML=`<div class="access-card"><div class="access-emblem">☾</div><div class="eyebrow">Welcome to Melaad Fest 2026</div><h1>Fasthabiqul Khairath</h1><p>Please enter your name and place to access the live competition website.</p><form id="visitorForm" class="form-grid"><label>Name<input id="visitorName" required maxlength="80" placeholder="Your name"></label><label>Place<input id="visitorPlace" required maxlength="100" placeholder="Your place"></label><button class="btn btn-primary" type="submit">Enter Website</button><div id="visitorStatus" class="status"></div></form></div>`;
    document.body.append(gate);
    $('#visitorForm').addEventListener('submit',async e=>{
      e.preventDefault(); const name=$('#visitorName').value.trim(), place=$('#visitorPlace').value.trim(); if(!name||!place) return;
      const st=$('#visitorStatus'); st.className='status show'; st.textContent='Opening website…';
      if(client){
        const { error }=await client.from('visitors').insert({name,place});
        if(error){ st.className='status show error'; st.textContent='Could not save your entry. Please try again.'; return; }
      }
      localStorage.setItem('fk_visitor',JSON.stringify({name,place,at:new Date().toISOString()})); gate.classList.remove('open');
    });
  }

  function subscribeRealtime(){
    if(!client) return;
    client.channel('public-scores').on('postgres_changes',{event:'*',schema:'public',table:'scores'},async()=>{await loadMarks(); renderCurrent();}).on('postgres_changes',{event:'*',schema:'public',table:'team_scores'},async()=>{await loadMarks(); renderCurrent();}).subscribe();
    if(page==='gallery') client.channel('public-gallery').on('postgres_changes',{event:'*',schema:'public',table:'gallery'},async()=>{await loadGallery(); renderGallery();}).subscribe();
  }

  function renderCurrent(){
    if(page==='home') renderHome();
    if(page==='competitions') renderCompetitions();
    if(page==='individual') renderIndividual();
  }

  async function init(){
    buildChrome(); installAccessGate(); installPersonModal();
    await loadMarks();
    if(page==='gallery') await loadGallery();
    renderCurrent(); if(page==='gallery') renderGallery(); subscribeRealtime();
    window.FK={client,configured,state,loadMarks,loadGallery,renderCurrent,renderGallery,teamTotal,teamProgrammeTotal,memberTotal,teamName,memberById,programmeById,esc};
    document.dispatchEvent(new CustomEvent('fk-ready'));
  }
  document.addEventListener('DOMContentLoaded',init);
})();
