// The dashboard: list, refuse a non-pane, add, switch off, remove, and survive a reload.
//   node tests/dashboard.mjs        logs in and runs everything at 1300 px
//   node tests/dashboard.mjs 400    reuses that login; checks the layout at 400 px
import { open, reset, disk, sleep, INDEX_URL } from './lib.mjs'

const width = +(process.argv[2] || 1300)
reset()
const { page, check, finish, shot, address, rows, status, settled, dashboard } = await open({ width, login: width === 1300 })
try {
  check('the dashboard opens on the tool index', !!await dashboard())
  const first = await rows()
  check('lists what is registered', first.length >= 4, first.join(' ; '))
  check('the title covers apps too', (await page.evaluate(() => document.querySelector('.tix-title').textContent)) === 'Your panes and apps')
  check('no sideways scroll at ' + width + ' px', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  await shot('dashboard-' + width)
  if (width !== 1300) await finish()

  const addPane = (url) => page.evaluate((u) => { const f = document.querySelector('.tix-add'); f.querySelector('input[type=url]').value = u; f.requestSubmit() }, url)
  const row = (file) => `[...document.querySelectorAll('.tix-list:not(.tix-shop-list) .tix-row')].find(r => r.dataset.address.includes('${file}'))`

  await addPane('https://solid-panes.github.io/notes/README.md')
  await settled().catch(() => {})
  check('a file that is not a pane is refused', /tix-bad/.test(await status()), (await status()).slice(0, 110))

  await addPane('https://solid-panes.github.io/chess/chess-pane.js')
  await settled()
  check('add: saved', /tix-good/.test(await status()), (await status()).slice(0, 90))
  check('add: the file on the pod has the pane', /chess-pane\.js/.test(disk()))
  check('add: the list shows it', (await rows()).some(r => /^Chess\|Pane\|on/.test(r)), (await rows()).join(' ; '))

  await page.evaluate(`${row('notes-pane.js')}.querySelector('input[type=checkbox]').click()`)
  await settled()
  check('off: saved', /tix-good/.test(await status()), (await status()).slice(0, 90))
  const afterOff = disk()
  check('off: still in the file, no longer linked from the index', /notes-pane\.js/.test(afterOff) && !/registration[^.]*#notes\b/.test(afterOff.replace(/\s+/g, ' ')))
  check('off: the list shows it off', (await rows()).some(r => /^Notes reader\|Pane\|off/.test(r)))

  await page.evaluate(`${row('chess-pane.js')}.querySelector('.tix-danger').click()`)
  await sleep(300)
  check('remove asks once more first', /chess-pane\.js/.test(disk()))
  await page.evaluate(`${row('chess-pane.js')}.querySelector('.tix-danger').click()`)
  await settled()
  check('remove: gone from the file', !/chess/.test(disk()), (await status()).slice(0, 80))

  await page.goto(address(INDEX_URL))
  await dashboard()
  await sleep(4000)
  const after = await rows()
  check('after a reload the file still reads', after.length >= 4, after.join(' ; '))
  check('the reader passes the off pane over', !(await page.evaluate(() => !!window.panes.byName('notes-reader'))))
  await shot('dashboard-after')
  await finish()
} catch (error) { await finish(error) }
