
const puppeteer = require('puppeteer');
const getProject = require('./get-project.js');

const isFunction = input => typeof input === 'function';
const isPromise = input => input instanceof Promise;

module.exports = async (links, poolSize = 10) => {
  const browser = await puppeteer.launch();
  const allPromises = links.map(link => () => getProject(link, browser));

  while (allPromises.filter(isFunction).length) {
    const runningPromises = allPromises.filter(isPromise);
    let freeSlots = Math.min(poolSize - runningPromises.length, allPromises.length);

    allPromises.forEach((promise, i) => {
      if (isFunction(promise) && freeSlots) {
        freeSlots -= 1;
        allPromises[i] = promise().then(result => allPromises[i] = result);
      }
    });

    await Promise.race(allPromises.filter(isPromise));
    process.stderr.write('.');
  }

  await Promise.all(allPromises.filter(isPromise));
  process.stderr.write('\n');

  await browser.close();
  return allPromises;
};
