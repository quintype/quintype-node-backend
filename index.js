'use strict';

const rp = require('request-promise');
const Promise = require("bluebird");
const _ = require("lodash");
const {loadNestedCollectionData}  = require("./collection-loader");
const { DEFAULT_DEPTH } = require("./constants");

function wrapBuildFunction(clazz, upstream) {
  clazz.build = function() {
    if(!arguments[0])
      return null;

    return new Proxy(new clazz(...arguments), {
      get: function(target, key) {
        if(key in target)
          return target[key];
        if(key in target[upstream])
          return target[upstream][key];
      }
    });
  }
}

function mapValues(f, object) {
  return Object.entries(object)
    .reduce((acc, [key, value]) => { acc[key] = f(value, key); return acc}, {})
}

class Story {
  constructor(story) {
    this.story = story;
  }

  asJson() {
    return this.story;
  }

  static getStories(client, storyGroup, params) {
    return client
      .getStories(_.extend({'story-group': storyGroup}, params))
      .then(response => _.map(response["stories"], story => Story.build(story)));
  }

  getRelatedStories(client) {
    const sectionId = _.get(this, ['sections', 0, 'id'], null);
    return client
      .getRelatedStories(this.id, sectionId)
      .then(response => _.map(response["related-stories"], story => Story.build(story)));
  }

  static getStoryBySlug(client, slug, params) {
    return client
      .getStoryBySlug(slug, params)
      .then(response => Story.build(response["story"]));
  }

  static getPublicPreviewStory(client, publicPreviewKey) {
    return client
      .getPublicPreviewStory(publicPreviewKey)
      .then(response => Story.build(response["story"]));
  }

  static getStoryById(client, id) {
    return client
      .getStoryById(id)
      .then(response => Story.build(response["story"]));
  }

  static getSearch(client, params) {
    return client
      .getSearch(params)
      .then(response =>
        _.merge(response["results"],
          {'stories': _.map(response["results"]["stories"], story => Story.build(story))}));
  }

  static getInBulk(client, requests) {
    function wrapResult(result) {
      if(!result.stories)
        return result;
      return Object.assign({}, result, {stories: result.stories.map(Story.build)})
    }

    return client
      .getInBulk({requests: mapValues(r => Object.assign({_type: "stories"}, r), requests)})
      .then(response => BulkResults.build(mapValues(result => wrapResult(result), response["results"])));
  }
}
wrapBuildFunction(Story, "story");

class BulkResults {
  constructor(results) {
    this.results = results;
  }

  asJson() {
    return mapValues(response => {
      if(response.stories) {
        return Object.assign({}, response, {stories: response.stories.map(story => story.asJson())})
      } else {
        return response;
      }
    }, this.results);
  }
}
wrapBuildFunction(BulkResults, "results");

class Collection {
  constructor(collection) {
    this.collection = collection;
  }

  asJson() {
    return this.collection;
  }

  static getCollectionBySlug(client, slug, params, options = {}) {
    const {depth = DEFAULT_DEPTH} = options;
    return client
      .getCollectionBySlug(slug, params)
      .then(response => {
        const collection = response ? response["collection"] || response : null;
        return collection && loadNestedCollectionData(client, collection, {depth})
      }).then(collection => Collection.build(collection))
  }
}
wrapBuildFunction(Collection, "collection");

class Member {
  constructor(member) {
    this.member = member;
  }

  asJson() {
    return this.member;
  }

  static getCurrentMember(client, authToken) {
    if(!authToken || authToken == "")
      return new Promise((resolve, reject) => resolve(null));
    return client
      .getCurrentMember(authToken)
      .then(response => response && Member.build(response["member"]))
      .catch(() => null);
  }
}
wrapBuildFunction(Member, "member");

class Author {
  constructor(author) {
    this.author = author;
  }

  asJson() {
    return this.author;
  }

  static getAuthor(client, authorId) {
    return client
      .getAuthor(authorId)
      .then(response => response && Author.build(response["author"]));
  }

  static getAuthors(client, params) {
    return client
      .getAuthors(params)
      .then(authors => _.map(authors, author => Author.build(author)));
  }

  static getAuthorCollection(client, authorId, params){
    return client
    .getAuthorCollection(authorId, params)
    .catch(e => catch404(e, null))
  }
}
wrapBuildFunction(Author, "author");

class CustomPath {
  constructor(page) {
    this.page = page;
  }

  asJson() {
    return this.page;
  }

  static getCustomPathData(client, path) {
    return client
      .getCustomPathData(path.startsWith('/') ? path : "/" + path)
      .then(response => response["page"] && CustomPath.build(response["page"]));
  }
}
wrapBuildFunction(CustomPath, "page");

class Config {
  constructor(config) {
    this.config = config;
  }

  asJson() {
    return this.config;
  }

  getStack(heading) {
    return this.config.layout.stacks.find(stack => stack.heading == heading);
  }
}
wrapBuildFunction(Config, "config");

class Entity {
  constructor(entity) {
    this.entity = entity;
  }

  asJson() {
    return this.entity;
  }

  static getEntities(client, params) {
    return client
      .getEntities(params)
      .then(response => _.map(response["entities"], entity => Entity.build(entity)));
  }
}
wrapBuildFunction(Entity, "entity");

class Url {
  constructor(url) {
    this.url = url;
  }

  asJson() {
    return this.url;
  }

  static getCustomURL(client, slug) {
    return client
      .getCustomURL(slug)
        .then(url => Url.build(url))
  }
}
wrapBuildFunction(Url, "url");

function catch404(e, defaultValue) {
  if(e && e.statusCode == 404)
    return defaultValue;
  throw e;
}

class Client {
  constructor(baseUrl, temporaryClient) {
    this.baseUrl = baseUrl;
    this.config = null;
    if(!temporaryClient) {
      this.interval = setInterval(() => this.updateConfig().catch(e => console.error("Unable to update config")), 120000);
      this.initialUpdateConfig = this.updateConfig();
    }
    this.hostname = baseUrl.replace(/https?:\/\//, "");
  }

  getHostname() {
    return this.hostname;
  }

  request(path, opts) {
    const params = Object.assign({
      method: 'GET',
      uri: this.baseUrl + path,
      json: true,
      gzip: true
    }, opts);
    return rp(params);
  }

  getFromBulkApiManager(slug, params) {
    return this.request("/api/v1/bulk/" + slug,{
      qs: params
    })
  }

  getTags(slug) {
    return this.request("/api/v1/tags/" + slug)
  }

  getPublicPreviewStory(publicPreviewKey) {
    return this.request("/api/v1/preview/story/" + publicPreviewKey).catch(e => catch404(e, {}))
  }

  getCollectionBySlug(slug, params) {
    return this.request("/api/v1/collections/" + slug, {
      qs: params
    }).catch(e => catch404(e, null))
  }

  getStories(params) {
    return this.request("/api/v1/stories", {
      qs: params
    })
  }

  getStoryBySlug(slug, params) {
    return this.request("/api/v1/stories-by-slug", {
      qs: _.merge({slug: slug}, params)
    }).catch(e => catch404(e, {}))
  }

  getStoryById(id) {
    return this.request("/api/v1/stories/" + id).catch(e => catch404(e, {}))
  }

  getConfig() {
    if(this.config)
      return Promise.resolve(this.config);

    this.initialUpdateConfig = this.initialUpdateConfig || this.updateConfig();

    return this.initialUpdateConfig;
  }

  getCurrentMember(authToken) {
    return this.request("/api/v1/members/me", {
      headers: {
        "X-QT-AUTH": authToken
      }
    })
  }

  getAuthor(authorId) {
    return this.request("/api/v1/authors/" + authorId).catch(e => catch404(e, {}))
  }

  getAuthors(params) {
    return this.request("/api/authors", {
      qs: params
    })
  }

  getSearch(params) {
    return this.request("/api/v1/search", {
      qs: params
    })
  }

  getRelatedStories(storyId = null, sectionId = null) {
    return this.request("/api/v1/stories/" + storyId + "/related-stories?section-id=" + sectionId)
  }

  updateConfig() {
    return this.request("/api/v1/config")
    .then(config => this.config = Config.build(config))
  }

  postComments(params, authToken){
    return this.request("/api/v1/comments", {
      method: 'POST',
      body: params,
      headers: {
        "X-QT-AUTH": authToken,
        'content-type': 'application/json'
      }
    })
  }

  getInBulk(requests){
    return this.request("/api/v1/bulk-request", {
      method: 'POST',
      body: requests,
      headers: {
        'content-type': 'application/json'
      },
      followAllRedirects: true
    })
  }

  getAmpStoryBySlug(slug) {
    return this.request("/api/v1/amp/story", {
      qs: {slug}
    })
  }

  getEntities(params) {
    return this.request("/api/v1/entities", {
      qs: params
    })
  }

  getCustomURL(slug) {
    return this.request("/api/v1/custom-urls/" + encodeURIComponent(path))
  }

  getCustomPathData(path) {
    return this.request("/api/v1/custom-urls/" + encodeURIComponent(path))
               .catch(e => catch404(e, {}));
  }
  getAuthorCollection(authorId, params){
    return this.request(`/api/v1/authors/${authorId}/collection`, {
      qs: params
    })
  }
}

function buildClient(host, temporaryClient) {
  const client = new Client(host, temporaryClient);
  return client.config().then(_ => client);
}

module.exports = {
  Story: Story,
  Client: Client,
  Member: Member,
  Author: Author,
  CustomPath: CustomPath,
  Collection: Collection,
  Entity: Entity,
  Url: Url,
  buildClient: buildClient
};
