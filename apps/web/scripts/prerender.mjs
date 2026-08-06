import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const target = 'dist/index.html'
const placeholder = '<div id="root"></div>'

const { render } = await import(pathToFileURL('.prerender/entry-server.js').href)
const markup = render()
const html = readFileSync(target, 'utf8')

if (!html.includes(placeholder)) {
  throw new Error(`Could not find ${placeholder} in ${target}`)
}

writeFileSync(target, html.replace(placeholder, `<div id="root">${markup}</div>`), 'utf8')
rmSync('.prerender', { recursive: true, force: true })

console.log(`prerendered ${markup.length} chars into ${target}`)
