'use strict';

var rp = require('request-promise');
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

  static getStories(client, params) {
    return client
      .getStories(params)
      .then(response => _.map(response["stories"], story => Story.build(story)));
  }

  static getStoryBySlug(client, slug) {
    return client
      .getStoryBySlug(slug)
      .then(story => Story.build(story));
  }
}

wrapBuildFunction(Story, "story");

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
  Client: Client
};
