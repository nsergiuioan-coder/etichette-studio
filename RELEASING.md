# Publishing an update

The app checks the `latest.json` asset in this repository's latest public GitHub release. It compares versions and shows a small notice when a newer version is available. Users can postpone updates, turn off automatic checks or check manually. No project data is sent to GitHub.

## Automatic GitHub build

Two repository secrets are required and have been configured for the official repository:

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

Keep a separate backup of the signing key and its password. The public key is in `src-tauri/tauri.conf.json`. Never commit a private signing key or password. Losing the key prevents publishing updates accepted by existing installations.

To publish the next version:

```sh
node scripts/version.cjs 1.2.0
pnpm test
git add .
git commit -m "Release 1.2.0"
git tag v1.2.0
git push origin main v1.2.0
```

Write the release notes in `releases/1.2.0.md` before committing. The Windows release workflow builds and signs the installer, uploads the installer, signature, checksum and update manifest, then publishes the release. A normal source-code push does not notify app users. A completed release with a higher version does.

Published versions are immutable in the release script. Make a new version to fix a released build. Drafts and failed builds are not announced to users. Forks must configure their own keys, secrets and update endpoint before distributing their builds.

## Local release build

Set `TAURI_SIGNING_PRIVATE_KEY` to the private key path or contents and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` to its password in your environment. Run `pnpm build`, then:

```sh
python scripts/release.py --installer "src-tauri/target/release/bundle/nsis/Etichette Studio_1.2.0_x64-setup.exe"
```

The script uses `GITHUB_TOKEN`, or the local Git credential manager when run outside Actions. It never stores or prints that token. The GitHub release tag must match the application version.

The updater signature verifies the downloaded installer using the key embedded in the app. It does not provide a Windows Authenticode certificate or remove Windows publisher warnings.
