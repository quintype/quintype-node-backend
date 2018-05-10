const keyBy = require("lodash/keyBy");
const { DEFAULT_LIMIT } = require("./constants");

function extractCollections(items) {
  return items.filter(({type}) => type === "collection");
}

function requestParams({slug}) {
  const params = {};

  params._type = "collection";
  params.slug = slug;

  return params;
}

function formBulkRequestBody(collections) {
  const bulkRequestParams = collections.reduce(
    (acc, collection) => Object.assign({}, acc, {[collection.slug]: requestParams(collection)}),
    {}
  );

  return {requests: bulkRequestParams};
}

function getAllNestedItems(bulkData) {
  return Object.values(bulkData).reduce((acc, collection) =>
  collection.items && collection.items.length > 0 ? acc.concat(collection.items || []) : acc, []);
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

function groupItemsByCollection(parentCollections, collectionsBulkData, nestedItemsWithData) {
  return parentCollections.reduce(
    (acc, collection) => {
      const collectionData = collectionsBulkData[collection.slug];
      if (collectionData && collectionData.items && collectionData.items.length) {
        return Object.assign({}, acc, { [collection.slug]: mapItemsData(collectionData.items, nestedItemsWithData) } );
      }

      return acc;
    },{});
}

function mergeNestedCollectionItems(collectionsBulkData, parentCollections, nestedItemsWithData) {
  const collectionItemsMap = groupItemsByCollection(
    parentCollections,
    collectionsBulkData,
    nestedItemsWithData
  );

  return Object.values(collectionsBulkData).map(collection =>
    collectionItemsMap[collection.slug]? Object.assign({}, collection, {"items": collectionItemsMap[collection.slug]}) : collection
  );
}

function keyByCollectionSlug(collections) {
  return keyBy(collections, collection => collection.slug);
}

function mergeCollectionItems(items, collectionsBulkData) {
  return items.map(item => item.type === "collection" && collectionsBulkData[item.slug] ?
    Object.assign({}, item, {items: collectionsBulkData[item.slug].items || []}) : item);
}

function loadItemsData(client, items, depth) {
  if(depth < 1) return Promise.resolve({items});

  const collections = extractCollections(items);

  if (collections.length < 1) return Promise.resolve({items});

  const bulkRequestBody = formBulkRequestBody(collections);
  return client.getInBulk(bulkRequestBody).then(data => {
    if (!data.results) return {items};

    const collectionsBulkData = data.results;
    const allNestedItems = getAllNestedItems(collectionsBulkData);

    return loadItemsData(client, allNestedItems, (depth-1))
      .then(({items:nestedItemsWithData}) => ({
        items: mergeCollectionItems(
          items,
          keyByCollectionSlug(mergeNestedCollectionItems(
            collectionsBulkData,
            collections,
            nestedItemsWithData
          ))
        )
      }));
  });
}

function loadNestedCollectionData(client, collectionProxy, {depth}) {
  const { collection = {} } = collectionProxy;
  const { items = [] } = collection;

  if (items.length < 1) return Promise.resolve({collection});

  return loadItemsData(client, items, depth)
    .then(({items = []}) => Object.assign({}, collection, {items}));
}

module.exports = {loadNestedCollectionData};