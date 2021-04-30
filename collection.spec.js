const {Collection} = require('./index');

function getClient({
  getCollectionBySlug = (slug) => {
    return Promise.resolve({
      slug: 'home',
      summary: null,
      items: [
        {
          'associated-metadata': {layout: 'ArrowFourColTwelveStories'},
          type: 'collection',
          slug: 'arrow-collection',
        },
      ],
    });
  },

  getInBulk = (request) => {
    let collectionItem = {};

    if (request.requests['arrow-collection']) {
      let items = [];
      const limit = request.requests['arrow-collection'].limit || 40;
      for (let j = 0; j < limit; j++) {
        items.push({
          'associated-metadata': {},
          type: 'collection',
          slug: `football-sports-${j}`,
        });
      }

      collectionItem = {
        'arrow-collection': {
          slug: 'arrow-collection',
          items: items,
        },
      };
    }

    if (Object.keys(request.requests).length > 1) {
      Object.keys(request.requests).map((req) => {
        let items = [];
        const limit = request.requests[req].limit || 40;
        for (let j = 0; j < limit; j++) {
          items.push({
            'associated-metadata': {},
            type: 'collection',
            slug: 'hello',
          });
        }

        Object.assign(collectionItem, {
          [req]: {
            slug: req,
            items: items,
          },
        });
      });
    }

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
    it('Returns home-collection with depth of 1 and defaultNestedLimit of 3', async function () {
      const homeCollectionData = await Collection.getCollectionBySlug(
        getClient(),
        'home',
        {},
        {depth: 1, defaultNestedLimit: 3}
      );
      expect(homeCollectionData.collection.items[0].items.length).toBe(3);
    });
    it('Returns home-collection with depth of 2 and defaultNestedLimit of 3', async function () {
      const homeCollectionData = await Collection.getCollectionBySlug(
        getClient(),
        'home',
        {},
        {depth: 2, defaultNestedLimit: 4}
      );
      expect(homeCollectionData.collection.items[0].items.length).toBe(4);
      expect(homeCollectionData.collection.items[0].items[0].items.length).toBe(
        4
      );
    });
    it('Returns home-collection with depth of 2', async function () {
      const homeCollectionData = await Collection.getCollectionBySlug(
        getClient(),
        'home',
        {},
        {depth: 2}
      );
      expect(homeCollectionData.collection.items[0].items[0].items.length).toBe(
        40
      );
    });
  });
  describe('Returns Home Collection based on nestedCollectionLimit', function () {
    it('Returns home-collection with depth of 2 ', async function () {
      const homeCollectionData = await Collection.getCollectionBySlug(
        getClient(),
        'home',
        {},
        {
          depth: 2,
          defaultNestedLimit: 4,
          nestedCollectionLimit: {ArrowFourColTwelveStories: [1, 2, 3, 5]},
        }
      );
      expect(homeCollectionData.collection.items[0].items.length).toBe(4);
      expect(homeCollectionData.collection.items[0].items[0].items.length).toBe(
        1
      );
      expect(homeCollectionData.collection.items[0].items[1].items.length).toBe(
        2
      );
      expect(homeCollectionData.collection.items[0].items[2].items.length).toBe(
        3
      );
      expect(homeCollectionData.collection.items[0].items[3].items.length).toBe(
        5
      );
    });
    it('Returns home-collection with depth of 2 and defaultlimit for the last nested collection ', async function () {
      const homeCollectionData = await Collection.getCollectionBySlug(
        getClient(),
        'home',
        {},
        {
          depth: 2,
          defaultNestedLimit: 4,
          nestedCollectionLimit: {ArrowFourColTwelveStories: [6, 7, 8]},
        }
      );
      expect(homeCollectionData.collection.items[0].items.length).toBe(4);
      expect(homeCollectionData.collection.items[0].items[0].items.length).toBe(
        6
      );
      expect(homeCollectionData.collection.items[0].items[1].items.length).toBe(
        7
      );
      expect(homeCollectionData.collection.items[0].items[2].items.length).toBe(
        8
      );
      expect(homeCollectionData.collection.items[0].items[3].items.length).toBe(
        4
      );
    });
  });
});
