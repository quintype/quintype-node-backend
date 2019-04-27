const { BaseAPI } = require('./base-api');

class MenuGroups extends BaseAPI{
  constructor(menuGroups) {
    this.menuGroups = menuGroups;
  }

  asJson() {
    return this.menuGroups;
  }

  getMenuGroup(slug) {
    return this.menuGroups[slug];
  }

  static getMenuGroups(client, params = {}) {
    return client
      .getMenuGroups(params)
      .then(response => this.build(response['menu-groups']));
  }
}

MenuGroups.upstream = "menuGroups";

module.exports = { MenuGroups };