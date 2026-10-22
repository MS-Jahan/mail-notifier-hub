// Tolerant parser for Gmail's Atom inbox feed. No DOMParser: it must run in a service worker.
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
export const decode = (s = '') => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&(amp|lt|gt|quot|apos);/g, (_, n) => ENTITIES[n]);

const tag = (s, name) => decode(s.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`))?.[1] ?? '');
const attr = (s, name, a) => decode(s.match(new RegExp(`<${name}\\s[^>]*?${a}="([^"]*)"`))?.[1] ?? '');

export function parseFeed(xml) {
  const first = xml.indexOf('<entry>');
  const head = first < 0 ? xml : xml.slice(0, first);
  const fullcount = parseInt(tag(head, 'fullcount'), 10);
  const title = tag(head, 'title'); // "Gmail - Inbox for someone@example.com"
  if (!title || Number.isNaN(fullcount)) return null; // not a feed (login page, wrong index)
  const email = title.split(' for ').pop().trim();
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, e]) => {
    const author = e.match(/<author>([\s\S]*?)<\/author>/)?.[1] ?? '';
    return {
      id: tag(e, 'id'), subject: tag(e, 'title'), summary: tag(e, 'summary'), link: attr(e, 'link', 'href'),
      time: Date.parse(tag(e, 'modified') || tag(e, 'issued')) || 0, fromName: tag(author, 'name'), fromAddress: tag(author, 'email')
    };
  });
  return { email, fullcount, entries };
}
