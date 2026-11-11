import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
let server, browser, baseUrl;

before(async () => {
  server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const file = resolve(root, '.' + pathname);
      if (file !== root && !file.startsWith(root + sep)) throw new Error('Invalid path');
      const target = pathname === '/' ? resolve(root, 'index.html') : file;
      const body = await readFile(target);
      const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
      res.writeHead(200, { 'content-type': types[extname(target)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser?.close();
  await new Promise((resolveClose) => server?.close(resolveClose));
});

test('complete browser workflow: setup → candidate → job search → STAR → local agent', async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.route('https://**/*', async (route) => {
    const url = route.request().url();
    if (url.includes('boards-api.greenhouse.io/v1/boards/anthropic/jobs')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          jobs: [{
            id: 98765,
            title: 'Senior Software Engineer',
            location: { name: 'Remote, Brazil' },
            absolute_url: 'https://example.test/jobs/98765',
            content: '<p>Build cloud software with Python and distributed systems.</p>'
          }]
        })
      });
    }
    return route.abort();
  });

  try {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.getByRole('tab', { name: /Setup/ }).waitFor();
    assert.equal(await page.locator('#panel-setup').isVisible(), true);

    await page.locator('[data-step-goto="profile"]').click();
    assert.equal(await page.locator('#panel-profile').isVisible(), true);

    const cv = [
      'Alex Example',
      'Senior Software Engineer',
      'Technology professional with experience building cloud software and distributed systems.',
      'Skills: Python, cloud architecture, software engineering.',
      'Led delivery of reliable services for enterprise customers.'
    ].join('\\n');
    await page.locator('#cvText').fill(cv);
    await page.locator('#parseCv').click();
    await page.getByRole('button', { name: /Continue to candidate profile/ }).click();
    await page.locator('#candidateName').waitFor();
    assert.equal(await page.locator('#candidateName').inputValue(), 'Alex Example');
    assert.match(await page.locator('#candidateSkills').inputValue(), /Python/i);

    await page.locator('[data-step-goto="search"]').click();
    assert.equal(await page.locator('#panel-search').isVisible(), true);
    const boards = page.locator('[data-board-check]');
    const count = await boards.count();
    for (let i = 0; i < count; i++) await boards.nth(i).setChecked(i === 0);
    await page.locator('#runSearch').click();
    await page.getByRole('heading', { name: 'Senior Software Engineer' }).waitFor({ timeout: 10000 });
    assert.equal(await page.locator('#jobResults .job-card').count(), 1);
    assert.match(await page.locator('#searchStatus').textContent(), /complete|found|checked/i);

    await page.locator('[data-step-goto="star"]').click();
    assert.equal(await page.locator('#panel-star').isVisible(), true);
    await page.locator('#addStar').click();
    const story = page.locator('.story-card').first();
    await story.locator('[data-story-title]').fill('Cloud platform delivery');
    await story.locator('[data-story-field="situation"]').fill('A critical cloud service needed better reliability.');
    await story.locator('[data-story-field="task"]').fill('I was responsible for improving service reliability.');
    await story.locator('[data-story-field="action"]').fill('I redesigned service components and improved monitoring.');
    await story.locator('[data-story-field="result"]').fill('The service became more reliable; metrics require confirmation.');
    await story.locator('[data-story-verify]').click();
    await page.getByText('VERIFIED BY CANDIDATE').waitFor();

    await page.locator('[data-step-goto="agent"]').click();
    assert.equal(await page.locator('#panel-agent').isVisible(), true);
    await page.locator('[data-preview-file="candidate-profile.json"]').click();
    await page.locator('#agentFileDialog').waitFor({ state: 'visible' });
    const preview = await page.locator('#agentFilePreview').inputValue();
    assert.match(preview, /Alex Example/);
    assert.match(preview, /resume_text/);
    await page.locator('#agentFileDialog form button[value="cancel"]').click();
    await page.locator('[data-preview-file="star-stories.json"]').click();
    await page.locator('#agentFileDialog').waitFor({ state: 'visible' });
    assert.match(await page.locator('#agentFilePreview').inputValue(), /Cloud platform delivery/);
  } finally {
    await context.close();
  }
});
