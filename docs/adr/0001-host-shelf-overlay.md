# Session Shelves live on this Host, not on the Session

Official Session fields cannot express pin, snooze, or settle. We persist those assignments and the order inside Pinned and Active in a plugin file under `$DSH_HOME` and serve them over RPC, so every browser talking to this Host sees the same Shelves. We do not scrape Session, do not write `settings.yaml`, and do not keep the ledger in `localStorage`. Unsent Draft stays on DSH's existing per-Session composer persist — that is already browser-local in T3 as well. Snooze clears pin keys; wake always lands on Active.

**Considered**: wait for upstream Session fields (indefinite); `localStorage` (breaks the user's cross-browser requirement); Host settings namespace (loopback-only writes, and a per-Session map is not a preference).
