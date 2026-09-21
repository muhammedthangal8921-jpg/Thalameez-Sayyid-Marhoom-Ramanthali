(() => {
  const D = window.FK_DATA;
  const $ = s => document.querySelector(s);

  function status(el, msg, type='ok') {
    el.textContent = msg;
    el.className = `status show ${type}`;
  }
  function clearStatus(el){ el.textContent=''; el.className='status'; }

  document.addEventListener('fk-ready', async () => {
    const FK = window.FK;
    const client = FK.client;
    if (!FK.configured || !client) {
      const warn=$('#setupWarning');
      status(warn,'Website preview is ready, but live admin features need Supabase configuration. Follow README.md once to connect the database, secure email login, and gallery storage.','error');
      $('#loginForm button').disabled=true;
      return;
    }

    async function isApprovedAdmin() {

  const { data, error } =
    await client.rpc('is_admin');

  if (error) {
    console.error(
      'Admin verification failed:',
      error
    );

    return false;
  }

  return data === true;
}
let visitors = [];

let visitorSessions = [];

let scheduleItems = [];


async function loadVisitors(){

  const [
    visitorResult,
    sessionResult
  ] = await Promise.all([

    client
      .from('visitors')
      .select('*')
      .order(
        'created_at',
        { ascending:false }
      )
      .limit(5000),


    client
      .from('visitor_sessions')
      .select('*')
      .order(
        'started_at',
        { ascending:false }
      )
      .limit(10000)

  ]);


  if(visitorResult.error){

    console.error(
      'Visitor load failed:',
      visitorResult.error
    );

    visitors = [];

  } else {

    visitors =
      visitorResult.data || [];

  }


  if(sessionResult.error){

    console.error(
      'Visitor analytics load failed:',
      sessionResult.error
    );

    visitorSessions = [];

  } else {

    visitorSessions =
      sessionResult.data || [];

  }
}



function formatDuration(totalSeconds){

  const seconds =
    Math.max(
      0,
      Math.round(
        Number(totalSeconds) || 0
      )
    );


  const h =
    Math.floor(
      seconds / 3600
    );


  const m =
    Math.floor(
      (seconds % 3600) / 60
    );


  const s =
    seconds % 60;


  if(h > 0){

    return `${h}h ${m}m ${s}s`;

  }


  if(m > 0){

    return `${m}m ${s}s`;

  }


  return `${s}s`;
}



function sessionsForVisitor(visitor){

  const name =
    String(
      visitor.name || ''
    )
    .trim()
    .toLowerCase();


  const place =
    String(
      visitor.place || ''
    )
    .trim()
    .toLowerCase();


  return visitorSessions.filter(
    session =>

      session.visitor_id ===
        visitor.id ||

      (
        !session.visitor_id &&

        String(
          session.name || ''
        )
        .trim()
        .toLowerCase() === name &&

        String(
          session.place || ''
        )
        .trim()
        .toLowerCase() === place
      )

  );
}

    async function showSession() {
      const { data: { session } } = await client.auth.getSession();
      const ok = session?.user && await isApprovedAdmin();
      $('#adminLogin').hidden = !!ok;
      $('#adminApp').hidden = !ok;
      if (ok) {
        await Promise.all([FK.loadMarks(), FK.loadGallery(), loadVisitors()]);
        populateProgrammes(); populateParticipants(); syncScoreType(); renderTables();
      } else if (session?.user) {
        status($('#loginStatus'),'This email is signed in but is not approved as an admin.','error');
        await client.auth.signOut();
      }
    }

    $("#loginForm").addEventListener("submit", async e => { e.preventDefault(); clearStatus($("#loginStatus"));
const email = $("#adminEmail").value.trim().toLowerCase(); const password = $("#adminPassword").value;
status($("#loginStatus"), "Signing in...");
const { data, error } = await client.auth.signInWithPassword({ email, password });
if (error) { return status( $("#loginStatus"), error.message, "error" ); }
const approved = await isApprovedAdmin();
if (!approved) { await client.auth.signOut();
return status(
  $("#loginStatus"),
  "This account does not have administrator access.",
  "error"
);
}
await showSession(); });

    function populateProgrammes(){
      const cat=$('#scoreCategory').value;
      const list=D.programmes.filter(p=>p.category===cat);
      $('#scoreProgramme').innerHTML=list.map(p=>`<option value="${p.id}">${p.mode} — ${p.name}</option>`).join('');
    }
    function populateParticipants(){
      const cat=$('#scoreCategory').value, team=$('#scoreTeam').value;
      const list=D.members.filter(m=>m.category===cat && m.team===team);
      $('#scoreParticipant').innerHTML=list.map(m=>`<option value="${m.id}">${m.name}${m.role?' — '+m.role:''}</option>`).join('');
    }
    function syncScoreType(){
      const isTeam=$('#scoreType').value==='team';
      $('#participantField').style.display=isTeam?'none':'block';
      syncExistingScore();
    }
    function syncExistingScore(){
      const programme=$('#scoreProgramme').value, team=$('#scoreTeam').value;
      if($('#scoreType').value==='team') {
        const existing=FK.state.teamScores.find(m=>m.team_id===team && m.programme_id===programme);
        $('#scorePoints').value = existing ? Number(existing.points) : '';
      } else {
        const participant=$('#scoreParticipant').value;
        const existing=FK.state.marks.find(m=>m.participant_id===participant && m.programme_id===programme);
        $('#scorePoints').value = existing ? Number(existing.points) : '';
      }
    }

    $('#scoreCategory').addEventListener('change',()=>{populateProgrammes();populateParticipants();syncExistingScore();});
    $('#scoreTeam').addEventListener('change',()=>{populateParticipants();syncExistingScore();});
    $('#scoreType').addEventListener('change',syncScoreType);
    $('#scoreProgramme').addEventListener('change',syncExistingScore);
    $('#scoreParticipant').addEventListener('change',syncExistingScore);

    $('#scoreForm').addEventListener('submit', async e => {
      e.preventDefault();
      const programme_id=$('#scoreProgramme').value, team_id=$('#scoreTeam').value, points=Number($('#scorePoints').value), scoreType=$('#scoreType').value;
      const programme=D.programmes.find(p=>p.id===programme_id);
      if (!programme) return status($('#scoreStatus'),'Choose a valid programme.','error');
      if (!Number.isFinite(points) || points<0) return status($('#scoreStatus'),'Enter a valid non-negative point value.','error');
      status($('#scoreStatus'),'Saving points…');
      let error, message;
      if(scoreType==='team') {
        ({ error } = await client.from('team_scores').upsert({team_id,programme_id,points,updated_at:new Date().toISOString()},{onConflict:'team_id,programme_id'}));
        message=`Saved ${points} team/group points for ${FK.teamName(team_id)} in ${programme.name}.`;
      } else {
        const participant_id=$('#scoreParticipant').value;
        const member=D.members.find(m=>m.id===participant_id);
        if (!member || member.category!==programme.category || member.team!==team_id) return status($('#scoreStatus'),'Participant, team and programme categories do not match.','error');
        ({ error } = await client.from('scores').upsert({participant_id,programme_id,points,updated_at:new Date().toISOString()},{onConflict:'participant_id,programme_id'}));
        message=`Saved ${points} points for ${member.name}.`;
      }
      if(error) return status($('#scoreStatus'),error.message,'error');
      await FK.loadMarks(); renderTables(); syncExistingScore();
      status($('#scoreStatus'),`${message} Team totals are updated automatically.`);
    });

    $('#galleryForm').addEventListener('submit', async e => {
      e.preventDefault();
      const file=$('#galleryFile').files[0]; if(!file) return;
      const title=$('#galleryTitle').value.trim() || 'Melaad Fest 2026';
      const safe=file.name.replace(/[^a-zA-Z0-9._-]+/g,'-').slice(-100);
      const path=`${Date.now()}-${crypto.randomUUID()}-${safe}`;
      status($('#galleryStatus'),'Uploading media…');
      const { error: uploadError }=await client.storage.from('gallery').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
      if(uploadError) return status($('#galleryStatus'),uploadError.message,'error');
      const { data: pub }=client.storage.from('gallery').getPublicUrl(path);
      const { error: rowError }=await client.from('gallery').insert({title,file_url:pub.publicUrl,file_path:path,media_type:file.type||'application/octet-stream'});
      if(rowError){ await client.storage.from('gallery').remove([path]); return status($('#galleryStatus'),rowError.message,'error'); }
      $('#galleryForm').reset(); await FK.loadGallery(); renderTables(); status($('#galleryStatus'),'Gallery item uploaded successfully. Visitors can now view and download it.');
    });

   $('#visitorRefreshBtn')
  ?.addEventListener(
    'click',
    async () => {

      const btn =
        $('#visitorRefreshBtn');


      const original =
        btn.textContent;


      btn.disabled = true;

      btn.textContent =
        'Refreshing…';


      await loadVisitors();


      renderTables();


      btn.disabled = false;

      btn.textContent =
        original;

    }
  );

    async function deleteScore(id){
      if(!confirm('Delete this mark entry?')) return;
      const { error }=await client.from('scores').delete().eq('id',id);
      if(error) return alert(error.message);
      await FK.loadMarks(); renderTables(); syncExistingScore();
    }
    async function deleteTeamScore(id){
      if(!confirm('Delete this team/group mark entry?')) return;
      const { error }=await client.from('team_scores').delete().eq('id',id);
      if(error) return alert(error.message);
      await FK.loadMarks(); renderTables(); syncExistingScore();
    }
    async function deleteGallery(id,path){
      if(!confirm('Delete this gallery item?')) return;
      if(path) await client.storage.from('gallery').remove([path]);
      const { error }=await client.from('gallery').delete().eq('id',id);
      if(error) return alert(error.message);
      await FK.loadGallery(); renderTables();
    }

    function renderTables(){
      const marks=[...FK.state.marks].sort((a,b)=>{
        const ma=D.members.find(m=>m.id===a.participant_id), mb=D.members.find(m=>m.id===b.participant_id);
        return (ma?.name||'').localeCompare(mb?.name||'');
      });
      const teamMarks=[...FK.state.teamScores].map(m=>({...m,_team:true}));
      const allMarks=[...marks,...teamMarks];
      $('#marksTable').innerHTML = allMarks.length ? allMarks.map(m=>{
        const p=D.programmes.find(x=>x.id===m.programme_id);
        if(m._team) return `<tr><td><b>Team / Group Score</b></td><td>${FK.esc(FK.teamName(m.team_id))}</td><td>${FK.esc(p?.name||m.programme_id)}<br><small>${FK.esc(p?.category||'')} · ${FK.esc(p?.mode||'')}</small></td><td><b>${Number(m.points||0)}</b></td><td><button class="btn btn-danger btn-small" data-del-team-score="${m.id}">Delete</button></td></tr>`;
        const person=D.members.find(x=>x.id===m.participant_id);
        return `<tr><td>${FK.esc(person?.name||m.participant_id)}</td><td>${FK.esc(FK.teamName(person?.team||''))}</td><td>${FK.esc(p?.name||m.programme_id)}<br><small>${FK.esc(p?.category||'')} · ${FK.esc(p?.mode||'')}</small></td><td><b>${Number(m.points||0)}</b></td><td><button class="btn btn-danger btn-small" data-del-score="${m.id}">Delete</button></td></tr>`;
      }).join('') : `<tr><td colspan="5">No marks entered yet.</td></tr>`;
      document.querySelectorAll('[data-del-score]').forEach(b=>b.onclick=()=>deleteScore(b.dataset.delScore));
      document.querySelectorAll('[data-del-team-score]').forEach(b=>b.onclick=()=>deleteTeamScore(b.dataset.delTeamScore));

      $('#galleryTable').innerHTML = FK.state.gallery.length ? FK.state.gallery.map(g=>`<tr><td>${FK.esc(g.title||'Melaad Fest 2026')}</td><td>${FK.esc(g.media_type||'')}</td><td>${new Date(g.created_at).toLocaleString()}</td><td><button class="btn btn-danger btn-small" data-del-gallery="${g.id}" data-path="${FK.esc(g.file_path||'')}">Delete</button></td></tr>`).join('') : `<tr><td colspan="4">No gallery uploads yet.</td></tr>`;
      document.querySelectorAll('[data-del-gallery]').forEach(b=>b.onclick=()=>deleteGallery(b.dataset.delGallery,b.dataset.path));
      
     const totalVisitors =
  visitors.length;


const totalEntries =
  visitorSessions.length;


const totalWatchSeconds =
  visitorSessions.reduce(
    (sum, session) =>
      sum +
      Number(
        session.duration_seconds || 0
      ),
    0
  );


if($('#totalVisitors')){

  $('#totalVisitors')
    .textContent =
      String(totalVisitors);

}


if($('#totalEntries')){

  $('#totalEntries')
    .textContent =
      String(totalEntries);

}


if($('#totalWatchTime')){

  $('#totalWatchTime')
    .textContent =
      formatDuration(
        totalWatchSeconds
      );

}



const visitorTable =
  $('#visitorTable');


if(visitorTable){

  visitorTable.innerHTML =

    visitors.length

    ? visitors.map(v => {


        const sessions =
          sessionsForVisitor(v);


        const watchSeconds =
          sessions.reduce(
            (sum, session) =>

              sum +
              Number(
                session.duration_seconds || 0
              ),

            0
          );


        const lastSeen =
          sessions.length

          ? sessions.reduce(
              (latest, session) => {

                const value =
                  new Date(
                    session.last_seen_at ||
                    session.started_at ||
                    0
                  ).getTime();


                return value > latest
                  ? value
                  : latest;

              },
              0
            )

          : new Date(
              v.created_at
            ).getTime();


        return `

          <tr>

            <td>
              ${FK.esc(v.name)}
            </td>

            <td>
              ${FK.esc(v.place)}
            </td>

            <td>
              ${new Date(
                v.created_at
              ).toLocaleString()}
            </td>

            <td>
              <b>
                ${sessions.length}
              </b>
            </td>

            <td>
              <b>
                ${
                  formatDuration(
                    watchSeconds
                  )
                }
              </b>
            </td>

            <td>
              ${
                new Date(
                  lastSeen
                ).toLocaleString()
              }
            </td>

          </tr>

        `;

      }).join('')

    : `

      <tr>

        <td colspan="6">
          No visitor entries yet.
        </td>

      </tr>

    `;

}
    }const visitorTable=$('#visitorTable');

    client.auth.onAuthStateChange(()=>setTimeout(showSession,0));
    await showSession();
  });
})();
