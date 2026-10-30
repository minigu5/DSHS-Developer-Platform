// projects 를 사용자 키(anon/authenticated)로 읽을 때 쓰는 칸 목록.
// author_id 는 익명 프로젝트의 소유자를 숨기려고 SELECT 권한을 막아 두었다(migration 20261031100000) —
// select('*') 도 막히므로 칸을 적어서 읽고, 작성자는 public_author_id(익명이면 null)로 붙인다.
// projects 에 칸을 새로 만들면 migration 에서 GRANT SELECT (새 칸) 를 하고 여기에도 더할 것.
export const PROJECT_COLUMNS =
  'id, title, short_description, description, url, platforms, features, feature_custom, source_type, repo_url, license, license_features, license_custom, visibility, allowed_users, author_role, team_name, team_members, icon_type, icon_url, created_at, updated_at, click_count, types, readme_sync, readme_etag, readme_synced_at, public_author_id' as const;

/** projects → users 관계가 둘(author_id·public_author_id)이라 이름을 적어야 한다. 익명이면 null 로 붙는다. */
export const PROJECT_AUTHOR = 'users!projects_public_author_id_fkey' as const;
