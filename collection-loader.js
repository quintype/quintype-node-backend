const get = require('lodash/get');
const flatMap = require('lodash/flatMap');

function loadCollectionItems(
  client,
  collections,
  {storyFields, storyLimits, foo, defaultNestedLimit}
) {
  const bulkRequestBody = collections.reduce((acc, collection) => {
    let limit = storyLimits[get(collection, ['associated-metadata', 'layout'])];

    if (!limit && foo) {
      limit = defaultNestedLimit;
    }

    return Object.assign(acc, {
      [collection.slug]: {
        _type: 'collection',
        slug: collection.slug,
        'story-fields': storyFields,
        limit:
          storyLimits[get(collection, ['associated-metadata', 'layout'])] || 3,
      },
    });
  }, {});

  return client
    .getInBulk({requests: bulkRequestBody})
    .then((response) => response.results);
}

// Ugly. This function updates all the items in place.
// However, this is way more readable than a pure version
function updateItemsInPlace(
  client,
  depth,
  items,
  {storyFields, storyLimits, itemsDepth, defaultNestedLimit}
) {
  const collections = items.filter((item) => item && item.type == 'collection');

  if (depth == 0 || collections.length == 0) return Promise.resolve();

  const foo = itemsDepth > depth;

  return loadCollectionItems(client, collections, {
    storyFields,
    storyLimits,
    foo,
    defaultNestedLimit,
  }).then((collectionSlugToCollection) => {
    collections.forEach((collection) => {
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
      flatMap(collections, (collection) => collection.items),
      {storyFields, storyLimits, itemsDepth, defaultNestedLimit}
    );
  });
}

function loadNestedCollectionData(
  client,
  collection,
  {depth, storyFields, storyLimits, defaultNestedLimit}
) {
  return updateItemsInPlace(client, depth, collection.items, {
    storyFields,
    storyLimits,
    itemsDepth: depth,
    defaultNestedLimit,
  }).then(() => collection);
}

module.exports = {loadNestedCollectionData};
