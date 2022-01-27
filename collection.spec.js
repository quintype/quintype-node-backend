const { Collection } = require("./index");
const get = require("lodash/get");

function getClient({
  getCollectionBySlug = slug => {
    return Promise.resolve({
      slug: "home",
      summary: null,
      items: [
        {
          "associated-metadata": { layout: "ArrowFourColTwelveStories" },
          type: "collection",
          slug: "arrow-collection"
        }
      ]
    });
  },

  getInBulk = request => {
    let collectionItem = {};
    const requestKeys = Object.keys(request.requests);

    if (requestKeys.length > 0) {
      requestKeys.map(req => {
        let items = [];
        const limit = request.requests[req].limit || 40;

        for (let i = 0; i < limit; i++) {
          items.push({
            "associated-metadata": {},
            type: "collection",
            slug: `football-sports-${i}`
          });
        }

        Object.assign(collectionItem, {
          [req]: {
            slug: req,
            items: items
          }
        });
      });
    }

    return Promise.resolve({
      results: collectionItem
    });
  }
} = {}) {
  const clientObj = {
    getCollectionBySlug,
    getInBulk
  };
  return clientObj;
}

function catch404(e, defaultValue) {
  const statusCode = get(e, ["response", "status"]);
  if (statusCode === 404) return Promise.resolve(defaultValue);
  throw e;
}

const clientThatCallsCollectionThatDoesntExist = getClient({
  getCollectionBySlug: () => {
    try {
      throw { response: { status: 404 } };
    } catch (e) {
      return catch404(e, null);
    }
  }
});
describe("Collection", function() {
  it("Returns null if collection does not exist", async function() {
    const homeCollectionData = await Collection.getCollectionBySlug(
      clientThatCallsCollectionThatDoesntExist,
      "hot-news",
      {},
      { depth: 1, defaultNestedLimit: 3 }
    );
    expect(homeCollectionData).toBe(null);
  });
  describe("Returns Home Collection based on defaultNestedLimit", function() {
    it("Returns home-collection with depth of 1 and defaultNestedLimit of 3", async function() {
      const homeCollectionData = await Collection.getCollectionBySlug(
        getClient(),
        "home",
        {},
        { depth: 1, defaultNestedLimit: 3 }
      );
      expect(homeCollectionData.collection.items[0].items.length).toBe(3);
    });
    it("Returns home-collection with depth of 2 and defaultNestedLimit of 3", async function() {
      const homeCollectionData = await Collection.getCollectionBySlug(
        getClient(),
        "home",
        {},
        { depth: 2, defaultNestedLimit: 4 }
      );
      expect(homeCollectionData.collection.items[0].items.length).toBe(4);
      expect(homeCollectionData.collection.items[0].items[0].items.length).toBe(4);
    });
    it("Returns home-collection with depth of 2", async function() {
      const homeCollectionData = await Collection.getCollectionBySlug(getClient(), "home", {}, { depth: 2 });
      expect(homeCollectionData.collection.items[0].items[0].items.length).toBe(40);
    });
  });
  describe("Returns Home Collection based on nestedCollectionLimit", function() {
    it("Returns home-collection with depth of 2 ", async function() {
      const homeCollectionData = await Collection.getCollectionBySlug(
        getClient(),
        "home",
        {},
        {
          depth: 2,
          defaultNestedLimit: 4,
          nestedCollectionLimit: { ArrowFourColTwelveStories: [1, 2, 3, 5] }
        }
      );
      expect(homeCollectionData.collection.items[0].items.length).toBe(4);
      expect(homeCollectionData.collection.items[0].items[0].items.length).toBe(1);
      expect(homeCollectionData.collection.items[0].items[1].items.length).toBe(2);
      expect(homeCollectionData.collection.items[0].items[2].items.length).toBe(3);
      expect(homeCollectionData.collection.items[0].items[3].items.length).toBe(5);
    });
    it("Returns home-collection with depth of 2 and defaultlimit for the last nested collection ", async function() {
      const homeCollectionData = await Collection.getCollectionBySlug(
        getClient(),
        "home",
        {},
        {
          depth: 2,
          defaultNestedLimit: 4,
          nestedCollectionLimit: { ArrowFourColTwelveStories: [6, 7, 8] }
        }
      );
      expect(homeCollectionData.collection.items[0].items.length).toBe(4);
      expect(homeCollectionData.collection.items[0].items[0].items.length).toBe(6);
      expect(homeCollectionData.collection.items[0].items[1].items.length).toBe(7);
      expect(homeCollectionData.collection.items[0].items[2].items.length).toBe(8);
      expect(homeCollectionData.collection.items[0].items[3].items.length).toBe(4);
    });
  });
  describe("Returns Home Collection based on customLayoutsStoryLimit", function() {
    it("Returns home-collection with custom-layout's storylimit", async function() {
      const homeCollectionData = await Collection.getCollectionBySlug(
        getClient(),
        "home",
        {},
        {
          depth: 1,
          customLayoutsStoryLimit: [{ ArrowThreeColGrid: 6 }]
        }
      );
      expect(homeCollectionData.collection.items[0].items.length).toBe(6);
    });
    it("Returns home-collection with custom-layout's nestedCollectionLimit", async function() {
      const homeCollectionData = await Collection.getCollectionBySlug(
        getClient(),
        "home",
        {},
        {
          depth: 1,
          collectionOfCollectionsIndexes: [0],
          nestedCollectionLimit: { ArrowFourColTwelveStories: [3, 3, 3] },
          customLayoutsStoryLimit: [{ ArrowFourColTwelveStories: 4 }]
        }
      );
      expect(homeCollectionData.collection.items[0].items.length).toBe(4);
      expect(homeCollectionData.collection.items[0].items[0].items.length).toBe(3);
      expect(homeCollectionData.collection.items[0].items[1].items.length).toBe(3);
      expect(homeCollectionData.collection.items[0].items[2].items.length).toBe(3);
    });
  });
});
