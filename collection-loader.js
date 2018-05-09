const keyBy = require("lodash/keyBy");
const { DEFAULT_LIMIT } = require("./constants");

function extractCollections(items) {
  return items.filter(({type}) => type === "collection");
}

function getAssociatedTemplate({"associated-metadata": associatedMetadata}) {
  return associatedMetadata ? associatedMetadata.layout : '';
}

function findTemplateMatch(template, templatesConfig) {
  return templatesConfig.find(templateConfig => templateConfig.name === template);
}

function mapTemplateConfigAndCollection(collections, templatesConfig) {
  return collections.reduce((acc, collection) => {
    const associatedTemplate = getAssociatedTemplate(collection);
    if (associatedTemplate) {
      const matchedTemplateConfig = findTemplateMatch(associatedTemplate, templatesConfig);
      if (matchedTemplateConfig) {
        return acc.concat(Object.assign({}, matchedTemplateConfig, {"collection": collection.slug}));
      }
    }

    return acc;
  }, []);
}

function requestParams({collection:slug, "item-type":itemType = "story", "item-limit":itemLimit = DEFAULT_LIMIT}) {
  const params = {};

  params._type = "collection";
  params.slug = slug;
  params["item-type"] = itemType;
  params.limit = itemLimit;

  return params;
}

function formBulkRequestBody(collectionsConfig) {
  const bulkRequestParams = collectionsConfig.reduce(
    (acc, config) => Object.assign({}, acc, {[config.collection]: requestParams(config)}),
    {}
  );

  return {requests: bulkRequestParams};
}

function filterByTemplateTypeCollection(collectionsConfig) {
  return collectionsConfig.reduce((acc, config) => config["item-type"] === "collection"? acc.concat(config) : acc, []);
}

function extractCollectionSlugs(collectionTypeConfigs) {
  return collectionTypeConfigs.map(config => config.collection);
}

function getAllNestedItems(collections, collectionData) {
  return collections.reduce((acc, collection) =>
    collectionData[collection] ? acc.concat(collectionData[collection].items || []) : acc, []);
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
      const collectionData = collectionsBulkData[collection];
      if (collectionData && collectionData.items && collectionData.items.length) {
        return Object.assign({}, acc, { [collection]: mapItemsData(collectionData.items, nestedItemsWithData) } );
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

function loadItemsData(client, config, items, templatesConfig, depth) {
  if(depth < 1) return Promise.resolve({items});

  const collections = extractCollections(items);

  if (collections.length < 1) return Promise.resolve({items});

  const collectionsConfig = mapTemplateConfigAndCollection(collections, templatesConfig);

  if (collectionsConfig.length < 1) return Promise.resolve({items});

  const bulkRequestBody = formBulkRequestBody(collectionsConfig);
  return client.getInBulk(bulkRequestBody).then(data => {
    if (data.results) {
      const collectionsBulkData = data.results;
      const collectionTypeConfigs = filterByTemplateTypeCollection(collectionsConfig);

      if (collectionTypeConfigs.length) {
        const matchedCollections = extractCollectionSlugs(collectionTypeConfigs);
        const allNestedItems = getAllNestedItems(matchedCollections, collectionsBulkData);
        return loadItemsData(client, config, allNestedItems, templatesConfig, (depth-1))
          .then(({items:nestedItemsWithData}) => ({
            items: mergeCollectionItems(
              items,
              keyByCollectionSlug(mergeNestedCollectionItems(
                collectionsBulkData,
                matchedCollections,
                nestedItemsWithData
              ))
            )
          }));
      }

      return {items: mergeCollectionItems(items, collectionsBulkData)};
    }

    return {items};
  });
}

function loadNestedCollectionData(client, config, collection, options = {}) {
  const { templatesConfig = [], depth } = options;
  const { items = [] } = collection;
  const cacheKeys = [`q/${config["publisher-id"]}/top/${collection.slug}`];

  if (items.length < 1) return Promise.resolve({collection, cacheKeys});

  return loadItemsData(client, config, items, templatesConfig, depth)
    .then(({items:data = [], cacheKeys:itemsCacheKeys = []}) => ({
      collection: Object.assign({}, collection, {items: data}),
      cacheKeys: itemsCacheKeys
    }));
}

module.exports = {loadNestedCollectionData};