# Put this on GitHub (5 minutes)

From the folder containing this repo:

```bash
git init
git add .
git commit -m "Playwright + TypeScript portfolio framework: API, UI and cross-layer parity"
gh repo create playwright-framework --public --source=. --push
```

No `gh` CLI? Create an empty public repo named `playwright-framework`
on github.com, then:

```bash
git init
git add .
git commit -m "Playwright + TypeScript portfolio framework: API, UI and cross-layer parity"
git branch -M main
git remote add origin https://github.com/ShipItShirsh/playwright-framework.git
git push -u origin main
```

After the push:
1. The README badge already points at `ShipItShirsh` — no edit needed.
2. Check the Actions tab — the first run should go green. That green badge is the point.
3. Pin the repo on your GitHub profile (Profile → Customize your pins).
4. Add it to LinkedIn as a Featured link, and to your resume header (see APPLICATION_BLURB.md).

Before pushing, double-check: no `.env.*` files (only `.env.example`), no `.auth/`,
no employer names/code anywhere. `git status` should show none of them — the
`.gitignore` already excludes them.
