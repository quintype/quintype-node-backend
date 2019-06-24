const get = require("lodash/get");
const flatMap = require("lodash/flatMap");
const {DEFAULT_STORY_FIELDS} = require("./constants");

function loadCollectionItems(client, collections, additionalStoryFields) {
  const updatedStoryFields = DEFAULT_STORY_FIELDS + (additionalStoryFields ? `,${additionalStoryFields}` : "");

  const bulkRequestBody = collections.reduce(
    (acc, collection) => Object.assign(acc, {
      [collection.slug]: {
        _type: "collection",
        slug: collection.slug,
        "story-fields": updatedStoryFields}
    }), {});

  return client.getInBulk({requests: bulkRequestBody}).then(response => response.results);
}

// Ugly. This function updates all the items in place.
// However, this is way more readable than a pure version
function updateItemsInPlace(client, depth, items, storyFields) {
  const collections = items.filter(item => item.type == "collection");

  if(depth == 0 || collections.length == 0)
    return Promise.resolve();

  return loadCollectionItems(client, collections, storyFields)
    .then(collectionSlugToCollection => {
      collections.forEach(collection => {
        collection.summary = get(collectionSlugToCollection, [collection.slug, "summary"], '')
        collection.items = get(collectionSlugToCollection, [collection.slug, "items"]) 
      });
      return updateItemsInPlace(client, depth - 1, flatMap(collections, collection => collection.items))
    })
}

function loadNestedCollectionData(client, collection, {depth, storyFields}) {
  return updateItemsInPlace(client, depth, collection.items, storyFields)
    .then(() => collection);
}

module.exports = {loadNestedCollectionData};
