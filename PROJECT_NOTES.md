# Project Notes

Last updated: 2026-07-19

## Project

Static website for GradAudit, a Russian-language landing/site about checking land plots before purchase and urban-planning due diligence.

Main files:
- `index.html` - Liquid/Jekyll template for the home page.
- `services.html` - Liquid/Jekyll template for the services page.
- `style.css` - shared styles for the site.
- `_data/site.json` - shared brand, navigation, contacts, forms, and footer content.
- `_data/home.json` - editable homepage content.
- `_data/services.json` - editable services-page content.
- `_includes/` - shared header, footer, and browser behavior.
- `.pages.yml` - Pages CMS admin-panel configuration.
- `_config.yml` - GitHub Pages/Jekyll build exclusions.
- `content-home.pdf` - source/content reference for the home page.
- `content-services-blog.pdf` - source/content reference for services/blog content.
- `new_services.pdf` - updated SEO brief/content source for `services.html`.
- `site-architecture.pdf` - architecture/content structure reference.

## Current State

The public GitHub Pages site is deployed from `main`. The working tree now contains a verified but not-yet-published Pages CMS integration. Visitor-facing content is stored in `_data/*.json`, both pages render it through Liquid/Jekyll, shared markup lives in `_includes/`, and `.pages.yml` defines the admin interface. The visible local content exactly matches the current public site. These CMS changes still need an intentional commit and push before the admin panel can use them.

Historical snapshot from the first services-page iteration:

Git working tree had local changes:
- `index.html` modified.
- `services.html` added, currently untracked.
- `style.css` added, currently untracked.

Recent work:
- Moved large inline CSS from `index.html` into `style.css`.
- Added `services.html` as a dedicated "Услуги" page.
- Updated links in `index.html` so "Услуги" points to `services.html`.
- Added service anchor links:
  - `services.html#express-audit`
  - `services.html#full-expertise`
  - `services.html#urban-support`

## Services Page Content

`services.html` includes:
- hero section for "Услуги";
- service cards;
- section for "Экспресс-аудит участка";
- section for "Полная градостроительная экспертиза";
- section for "Стратегическое сопровождение проектов";
- proof/advantages section;
- CTA form;
- footer with navigation.

## Next Useful Checks

For CMS delivery:
- commit and push the verified integration when the user says to publish;
- wait for the GitHub Pages deployment to complete;
- sign in at `https://app.pagescms.org`, select the repository, and make one harmless test edit;
- confirm that the CMS commit triggers a successful GitHub Pages rebuild;
- restore the test text if it was only used for verification;
- connect the presentation-only forms to a real lead-delivery endpoint as a separate task.

Older content checks retained for reference:
- Open `index.html` and `services.html` in a browser.
- Check desktop and mobile layout.
- Verify header, footer, CTA, and all anchors.
- Confirm text matches `content-services-blog.pdf`.
- Decide whether a separate blog page/section is still needed.

## Current Direction For Services Page

Preserve the current visual direction of `services.html`:
- card-based layout inspired by dom.rf references;
- white page background;
- black, lime green, light gray, and occasional blue cards;
- large bold typography;
- round arrow buttons inside cards;
- strict grid rhythm with minimal decoration.

Work order for the next iteration:
- first map `new_services.pdf` content to the page structure and SEO headings;
- then update `services.html` content;
- then adjust `style.css` only where the real text breaks layout, arrows, cards, or responsive behavior.

## 2026-06-23 Services SEO Update

Implemented the first pass from `new_services.pdf`:
- rebuilt `services.html` content around the updated SEO brief;
- kept the dom.rf-inspired visual system and existing `dom-*` class direction;
- added a general process section: `#process`;
- expanded `#express-audit` with benefits, audit checklist, result, and use cases;
- expanded `#full-expertise` with documentation, hidden restrictions, infrastructure, legal analysis, and result cards;
- expanded `#urban-support` with project support scope and work format;
- added `#expert` section;
- kept shared CTA at `#cta`;
- replaced text arrow glyphs in `.dom-arrow` with CSS-drawn arrows for cleaner icon alignment;
- added CSS for `.dom-process` and `.dom-expert`.

Static checks:
- `services.html` has one `<h1>`.
- Main internal anchors exist: `#services-cards`, `#process`, `#express-audit`, `#full-expertise`, `#urban-support`, `#expert`, `#cta`, `#contacts`.
- Playwright has now been installed; see the visual pass notes below.

## 2026-06-23 Playwright Visual Pass

Installed Playwright for local visual checks:
- `package.json`
- `package-lock.json`
- browser binaries installed via `npx playwright install chromium`

Updated `.gitignore`:
- `node_modules/`
- `playwright-screenshots/`

Visual checks run against `services.html`:
- desktop: 1440 x 1200
- tablet: 900 x 1200
- mobile: 390 x 1200

Fixes after screenshots:
- removed horizontal overflow in service cards on mobile;
- added shrink-safe grid columns for `.dom-service-card__top`;
- allowed long headings to wrap inside card/feature/expert blocks;
- unified regular `.button` shape inside `.dom-services` to pill buttons;
- made CTA form submit button pill-shaped;
- confirmed DOM overflow report is empty for desktop/tablet/mobile after fixes.

Screenshot workflow:
- save Playwright screenshots under `playwright-screenshots/`;
- do not save temporary `pw-*.png` files in the project root.

## 2026-06-23 Express Audit Alignment

Targeted layout change only for the express-audit top block:
- added `dom-feature__grid--half` to `#express-audit` feature grid;
- added CSS so this grid uses two equal columns;
- this aligns the large left image block with the right edge of the second small benefit card;
- this aligns the right text block with the left edge of the third small benefit card.

Playwright metric check:
- large left block right edge: `712`;
- second benefit card right edge: `712`;
- right text block left edge: `728`;
- third benefit card left edge: `728`;
- overflow count in `#express-audit`: `0`.

Follow-up tweak:
- moved the `#express-audit` right text heading upward by setting `#express-audit .dom-feature__text { padding-top: 0; }`;
- Playwright coordinate check: large image block top and right heading top now have `delta: 0`;
- overflow count in `#express-audit`: `0`.

## 2026-06-23 Light Visual Pass

Started moving `services.html` away from the overly dark/heavy look:
- made `dom-info-card` surfaces lighter and cleaner;
- changed `dom-info-card--dark` from black to warm beige;
- changed express-audit mini benefit cards from all-dark to a mixed palette: black accent, light gray, lime green, light blue;
- slightly reduced visual weight of content-card headings;
- kept the current structure and images unchanged.

Playwright checks:
- `playwright-screenshots/express-audit-light-pass.png`
- `playwright-screenshots/express-audit-redesign.png`
- `playwright-screenshots/desktop-redesign.png`
- `playwright-screenshots/mobile-redesign.png`
- desktop overflow count: `0`
- mobile overflow count: `0`

Open design question:
- the middle content cards are now lighter, but hero, expert, and CTA still use dark blocks as strong accents. Decide next whether to keep them as accents or continue lightening the whole page.

## 2026-06-23 DOM.RF-Inspired Page Pass

User clarified that the whole `services.html` page should move closer to https://дом.рф/for-regions/ visually, not just one block.

Applied a broader CSS pass:
- introduced local `dom-*` palette variables for ink, muted text, light gray, lime, blue, beige, and black accent;
- made the services hero left panel light instead of black;
- reduced heavy black usage across service, process, info, expert, and CTA blocks;
- changed the strategic service card from black to light blue;
- changed process cards to light gray, lime, blue, and beige;
- made expert and CTA blocks lighter/beige instead of black-heavy;
- softened hero and feature image overlays;
- reduced oversized heading max sizes in several content sections;
- kept page structure, text, and current image assets unchanged.

Playwright screenshots:
- `playwright-screenshots/domrf-pass-desktop.png`
- `playwright-screenshots/domrf-pass-tablet.png`
- `playwright-screenshots/domrf-pass-mobile.png`

Checks:
- desktop overflow report: `[]`
- tablet overflow report: `[]`
- mobile overflow report: `[]`

## 2026-06-23 Redesign Pass 2

User feedback: previous pass still kept the same layout and overly large/bold typography. Need a more visible redesign, closer to DOM.RF composition and type feel.

Applied:
- reworked services hero layout into a large image panel plus a separate beige text panel;
- changed hero visual order on desktop using CSS grid areas;
- added responsive one-column grid areas for hero on tablet/mobile;
- reduced heading sizes and font-weight across service cards, process cards, feature panels, expert block, and CTA;
- reduced service-card height and visual density;
- made process cards shorter and lighter;
- adjusted feature block heading sizes from oversized display text to calmer section text;
- rebalanced CTA columns so the form is less narrow;
- kept SEO HTML structure and current image assets unchanged.

Playwright screenshots:
- `playwright-screenshots/redesign2b-desktop.png`
- `playwright-screenshots/redesign2b-tablet.png`
- `playwright-screenshots/redesign2b-mobile.png`

Checks:
- desktop overflow count: `0`
- tablet overflow count: `0`
- mobile overflow count: `0`

Possible next decision:
- On mobile, the hero currently shows the image panel before the "Услуги" beige text panel. Decide whether to keep this or place the text panel first.

## 2026-06-23 Hero Services Panel Tweak

Targeted hero change:
- services panel background changed to lime;
- all text in that panel set to black;
- circular arrow button set to black with white arrow;
- image panel unchanged.
- removed duplicate small "Услуги" label above the main hero H1.
- image-panel location label no longer has a dot marker and now uses regular paragraph-like weight/size.
- removed the invented intro paragraph from the services cards section.
- aligned service-card descriptions by giving the card header area a fixed minimum height.
- set service-card text and prices to black; prices now match the card heading font sizing.
- reworked service price cards into a DOM.RF-like media-card format: heading, description, price, arrow button, and bottom image while keeping the project's existing card colors.
- Playwright screenshots: `playwright-screenshots/services-cards-media-desktop.png`, `playwright-screenshots/services-cards-media-mobile.png`.
- set service-page headings to the same near-black `#050706`; verified "Форматы экспертной поддержки" via Playwright as `rgb(5, 7, 6)`.
- updated the process cards to match the service-card typography: black text, numbers at the same size as card headings, reduced number weight from 800 to 700, and aligned title/description rows.
- Playwright screenshots: `playwright-screenshots/process-align-desktop.png`, `playwright-screenshots/process-align-mobile.png`.
- renamed the process-section CTA to "Проверить участок" and scoped its styling: black background, `font-weight: 600`, transparent/black-outline hover.
- Playwright screenshot: `playwright-screenshots/process-button-hover.png`.
- service-card circular arrows now match the CTA hover behavior: transparent background, black outline, black arrow on hover.
- Playwright screenshot: `playwright-screenshots/service-card-arrow-hover.png`.
- removed the white card background from the first express-audit text block and kept the heading on its original top line (`padding-top: 0`).
- Playwright screenshots: `playwright-screenshots/express-text-no-bg.png`, `playwright-screenshots/express-text-no-bg-heading-reset.png`.
- corrected the express-audit block text to match the provided SEO brief exactly: location, description, price, two CTA labels, heading, and two right-side paragraphs.
- Removed prior paraphrased wording in that block; Playwright text extraction confirmed the current visible strings.
- Playwright screenshot: `playwright-screenshots/express-audit-seo-text.png`.
- aligned the four express-audit mini tiles: numbers, headings, and descriptions now share consistent row positions.
- Kept the first mini tile dark with white text for readability; the remaining mini tiles use black text.
- Playwright screenshot: `playwright-screenshots/express-mini-tiles-align.png`.
- Added the missing express-audit form from `new_services.pdf` after the 4 benefits cards and before the audit checklist.
- Form copy matches PDF: "Узнайте, есть ли на вашем участке явные ограничения" and "Отправьте кадастровый номер участка и получите первичную оценку рисков."
- Playwright screenshots: `playwright-screenshots/express-audit-form-desktop.png`, `playwright-screenshots/express-audit-form-mobile.png`.
- Redesigned the express-audit form block: beige background, desktop heading aligned to the same left edge as the cards, equal 28px vertical spacing to neighboring blocks, smaller 220px CTA button, explicit form typography (`15px/400` inputs, `14px/600` button).
- Playwright screenshots: `playwright-screenshots/express-audit-form-redesign.png`, `playwright-screenshots/express-audit-form-redesign-mobile.png`.
- Reworked the express-audit form again into two harmonized cards: lime copy card + soft form card, no full-width beige banner. Button remains compact at 220px; vertical spacing to adjacent blocks is 28px on desktop/mobile.
- Playwright screenshots: `playwright-screenshots/express-audit-form-cards-desktop.png`, `playwright-screenshots/express-audit-form-cards-mobile.png`.
- Fixed express-audit form grid alignment: two equal columns now match the 4-card grid split above; form CTA dimensions now match the existing "Проверить участок" button in the process block (`180x51`, `14px/600`).
- Playwright screenshots: `playwright-screenshots/express-audit-form-grid-fix.png`, `playwright-screenshots/express-audit-form-grid-fix-mobile.png`.
- Redesigned the express-audit information cards as document-style panels: the long checklist spans full width with a two-column list on desktop, the remaining cards form three compact panels below with consistent typography and row-style list items.
- Added responsive overrides so these cards are 2 columns on tablet and 1 column on mobile; verified no overflow.
- Playwright screenshots: `playwright-screenshots/express-info-cards-doc-desktop.png`, `playwright-screenshots/express-info-cards-doc-mobile.png`.
- Re-aligned those information cards with the site's actual palette and card language: removed invented pale colors, borders, and top stripes; now uses only `soft`, `lime`, `beige`, and `blue` flat card backgrounds with consistent typography.
- Playwright screenshots: `playwright-screenshots/express-info-cards-site-style-desktop.png`, `playwright-screenshots/express-info-cards-site-style-mobile.png`.
- Reworked the express-audit information cards again after user rejected the previous direction: the first checklist is now a full-width black accent card; the three secondary cards stay in the site's lime/beige/blue palette with one typography scale, no table separators, and no invented colors.
- Scoped these styles strictly to `#express-audit .dom-audit-form + .dom-info-grid` so later `dom-info-grid` blocks inside the same section are not affected.
- Verified with Playwright: desktop/mobile horizontal overflow is `0`.
- Playwright screenshots: `playwright-screenshots/express-info-cards-redesign3-element-desktop.png`, `playwright-screenshots/express-info-cards-redesign3-element-mobile.png`.
- Express info cards: unified list markers to numbers and aligned lower-card content rows.
- Express info cards: removed green-card subtitle; lower lists use round dots and aligned starts.
- Full expertise: rebuilt with PDF text; compacted hero, normalized title/buttons.
- Full expertise: result card rebuilt into top text + 4 equal question tiles.
- Urban support: rebuilt with PDF text and new media/content/work layout.
- Urban support: work blocks rebalanced; removed format item backgrounds.
- Urban support: work cards redesigned as stacked format/help sections.
- Expert block: merged advantages into one expert section; compact photo/proof cards.
- Expert block: redesigned composition with lime text panel and 2x2 proof grid.
- Expert block: replaced cramped proof layout with equal readable cards.
- CTA form: restyled fields/button/heading in black-text site palette.
- Expert proof cards: removed section title; subtitles kept as clean labels.

Playwright screenshot:
- `playwright-screenshots/hero-services-lime.png`

Check:
- hero overflow count: `0`.

## How To Resume

At the start of a new session, read this file first, then inspect:
- `git status --short`
- `git diff -- index.html`
- `services.html`
- `style.css`

Update this file after each meaningful change, especially when adding pages, changing navigation, or leaving unfinished work.

## 2026-06-26 Home Page Redesign

Redesigned `index.html` to match the current `services.html` visual language while preserving the existing SEO text:
- added `home-redesign` scope to the home page;
- rebuilt the hero composition with lime copy panel, image panel, and flat form card;
- restyled risk, expert, services, process, trust, and CTA sections with the same flat card palette and typography direction;
- kept changes scoped in `style.css` so `services.html` remains unchanged.

Playwright checks:
- screenshots: `playwright-screenshots/home-redesign-desktop.png`, `home-redesign-tablet.png`, `home-redesign-mobile.png`;
- horizontal overflow: `0` on desktop, tablet, and mobile;
- `index.html` has one `<h1>`.

## 2026-06-26 Home Wow Pass

User rejected the first home redesign as too similar to `services.html`.
Updated `index.html` / `style.css` with a more distinctive homepage direction:
- added `home-wow` scope;
- turned hero into an asymmetric visual stage with large aerial image, lime SEO headline panel, overlay form, and risk chips;
- made the risk section more editorial/mosaic-like;
- flipped expert block into stronger photo + lime content composition;
- added image-backed trust section while keeping the site palette and SEO text.

Playwright checks:
- screenshots: `playwright-screenshots/home-wow-desktop.png`, `home-wow-tablet.png`, `home-wow-mobile.png`;
- horizontal overflow: `0` on desktop, tablet, and mobile;
- `index.html` still has one `<h1>`.

## 2026-06-26 Home Redesign Reset

User rejected the `home-wow` direction as still too mechanical and not aligned enough with `services.html` typography.
Reset the home page into a cleaner `home-audit` scope:
- disabled prior home scopes on `index.html` by changing the main class to `home-audit`;
- rebuilt the home hero as a compact image-led first screen with text over aerial imagery and a docked lime audit form;
- normalized headline scale back toward the services page style;
- rebuilt risk, expert, services, process, trust, and CTA styling in one coherent homepage-specific layer;
- kept SEO text intact.

Playwright checks:
- screenshots: `playwright-screenshots/home-audit-desktop.png`, `home-audit-tablet.png`, `home-audit-mobile.png`;
- horizontal overflow: `0` on desktop, tablet, and mobile;
- `index.html` still has one `<h1>`.

Follow-up fix:
- fixed clipping in the top-right risk card (`risk-card--two`) by overriding old fixed card height and giving the card a 320px layout with a smaller media row;
- screenshot: `playwright-screenshots/home-audit-risk-fix-desktop.png`;
- verified `risk-card--two` text is not clipped and overflow remains `0`.

Second follow-up fix:
- fixed the actual grid conflict where `risk-card--three` started before `risk-card--two` had enough vertical space;
- locked the desktop risk mosaic to explicit 3-column / 3-row placement and kept responsive fallbacks;
- screenshot: `playwright-screenshots/home-audit-risk-grid-fix-desktop.png`;
- verified gap between cards `02` and `03` is 16px, `risk-card--two` text is not clipped, and overflow remains `0`.

## 2026-06-30 Complete Homepage Redesign

Rebuilt `index.html` as a distinct premium homepage while preserving the visual language of `services.html`:
- replaced the previous `home-audit` composition with a new `hp-home` editorial system;
- created an asymmetric dark hero with aerial imagery, cadastral overlays, proof metrics, and a compact lead form;
- rebuilt the risk section as a varied editorial mosaic rather than reused service-style cards;
- added a dedicated methodology sequence from cadastral number to transaction decision;
- redesigned service presentation into three differentiated product cards;
- rebuilt the expert section around portrait, quote, credentials, and proof metrics;
- added a dark outcome section explaining the four decisions delivered by the audit;
- rebuilt the final CTA as a beige/lime conversion block;
- simplified homepage navigation and preserved links to service anchors;
- kept all homepage styles scoped under `hp-*` classes so `services.html` is not affected.

Static checks:
- exactly one `<h1>`;
- no duplicate IDs;
- all section anchors exist;
- all referenced local images exist;
- CSS brace balance is valid.

Visual QA note:
- the in-app browser was unavailable in this session, so a new screenshot pass is still required when browser access is available.

## 2026-06-30 Homepage SEO Copy Restore

Restored the original homepage copy from `content-home.pdf` without reverting the new `hp-*` design:
- restored the exact hero promise, H1, lead, and CTA labels;
- restored the market-problem heading, introduction, four risk statements, and warning;
- restored the complete Alexander Sysuev expert text;
- restored the services heading, introduction, names, prices, and descriptions;
- restored the four-step audit process wording;
- restored all four trust facts and official-report wording;
- restored the final CTA, form labels, header navigation labels, and footer text from the previous homepage.

Verification:
- all required PDF phrases are present in `index.html`;
- exactly one `<h1>`;
- no duplicate IDs;
- the premium homepage layout and `hp-*` styles remain in place.

## 2026-06-30 Homepage Hero Refinement

Reworked only the first screen after visual feedback:
- removed the split black/image composition and dark directional gradient;
- stretched the aerial image across the full viewport width;
- made hero height responsive to the viewport with `100svh` desktop sizing;
- replaced the gradient with a restrained uniform image overlay;
- moved the lead form to the right of the headline on desktop/tablet;
- changed the form from a horizontal strip to a compact vertical card;
- hid the coordinate card, scan card, and cadastral line decorations to reduce clutter;
- kept the exact SEO hero copy from `content-home.pdf`;
- on mobile, the form stacks below the text over the same full-bleed image.

Static checks:
- one `<h1>`;
- no duplicate IDs;
- balanced CSS braces;
- hero SEO text preserved.

Browser note:
- Playwright Chromium is installed locally, but the Codex in-app browser session reported no available browser instance, so no new automated screenshot was produced in this pass.

Hero follow-up after user screenshot:
- fixed the root cause of the black left half: the absolute hero image was still constrained to grid column 2; it now spans `grid-column: 1 / -1` and `grid-row: 1 / -1`;
- reduced the uniform overlay opacity from `0.43` to `0.18` on desktop;
- removed the form's decorative lime top stripe and clarified it with visible field labels;
- increased form heading size and improved its content hierarchy;
- enlarged the three proof metrics and their captions;
- CSS brace balance remains valid.

Second hero correction after the next screenshot:
- removed the hero image from the padded grid entirely and set `background2.png` directly on the full-width `.hp-hero` section;
- this prevents the 1344px content container from creating black side fields around the image;
- kept only a light uniform overlay (`0.16`) on desktop;
- changed the lead form from an oversized white sheet to a compact lime card;
- forced form alignment to `stretch` and made field labels explicitly left-aligned;
- slightly increased proof-caption typography;
- CSS brace balance remains `0`.

Third hero direction after comparing it with the next light section:
- removed the full-screen dark photographic treatment because it conflicted with the rest of the white/lime/blue page;
- changed the hero base to the same light neutral surface used by the site;
- added a restrained architectural grid texture on the left using CSS;
- moved `background2.png` into a dedicated right-side media plane occupying 46% of the hero;
- retained the lime form over the media plane;
- switched hero copy and proof metrics to dark text for the light surface;
- constrained proof metrics to the left content column so they do not lose contrast over the photo;
- on mobile, the image becomes a full-width top media strip and the original text/form/metrics stack below it;
- all hero text remains unchanged.

Fourth hero correction:
- rejected the grid-texture experiment after it looked disconnected and caused the headline to collide visually with the image boundary;
- removed the grid texture completely;
- set the left hero plane to the site's warm beige token;
- kept the right image plane at 45% width;
- reduced and constrained the H1 to fit entirely inside the left plane;
- reduced the form width/padding so it reads as an integrated control card rather than a floating sheet;
- retained all text, actions, and proof metrics unchanged;
- CSS brace balance remains valid.

Fifth hero correction after rejecting both the beige color and split background:
- removed the two-plane beige/photo background completely;
- restored `background2.png` as one full-width, full-height hero background without a dark overlay;
- placed the existing copy/actions on a translucent white editorial surface;
- placed proof metrics on a matching translucent white surface directly below;
- retained the lime form as the only strong color accent;
- added restrained blur and shadow so the content remains readable without darkening the photo;
- mobile now uses the same unified photo background with stacked copy, form, and metrics cards;
- all user-approved text and labels remain unchanged.

Hero grid alignment follow-up:
- aligned the copy card and lime form to the same top edge;
- changed the stage from vertically centered independent cards to one explicit top-aligned grid;
- moved the proof metrics from a detached left-only card to one full-width bottom bar spanning both grid columns;
- retained card colors, typography, text, buttons, and form content unchanged;
- CSS brace balance remains valid.

Connected upper-card follow-up from the user's marked screenshot:
- removed the horizontal gap between the copy card and lime form;
- widened the left card to the right and the form card to the left so they meet at one seam;
- changed the upper grid ratio to approximately `2.15 : 1`;
- stretched both cards to the same row height;
- vertically centered the form controls inside the full-height lime card;
- increased the hero H1 from a 64px maximum to 70px and widened its text measure;
- kept the full-width proof strip below the connected upper block;
- mobile keeps a stacked layout with a compact 16px gap.

Hero container alignment follow-up:
- replaced custom horizontal padding based on `100vw` with the site's standard `min(100% - 40px, 1344px)` container width;
- this removes the scrollbar-width discrepancy between the hero and sections below;
- desktop/tablet hero content now uses zero internal horizontal padding and aligns exactly with the shared container edges;
- mobile uses the same 32px total page gutter as other `hp-home` sections;
- background remains full bleed while cards and metrics align to the site grid.

Second-section spacing follow-up:
- reduced the desktop top padding before the "Почему покупка участка — это риск?" heading from `168px` to `104px`;
- retained the existing `92px` bottom spacing so the heading area still has deliberate breathing room;
- tablet/mobile spacing remains controlled by the existing responsive rules.

Market-problem typography alignment:
- optically aligned the section index, main heading, and right-side introduction to one top line;
- removed the old 5px top padding from the right introduction;
- shifted the large heading upward by 7px to compensate for its font ascender;
- unified all four risk-card descriptive headings to Manrope `25px / 1.14 / 600` with the same letter spacing;
- retained the `> 50%` value as a separate display-scale data accent;
- card text content remains unchanged.

Market-problem label removal:
- removed the invented `01 / Проблема рынка` label because it is not part of `content-home.pdf`;
- removed the now-empty first grid column;
- converted the section header to a clean two-column layout;
- moved the H2 to the shared container's left edge and kept the source introduction on the right at the same top line;
- reset the previous optical negative margin on the H2.

Market-problem density and numbering follow-up:
- reduced the desktop gap between the section heading area and the risk-card grid from `92px` to `52px`;
- reduced the responsive heading/card gap to `44px`;
- changed the tablet section top spacing from `92px` to `72px` for better viewport density;
- renumbered the visual cards by column order: construction `01`, restrictions `02`, territory `03`, VRI `04`;
- SEO card wording and DOM card order remain unchanged.

Risk-card cleanup:
- removed the decorative `ЛЭП`, `Газ`, and `Вода` tags from the bottom of the green `> 50%` card;
- retained the same source wording in the card heading.

Risk warning redesign:
- removed the invented `Цена ошибки` label;
- changed the warning surface from beige to the site's black accent;
- added a large lime circular exclamation mark;
- increased warning typography and highlighted `миллионы рублей` and `юридически невозможно` in lime;
- preserved the original sentence from `content-home.pdf`;
- added a compact mobile warning layout.

Risk warning typography correction:
- replaced the black warning background with the site's warm beige surface;
- normalized warning text to the same Manrope `25px / 1.14 / 600` used by risk-card headings;
- reduced the block and icon height;
- inverted the warning icon to a black circle with a lime exclamation mark;
- removed all inline phrase emphasis so the full warning sentence uses one consistent style.

Method-section heading cleanup:
- removed the invented `02 / Как проходит проверка участка` label;
- removed the old 40px top margin that remained above the method heading;
- matched `Прозрачный алгоритм работы` to the market-problem H2 scale: `clamp(38px, 4vw, 58px)`, weight `500`, line-height `1.06`;
- the source description and CTA move upward with the heading and remain unchanged.

Homepage services-grid cleanup:
- removed the invented `03 / Услуги` label;
- moved the source H2 and introduction to the top of the section and aligned them to one row;
- changed the service grid to three equal-width columns;
- rebuilt every service card with shared rows for number/action, heading, price, description, and optional media;
- normalized card H3 typography to `28px / 1.08 / 600`;
- changed the first and third card images to equal-height, full-card-width bottom media blocks;
- changed the strategic-support card from a full-image overlay to the site's blue card surface with a separate bottom image;
- kept all source service names, prices, and descriptions unchanged.

Homepage description typography standardization:
- standardized body descriptions on light homepage surfaces to Manrope `15px / 1.6 / 400`;
- changed those descriptions to solid near-black `#050706` with no reduced opacity;
- applied the rule to the market intro, method intro/steps, services intro/cards, expert text, and final light CTA copy;
- explicitly excluded the first-screen copy and text on dark/photo surfaces;
- increased service-card minimum height from `640px` to `680px` so larger descriptions keep shared alignment and do not collide with media.

Service-card media completion:
- added `photo2.png` to the full-expertise card so all three service cards now contain media;
- normalized all service images to the same 210px height;
- positioned every image at `left: 0; right: 0; bottom: 0` with `width: 100%`;
- removed negative-margin media positioning so images now touch both side edges and the bottom edge of every card exactly.

Service-card density follow-up:
- reduced service-card minimum height from `680px` to `620px`;
- reduced all service media from `210px` to `190px`;
- reduced the internal top offset before card headings from `66px` to `42px`;
- increased prices from `16px` to the same `28px` scale as card headings;
- retained the common heading/price/description grid levels and 15px description typography.

Cross-section card-title normalization:
- normalized risk-card titles, method-step titles, service-card titles, and service prices to one exact scale;
- all now use Manrope `25px / 1.14 / 600` with `-.035em` letter spacing;
- this specifically aligns "На участке законодательно запрещено капитальное строительство", "Первичный анализ", "Экспресс-аудит участка", and "от 35 000 ₽".

Homepage expert-section redesign:
- removed the invented `04 / Эксперт` label;
- replaced the stretched three-column composition with a compact two-column photo/copy layout;
- reduced the main visual row to approximately 560px minimum height;
- arranged the three source paragraphs in a balanced two-column editorial text grid;
- moved the three proof metrics into one 142px horizontal strip below the photo and copy;
- increased fact captions to 13px and widened their text measure;
- retained the full source expert wording, portrait, name, and all three metrics;
- added a one-column tablet/mobile fallback for the photo, copy, text, and facts.

Homepage expert-section expressive redesign:
- rejected the quiet light-blue split layout as visually flat;
- rebuilt the section as a high-contrast editorial portrait feature on a black surface;
- moved the portrait to the left and enlarged the expert headline on the right;
- added a restrained lime eyebrow and quotation-mark accent to establish hierarchy;
- changed the proof metrics into a full-width lime evidence strip below the portrait and copy;
- preserved the expert biography, portrait, name, role, and all three source metrics;
- added dedicated tablet and mobile compositions, including stacked biography copy and compact fact rows;
- CSS brace balance remains valid; in-app browser visual QA was unavailable in this session.

Homepage expert-section compact light redesign:
- rejected the tall black editorial treatment because the biography read like a newspaper article and pushed all proof metrics below the viewport;
- returned the section to a light-blue surface with the portrait on the right;
- reduced the main visual row from roughly 690–880px to a 520px target on desktop;
- restored the biography to one continuous reading column while keeping only the introductory paragraph enlarged;
- reduced the proof strip to 112px so the portrait, biography, and all three metrics fit within a typical desktop viewport;
- retained visual emphasis through the lime rule, compact eyebrow, portrait treatment, and one lime fact cell without using a black background;
- tightened tablet and mobile variants; CSS brace balance remains valid.

Homepage expert-section final alignment:
- changed the expert section and copy surface to white;
- removed the invented eyebrow and the temporary black top rule;
- aligned the portrait edge with the `100%` fact card using an exact `2fr / 1fr` grid;
- set the three fact surfaces to lime, blue, and beige;
- restored the expert H2 to the shared `clamp(38px, 4vw, 58px)` section-heading scale;
- restored biography descriptions to the shared `15px / 1.6` body typography while retaining the larger introductory paragraph.

Homepage proof-section light redesign:
- kept the approved headline/cards layout but replaced the black background with the site's neutral gray surface;
- removed all visible card outlines;
- assigned white, lime, blue, and warm peach surfaces to the four proof cards;
- normalized card titles to `25px / 1.14 / 600` and descriptions to `15px / 1.6 / 400`;
- removed the `05 /` index, moved the H2 to the top, and converted the remaining trust phrase into a standalone subtitle;
- matched the subtitle to the method-intro body scale at `15px / 1.6 / 400` and increased its H2 spacing to `38px`.

Homepage proof-section card composition:
- rebuilt the left headline area as a white card equal in width and height to the proof-card grid;
- increased the H2-to-subtitle spacing to `48px`;
- added `photo4.png` as a full-width bottom image inside the left card;
- changed proof cards to fixed internal grid rows so numbers, titles, and descriptions align across both columns;
- preserved a stacked mobile layout and removed fixed description-row height on narrow screens.

Homepage proof-section strict row alignment:
- set both desktop proof-card rows to an exact `330px` height;
- made the left image `330px` high so it exactly matches the lower proof-card row;
- removed the global image `max-width` constraint for this image so it bleeds across the full white-card width;
- increased the H2-to-subtitle spacing to `64px`;
- inserted a shared `56px` spacer row between every card number and title;
- assigned numbers, titles, and descriptions to explicit matching grid rows across all four cards.

Proof subtitle spacing fix:
- replaced the flex-shrink-sensitive top margin with non-shrinking `64px` top padding;
- this guarantees a visible 64px gap below the proof-section H2.

Proof subtitle spacing correction:
- matched the expert-section H2-to-copy spacing exactly at `24px`;
- replaced the rejected `64px` proof-subtitle offset with `24px`.

Homepage final CTA typography cleanup:
- matched the CTA H2 to the shared `clamp(38px, 4vw, 58px)` heading scale;
- rebuilt the three benefit pills as equal grid cells with `13px / 1.4` text, 64px minimum height, and balanced 18px horizontal padding;
- normalized the form heading to the shared 25px card-title scale;
- increased input text to 15px and consent text from 9px to 12px;
- stacked benefit cells on mobile.

Homepage final CTA heading cleanup:
- removed the separate `Первичная оценка — бесплатно` eyebrow;
- added `бесплатно` directly to the main CTA heading;
- removed the old 38px H2 top margin so the heading occupies the eyebrow's former level.

Homepage final CTA control sizing:
- changed the three benefit-pill outlines from dark to white;
- centered each benefit label horizontally and vertically;
- limited the submit button to 360px and centered it in the form;
- kept consent text on one desktop line at 11px, with normal wrapping restored on mobile.

Homepage final CTA hero-ratio alignment:
- matched the CTA columns to the hero's `2.15fr / 1fr` desktop ratio;
- reduced the green form column to the same proportional width as the hero form;
- allowed the heading and benefit area to expand into the recovered left-side width;
- changed benefit pills from outlined surfaces to solid white cards without borders.

Homepage final CTA forced line breaks:
- split the first benefit after `в течение`;
- split the consent text after `обработку`;
- used explicit line breaks so both placements remain stable across desktop widths.

Homepage final CTA consent width:
- matched the consent copy width to the 360px submit-button width;
- retained a 100% maximum-width fallback for narrower screens.

Homepage footer light redesign:
- replaced the dark navy footer with the shared neutral-gray `#eef1eb` background;
- switched all footer typography to dark text and the existing green hover accent;
- normalized footer copy and links to `15px / 1.6`;
- increased column spacing and refined column proportions;
- changed column labels to compact 13px uppercase headings;
- replaced the light-on-dark bottom divider with a subtle dark-on-gray rule.

Homepage action-button system:
- replaced every diagonal action arrow with a straight `→` arrow;
- standardized all arrow circles to `34px` with 17px arrows, including header, hero, method, form, risk, and service actions;
- added arrow circles to desktop and mobile header CTAs;
- made lime buttons invert to black with white text and a white/lime arrow circle on hover;
- made black buttons invert to lime with black text and a black/lime arrow circle on hover;
- applied the black-to-lime behavior to both hero and final forms;
- added consistent 200ms color transitions to all action controls.

Services-page homepage-style synchronization:
- preserved all services-page content, section order, and card structure;
- synchronized palette tokens with the homepage lime, blue, beige, soft gray, and near-black colors;
- normalized major H1/H2 scales to the homepage `70px` hero and `58px` section-heading maxima with 500–600 weights;
- normalized card/subsection titles to `25px / 1.14 / 600` and body copy to `15px / 1.6 / 400`;
- standardized primary section spacing to 104px desktop, 84px tablet, and 72px mobile;
- standardized card padding to 28px desktop and 24px mobile;
- changed all services-page action circles to 34px and retained straight right arrows;
- added homepage-style arrow circles and reciprocal lime/black hover states to every services-page button;
- synchronized inputs, CTA benefit typography, header CTA, and light-gray footer styling with the homepage;
- retained the existing responsive layouts and only overrode their visual tokens and spacing.

Services-page synchronization corrections:
- removed the accidental padding from image-based feature panels, eliminating the exposed black background around the express-audit image;
- reduced only the narrow full-expertise and urban-support panel headings to `clamp(36px, 2.8vw, 42px)`;
- enabled safe wrapping inside those narrow panels so headings and descriptions cannot expand their grid tracks;
- replaced the services footer markup with the exact homepage footer structure and logo treatment while retaining services-page links.

Site-wide context-aware button contrast:
- added surface-aware button states instead of relying only on button color;
- made primary buttons white by default on black/image-dark surfaces, with lime hover states;
- kept primary buttons black on lime surfaces but changed their hover/active state to white;
- changed black arrow circles on lime cards to white on hover/active;
- applied the same white hover rule to both homepage green forms;
- kept secondary actions visually distinct on dark and lime service panels;
- applied every contextual rule to both `:hover` and `:active` states.

Site-wide responsive completion:
- fixed legacy `.button.navy` specificity so the urban-support button is white on its black panel;
- added final shared breakpoints at 1024px, 820px, and 600px for both pages;
- changed both footers to two columns on tablet and one column on mobile;
- moved the homepage hero to a single-column card/form/proof stack at tablet width;
- normalized tablet and mobile section spacing to 72px and 64px;
- collapsed service, process, proof, CTA, feature, and information grids progressively without changing content order;
- standardized mobile gutters at 16px per side and mobile H1/H2 scales at 40px/36px;
- made paired service actions full-width stacked controls on mobile;
- added explicit mobile padding and image-height rules to prevent overflow in complex service panels.

Responsive full-bleed and overflow correction:
- confirmed the in-app browser backend is unavailable in the current session and used the supplied mobile screenshots as visual evidence;
- force-reset padding on image-based services panels and absolutely filled them with their images, removing lime/black gutters;
- reduced the mobile services hero intro to content-driven spacing and moved its arrow into the visible content flow;
- increased the express-audit overlay card to 580px tablet / 620px mobile so both actions remain visible;
- removed fixed heights and minimum heights from text-driven service, process, information, proof, expert, and CTA cards at tablet/mobile widths;
- removed residual fixed heights from homepage proof, expert, and CTA content on mobile;
- reset mobile card grid rows to content-driven sizing and retained fixed image heights only where media cropping is intentional.

Homepage mobile hero full-width surfaces:
- kept the hero background image configured but fully covered it on mobile;
- expanded the white copy card, lime form, and white proof card to the full viewport width;
- removed all mobile gaps, outer margins, borders, blur, and shadows between the three hero surfaces;
- retained internal 32px content padding for readable text and controls.

Homepage mobile service-card structure correction:
- removed the desktop fixed 98px/36px title-and-price rows from mobile service cards;
- changed all three cards to one consistent natural flow: number/action, title, price, description, image;
- applied fixed 18px content gaps and a shared 32px offset below each card header;
- reserved 220px at the bottom of every card for the shared 190px image treatment;
- reduced only the mobile expert H2 to 32px and enabled safe wrapping to prevent horizontal overflow.

## 2026-07-14 Production Typography and Responsive Pass

Completed a site-wide delivery pass for `index.html` and `services.html` without changing content, palette, or the approved composition:
- added a final shared typography layer based on Manrope;
- disabled synthetic font weights and normalized Safari text scaling;
- standardized live text roles to the current design system: display headings, section headings, card titles, body copy, labels, and buttons;
- standardized mobile H1/H2/card-title scales to `40px`, up to `36px`, and `23px` respectively;
- standardized body copy to `15px / 1.6` and action text to `14px / 600`;
- normalized arrow glyph rendering and kept all circular action icons at `34px`;
- changed mobile form inputs to `16px` to prevent automatic iOS input zoom;
- rebuilt the mobile hero proof metrics into stable number/label rows;
- aligned homepage expert metrics on a shared mobile grid and protected numeric values from wrapping;
- normalized services expert proof cards so metric, title, and description hierarchy is consistent;
- replaced unsafe mid-word heading wrapping with normal word wrapping;
- preserved deliberate CTA benefit line breaks and removed only the full-scope breaks that harmed adaptation;
- added anchor scroll offsets for the sticky header.

Verification:
- Playwright viewport checks completed for both pages at `320`, `360`, `390`, `430`, `600`, `820`, `1024`, and `1440` px;
- horizontal overflow count: `0` at every tested width;
- visible clipped-text count: `0` at every tested width;
- Manrope loaded successfully;
- mobile menu opens correctly on both pages and remains inside the viewport;
- all mobile form inputs compute to `16px`;
- all tested action controls are at least `52px` high and circular arrows compute to `34x34px`;
- both pages retain exactly one `<h1>`;
- CSS brace balance is valid.

## 2026-07-14 Mobile Section-by-Section Visual QA

Completed a second visual pass after comparing the published GitHub Pages build with local mobile renders:
- reviewed every top-level section of `index.html` and `services.html` at 390px and the critical sections again at 320px;
- rebuilt the homepage expert metrics on a fixed two-column mobile grid so all three labels share the same left edge;
- kept `> 1 МЛРД` on one line at every tested mobile width and removed contact between the value and its label;
- added a measured 28px gap between the proof subtitle and the following image;
- removed mid-word breaks from large mobile headings and added a fluid 28–36px scale for narrow layouts;
- reduced only the homepage expert heading where needed so `градостроительства` remains intact;
- restored the intended CTA benefit line break, eliminating the merged `течениерабочего` text;
- reduced the empty height in the mobile services hero intro;
- corrected the full-expertise secondary button so its label remains visible on the white surface;
- replaced the fixed mobile rows in the express-audit information cards with content-driven rows;
- adjusted 320px service-card titles so long words no longer split inside the word;
- reduced narrow-screen input placeholder size without lowering the 16px input size required to avoid iOS zoom.

Final verification:
- both pages pass at `320`, `360`, `390`, `430`, and `600` px;
- horizontal overflow elements: `0` at every tested width;
- clipped visible text elements: `0` at every tested width;
- homepage expert label left coordinates are identical at 390px;
- proof subtitle-to-image gap computes to `28px`;
- the public GitHub Pages URL still shows the previous deployed version until these local changes are published.

## 2026-07-19 Site-wide Typography Role Unification

Completed a full typography consistency pass across `index.html` and `services.html` without changing the approved content, palette, section order, or composition:
- limited the loaded Manrope family to the three weights actually used by the interface: `400`, `500`, and `600`;
- introduced shared typography tokens for body copy, supporting copy, actions, metadata, and card titles;
- normalized body copy to `15px / 1.6 / 400`, supporting text to `14px / 500`, actions to `14px / 600`, metadata to `12px / 600`, and card titles to `25px / 600` (`23px` on mobile);
- aligned the homepage location, promise, express-evaluation label, consultation link, and risk link to the same role-based system;
- aligned service-page locations, section labels, card titles, prices, process steps, information cards, expert labels, CTA labels, and footer text to the same roles;
- normalized homepage expert-stat labels to one left edge and one `12px / 600` metadata treatment;
- kept numeric metrics at weight `500` and prevented metric values from wrapping;
- retained Arial only for standalone arrow glyphs, where it is used as an icon rather than body text;
- added a narrow-screen service-card title override at `320-360px` so long Russian words fit without clipping or mid-word breaks.

Verification:
- checked both pages at `320`, `390`, `768`, `1074`, and `1440` px;
- horizontal overflow elements: `0` at every tested width;
- meaningful clipped visible text elements: `0` after excluding intentionally hidden accessibility labels;
- Manrope loaded successfully on both pages;
- all visible content text uses only the `400`, `500`, and `600` role weights;
- reviewed every top-level section at `390px` and `1074px`, plus the service-card grid at `320px`;
- confirmed the homepage expert facts and proof headline/subtitle keep the corrected alignment and spacing.

## 2026-07-19 Pages CMS Integration

Implemented a free Git-backed admin panel with Pages CMS while preserving the current static-site design and visible content.

Architecture:
- GitHub Pages remains the public hosting and Jekyll build environment.
- `index.html` and `services.html` are now Liquid/Jekyll templates with front matter.
- shared header, footer, and browser behavior live in `_includes/`;
- shared site settings live in `_data/site.json`;
- homepage content lives in `_data/home.json`;
- services-page content lives in `_data/services.json`;
- `.pages.yml` defines the Russian-language editing interface, media picker, fixed collection lengths, and protected layout/link fields;
- `_config.yml` excludes development files from the public GitHub Pages build.

Client editing workflow:
1. Open `https://app.pagescms.org` and sign in with the GitHub account that has access to the repository.
2. Select the `auditgradstroy-site` repository and the `main` branch.
3. Open one of the three clear sections: `Общие настройки`, `Главная страница`, or `Страница услуг`.
4. Edit text, prices, labels, SEO fields, contact details, or choose/upload an image.
5. Save. Pages CMS commits the data change to GitHub; GitHub Pages then rebuilds the public site automatically.

CMS safeguards:
- layout-related anchors, link targets, card styles, and structural keys are readonly;
- repeated grids have fixed minimum/maximum item counts where changing the count would break the approved composition;
- field length hints reduce the chance of oversized client text damaging the layout;
- media uses the existing repository-root image library so no current asset paths had to be changed;
- the site still renders as normal static HTML for visitors and search engines.

Local development and validation:
- `npm run check` validates `.pages.yml` against all three JSON content files and builds `_site`;
- `npm run build` builds only the local static preview;
- `npm run preview` builds and serves `_site` at `http://127.0.0.1:4173`;
- `_site/` and `tmp/` are ignored by Git.

Verification completed after CMS conversion:
- CMS configuration and all content data pass the local validator;
- both templates build without unresolved Liquid tags;
- local visible text is exactly equal to the currently published visible text on both pages;
- section, article, and image counts exactly match the published pages;
- both pages retain exactly one `<h1>` and all images load;
- responsive checks completed at `320`, `390`, `600`, `768`, `1074`, and `1440` px;
- homepage expert labels share one left coordinate on mobile;
- the proof subtitle-to-image gap remains `28px`;
- a services-page intrinsic-width overflow was removed by normalizing `box-sizing` and giving the long urban-support heading its own fluid narrow-screen scale;
- mobile menu opens and exposes all expected links.

Important limitation retained from the original site:
- forms are still presentation-only (`data-static-form` prevents submission). A mail service, CRM, Telegram bot, or backend endpoint must be connected separately before leads can be delivered.

Future VPS/custom-domain migration:
- no CMS subdomain is required if continuing to use the hosted Pages CMS at `app.pagescms.org`; it will keep editing the GitHub repository while the VPS deploys from the same repository;
- a `cms.example.ru` subdomain is only optional if Pages CMS is later self-hosted;
- self-hosting Pages CMS adds PostgreSQL, a GitHub App, authentication, backups, and maintenance, so it should not be introduced until there is a concrete need.

Deployment status:
- the Pages CMS integration is currently implemented and verified locally;
- it has not yet been committed or pushed in this pass.
