# Aerodrome website preview

Temporary preview of the new Aerodrome Group website, for internal feedback.

- Site: https://shakedlevy24.github.io/aerodrome-site-preview/
- Editor: https://shakedlevy24.github.io/aerodrome-site-preview/admin/
- Version 2 (brand book v1.1 look, new home page): https://shakedlevy24.github.io/aerodrome-site-preview/v2/
- Version 2 editor: https://shakedlevy24.github.io/aerodrome-site-preview/v2/admin/
- Version 3 (calmer: five-section home page, photos visible before hover): https://shakedlevy24.github.io/aerodrome-site-preview/v3/
- Version 3 editor: https://shakedlevy24.github.io/aerodrome-site-preview/v3/admin/
- Version 4 (same as version 3, in the orange brand book look): https://shakedlevy24.github.io/aerodrome-site-preview/v4/
- Version 4 editor: https://shakedlevy24.github.io/aerodrome-site-preview/v4/admin/
- Version 5 (new round of changes, started 23 Nov 2026 from an exact copy of the live site aerodrome-group.com, multi-page; the editor and contact form only work on the real host): https://shakedlevy24.github.io/aerodrome-site-preview/v5/
- Final build preview (the site that went live on 22 Nov with one address per page; the editor and contact form only work on the real host): https://shakedlevy24.github.io/aerodrome-site-preview/final/

## Editing
Open the editor, sign in with a GitHub access key, click text to change it, click a picture or the video to replace it, then press Publish.
Edits are saved to `content.json`; uploaded files go to `assets/u/`. Every publish is a commit, so any change can be rolled back from the repository history.

To add an editor: Settings → Collaborators → add their GitHub account. They make their own access key from the editor's sign-in screen.

## Notes for rebuilds
`index.html` is generated. Before regenerating it, check `content.json`: edits are matched to the original text, so if a page's original wording changes, the editor's change for that spot is dropped.
