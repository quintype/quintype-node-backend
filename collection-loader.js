const get = require('lodash/get');
const flatMap = require('lodash/flatMap');

function loadCollectionItems(
  client,
  collections,
  {storyFields, storyLimits, defaultNestedLimit}
) {
  const bulkRequestBody = collections.reduce((acc, collection, index) => {
    let limit = storyLimits[get(collection, ['associated-metadata', 'layout'])];

    if (!limit && get(collection, ['childCollectionLimit'])) {
      limit = get(collection, ['childCollectionLimit']);
    }

    if (!limit && defaultNestedLimit) {
      limit = defaultNestedLimit;
    }

    return Object.assign(acc, {
      [`${collection.slug}-${index}`]: {
        _type: 'collection',
        slug: collection.slug,
        'story-fields': storyFields,
        limit: limit,
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
  {storyFields, storyLimits, defaultNestedLimit, nestedCollectionLimit}
) {
  const collections = items.filter((item) => item && item.type == 'collection');

  if (depth == 0 || collections.length == 0) return Promise.resolve();

  return loadCollectionItems(client, collections, {
    storyFields,
    storyLimits,
    defaultNestedLimit,
  }).then((collectionSlugToCollection) => {
    collections.forEach((collection, index) => {
      const slugWithIndex = `${collection.slug}-${index}`;
      collection.summary = get(collectionSlugToCollection,[slugWithIndex, 'summary'], '');
      collection.automated = get(collectionSlugToCollection, [slugWithIndex, 'automated']);
      collection['collection-cache-keys'] = get(collectionSlugToCollection, [slugWithIndex, 'collection-cache-keys'], []);
      collection.items = get(collectionSlugToCollection, [slugWithIndex, 'items'], []);

      if (nestedCollectionLimit && collection.items) {
        collection.items.forEach((item, index) => {
          if (
            item.type === 'collection' &&
            nestedCollectionLimit[
              get(collection, ['associated-metadata', 'layout'])
              ]
          ) {
            item.childCollectionLimit =
              nestedCollectionLimit[
                get(collection, ['associated-metadata', 'layout'])
                ][index];
          }
        });
      }
    });

    return updateItemsInPlace(
      client,
      depth - 1,
      flatMap(collections, (collection) => collection.items),
      {storyFields, storyLimits, defaultNestedLimit}
    );
  });
}

function loadNestedCollectionData(
  client,
  collection,
  {depth, storyFields, storyLimits, defaultNestedLimit, nestedCollectionLimit}
) {
  return updateItemsInPlace(client, depth, collection.items, {
    storyFields,
    storyLimits,
    defaultNestedLimit,
    nestedCollectionLimit,
  }).then(() => collection);
}

module.exports = {loadNestedCollectionData};
