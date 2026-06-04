// HTML embed: <a href="..."><img src="URL" ...></a>
// BBCode: [url=...][img]URL[/img][/url] or [img]URL[/img]
// Direct URL: returned as-is
export function parseImageInput(raw: string): string {
  const input = raw.trim();

  const bbcode = input.match(/\[img\](https?:\/\/[^\[]+)\[\/img\]/i);
  if (bbcode) return bbcode[1].trim();

  const html = input.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i);
  if (html) return html[1].trim();

  return input;
}

export function isIbbPageUrl(url: string): boolean {
  try {
    const { hostname, pathname } = new URL(url);
    return hostname === 'ibb.co' && /^\/[A-Za-z0-9]+/.test(pathname);
  } catch {
    return false;
  }
}
