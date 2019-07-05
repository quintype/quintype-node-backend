const get = require("lodash/get");
const flatMap = require("lodash/flatMap");
const {DEFAULT_STORY_FIELDS} = require("./constants");

function loadCollectionItems(client, collections, storyFields) {
  const bulkRequestBody = collections.reduce(
    (acc, collection) => Object.assign(acc, {
      [collection.slug]: {
        _type: "collection",
        slug: collection.slug,
        "story-fields": storyFields}
    }), {});

  return client.getInBulk({requests: bulkRequestBody}).then(response => response.results);
}

// Ugly. This function updates all the items in place.
// However, this is way more readable than a pure version
function updateItemsInPlace(client, depth, items, storyFields) {
  const collections = items.filter(item => item && item.type == "collection");

  if(depth == 0 || collections.length == 0)
    return Promise.resolve();

  return loadCollectionItems(client, collections, storyFields)
    .then(collectionSlugToCollection => {
      collections.forEach(collection => {
        collection.summary = get(collectionSlugToCollection, [collection.slug, "summary"], '')
        collection.items = get(collectionSlugToCollection, [collection.slug, "items"])
      });
      return updateItemsInPlace(client, depth - 1, flatMap(collections, collection => collection.items), storyFields)
    })
}

function loadNestedCollectionData(client, collection, {depth, storyFields}) {
  return updateItemsInPlace(client, depth, collection.items, storyFields)
    .then(() => collection);
}

module.exports = {loadNestedCollectionData};
