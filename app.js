(() => {
  const D = window.FK_DATA;
  const C = window.FK_CONFIG;
  const page = document.body.dataset.page || 'home';

  const configured =
    C &&
    C.SUPABASE_URL &&
    C.SUPABASE_ANON_KEY &&
    !C.SUPABASE_URL.includes('YOUR-PROJECT') &&
    !C.SUPABASE_ANON_KEY.includes('YOUR_');

  const client =
    configured && window.supabase
      ? window.supabase.createClient(
          C.SUPABASE_URL,
          C.SUPABASE_ANON_KEY
        )
      : null;


  const state = {
    marks: [],
    teamScores: [],
    gallery: []
  };


  const $ = (s, root = document) =>
    root.querySelector(s);

  const $$ = (s, root = document) =>
    [...root.querySelectorAll(s)];


  const esc = (v = '') =>
    String(v).replace(
      /[&<>'"]/g,
      c =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;'
        })[c]
    );


  function teamName(id) {
    return (
      D.teams.find(t => t.id === id)?.name ||
      id
    );
  }


  function memberById(id) {
    return D.members.find(
      m => m.id === id
    );
  }


  function programmeById(id) {
    return D.programmes.find(
      p => p.id === id
    );
  }


  function initials(name) {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map(x => x[0])
      .join('')
      .toUpperCase();
  }


  function sum(list) {
    return list.reduce(
      (a, b) =>
        a + Number(b.points || 0),
      0
    );
  }


  function memberTotal(memberId) {
    return sum(
      state.marks.filter(
        m =>
          m.participant_id ===
          memberId
      )
    );
  }


  function teamTotal(
    teamId,
    category = null
  ) {

    const ids = new Set(
      D.members
        .filter(
          m =>
            m.team === teamId &&
            (
              !category ||
              m.category === category
            )
        )
        .map(m => m.id)
    );


    const individual = sum(
      state.marks.filter(
        m =>
          ids.has(
            m.participant_id
          )
      )
    );


    const directTeam = sum(
      state.teamScores.filter(
        t =>
          t.team_id === teamId &&
          (
            !category ||
            programmeById(
              t.programme_id
            )?.category === category
          )
      )
    );


    return (
      individual +
      directTeam
    );
  }


  function teamProgrammeTotal(
    teamId,
    programmeId
  ) {

    const ids = new Set(
      D.members
        .filter(
          m =>
            m.team === teamId
        )
        .map(m => m.id)
    );


    return (
      sum(
        state.marks.filter(
          m =>
            m.programme_id ===
              programmeId &&
            ids.has(
              m.participant_id
            )
        )
      ) +

      sum(
        state.teamScores.filter(
          t =>
            t.team_id === teamId &&
            t.programme_id ===
              programmeId
        )
      )
    );
  }



  /* =====================================
     HEADER + FOOTER
  ===================================== */

  function buildChrome() {

    const nav = [

      [
        'home',
        'index.html',
        'Home'
      ],

      [
        'competitions',
        'competitions.html',
        'Competitions'
      ],

      [
        'individual',
        'individual-marks.html',
        'Individual Marks'
      ],

      [
        'gallery',
        'gallery.html',
        'Gallery'
      ],

      [
        'about',
        'about.html',
        'About'
      ],

      [
        'contact',
        'contact.html',
        'Contact'
      ]

    ];


    const header =
      document.createElement(
        'header'
      );


    header.className =
      'site-header';


    header.innerHTML = `

      <div class="shell nav-wrap">

        <a
          class="brand"
          href="index.html"
        >

          <span class="brand-mark">
            FK
          </span>

          <span class="brand-copy">

            <strong>
              Fasthabiqul Khairath
            </strong>

            <span>
              Melaad Fest 2026
            </span>

          </span>

        </a>


        <button
          class="menu-btn"
          aria-label="Open navigation"
        >
          Menu
        </button>


        <nav class="nav-links">

          ${nav
            .map(
              ([id, href, label]) => `

                <a
                  href="${href}"
                  class="${
                    page === id
                      ? 'active'
                      : ''
                  }"
                >
                  ${label}
                </a>

              `
            )
            .join('')}


          <a
            class="nav-admin ${
              page === 'admin'
                ? 'active'
                : ''
            }"
            href="admin.html"
          >
            Admin
          </a>

        </nav>

      </div>

    `;


    document.body.prepend(
      header
    );


    $('.menu-btn', header)
      ?.addEventListener(
        'click',
        () =>
          $(
            '.nav-links',
            header
          )
            .classList
            .toggle('open')
      );


    const footer =
      document.createElement(
        'footer'
      );


    footer.className =
      'site-footer';


    footer.innerHTML = `

      <div class="shell footer-grid">

        <div>

          <strong>
            Thalameez Sayyid Marhoom Ramanthali
          </strong>

          <br>

          Fasthabiqul Khairath
          ·
          Melaad Fest 2026

        </div>

        <div>
          Live Competition & Results Portal
        </div>

      </div>

    `;


    document.body.append(
      footer
    );
  }



  /* =====================================
     LOAD SCORES FROM SUPABASE
  ===================================== */

  async function loadMarks() {

    if (!client) {

      try {

        state.marks =
          JSON.parse(
            localStorage.getItem(
              'fk_demo_marks'
            ) || '[]'
          );

      } catch {

        state.marks = [];

      }

      return;
    }


    const [
      {
        data,
        error
      },
      {
        data: teamData,
        error: teamError
      }
    ] = await Promise.all([

      client
        .from('scores')
        .select('*'),

      client
        .from('team_scores')
        .select('*')

    ]);


    if (!error) {

      state.marks =
        data || [];

    } else {

      console.error(
        'Scores loading error:',
        error
      );

    }


    if (!teamError) {

      state.teamScores =
        teamData || [];

    } else {

      console.error(
        'Team scores loading error:',
        teamError
      );

    }
  }



  /* =====================================
     LOAD GALLERY
  ===================================== */

  async function loadGallery() {

    if (!client) {

      state.gallery = [];

      return;
    }


    const {
      data,
      error
    } = await client

      .from('gallery')

      .select('*')

      .order(
        'created_at',
        {
          ascending: false
        }
      );


    if (!error) {

      state.gallery =
        data || [];

    } else {

      console.error(
        'Gallery loading error:',
        error
      );

    }
  }



  /* =====================================
     HOME PAGE
  ===================================== */

  function renderHome() {

    const totals =
      Object.fromEntries(

        D.teams.map(
          team => [

            team.id,

            {

              senior:
                teamTotal(
                  team.id,
                  'Senior'
                ),

              junior:
                teamTotal(
                  team.id,
                  'Junior'
                ),

              overall:
                teamTotal(
                  team.id
                )

            }

          ]
        )

      );


    $$('[data-score]')
      .forEach(el => {

        const [
          teamId,
          category
        ] =
          el.dataset.score
            .split(':');


        el.textContent =
          totals[teamId]?.[
            category
          ] ?? 0;

      });


    const teamRanking =
      D.teams

        .slice()

        .sort(
          (a, b) =>

            (
              totals[b.id]
                ?.overall ?? 0
            )

            -

            (
              totals[a.id]
                ?.overall ?? 0
            )

        );


    const banner =
      $('#teamChampion');


    if (
      banner &&
      teamRanking.length
    ) {

      if (

        teamRanking.length > 1

        &&

        (
          totals[
            teamRanking[0].id
          ]?.overall ?? 0
        )

        ===

        (
          totals[
            teamRanking[1].id
          ]?.overall ?? 0
        )

      ) {

        banner.textContent =
          `Overall Team Standing: Level at ${
            totals[
              teamRanking[0].id
            ]?.overall ?? 0
          } points`;

      } else {

        const first =
          teamRanking[0];


        banner.textContent =
          `Overall Team Leader: ${
            first.name
          } — ${
            totals[
              first.id
            ]?.overall ?? 0
          } points`;

      }

    }


    function renderLeaderboard(
      rootId,
      members,
      limit = 3
    ) {

      const root =
        $(rootId);


      if (!root) return;


      const ranked =
        members

          .map(
            m => ({

              ...m,

              total:
                memberTotal(
                  m.id
                )

            })
          )

          .sort(
            (a, b) =>

              b.total -
              a.total

              ||

              a.name
                .localeCompare(
                  b.name
                )
          )

          .slice(
            0,
            limit
          );


      if (
        !ranked.length
      ) {

        root.innerHTML = `

          <div class="empty">
            No scores available yet.
          </div>

        `;


        return;
      }


      root.innerHTML =
        ranked

          .map(
            (
              m,
              i
            ) => `

              <div class="champion-row">

                <div class="rank">
                  ${i + 1}
                </div>


                <div>

                  <strong>
                    ${esc(m.name)}
                  </strong>


                  <small>

                    ${esc(
                      teamName(
                        m.team
                      )
                    )}

                    ·

                    ${esc(
                      m.category
                    )}

                  </small>

                </div>


                <div class="champion-points">

                  ${m.total}

                </div>

              </div>

            `
          )

          .join('');

    }


    const juniorMembers =
      D.members.filter(
        m =>
          m.category ===
          'Junior'
      );


    renderLeaderboard(
      '#juniorLeaderList',
      juniorMembers,
      3
    );


    const seniorMembers =
      D.members.filter(
        m =>
          m.category ===
          'Senior'
      );


    renderLeaderboard(
      '#seniorLeaderList',
      seniorMembers,
      3
    );


    renderLeaderboard(
      '#overallLeaderList',
      D.members,
      3
    );

  }



  /* =====================================
     COMPETITIONS PAGE
  ===================================== */

  function renderCompetitions() {

    D.teams.forEach(
      team => {

        const root =
          $(
            `#competition-${team.id}`
          );


        if (!root) return;


        root.innerHTML =

          [
            'Senior',
            'Junior'
          ]

            .map(
              category => {

                return [

                  'Stage',

                  'Non-Stage'

                ]

                  .map(
                    mode => {

                      const programmes =
                        D.programmes
                          .filter(
                            p =>
                              p.category === category &&
                              p.mode === mode
                          );


                      return `

                        <div class="category-block">

                          <div class="category-label">

                            ${category}
                            ·
                            ${mode}

                          </div>


                          <div class="programme-list">

                            ${programmes
                              .map(
                                p => `

                                  <div class="programme-row">

                                    <div>

                                      <strong>
                                        ${esc(
                                          p.name
                                        )}
                                      </strong>

                                      <div class="meta">

                                        ${category}
                                        ${mode}

                                      </div>

                                    </div>


                                    <div class="programme-points">

                                      ${
                                        teamProgrammeTotal(
                                          team.id,
                                          p.id
                                        )
                                      }

                                    </div>

                                  </div>

                                `
                              )
                              .join('')}

                          </div>

                        </div>

                      `;

                    }
                  )

                  .join('');

              }
            )

            .join('');

      }
    );
  }



  /* =====================================
     INDIVIDUAL MARKS PAGE
  ===================================== */

  function renderIndividual() {

    D.teams.forEach(
      team => {

        const root =
          $(
            `#people-${team.id}`
          );


        if (!root) return;


        root.innerHTML =

          [
            'Senior',
            'Junior'
          ]

            .map(
              category => {

                const members =
                  D.members.filter(
                    m =>
                      m.team === team.id &&
                      m.category === category
                  );


                return `

                  <div class="category-block">

                    <div class="category-label">
                      ${category}s
                    </div>


                    <div class="person-list">

                      ${members
                        .map(
                          m => `

                            <div
                              class="person-card"
                              data-person="${m.id}"
                            >

                              <div class="avatar">

                                ${initials(
                                  m.name
                                )}

                              </div>


                              <div class="person-copy">

                                <strong>

                                  ${esc(
                                    m.name
                                  )}

                                </strong>


                                <small>

                                  ${esc(
                                    m.role ||
                                    category
                                  )}

                                </small>

                              </div>


                              <div class="person-total">

                                ${memberTotal(
                                  m.id
                                )}

                              </div>

                            </div>

                          `
                        )
                        .join('')}

                    </div>

                  </div>

                `;

              }
            )

            .join('');

      }
    );


    $$('[data-person]')
      .forEach(
        el =>
          el.addEventListener(
            'click',
            () =>
              openPerson(
                el.dataset.person
              )
          )
      );
  }



  /* =====================================
     INDIVIDUAL MODAL
  ===================================== */

  function openPerson(id) {

    const m =
      memberById(id);


    const modal =
      $('#personModal');


    if (
      !m ||
      !modal
    ) return;


    function placeFromPoints(
      points
    ) {

      const p =
        Number(
          points || 0
        );


      if (p === 5) {

        return '1st Place';

      }


      if (p === 3) {

        return '2nd Place';

      }


      if (p === 1) {

        return '3rd Place';

      }


      return '';
    }


    $('#personModalName')
      .textContent =
      m.name;


    $('#personModalMeta')
      .textContent =

      `${teamName(
        m.team
      )} · ${
        m.category
      }${
        m.role
          ? ' · ' +
            m.role
          : ''
      }`;


    $('#personModalTotal')
      .textContent =
      memberTotal(
        m.id
      );


    const rows =
      state.marks

        .filter(
          x =>
            x.participant_id ===
            id
        )

        .sort(
          (a, b) => {

            const pa =
              programmeById(
                a.programme_id
              );


            const pb =
              programmeById(
                b.programme_id
              );


            return (
              pa?.name || ''
            ).localeCompare(
              pb?.name || ''
            );

          }
        );


    $('#personBreakdown')
      .innerHTML =

      rows.length

        ?

        rows
          .map(
            r => {

              const p =
                programmeById(
                  r.programme_id
                );


              const points =
                Number(
                  r.points || 0
                );


              const place =
                placeFromPoints(
                  points
                );


              return `

                <div class="breakdown-row">

                  <div>

                    <b>

                      ${esc(
                        p?.name ||
                        r.programme_id
                      )}

                    </b>


                    <small>

                      ${esc(
                        p?.category ||
                        ''
                      )}

                      ·

                      ${esc(
                        p?.mode ||
                        ''
                      )}

                    </small>


                    ${
                      place

                        ?

                        `<small>
                          <b>
                            ${place}
                          </b>
                        </small>`

                        :

                        ''
                    }

                  </div>


                  <strong>

                    ${points}


                    ${
                      place

                        ?

                        `<br>

                        <span
                          style="
                            font-size:12px;
                            color:var(--gold);
                          "
                        >

                          ${place}

                        </span>`

                        :

                        ''
                    }

                  </strong>

                </div>

              `;

            }
          )

          .join('')

        :

        `

          <div class="empty">

            No programme points
            have been added yet.

          </div>

        `;


    modal.classList.add(
      'open'
    );
  }



  /* =====================================
     GALLERY
  ===================================== */

  function renderGallery() {

    const root =
      $('#galleryGrid');


    if (!root) return;


    if (
      !state.gallery.length
    ) {

      root.innerHTML = `

        <div
          class="empty"
          style="grid-column:1/-1"
        >

          Gallery items will appear
          here after the admin uploads
          photos or videos.

        </div>

      `;


      return;
    }


    root.innerHTML =
      state.gallery

        .map(
          item => {

            const isVideo =
              (
                item.media_type ||
                ''
              )
                .startsWith(
                  'video'
                );


            const media =

              isVideo

                ?

                `

                  <video
                    controls
                    preload="metadata"
                  >

                    <source
                      src="${esc(
                        item.file_url
                      )}"
                    >

                  </video>

                `

                :

                `

                  <img
                    src="${esc(
                      item.file_url
                    )}"
                    alt="${esc(
                      item.title ||
                      'Gallery photo'
                    )}"
                    loading="lazy"
                  >

                `;


            return `

              <article class="gallery-card">

                <div class="gallery-media">

                  ${media}

                </div>


                <div class="gallery-body">

                  <h3>

                    ${esc(
                      item.title ||
                      'Melaad Fest 2026'
                    )}

                  </h3>


                  <p>

                    ${
                      new Date(
                        item.created_at
                      )
                        .toLocaleString()
                    }

                  </p>


                  <div class="gallery-actions">

                    <button
                      class="
                        btn
                        btn-secondary
                        btn-small
                      "
                      data-gallery-download="${esc(
                        item.file_url
                      )}"
                      data-gallery-title="${esc(
                        item.title ||
                        'melaad-fest-2026'
                      )}"
                    >

                      Download

                    </button>

                  </div>

                </div>

              </article>

            `;

          }
        )

        .join('');


    $$(
      '[data-gallery-download]'
    )
      .forEach(
        btn =>
          btn.addEventListener(
            'click',
            async () => {

              const original =
                btn.textContent;


              btn.disabled =
                true;


              btn.textContent =
                'Downloading…';


              try {

                const res =
                  await fetch(
                    btn.dataset.galleryDownload
                  );


                if (
                  !res.ok
                ) {

                  throw new Error(
                    'Download failed'
                  );

                }


                const blob =
                  await res.blob();


                const u =
                  URL.createObjectURL(
                    blob
                  );


                const a =
                  document.createElement(
                    'a'
                  );


                const ext =
                  (
                    blob.type
                      .split('/')[1]
                    ||
                    'file'
                  )

                    .split(';')[0]

                    .replace(
                      'jpeg',
                      'jpg'
                    );


                a.href =
                  u;


                a.download =
                  (
                    btn.dataset.galleryTitle
                    ||
                    'melaad-fest'
                  )

                    .replace(
                      /[^a-z0-9-_]+/gi,
                      '-'
                    )

                  +

                  '.'

                  +

                  ext;


                document.body.append(
                  a
                );


                a.click();


                a.remove();


                URL.revokeObjectURL(
                  u
                );


              } catch {

                window.open(
                  btn.dataset.galleryDownload,
                  '_blank',
                  'noopener'
                );

              }


              btn.disabled =
                false;


              btn.textContent =
                original;

            }
          )
      );
  }



  /* =====================================
     MODAL CONTROLS
  ===================================== */

  function installPersonModal() {

    if (
      !$('#personModal')
    ) return;


    $('#closePersonModal')
      ?.addEventListener(
        'click',
        () =>
          $('#personModal')
            .classList
            .remove(
              'open'
            )
      );


    $('#personModal')
      ?.addEventListener(
        'click',
        e => {

          if (
            e.target.id ===
            'personModal'
          ) {

            e.currentTarget
              .classList
              .remove(
                'open'
              );

          }

        }
      );
  }



  /* =====================================
     VISITOR ANALYTICS
  ===================================== */

  function getStoredVisitor() {

    try {

      const raw =
        localStorage.getItem(
          'fk_visitor'
        );


      if (!raw) {
        return null;
      }


      const parsed =
        JSON.parse(raw);


      if (
        !parsed?.name ||
        !parsed?.place
      ) {

        return null;
      }


      return parsed;

    } catch {

      return null;

    }
  }



  function startVisitorTracking(
    visitor
  ) {

    if (
      page === 'admin' ||
      !client ||
      !visitor?.name ||
      !visitor?.place
    ) {

      return;

    }


    const keyName =
      'fk_visit_session_key';

    const secondsName =
      'fk_visit_active_seconds';


    let sessionKey =
      sessionStorage.getItem(
        keyName
      );


    if (!sessionKey) {

      if (
        window.crypto &&
        typeof crypto.randomUUID ===
          'function'
      ) {

        sessionKey =
          crypto.randomUUID();

      } else {

        sessionKey =
          `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`;

      }


      sessionStorage.setItem(
        keyName,
        sessionKey
      );


      sessionStorage.setItem(
        secondsName,
        '0'
      );
    }


    let activeSeconds =
      Math.max(
        0,
        Number(
          sessionStorage.getItem(
            secondsName
          )
        ) || 0
      );


    let lastTick =
      Date.now();


    client.rpc(
      'start_visitor_session',
      {
        p_name:
          visitor.name,

        p_place:
          visitor.place,

        p_session_key:
          sessionKey,

        p_visitor_created_at:
          visitor.at || null
      }
    )
      .then(
        ({ error }) => {

          if (error) {

            console.error(
              'Visitor session start failed:',
              error
            );

          }
        }
      );


    let syncing =
      false;


    async function syncVisitTime() {

      const now =
        Date.now();


      const elapsed =
        Math.max(
          0,
          Math.min(
            (
              now -
              lastTick
            ) / 1000,
            30
          )
        );


      if (
        document.visibilityState ===
        'visible'
      ) {

        activeSeconds +=
          elapsed;

      }


      lastTick =
        now;


      sessionStorage.setItem(
        secondsName,
        String(
          activeSeconds
        )
      );


      if (syncing) {
        return;
      }


      syncing =
        true;


      try {

        const {
          error
        } =
          await client.rpc(
            'touch_visitor_session',
            {
              p_session_key:
                sessionKey,

              p_duration_seconds:
                Math.round(
                  activeSeconds
                )
            }
          );


        if (error) {

          console.error(
            'Visitor session update failed:',
            error
          );

        }

      } catch (error) {

        console.error(
          'Visitor tracking error:',
          error
        );

      } finally {

        syncing =
          false;

      }
    }


    const timer =
      setInterval(
        syncVisitTime,
        10000
      );


    document.addEventListener(
      'visibilitychange',
      syncVisitTime
    );


    window.addEventListener(
      'pagehide',
      () => {

        clearInterval(
          timer
        );

        syncVisitTime();

      },
      {
        once: true
      }
    );
  }



  /* =====================================
     VISITOR ACCESS GATE
  ===================================== */

  function installAccessGate() {

    if (
      page === 'admin'
    ) {

      return;
    }


    if (
      localStorage.getItem(
        'fk_visitor'
      )
    ) {

      return;
    }


    const gate =
      document.createElement(
        'div'
      );


    gate.className =
      'access-gate open';


    gate.id =
      'accessGate';


    gate.innerHTML = `

      <div class="access-card">

        <div class="access-emblem">
          ☾
        </div>

        <div class="eyebrow">
          Welcome to Melaad Fest 2026
        </div>

        <h1>
          Fasthabiqul Khairath
        </h1>

        <p>
          Please enter your name and place
          to access the live competition website.
        </p>

        <form
          id="visitorForm"
          class="form-grid"
        >

          <label>

            Name

            <input
              id="visitorName"
              required
              maxlength="80"
              placeholder="Your name"
            >

          </label>


          <label>

            Place

            <input
              id="visitorPlace"
              required
              maxlength="100"
              placeholder="Your place"
            >

          </label>


          <button
            class="btn btn-primary"
            type="submit"
          >

            Enter Website

          </button>


          <div
            id="visitorStatus"
            class="status"
          ></div>

        </form>

      </div>

    `;


    document.body.append(
      gate
    );


    $('#visitorForm')
      ?.addEventListener(
        'submit',
        async e => {

          e.preventDefault();


          const name =
            $('#visitorName')
              .value
              .trim();


          const place =
            $('#visitorPlace')
              .value
              .trim();


          if (
            !name ||
            !place
          ) {

            return;
          }


          const st =
            $('#visitorStatus');


          st.className =
            'status show';


          st.textContent =
            'Opening website…';


          if (client) {

            const {
              data,
              error
            } =
              await client
                .from(
                  'visitors'
                )
                .insert({
                  name,
                  place
                })
                .select()
                .single();


            if (error) {

              console.error(
                'Visitor registration error:',
                error
              );


              st.className =
                'status show error';


              st.textContent =
                'Could not save your entry. Please try again.';


              return;
            }


            const visitor = {

              name,

              place,

              at:
                data?.created_at ||
                new Date()
                  .toISOString()

            };


            localStorage.setItem(
              'fk_visitor',
              JSON.stringify(
                visitor
              )
            );


            gate.classList.remove(
              'open'
            );


            startVisitorTracking(
              visitor
            );


            return;
          }


          const visitor = {

            name,

            place,

            at:
              new Date()
                .toISOString()

          };


          localStorage.setItem(
            'fk_visitor',
            JSON.stringify(
              visitor
            )
          );


          gate.classList.remove(
            'open'
          );

        }
      );
  }



  /* =====================================
     REALTIME SCORE UPDATE
  ===================================== */

  function subscribeRealtime() {

    if (!client) return;


    client
      .channel(
        'public-scores'
      )

      .on(

        'postgres_changes',

        {
          event: '*',
          schema: 'public',
          table: 'scores'
        },

        async () => {

          await loadMarks();

          renderCurrent();

        }

      )

      .on(

        'postgres_changes',

        {
          event: '*',
          schema: 'public',
          table: 'team_scores'
        },

        async () => {

          await loadMarks();

          renderCurrent();

        }

      )

      .subscribe();


    if (
      page === 'gallery'
    ) {

      client
        .channel(
          'public-gallery'
        )

        .on(

          'postgres_changes',

          {
            event: '*',
            schema: 'public',
            table: 'gallery'
          },

          async () => {

            await loadGallery();

            renderGallery();

          }

        )

        .subscribe();

    }
  }



  /* =====================================
     PAGE RENDERING
  ===================================== */

  function renderCurrent() {

    if (
      page === 'home'
    ) {

      renderHome();

    }


    if (
      page === 'competitions'
    ) {

      renderCompetitions();

    }


    if (
      page === 'individual'
    ) {

      renderIndividual();

    }

  }



  /* =====================================
     INITIALIZE WEBSITE
  ===================================== */

  async function init() {

    try {

      buildChrome();

      installAccessGate();

      installPersonModal();


      const storedVisitor =
        getStoredVisitor();


      if (
        storedVisitor
      ) {

        startVisitorTracking(
          storedVisitor
        );

      }


      await loadMarks();


      if (
        page === 'gallery'
      ) {

        await loadGallery();

      }


      renderCurrent();


      if (
        page === 'gallery'
      ) {

        renderGallery();

      }


      subscribeRealtime();


      window.FK = {

        client,

        configured,

        state,

        loadMarks,

        loadGallery,

        renderCurrent,

        renderGallery,

        teamTotal,

        teamProgrammeTotal,

        memberTotal,

        teamName,

        memberById,

        programmeById,

        esc

      };


      document.dispatchEvent(
        new CustomEvent(
          'fk-ready'
        )
      );


    } catch (error) {

      console.error(
        'Website initialization failed:',
        error
      );

    }
  }



  document.addEventListener(
    'DOMContentLoaded',
    init
  );

})();