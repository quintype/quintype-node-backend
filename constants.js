const DEFAULT_LIMIT = "10";

const DEFAULT_DEPTH = 1;

/**
 * @package
 * Default Fields for Most APIs which get stories in bulk
 */
const DEFAULT_STORY_FIELDS =
  "headline,subheadline,slug,url,hero-image-s3-key,hero-image-caption,hero-image-metadata,first-published-at,last-published-at,alternative,published-at,authors,author-name,author-id,sections,story-template,metadata,access,access-level-value,read-time";

const DEFAULT_REQUEST_TIMEOUT = process.env.NODE_ENV === "production" ? 2000 : 50000;

const ENABLE_AXIOS = false;

module.exports = { DEFAULT_DEPTH, DEFAULT_LIMIT, DEFAULT_STORY_FIELDS, DEFAULT_REQUEST_TIMEOUT, ENABLE_AXIOS };
