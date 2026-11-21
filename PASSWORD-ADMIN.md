# Password admin on GitHub Pages

The customer enters one password at `/admin/`, edits prices and contacts, and saves. No GitHub account or manually entered token is needed by the customer. Cloudflare is not used by this deployment. GitHub remains the storage and publishing service behind the site.

The browser may save the password in its own password manager. The form uses `autocomplete="current-password"`; supported browsers receive a PasswordCredential after successful login. The app does not write passwords or tokens to localStorage, sessionStorage, or cookies. Saving depends on browser settings and the user's response to its prompt.

## Owner setup

Create a dedicated fine-grained token for `SWValera/massazhny-salon` only, with Contents read/write and required Metadata read. Do not add Workflows or account permissions. Never publish or encrypt the computer's general-purpose Git credential for customer use.

`scripts/setup-pages-password.mjs` reads JSON containing `token` from stdin. It generates a random 24-character password by default and writes it to `.private/Лавелия-вход.txt` (ignored by Git, mode 0600). This private owner file is outside every published directory. Never put credentials in shell arguments or logs. The published `data/admin-access.json` contains only encryption metadata and ciphertext. Pass `--vault` and `--password-file` only for deliberate isolated testing or rotation; the setup refuses to overwrite existing access files.

Encryption uses AES-256-GCM with PBKDF2-SHA256, 600,000 iterations, a fresh 32-byte salt and 12-byte IV, bound to the repository name as authenticated additional data. A wrong password or modified ciphertext does not unlock access. After login the decrypted token stays in the current tab's memory and is sent only to GitHub API over HTTPS. Logout clears the app's reference to it.

## Boundaries and maintenance

This is client-side decryption of a scoped repository credential, not server-side account authentication. A person who knows the admin password can technically obtain the token and change the contents of this entire repository, not just price fields. The dedicated token cannot write other repositories or workflow files. It is not an appropriate system for multiple administrators with different roles.

The public encrypted file permits offline password guessing, so retain the randomly generated long password; do not use a short PIN. On access revocation or suspected disclosure, revoke the dedicated GitHub token and issue a new token, password and encrypted file. Merely changing the encryption password is insufficient: old ciphertext may remain in Git history or downloaded copies. The token can be revoked by the repository owner in GitHub settings. A non-expiring token remains valid until revoked or otherwise disabled by GitHub.

Settings are still version-checked and saved to `data/defaults.json`. Pages rebuilds all affected HTML, including service prices, contact links, titles and JSON-LD. The UI distinguishes saving from confirmed publication using `deployment.json`. If the credential is disabled, the owner must renew the technical connection; the customer never needs to handle that token.

Build: `python3 scripts/build_pages.py`. Tests: `npm test`. An alternative Worker implementation remains in source for historical reference; it is not deployed or required.
