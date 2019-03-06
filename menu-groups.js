const { wrapBuildFunction } = require('./wrap-build');

class MenuGroups {
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
      .then(response => MenuGroups.build(response['menu-groups']));
  }
}

wrapBuildFunction(MenuGroups, "menuGroups");

module.exports = { MenuGroups };