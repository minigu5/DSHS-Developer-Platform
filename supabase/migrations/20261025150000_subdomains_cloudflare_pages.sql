-- 주소 받기: Cloudflare Pages 호스트 추가 (src/lib/domains/hosts.ts 와 같은 규칙)
-- 다른 Cloudflare 계정의 Pages 프로젝트에 DNS only CNAME 으로 붙는 것을 2026-10-25 시험으로 확인했다.
ALTER TABLE public.subdomains DROP CONSTRAINT subdomains_host_check;
ALTER TABLE public.subdomains ADD CONSTRAINT subdomains_host_check
  CHECK (host IN ('vercel', 'netlify', 'cloudflare-pages', 'github-pages', 'gitlab-pages', 'render', 'railway'));

CREATE OR REPLACE FUNCTION public.subdomain_target_ok(p_host text, p_target text) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_host
    WHEN 'vercel' THEN p_target ~ '^(cname\.vercel-dns\.com|cname\.vercel-dns-[0-9]{1,4}\.com|[a-z0-9]{8,32}\.vercel-dns-[0-9]{1,4}\.com)$'
    WHEN 'netlify' THEN p_target ~ '^[a-z0-9-]+\.netlify\.app$'
    WHEN 'cloudflare-pages' THEN p_target ~ '^[a-z0-9-]+\.pages\.dev$'
    WHEN 'github-pages' THEN p_target ~ '^[a-z0-9-]+\.github\.io$'
    WHEN 'gitlab-pages' THEN p_target ~ '^[a-z0-9-]+\.gitlab\.io$'
    WHEN 'render' THEN p_target ~ '^[a-z0-9-]+\.onrender\.com$'
    WHEN 'railway' THEN p_target ~ '^[a-z0-9-]+\.up\.railway\.app$'
    ELSE false
  END;
$$;
