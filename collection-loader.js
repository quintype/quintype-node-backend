const keyBy = require("lodash/keyBy");
const { DEFAULT_LIMIT } = require("./constants");

function formBulkRequestBody(collections) {
  const bulkRequestParams = collections.reduce(
    (acc, collection) => Object.assign(acc, {
      [collection.slug]: {
        _type: "collection",
        slug: collection.slug,
        "story-fields": "headline,slug,url,hero-image-s3-key,hero-image-metadata,first-published-at,last-published-at,alternative,published-at,author-name,author-id,sections,story-template,metadata"}
    }), {}
  );

  return {requests: bulkRequestParams};
}

function getAllNestedItems(bulkData) {
  return Object.values(bulkData).reduce((acc, collection) =>
    collection.items ? acc.concat(collection.items) : acc,
    []);
}

function getItemData(item, itemsData) {
  return itemsData.find(itemData => itemData.slug === item.slug);
}

function mapItemsData(items, itemsData) {
  return items.map(item => {
    if (item.type === "collection") {
      const itemData = getItemData(item, itemsData);

      if (itemData) {
        return itemData;
      }
    }

    return item;
  });
}

function mergeNestedCollectionItems(collectionsBulkData, parentCollections, nestedItemsWithData) {
  const collectionSlugToCollection = parentCollections.reduce((acc, collection) => {
      const collectionData = collectionsBulkData[collection.slug];
      if (collectionData && collectionData.items) {
        return Object.assign(acc, { [collection.slug]: mapItemsData(collectionData.items, nestedItemsWithData) } )
      }
      else {
        acc;
     }
    },
    {});

  const collectionsToUpdate = Object.values(collectionsBulkData).map(collection =>
    collectionSlugToCollection[collection.slug] ? Object.assign({}, collection, {"items": collectionSlugToCollection[collection.slug]}) : collection
  );

  return keyBy(collectionsToUpdate, collection => collection.slug);
}

function mergeCollectionItems(items, collectionsBulkData) {
  return items.map(item => item.type === "collection" && collectionsBulkData[item.slug]
    ? Object.assign({}, item, {items: collectionsBulkData[item.slug].items || []})
    : item);
}

// I Have a feeling this can be simplified. It loads two levels before merging.
function loadItemsData(client, items, depth) {
  if(depth == 0)
    return Promise.resolve({items});

  const collections = items.filter(({type}) => type === "collection");

  if (collections.length == 0)
    return Promise.resolve({items});

  const bulkRequestBody = formBulkRequestBody(collections);
  return client.getInBulk(bulkRequestBody).then(data => {
    const collectionsBulkData = data.results;
    const allNestedItems = getAllNestedItems(collectionsBulkData);

    return loadItemsData(client, allNestedItems, (depth-1))
      .then(({items:nestedItemsWithData}) => ({
        items: mergeCollectionItems(
          items,
          mergeNestedCollectionItems(
            collectionsBulkData,
            collections,
            nestedItemsWithData
          )
        )
      }));
  });
}

function loadNestedCollectionData(client, collection, {depth}) {
  if (collection.items.length == 0)
    return Promise.resolve({collection});

  return loadItemsData(client, collection.items, depth)
    .then(({items}) => Object.assign({}, collection, {items}));
}

module.exports = {loadNestedCollectionData};
