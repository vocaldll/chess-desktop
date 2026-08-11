# Sentry release setup

Runtime error reporting uses the public project DSN compiled into the desktop application. No
runtime Sentry credential is required.

Release builds upload hidden source maps only when all three of these GitHub Actions values are
configured:

- Repository secret `SENTRY_AUTH_TOKEN`: an organization token with the `org:ci` scope and
  `org:read` permission
- Repository variable `SENTRY_ORG`: the Sentry organization slug
- Repository variable `SENTRY_PROJECT`: the Sentry project slug

The release workflow passes these values only to the build process. Source maps are deleted from
the packaged output after upload. Builds continue normally without the values, but production
stack traces will remain minified.

The runtime and build use the same release name: `chess-desktop@<package version>`.

## Local verification

Development builds do not send reports by default. To send one handled verification exception,
start the desktop app with both `SENTRY_ENABLE_IN_DEVELOPMENT=1` and `SENTRY_TEST_EVENT=1`. Close the
app after the event appears in Sentry.

Set `SENTRY_DEBUG=1` as well to print SDK diagnostics during local troubleshooting.

Do not put `SENTRY_AUTH_TOKEN` in an `.env` file committed to the repository or embed it in the
application.
