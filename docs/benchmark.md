# Memory benchmark

Measured 2026-10-22 on Linux with Brave (Chromium 155), three accounts across three providers, default settings (check every 2 minutes), using `/proc/<pid>/smaps_rollup` and `ps`.

| What | RSS | PSS (real incremental memory) |
|---|---|---|
| Extension process **while awake** (during and after a check) | ~157 MB | **~24-26 MB** |
| Extension process **between checks** | gone (the worker is unloaded) | **0** |
| Heaviest ordinary tab processes in the same browser (for scale) | 359-617 MB | 189-429 MB |

- RSS counts pages shared with other processes (browser libraries) in every process that maps them, so it overstates the cost of an extra process. **PSS** divides shared pages between the processes using them and is the closer match to the *Memory footprint* column of the browser's Task Manager.
- The worker stays alive about **55 s** after a check (the browser unloads an idle service worker after ~30 s, plus the check itself), so with a 2-minute interval it is awake roughly 45% of the time: an **average of about 11 MB PSS**, from one extension for any number of accounts.
- The JavaScript heap of the awake worker was 0.5 MB; a Zoho or Proton tab had about 50 MB of JS heap alone.
- The numbers depend on browser, OS and the other extensions installed. To reproduce: wait until the worker is unloaded (it is not listed under *Service workers* in `chrome://extensions`), note the extension processes (`ps -eo pid,rss,args | grep -- --extension-process`), trigger a check (open the popup or press refresh), and compare; then read PSS from `/proc/<pid>/smaps_rollup`.

**Seeing it in the browser's Task Manager** (Shift+Esc in Chromium browsers): the extension only has a row while the worker is awake, i.e. for about a minute after a check. Open the popup (this triggers a check if the data is older than 90 s) and look for *Extension: Mail Notifier Hub* / *Service Worker: …*. Not seeing it at other times is expected: it means the worker is unloaded and costs nothing.
