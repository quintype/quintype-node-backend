const get = require('lodash/get');
const flatMap = require('lodash/flatMap');
const {DEFAULT_STORY_FIELDS} = require('./constants');

function loadCollectionItems(client, collections, {storyFields, storyLimits}) {
  const bulkRequestBody = collections.reduce(
    (acc, collection) =>
      Object.assign(acc, {
        [collection.slug]: {
          _type: 'collection',
          slug: collection.slug,
          'story-fields': storyFields,
          limit:
            storyLimits[get(collection, ['associated-metadata', 'layout'])],
        },
      }),
    {}
  );

  return client
    .getInBulk({requests: bulkRequestBody})
    .then(response => response.results);
}

// Ugly. This function updates all the items in place.
// However, this is way more readable than a pure version
function updateItemsInPlace(client, depth, items, {storyFields, storyLimits}) {
  const collections = items.filter(item => item && item.type == 'collection');

  if (depth == 0 || collections.length == 0) return Promise.resolve();

  return loadCollectionItems(client, collections, {
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
      {storyFields, storyLimits}
    );
  });
}

function loadNestedCollectionData(
  client,
  collection,
  {depth, storyFields, storyLimits, nestedCollectionStoryLimits}
) {
  return updateItemsInPlace(client, depth, collection.items, {
    storyFields,
    storyLimits,
  }).then(() => {
    const nestedCollectionStoryLimitKeys = Object.keys(
      nestedCollectionStoryLimits
    );
    collection.items.map(item => {
      if (
        nestedCollectionStoryLimitKeys.includes(
          get(item, ['associated-metadata', 'layout'])
        )
      ) {
        item.items.map(
          nestedItem =>
            (nestedItem.items = nestedItem.items.splice(
              0,
              nestedCollectionStoryLimits[
                get(item, ['associated-metadata', 'layout'])
              ]
            ))
        );
      } else {
        item.items.map(nestedItem => {
          if (nestedItem.type === 'collection') {
            nestedItem.items = nestedItem.items.splice(0, 15);
          }
        });
      }
    });
    return collection;
  });
}

module.exports = {loadNestedCollectionData};
