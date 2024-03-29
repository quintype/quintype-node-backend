const { loadNestedCollectionData } = require("./collection-loader");

describe("Collection Loader", function() {
  it("should load child collection items with required fields", async () => {
    const collection = {
      slug: "dumbledore-army",
      name: "Dumbledore Army",
      "data-source": "automated",
      id: 147,
      items: [
        {
          id: 147009,
          type: "collection",
          name: "Potter More",
          slug: "potter-more"
        }
      ],
      "collection-cache-keys": ["c/1088/147"]
    };
    let client = {
      getInBulk: jest.fn().mockResolvedValue({
        results: {
          "potter-more-0": {
            "updated-at": 1619675928521,
            "collection-cache-keys": ["c/1088/147009", "e/1088/195845", "e/1088/198144"],
            slug: "potter-more",
            name: "potter more",
            "data-source": "automated",
            automated: true,
            template: "default",
            rules: {
              fields: "author-id,content-type,q,message,story-template,updated-at,id",
              "content-type": "story",
              sort: "updated-at",
              "collection-id": 147009,
              "entity-id": "195845,198144"
            },
            summary: "boy who lived",
            id: 147009,
            items: [
              {
                id: "353b4f32-5fae-4165-9b67-50e0c73902ee",
                type: "story"
              }
            ],
            "created-at": 1619029886576
          }
        }
      })
    };

    let collectionDetails = await loadNestedCollectionData(client, collection, {
      depth: 1,
      defaultNestedLimit: 1,
      storyLimits: {}
    });

    expect(collectionDetails.items.length).toBe(1);
    expect(collectionDetails.items[0].automated).toBe(true);
    expect(collectionDetails.items[0].summary).toBe("boy who lived");
    expect(collectionDetails.items[0].items.length).toBe(1);
    expect(collectionDetails["collection-cache-keys"]).toEqual(["c/1088/147"]);
    expect(collectionDetails.items[0]["collection-cache-keys"]).toEqual([
      "c/1088/147009",
      "e/1088/195845",
      "e/1088/198144"
    ]);
  });

  it("should load child collection items default values for required fields when api does not have values", async () => {
    const collection = {
      items: [
        {
          id: 147009,
          type: "collection",
          name: "Potter More",
          slug: "potter-more"
        }
      ]
    };
    let client = {
      getInBulk: jest.fn().mockResolvedValue({
        results: {
          "potter-more-0": {
            "updated-at": 1619675928521,
            slug: "potter-more",
            name: "potter more",
            "data-source": "automated",
            template: "default",
            id: 147009,
            "created-at": 1619029886576
          }
        }
      })
    };

    let collectionDetails = await loadNestedCollectionData(client, collection, {
      depth: 1,
      defaultNestedLimit: 1,
      storyLimits: {}
    });
    expect(collectionDetails.items.length).toBe(1);
    expect(collectionDetails.items[0].automated).not.toBeDefined();
    expect(collectionDetails.items[0].summary).toEqual("");
    expect(collectionDetails.items[0]["collection-cache-keys"]).toEqual([]);
    expect(collectionDetails.items[0].items.length).toBe(0);
  });

  it("should load specific child collection items with collectionOfCollectionsIndexes is passed when depth is 1", async () => {
    const collection = {
      slug: "dumbledore-army",
      name: "Dumbledore Army",
      "data-source": "automated",
      id: 147,
      items: [
        {
          id: 147009,
          type: "collection",
          name: "Potter More",
          slug: "potter-more"
        }
      ],
      "collection-cache-keys": ["c/1088/147"]
    };
    let client = {
      getInBulk: jest.fn().mockResolvedValue({
        results: {
          "potter-more-0": {
            "updated-at": 1619675928521,
            "collection-cache-keys": ["c/1088/147009", "e/1088/195845", "e/1088/198144"],
            slug: "potter-more",
            name: "potter more",
            "data-source": "automated",
            automated: true,
            template: "default",
            rules: {
              fields: "author-id,content-type,q,message,story-template,updated-at,id",
              "content-type": "story",
              sort: "updated-at",
              "collection-id": 147009,
              "entity-id": "195845,198144"
            },
            summary: "boy who lived",
            id: 147009,
            items: [
              {
                id: "353b4f32-5fae-4165-9b67-50e0c73902ee",
                type: "story"
              }
            ],
            "created-at": 1619029886576
          }
        }
      })
    };

    let collectionDetails = await loadNestedCollectionData(client, collection, {
      depth: 1,
      defaultNestedLimit: 1,
      storyLimits: {},
      collectionOfCollectionsIndexes: [0]
    });
    expect(collectionDetails.items[0].items.length).toBe(1);
  });

  it("should load child collection items w.r.t storylimit and nestedCollectionLimit when customLayouts is passed", async () => {
    const collection = {
      slug: "dumbledore-army",
      name: "Dumbledore Army",
      "data-source": "automated",
      id: 147,
      items: [
        {
          id: 147009,
          type: "collection",
          name: "Potter More",
          slug: "potter-more"
        }
      ],
      "collection-cache-keys": ["c/1088/147"]
    };
    let client = {
      getInBulk: jest.fn().mockResolvedValue({
        results: {
          "potter-more-0": {
            "updated-at": 1619675928521,
            "collection-cache-keys": ["c/1088/147009", "e/1088/195845", "e/1088/198144"],
            slug: "potter-more",
            name: "potter more",
            "data-source": "automated",
            automated: true,
            template: "default",
            summary: "boy who lived",
            id: 147009,
            items: [
              {
                id: "353b4f32-5fae-4165-9b67-50e0c765789",
                type: "story"
              }
            ],
            "created-at": 1619029886576
          }
        }
      })
    };
    let collectionData = await loadNestedCollectionData(client, collection, {
      depth: 2,
      defaultNestedLimit: 1,
      customLayouts: [{ layout: "ArrowOneColGrid", storyLimit: 1, nestedCollectionLimit: [1] }]
    });
    expect(collectionData.items.length).toBe(1);
    expect(collectionData.items[0].items.length).toBe(1);
  });
});
