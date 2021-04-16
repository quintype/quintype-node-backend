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
    .then((response) => response.results);
}

// Ugly. This function updates all the items in place.
// However, this is way more readable than a pure version
function updateItemsInPlace(
  client,
  depth,
  items,
  {storyFields, storyLimits, itemsDepth}
) {
  const collections = items.filter((item) => item && item.type == 'collection');

  if (depth == 0 || collections.length == 0) return Promise.resolve();

  console.log('fooo1111---------', depth);
  console.log('fooo2222---------', itemsDepth);
  console.log('fooo3333---------', itemsDepth === 2 && depth === 1);

  return loadCollectionItems(client, collections, {
    storyFields,
    storyLimits,
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
      {storyFields, storyLimits, itemsDepth}
    );
  });
}

function loadNestedCollectionData(
  client,
  collection,
  {depth, storyFields, storyLimits}
) {
  return updateItemsInPlace(client, depth, collection.items, {
    storyFields,
    storyLimits,
    itemsDepth: 2,
  }).then(() => collection);
}

module.exports = {loadNestedCollectionData};
