class MenuGroups {
  constructor(menuGroups) {
    this.menuGroups = menuGroups;
  }

  asJson() {
    return this.menuGroups;
  }

  static getMenuGroups(client, params = {}) {
    return client
      .getMenuGroups(params)
      .then(response => MenuGroups.build(response['menu-groups']));
  }
}

module.exports = { MenuGroups: MenuGroups };