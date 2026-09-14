# Working agreement

- Treat this checkout as the source of truth for future edits.
- Keep each user-requested change in its own commit.
- Before committing, run the smallest relevant checks; for functional changes,
  prefer `npm test` and `npm run lint`.
- Use clear imperative commit messages, such as `Fix parsha boundary spacing`.
- Do not commit `node_modules`, build output, local runtime directories, `.env`
  files, or credentials; the existing `.gitignore` covers these generated and
  private files.
- Publishing to the hosted Sites deployment is a separate step and should only
  happen when requested.
