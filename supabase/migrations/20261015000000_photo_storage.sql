-- Profile photo storage and reordering.
--
-- Files live in a PRIVATE bucket "photos" at {user_id}/{photo id}.jpg. The app compresses each
-- photo on the device (max 1080px, ~70% JPEG) before upload, so the bucket only accepts JPEG
-- up to 5 MB. Nobody can list or read the bucket directly; access goes through these policies:
--   - users write, read and delete only inside their own {user_id}/ folder
--   - users read another person's file only when the matching photos row is approved and that
--     person is discoverable to them (active, not blocked either way)
-- Public visibility is still decided by public.photos.moderation_status, set by admins only.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

create policy photos_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy photos_owner_select on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy photos_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy photos_approved_select on storage.objects for select to authenticated
  using (
    bucket_id = 'photos'
    and exists (
      select 1 from public.photos p
      where p.storage_path = storage.objects.name
        and p.moderation_status = 'approved'
        and public.is_discoverable(auth.uid(), p.user_id)
    )
  );

-- Reordering. Owners have no UPDATE policy on public.photos (an update could also change
-- moderation_status), so order changes go through this function, which only touches position.
-- The unique (user_id, position) check is made deferrable so positions can be swapped in one statement.
alter table photos drop constraint photos_user_id_position_key;
alter table photos add constraint photos_user_id_position_key
  unique (user_id, position) deferrable initially immediate;

-- p_photo_ids: ALL of the caller's photo ids, in the new order (first = main photo).
-- Also used after a delete to close gaps, so positions are always 1..n.
create or replace function reorder_my_photos(p_photo_ids uuid[]) returns void
language plpgsql volatile security definer set search_path = public as $$
declare v_uid uuid := require_active_user();
begin
  if p_photo_ids is null
     or cardinality(p_photo_ids) <> (select count(*) from photos where user_id = v_uid)
     or cardinality(p_photo_ids) <> (select count(distinct x) from unnest(p_photo_ids) x)
     or exists (select 1 from unnest(p_photo_ids) x
                where not exists (select 1 from photos where id = x and user_id = v_uid)) then
    raise exception 'not_permitted';
  end if;

  set constraints photos_user_id_position_key deferred;
  update photos p
     set position = o.ord
    from unnest(p_photo_ids) with ordinality as o(id, ord)
   where p.id = o.id and p.user_id = v_uid;
end $$;

revoke execute on function reorder_my_photos(uuid[]) from public, anon;
grant execute on function reorder_my_photos(uuid[]) to authenticated;
