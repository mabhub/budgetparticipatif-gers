
const Progress = require('progress');
const puppeteer = require('puppeteer');
const getProject = require('./get-project.js');

const isFunction = input => typeof input === 'function';
const isPromise = input => input instanceof Promise;

module.exports = async (links = [], poolSize = 10) => {
  const bar = new Progress('[:bar] :percent (:current/:total) ETA::etas', {
    total: links.length,
    width: 80,
  });

  const browser = await puppeteer.launch();
  const allPromises = links.map(link => () => getProject(link, browser));

  while (allPromises.filter(isFunction).length) {
    const runningPromises = allPromises.filter(isPromise);
    let freeSlots = Math.min(poolSize - runningPromises.length, allPromises.length);

    allPromises.forEach((promise, i) => {
      if (isFunction(promise) && freeSlots) {
        freeSlots -= 1;
        allPromises[i] = promise().then(result => {
          allPromises[i] = result;
          bar.tick();
        });
      }
    });

    await Promise.race(allPromises.filter(isPromise));
  }

  await Promise.all(allPromises.filter(isPromise));
  await browser.close();
  return allPromises;
};
