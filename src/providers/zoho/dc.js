// Zoho data centers. `tld` is the suffix in mail.zoho.<tld>; `cookieDomain` scopes the IAM session cookies.
export const DATA_CENTERS = {
  com: { label: 'US (.com)', mail: 'https://mail.zoho.com', cookieDomain: 'zoho.com' },
  eu: { label: 'EU (.eu)', mail: 'https://mail.zoho.eu', cookieDomain: 'zoho.eu' },
  in: { label: 'India (.in)', mail: 'https://mail.zoho.in', cookieDomain: 'zoho.in' },
  au: { label: 'Australia (.com.au)', mail: 'https://mail.zoho.com.au', cookieDomain: 'zoho.com.au' },
  jp: { label: 'Japan (.jp)', mail: 'https://mail.zoho.jp', cookieDomain: 'zoho.jp' },
  uk: { label: 'UK (.uk)', mail: 'https://mail.zoho.uk', cookieDomain: 'zoho.uk' },
  ca: { label: 'Canada (zohocloud.ca)', mail: 'https://mail.zohocloud.ca', cookieDomain: 'zohocloud.ca' },
  sa: { label: 'Saudi Arabia (.sa)', mail: 'https://mail.zoho.sa', cookieDomain: 'zoho.sa' },
  ae: { label: 'UAE (.ae)', mail: 'https://mail.zoho.ae', cookieDomain: 'zoho.ae' },
  cn: { label: 'China (.com.cn)', mail: 'https://mail.zoho.com.cn', cookieDomain: 'zoho.com.cn' }
};
