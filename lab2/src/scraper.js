import { chromium } from 'playwright';

// Открывает страницу, прокручивает до конца и возвращает все цитаты
export async function scrape(url) {
    const browser = await chromium.launch();

    try {
        const page = await browser.newPage();
        await page.goto(url);

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

        return await page.$$eval('.quote', (els) =>
            els.map((el) => ({
                text: el.querySelector('.text').textContent,
                author: el.querySelector('.author').textContent,
                tags: [...el.querySelectorAll('.tag')].map((t) => t.textContent),
            })),
        );
    } finally {
        await browser.close();
    }
}
