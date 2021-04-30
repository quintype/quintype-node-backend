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
      items: [
        {
          id: 146801,
          'associated-metadata': {layout: 'ArrowFourColTwelveStories'},
          type: 'collection',
          name: 'Arrow collection',
          slug: 'arrow-collection',
          template: 'default',
        },
      ],
    });
  },

  getInBulk = (request) => {
    let items = [];
    let items0 = [];
    let items1 = [];
    let items2 = [];
    let items3 = [];

    if (request.requests['arrow-collection']) {
      const limit = request.requests['arrow-collection'].limit || 40;
      for (let j = 0; j < limit; j++) {
        items.push({
          id: 109047,
          'associated-metadata': {},
          type: 'collection',
          name: 'Football (Sports)',
          slug: `football-sports-${j}`,
          template: 'section',
          metadata: {section: [Array]},
          'collection-date': null,
        });
      }
    }

    if (request.requests['football-sports']) {
      const limit = request.requests['football-sports'].limit || 40;
      for (let j = 0; j < limit; j++) {
        items.push({
          id: 109047,
          'associated-metadata': {},
          type: 'collection',
          name: 'hello india',
          slug: 'hello',
          template: 'section',
          metadata: {section: [Array]},
          'collection-date': null,
        });
      }
    }

    if (request.requests['football-sports-0']) {
      const limit = request.requests['football-sports-0'].limit || 40;
      for (let j = 0; j < limit; j++) {
        items0.push({
          id: 109047,
          'associated-metadata': {},
          type: 'collection',
          name: 'hello india',
          slug: 'hello',
          template: 'section',
          metadata: {section: [Array]},
          'collection-date': null,
        });
      }
    }

    if (request.requests['football-sports-1']) {
      const limit = request.requests['football-sports-1'].limit || 40;
      for (let j = 0; j < limit; j++) {
        items1.push({
          id: 109047,
          'associated-metadata': {},
          type: 'collection',
          name: 'hello india',
          slug: 'hello',
          template: 'section',
          metadata: {section: [Array]},
          'collection-date': null,
        });
      }
    }

    if (request.requests['football-sports-2']) {
      const limit = request.requests['football-sports-2'].limit || 40;
      for (let j = 0; j < limit; j++) {
        items2.push({
          id: 109047,
          'associated-metadata': {},
          type: 'collection',
          name: 'hello india',
          slug: 'hello',
          template: 'section',
          metadata: {section: [Array]},
          'collection-date': null,
        });
      }
    }

    if (request.requests['football-sports-3']) {
      const limit = request.requests['football-sports-3'].limit || 40;
      for (let j = 0; j < limit; j++) {
        items3.push({
          id: 109047,
          'associated-metadata': {},
          type: 'collection',
          name: 'hello india',
          slug: 'hello',
          template: 'section',
          metadata: {section: [Array]},
          'collection-date': null,
        });
      }
    }

    let collectionItem = {
      'football-sports': {
        slug: 'football-sports',
        name: 'Arrow collection',
        summary: null,
        id: 146801,
        items: items,
      },
    };

    if (Object.keys(request.requests).length > 1) {
      collectionItem = {
        'football-sports-0': {
          slug: 'football-sports-0',
          name: 'Arrow collection',
          summary: null,
          id: 146801,
          items: items0,
        },
        'football-sports-1': {
          slug: 'football-sports-1',
          name: 'Arrow collection',
          summary: null,
          id: 146801,
          items: items1,
        },
        'football-sports-2': {
          slug: 'football-sports-2',
          name: 'Arrow collection',
          summary: null,
          id: 146801,
          items: items2,
        },
        'football-sports-3': {
          slug: 'football-sports-3',
          name: 'Arrow collection',
          summary: null,
          id: 146801,
          items: items3,
        },
      };
    }

    if (request.requests['arrow-collection']) {
      collectionItem = {
        'arrow-collection': {
          slug: 'arrow-collection',
          name: 'Arrow collection',
          summary: null,
          id: 146801,
          items: items,
        },
      };
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
