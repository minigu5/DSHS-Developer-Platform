-- ============================================================
-- save_guide_revision 동작 검증 (운영 DB에서 돌려도 안전)
-- ============================================================
-- 실행: supabase db query --linked -f docs/17-supabase-guide-revisions-verify.sql
--
-- 하나의 DO 블록(= 하나의 트랜잭션) 안에서 테스트 문서(zz-verify-*)를 만들고,
-- 마지막에 항상 RAISE EXCEPTION 으로 끝나 전부 롤백된다. 아무것도 남지 않는다.
-- 결과는 오류 메시지로 나온다: "VERIFY OK ..." 면 통과, "VERIFY FAIL ..." 이면 어긋난 항목이 나온다.
-- 사용자 한 명(@ts.hs.kr)이 users 에 있어야 한다.

DO $verify$
DECLARE
  u      uuid;
  r      int;
  log    text := '';
  seed   jsonb := '{"title":"원본","steps":[{"id":"a","body":"## A"}],"extra":null,"stats":{}}';
  st     jsonb := '[{"id":"a","body":"## A2"}]';
  big    jsonb;
  expect text :=
    'empty_base0=2;seed_row=seed/저장소 원본/null/true;new_row=edit/1/true;trim_title=고침;trim_sum=fix;'
    'empty_base1=conflict:0;empty_base1_rows=0;'
    'base0_nonempty=conflict:2;stale_base=conflict:2;'
    'seed_kind=kind_invalid;edit_revof=revert_invalid;revert_latest=revert_invalid;revert_missing=revert_invalid;revert_ok=3;revert_base=2;'
    'steps_object=steps_invalid;steps_string=steps_invalid;steps_null=steps_invalid;steps_empty=steps_invalid;steps_51=steps_invalid;'
    'long_body=steps_invalid;body_not_string=steps_invalid;'
    'title_blank=title_invalid;title_121=title_invalid;title_null=title_invalid;'
    'summary_blank=summary_invalid;stats_array=stats_invalid;stats_null_default={};'
    'bad_user=author_invalid;'
    'seed_null=seed_required;seed_string=seed_required;seed_title_blank=title_invalid;seed_title_num=seed_invalid;'
    'seed_steps_obj=steps_invalid;seed_steps_big=steps_invalid;seed_stats_array=stats_invalid;seed_extra_str=seed_invalid;'
    'invalid_seed_rows=0;seed_stats_null_default={};seed_title_trim=원본2;'
    'helper_anon=f;helper_auth=f;helper_service=f;fn_anon=f;fn_auth=f;fn_service=t;';
BEGIN
  SELECT id INTO u FROM public.users WHERE email LIKE '%@ts.hs.kr' LIMIT 1;
  IF u IS NULL THEN RAISE EXCEPTION 'VERIFY FAIL no @ts.hs.kr user in public.users'; END IF;

  -- 빈 문서에 기준 0 → seed 가 rev 1, 새 버전이 rev 2 (base_rev = 1)
  r := public.save_guide_revision(u, 'zz-verify-a', 0, 'edit', '  고침  ', st, NULL, '  fix  ', NULL, '{}', seed);
  log := log || 'empty_base0=' || r || ';';
  log := log || 'seed_row=' || (SELECT kind || '/' || summary || '/' || coalesce(base_rev::text, 'null') || '/' || (author_id = u)::text
                                FROM public.guide_revisions WHERE doc_key = 'zz-verify-a' AND rev_no = 1) || ';';
  log := log || 'new_row=' || (SELECT kind || '/' || base_rev || '/' || (author_id = u)::text
                               FROM public.guide_revisions WHERE doc_key = 'zz-verify-a' AND rev_no = 2) || ';';
  log := log || 'trim_title=' || (SELECT title FROM public.guide_revisions WHERE doc_key = 'zz-verify-a' AND rev_no = 2) || ';';
  log := log || 'trim_sum=' || (SELECT summary FROM public.guide_revisions WHERE doc_key = 'zz-verify-a' AND rev_no = 2) || ';';

  -- 빈 문서에 기준 1 → 충돌 (최신 0), 아무것도 안 남는다
  BEGIN
    PERFORM public.save_guide_revision(u, 'zz-verify-b', 1, 'edit', 'T', st, NULL, 'x', NULL, '{}', seed);
    log := log || 'empty_base1=NOERR;';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN log := log || 'empty_base1=' || SQLERRM || ';'; END;
  log := log || 'empty_base1_rows=' || (SELECT count(*) FROM public.guide_revisions WHERE doc_key = 'zz-verify-b') || ';';

  -- 버전이 있는 문서에 기준 0 / 낡은 기준 → 충돌 (최신 2)
  BEGIN
    PERFORM public.save_guide_revision(u, 'zz-verify-a', 0, 'edit', 'T', st, NULL, 'x', NULL, '{}', seed);
    log := log || 'base0_nonempty=NOERR;';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN log := log || 'base0_nonempty=' || SQLERRM || ';'; END;
  BEGIN
    PERFORM public.save_guide_revision(u, 'zz-verify-a', 1, 'edit', 'T', st, NULL, 'x', NULL, '{}', NULL);
    log := log || 'stale_base=NOERR;';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN log := log || 'stale_base=' || SQLERRM || ';'; END;

  -- kind / revert_of 규칙
  BEGIN
    PERFORM public.save_guide_revision(u, 'zz-verify-a', 2, 'seed', 'T', st, NULL, 'x', NULL, '{}', NULL);
    log := log || 'seed_kind=NOERR;';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN log := log || 'seed_kind=' || SQLERRM || ';'; END;
  BEGIN
    PERFORM public.save_guide_revision(u, 'zz-verify-a', 2, 'edit', 'T', st, NULL, 'x', 1, '{}', NULL);
    log := log || 'edit_revof=NOERR;';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN log := log || 'edit_revof=' || SQLERRM || ';'; END;
  BEGIN
    PERFORM public.save_guide_revision(u, 'zz-verify-a', 2, 'revert', 'T', st, NULL, 'x', 2, '{}', NULL);
    log := log || 'revert_latest=NOERR;';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN log := log || 'revert_latest=' || SQLERRM || ';'; END;
  BEGIN
    PERFORM public.save_guide_revision(u, 'zz-verify-a', 2, 'revert', 'T', st, NULL, 'x', 0, '{}', NULL);
    log := log || 'revert_missing=NOERR;';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN log := log || 'revert_missing=' || SQLERRM || ';'; END;
  r := public.save_guide_revision(u, 'zz-verify-a', 2, 'revert', '원본', seed->'steps', NULL, 'back', 1, '{}', NULL);
  log := log || 'revert_ok=' || r || ';';
  log := log || 'revert_base=' || (SELECT base_rev FROM public.guide_revisions WHERE doc_key = 'zz-verify-a' AND rev_no = 3) || ';';

  -- 단계 검증 (이제 최신 3)
  BEGIN
    PERFORM public.save_guide_revision(u, 'zz-verify-a', 3, 'edit', 'T', '{}'::jsonb, NULL, 'x', NULL, '{}', NULL);
    log := log || 'steps_object=NOERR;';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN log := log || 'steps_object=' || SQLERRM || ';'; END;
  BEGIN
    PERFORM public.save_guide_revision(u, 'zz-verify-a', 3, 'edit', 'T', '"x"'::jsonb, NULL, 'x', NULL, '{}', NULL);
    log := log || 'steps_string=NOERR;';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN log := log || 'steps_string=' || SQLERRM || ';'; END;
  BEGIN
    PERFORM public.save_guide_revision(u, 'zz-verify-a', 3, 'edit', 'T', NULL, NULL, 'x', NULL, '{}', NULL);
    log := log || 'steps_null=NOERR;';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN log := log || 'steps_null=' || SQLERRM || ';'; END;
  BEGIN
    PERFORM public.save_guide_revision(u, 'zz-verify-a', 3, 'edit', 'T', '[]'::jsonb, NULL, 'x', NULL, '{}', NULL);
    log := log || 'steps_empty=NOERR;';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN log := log || 'steps_empty=' || SQLERRM || ';'; END;
  SELECT jsonb_agg(jsonb_build_object('id', 's' || i, 'body', 'b')) INTO big FROM generate_series(1, 51) i;
  BEGIN
    PERFORM public.save_guide_revision(u, 'zz-verify-a', 3, 'edit', 'T', big, NULL, 'x', NULL, '{}', NULL);
    log := log || 'steps_51=NOERR;';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN log := log || 'steps_51=' || SQLERRM || ';'; END;
  BEGIN
    PERFORM public.save_guide_revision(u, 'zz-verify-a', 3, 'edit', 'T',
      jsonb_build_array(jsonb_build_object('id', 'a', 'body', repeat('x', 20001))), NULL, 'x', NULL, '{}', NULL);
    log := log || 'long_body=NOERR;';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN log := log || 'long_body=' || SQLERRM || ';'; END;
  BEGIN
    PERFORM public.save_guide_revision(u, 'zz-verify-a', 3, 'edit', 'T',
      jsonb_build_array(jsonb_build_object('id', 'a', 'body', 5)), NULL, 'x', NULL, '{}', NULL);
    log := log || 'body_not_string=NOERR;';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN log := log || 'body_not_string=' || SQLERRM || ';'; END;

  -- 제목 / 요약 / stats
  BEGIN
    PERFORM public.save_guide_revision(u, 'zz-verify-a', 3, 'edit', '   ', st, NULL, 'x', NULL, '{}', NULL);
    log := log || 'title_blank=NOERR;';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN log := log || 'title_blank=' || SQLERRM || ';'; END;
  BEGIN
    PERFORM public.save_guide_revision(u, 'zz-verify-a', 3, 'edit', repeat('가', 121), st, NULL, 'x', NULL, '{}', NULL);
    log := log || 'title_121=NOERR;';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN log := log || 'title_121=' || SQLERRM || ';'; END;
  BEGIN
    PERFORM public.save_guide_revision(u, 'zz-verify-a', 3, 'edit', NULL, st, NULL, 'x', NULL, '{}', NULL);
    log := log || 'title_null=NOERR;';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN log := log || 'title_null=' || SQLERRM || ';'; END;
  BEGIN
    PERFORM public.save_guide_revision(u, 'zz-verify-a', 3, 'edit', 'T', st, NULL, '   ', NULL, '{}', NULL);
    log := log || 'summary_blank=NOERR;';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN log := log || 'summary_blank=' || SQLERRM || ';'; END;
  BEGIN
    PERFORM public.save_guide_revision(u, 'zz-verify-a', 3, 'edit', 'T', st, NULL, 'x', NULL, '[]', NULL);
    log := log || 'stats_array=NOERR;';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN log := log || 'stats_array=' || SQLERRM || ';'; END;
  r := public.save_guide_revision(u, 'zz-verify-a', 3, 'edit', 'T', st, NULL, 'x', NULL, NULL, NULL);
  log := log || 'stats_null_default=' || (SELECT stats::text FROM public.guide_revisions WHERE doc_key = 'zz-verify-a' AND rev_no = r) || ';';

  -- 없는 사용자
  BEGIN
    PERFORM public.save_guide_revision(gen_random_uuid(), 'zz-verify-a', 4, 'edit', 'T', st, NULL, 'x', NULL, '{}', NULL);
    log := log || 'bad_user=NOERR;';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN log := log || 'bad_user=' || SQLERRM || ';'; END;

  -- 잘못된 seed (빈 문서 zz-verify-c, 전부 거부되고 아무것도 안 남아야 한다)
  BEGIN
    PERFORM public.save_guide_revision(u, 'zz-verify-c', 0, 'edit', 'T', st, NULL, 'x', NULL, '{}', NULL);
    log := log || 'seed_null=NOERR;';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN log := log || 'seed_null=' || SQLERRM || ';'; END;
  BEGIN
    PERFORM public.save_guide_revision(u, 'zz-verify-c', 0, 'edit', 'T', st, NULL, 'x', NULL, '{}', '"x"'::jsonb);
    log := log || 'seed_string=NOERR;';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN log := log || 'seed_string=' || SQLERRM || ';'; END;
  BEGIN
    PERFORM public.save_guide_revision(u, 'zz-verify-c', 0, 'edit', 'T', st, NULL, 'x', NULL, '{}',
      '{"title":"  ","steps":[{"id":"a","body":"x"}]}'::jsonb);
    log := log || 'seed_title_blank=NOERR;';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN log := log || 'seed_title_blank=' || SQLERRM || ';'; END;
  BEGIN
    PERFORM public.save_guide_revision(u, 'zz-verify-c', 0, 'edit', 'T', st, NULL, 'x', NULL, '{}',
      '{"title":5,"steps":[{"id":"a","body":"x"}]}'::jsonb);
    log := log || 'seed_title_num=NOERR;';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN log := log || 'seed_title_num=' || SQLERRM || ';'; END;
  BEGIN
    PERFORM public.save_guide_revision(u, 'zz-verify-c', 0, 'edit', 'T', st, NULL, 'x', NULL, '{}',
      '{"title":"S","steps":{}}'::jsonb);
    log := log || 'seed_steps_obj=NOERR;';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN log := log || 'seed_steps_obj=' || SQLERRM || ';'; END;
  BEGIN
    PERFORM public.save_guide_revision(u, 'zz-verify-c', 0, 'edit', 'T', st, NULL, 'x', NULL, '{}',
      jsonb_build_object('title', 'S', 'steps', big));
    log := log || 'seed_steps_big=NOERR;';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN log := log || 'seed_steps_big=' || SQLERRM || ';'; END;
  BEGIN
    PERFORM public.save_guide_revision(u, 'zz-verify-c', 0, 'edit', 'T', st, NULL, 'x', NULL, '{}',
      '{"title":"S","steps":[{"id":"a","body":"x"}],"stats":[]}'::jsonb);
    log := log || 'seed_stats_array=NOERR;';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN log := log || 'seed_stats_array=' || SQLERRM || ';'; END;
  BEGIN
    PERFORM public.save_guide_revision(u, 'zz-verify-c', 0, 'edit', 'T', st, NULL, 'x', NULL, '{}',
      '{"title":"S","steps":[{"id":"a","body":"x"}],"extra":"nope"}'::jsonb);
    log := log || 'seed_extra_str=NOERR;';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN log := log || 'seed_extra_str=' || SQLERRM || ';'; END;
  log := log || 'invalid_seed_rows=' || (SELECT count(*) FROM public.guide_revisions WHERE doc_key = 'zz-verify-c') || ';';

  -- seed 에 stats 가 없으면 {} 로, 제목은 다듬어 저장
  r := public.save_guide_revision(u, 'zz-verify-d', 0, 'edit', 'T', st, NULL, 'x', NULL, '{}',
    '{"title":"  원본2 ","steps":[{"id":"a","body":"x"}]}'::jsonb);
  log := log || 'seed_stats_null_default=' || (SELECT stats::text FROM public.guide_revisions WHERE doc_key = 'zz-verify-d' AND rev_no = 1) || ';';
  log := log || 'seed_title_trim=' || (SELECT title FROM public.guide_revisions WHERE doc_key = 'zz-verify-d' AND rev_no = 1) || ';';

  -- 권한
  log := log || 'helper_anon=' || left(has_function_privilege('anon', 'public._guide_validate_doc(text,jsonb,jsonb)', 'execute')::text, 1) || ';';
  log := log || 'helper_auth=' || left(has_function_privilege('authenticated', 'public._guide_validate_doc(text,jsonb,jsonb)', 'execute')::text, 1) || ';';
  log := log || 'helper_service=' || left(has_function_privilege('service_role', 'public._guide_validate_doc(text,jsonb,jsonb)', 'execute')::text, 1) || ';';
  log := log || 'fn_anon=' || left(has_function_privilege('anon', 'public.save_guide_revision(uuid,text,int,text,text,jsonb,jsonb,text,int,jsonb,jsonb)', 'execute')::text, 1) || ';';
  log := log || 'fn_auth=' || left(has_function_privilege('authenticated', 'public.save_guide_revision(uuid,text,int,text,text,jsonb,jsonb,text,int,jsonb,jsonb)', 'execute')::text, 1) || ';';
  log := log || 'fn_service=' || left(has_function_privilege('service_role', 'public.save_guide_revision(uuid,text,int,text,text,jsonb,jsonb,text,int,jsonb,jsonb)', 'execute')::text, 1) || ';';

  -- 항상 롤백: 성공이든 실패든 예외로 끝낸다
  IF log = expect THEN
    RAISE EXCEPTION 'VERIFY OK (rolled back) %', log;
  ELSE
    RAISE EXCEPTION E'VERIFY FAIL (rolled back)\nexpected: %\nactual:   %', expect, log;
  END IF;
END
$verify$;
