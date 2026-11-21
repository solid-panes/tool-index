// Browse the store: the catalogue is listed, what is already in the index is marked, and
// adding a pane, an app, and an app tied to a type each save to the pod.
import { open, reset, disk, storeUrl } from './lib.mjs'

reset()
const catalogue = await (await fetch(storeUrl(), { cache: 'no-store' })).json()
const listed = catalogue['@graph'].find(node => [].concat(node['@type'] || []).includes('tools:ToolIndex'))['tools:registration'].length
const { page, check, finish, shot, rows, status, settled } = await open()
try {
  await page.waitFor(() => !!document.querySelector('.tix.tool-index-pane .tix-store button'), { timeout: 40000 })
  const shop = () => page.evaluate(() => [...document.querySelectorAll('.tix-shop-list .tix-row')].map(r => r.querySelector('.tix-name').firstChild.textContent + '|' + r.querySelector('.tix-kind').textContent + '|' + (r.querySelector('.tix-have') ? 'have' : 'add')))
  await page.evaluate(() => document.querySelector('.tix-store button').click())
  await page.waitFor(() => document.querySelectorAll('.tix-shop-list .tix-row').length > 0, { timeout: 30000 })
  const first = await shop()
  check('the store lists every entry in the catalogue', first.length === listed, first.length + ' of ' + listed)
  check('entries already in the index are marked', first.includes('Notes reader|Pane|have') && first.includes('Umai|App|have'), first.filter(r => /have/.test(r)).join(' ; '))
  check('no sideways scroll with the store open', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  await shot('store')

  const addFrom = (name) => page.evaluate((n) => { const row = [...document.querySelectorAll('.tix-shop-list .tix-row')].find(r => r.querySelector('.tix-name').firstChild.textContent === n); row.querySelector('button').click() }, name)
  await addFrom('Chess'); await settled()
  check('add a pane from the store: saved', /tix-good/.test(await status()), (await status()).slice(0, 80))
  check('the pod file has the pane', /chess-pane\.js/.test(disk()))
  await addFrom('Penny'); await settled()
  check('add an app from the store: saved', /tix-good/.test(await status()), (await status()).slice(0, 80))
  check('the pod file has the app and its pattern', /penny\.vincenttunru\.com\/explore\/\?url=\{url\}/.test(disk()))
  await addFrom('Solid File Manager'); await settled()
  check('an app for a type keeps its type', /solid-filemanager/.test(disk()) && /ldp#Container|ldp:Container/.test(disk()))
  const after = await shop()
  check('the store now marks them as in the index', after.includes('Chess|Pane|have') && after.includes('Penny|App|have'), after.filter(r => /have/.test(r)).join(' ; '))
  const mine = (await rows()).map(r => r.split('|')[0])
  check('they are in the person\'s own list', mine.includes('Chess') && mine.includes('Penny') && mine.includes('Solid File Manager'), mine.join(' ; '))
  await finish()
} catch (error) { await finish(error) }
