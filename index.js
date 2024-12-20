"use strict";

const rp = require("request-promise");
const axios = require("axios");
const Promise = require("bluebird");
const _ = require("lodash");
const { loadNestedCollectionData } = require("./collection-loader");
const { MenuGroups } = require("./menu-groups");
const { DEFAULT_DEPTH, DEFAULT_STORY_FIELDS } = require("./constants");
const { BaseAPI } = require("./base-api");
const { asyncGate } = require("./async-gate");
const hash = require("object-hash");
const { createCache, memoryStore } = require("cache-manager");

const { DEFAULT_REQUEST_TIMEOUT, ENABLE_AXIOS } = require("./constants");
const { CACHE_TIME, MAX_CACHE, ENABLE_TTL_CACHE, BULK_REQ_TTL_CACHE } = require("./cache-constant");

const memoryStoreInit = memoryStore();
const memoryCache = createCache(memoryStoreInit, {
  max: MAX_CACHE,
  ttl: CACHE_TIME /* milliseconds */
});

function mapValues(f, object) {
  return Object.entries(object).reduce((acc, [key, value]) => {
    acc[key] = f(value, key);
    return acc;
  }, {});
}

/**
 * This corresponds to a story in Quintype. Most forms of content are modelled under this class.
 * Depending on which API the data is recieved from, the exact fields which are present on the story
 * object may change. Please see the [API reference](https://developers.quintype.com/swagger#/story/get_api_v1_stories_by_slug)
 * for the full list of fields available.
 *
 * See {@link Story.getStoryBySlug} for a simple example.
 *
 * ```javascript
 * import { Story } from "@quintype/framework/server/api-client";
 * ```
 *
 * @hideconstructor
 */
class Story extends BaseAPI {
  constructor(story) {
    super();
    this.story = story;
  }

  /** Use this to convert to a simple javascript object, suitable for JSON. */
  asJson() {
    return this.story;
  }

  /**
   * This function can be used to fetch stories from the old sorters API.
   *
   * Example
   * ```javascript
   * const stories = await Story.getStories(client, 'top', {'section-id': 42});
   * console.log(stories[0].headline)
   * console.log(JSON.stringify(stories.map(s => s.asJson())))
   * ```
   * @param {Client} client
   * @param {string} storyGroup
   * @param {Object} params
   * @deprecated Please use {@link Collection} and related functions instead
   * @returns {(Array<Story>)}
   * @see {@link https://developers.quintype.com/swagger/#/story/get_api_v1_stories GET /api/v1/stories} API Documentation for a list of parameters accepted and fields returned
   */
  static getStories(client, storyGroup, params) {
    return client
      .getStories(_.extend({ "story-group": storyGroup }, params))
      .then(response => _.map(response["stories"], story => this.build(story)));
  }

  /**
   * This method can be used to fetch stories related to a given story
   *
   * Example
   * ```javascript
   * const story = await Story.getStoryBySlug(client, "some-slug");
   * const relatedStories = await story.getRelatedStories(client);
   * ```
   * @param {Client} client
   * @returns {(Array<Story>)}
   * @see {@link https://developers.quintype.com/swagger/#/story/get_api_v1_stories__story_id__related_stories GET /api/v1/stories/:story-id/related-stories} API Documentation for a list of fields returned
   */
  getRelatedStories(client, params = {}) {
    const sectionId = _.get(this, ["sections", 0, "id"], null);
    return client
      .getRelatedStories(this.id, sectionId, params)
      .then(response => _.map(response["related-stories"], story => this.constructor.build(story)));
  }

  /**
   * This method can be used to get various metadata for the given story. Apart from story related attributes,
   * this API will also return all collections this story is a part of, along with collection metadata.
   *
   * @param {Client} client
   * @returns {Object} Please see [API documentation](https://developers.quintype.com/swagger/#/story/get_api_v1_stories__story_id__attributes) for more details
   * @see {@link https://developers.quintype.com/swagger/#/story/get_api_v1_stories__story_id__attributes GET /api/v1/stories/:story-id/attributes} API Documentation for a list of fields returned
   */
  getStoryAttributes(client) {
    return client.getStoryAttributes(this.id);
  }

  /**
   * This function can be used to fetch a story given a slug. This is typically done on story pages.
   *
   * This returned promise will resolve to null if the story is not found
   *
   * Example
   * ```javascript
   * const story = await Story.getStoryBySlug(client, slug);
   * if(!story) {
   *   render404();
   * } else {
   *   renderTheStoryPage(story);
   * }
   * ```
   * @param {Client} client
   * @param {string} slug The slug of the story.
   * @param {Object} params Parameters that are passed directly as query paremeters to the API
   * @returns {(Promise<Story|null>)}
   * @see {@link https://developers.quintype.com/swagger/#/story/get_api_v1_stories_by_slug GET /api/v1/stories-by-slug} API documentation for a list of parameters and fields
   */
  static getStoryBySlug(client, slug, params) {
    if (!slug) {
      return Promise.resolve(null);
    }

    return client.getStoryBySlug(slug, params).then(response => this.build(response["story"]));
  }

  /**
   * This function can be used to fetch a story given an external id. This is typically done on story pages.
   *
   * This returned promise will resolve to null if the story is not found
   *
   * Example
   * ```javascript
   * const story = await Story.getStoryByExternalId(client, externalId);
   * if(!story) {
   *   render404();
   * } else {
   *   renderTheStoryPage(story);
   * }
   * ```
   * @param {Client} client
   * @param {string} externalId The external id of the story.
   * @returns {(Promise<Story|null>)}
   */

  static getStoryByExternalId(client, externalId) {
    if (!externalId) {
      return Promise.resolve(null);
    }

    return client.getStoryByExternalId(externalId).then(response => this.build(response["story"]));
  }

  /**
   * This function can be used to fetch a draft story, given the `secretKey` generated by the editor.
   * This function works very similar to {@link Story.getStoryBySlug}, except the fact that it accepts a secretKey.
   * This is the only API which will give you the latest draft / un published version of a story.
   *
   * See the [public preview tutorial]() (FIXME: Broken Link) for an a tutorial on implementation
   * @param {Client} client
   * @param {string} publicPreviewKey
   * @returns {(Promise<Story|null>)}
   * @see {@link https://developers.quintype.com/swagger/#/story/get_api_v1_preview_story__public_preview_key_ GET /api/v1/preview/story/:public-preview-key} API documentation for a list of parameters and fields
   */
  static getPublicPreviewStory(client, publicPreviewKey) {
    return client.getPublicPreviewStory(publicPreviewKey).then(response => this.build(response["story"]));
  }

  /**
   * This function can be used to fetch a story, given the id.
   *
   * This function works very similar to {@link Story.getStoryBySlug}, except the fact that it accepts a id
   * @param {Client} client
   * @param {string} id
   * @returns {(Promise<Story|null>)}
   * @see {@link https://developers.quintype.com/swagger/#/story/get_api_v1_stories__story_id_ GET /api/v1/preview/stories/:story-id} API documentation for a list of parameters and fields
   */
  static getStoryById(client, id) {
    return client.getStoryById(id).then(response => this.build(response["story"]));
  }

  /**
   * This function can be used to search for stories by the given string. The returned object has a `stories` property which is an array of Stories,
   * but also contains other fields like `from`, and `total`.
   *
   * Example
   * ```javascript
   * const {stories, total} = Story.getSearch(client, {q: "Some String"});
   * console.log(`Total Number of Results: ${total}`);
   * JSON.stringify(stories.map(story => story.asJson()));
   * ```
   *
   * @param {Client} client
   * @param {Object} params Please see the [Search API documentation](https://developers.quintype.com/swagger/#/story/get_api_v1_search) for more details.
   * @param {string} params.q The search string
   * @returns {({stories: Array<Story>})} Please see [Search API documentation](https://developers.quintype.com/swagger/#/story/get_api_v1_search) for more details.
   * @see {@link https://developers.quintype.com/swagger/#/story/get_api_v1_search GET /api/v1/search} API documentation for a list of parameters and fields
   */
  static getSearch(client, params) {
    return client.getSearch(params).then(response =>
      _.merge(response["results"], {
        stories: _.map(response["results"]["stories"], story => this.build(story))
      })
    );
  }

  /**
   * This low level function can be used to make multiple API calls simultaneously to the backend. This is typically not meant to be
   * used by developers directly, please consider using {@link Collection} and related functions instead
   *
   * @param {Client} client
   * @param {Object} requests
   * @see {@link https://developers.quintype.com/swagger/#/story/post_api_v1_c_request POST /api/v1/bulk-request} API documentation for a list of parameters and fields
   */
  static getInBulk(client, requests, opts = {}) {
    function wrapResult(result) {
      if (!result.stories) return result;
      return Object.assign({}, result, {
        stories: result.stories.map(this.build)
      });
    }

    return client
      .getInBulk(
        {
          requests: mapValues(r => Object.assign({ _type: "stories" }, r), requests)
        },
        opts
      )
      .then(response => BulkResults.build(mapValues(result => wrapResult(result), response["results"])));
  }
}
Story.upstream = "story";

class BulkResults extends BaseAPI {
  constructor(results) {
    super();
    this.results = results;
  }

  /** Use this to convert to a simple javascript object, suitable for JSON. */
  asJson() {
    return mapValues(response => {
      if (response.stories) {
        return Object.assign({}, response, {
          stories: response.stories.map(story => story.asJson())
        });
      } else {
        return response;
      }
    }, this.results);
  }
}
BulkResults.upstream = "results";

/**
 * This corresponds to a collection in Quintype. Most groups of content are modelled with this class.
 *
 * See {@link Collection.getCollectionBySlug} for a simple example.
 *
 * ```javascript
 * import { Collection } from "@quintype/framework/server/api-client";
 * ```
 *
 * @hideconstructor
 */
class Collection extends BaseAPI {
  constructor(collection) {
    super();
    this.collection = collection;
  }

  /** Use this to convert to a simple javascript object, suitable for JSON. */
  asJson() {
    return this.collection;
  }

  /**
   * This method returns a collection, given a slug. This is typically used for home and section pages.
   *
   * If the result collection contains other collections, then it will recursively fetch those collections as well, upto a maximum depth of `depth`.
   * Items that are collections will have `item.story` set to a story map, and items that are collections will have the fields of that collection directly set on the item.
   *
   * Instead of handling all edge cases yourself, this object can be used with the [Collection Component](https://developers.quintype.com/quintype-node-components/Collection.html)
   *
   * Example
   * ```javascript
   * const collection = await Collection.getCollectionBySlug(client, slug, {}, {depth: 3, defaultNestedLimit: 4, nestedCollectionLimit: {ThreeColGrid: [2, 3, 4, 2, 5], FullScreenSlider: [1, 2, 3, 4, 5]}});
   * if(!collection) {
   *   render404();
   * } else {
   *   recursivelyDebugCollection(collection);
   *   // <Collection ... collection={collection.asJsoo()} />
   *   showOnTheUI(JSON.stringify(collection.asJson()))
   * }
   *
   * function recursivelyDebugCollection(collection) {
   *   const items = collection.items || [];
   *   items.forEach(item => {
   *     if(item.type === 'story') {
   *       console.log(item.story.headline)
   *     } else if(item.type === 'collection') {
   *       console.log(item["associated-metadata"]["layout"]);
   *       recursivelyDebugCollection(item);
   *     }
   *   })
   * }
   * ```
   *
   * @param {Client} client
   * @param {string} slug The slug of the collection
   * @param {Object} params Parameters which are directly passed to the API
   * @param {string} params.story-fields The fields for stories. See {@link DEFAULT_STORY_FIELDS} for the default
   * @param {string} params.item-type Restrict the items returned to either "collection" or "story"
   * @param {Object} options
   * @param {number} options.depth The recursion depth to fetch collections. (default: 1)
   * @param {Object} options.storyLimits The limit of stories to fetch by collection template. This defaults to unlimited for templates that are not specified. (ex: {"FourColGrid": 12}) (default: {}).
   * @param {number} options.defaultNestedLimit The default limit of stories to fetch by each collection. (default: 40)
   * @param {Object} options.nestedCollectionLimit The number of stories or collection to fetch from each nested collection. (Ex: nestedCollectionLimit: {ThreeColGrid: [2, 3, 4]}).
  eg:
    - Home `(Level 1)`
      - Sports Row `(Level 2)` `(template- ThreeColGrid)`
        - Cricket `(Level 3)`
        - Football `(Level 3)`
        - Tennis `(Level 3)`
  In the above example with nestedCollectionLimit: {ThreeColGrid: [2, 3, 4]}, Cricket collection will fetch 2 items, Football will fetch 5 items and Tennis will fetch 4 items. (default: defaultNestedLimit || 40)
  * @param {Object} options.collectionOfCollectionsIndexes It accepts array of indexes(collection's position) to fetch collection of collection of items when the depth is 1. (Ex: collectionOfCollectionsIndexes: [0, 4]).
  eg:
    - Home `(Level 1)`
      - Sports Row `(Level 2)`
        - Cricket `(Level 3)`
        - Football `(Level 3)`
      - Entertainment Row `(Level 2)`
        - Movie `(Level 3)`
        - Song `(Level 3)`
    In the above example if we need to fetch the stories from `Sports Row` child collection we need to pass collectionOfCollectionsIndexes : [0], where 0 is the position of collection Sports Row and stories from Cricket and Football will be fetched
  * @param {Object} options.customLayouts It accepts an array of objects to fetch the custom storyLimit and custom nestedCollectionLimit of custom layouts. (Ex: customLayouts: [{layout: "ArrowThreeColGrid", storyLimit: 9}, {layout: "ArrowTwoColTenStories", storyLimit: 2, nestedCollectionLimit: [5,5]}]).
  * @return {(Promise<Collection|null>)}
  * @see {@link https://developers.quintype.com/swagger/#/collection/get_api_v1_collections__slug_ GET /api/v1/collections/:slug} API documentation for a list of parameters and fields
  */
  static getCollectionBySlug(client, slug, params, options = {}) {
    const {
      depth = DEFAULT_DEPTH,
      storyLimits = {},
      defaultNestedLimit = null,
      nestedCollectionLimit = {},
      collectionOfCollectionsIndexes = [],
      customLayouts = []
    } = options;
    const storyFields = _.get(params, ["story-fields"], DEFAULT_STORY_FIELDS);
    if (!slug) {
      return Promise.resolve(null);
    }
    const opts =
      options?.previewId && options?.qtInternalAppsKey
        ? { previewId: options?.previewId, qtInternalAppsKey: options?.qtInternalAppsKey }
        : {};
    return client
      .getCollectionBySlug(slug, params, opts)
      .then(response => {
        const collection = response ? response["collection"] || response : null;
        return (
          collection &&
          loadNestedCollectionData(client, collection, {
            depth,
            storyFields,
            storyLimits,
            defaultNestedLimit,
            nestedCollectionLimit,
            collectionOfCollectionsIndexes,
            customLayouts,
            previewId: options?.previewId || "",
            qtInternalAppsKey: options?.qtInternalAppsKey || ""
          })
        );
      })
      .then(collection => this.build(collection));
  }
}
Collection.upstream = "collection";

/**
 * This represents a logged in user. You probably do not need to use this class, it's better if
 * member related authentication is handled directly via authenticated API calls from the browser
 *
 * Please see the tutorial on [Building Performant Apps]() [FIXME: Broken Link] for details
 *
 * @hideconstructor
 */
class Member extends BaseAPI {
  constructor(member) {
    super();
    this.member = member;
  }

  /** Use this to convert to a simple javascript object, suitable for JSON. */
  asJson() {
    return this.member;
  }

  /**
   * This API will get the current member, given an auth token. You probably do not need to use this class,
   * it's better if member related authentication is handled directly via authenticated API calls from the browser
   * Please see the tutorial on [Building Performant Apps]() [FIXME: Broken Link] for details
   *
   * @param {Client} client
   * @param {string} authToken
   * @returns {(Promise<Member|null>)}
   * @see {@link https://developers.quintype.com/swagger/#/member/get_api_v1_members_me GET /api/v1/members/me} API documentation for a list of parameters and fields
   */
  static getCurrentMember(client, authToken) {
    if (!authToken || authToken === "") return new Promise((resolve, reject) => resolve(null));
    return client
      .getCurrentMember(authToken)
      .then(response => response && this.build(response["member"]))
      .catch(() => null);
  }
}
Member.upstream = "member";

/**
 * An author represents a contributor to a story.
 *
 * Note: This class is typically needed only for an Author's page. For most usecases, the `authors` field on {@link Story} should be sufficient.
 *
 * ```javascript
 * import { Author } from "@quintype/framework/server/api-client";
 *
 * function loadDataForAuthorPage(client, authorId) {
 *   const [author, collection] = await Promise.all([
 *     Author.getAuthor(client, authorId),
 *     Author.getAuthorCollection(client, authorId)
 *   ])
 *   if(!author) {
 *     render404();
 *   } else {
 *     renderAuthorPage(author.asJson(), collection);
 *   }
 * }
 * ```
 * @hideconstructor
 */
class Author extends BaseAPI {
  constructor(author) {
    super();
    this.author = author;
  }

  /** Use this to convert to a simple javascript object, suitable for JSON. */
  asJson() {
    return this.author;
  }

  /**
   * This method fetches an author by Id. See the example on {@link Author} for usage.
   *
   * @param {Client} client
   * @param {number} authorId
   * @returns {(Promise<Author|null>)}
   * @see {@link https://developers.quintype.com/swagger/#/author/get_api_v1_authors__author_id_ GET /api/v1/authors/:author-id} API documentation for a list of parameters and fields
   */
  static getAuthor(client, authorId) {
    return client.getAuthor(authorId).then(response => response && this.build(response["author"]));
  }

  /**
   * This method can be used to fetch all authors across the site. Use of this API is highly discouraged
   * as you will need to make multiple calls to fetch all authors, as authors grow.
   *
   * @param {Client} client
   * @param {Object} params
   * @param {number} params.limit Number of authors to be returned (default 20)
   * @param {number} params.offset Number of authors to skip
   * @deprecated This API is very slow if there are more than ~100 authors.
   */
  static getAuthors(client, params) {
    return client.getAuthors(params).then(authors => _.map(authors, author => this.build(author)));
  }

  /**
   * This method fetches the collection. See the example on {@link Author} for usage.
   *
   * Please note, this function does *not* return a {@link Collection} object, but a plain javascript object.
   *
   * @param {Client} client
   * @param {number} authorId
   * @returns {Object} Please see [API documentation](https://developers.quintype.com/swagger) for more details
   * @deprecated This will be deprecated in favor of a method which returns a {@link Collection}.
   */
  static getAuthorCollection(client, authorId, params) {
    return client.getAuthorCollection(authorId, params).catch(e => catch404(e, null));
  }
}
Author.upstream = "author";

/**
 * CustomPath is used for managing redirects and static pages via the editor. It corresponds to the
 * /api/v1/custom-urls/:path.
 *
 * Example
 * ```javascript
 * import { CustomPath } from "@quintype/framework/server/api-client";
 *
 * async function loadCustomPath(client, path) {
 *   const page = await CustomPath.getCustomPathData(client, path);
 *   if(!page) {
 *     return404();
 *   } else if (page.type == 'redirect') {
 *     redirectTo(page["destination-path"]);
 *   } else if (page.type == 'static-page') {
 *     renderPage(page);
 *   }
 * }
 * ```
 * @hideconstructor
 */
class CustomPath extends BaseAPI {
  constructor(page) {
    super();
    this.page = page;
  }

  /** Use this to convert to a simple javascript object, suitable for JSON. */
  asJson() {
    return this.page;
  }

  /**
   * This function is used to get the page from the API. See {@link CustomPath}'s example for a usage example
   * @param {Client} client Client
   * @param {string} path The path which may be a redirect or static page
   * @see {@link https://developers.quintype.com/swagger/#/custom-url/get_api_v1_custom_urls__path_ GET /api/v1/custom-urls/:path} API documentation for a list of parameters and fields
   */
  static getCustomPathData(client, path) {
    return client
      .getCustomPathData(path.startsWith("/") ? path : "/" + path)
      .then(response => response["page"] && this.build(response["page"]));
  }
}
CustomPath.upstream = "page";

/**
 * Represents the configuration of the publisher. This represents the API call of /api/v1/config.
 *
 * In the malibu framework, this is loaded at page load, then updated periodically. An instance
 * of the Config object will be injected into most malibu functions, and you should never need
 * to create it manually.
 *
 * See the [API Documentation](https://developers.quintype.com/swagger/#/config/get_api_v1_config) for a list of fields
 *
 * @hideconstructor
 */
class Config extends BaseAPI {
  constructor(config) {
    super();
    this.config = config;
    this._memoized_data = {};
    this._memoize_gate = asyncGate();
  }

  /** Use this to convert to a simple javascript object, suitable for JSON. */
  asJson() {
    return this.config;
  }

  /** @deprecated */
  getStack(heading) {
    return this.config.layout.stacks.find(stack => stack.heading === heading);
  }

  /**
   * This method can be used to get the configuration for a domain.
   * @param {string} domainSlug
   * @returns {object} Configuration for the domain
   */
  getDomainConfig(domainSlug) {
    return (this.domains || []).find(domain => domain.slug === domainSlug) || {};
  }

  /**
   * This method can be used to get the home collection's slug for a given domainSlug
   * @param {string} domainSlug
   * @returns {string} The slug of the home collection for a domain
   */
  getHomeCollectionSlug(domainSlug) {
    return this.getDomainConfig(domainSlug)["home-collection-id"] || "home";
  }

  /**
   * This method can be used to get the list of sections for a given domain
   * @param {string} domainSlug
   * @returns {array} A list of sections that are part of the domain
   */
  getDomainSections(domainSlug) {
    if (domainSlug === undefined) {
      return this.sections;
    }
    return (
      (this.sections || []).filter(
        section => section["domain-slug"] === undefined || section["domain-slug"] === domainSlug
      ) || {}
    );
  }

  /**
   * This can be used to memoize a synchronous function. The value of f() is stored against the given key
   * until the config object is removed from memory. By default in malibu, the config object is replaced
   * every two minutes. Typically, this is used to memoize the routes for fast subsequest requests.
   *
   * This function shares a keyspace with {@link memoizeAsync}
   *
   * Example:
   * ```javascript
   * const routes = config.memoize("routes_all", () => [homePage, ...storyPages, ...sectionPages])
   * ```
   *
   * @param {string} key The key to store the results against
   * @param {function} f A function that is executed to get the results
   * @returns The value of f() if it's called the first time, else the value against the key
   *
   */
  memoize(key, f) {
    this._memoized_data[key] = this._memoized_data[key] || { value: f() };
    return this._memoized_data[key].value;
  }

  /**
   * This can be used to memoize an asynchronous function. The value of await f() is stored against the given key
   * until the config object is removed from memory. By default in malibu, the config object is replaced
   * every two minutes. This can be used to memoize objects such as collections returned by this library
   *
   * This function can be used concurrently. The first call will cause other requests to block. If the promise resolves,
   * then all calls (and future calls) will recieve that value. If the promise fails, then all waiting promises reject,
   * but the next call will start afresh.
   *
   * This function shares a keyspace with {@link memoize}
   *
   * Example:
   * ```javascript
   * const collection = await config.memoizeAsync("collection-on-every-page", async () => await Collection.getCollectionBySlug("collection-on-every-page"))
   * ```
   *
   * @param {string} key The key to store the results against
   * @param {function} f An async function that is executed to get the results
   * @returns The value of f() if it's called the first time, else the value against the key
   *
   */
  async memoizeAsync(key, f) {
    if (this._memoized_data[key]) {
      // Technically resolve is redundant here, but i'm including it to be clear
      return Promise.resolve(this._memoized_data[key].value);
    }

    const result = await this._memoize_gate(key, f);
    return this.memoize(key, () => result);
  }
}

Config.upstream = "config";

/**
 * Entities are the prefered way to store structured information about a topic. Entities are a
 * very powerful concept in the Quintype eco-system, and can be used to model many real world
 * concepts such as Magazines, People, Organisations, or Cities.
 *
 * Stories and Collections can be associated with Entities, and Entities can also be associated
 * with each other.
 *
 * Most entities have a type, which represents the schema of that entity. As an example, an
 * City may have a name, population, and be associated with a mayor (person).
 *
 * ```javascript
 * import { Entity } from "@quintype/framework/server/api-client";
 * ```
 * @hideconstructor
 */
class Entity extends BaseAPI {
  constructor(entity) {
    super();
    this.entity = entity;
  }

  /** Use this to convert to a simple javascript object, suitable for JSON. */
  asJson() {
    return this.entity;
  }

  /**
   * Fetches all entities that match a criteria
   *
   * All of the following params are optional.
   *
   * Example
   * ```javascript
   * const entities = await Entity.getEntities({
   *   type: "magazine"
   * })
   * showEntities(entities.map(e => e.asJson()))
   * ```
   *
   * @param {Client} client
   * @param {Object} params Parameters which are directly passed to the API
   * @param {string} params.ids A comma seperated list of ids
   * @param {string} params.type The type of the entity (default to all)
   * @param {string} params.limit The maximum number of entities to return
   * @param {string} params.offset A pagination offset
   * @returns {(Array<Entity>)}
   */
  static getEntities(client, params) {
    return client.getEntities(params).then(response => _.map(response["entities"], entity => this.build(entity)));
  }

  /**
   * Fetches an entity given it's Id.
   *
   * @param {Client} client
   * @param {number} entityId
   * @param {Object} params Parameters which are directly passed to the API
   * @returns {(Promise<Entity|null>)}
   */
  static getEntity(client, entityId, params) {
    return client.getEntity(entityId, params).then(response => this.build(response));
  }

  /**
   * This method returns all collections associated with an entity.
   *
   * Example
   * ```javascript
   * const magazine = await Entity.getEntity(client, 42);
   * const issues = await magazine.getCollections(client, {
   *   limit: 6,
   *   "sort-by": "collection-date",
   *   "order": "desc"
   * })
   * ```
   *
   * @param {Client} client
   * @param {Object} params Params to pass to the API
   * @return {(Array<Collection>)}
   */
  getCollections(client, params) {
    return client
      .getCollectionsByEntityId(this.entity.id, params)
      .then(response => response["collections"].map(collection => Collection.build(collection)));
  }
}

Entity.upstream = "entity";

/**
 * @deprecated Please use {@link CustomPath} instead
 */
class Url extends BaseAPI {
  constructor(url) {
    super();
    this.url = url;
  }

  /** Use this to convert to a simple javascript object, suitable for JSON. */
  asJson() {
    return this.url;
  }

  static getCustomURL(client, slug) {
    return client.getCustomURL(slug).then(url => this.build(url));
  }
}
Url.upstream = "url";

function catch404(e = {}, defaultValue) {
  const statusCode = _.get(e, ["statusCode"]) || _.get(e, ["response", "status"]);
  if (statusCode === 404) return defaultValue;
  throw e;
}

/**
 * The client is a low level wrapper around API calls to the Quintype API. The client object is usually created for you
 * by the malibu framework. The majority of functions on Client are not documented as they are not meant for external use.
 * Instead, please use the higher level APIs on {@link Story}, {@link Collection} or other entity.
 *
 * If needed, a client can be created with the {@link buildClient} method.
 * @hideconstructor
 */
class Client {
  constructor(baseUrl, temporaryClient) {
    this.baseUrl = baseUrl;
    this.config = null;
    if (!temporaryClient && !ENABLE_TTL_CACHE) {
      this.interval = setInterval(
        () => this.updateConfig().catch(e => console.error("Unable to update config")),
        120000
      );
      this.initialUpdateConfig = this.updateConfig();
    }
    this.hostname = baseUrl.replace(/https?:\/\//, "");
    this._cachedPostBulkLocations = {};
    this._cachedPostBulkGate = asyncGate();
  }

  /**
   * Get the hostname this client is currently pointed to. Usually, http://xyz.internal.quintype.io
   * @returns {string} Hostname
   */
  getHostname() {
    return this.hostname;
  }

  /**
   * @external Response
   * @see https://github.com/request/request-promise
   */

  /**
   * Low level API for making a request to the backend. This API is not intended to be used by app developers.
   * @param {string} path The path of the API, usually starting /api/v1
   * @param {Object} opts options that passed directly to request
   * @param {string} opts.method The HTTP method to be called (default 'GET')
   * @param {Object} opts.qs An object of query parameters to be passed to the backend
   * @param {string} opts.body The body of the request (for POST requests only)
   * @returns {Promise<Response>} A promise of the response
   */
  request(path, opts) {
    if (ENABLE_AXIOS) {
      return this.axiosRequest(path, opts);
    }
    return this.nativeRequest(path, opts);
  }

  axiosRequest(path, opts) {
    const uri = this.baseUrl + path;
    const abort = axios.CancelToken.source();
    const cancelTimeout = DEFAULT_REQUEST_TIMEOUT + 500;
    const timeoutID = setTimeout(() => abort.cancel(`Timeout of ${cancelTimeout}ms.`), cancelTimeout);
    let configuration = {
      ...{
        url: uri,
        method: "get",
        json: true,
        gzip: true
      },
      ...opts,
      ...{ timeout: DEFAULT_REQUEST_TIMEOUT, cancelToken: abort.token, validateStatus: status => status < 500 }
    };

    if (configuration.qs) {
      configuration = {
        ...configuration,
        ...{
          params: configuration.qs
        }
      };
      delete configuration.qs;
    }

    return axios(configuration)
      .then(res => {
        clearTimeout(timeoutID);

        if (res.status === 404) return { response: { status: res.status } };

        return {
          ...res.data,
          ...{ headers: res.headers, statusCode: res.status, redirectCount: res.request._redirectable._redirectCount }
        };
      })
      .catch(error => {
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          console.log(error.response.data);
          console.log(error.response.status);
          console.log(error.response.headers);
        } else if (error.request) {
          // The request was made but no response was received
          // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
          // http.ClientRequest in node.js
          console.log(error.request);
        } else {
          // Something happened in setting up the request that triggered an Error
          console.log("Error", error.message);
        }
        console.log(error.config);
        throw error;
      });
  }

  nativeRequest(path, opts) {
    const uri = this.baseUrl + path;
    const params = Object.assign(
      {
        method: "GET",
        uri: uri,
        json: true,
        gzip: true
      },
      opts
    );
    return rp(params).catch(e => {
      console.error(`Error in API ${uri}: Status ${e.statusCode}`);
      throw e;
    });
  }

  getFromBulkApiManager(slug, params) {
    return this.request("/api/v1/bulk/" + slug, {
      qs: params
    });
  }

  getTags(slug) {
    return this.request("/api/v1/tags/" + slug);
  }

  getPublicPreviewStory(publicPreviewKey) {
    return this.request("/api/v1/preview/story/" + publicPreviewKey).catch(e => catch404(e, {}));
  }

  getCollectionBySlug(slug, params, opts = {}) {
    if (opts?.previewId && opts?.qtInternalAppsKey) {
      return this.request(`/api/v1/preview/${opts?.previewId}/collections/${slug}`, {
        qs: params,
        headers: {
          "qt-internal-apps-key": opts?.qtInternalAppsKey
        }
      }).catch(e => catch404(e, null));
    }
    return this.request("/api/v1/collections/" + slug, {
      qs: params
    }).catch(e => catch404(e, null));
  }

  getStories(params) {
    return this.request("/api/v1/stories", {
      qs: params
    });
  }

  getAmpConfig() {
    return this.request("/api/v1/amp/config");
  }

  getStoryBySlug(slug, params) {
    return this.request("/api/v1/stories-by-slug", {
      qs: _.merge({ slug: slug }, params)
    }).catch(e => catch404(e, {}));
  }

  getStoryByExternalId(externalId) {
    return this.request(`/api/v1/story-by-external-id/${externalId}`).catch(e => catch404(e, {}));
  }

  getStoryById(id) {
    return this.request("/api/v1/stories/" + id).catch(e => catch404(e, {}));
  }

  /**
   * This can be used to get the current config for this publisher this client points to. By default, this reloads every 4 minutes.
   * You will not typically need to call this method, as `@quintype/framework` does this for you.
   *
   * @returns {(Promise<Config>)} A Promise that returns an instance of {@link Config}
   */
  async getConfig() {
    // Handle with LRU TTL cache if ENABLE_TTL_CACHE is enabled
    if (ENABLE_TTL_CACHE) return this.getCacheConfig();

    if (this.config) return Promise.resolve(this.config);

    this.initialUpdateConfig = this.initialUpdateConfig || this.updateConfig();

    return this.initialUpdateConfig;
  }

  /**
   * This method is used to get the current in-memory cached config for this publisher. By default, this has a TTL of 4 minutes.
   * This can be enabled by the toggle ENABLE_TTL_CACHE in cache-constants.js file, can be modified via black-knight
   * @returns {(Promise<Config>)} A Promise that returns a in-memory cached instance of {@link Config}
   */
  async getCacheConfig() {
    const cacheKeyAttribute = `config-${this.hostname}`;
    const cacheConfig = await memoryCache.wrap(
      cacheKeyAttribute,
      async () => {
        console.log(`**** CACHE CONFIG UPDATE TRIGGERED *** ${cacheKeyAttribute}`);
        const updatedConfig = await this.updateConfig();
        return updatedConfig.asJson();
      },
      CACHE_TIME
    );
    return Config.build(cacheConfig);
  }

  /*
   * This method is used to get the current in-memory cached host-to-api mapping for publishers. By default, this has a TTL of 4 minutes.
   * @returns {(Promise<Config>)} A Promise that returns a in-memory cached instance of {@link Config}
   */
  async getHostToAPIMappingCache(xHostAPIToken) {
    // Cache key need not be unique across client instances
    const cacheKeyAttribute = `hostToApiMapping`;
    const hostToApiCache = await memoryCache.wrap(
      cacheKeyAttribute,
      async () => {
        return this.getHostToAPIMapping(xHostAPIToken);
      },
      CACHE_TIME
    );
    return hostToApiCache;
  }

  async getHostToAPIMapping(xHostAPIToken) {
    if (!xHostAPIToken) return new Promise(resolve => resolve({}));
    return this.request("/api/v1/mappings/host-to-publisher-name", {
      headers: {
        "x-host-mapping-token": xHostAPIToken
      }
    });
  }

  getCurrentMember(authToken) {
    return this.request("/api/v1/members/me", {
      headers: {
        "X-QT-AUTH": authToken
      }
    });
  }

  getAuthor(authorId) {
    return this.request("/api/v1/authors/" + authorId).catch(e => catch404(e, {}));
  }

  getAuthors(params) {
    return this.request("/api/authors", {
      qs: params
    });
  }

  getSearch(params) {
    return this.request("/api/v1/search", {
      qs: params
    });
  }

  getAdvancedSearch(params) {
    return this.request("/api/v1/advanced-search", {
      qs: params
    });
  }

  getRelatedStories(storyId = null, sectionId = null, params = {}) {
    return this.request("/api/v1/stories/" + storyId + "/related-stories", {
      qs: { ...(sectionId && { "section-id": sectionId }), ...params }
    });
  }

  getStoryAttributes(storyId) {
    return this.request("/api/v1/stories/" + storyId + "/attributes");
  }

  updateConfig() {
    return this.request("/api/v1/config").then(config => (this.config = Config.build(config)));
  }

  postComments(params, authToken) {
    return this.request("/api/v1/comments", {
      method: ENABLE_AXIOS ? "post" : "POST",
      ...(ENABLE_AXIOS && { data: params }),
      ...(!ENABLE_AXIOS && { body: params }),
      headers: {
        "X-QT-AUTH": authToken,
        "content-type": "application/json"
      }
    });
  }

  async getInBulk(requests, opts = {}) {
    const config = await this.getConfig();
    const requestHash = hash({ ...requests, ...{ publisherId: config["publisher-id"] } });
    async function getBulkLocation() {
      const response = await this.request("/api/v1/bulk-request", {
        method: ENABLE_AXIOS ? "post" : "POST",
        ...(ENABLE_AXIOS && { data: requests }),
        ...(!ENABLE_AXIOS && { body: requests }),
        headers: {
          "content-type": "text/plain"
        },
        simple: false,
        resolveWithFullResponse: true
      });

      if (response.statusCode === 303 && response.caseless.get("Location")) {
        const contentLocation = response.caseless.get("Location");
        await memoryCache.set(requestHash, contentLocation, BULK_REQ_TTL_CACHE);
        return contentLocation;
      }
      throw new Error(`Could Not Convert POST bulk to a get, got status ${response.statusCode}`);
    }

    async function getBulkPreviewData() {
      const response = await this.request(`/api/v1/preview/${opts?.previewId}/bulk-request`, {
        method: ENABLE_AXIOS ? "post" : "POST",
        ...(ENABLE_AXIOS && { data: requests }),
        ...(!ENABLE_AXIOS && { body: requests }),
        headers: {
          "content-type": "text/plain",
          "qt-internal-apps-key": opts?.qtInternalAppsKey
        },
        simple: false,
        resolveWithFullResponse: true
      });
      if (response.statusCode === 200) {
        const data = response.toJSON();
        return data?.body;
      }
      throw new Error(`Could Not Convert POST bulk to a get, got status ${response.statusCode}`);
    }

    if (opts?.qtInternalAppsKey && opts?.previewId) {
      const data = await getBulkPreviewData.bind(this)();
      return data;
    } else {
      let cachedRequestHash = await memoryCache.get(requestHash);
      if (!cachedRequestHash) {
        cachedRequestHash = await getBulkLocation.bind(this)();
      }
      return this.request(cachedRequestHash);
    }
  }

  getAmpStoryBySlug(slug) {
    return this.request("/api/v1/amp/story", {
      qs: { slug }
    });
  }

  getEntities(params) {
    return this.request("/api/v1/entities", {
      qs: params
    });
  }

  getEntity(entityId, params) {
    return this.request("/api/v1/entity/" + entityId, {
      qs: params
    });
  }

  getCollectionsByEntityId(entityId, params) {
    return this.request("/api/v1/entity/" + entityId + "/collections", {
      qs: params
    });
  }

  getCustomURL(path) {
    return this.request("/api/v1/custom-urls/" + encodeURIComponent(path));
  }

  getCustomPathData(path) {
    return this.request("/api/v1/custom-urls/" + encodeURIComponent(path)).catch(e => catch404(e, {}));
  }
  getAuthorCollection(authorId, params) {
    return this.request(`/api/v1/authors/${authorId}/collection`, {
      qs: params
    });
  }

  getMenuGroups(params = {}) {
    return this.request(`/api/v1/menu-groups`, {
      qs: params
    });
  }
}

/**
 * This low level function can be used to create an API {@link Client}. This should not be needed in most cases as `@quintype/framework` will do this for you.
 *
 * @param {string} host The API host
 * @param {boolean} temporaryClient Controls whether the config is reloaded every 120 seconds. This should be false for clients intended to be used within a single request
 * @returns {Client} A client connected to the API host
 */
function buildClient(host, temporaryClient) {
  const client = new Client(host, temporaryClient);
  return client.config().then(_ => client);
}

/**
 * This corresponds to the publisher's AMP configuration.
 *
 * See {@link AmpConfig.getAmpConfig}.
 * @hideconstructor
 */
class AmpConfig extends BaseAPI {
  constructor(ampConfig) {
    super();
    this.ampConfig = ampConfig;
  }

  /** Use this to convert to a simple javascript object, suitable for JSON. */
  asJson() {
    return this.ampConfig;
  }

  /**
   * This method returns the amp config. You might want to memoize this, similar to the below
   *
   * ```javascript
   * const ampConfig = config.memoizeAsync("amp-config", async () => await AmpConfig.getAmpConfig(client))
   * ```
   * @param {Client} client
   * @returns {(Promise<AmpConfig>)} A Promise that returns an instance of {@link AmpConfig}
   */
  static getAmpConfig(client) {
    return client.getAmpConfig().then(config => config && this.build(config));
  }
}
AmpConfig.upstream = "ampConfig";

module.exports = {
  Config: Config,
  AmpConfig,
  Story: Story,
  Client: Client,
  Member: Member,
  Author: Author,
  CustomPath: CustomPath,
  Collection: Collection,
  Entity: Entity,
  Url: Url,
  MenuGroups: MenuGroups,
  buildClient: buildClient
};
