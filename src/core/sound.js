// Chrome plays audio from an offscreen document; Firefox's event page can use Audio directly.
const URL_ = chrome.runtime.getURL('sounds/new-mail.wav');

export async function playNewMail() {
  const offscreen = chrome.offscreen; // Chrome only; looked up dynamically so Firefox linting does not flag it
  if (offscreen) {
    const has = (await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] })).length > 0;
    if (!has) {
      await offscreen.createDocument({
        url: 'offscreen/offscreen.html', reasons: ['AUDIO_PLAYBACK'], justification: 'Play the new-mail sound'
      });
    }
    chrome.runtime.sendMessage({ type: 'offscreen-play', url: URL_ }).catch(() => {});
  } else {
    new Audio(URL_).play().catch(() => {});
  }
}
