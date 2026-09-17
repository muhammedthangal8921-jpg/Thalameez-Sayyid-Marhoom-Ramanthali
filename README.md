# Fasthabiqul Khairath — Melaad Fest 2026 Website

A responsive competition website for **Thalameez Sayyid Marhoom Ramanthali — Melaad Fest 2026**, campaign name **Fasthabiqul Khairath**.

## Included pages

- Home — live Senior, Junior and Overall team scores + individual Overall Champions leaderboard
- Competitions — YARMUQIYYA left / QADISIYYA right, programme-wise team points only
- Individual Marks — team members, Seniors first then Juniors; click a person for programme-wise marks
- Gallery — photos/videos with visitor download option
- About
- Contact
- Admin — email magic-link login, simple score entry, team/group score entry, gallery upload and delete
- Visitor gate — first-time visitors enter name and place before viewing the website

## Important scoring design

There are two score types in the Admin Panel:

1. **Individual participant** — adds points to a participant. The system automatically includes those points in that person's team Senior/Junior/Overall total.
2. **Team / group programme** — adds points once to the team, useful for Group Song or any programme where a single team score should not be multiplied across participants.

The public Competition page combines individual and team/group scores for each programme. The Overall Champions leaderboard ranks only individual participant marks.

## One-time live setup

The website is static, but live scores, secure admin access and gallery uploads use Supabase.

### 1. Create a Supabase project

Create a Supabase project and open **SQL Editor**.

### 2. Add your admin email

Open `supabase-schema.sql` and replace:

`YOUR-ADMIN-EMAIL@example.com`

with the email address you want to use for Admin Panel access.

Then paste the full SQL file into Supabase SQL Editor and run it once.

### 3. Connect the website to Supabase

In Supabase Project Settings / API, copy the project URL and public anon key.

Open `config.js` and replace:

- `https://YOUR-PROJECT.supabase.co`
- `YOUR_SUPABASE_ANON_KEY`

Do **not** put a Supabase service-role key in the website. Only use the public anon key.

### 4. Configure admin magic-link redirect

After deploying the website, add your website URL to the allowed Auth redirect URLs in Supabase. Include the Admin page URL, for example:

`https://your-site.example/admin.html`

The admin can then type the approved email in the Admin Panel and receive a secure magic login link. No password or code editing is needed during the programme.

### 5. Enable live refresh

Enable Realtime for these tables in Supabase:

- `scores`
- `team_scores`

This makes public score pages refresh automatically when the admin changes marks.

### 6. Deploy

Upload the entire folder to any static website host. Keep all files together in the same directory.

## Files

- `index.html` — Home
- `competitions.html` — Competition programme totals
- `individual-marks.html` — Individual marks
- `gallery.html` — Gallery
- `about.html` — About
- `contact.html` — Contact
- `admin.html` — Admin Panel
- `styles.css` — Professional Islamic-inspired responsive design
- `data.js` — teams, participants and programmes
- `app.js` — public site logic
- `admin.js` — admin login, marks and media management
- `config.js` — Supabase connection settings
- `supabase-schema.sql` — database, security policies and gallery storage setup

## Editing names/programmes later

Names, teams and programme lists are kept in `data.js`. Normal score updates and gallery uploads do **not** require editing this file; only structural changes such as adding a new participant or a new competition do.

## Contact details included

- Sayyid Hamid Koayamma Thangal Al Jalali Al Bukhari — +91 98460 20519
- Mudarris / Professor: Aslam Falahi Iyyankode — +91 85899 39295
