# Contributing

## Workflow

Changes land on `master` through a pull request. A repository ruleset requires an up-to-date branch and passing CI before a merge is allowed.

```sh
git switch -c fix/thing
gh pr create
gh pr merge --squash --auto -d
```

`gh pr create` pushes the branch and prompts for a title and description. Write the description by hand and cover what changed, why, and how it was verified. `gh pr merge --squash --auto -d` queues the merge for whenever CI turns green, then deletes the branch.

Contributors without push access should fork the repository and open a pull request from their fork.

Use [Conventional Commits](https://www.conventionalcommits.org) for commit subjects and pull request titles. A squashed commit takes its subject from the pull request title, or from the commit itself when the branch holds only one.

## Testing

- `pnpm test`: run unit and component tests
- `pnpm test:coverage`: run the suite and generate the coverage report
- `pnpm test:e2e`: build and run the Electron smoke test
- `pnpm typecheck`: check application and end-to-end test types

Use Node.js 24 or newer. Run `pnpm lint` and the relevant tests before submitting a change. CI runs coverage and production builds, creates the Windows and Linux desktop distributables without publishing them, reviews dependency changes for known high-severity vulnerabilities, and runs the Electron smoke test on Windows and Linux. Overall unit and component coverage must remain at or above 55% for statements, branches, functions, and lines.

## Releases

See [Sentry release setup](docs/sentry.md) for the repository values used to upload desktop source maps without exposing the upload credential to the application.
