-- Fondations Site 3 bis : l'attribution automatique ne doit jamais bloquer l'application d'un template.
-- created_by ne reprend auth.uid() que si ce compte existe reellement (sinon NULL), pour eviter
-- une violation de cle etrangere (constatee en test avec un identifiant de session inexistant).

create or replace function public.auto_assign_applied_template()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.site_scope = 'company' and new.company_id is not null and new.active_template_id is not null then
    insert into public.site_template_assignments (template_id, company_id, created_by)
    values (
      new.active_template_id,
      new.company_id,
      (select u.id from auth.users u where u.id = auth.uid())
    )
    on conflict (template_id, company_id) do nothing;
  end if;
  return null;
end;
$$;
