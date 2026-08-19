-- Create public bucket for event cover images
insert into storage.buckets (id, name, public)
values ('event-images', 'event-images', true)
on conflict (id) do nothing;

-- Organizers can upload into their own folder: event-images/{user_id}/{filename}
create policy "Organizers can upload event images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'event-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Organizers can update files in their own folder
create policy "Organizers can update event images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'event-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Organizers can delete files in their own folder
create policy "Organizers can delete event images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'event-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Public read access (public bucket)
create policy "Public read access for event images"
on storage.objects for select
to public
using (bucket_id = 'event-images');
