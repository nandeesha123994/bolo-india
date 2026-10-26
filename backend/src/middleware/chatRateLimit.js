const rateLimits = {
  message: { max: 30, windowMs: 60 * 1000, description: "messages" },
  "typing:start": { max: 120, windowMs: 60 * 1000, description: "typing events" },
  "typing:stop": { max: 120, windowMs: 60 * 1000, description: "typing events" },
  image: { max: 10, windowMs: 60 * 1000, description: "image uploads" },
};

const userBuckets = new Map();

const consumeChatRateLimit = (userId, action) => {
  const limit = rateLimits[action];
  if (!limit) throw new Error(`Unknown chat rate limit action: ${action}`);

  const key = `${userId}:${action}`;
  const now = Date.now();
  let bucket = userBuckets.get(key);

  if (!bucket || now - bucket.startedAt >= limit.windowMs) {
    bucket = { startedAt: now, count: 0 };
    userBuckets.set(key, bucket);
  }

  bucket.count += 1;
  if (bucket.count <= limit.max) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  return {
    allowed: false,
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((bucket.startedAt + limit.windowMs - now) / 1000),
    ),
  };
};

const chatRateLimit = (action) => (req, res, next) => {
  const userId = req.user?.id;
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const result = consumeChatRateLimit(userId, action);
  if (!result.allowed) {
    res.set("Retry-After", String(result.retryAfterSeconds));
    return res.status(429).json({
      message: `Too many ${rateLimits[action].description}. Try again in ${result.retryAfterSeconds} seconds.`,
    });
  }

  return next();
};

const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of userBuckets) {
    const action = key.slice(key.indexOf(":") + 1);
    const limit = rateLimits[action];
    if (!limit || now - bucket.startedAt >= limit.windowMs) {
      userBuckets.delete(key);
    }
  }
}, 5 * 60 * 1000);
cleanupInterval.unref();

module.exports = { chatRateLimit, consumeChatRateLimit };
