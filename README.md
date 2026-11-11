# Aerodrome website preview

Temporary preview of the new Aerodrome Group website, for internal feedback.

- Site: https://shakedlevy24.github.io/aerodrome-site-preview/
- Editor: https://shakedlevy24.github.io/aerodrome-site-preview/admin/

## Editing
Open the editor, sign in with a GitHub access key, click text to change it, click a picture or the video to replace it, then press Publish.
Edits are saved to `content.json`; uploaded files go to `assets/u/`. Every publish is a commit, so any change can be rolled back from the repository history.

To add an editor: Settings → Collaborators → add their GitHub account. They make their own access key from the editor's sign-in screen.

## Notes for rebuilds
`index.html` is generated. Before regenerating it, check `content.json`: edits are matched to the original text, so if a page's original wording changes, the editor's change for that spot is dropped.
