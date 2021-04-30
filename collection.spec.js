const {Collection} = require('./index');

function getClient({
  getCollectionBySlug = (slug) => {
    return Promise.resolve({
      slug: 'home',
      name: 'Home',
      automated: false,
      template: 'default',
      summary: null,
      id: 109114,
      'total-count': 7,
      'collection-date': null,
      items: [
        {
          id: 146801,
          'associated-metadata': {layout: 'ArrowFourColTwelveStories'},
          type: 'collection',
          name: 'Arrow collection',
          slug: 'arrow-collection',
          template: 'default',
          metadata: {'cover-image': null},
          'collection-date': null,
        },
      ],
    });
  },

  getInBulk = (request) => {
    let items = [];
    for (let j = 0; j < request.requests['arrow-collection'].limit; j++) {
      items.push({
        id: 109047,
        'associated-metadata': {},
        type: 'collection',
        name: 'Football (Sports)',
        slug: 'football-sports',
        template: 'section',
        metadata: {section: [Array]},
        'collection-date': null,
      });
    }

    const collectionItem = {
      'arrow-collection': {
        'updated-at': 1619698289776,
        'collection-cache-keys': ['c/1363/146801'],
        slug: 'arrow-collection',
        fallback: false,
        name: 'Arrow collection',
        'data-source': 'manual',
        automated: false,
        template: 'default',
        rules: {},
        summary: null,
        id: 146801,
        'total-count': 10,
        'collection-date': null,
        items: items,
        'created-at': 1618817988238,
        metadata: {'cover-image': null},
      },
    };

    return Promise.resolve({
      results: collectionItem,
    });
  },
} = {}) {
  const clientObj = {
    getCollectionBySlug,
    getInBulk,
  };
  return clientObj;
}

describe('Collection', function () {
  describe('Returns Home Collection based on defaultNestedLimit', function () {
    it('Returns home-collection with depth of 1', async function () {
      const homeCollectionData = await Collection.getCollectionBySlug(
        getClient(),
        'home',
        {},
        {depth: 1, defaultNestedLimit: 3}
      );
      expect(homeCollectionData.collection.items[0].items.length).toBe(3);
    });
  });
});
