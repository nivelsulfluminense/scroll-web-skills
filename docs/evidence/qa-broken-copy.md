# QA audit · http://localhost/

2026-11-08T15:25:30.382Z · fail 7 · warn 2 · info 1

| severity | check | where | finding |
|---|---|---|---|
| fail | horizontal-overflow | chromium/desktop | page is 288px wider than the viewport |
| fail | http-status | chromium/desktop | 404 http://localhost/film/lg/frame-0051.webp |
| fail | console-error | chromium/desktop | Failed to load resource: the server responded with a status of 404 (Not Found) |
| fail | http-status | chromium/desktop | 404 http://localhost/film/lg/frame-0050.webp |
| fail | console-error | chromium/desktop | Failed to load resource: the server responded with a status of 404 (Not Found) |
| warn | dead-scroll | chromium/desktop stage#0 | nothing changes between p=0.30 and p=0.50. If this silence is authored, record it in BRIEF.md |
| warn | band-too-short | chromium/desktop stage#0 | band #1 "0.5 0.52 0.3 0.3" is on screen for 8vh of scroll (min 50vh): too brief to read |
| info | weight | chromium/desktop | 2.7 MB transferred (budget 20 MB) |
| fail | horizontal-overflow | chromium/desktop/reduced-motion | page is 288px wider than the viewport |
| fail | no-js | chromium/desktop/no-js | no <h1> text without JavaScript (content must be real markup, not built by script) |

## Not covered by this audit

- Creative quality, story, feeling curve and the $10K checklist score (human review, references/08-qa.md).
- Type synchronised with motion in the film (watch slow and fast scrolling yourself).
- Physical devices. Emulated mobile is not an iPhone: decoder, Low Power Mode and touch inertia differ.
- Live form delivery, email arrival, SEO indexing.
