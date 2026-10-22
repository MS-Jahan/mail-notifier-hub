import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFeed, decode } from '../../src/providers/gmail/feed.js';

const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<feed version="0.3" xmlns="http://purl.org/atom/ns#"><title>Gmail - Inbox for someone@example.com</title><tagline>New messages in your Gmail Inbox</tagline>
<fullcount>338</fullcount><link rel="alternate" href="https://mail.google.com/mail/u/0" type="text/html" /><modified>2026-10-22T12:35:25Z</modified>
<entry><title>Tom &amp; Jerry &lt;3</title><summary>Hello &#39;world&#39; &#x1F600;</summary><link rel="alternate" href="https://mail.google.com/mail?account_id=a&amp;message_id=b&amp;view=conv" type="text/html" />
<modified>2026-10-22T12:00:00Z</modified><issued>2026-10-22T11:59:00Z</issued><id>tag:gmail.google.com,2004:1234567890</id>
<author><name>Ann Lee</name><email>ann@example.com</email></author></entry>
<entry><title>Second</title><summary></summary><link rel="alternate" href="https://mail.google.com/x" type="text/html" /><modified>2026-10-22T11:00:00Z</modified><id>tag:gmail.google.com,2004:2</id><author><name></name><email>b@example.com</email></author></entry>
</feed>`;

test('parses count, account and entries', () => {
  const f = parseFeed(FEED);
  assert.equal(f.fullcount, 338);
  assert.equal(f.email, 'someone@example.com');
  assert.equal(f.entries.length, 2);
  assert.deepEqual([f.entries[0].subject, f.entries[0].summary], ['Tom & Jerry <3', "Hello 'world' 😀"]);
  assert.equal(f.entries[0].link, 'https://mail.google.com/mail?account_id=a&message_id=b&view=conv');
  assert.equal(f.entries[0].time, Date.parse('2026-10-22T12:00:00Z'));
  assert.equal(f.entries[0].fromName, 'Ann Lee');
  assert.equal(f.entries[1].fromAddress, 'b@example.com');
});
test('non-feed responses return null', () => {
  assert.equal(parseFeed('<html>Sign in</html>'), null);
  assert.equal(parseFeed(''), null);
});
test('a feed with zero unread parses without entries', () => {
  const f = parseFeed('<feed><title>Gmail - Inbox for a@b.c</title><fullcount>0</fullcount></feed>');
  assert.deepEqual([f.fullcount, f.entries.length], [0, 0]);
});
test('decode handles numeric and named entities', () => { assert.equal(decode('&lt;a&gt; &amp; &#65;'), '<a> & A'); });
