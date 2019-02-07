const puppeteer = require('puppeteer');

module.exports = async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto('https://budgetparticipatif.gers.fr/dialog/budget-participatif', { waitUntil: "domcontentloaded" });

  const projects = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.idea a')).map(a => a.href);
  });

  await browser.close();

  return JSON.stringify(projects, null, 2);
};
