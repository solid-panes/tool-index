// Apps: "Open with" links for the right kind of thing, and adding an app in the dashboard.
import { open, reset, disk, sleep, INDEX_URL, RECIPE, NOTE } from './lib.mjs'

reset()
const { page, check, finish, shot, address, status, settled } = await open()
try {
  const openWith = () => page.evaluate(() => [...document.querySelectorAll('#browseOpenWith a')].map(a => a.textContent + ' => ' + a.href))
  const settle = async () => { await page.waitFor(() => !!window.panes && document.getElementById('OutlineView')?.childElementCount > 0, { timeout: 40000 }); await sleep(5000) }

  await page.goto(address(RECIPE)); await settle()
  let links = await openWith()
  check('a recipe offers the app registered for recipes', links.length === 1 && links[0].startsWith('Open with Umai viewer => https://umai.noeldemartin.com/viewer?url=' + encodeURIComponent(RECIPE)), links.join(' ; '))
  await shot('open-with')

  await page.goto(address(NOTE)); await settle()
  check('a note does not offer the recipe app', (await openWith()).length === 0, (await openWith()).join(' ; '))

  await page.goto(address(INDEX_URL))
  await page.waitFor(() => !!document.querySelector('.tix.tool-index-pane .tix-add-app'), { timeout: 40000 })
  const fill = (name, template, kind) => page.evaluate((v) => { const [n, t, k] = v.split('|'); const f = document.querySelector('.tix-add-app'); const i = f.querySelectorAll('input'); i[0].value = n; i[1].value = t; i[2].value = k; f.requestSubmit() }, [name, template, kind].join('|'))
  await fill('Broken', 'https://example.org/view', '')
  await sleep(600)
  check('a pattern without {url} is refused', /tix-bad/.test(await status()), (await status()).slice(0, 100))
  await fill('Any viewer', 'https://example.org/view?url={url}', '')
  await settled()
  check('add an app: saved', /tix-good/.test(await status()), (await status()).slice(0, 90))
  const file = disk()
  check('add an app: the file has it', /example\.org\/view\?url=\{url\}/.test(file) && /AppRegistration/.test(file))
  check('the list shows it as an app', (await page.evaluate(() => [...document.querySelectorAll('.tix-list:not(.tix-shop-list) .tix-row')].map(r => r.querySelector('.tix-name').textContent))).some(t => /^Any viewerApp/.test(t)))
  await shot('apps')

  await page.goto(address(NOTE)); await settle()
  links = await openWith()
  check('an app for anything is offered on a note', links.length === 1 && links[0].startsWith('Open with Any viewer => https://example.org/view?url=http'), links.join(' ; '))
  await finish()
} catch (error) { await finish(error) }
