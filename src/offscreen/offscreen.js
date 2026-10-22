chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'offscreen-play') new Audio(msg.url).play().catch(() => {});
});
