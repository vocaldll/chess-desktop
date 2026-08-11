# Contributing

## Testing

- `pnpm test`: run unit and component tests
- `pnpm test:coverage`: run the suite and generate the coverage report
- `pnpm test:e2e`: build and run the Electron smoke test
- `pnpm typecheck`: check application and end-to-end test types

Run `pnpm lint` and the relevant tests before submitting a change. CI runs coverage and builds on
Linux, plus the Electron smoke test on Windows and Linux. Overall unit and component coverage must
remain at or above 55% for statements, branches, functions, and lines.

## Releases

See [Sentry release setup](docs/sentry.md) for the repository values used to upload desktop source
maps without exposing the upload credential to the application.
