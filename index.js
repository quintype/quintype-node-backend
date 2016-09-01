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

class Story {
  constructor(story) {
    this.story = story;
  }

  asJson() {
    return this.story;
  }

  static build(story) {
    return new Proxy(new Story(story), handler);
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

  static getStoryBySlug(client, slug) {
    return client
      .getStoryBySlug(slug)
      .then(response => Story.build(response["story"]));
  }

  static getSearch(client, params) {
    return client
      .getSearch(params)
      .then(response =>
        _.merge(response["results"],
          {'stories': _.map(response["results"]["stories"], story => Story.build(story))}));
  }
}
wrapBuildFunction(Story, "story");

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
      .catch(() => null)
      .then(response => response && Member.build(response));
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
}
wrapBuildFunction(Author, "author");

class Client {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.config = null;
    this.interval = setInterval(() => this.updateConfig(), 120000);
    this.updateConfig();
  }

  getStories(params) {
    return rp({
      method: 'GET',
      uri: this.baseUrl + "/api/v1/stories",
      qs: params,
      json: true
    });
  }

  getStoryBySlug(slug) {
    return rp({
      method: 'GET',
      uri: this.baseUrl + "/api/v1/stories-by-slug",
      qs: {slug: slug},
      json: true
    });
  }

  getConfig() {
    return this.config;
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
    }).then(config => this.config = config);
  }
}

module.exports = {
  Story: Story,
  Client: Client,
  Member: Member,
  Author: Author
};
