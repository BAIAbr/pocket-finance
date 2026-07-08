REVOKE EXECUTE ON FUNCTION public.get_family_invite_code(uuid) FROM authenticated, PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_family_invite_code(uuid) TO service_role;