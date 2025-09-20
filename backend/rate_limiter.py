import time
from typing import Dict, Tuple

class RateLimiter:
    def __init__(self, capacity: int = 20, refill_seconds: int = 300):
        self.capacity = capacity
        self.refill_seconds = refill_seconds
        self.store: Dict[str, Tuple[int, float]] = {}

    def allow(self, key: str) -> bool:
        tokens, last_refill = self.store.get(key, (self.capacity, time.time()))

        elapsed_time = time.time() - last_refill
        refill_amount = int(elapsed_time * (self.capacity / self.refill_seconds))
        tokens = min(self.capacity, tokens + refill_amount)

        if tokens <= 0:
            self.store[key] = (tokens, time.time())
            return False

        self.store[key] = (tokens - 1, time.time())
        return True