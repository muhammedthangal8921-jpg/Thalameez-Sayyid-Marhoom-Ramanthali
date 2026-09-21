(() => {

  const D = window.FK_DATA;

  const $ = s =>
    document.querySelector(s);


  /* =====================================
     STATUS HELPERS
  ===================================== */

  function status(
    el,
    msg,
    type = 'ok'
  ) {

    if (!el) return;

    el.textContent = msg;

    el.className =
      `status show ${type}`;
  }


  function clearStatus(el) {

    if (!el) return;

    el.textContent = '';

    el.className =
      'status';
  }



  /* =====================================
     WAIT FOR APP.JS
  ===================================== */

  document.addEventListener(
    'fk-ready',
    async () => {

      const FK =
        window.FK;


      if (!FK) {

        console.error(
          'FK application object is missing.'
        );

        return;
      }


      const client =
        FK.client;


      if (
        !FK.configured ||
        !client
      ) {

        const warn =
          $('#setupWarning');


        status(
          warn,
          'Website preview is ready, but live admin features need Supabase configuration.',
          'error'
        );


        const loginButton =
          $('#loginForm button');


        if (loginButton) {

          loginButton.disabled =
            true;

        }


        return;
      }



      /* =====================================
         ADMIN VERIFICATION
      ===================================== */

      async function isApprovedAdmin() {

        const {
          data,
          error
        } =
          await client.rpc(
            'is_admin'
          );


        if (error) {

          console.error(
            'Admin verification failed:',
            error
          );

          return false;
        }


        return data === true;
      }



      /* =====================================
         LOCAL ADMIN DATA
      ===================================== */

      let visitors = [];

      let visitorSessions = [];



      /* =====================================
         LOAD VISITOR ANALYTICS
      ===================================== */

      async function loadVisitors() {

        const [
          visitorResult,
          sessionResult
        ] =
          await Promise.all([

            client
              .from('visitors')
              .select('*')
              .order(
                'created_at',
                {
                  ascending: false
                }
              )
              .limit(5000),


            client
              .from(
                'visitor_sessions'
              )
              .select('*')
              .order(
                'started_at',
                {
                  ascending: false
                }
              )
              .limit(10000)

          ]);


        if (
          visitorResult.error
        ) {

          console.error(
            'Visitor load failed:',
            visitorResult.error
          );


          visitors = [];

        } else {

          visitors =
            visitorResult.data || [];

        }


        if (
          sessionResult.error
        ) {

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



      /* =====================================
         FORMAT WATCHING TIME
      ===================================== */

      function formatDuration(
        totalSeconds
      ) {

        const seconds =
          Math.max(
            0,
            Math.round(
              Number(
                totalSeconds
              ) || 0
            )
          );


        const hours =
          Math.floor(
            seconds / 3600
          );


        const minutes =
          Math.floor(
            (
              seconds % 3600
            ) / 60
          );


        const secs =
          seconds % 60;


        if (hours > 0) {

          return (
            `${hours}h ` +
            `${minutes}m ` +
            `${secs}s`
          );

        }


        if (minutes > 0) {

          return (
            `${minutes}m ` +
            `${secs}s`
          );

        }


        return `${secs}s`;
      }



      /* =====================================
         FIND SESSIONS FOR EACH VISITOR
      ===================================== */

      function sessionsForVisitor(
        visitor
      ) {

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
          session => {

            if (
              session.visitor_id ===
              visitor.id
            ) {

              return true;
            }


            if (
              session.visitor_id
            ) {

              return false;
            }


            return (

              String(
                session.name || ''
              )
                .trim()
                .toLowerCase() ===
              name

              &&

              String(
                session.place || ''
              )
                .trim()
                .toLowerCase() ===
              place

            );

          }
        );
      }



      /* =====================================
         ADMIN SESSION
      ===================================== */

      async function showSession() {

        const {
          data
        } =
          await client.auth
            .getSession();


        const session =
          data?.session;


        const approved =
          Boolean(
            session?.user
          )
          &&
          await isApprovedAdmin();


        const adminLogin =
          $('#adminLogin');


        const adminApp =
          $('#adminApp');


        if (adminLogin) {

          adminLogin.hidden =
            approved;

        }


        if (adminApp) {

          adminApp.hidden =
            !approved;

        }


        if (approved) {

          await Promise.all([

            FK.loadMarks(),

            FK.loadGallery(),

            loadVisitors()

          ]);


          populateProgrammes();

          populateParticipants();

          syncScoreType();

          renderTables();


        } else if (
          session?.user
        ) {

          status(
            $('#loginStatus'),
            'This email is signed in but is not approved as an admin.',
            'error'
          );


          await client.auth
            .signOut();

        }

      }



      /* =====================================
         ADMIN LOGIN
      ===================================== */

      const loginForm =
        $('#loginForm');


      if (loginForm) {

        loginForm.addEventListener(
          'submit',
          async event => {

            event.preventDefault();


            clearStatus(
              $('#loginStatus')
            );


            const email =
              $('#adminEmail')
                ?.value
                .trim()
                .toLowerCase();


            const password =
              $('#adminPassword')
                ?.value;


            if (
              !email ||
              !password
            ) {

              return status(
                $('#loginStatus'),
                'Enter your admin email and password.',
                'error'
              );

            }


            status(
              $('#loginStatus'),
              'Signing in...'
            );


            const {
              error
            } =
              await client.auth
                .signInWithPassword({
                  email,
                  password
                });


            if (error) {

              return status(
                $('#loginStatus'),
                error.message,
                'error'
              );

            }


            const approved =
              await isApprovedAdmin();


            if (!approved) {

              await client.auth
                .signOut();


              return status(
                $('#loginStatus'),
                'This account does not have administrator access.',
                'error'
              );

            }


            await showSession();

          }
        );

      }



      /* =====================================
         SCORE PROGRAMME OPTIONS
      ===================================== */

      function populateProgrammes() {

        const category =
          $('#scoreCategory');


        const programmeSelect =
          $('#scoreProgramme');


        if (
          !category ||
          !programmeSelect
        ) {

          return;
        }


        const list =
          D.programmes.filter(
            programme =>
              programme.category ===
              category.value
          );


        programmeSelect.innerHTML =
          list
            .map(
              programme => `

                <option
                  value="${programme.id}"
                >
                  ${programme.mode}
                  —
                  ${programme.name}
                </option>

              `
            )
            .join('');

      }



      /* =====================================
         PARTICIPANT OPTIONS
      ===================================== */

      function populateParticipants() {

        const category =
          $('#scoreCategory');


        const team =
          $('#scoreTeam');


        const participant =
          $('#scoreParticipant');


        if (
          !category ||
          !team ||
          !participant
        ) {

          return;
        }


        const list =
          D.members.filter(
            member =>
              member.category ===
                category.value
              &&
              member.team ===
                team.value
          );


        participant.innerHTML =
          list
            .map(
              member => `

                <option
                  value="${member.id}"
                >

                  ${member.name}

                  ${
                    member.role
                      ? ' — ' +
                        member.role
                      : ''
                  }

                </option>

              `
            )
            .join('');

      }



      /* =====================================
         SCORE TYPE
      ===================================== */

      function syncScoreType() {

        const scoreType =
          $('#scoreType');


        const field =
          $('#participantField');


        if (!scoreType) return;


        const isTeam =
          scoreType.value ===
          'team';


        if (field) {

          field.style.display =
            isTeam
              ? 'none'
              : 'block';

        }


        syncExistingScore();

      }



      /* =====================================
         LOAD EXISTING SCORE INTO INPUT
      ===================================== */

      function syncExistingScore() {

        const programme =
          $('#scoreProgramme')
            ?.value;


        const team =
          $('#scoreTeam')
            ?.value;


        const scoreType =
          $('#scoreType')
            ?.value;


        const scorePoints =
          $('#scorePoints');


        if (
          !programme ||
          !team ||
          !scoreType ||
          !scorePoints
        ) {

          return;
        }


        if (
          scoreType ===
          'team'
        ) {

          const existing =
            FK.state.teamScores.find(
              mark =>
                mark.team_id ===
                  team
                &&
                mark.programme_id ===
                  programme
            );


          scorePoints.value =
            existing
              ? Number(
                  existing.points
                )
              : '';

        } else {

          const participant =
            $('#scoreParticipant')
              ?.value;


          const existing =
            FK.state.marks.find(
              mark =>
                mark.participant_id ===
                  participant
                &&
                mark.programme_id ===
                  programme
            );


          scorePoints.value =
            existing
              ? Number(
                  existing.points
                )
              : '';

        }

      }



      /* =====================================
         SCORE SELECT EVENTS
      ===================================== */

      $('#scoreCategory')
        ?.addEventListener(
          'change',
          () => {

            populateProgrammes();

            populateParticipants();

            syncExistingScore();

          }
        );


      $('#scoreTeam')
        ?.addEventListener(
          'change',
          () => {

            populateParticipants();

            syncExistingScore();

          }
        );


      $('#scoreType')
        ?.addEventListener(
          'change',
          syncScoreType
        );


      $('#scoreProgramme')
        ?.addEventListener(
          'change',
          syncExistingScore
        );


      $('#scoreParticipant')
        ?.addEventListener(
          'change',
          syncExistingScore
        );



      /* =====================================
         SAVE SCORE
      ===================================== */

      const scoreForm =
        $('#scoreForm');


      if (scoreForm) {

        scoreForm.addEventListener(
          'submit',
          async event => {

            event.preventDefault();


            const programmeId =
              $('#scoreProgramme')
                ?.value;


            const teamId =
              $('#scoreTeam')
                ?.value;


            const scoreType =
              $('#scoreType')
                ?.value;


            const points =
              Number(
                $('#scorePoints')
                  ?.value
              );


            const programme =
              D.programmes.find(
                p =>
                  p.id ===
                  programmeId
              );


            if (!programme) {

              return status(
                $('#scoreStatus'),
                'Choose a valid programme.',
                'error'
              );

            }


            if (
              !Number.isFinite(
                points
              )
              ||
              points < 0
            ) {

              return status(
                $('#scoreStatus'),
                'Enter a valid non-negative point value.',
                'error'
              );

            }


            status(
              $('#scoreStatus'),
              'Saving points...'
            );


            let error;

            let message;


            if (
              scoreType ===
              'team'
            ) {

              const result =
                await client
                  .from(
                    'team_scores'
                  )
                  .upsert(
                    {
                      team_id:
                        teamId,

                      programme_id:
                        programmeId,

                      points,

                      updated_at:
                        new Date()
                          .toISOString()
                    },
                    {
                      onConflict:
                        'team_id,programme_id'
                    }
                  );


              error =
                result.error;


              message =
                `Saved ${points} team/group points for ${FK.teamName(teamId)} in ${programme.name}.`;


            } else {

              const participantId =
                $('#scoreParticipant')
                  ?.value;


              const member =
                D.members.find(
                  m =>
                    m.id ===
                    participantId
                );


              if (
                !member
                ||
                member.category !==
                  programme.category
                ||
                member.team !==
                  teamId
              ) {

                return status(
                  $('#scoreStatus'),
                  'Participant, team and programme categories do not match.',
                  'error'
                );

              }


              const result =
                await client
                  .from('scores')
                  .upsert(
                    {
                      participant_id:
                        participantId,

                      programme_id:
                        programmeId,

                      points,

                      updated_at:
                        new Date()
                          .toISOString()
                    },
                    {
                      onConflict:
                        'participant_id,programme_id'
                    }
                  );


              error =
                result.error;


              message =
                `Saved ${points} points for ${member.name}.`;

            }


            if (error) {

              return status(
                $('#scoreStatus'),
                error.message,
                'error'
              );

            }


            await FK.loadMarks();


            renderTables();


            syncExistingScore();


            status(
              $('#scoreStatus'),
              `${message} Team totals are updated automatically.`
            );

          }
        );

      }



      /* =====================================
         GALLERY UPLOAD
      ===================================== */

      const galleryForm =
        $('#galleryForm');


      if (galleryForm) {

        galleryForm.addEventListener(
          'submit',
          async event => {

            event.preventDefault();


            const file =
              $('#galleryFile')
                ?.files?.[0];


            if (!file) {

              return status(
                $('#galleryStatus'),
                'Choose a photo or video.',
                'error'
              );

            }


            const title =
              $('#galleryTitle')
                ?.value
                .trim()
              ||
              'Melaad Fest 2026';


            const safe =
              file.name
                .replace(
                  /[^a-zA-Z0-9._-]+/g,
                  '-'
                )
                .slice(-100);


            const uuid =
              window.crypto &&
              typeof crypto.randomUUID ===
                'function'

                ? crypto.randomUUID()

                : `${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2)}`;


            const path =
              `${Date.now()}-${uuid}-${safe}`;


            status(
              $('#galleryStatus'),
              'Uploading media...'
            );


            const {
              error: uploadError
            } =
              await client.storage
                .from('gallery')
                .upload(
                  path,
                  file,
                  {
                    cacheControl:
                      '3600',

                    upsert:
                      false,

                    contentType:
                      file.type
                  }
                );


            if (uploadError) {

              return status(
                $('#galleryStatus'),
                uploadError.message,
                'error'
              );

            }


            const {
              data: publicData
            } =
              client.storage
                .from('gallery')
                .getPublicUrl(
                  path
                );


            const {
              error: rowError
            } =
              await client
                .from('gallery')
                .insert({

                  title,

                  file_url:
                    publicData.publicUrl,

                  file_path:
                    path,

                  media_type:
                    file.type ||
                    'application/octet-stream'

                });


            if (rowError) {

              await client.storage
                .from('gallery')
                .remove([
                  path
                ]);


              return status(
                $('#galleryStatus'),
                rowError.message,
                'error'
              );

            }


            galleryForm.reset();


            await FK.loadGallery();


            renderTables();


            status(
              $('#galleryStatus'),
              'Gallery item uploaded successfully.'
            );

          }
        );

      }



      /* =====================================
         REFRESH VISITOR ANALYTICS
      ===================================== */

      $('#visitorRefreshBtn')
        ?.addEventListener(
          'click',
          async () => {

            const btn =
              $('#visitorRefreshBtn');


            if (!btn) return;


            const original =
              btn.textContent;


            btn.disabled =
              true;


            btn.textContent =
              'Refreshing...';


            try {

              await loadVisitors();

              renderTables();

            } finally {

              btn.disabled =
                false;


              btn.textContent =
                original;

            }

          }
        );



      /* =====================================
         LOG OUT
      ===================================== */

      $('#logoutBtn')
        ?.addEventListener(
          'click',
          async () => {

            await client.auth
              .signOut();


            window.location
              .reload();

          }
        );



      /* =====================================
         DELETE SCORE
      ===================================== */

      async function deleteScore(
        id
      ) {

        if (
          !confirm(
            'Delete this mark entry?'
          )
        ) {

          return;
        }


        const {
          error
        } =
          await client
            .from('scores')
            .delete()
            .eq(
              'id',
              id
            );


        if (error) {

          alert(
            error.message
          );

          return;
        }


        await FK.loadMarks();


        renderTables();


        syncExistingScore();

      }



      /* =====================================
         DELETE TEAM SCORE
      ===================================== */

      async function deleteTeamScore(
        id
      ) {

        if (
          !confirm(
            'Delete this team/group mark entry?'
          )
        ) {

          return;
        }


        const {
          error
        } =
          await client
            .from(
              'team_scores'
            )
            .delete()
            .eq(
              'id',
              id
            );


        if (error) {

          alert(
            error.message
          );

          return;
        }


        await FK.loadMarks();


        renderTables();


        syncExistingScore();

      }



      /* =====================================
         DELETE GALLERY
      ===================================== */

      async function deleteGallery(
        id,
        path
      ) {

        if (
          !confirm(
            'Delete this gallery item?'
          )
        ) {

          return;
        }


        if (path) {

          await client.storage
            .from('gallery')
            .remove([
              path
            ]);

        }


        const {
          error
        } =
          await client
            .from('gallery')
            .delete()
            .eq(
              'id',
              id
            );


        if (error) {

          alert(
            error.message
          );

          return;
        }


        await FK.loadGallery();


        renderTables();

      }



      /* =====================================
         RENDER ADMIN TABLES
      ===================================== */

      function renderTables() {


        /* -----------------------------
           MARKS
        ----------------------------- */

        const marks =
          [...FK.state.marks]
            .sort(
              (a, b) => {

                const memberA =
                  D.members.find(
                    member =>
                      member.id ===
                      a.participant_id
                  );


                const memberB =
                  D.members.find(
                    member =>
                      member.id ===
                      b.participant_id
                  );


                return (
                  memberA?.name ||
                  ''
                ).localeCompare(
                  memberB?.name ||
                  ''
                );

              }
            );


        const teamMarks =
          [...FK.state.teamScores]
            .map(
              mark => ({
                ...mark,
                _team: true
              })
            );


        const allMarks =
          [
            ...marks,
            ...teamMarks
          ];


        const marksTable =
          $('#marksTable');


        if (marksTable) {

          marksTable.innerHTML =

            allMarks.length

              ? allMarks
                  .map(
                    mark => {

                      const programme =
                        D.programmes.find(
                          p =>
                            p.id ===
                            mark.programme_id
                        );


                      if (
                        mark._team
                      ) {

                        return `

                          <tr>

                            <td>
                              <b>
                                Team / Group Score
                              </b>
                            </td>

                            <td>
                              ${FK.esc(
                                FK.teamName(
                                  mark.team_id
                                )
                              )}
                            </td>

                            <td>

                              ${FK.esc(
                                programme?.name ||
                                mark.programme_id
                              )}

                              <br>

                              <small>

                                ${FK.esc(
                                  programme?.category ||
                                  ''
                                )}

                                ·

                                ${FK.esc(
                                  programme?.mode ||
                                  ''
                                )}

                              </small>

                            </td>

                            <td>

                              <b>
                                ${Number(
                                  mark.points ||
                                  0
                                )}
                              </b>

                            </td>

                            <td>

                              <button
                                class="btn btn-danger btn-small"
                                data-del-team-score="${mark.id}"
                              >
                                Delete
                              </button>

                            </td>

                          </tr>

                        `;

                      }


                      const person =
                        D.members.find(
                          member =>
                            member.id ===
                            mark.participant_id
                        );


                      return `

                        <tr>

                          <td>

                            ${FK.esc(
                              person?.name ||
                              mark.participant_id
                            )}

                          </td>

                          <td>

                            ${FK.esc(
                              FK.teamName(
                                person?.team ||
                                ''
                              )
                            )}

                          </td>

                          <td>

                            ${FK.esc(
                              programme?.name ||
                              mark.programme_id
                            )}

                            <br>

                            <small>

                              ${FK.esc(
                                programme?.category ||
                                ''
                              )}

                              ·

                              ${FK.esc(
                                programme?.mode ||
                                ''
                              )}

                            </small>

                          </td>

                          <td>

                            <b>
                              ${Number(
                                mark.points ||
                                0
                              )}
                            </b>

                          </td>

                          <td>

                            <button
                              class="btn btn-danger btn-small"
                              data-del-score="${mark.id}"
                            >
                              Delete
                            </button>

                          </td>

                        </tr>

                      `;

                    }
                  )
                  .join('')

              : `

                  <tr>

                    <td colspan="5">
                      No marks entered yet.
                    </td>

                  </tr>

                `;

        }


        document
          .querySelectorAll(
            '[data-del-score]'
          )
          .forEach(
            button => {

              button.onclick =
                () =>
                  deleteScore(
                    button.dataset
                      .delScore
                  );

            }
          );


        document
          .querySelectorAll(
            '[data-del-team-score]'
          )
          .forEach(
            button => {

              button.onclick =
                () =>
                  deleteTeamScore(
                    button.dataset
                      .delTeamScore
                  );

            }
          );



        /* -----------------------------
           GALLERY
        ----------------------------- */

        const galleryTable =
          $('#galleryTable');


        if (galleryTable) {

          galleryTable.innerHTML =

            FK.state.gallery.length

              ? FK.state.gallery
                  .map(
                    item => `

                      <tr>

                        <td>
                          ${FK.esc(
                            item.title ||
                            'Melaad Fest 2026'
                          )}
                        </td>

                        <td>
                          ${FK.esc(
                            item.media_type ||
                            ''
                          )}
                        </td>

                        <td>

                          ${
                            new Date(
                              item.created_at
                            )
                              .toLocaleString()
                          }

                        </td>

                        <td>

                          <button
                            class="btn btn-danger btn-small"
                            data-del-gallery="${item.id}"
                            data-path="${FK.esc(
                              item.file_path ||
                              ''
                            )}"
                          >
                            Delete
                          </button>

                        </td>

                      </tr>

                    `
                  )
                  .join('')

              : `

                  <tr>

                    <td colspan="4">
                      No gallery uploads yet.
                    </td>

                  </tr>

                `;

        }


        document
          .querySelectorAll(
            '[data-del-gallery]'
          )
          .forEach(
            button => {

              button.onclick =
                () =>
                  deleteGallery(
                    button.dataset
                      .delGallery,

                    button.dataset
                      .path
                  );

            }
          );



        /* =====================================
           VISITOR ANALYTICS TOTALS
        ===================================== */

        const totalVisitors =
          visitors.length;


        const totalEntries =
          visitorSessions.length;


        const totalWatchSeconds =
          visitorSessions.reduce(
            (
              total,
              session
            ) =>

              total +
              Number(
                session.duration_seconds ||
                0
              ),

            0
          );


        const totalVisitorsEl =
          $('#totalVisitors');


        const totalEntriesEl =
          $('#totalEntries');


        const totalWatchTimeEl =
          $('#totalWatchTime');


        if (
          totalVisitorsEl
        ) {

          totalVisitorsEl.textContent =
            String(
              totalVisitors
            );

        }


        if (
          totalEntriesEl
        ) {

          totalEntriesEl.textContent =
            String(
              totalEntries
            );

        }


        if (
          totalWatchTimeEl
        ) {

          totalWatchTimeEl.textContent =
            formatDuration(
              totalWatchSeconds
            );

        }



        /* =====================================
           VISITOR TABLE
        ===================================== */

        const visitorTable =
          $('#visitorTable');


        if (visitorTable) {

          visitorTable.innerHTML =

            visitors.length

              ? visitors
                  .map(
                    visitor => {

                      const sessions =
                        sessionsForVisitor(
                          visitor
                        );


                      const watchSeconds =
                        sessions.reduce(
                          (
                            total,
                            session
                          ) =>

                            total +
                            Number(
                              session.duration_seconds ||
                              0
                            ),

                          0
                        );


                      const lastSeen =
                        sessions.length

                          ? sessions.reduce(
                              (
                                latest,
                                session
                              ) => {

                                const value =
                                  new Date(
                                    session.last_seen_at
                                    ||
                                    session.started_at
                                    ||
                                    0
                                  )
                                    .getTime();


                                return (
                                  value >
                                  latest
                                )
                                  ? value
                                  : latest;

                              },

                              0
                            )

                          : new Date(
                              visitor.created_at
                            )
                              .getTime();


                      return `

                        <tr>

                          <td>
                            ${FK.esc(
                              visitor.name
                            )}
                          </td>

                          <td>
                            ${FK.esc(
                              visitor.place
                            )}
                          </td>

                          <td>

                            ${
                              new Date(
                                visitor.created_at
                              )
                                .toLocaleString()
                            }

                          </td>

                          <td>

                            <b>
                              ${sessions.length}
                            </b>

                          </td>

                          <td>

                            <b>

                              ${formatDuration(
                                watchSeconds
                              )}

                            </b>

                          </td>

                          <td>

                            ${
                              Number.isFinite(
                                lastSeen
                              )

                                ? new Date(
                                    lastSeen
                                  )
                                    .toLocaleString()

                                : '—'
                            }

                          </td>

                        </tr>

                      `;

                    }
                  )
                  .join('')

              : `

                  <tr>

                    <td colspan="6">
                      No visitor entries yet.
                    </td>

                  </tr>

                `;

        }

      }



      /* =====================================
         AUTH CHANGES
      ===================================== */

      client.auth
        .onAuthStateChange(
          () => {

            setTimeout(
              showSession,
              0
            );

          }
        );



      /* =====================================
         INITIAL ADMIN LOAD
      ===================================== */

      await showSession();

    }
  );

})();