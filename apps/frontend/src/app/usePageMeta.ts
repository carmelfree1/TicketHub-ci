import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { legal } from '@/legal/legal-config';
import { documentTitle, routeMeta } from './route-meta';

function setMeta(selector: string, attribute: string, value: string | null): void {
  let element = document.head.querySelector<HTMLMetaElement | HTMLLinkElement>(selector);
  if (value === null) {
    element?.remove();
    return;
  }
  if (!element) {
    element = document.createElement(selector.startsWith('link') ? 'link' : 'meta');
    const [, name, content] = /\[(\w+)="([^"]+)"\]/.exec(selector) ?? [];
    if (name && content) element.setAttribute(name, content);
    document.head.append(element);
  }
  element.setAttribute(attribute, value);
}

/**
 * Keeps the browser title, description, canonical address and robots directive in step with the route, and moves focus
 * to the main content after each navigation so keyboard and screen reader users start at the top of the new page.
 */
export function usePageMeta(): void {
  const { pathname } = useLocation();

  useEffect(() => {
    const meta = routeMeta(pathname);
    const title = documentTitle(meta);
    document.title = title;
    setMeta('meta[name="description"]', 'content', meta.description);
    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[property="og:description"]', 'content', meta.description);
    setMeta('meta[name="robots"]', 'content', meta.indexable ? 'index,follow' : 'noindex,nofollow');
    const url = legal.siteUrl && meta.indexable ? `${legal.siteUrl}${pathname === '/' ? '/' : pathname}` : null;
    setMeta('link[rel="canonical"]', 'href', url);
    setMeta('meta[property="og:url"]', 'content', url);
  }, [pathname]);

  useEffect(() => {
    const main = document.getElementById('contenu');
    main?.focus({ preventScroll: true });
  }, [pathname]);
}
