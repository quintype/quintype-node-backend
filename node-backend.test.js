const { Config } = require('./index');

describe("Config Behavior", function() {
    it("Returns home-collection id provided a hostname", function(){
      const config = Config.build({
        domains: [{slug: "mydomain", name: "mydomain", "home-collection-id": 1234}]
      });
      expect(config.getHomeCollectionSlug("mydomain")).toBe(1234);
    });

    it("returns home-collection as home if the domain is not found", function() {
      const config = Config.build({
        domains: []
      });
      expect(config.getHomeCollectionSlug("mydomain")).toBe("home");
      expect(config.getHomeCollectionSlug(null)).toBe("home");
      expect(config.getHomeCollectionSlug(undefined)).toBe("home");
    });

    it("still works if domain is missing", function() {
      const config = Config.build({
        domains: undefined
      });
      expect(config.getHomeCollectionSlug("mydomain")).toBe("home");
      expect(config.getHomeCollectionSlug(null)).toBe("home");
      expect(config.getHomeCollectionSlug(undefined)).toBe("home");
    });

    it("gets all sections for a given domain", function() {
      const config = Config.build({
        sections:[
          {
            'domain-slug': 'cinema',
            name: 'Bollywood',
            id: 10,
          },
          {
            'domain-slug': 'cinema',
            name: 'Hollywood',
            id: 2,
          },
          {
            'domain-slug': 'news',
            name:'News',
            id:3
          },
        ]
      });
      expect(config.getDomainSections('cinema').sort((a, b) => a.id > b.id).map(s=> s.id).join(',')).toBe('2,10');
    });
    it("returns empty array if no matching sections are found", function() {
      const config = Config.build({
        sections:[
          {
            'domain-slug': 'cinema',
            name: 'Bollywood',
            id:'1',
          },
          {
            'domain-slug': 'cinema',
            name: 'Hollywood',
            id:'2',
          },
          {
            'domain-slug': 'news',
            name:'News',
            id:3
          },
        ]
      });
      expect(config.getDomainSections('business').length).toBe(0);
    })
});
