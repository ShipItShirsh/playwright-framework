# Run it locally on Windows (Surface Book)

Verified stack on this machine: Node.js v26 / npm 11 already installed and
Playwright/Chromium confirmed working (Oct 29). No secrets, no setup files
needed — all targets are public demo apps and defaults are built in.

## Steps

1. **Extract the zip** to your Desktop. You should end up with a folder
   named `playwright-portfolio-framework` containing `package.json`.

2. **Open a terminal in that folder:** open the folder in File Explorer,
   click the address bar, type `powershell`, press Enter.
   (Use a *fresh* terminal — an old one may carry the stale npm PATH entry
   that caused the doubled-path `MODULE_NOT_FOUND` error on Oct 29.)

3. **Verify the toolchain:**

   ```powershell
   node --version    # expect v26.x (any 20+ works)
   npm --version     # expect 11.x
   ```

4. **Install dependencies and the browser** (first run downloads ~170 MB
   of Chromium — give it a few minutes):

   ```powershell
   npm install
   npm run install:browsers
   ```

5. **Typecheck, then run the full suite:**

   ```powershell
   npm run typecheck   # silent output = clean
   npm test            # expect: 15 passed
   ```

   The run is headless by default. On this machine ~2–4 minutes is normal.

6. **See the evidence:**

   ```powershell
   npm run report:open
   ```

   Also in the folder: `playwright-report/app-report.html` (custom summary)
   and failure screenshots/videos/traces under `test-results/` if anything fails.

## Optional runs

```powershell
npm run test:smoke        # @smoke tests only
npm run test:api          # API project only (fastest, no browser)
npm run test:ui:headed    # watch the UI tests drive a real browser
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| `npm` doubled-path `MODULE_NOT_FOUND` | Close the terminal, open a fresh one in the folder (PATH fix from Oct 29 only applies to new terminals) |
| `npm.ps1 cannot be loaded because running scripts is disabled` | PowerShell's script policy blocks `npm.ps1` — npm itself is fine. Use `npm.cmd` instead of `npm` for every command, or open a `cmd` window in the folder instead of PowerShell (permanent alternative: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, then confirm with `Y`) |
| Chromium download fails | Re-run `npm run install:browsers` — it resumes; check internet connection |
| A UI test fails once, passes on re-run | SauceDemo is a public site and can be slow; note which test — if it repeats, that's a real finding, tell Muse the test name |
| `'playwright' is not recognized` | Use the npm scripts above (`npm test`) — they use the project-local install |
