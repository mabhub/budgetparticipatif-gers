
const puppeteer = require('puppeteer');
const getProject = require('./get-project.js');

module.exports = async links => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const data = [];

  for (let link of links) {
    try {
      const project = await getProject(link, page);
      data.push(project);
      process.stderr.write('.');
    } catch (e) {
      process.stderr.write(e + '\n');
    }
  }

  await browser.close();
  return data;
};
