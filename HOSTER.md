# Production hosting: лавелия.kz

The live site and password admin run on Hoster.kz (Plesk, PHP 8.4). The IDN hostname is `xn--80aejmld5l.kz`. GitHub contains source and the old preview; production settings are no longer sourced from GitHub.

## Runtime

- `httpdocs/`: public assets, admin UI, `.htaccess`, PHP entry point, robots and sitemap.
- `laveliya-private/`: sibling of `httpdocs`, never inside it. Contains runtime, templates, services, `config.json`, `settings.json`, session files and rate-limit state.
- The private config has `siteUrl`, `indexable`, `secure`, and a salted PBKDF2-SHA256 password verifier (600,000 rounds), never the plaintext password or a GitHub token.
- Session cookies are Secure / HttpOnly / SameSite=Strict, valid for 8 hours. Writes require same Origin and CSRF token. Login attempts are bounded per IP and globally.
- A locked version check prevents stale editors overwriting settings. A temporary file + rename makes saves atomic; `settings.previous.json` retains the previous version.
- All public HTML, metadata and structured data render from current server settings. Admin saves take effect on the next page request.

## Deployment

Run `python3 scripts/build_hoster.py`. Supply the ignored private config separately. Upload the resulting `httpdocs` and `laveliya-private` directories to the subscription HOME, **not both into httpdocs**. Archives containing private config must never be uploaded under a public URL.

First deployment only: use the seed `settings.json` from the build. **For subsequent deployments preserve the live `settings.json`, config, session and login-limit files.** Download a private backup of live data before replacing code. A build seed is not current production data.

Use the existing Hoster DNS, and a Let's Encrypt certificate for apex and www. HTTP and www redirect to the canonical HTTPS apex. The PHP package contains no GitHub access vault or credentials. Old preview credentials are independent and should be revoked separately when retiring the historical GitHub admin.

## Verification

`npm test` checks the existing shared render and legacy admin. `tests/hoster-integration.mjs` tests a real local PHP server with login, CSRF, invalid values, conflicting writes, per-service price changes, all 13 pages, JSON-LD, contact links and restoration.

Local test command: `npx --yes @php-wasm/cli -S 127.0.0.1:4175 -t .preview/hoster/httpdocs hoster/local-router.php`. Use a local-only copy of config with origin `http://127.0.0.1:4175`, `secure: false`, `indexable: false`. Never upload local test config. The test reads the ignored owner's password note in memory and restores original settings.

## Search ownership and indexing (24 November 2026)

- Google Search Console: verified URL-prefix property `https://xn--80aejmld5l.kz/`; `sitemap.xml` processed successfully, 13 discovered pages. Homepage indexing request accepted into Google’s priority crawl queue.
- Yandex Webmaster: verified site `https://лавелия.kz`; ten priority URLs (home, massage index, seven massage pages, sugaring) submitted for recrawl and queued. The service currently disables Sitemap submissions (read-only mode). Sitemap is declared in robots.txt for discovery; prices/about/contact are also linked internally. Queued does not mean indexed.
- `verification/` contains the public ownership files approved by the site owner. Production builds preserve them. Do not remove them during an update.
- Live audit: 13 sitemap URLs return 200, each has one H1, a unique title and description, self-canonical HTTPS URL and valid JSON-LD, with no noindex response. Admin and API are excluded from crawling.

## Optional analytics (24 November 2026)

The password admin has an Analytics section with independent Google Analytics 4 (`G-…`) and Yandex Metrica (numeric counter ID) inputs and service-specific instructions. Save applies the IDs to every public PHP-rendered page; clearing an input disables that service. Both are initially empty in production. Actual report delivery must be checked in the owner's analytics accounts after real IDs are supplied.

`settings.data.analytics` stores `googleAnalyticsId` and `yandexMetrikaId`. Older settings without this object still work; saves from older clients preserve an existing analytics object. Server validation only accepts IDs, never arbitrary HTML. `assets/analytics.js` asynchronously loads the official libraries, configures page views once and excludes admin/API paths. No third-party analytics request is made when IDs are empty. Metrica Webvisor is disabled. Google Ads linking/conversions and Metrica goals are configured separately in those services.

Implementation references: [Google's supported gtag.js snippet](https://support.google.com/analytics/answer/17231523?hl=en) and [Metrica initialization](https://yandex.ru/support/metrica/ru/code/counter-initialize.html).

Validation: 15 Node tests passed. Local PHP integration verifies both counters on all 13 pages, independent activation/removal, identifier normalization, rejection of HTML, preservation when older clients save, and unchanged price/contact behavior. Production save/reload with empty IDs preserved every business field and left public homepage HTML unchanged. Mobile layout checked at 390×844; proof: `.preview/admin-analytics-live.jpg` (ignored).
