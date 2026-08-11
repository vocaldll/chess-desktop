# Privacy

Chess Desktop loads Chess.com and Lichess in isolated embedded browser sessions. Their own
privacy policies apply when you use those services.

## Anonymous crash reports

Anonymous crash reporting is enabled by default and can be changed during the introduction or
later under **Settings → Privacy**.

When enabled, Chess Desktop sends technical error reports to Sentry. Reports may include:

- The Chess Desktop, Electron, Chromium, Node, and operating-system versions
- The process type, application architecture and memory use, and a JavaScript stack trace
- Technical exception messages with web and local file locations redacted

Chess Desktop does not include chess account identities, games, page addresses, interaction
history, screenshots, console logs, network requests, native crash minidumps, usage analytics, or
session replays. Sentry is not initialized in the Chess.com or Lichess guest pages.

When reporting is disabled, JavaScript error reports are not sent.

The project DSN is public by design. Credentials used to upload source maps are kept out of the
application and are only provided to the release build through repository secrets.

For questions, write to [contact@chessdesktop.app](mailto:contact@chessdesktop.app).
