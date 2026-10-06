import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const URL = 'https://quotes.toscrape.com/scroll';
const browser = await chromium.launch();

try {
    const page = await browser.newPage();
    await page.goto(URL);

    let count = await page.locator('.quote').count();

    while (true) {
        await page.mouse.wheel(0, 10000);

        try {
            await page.waitForFunction(
                (prev) => document.querySelectorAll('.quote').length > prev,
                count,
                { timeout: 3000 },
            );
        } catch {
            break;
        }

        count = await page.locator('.quote').count();
        console.log('Загружено цитат:', count);
    }

    console.log('Всего цитат:', count);

    const quotes = await page.$$eval('.quote', (els) =>
        els.map((el) => ({
            text: el.querySelector('.text').textContent,
            author: el.querySelector('.author').textContent,
            tags: [...el.querySelectorAll('.tag')].map((t) => t.textContent),
        })),
    );

    if (quotes.length === 0) {
        console.error('Цитаты не найдены');
        process.exitCode = 1;
    } else {
        await mkdir('out', { recursive: true });
        await writeFile('out/result.json', JSON.stringify(quotes, null, 2));
        console.log('Сохранено в out/result.json');
    }


} finally {
    await browser.close();

}
