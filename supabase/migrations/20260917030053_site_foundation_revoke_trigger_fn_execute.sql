-- Fondations Site : la fonction de trigger auto_assign_applied_template ne doit pas etre appelable en RPC.
-- PostgreSQL ne controle EXECUTE sur une fonction de trigger qu'a la creation du trigger,
-- pas a son declenchement : le trigger trg_site_template_auto_assign continue de fonctionner.
revoke execute on function public.auto_assign_applied_template() from public, anon, authenticated;
