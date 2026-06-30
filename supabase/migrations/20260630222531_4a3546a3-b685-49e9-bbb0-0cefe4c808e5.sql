
REVOKE ALL ON FUNCTION public.find_family_by_invite_code(text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_family_by_invite_code(text) TO authenticated, service_role;
