import hashlib
import json
from django.core.cache import cache
from django.utils import timezone

CACHE_TTL_FEED = 60
CACHE_TTL_RECOMMENDATIONS = 120
CACHE_TTL_TRENDING = 60
CACHE_TTL_FEATURED = 120

_KEY_REGISTRY_KEY = "_cache_key_registry"


def make_cache_key(prefix, *args, **kwargs) -> str:
    raw = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True, default=str)
    h = hashlib.md5(raw.encode()).hexdigest()[:12]
    return f"{prefix}:{h}"


class CacheService:

    @staticmethod
    def _get_registry():
        reg = cache.get(_KEY_REGISTRY_KEY)
        if reg is None:
            reg = {}
            cache.set(_KEY_REGISTRY_KEY, reg, None)
        return reg

    @staticmethod
    def _save_registry(reg):
        cache.set(_KEY_REGISTRY_KEY, reg, None)

    @staticmethod
    def _track_key(key, prefix):
        reg = CacheService._get_registry()
        reg.setdefault(prefix, []).append(key)
        CacheService._save_registry(reg)

    @staticmethod
    def get_or_set(key, ttl, fallback, prefix=None):
        cached = cache.get(key)
        if cached is not None:
            return cached
        value = fallback()
        cache.set(key, value, ttl)
        if prefix:
            CacheService._track_key(key, prefix)
        return value

    @staticmethod
    def invalidate(prefix):
        reg = CacheService._get_registry()
        keys = reg.pop(prefix, [])
        for key in keys:
            cache.delete(key)
        CacheService._save_registry(reg)

    @classmethod
    def cached_feed(cls, limit, offset, qs_factory):
        key = make_cache_key("feed", limit, offset) if limit else "feed:public"
        return cls.get_or_set(key, CACHE_TTL_FEED, lambda: list(qs_factory()), prefix="feed")

    @classmethod
    def cached_featured(cls, limit, qs_factory):
        key = make_cache_key("featured", limit)
        return cls.get_or_set(key, CACHE_TTL_FEATURED, lambda: list(qs_factory()), prefix="featured")

    @classmethod
    def cached_recommendations(cls, user_id, limit, offset, qs_factory):
        key = make_cache_key(f"recs:u{user_id}", limit, offset)
        return cls.get_or_set(key, CACHE_TTL_RECOMMENDATIONS, lambda: list(qs_factory()), prefix="recs")

    @classmethod
    def cached_trending(cls, limit, offset, qs_factory):
        key = make_cache_key("trending", limit, offset)
        return cls.get_or_set(key, CACHE_TTL_TRENDING, lambda: list(qs_factory()), prefix="trending")

    @classmethod
    def invalidate_feed(cls):
        cls.invalidate("feed")

    @classmethod
    def invalidate_features(cls):
        cls.invalidate("featured")

    @classmethod
    def invalidate_trending(cls):
        cls.invalidate("trending")

    @classmethod
    def invalidate_recommendations(cls, user_id=None):
        if user_id:
            key_prefix = f"recs:u{user_id}"
            reg = cls._get_registry()
            keys = [k for k in reg.get("recs", []) if k.startswith(key_prefix)]
            for k in keys:
                cache.delete(k)
                reg["recs"].remove(k)
            cls._save_registry(reg)
        else:
            cls.invalidate("recs")
