import { useState } from "react";
import JSZip from "jszip";

export default function DownloadHtmlButton() {
  const [loading, setLoading] = useState(false);

  const download = async () => {
    setLoading(true);
    try {
      const origin = window.location.origin;
      const zip = new JSZip();
      const folder = zip.folder('colorist-game')!;

      const rawHtml = await fetch(origin + '/').then(r => r.text());
      const doc = document.implementation.createHTMLDocument('');
      doc.documentElement.innerHTML = rawHtml;

      doc.querySelectorAll('script[src]').forEach(el => {
        const src = el.getAttribute('src') || '';
        if (src.includes('poehali.dev') || src.includes('yandex')) el.remove();
      });
      doc.querySelectorAll('script:not([src])').forEach(el => {
        if (el.textContent?.includes('ym(') || el.textContent?.includes('Metrika')) el.remove();
      });
      doc.querySelectorAll('noscript').forEach(el => el.remove());
      doc.querySelectorAll('link').forEach(el => {
        const rel = el.getAttribute('rel') || '';
        const href = el.getAttribute('href') || '';
        if (href.includes('fonts.google') || href.includes('fonts.gstatic')) { el.remove(); return; }
        if (rel === 'modulepreload' || rel === 'prefetch') { el.remove(); return; }
      });

      const fs = doc.createElement('style');
      fs.textContent = `.font-mono{font-family:ui-monospace,"Cascadia Code",Menlo,Consolas,monospace!important}`;
      doc.head.appendChild(fs);

      const assetPaths = new Set<string>();
      doc.querySelectorAll('link[href]').forEach(el => {
        const href = el.getAttribute('href') || '';
        if (!href.startsWith('http') && !href.startsWith('//')) assetPaths.add(href);
      });
      doc.querySelectorAll('script[src]').forEach(el => {
        const src = el.getAttribute('src') || '';
        if (!src.startsWith('http') && !src.startsWith('//')) assetPaths.add(src);
      });

      for (const path of assetPaths) {
        const url = origin + (path.startsWith('/') ? path : '/' + path);
        const data = await fetch(url).then(r => r.arrayBuffer());
        folder.file(path.replace(/^\//, ''), data);
      }

      folder.file('index.html', '<!DOCTYPE html>\n' + doc.documentElement.outerHTML);

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(zipBlob);
      a.download = 'colorist-game.zip';
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={download}
      disabled={loading}
      className="font-mono uppercase tracking-widest"
      style={{ fontSize: 11, color: loading ? "#333" : "#555", letterSpacing: "0.15em", background: "none", border: "none", cursor: "pointer", padding: 0 }}
      title="Скачать игру как HTML-файл"
    >
      {loading ? '...' : '↓ скачать игру'}
    </button>
  );
}
