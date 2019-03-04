class MenuGroups {
  constructor(menuGroups) {
    this.menuGroups = menuGroups;
  }

  asJson() {
    return this.menuGroups;
  }

  static getMenuGroups(client, params) {
    return client
      .getMenuGroups(params)
      .then(menuGroups => MenuGroups.build(menuGroups));
  }
}

export {MenuGroups};