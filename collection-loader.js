const get = require('lodash/get');
const flatMap = require('lodash/flatMap');
const {DEFAULT_STORY_FIELDS} = require('./constants');

function loadCollectionItems(
  client,
  collections,
  depthValue,
  depth,
  {storyFields, storyLimits}
) {
  const bulkRequestBody = collections.reduce((acc, collection, index) => {
    let itemsLimit =
      storyLimits[get(collection, ['associated-metadata', 'layout'])];

      if(get(collection, ['associated-metadata', 'layout']) === "FourCollection12Stories1Ad") {
        console.log("fooooo", collection)
      }

      if(depth === 1) {
        console.log(collection)
      }

    // if (depth === 1 && depthValue === 2) {
    //   const itemsLimitType =
    //     storyLimits[get(collection, ['associated-metadata', 'layout'])];
    //   console.log(
    //     collection.slug,
    //     typeof itemsLimitType === 'object',
    //     get(itemsLimitType, ['childCount', index], 3)
    //   );
    //   if (typeof itemsLimitType === 'object') {
    //     itemsLimit = get(itemsLimitType, ['childCount', index], 3);
    //   }
    // }

    // if (depth === 2 && depthValue === 2) {
    //   const itemsLimitType =
    //     storyLimits[get(collection, ['associated-metadata', 'layout'])];
    //   console.log(
    //     collection.slug,
    //     typeof itemsLimitType === 'object',
    //     get(itemsLimitType, ['count', index], 3)
    //   );
    //   if (typeof itemsLimitType === 'object') {
    //     itemsLimit = get(itemsLimitType, ['count', index], 3);
    //   }
    // }

    return Object.assign(acc, {
      [collection.slug]: {
        _type: 'collection',
        slug: collection.slug,
        'story-fields': storyFields,
        limit: itemsLimit,
      },
    });
  }, {});

  return client
    .getInBulk({requests: bulkRequestBody})
    .then(response => response.results);
}

// Ugly. This function updates all the items in place.
// However, this is way more readable than a pure version
function updateItemsInPlace(
  client,
  depth,
  items,
  depthValue,
  {storyFields, storyLimits}
) {
  const collections = items.filter(item => item && item.type == 'collection');

  if (depth == 0 || collections.length == 0) return Promise.resolve();

  return loadCollectionItems(client, collections, depthValue, depth, {
    storyFields,
    storyLimits,
  }).then(collectionSlugToCollection => {
    collections.forEach(collection => {
      collection.summary = get(
        collectionSlugToCollection,
        [collection.slug, 'summary'],
        ''
      );
      collection.items = get(collectionSlugToCollection, [
        collection.slug,
        'items',
      ]);
    });
    return updateItemsInPlace(
      client,
      depth - 1,
      flatMap(collections, collection => collection.items),
      depthValue,
      {storyFields, storyLimits}
    );
  });
}

function loadNestedCollectionData(
  client,
  collection,
  {depth, storyFields, storyLimits}
) {
  return updateItemsInPlace(client, depth, collection.items, depth, {
    storyFields,
    storyLimits,
  }).then(() => collection);
}

module.exports = {loadNestedCollectionData};
