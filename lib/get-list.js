const puppeteer = require('puppeteer');

const PAGE_ADDRESS = 'https://budgetparticipatif.gers.fr/dialog/budget-participatif-2-les-projets?display_mode=map';

module.exports = async () => {
  const browser = await puppeteer.launch({
    devtools: true,
    defaultViewport: null,
    args: ['--start-maximized']
  });

  const page = await browser.newPage();
  await page.setRequestInterception(true);
  await page.bringToFront();

  /**
   * Avoid laoding some elements
   */
  page.on('request', request => {
    switch (request.resourceType()) {
      case 'script': {
        if (request.url().toLowerCase().includes('leaflet')) {
          request.respond({
            status: 200,
            contentType: 'application/javascript; charset=utf-8',
            body: `console.log('Skip loading: ${request.url()}');`
          });
          break;
        }
        request.continue();
        break;
      }

      case 'stylesheet':
        request.respond({
          status: 200,
          contentType: 'text/css; charset=utf-8',
          body: '',
        });
        break;

      default:
        request.continue();
    };
  });

  /**
   * Mock and proxify Leaflet
   */
  await page.evaluateOnNewDocument(() => {
    window.store = [];

    const L = {
      map: () => ({
        setView: () => L.map(),
        addLayer: () => ({}),
      }),

      TileLayer: class {
        addTo () {}
      },

      markerClusterGroup () {
        return new (class {
          addLayer () {}
        });
      },

      marker: class {
        constructor(coords) {
          this.coords = coords;
        }
        bindPopup (data) {
          window.store.push({ coords: this.coords, data });
          return {};
        }
      },
    };

    window.L = L;
  });

  await page.goto(PAGE_ADDRESS, { waitUntil: 'load' });

  /**
   * Replace page content with all popups
   * then generate data of projects
   */
  const store = await page.evaluate(() => {
    document.body.innerHTML = '';
    window.store.forEach(storeItem => {
      const element = document.createElement('div');
      element.setAttribute('data-coords', storeItem.coords);
      element.className = 'project';
      element.innerHTML = storeItem.data;
      document.body.appendChild(element);
    });

    const getTextContent = (from, selector) => {
      const element = from.querySelector(selector);
      if (!element) { return ''; }
      return element.textContent.split('\n').map(line => line.trim()).filter(Boolean).join(' ');
    };

    const data = Array.from(document.querySelectorAll('body > .project')).map(project => {
      const a = project.querySelector('a');

      const title = a.getAttribute('title');
      const link = a.href;

      const coords = project.getAttribute('data-coords').split(',');
      const votes = getTextContent(project, '.stats');
      const theme = getTextContent(project, '.card-img-overlay');
      const description = getTextContent(project, '.card-text');

      return { title, coords, votes, theme, link, description };
    });

    return data;
  });

  await browser.close();
  return JSON.stringify(store, null, 2);
};
