// Exercise the same pinned Three.js release without depending on CDN availability.
import fs from 'node:fs/promises';
import path from 'node:path';
export async function localThree(page) {
  await page.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**', async route => {
    const url = new URL(route.request().url());
    const relative = url.pathname.split('/three@0.160.0/')[1];
    const body = await fs.readFile(path.join('node_modules/three',relative));
    await route.fulfill({status:200,contentType:'text/javascript',body});
  });
}
