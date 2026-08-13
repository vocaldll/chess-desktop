export const site = {
  name: 'Chess Desktop',
  owner: 'vocaldll',
  repo: 'chess-desktop',
  domain: 'chessdesktop.app',
  tagline: 'Play Chess.com and Lichess natively on your desktop.',
  description: 'Free, open source, and works on Windows and Linux.'
}

export const contact = `contact@${site.domain}`

export const repository = `https://github.com/${site.owner}/${site.repo}`
export const releases = `${repository}/releases`
export const latestRelease = `${releases}/latest`
export const downloadWindows = `${latestRelease}/download/Chess-Desktop-Setup.exe`
export const downloadLinuxX64 = `${latestRelease}/download/Chess-Desktop-x86_64.AppImage`
export const downloadLinuxArm64 = `${latestRelease}/download/Chess-Desktop-arm64.AppImage`
export const issues = `${repository}/issues`
