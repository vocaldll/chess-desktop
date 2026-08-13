import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

interface DesktopPackage {
  devDependencies: {
    electron: string
  }
}

const desktopRoot = resolve(import.meta.dirname, 'apps/desktop')
const desktopPackage = JSON.parse(
  readFileSync(resolve(desktopRoot, 'package.json'), 'utf8')
) as DesktopPackage
const userDataDirectory = mkdtempSync(join(tmpdir(), 'chess-desktop-e2e-'))
const appArgs = [`--user-data-dir=${userDataDirectory}`]
const chromedriverBinary = process.env.ELECTRON_CHROMEDRIVER_PATH

if (process.platform === 'linux') {
  appArgs.push('--no-sandbox')
}

export const config: WebdriverIO.Config = {
  runner: 'local',
  specs: ['./apps/desktop/test/e2e/**/*.e2e.ts'],
  maxInstances: 1,
  capabilities: [
    {
      browserName: 'electron',
      browserVersion: desktopPackage.devDependencies.electron,
      ...(chromedriverBinary
        ? {
            'wdio:chromedriverOptions': {
              binary: chromedriverBinary
            }
          }
        : {})
    }
  ],
  services: [
    [
      'electron',
      {
        appEntryPoint: resolve(desktopRoot, 'out/main/index.js'),
        appArgs
      }
    ]
  ],
  framework: 'mocha',
  reporters: ['spec'],
  logLevel: 'warn',
  autoXvfb: true,
  waitforTimeout: 10_000,
  connectionRetryTimeout: 120_000,
  connectionRetryCount: 1,
  mochaOpts: {
    ui: 'bdd',
    timeout: 30_000
  },
  afterSession: () => {
    rmSync(userDataDirectory, { recursive: true, force: true })
  }
}
