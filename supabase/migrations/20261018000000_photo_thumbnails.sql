-- Thumbnails for lists. Each upload also stores a small version next to the photo:
--   {user_id}/abc.jpg  ->  {user_id}/abc.thumb.jpg
-- Lists (Discover, inbox) load thumbnails to save mobile data; profile pages load full photos.
-- A thumbnail is readable by others exactly when its photo is (approved, owner discoverable).
-- Owners already read, write and delete anything in their own folder.

create or replace function photo_thumb_path(p_storage_path text) returns text
language sql immutable as $$
  select regexp_replace(p_storage_path, '\.jpg$', '.thumb.jpg')
$$;

drop policy photos_approved_select on storage.objects;

create policy photos_approved_select on storage.objects for select to authenticated
  using (
    bucket_id = 'photos'
    and exists (
      select 1 from public.photos p
      where (p.storage_path = storage.objects.name or public.photo_thumb_path(p.storage_path) = storage.objects.name)
        and p.moderation_status = 'approved'
        and public.is_discoverable(auth.uid(), p.user_id)
    )
  );
