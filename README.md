# tool index pane

A dashboard for the panes and apps in your tool index, in the SolidOS data browser.
The pane is one ES module with no dependencies, loaded by link.

**Try it:** <https://solidos.org/docs/browser/?pane=https%3A%2F%2Fsolid-panes.github.io%2Ftool-index%2Ftool-index-pane.js&uri=https%3A%2F%2Fsolid-panes.github.io%2Ftool-index%2Fsamples%2Ftool-index.ttl>

The link opens the SolidOS Browser, which asks before it adds a pane from a site it has not seen, then shows a
sample index. The sample is on a static site, so it can be read but not changed; on your own pod the same
screen saves what you do.

## What a tool index is

A document in your pod that lists the panes and apps you want, in the
[PodOS tools vocabulary](https://pod-os.org/vocab/tools). Your preferences file links to it with
`tools:toolIndex`. The SolidOS Browser reads it when you log in: the panes in it are loaded, and the apps
are offered as "Open with" links. The format is described in
[SolidOS Panes, section 7.4.1](https://melvincarvalho.github.io/solidos-panes/#dynamic-tool-index).

## What the pane does

- Opens on a tool index and lists what is registered: panes, apps and PodOS HTML tools.
- **Add a pane** by the address of its file. The file is looked at first, without running it: it must be
  reachable, be served as JavaScript, and look like a pane.
- **Add an app** with a name, a link pattern containing `{url}`, and optionally the type of thing it is for.
- **Switch** an entry off or on. Off keeps the entry in the document but no longer links it from the index,
  so loaders pass it over. No extra vocabulary is used.
- **Remove** an entry, after asking once more.
- It writes only to the index document it is showing, in that document's own format (Turtle or JSON-LD).

A pane is a small program that runs as you. Add only panes from sites you trust.

## Using it on your pod

1. Put an index in your settings folder, for example `settings/toolIndex.jsonld`, typed `tools:ToolIndex`.
2. In your preferences file, link to it: `<your WebID> tools:toolIndex <settings/toolIndex.jsonld>`.
3. Open the index with this pane, logged in:
   `https://solidos.org/docs/browser/?pane=https://solid-panes.github.io/tool-index/tool-index-pane.js&uri=<your index>`

The type used for a pane module, `https://mashlib.com/ns/panes#PaneModuleInvocation`, is a placeholder: the
PodOS vocabulary does not yet have a kind for a JavaScript module.

## Licence

[MIT](LICENSE), copyright Melvin Carvalho.

## Tests

```sh
node tests/run.mjs
```

Run them before any change is published. They drive a real browser (Chromium) against a local test pod, logged in,
and check the file the pod ends up with: listing, refusing a file that is not a pane, add, off, remove, apps and
"Open with", and adding from the store, plus the layout at 400 px.

They need, once:

1. A local [JavaScript Solid Server](https://github.com/JavaScriptSolidServer/JavaScriptSolidServer) pod whose
   preferences file links to `settings/tool-index.ttl`, and which serves the data browser
   ([mashlib/dynamic](https://github.com/mashlib/dynamic)) and this folder from its public folder.
2. `tests/local.json`, copied from `tests/local.example.json` and filled in. It is not committed.
   Set `"store"` to a local copy of the store's `catalogue.jsonld` to try a store change before it is published;
   leave it empty to use the public one.

Each run puts the pod's index back to `tests/fixtures/tool-index.ttl` before and after.
