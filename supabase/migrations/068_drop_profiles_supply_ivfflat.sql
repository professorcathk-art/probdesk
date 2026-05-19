-- IVFFLAT on a tiny/partial corpus can return **zero** neighbors (low default probes + cold index),
-- which surfaced as persistent empty_rpc_retrieval even when supply_embedding rows existed.
-- Sequential scan for cosine distance is correct at small membership and avoids that failure mode.
-- Re-introduce an approximate index later with HNSW or tuned IVFFLAT once you have enough rows.

drop index if exists public.profiles_supply_embedding_ivfflat;
