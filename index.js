'use strict';

var rp = require('request-promise');
var Promise = require("bluebird");
var _ = require("lodash");

function wrapBuildFunction(clazz, upstream) {
  clazz.build = function() {
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
    return client
      .getRelatedStories(this.id)
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

  static getCollectionBySlug(client, slug, params) {
    return client
      .getCollectionBySlug(slug, params)
      .then(response => response && Collection.build(response["collection"] || response));
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
}
wrapBuildFunction(Author, "author");

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

  getFromBulkApiManager(slug, params) {
    return rp({
      method: 'GET',
      uri: this.baseUrl + "/api/v1/bulk/" + slug,
      qs: params,
      json: true
    })
  }

  getTags(slug) {
    return rp({
      method: 'GET',
      uri: this.baseUrl + "/api/v1/tags/" + slug,
      json: true
    })
  }

  getPublicPreviewStory(publicPreviewKey) {
    return rp({
      method: 'GET',
      uri: this.baseUrl + "/api/v1/preview/story/" + publicPreviewKey,
      json: true
    })
  }

  getCollectionBySlug(slug, params) {
    return rp({
      method: 'GET',
      uri: this.baseUrl + "/api/v1/collections/" + slug,
      qs: params,
      json: true
    })
  }

  getStories(params) {
    return rp({
      method: 'GET',
      uri: this.baseUrl + "/api/v1/stories",
      qs: params,
      json: true
    });
  }

  getStoryBySlug(slug, params) {
    return rp({
      method: 'GET',
      uri: this.baseUrl + "/api/v1/stories-by-slug",
      qs: _.merge({slug: slug}, params),
      json: true
    });
  }

  getStoryById(id) {
    return rp({
      method: 'GET',
      uri: this.baseUrl + "/api/v1/stories/" + id,
      json: true
    });
  }

  getConfig() {
    if(this.config)
      return Promise.resolve(this.config);

    this.initialUpdateConfig = this.initialUpdateConfig || this.updateConfig();

    return this.initialUpdateConfig;
  }

  getCurrentMember(authToken) {
    return rp({
      method: 'GET',
      uri: this.baseUrl + "/api/v1/members/me",
      headers: {
        "X-QT-AUTH": authToken
      },
      json: true
    });
  }

  getAuthor(authorId) {
    return rp({
      method: 'GET',
      uri: this.baseUrl + "/api/v1/authors/" + authorId,
      json: true
    });
  }

  getAuthors(params) {
    return rp({
      method: 'GET',
      uri: this.baseUrl + "/api/authors",
      qs: params,
      json: true
    });
  }

  getSearch(params) {
    return rp({
      method: 'GET',
      uri: this.baseUrl + "/api/v1/search",
      qs: params,
      json: true
    })
  }

  getRelatedStories(storyId) {
    return rp({
      method: 'GET',
      uri: this.baseUrl + "/api/v1/stories/"+ storyId + "/related-stories",
      json: true
    })
  }

  updateConfig() {
    return rp({
      method: 'GET',
      uri: this.baseUrl + "/api/v1/config",
      json: true
    })
    .then(config => this.config = Config.build(config));
  }

  postComments(params, authToken){
    return rp ({
      method: 'POST',
      uri: this.baseUrl + "/api/v1/comments",
      body: params,
      headers: {
          "X-QT-AUTH": authToken
      },
      json: true
    })
  }

  getInBulk(requests){
    return rp({
      method: 'POST',
      uri: this.baseUrl + "/api/v1/bulk-request",
      body: requests,
      json: true,
      followAllRedirects: true
    })
  }

 getAmpStoryBySlug(slug, params) {
    return rp({
      method: 'GET',
      uri: this.baseUrl + "/api/v1/amp/story?slug",
      qs: _.merge({slug: slug}, params),
      json: true
    });
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
  Collection: Collection,
  buildClient: buildClient
};
