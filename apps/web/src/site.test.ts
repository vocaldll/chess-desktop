import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  contact,
  downloadLinuxArm64,
  downloadLinuxX64,
  downloadWindows,
  issues,
  latestRelease,
  releases,
  repository,
  site,
} from './site'

describe('public site links', () => {
  it('derives repository and contact links from the site identity', () => {
    expect(repository).toBe(`https://github.com/${site.owner}/${site.repo}`)
    expect(releases).toBe(`${repository}/releases`)
    expect(latestRelease).toBe(`${releases}/latest`)
    expect(issues).toBe(`${repository}/issues`)
    expect(contact).toBe(`contact@${site.domain}`)
  })

  it('keeps download URLs aligned with electron-builder artifact names', () => {
    const extensionPlaceholder = '$' + '{ext}'
    const builderConfig = readFileSync(
      resolve(import.meta.dirname, '../../desktop/electron-builder.yml'),
      'utf8',
    )

    expect(builderConfig).toContain(`artifactName: Chess-Desktop-Setup.${extensionPlaceholder}`)
    expect(builderConfig).toContain(
      `artifactName: Chess-Desktop-${'$'}{arch}.${extensionPlaceholder}`,
    )
    expect(builderConfig).toMatch(/arch:\s+- x64\s+- arm64/g)
    expect(downloadWindows).toBe(`${latestRelease}/download/Chess-Desktop-Setup.exe`)
    expect(downloadLinuxX64).toBe(`${latestRelease}/download/Chess-Desktop-x86_64.AppImage`)
    expect(downloadLinuxArm64).toBe(`${latestRelease}/download/Chess-Desktop-arm64.AppImage`)
  })
})
