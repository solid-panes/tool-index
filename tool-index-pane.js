// tool-index-pane.js: a dashboard for the panes in a person's tool index.
//
// Opens on a tool index (https://pod-os.org/vocab/tools). Lists what is registered there,
// adds a pane by its address, switches one off or on, and removes one. It writes only to
// the index document it is showing.
//
// Off is stored without any new vocabulary: the registration stays in the document but the
// index no longer links to it with tools:registration, so loaders pass it over.
//
// One file, no imports. MIT. Copyright (c) 2026 Melvin Carvalho.

const TOOLS = 'https://pod-os.org/vocab/tools#'
const AC = 'https://www.w3.org/ns/ac#'
const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
const ODRL_DISPLAY = 'http://www.w3.org/ns/odrl/2/display'
const HYDRA = 'http://www.w3.org/ns/hydra/core#'
const SCHEMA = ['https://schema.org/', 'http://schema.org/']
// The invocation type for a pane module: a placeholder until its name and home are settled.
const PANE_MODULE = 'https://mashlib.com/ns/panes#PaneModuleInvocation'
// The public catalogue the "Browse the store" section reads: a tool index anyone can copy from.
const STORE = 'https://solid-panes.github.io/store/catalogue.jsonld'
const REGISTRATION_TYPES = ['Registration', 'ToolRegistration', 'AppRegistration'].map(t => TOOLS + t)

const CSS = `
.tix.tool-index-pane { max-width: 860px; margin: 0 auto; padding: 20px 16px 40px; box-sizing: border-box; font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; color: #1f2430; background: #fff; }
.tix * { box-sizing: border-box; }
.tix-title { font-size: 24px; font-weight: 700; margin: 0 0 4px; }
.tix-lead { margin: 0 0 20px; color: #5b6272; }
.tix-list { display: flex; flex-direction: column; gap: 10px; margin: 0 0 28px; padding: 0; list-style: none; }
.tix-row { display: grid; grid-template-columns: 1fr auto; gap: 6px 14px; align-items: center; padding: 14px 16px; border: 1px solid #e3e6ee; border-radius: 12px; background: #fff; }
.tix-row.tix-off { background: #f7f8fb; }
.tix-row.tix-off .tix-name { color: #7b8292; }
.tix-main { min-width: 0; }
.tix-name { font-weight: 650; font-size: 16px; overflow-wrap: anywhere; }
.tix-kind { display: inline-block; margin-left: 8px; padding: 1px 8px; border-radius: 999px; font-size: 12px; font-weight: 600; vertical-align: 2px; background: #ede9fe; color: #5b21b6; }
.tix-kind.tix-other { background: #eef1f6; color: #4a5263; }
.tix-url { display: block; margin-top: 2px; font-size: 13px; color: #4b5bd6; text-decoration: none; overflow-wrap: anywhere; }
.tix-url:hover { text-decoration: underline; }
.tix-note { margin-top: 2px; font-size: 13px; color: #7b8292; }
.tix-actions { display: flex; align-items: center; gap: 10px; }
.tix-switch { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #4a5263; cursor: pointer; user-select: none; }
.tix-switch input { width: 18px; height: 18px; accent-color: #6d4aff; cursor: pointer; }
.tix button { font: inherit; border-radius: 9px; padding: 7px 14px; cursor: pointer; border: 1px solid #cfd4e0; background: #fff; color: #1f2430; }
.tix button:hover { background: #f3f4f8; }
.tix button:disabled { opacity: .55; cursor: default; }
.tix button.tix-danger { border-color: #e7b4b4; color: #a12626; }
.tix button.tix-danger.tix-sure { background: #b42323; border-color: #b42323; color: #fff; }
.tix button.tix-primary { background: #6d4aff; border-color: #6d4aff; color: #fff; font-weight: 600; }
.tix button.tix-primary:hover { background: #5b3be0; }
.tix-empty { padding: 18px 16px; border: 1px dashed #cfd4e0; border-radius: 12px; color: #5b6272; }
.tix-add { padding: 16px; border: 1px solid #e3e6ee; border-radius: 12px; background: #fafbfe; }
.tix-add h3 { margin: 0 0 10px; font-size: 16px; }
.tix-add-app, .tix-store { margin-top: 14px; }
.tix-shop-list { margin: 14px 0 0; }
.tix-about { color: #33405c; font-size: 14px; }
.tix-have { font-size: 13px; font-weight: 600; color: #17693a; white-space: nowrap; }
.tix-hint { margin: -4px 0 10px; font-size: 13px; color: #5b6272; }
.tix-fields.tix-fields-app { grid-template-columns: 1fr 2fr 1.4fr auto; }
.tix-fields { display: grid; grid-template-columns: 2fr 1fr auto; gap: 10px; align-items: end; }
.tix-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.tix-field span { font-size: 12px; font-weight: 600; color: #4a5263; }
.tix-field input { font: inherit; padding: 8px 10px; border: 1px solid #cfd4e0; border-radius: 9px; background: #fff; color: #1f2430; min-width: 0; width: 100%; }
.tix-field input:focus { outline: 2px solid #b9a8ff; outline-offset: 1px; }
.tix .tix-status { min-height: 0; margin: 12px 2px 0; padding: 0; border: 0; border-radius: 0; box-shadow: none; background: transparent; font-size: 14px; color: #4a5263; }
.tix .tix-status:empty { display: none; }
.tix-status.tix-bad { color: #a12626; }
.tix-status.tix-good { color: #17693a; }
.tix-foot { margin: 18px 2px 0; font-size: 13px; color: #7b8292; }
@media (max-width: 560px) {
  .tix-row { grid-template-columns: 1fr; }
  .tix-actions { justify-content: space-between; }
  .tix-fields, .tix-fields.tix-fields-app { grid-template-columns: 1fr; }
}
`

function el (dom, tag, className, text) {
  const node = dom.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function isToolIndex (subject, store) {
  const doc = subject.doc()
  const type = store.sym(RDF_TYPE)
  const kind = store.sym(TOOLS + 'ToolIndex')
  return store.holds(subject, type, kind, doc) || store.holds(doc, type, kind, doc)
}

// The index node itself: the document, or the subject if that is what is typed.
function indexNode (subject, store) {
  const doc = subject.doc()
  return store.holds(subject, store.sym(RDF_TYPE), store.sym(TOOLS + 'ToolIndex'), doc) ? subject : doc
}

function schemaValue (store, subject, term, doc) {
  for (const ns of SCHEMA) {
    const value = store.any(subject, store.sym(ns + term), null, doc)
    if (value) return value.value
  }
  return ''
}

// Everything registered in the document, linked from the index (on) or not (off).
function readEntries (store, index) {
  const doc = index.doc()
  const sym = (uri) => store.sym(uri)
  const linked = store.each(index, sym(TOOLS + 'registration'), null, doc)
  const seen = new Map()
  for (const node of linked) seen.set(node.value, node)
  for (const type of REGISTRATION_TYPES) {
    for (const node of store.each(null, sym(RDF_TYPE), sym(type), doc)) if (!seen.has(node.value)) seen.set(node.value, node)
  }
  const entries = []
  for (const node of seen.values()) {
    let kind = 'Other'
    let address = ''
    let forType = ''
    for (const capability of store.each(node, sym(AC + 'capability'), null, doc)) {
      const type = store.any(capability, sym(AC + 'resourceType'), null, doc)
      if (type) forType = type.value
      for (const invocation of store.each(capability, sym(AC + 'invocation'), null, doc)) {
        const types = store.each(invocation, sym(RDF_TYPE), null, doc).map(t => t.value)
        if (types.includes(PANE_MODULE)) { kind = 'Pane'; address = schemaValue(store, invocation, 'url', doc) }
        else if (types.includes(TOOLS + 'HtmlFragmentInvocation')) { kind = 'HTML tool'; address = schemaValue(store, invocation, 'url', doc) }
        else if (types.includes(AC + 'UriTemplateInvocation')) {
          kind = 'App'
          const template = store.any(invocation, sym(HYDRA + 'template'), null, doc) || store.any(invocation, sym(AC + 'template'), null, doc)
          address = template ? template.value : ''
        }
      }
    }
    entries.push({ node, name: schemaValue(store, node, 'name', doc) || address || node.value, kind, address, forType, description: schemaValue(store, node, 'description', doc), author: schemaValue(store, node, 'author', doc), on: linked.some(l => l.value === node.value) })
  }
  return entries.sort((a, b) => (a.kind === 'Pane' ? 0 : 1) - (b.kind === 'Pane' ? 0 : 1) || a.name.localeCompare(b.name))
}

// Write the whole document back in its own format.
async function save (store, doc) {
  const rdf = globalThis.$rdf || (globalThis.UI && globalThis.UI.rdf)
  if (!rdf || typeof rdf.serialize !== 'function') throw new Error('this page does not expose rdflib, so the index cannot be written from here')
  const type = /\.jsonld$/i.test(doc.uri) ? 'application/ld+json' : 'text/turtle'
  const text = await new Promise((resolve, reject) => {
    try {
      const out = rdf.serialize(doc, store, doc.uri, type, (error, result) => error ? reject(error) : resolve(result))
      if (typeof out === 'string') resolve(out)
    } catch (error) { reject(error) }
  })
  const response = await store.fetcher.webOperation('PUT', doc.uri, { data: text, contentType: type })
  if (response && response.ok === false) throw new Error('the pod answered ' + response.status)
}

async function reload (store, doc) {
  try { await store.fetcher.load(doc, { force: true }) } catch { /* shown as it is */ }
}

// A pane's address: http(s), no credentials.
function paneAddress (text) {
  try {
    const url = new URL(text.trim())
    return /^https?:$/.test(url.protocol) && !url.username && !url.password ? url : null
  } catch { return null }
}

// Look at the file without running it: it must be reachable, be JavaScript, and look like a pane.
async function looksLikeAPane (url) {
  let response
  try { response = await fetch(url.href, { credentials: 'omit' }) } catch { throw new Error('that address could not be read from here (it must allow reads from other sites)') }
  if (!response.ok) throw new Error('that address answered ' + response.status)
  const type = response.headers.get('content-type') || ''
  if (!/javascript|ecmascript/i.test(type)) throw new Error('that address is not served as JavaScript (' + (type.split(';')[0] || 'no type') + ')')
  const source = await response.text()
  if (!/export\s+default/.test(source) || !/\blabel\b/.test(source) || !/\brender\b/.test(source)) throw new Error('that file does not look like a pane (a default export with label and render)')
}

function nameFromAddress (url) {
  const file = url.pathname.split('/').filter(Boolean).pop() || url.host
  const base = file.replace(/\.m?js$/i, '').replace(/[-_.]?pane$/i, '').replace(/[-_]+/g, ' ').trim()
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : url.host
}

function freshNode (store, doc, name) {
  const slug = (name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'pane')
  let id = slug
  for (let n = 2; store.statementsMatching(store.sym(doc.uri + '#' + id), null, null, doc).length; n++) id = slug + '-' + n
  return id
}

let lastStore = null

const pane = {
  name: 'tool-index',
  icon: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#6d4aff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M17.5 14v7M14 17.500h7"/></svg>'),

  label (subject, context) {
    lastStore = context.session.store
    return isToolIndex(subject, lastStore) ? 'Panes' : null
  },

  // Called with the subject only, so use the store seen by label.
  shouldGetFocus (subject) {
    return !!lastStore && isToolIndex(subject, lastStore)
  },

  render (subject, context) {
    const dom = context.dom
    const store = context.session.store
    const index = indexNode(subject, store)
    const doc = index.doc()
    const sym = (uri) => store.sym(uri)

    const root = el(dom, 'div', 'tix tool-index-pane')
    root.appendChild(el(dom, 'style', '', CSS))
    root.appendChild(el(dom, 'h2', 'tix-title', 'Your panes and apps'))
    root.appendChild(el(dom, 'p', 'tix-lead', 'What is registered in your tool index. A pane that is on is loaded the next time you open the data browser and log in; an app is offered as an "Open with" link.'))

    const list = el(dom, 'ul', 'tix-list')
    root.appendChild(list)

    const add = el(dom, 'form', 'tix-add')
    add.appendChild(el(dom, 'h3', '', 'Add a pane'))
    const fields = el(dom, 'div', 'tix-fields')
    const field = (label, placeholder, type, fields) => {
      const wrap = el(dom, 'label', 'tix-field')
      wrap.appendChild(el(dom, 'span', '', label))
      const input = el(dom, 'input')
      input.type = type
      input.placeholder = placeholder
      input.autocomplete = 'off'
      wrap.appendChild(input)
      fields.appendChild(wrap)
      return input
    }
    const addressInput = field('Address of the pane file', 'https://example.org/my-pane.js', 'url', fields)
    const nameInput = field('Name (optional)', 'From the file name', 'text', fields)
    const addButton = el(dom, 'button', 'tix-primary', 'Add')
    addButton.type = 'submit'
    fields.appendChild(addButton)
    add.appendChild(fields)
    root.appendChild(add)

    // An app: another site that can show a resource, reached by a link made from a pattern.
    const addApp = el(dom, 'form', 'tix-add tix-add-app')
    addApp.appendChild(el(dom, 'h3', '', 'Add an app'))
    addApp.appendChild(el(dom, 'p', 'tix-hint', 'An app opens in its own tab. Its link pattern has {url} where the address of the thing you are looking at goes.'))
    const appFields = el(dom, 'div', 'tix-fields tix-fields-app')
    const appNameInput = field('Name', 'Recipe viewer', 'text', appFields)
    const appTemplateInput = field('Link pattern', 'https://example.org/view?url={url}', 'text', appFields)
    const appTypeInput = field('For things of type (optional)', 'https://schema.org/Recipe', 'url', appFields)
    const addAppButton = el(dom, 'button', 'tix-primary', 'Add')
    addAppButton.type = 'submit'
    appFields.appendChild(addAppButton)
    addApp.appendChild(appFields)
    root.appendChild(addApp)

    // The store: a public catalogue in the same format. Read only when asked for.
    const shop = el(dom, 'section', 'tix-add tix-store')
    shop.appendChild(el(dom, 'h3', '', 'Browse the store'))
    shop.appendChild(el(dom, 'p', 'tix-hint', 'A public list of panes and apps. Adding one copies its entry into your own index.'))
    const shopButton = el(dom, 'button', '', 'Show what is in the store')
    shopButton.type = 'button'
    shop.appendChild(shopButton)
    const shopList = el(dom, 'ul', 'tix-list tix-shop-list')
    shopList.hidden = true
    shop.appendChild(shopList)
    root.appendChild(shop)

    const status = el(dom, 'p', 'tix-status')
    status.setAttribute('role', 'status')
    root.appendChild(status)
    root.appendChild(el(dom, 'p', 'tix-foot', 'A pane is a small program that runs as you. Add only panes from sites you trust. Changes are saved to ' + doc.uri))

    const say = (text, tone) => { status.textContent = text; status.className = 'tix-status' + (tone ? ' tix-' + tone : '') }
    let busy = false
    const setBusy = (value) => { busy = value; for (const control of root.querySelectorAll('button, input')) control.disabled = value }

    // Change the store, write the document, and show the result; on failure put the store back.
    async function change (edit, done) {
      if (busy) return
      setBusy(true)
      say('Saving…')
      try {
        edit()
        await save(store, doc)
        say(done, 'good')
      } catch (error) {
        await reload(store, doc)
        say('Not saved: ' + (error && error.message ? error.message : error), 'bad')
      }
      setBusy(false)
      draw()
      if (catalogue && !shopList.hidden) drawStore()
    }

    function removeEntry (entry) {
      const subjects = [entry.node]
      for (const capability of store.each(entry.node, sym(AC + 'capability'), null, doc)) {
        subjects.push(capability)
        for (const invocation of store.each(capability, sym(AC + 'invocation'), null, doc)) {
          subjects.push(invocation)
          for (const mapping of store.each(invocation, sym(HYDRA + 'mapping'), null, doc)) subjects.push(mapping)
        }
      }
      const statements = []
      for (const node of subjects) statements.push(...store.statementsMatching(node, null, null, doc))
      statements.push(...store.statementsMatching(null, null, entry.node, doc))
      store.remove([...new Set(statements)])
    }

    // Write one entry into the store (the rdflib one), as the forms and the public store both do.
    function writePane (name, address) {
      const id = freshNode(store, doc, name)
      const registration = sym(doc.uri + '#' + id)
      const capability = sym(doc.uri + '#' + id + '-cap')
      const invocation = sym(doc.uri + '#' + id + '-inv')
      store.add(index, sym(RDF_TYPE), sym(TOOLS + 'ToolIndex'), doc)
      store.add(index, sym(TOOLS + 'registration'), registration, doc)
      store.add(registration, sym(RDF_TYPE), sym(TOOLS + 'Registration'), doc)
      store.add(registration, sym(SCHEMA[0] + 'name'), store.literal(name), doc)
      store.add(registration, sym(AC + 'capability'), capability, doc)
      store.add(capability, sym(RDF_TYPE), sym(AC + 'Capability'), doc)
      store.add(capability, sym(AC + 'action'), sym(ODRL_DISPLAY), doc)
      store.add(capability, sym(AC + 'invocation'), invocation, doc)
      store.add(invocation, sym(RDF_TYPE), sym(PANE_MODULE), doc)
      store.add(invocation, sym(SCHEMA[0] + 'url'), store.literal(address), doc)
    }

    function writeApp (name, template, kind) {
      const id = freshNode(store, doc, name)
      const node = (suffix) => sym(doc.uri + '#' + id + suffix)
      const [registration, capability, invocation, mapping] = [node(''), node('-cap'), node('-inv'), node('-map')]
      store.add(index, sym(RDF_TYPE), sym(TOOLS + 'ToolIndex'), doc)
      store.add(index, sym(TOOLS + 'registration'), registration, doc)
      store.add(registration, sym(RDF_TYPE), sym(TOOLS + 'AppRegistration'), doc)
      store.add(registration, sym(SCHEMA[0] + 'name'), store.literal(name), doc)
      store.add(registration, sym(AC + 'capability'), capability, doc)
      store.add(capability, sym(RDF_TYPE), sym(AC + 'Capability'), doc)
      store.add(capability, sym(AC + 'action'), sym(ODRL_DISPLAY), doc)
      if (kind) store.add(capability, sym(AC + 'resourceType'), sym(kind), doc)
      store.add(capability, sym(AC + 'invocation'), invocation, doc)
      store.add(invocation, sym(RDF_TYPE), sym(AC + 'UriTemplateInvocation'), doc)
      store.add(invocation, sym(HYDRA + 'template'), store.literal(template), doc)
      store.add(invocation, sym(HYDRA + 'mapping'), mapping, doc)
      store.add(mapping, sym(HYDRA + 'variable'), store.literal('url'), doc)
      store.add(mapping, sym(HYDRA + 'property'), sym(AC + 'open'), doc)
    }

    // The public store, read into a store of its own so it never mixes with the person's data.
    let catalogue = null
    async function readStore () {
      const rdf = globalThis.$rdf || (globalThis.UI && globalThis.UI.rdf)
      if (!rdf || typeof rdf.parse !== 'function') throw new Error('this page does not expose rdflib')
      let response
      try { response = await fetch(STORE, { headers: { Accept: 'application/ld+json' }, credentials: 'omit' }) } catch { throw new Error('the store could not be reached') }
      if (!response.ok) throw new Error('the store answered ' + response.status)
      const text = await response.text()
      const graph = rdf.graph()
      await new Promise((resolve, reject) => {
        try { rdf.parse(text, graph, STORE, 'application/ld+json', (error) => error ? reject(error) : resolve()) } catch (error) { reject(error) }
      })
      return readEntries(graph, graph.sym(STORE))
    }

    function drawStore () {
      shopList.replaceChildren()
      shopList.hidden = false
      const mine = new Set(readEntries(store, index).map(entry => entry.address))
      for (const item of catalogue || []) {
        if (item.kind !== 'Pane' && item.kind !== 'App') continue
        const row = el(dom, 'li', 'tix-row')
        row.dataset.address = item.address
        const main = el(dom, 'div', 'tix-main')
        const name = el(dom, 'div', 'tix-name', item.name)
        name.appendChild(el(dom, 'span', 'tix-kind' + (item.kind === 'Pane' ? '' : ' tix-other'), item.kind))
        main.appendChild(name)
        if (item.description) main.appendChild(el(dom, 'div', 'tix-note tix-about', item.description))
        main.appendChild(el(dom, 'div', 'tix-note', item.address + (item.author ? ' · by ' + item.author : '')))
        row.appendChild(main)
        const actions = el(dom, 'div', 'tix-actions')
        if (mine.has(item.address)) {
          actions.appendChild(el(dom, 'span', 'tix-have', 'In your index'))
        } else {
          const button = el(dom, 'button', 'tix-primary', 'Add')
          button.type = 'button'
          button.addEventListener('click', async () => {
            await change(() => item.kind === 'Pane' ? writePane(item.name, item.address) : writeApp(item.name, item.address, item.forType), item.name + ' was added from the store.')
            drawStore()
          })
          actions.appendChild(button)
        }
        row.appendChild(actions)
        shopList.appendChild(row)
      }
      if (!shopList.childElementCount) shopList.appendChild(el(dom, 'li', 'tix-empty', 'The store is empty.'))
    }

    shopButton.addEventListener('click', async () => {
      if (busy) return
      shopButton.disabled = true
      shopButton.textContent = 'Looking in the store…'
      try {
        catalogue = await readStore()
        shopButton.hidden = true
        drawStore()
      } catch (error) {
        shopButton.textContent = 'Show what is in the store'
        say('The store could not be read: ' + (error && error.message ? error.message : error) + '.', 'bad')
      }
      shopButton.disabled = false
    })

    function draw () {
      list.replaceChildren()
      const entries = readEntries(store, index)
      if (!entries.length) {
        list.appendChild(el(dom, 'li', 'tix-empty', 'Nothing is registered yet. Add a pane below.'))
        return
      }
      for (const entry of entries) {
        const row = el(dom, 'li', 'tix-row' + (entry.on ? '' : ' tix-off'))
        row.dataset.address = entry.address
        const main = el(dom, 'div', 'tix-main')
        const name = el(dom, 'div', 'tix-name', entry.name)
        name.appendChild(el(dom, 'span', 'tix-kind' + (entry.kind === 'Pane' ? '' : ' tix-other'), entry.kind))
        main.appendChild(name)
        if (entry.address && /^https?:/.test(entry.address) && !entry.address.includes('{')) {
          const link = el(dom, 'a', 'tix-url', entry.address)
          link.href = entry.address
          link.target = '_blank'
          link.rel = 'noopener noreferrer'
          main.appendChild(link)
        } else if (entry.address) {
          main.appendChild(el(dom, 'div', 'tix-note', entry.address))
        }
        if (entry.kind === 'App') main.appendChild(el(dom, 'div', 'tix-note', 'An app: offered as an "Open with" link.'))
        else if (entry.kind !== 'Pane') main.appendChild(el(dom, 'div', 'tix-note', 'Not a SolidOS pane: this data browser passes it over.'))
        row.appendChild(main)

        const actions = el(dom, 'div', 'tix-actions')
        const toggle = el(dom, 'label', 'tix-switch')
        const box = el(dom, 'input')
        box.type = 'checkbox'
        box.checked = entry.on
        box.setAttribute('aria-label', (entry.on ? 'Switch off ' : 'Switch on ') + entry.name)
        toggle.appendChild(box)
        toggle.appendChild(el(dom, 'span', '', entry.on ? 'On' : 'Off'))
        box.addEventListener('change', () => change(() => {
          const link = [index, sym(TOOLS + 'registration'), entry.node, doc]
          if (box.checked) store.add(...link)
          else store.remove(store.statementsMatching(...link))
        }, entry.name + (box.checked ? ' is on.' : ' is off.') + ' It takes effect the next time the data browser loads.'))
        actions.appendChild(toggle)

        const remove = el(dom, 'button', 'tix-danger', 'Remove')
        remove.type = 'button'
        remove.addEventListener('click', () => {
          if (!remove.classList.contains('tix-sure')) {
            remove.classList.add('tix-sure')
            remove.textContent = 'Really remove?'
            setTimeout(() => { remove.classList.remove('tix-sure'); remove.textContent = 'Remove' }, 4000)
            return
          }
          change(() => removeEntry(entry), entry.name + ' was removed.')
        })
        actions.appendChild(remove)
        row.appendChild(actions)
        list.appendChild(row)
      }
    }

    add.addEventListener('submit', async (event) => {
      event.preventDefault()
      if (busy) return
      const url = paneAddress(addressInput.value)
      if (!url) return say('Enter the full address of a pane file, starting with https://', 'bad')
      if (readEntries(store, index).some(entry => entry.address === url.href)) return say('That pane is already in the list.', 'bad')
      setBusy(true)
      say('Looking at the file…')
      try {
        await looksLikeAPane(url)
      } catch (error) {
        setBusy(false)
        return say('Not added: ' + error.message + '.', 'bad')
      }
      setBusy(false)
      const name = nameInput.value.trim() || nameFromAddress(url)
      await change(() => writePane(name, url.href), name + ' was added. It is loaded the next time the data browser loads.')
      addressInput.value = ''
      nameInput.value = ''
    })

    addApp.addEventListener('submit', async (event) => {
      event.preventDefault()
      if (busy) return
      const name = appNameInput.value.trim()
      const template = appTemplateInput.value.trim()
      const kind = appTypeInput.value.trim()
      if (!name) return say('Give the app a name.', 'bad')
      if (!template.includes('{url}') || !paneAddress(template.split('{url}').join('x'))) return say('The link pattern must be a full https:// address with {url} in it.', 'bad')
      if (kind && !paneAddress(kind)) return say('The type must be a full address, such as https://schema.org/Recipe, or left empty.', 'bad')
      if (readEntries(store, index).some(entry => entry.address === template)) return say('That app is already in the list.', 'bad')
      await change(() => writeApp(name, template, kind), name + ' was added. It is offered the next time the data browser loads.')
      appNameInput.value = ''
      appTemplateInput.value = ''
      appTypeInput.value = ''
    })

    draw()
    return root
  }
}

export default pane
