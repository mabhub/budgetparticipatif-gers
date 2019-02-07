module.exports = async (link, tab) => {
  await tab.goto(link, { waitUntil: "domcontentloaded" });
  return await tab.evaluate(() => {
    const contents = ['topic', 'objective', 'description', 'budget']
      .reduce((acc, elem) => {
        const element = document.querySelector(`.idea-container .${elem} .row-content`);
        const text = element ? element.textContent.trim() : '';
        return { ...acc, [elem]: text };
      }, {});

    const title = document.querySelector('.idea-container h2').textContent
    contents.title = title;

    if (window.map) {
      window.map.eachLayer(layer => {
        if (layer instanceof L.Marker) {
          contents.position = layer.getLatLng()
        }
        if (layer instanceof L.Popup) {
          contents.address = layer.getContent()
        }
      });
    }

    return contents;
  });
};
