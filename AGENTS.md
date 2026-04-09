# AGENTS.md

## Key Commands

```bash
# Pipeline integrity
node verify-pipeline.mjs        # Health check
node merge-tracker.mjs          # Merge TSV additions into applications.md
node normalize-statuses.mjs     # Map status aliases to canonical values
node dedup-tracker.mjs          # Remove duplicates by company+role

# PDF generation
node generate-pdf.mjs            # Generate ATS-optimized PDF from HTML template

# System updates
node update-system.mjs check    # Check for updates
node update-system.mjs apply    # Apply available update
```

## Critical Rules

1. **NEVER edit `data/applications.md` to add new entries.** Write TSV to `batch/tracker-additions/` and run `node merge-tracker.mjs`. You can edit existing entries directly.

2. **Offer verification: Use Playwright, not WebSearch.** Navigate to URL → snapshot → determine if active. Exception: batch mode (`claude -p`) can't use Playwright, use WebFetch and mark unconfirmed.

3. **Report naming:** `{###}-{company-slug}-{YYYY-MM-DD}.md` (3-digit zero-padded, e.g., `001-acme-2026-04-08.md`)

4. **TSV format for tracker additions** (9 columns, tab-separated):
   ```
   {num}\t{date}\t{company}\t{role}\t{status}\t{score}/5\t✅|❌\t[link]\t{note}
   ```
   Status column comes BEFORE score (merge script handles the swap for applications.md).

5. **Canonical states** are defined in `templates/states.yml`. Use: `Evaluated`, `Applied`, `Responded`, `Interview`, `Offer`, `Rejected`, `Discarded`, `SKIP`. No markdown bold in status field.

## Data Contract

- **User Layer (never auto-updated):** `cv.md`, `config/profile.yml`, `modes/_profile.md`, `data/applications.md`, `data/pipeline.md`, `reports/`, `output/`
- **System Layer (auto-updatable):** `modes/_shared.md`, `modes/*.md`, `CLAUDE.md`, `*.mjs` scripts, `templates/`, `batch/`

When user asks to customize archetypes, narrative, or negotiation scripts, write to `modes/_profile.md` or `config/profile.yml`, NOT `modes/_shared.md`.

## Onboarding Check

At session start, silently verify: `cv.md`, `config/profile.yml`, `modes/_profile.md`, `portals.yml` exist. If missing, enter onboarding flow before any evaluations.

## Stack

- Node.js `.mjs` modules, Playwright (PDF + scraping), YAML config, HTML/CSS template
- Scripts: `generate-pdf.mjs`, `merge-tracker.mjs`, `verify-pipeline.mjs`, `normalize-statuses.mjs`, `dedup-tracker.mjs`