-- HUNGER: reviewed API entrypoints in a private schema; public wrappers are invokers.
-- Capacity is changed only while holding the listing row lock.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '' check(length(display_name)<=80),
 role text not null default 'worker' check(role in ('worker','host','admin')),
 language text not null default 'en' check(language in ('en','kn','hi')),
 work_areas text[] not null default '{}' check(cardinality(work_areas)<=3 and length(array_to_string(work_areas,','))<=242),
 on_duty boolean not null default false, created_at timestamptz not null default now()
);
create table public.venues (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id),
 name text not null check(length(trim(name)) between 2 and 80), area text not null check(length(area) between 2 and 80),
 address text not null check(length(address) between 5 and 240), latitude double precision not null check(latitude between -90 and 90),
 longitude double precision not null check(longitude between -180 and 180),
 verification text not null default 'pending' check(verification in ('pending','approved','rejected')),
 consent boolean not null check(consent), created_at timestamptz not null default now()
);
create table private.venue_documents(venue_id uuid primary key references public.venues(id) on delete cascade, path text, review_note text);
create table public.listings (
 id uuid primary key default gen_random_uuid(), venue_id uuid not null references public.venues(id),
 title text not null check(length(trim(title)) between 3 and 100), description text not null check(length(description) between 3 and 600),
 diet text not null check(diet in ('veg','nonveg')), total_portions integer not null check(total_portions between 1 and 5000),
 reserved_count integer not null default 0 check(reserved_count>=0), served_count integer not null default 0 check(served_count>=0),
 cooked_at timestamptz not null, starts_at timestamptz not null, ends_at timestamptz not null,
 instructions text not null check(length(instructions) between 3 and 400),
 unserved_only boolean not null check(unserved_only), status text not null default 'open' check(status in ('open','closed')),
 created_at timestamptz not null default now(), check(cooked_at<=starts_at),check(starts_at<ends_at),
 check(reserved_count+served_count<=total_portions)
);
create table public.reservations (
 id uuid primary key default gen_random_uuid(), worker_id uuid not null references public.profiles(id),
 listing_id uuid not null references public.listings(id), code text not null check(code~'^[0-9]{4}$'),
 status text not null default 'active' check(status in ('active','served','cancelled','expired')),
 created_at timestamptz not null default now(), expires_at timestamptz not null,
 served_at timestamptz, served_by uuid references public.profiles(id)
);
create unique index one_active_per_worker on public.reservations(worker_id) where status='active';
create unique index unique_active_backup_code on public.reservations(listing_id,code) where status='active';
create index reservations_listing on public.reservations(listing_id,status,expires_at);
create index listings_discovery on public.listings(status,ends_at,venue_id);
create index venues_owner on public.venues(owner_id);
create index listings_venue on public.listings(venue_id);
create index reservations_worker on public.reservations(worker_id,created_at desc);
create index reservations_served_by on public.reservations(served_by);
create table public.feedback (
 id uuid primary key default gen_random_uuid(), reservation_id uuid not null unique references public.reservations(id),
 worker_id uuid not null references public.profiles(id), rating integer not null check(rating between 1 and 5),
 comment text not null default '' check(length(comment)<=600),created_at timestamptz not null default now()
);
create table public.reports (
 id uuid primary key default gen_random_uuid(), reporter_id uuid not null references public.profiles(id),
 listing_id uuid not null references public.listings(id), reason text not null check(length(trim(reason)) between 8 and 1000),
 status text not null default 'open' check(status in ('open','resolved')),resolution text,
 created_at timestamptz not null default now()
);
create table public.activity (
 id bigint generated always as identity primary key, actor_id uuid references public.profiles(id),
 action text not null, entity_id uuid, detail text not null default '', created_at timestamptz not null default now()
);
create index feedback_worker on public.feedback(worker_id);
create index reports_reporter on public.reports(reporter_id);
create index reports_listing on public.reports(listing_id);
create index activity_actor on public.activity(actor_id);
create table private.serve_attempts(actor_id uuid not null, attempted_at timestamptz not null default now());
create index serve_attempts_lookup on private.serve_attempts(actor_id,attempted_at);

create function private.new_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 -- Metadata can supply a name, never an authorization role.
 insert into public.profiles(id,display_name) values(new.id,left(coalesce(new.raw_user_meta_data->>'display_name',''),80));
 return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.new_profile();
-- Backfill existing accounts safely; all begin as workers.
insert into public.profiles(id,display_name) select id,left(coalesce(raw_user_meta_data->>'display_name',''),80) from auth.users on conflict(id) do nothing;
create function private.actor() returns uuid language plpgsql stable security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 return auth.uid();
end $$;
create function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.profiles where id=auth.uid() and role='admin');
$$;
create function private.owns_venue(p_venue uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.venues where id=p_venue and owner_id=auth.uid());
$$;

alter table public.profiles enable row level security;
alter table public.venues enable row level security;
alter table public.listings enable row level security;
alter table public.reservations enable row level security;
alter table public.feedback enable row level security;
alter table public.reports enable row level security;
alter table public.activity enable row level security;
alter table private.venue_documents enable row level security;
alter table private.serve_attempts enable row level security;
create policy profiles_read on public.profiles for select to authenticated using(id=(select auth.uid()) or (select private.is_admin()));
create policy profiles_edit on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy venues_read on public.venues for select to anon,authenticated using(verification='approved' or owner_id=(select auth.uid()) or (select private.is_admin()));
create policy listings_read on public.listings for select to anon,authenticated using(
 exists(select 1 from public.venues v where v.id=venue_id and v.verification='approved') or private.owns_venue(venue_id) or (select private.is_admin()));
create policy reservations_read on public.reservations for select to authenticated using(worker_id=(select auth.uid()) or (select private.is_admin()) or exists(select 1 from public.listings l where l.id=listing_id and private.owns_venue(l.venue_id)));
create policy feedback_read on public.feedback for select to authenticated using(worker_id=(select auth.uid()) or (select private.is_admin()));
create policy reports_read on public.reports for select to authenticated using(reporter_id=(select auth.uid()) or (select private.is_admin()));
create policy activity_read on public.activity for select to authenticated using((select private.is_admin()));
revoke all on public.profiles,public.venues,public.listings,public.reservations,public.feedback,public.reports,public.activity from anon,authenticated;
grant select on public.venues,public.listings to anon,authenticated;
grant select on public.profiles,public.reservations,public.feedback,public.reports,public.activity to authenticated;
grant update(display_name,language,work_areas,on_duty) on public.profiles to authenticated;

create view public.meal_feed with(security_invoker=true) as
 select l.*,v.name as venue_name,v.area,v.address,v.latitude,v.longitude,v.verification,
 (l.total_portions-l.reserved_count-l.served_count) as available_portions
 from public.listings l join public.venues v on v.id=l.venue_id;
grant select on public.meal_feed to anon,authenticated;

-- Internal helper. Never executable by API roles. Caller already holds listing FOR UPDATE.
create function private.expire_listing(p_listing uuid) returns void language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 update public.reservations set status='expired' where listing_id=p_listing and status='active' and expires_at<=clock_timestamp();
 get diagnostics n=row_count;
 if n>0 then update public.listings set reserved_count=reserved_count-n where id=p_listing; end if;
end $$;
create function private.reserve(p_listing uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.actor(); old public.reservations; meal public.listings; result public.reservations; backup text;
begin
 perform 1 from public.profiles where id=uid for update;
 select * into old from public.reservations where worker_id=uid and status='active';
 -- Global listing lock order avoids deadlocks when a previous token has expired elsewhere.
 perform 1 from public.listings where id=p_listing or id=old.listing_id order by id for update;
 if old.id is not null then perform private.expire_listing(old.listing_id); end if;
 perform private.expire_listing(p_listing);
 select * into old from public.reservations where worker_id=uid and status='active';
 if old.id is not null then
  if old.listing_id=p_listing then return to_jsonb(old); end if;
  raise exception 'ONE_ACTIVE_RESERVATION';
 end if;
 select * into meal from public.listings where id=p_listing;
 if meal.id is null or meal.status<>'open' or meal.starts_at>clock_timestamp() or meal.ends_at<=clock_timestamp() then raise exception 'SERVING_WINDOW_CLOSED'; end if;
 if not exists(select 1 from public.venues where id=meal.venue_id and verification='approved') then raise exception 'VENUE_NOT_VERIFIED'; end if;
 if meal.reserved_count+meal.served_count>=meal.total_portions then raise exception 'NO_PORTIONS_LEFT'; end if;
 loop
  backup:=lpad(floor(random()*10000)::integer::text,4,'0');
  exit when not exists(select 1 from public.reservations where listing_id=p_listing and code=backup and status='active');
 end loop;
 insert into public.reservations(worker_id,listing_id,code,expires_at) values(uid,p_listing,backup,least(clock_timestamp()+interval '30 minutes',meal.ends_at)) returning * into result;
 update public.listings set reserved_count=reserved_count+1 where id=p_listing;
 insert into public.activity(actor_id,action,entity_id) values(uid,'meal_reserved',result.id);
 return to_jsonb(result);
end $$;
create function private.cancel(p_reservation uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.actor(); r public.reservations;
begin
 perform 1 from public.profiles where id=uid for update;
 select * into r from public.reservations where id=p_reservation and worker_id=uid;
 if r.id is null then raise exception 'RESERVATION_NOT_FOUND'; end if;
 perform 1 from public.listings where id=r.listing_id for update;
 perform private.expire_listing(r.listing_id);
 select * into r from public.reservations where id=p_reservation;
 if r.status='expired' then return to_jsonb(r); end if;
 if r.status<>'active' then raise exception 'RESERVATION_NOT_ACTIVE'; end if;
 update public.reservations set status='cancelled' where id=r.id returning * into r;
 update public.listings set reserved_count=reserved_count-1 where id=r.listing_id;
 insert into public.activity(actor_id,action,entity_id) values(uid,'reservation_cancelled',r.id);
 return to_jsonb(r);
end $$;
create function private.serve(p_listing uuid,p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.actor(); meal public.listings; r public.reservations;
begin
 -- Serialize attempts per server-controlled actor, including unsuccessful attempts.
 perform pg_advisory_xact_lock(hashtextextended(uid::text,19));
 delete from private.serve_attempts where actor_id=uid and attempted_at<clock_timestamp()-interval '1 day';
 if (select count(*) from private.serve_attempts where actor_id=uid and attempted_at>now()-interval '5 minutes')>=20 then return jsonb_build_object('error','TOO_MANY_ATTEMPTS'); end if;
 select * into meal from public.listings where id=p_listing for update;
 if meal.id is null or not (private.owns_venue(meal.venue_id) or private.is_admin()) then raise exception 'NOT_AUTHORIZED'; end if;
 insert into private.serve_attempts(actor_id) values(uid);
 perform private.expire_listing(p_listing);
 if meal.status<>'open' or meal.starts_at>clock_timestamp() or meal.ends_at<=clock_timestamp() then return jsonb_build_object('error','SERVING_WINDOW_CLOSED'); end if;
 select * into r from public.reservations where listing_id=p_listing and status='active' and (id::text=p_token or code=p_token) for update;
 if r.id is null then return jsonb_build_object('error','INVALID_OR_USED_TOKEN'); end if;
 update public.reservations set status='served',served_at=clock_timestamp(),served_by=uid where id=r.id returning * into r;
 update public.listings set reserved_count=reserved_count-1,served_count=served_count+1 where id=p_listing;
 insert into public.activity(actor_id,action,entity_id) values(uid,'meal_served',r.id);
 return to_jsonb(r);
end $$;
create function private.refresh_tokens() returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.actor(); x record;
begin
 for x in select distinct l.id from public.listings l join public.reservations r on r.listing_id=l.id where r.status='active' and r.expires_at<=clock_timestamp() order by l.id loop
  perform 1 from public.listings where id=x.id for update;
  perform private.expire_listing(x.id);
 end loop;
end $$;
create function private.apply_venue(p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.actor(); v public.venues;
begin
 if (select count(*) from public.venues where owner_id=uid)>=5 then raise exception 'VENUE_LIMIT_REACHED'; end if;
 if coalesce((p_data->>'consent')::boolean,false) is not true then raise exception 'CONSENT_REQUIRED'; end if;
 insert into public.venues(owner_id,name,area,address,latitude,longitude,consent) values(uid,p_data->>'name',p_data->>'area',p_data->>'address',(p_data->>'latitude')::float8,(p_data->>'longitude')::float8,true) returning * into v;
 if p_data->>'document_path' is not null then
  if split_part(p_data->>'document_path','/',1)<>uid::text then raise exception 'INVALID_DOCUMENT_PATH'; end if;
  insert into private.venue_documents(venue_id,path) values(v.id,p_data->>'document_path');
 end if;
 update public.profiles set role='host' where id=uid and role='worker';
 insert into public.activity(actor_id,action,entity_id) values(uid,'venue_applied',v.id);
 return to_jsonb(v);
end $$;
create function private.save_listing(p_data jsonb,p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.actor(); v uuid:=(p_data->>'venue_id')::uuid; l public.listings;
begin
 if not private.owns_venue(v) then raise exception 'NOT_AUTHORIZED'; end if;
 if not exists(select 1 from public.venues where id=v and verification='approved') then raise exception 'VENUE_NOT_VERIFIED'; end if;
 if coalesce((p_data->>'unserved_only')::boolean,false) is not true then raise exception 'UNSERVED_FOOD_ONLY'; end if;
 if (p_data->>'ends_at')::timestamptz<=now() then raise exception 'END_TIME_MUST_BE_FUTURE'; end if;
 if p_id is null then
  insert into public.listings(venue_id,title,description,diet,total_portions,cooked_at,starts_at,ends_at,instructions,unserved_only)
  values(v,p_data->>'title',p_data->>'description',p_data->>'diet',(p_data->>'total_portions')::integer,(p_data->>'cooked_at')::timestamptz,(p_data->>'starts_at')::timestamptz,(p_data->>'ends_at')::timestamptz,p_data->>'instructions',true) returning * into l;
 else
  select * into l from public.listings where id=p_id for update;
  if l.id is null or l.venue_id<>v then raise exception 'NOT_AUTHORIZED'; end if;
  perform private.expire_listing(p_id);
  select * into l from public.listings where id=p_id;
  if (p_data->>'total_portions')::integer<l.reserved_count+l.served_count then raise exception 'PORTIONS_BELOW_COMMITTED'; end if;
  if l.reserved_count>0 and ((p_data->>'starts_at')::timestamptz<>l.starts_at or (p_data->>'ends_at')::timestamptz<>l.ends_at) then raise exception 'CANNOT_CHANGE_RESERVED_WINDOW'; end if;
  update public.listings set title=p_data->>'title',description=p_data->>'description',diet=p_data->>'diet',total_portions=(p_data->>'total_portions')::integer,cooked_at=(p_data->>'cooked_at')::timestamptz,starts_at=(p_data->>'starts_at')::timestamptz,ends_at=(p_data->>'ends_at')::timestamptz,instructions=p_data->>'instructions' where id=p_id returning * into l;
 end if;
 insert into public.activity(actor_id,action,entity_id) values(uid,'listing_saved',l.id);
 return to_jsonb(l);
end $$;
create function private.close_listing(p_listing uuid) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.actor(); l public.listings;
begin
 select * into l from public.listings where id=p_listing for update;
 if l.id is null or not (private.owns_venue(l.venue_id) or private.is_admin()) then raise exception 'NOT_AUTHORIZED'; end if;
 update public.reservations set status='expired' where listing_id=p_listing and status='active';
 update public.listings set status='closed',reserved_count=0 where id=p_listing;
 insert into public.activity(actor_id,action,entity_id) values(uid,'listing_closed',p_listing);
end $$;
create function private.review_venue(p_venue uuid,p_approve boolean,p_note text) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.actor();
begin
 if not private.is_admin() then raise exception 'NOT_AUTHORIZED'; end if;
 if length(trim(p_note))<4 then raise exception 'REVIEW_NOTE_REQUIRED'; end if;
 if not exists(select 1 from public.venues where id=p_venue) then raise exception 'VENUE_NOT_FOUND'; end if;
 if not p_approve and exists(select 1 from public.listings where venue_id=p_venue and status='open') then raise exception 'CLOSE_VENUE_LISTINGS_FIRST'; end if;
 update public.venues set verification=case when p_approve then 'approved' else 'rejected' end where id=p_venue;
 insert into private.venue_documents(venue_id,review_note) values(p_venue,left(p_note,600)) on conflict(venue_id) do update set review_note=excluded.review_note;
 insert into public.activity(actor_id,action,entity_id,detail) values(uid,'venue_reviewed',p_venue,left(p_note,600));
end $$;
create function private.venue_document(p_venue uuid) returns text language plpgsql stable security definer set search_path='' as $$
begin
 perform private.actor();
 if not (private.is_admin() or private.owns_venue(p_venue)) then raise exception 'NOT_AUTHORIZED'; end if;
 return (select path from private.venue_documents where venue_id=p_venue);
end $$;
create function private.submit_feedback(p_reservation uuid,p_rating integer,p_comment text) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.actor();
begin
 if not exists(select 1 from public.reservations where id=p_reservation and worker_id=uid and status='served') then raise exception 'SERVED_MEAL_REQUIRED'; end if;
 insert into public.feedback(reservation_id,worker_id,rating,comment) values(p_reservation,uid,p_rating,p_comment);
end $$;
create function private.report_listing(p_listing uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.actor();
begin
 insert into public.reports(reporter_id,listing_id,reason) values(uid,p_listing,p_reason);
end $$;
create function private.resolve_report(p_report uuid,p_note text) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.actor();
begin
 if not private.is_admin() then raise exception 'NOT_AUTHORIZED'; end if;
 if length(trim(p_note))<4 then raise exception 'RESOLUTION_REQUIRED'; end if;
 update public.reports set status='resolved',resolution=left(p_note,600) where id=p_report;
 if not found then raise exception 'REPORT_NOT_FOUND'; end if;
 insert into public.activity(actor_id,action,entity_id,detail) values(uid,'report_resolved',p_report,left(p_note,600));
end $$;

-- Only these wrappers are exposed to PostgREST. All privileged logic stays private.
create function public.reserve_meal(p_listing uuid) returns jsonb language sql security invoker set search_path='' as $$select private.reserve(p_listing)$$;
create function public.cancel_reservation(p_reservation uuid) returns jsonb language sql security invoker set search_path='' as $$select private.cancel(p_reservation)$$;
create function public.serve_meal(p_listing uuid,p_token text) returns jsonb language sql security invoker set search_path='' as $$select private.serve(p_listing,p_token)$$;
create function public.refresh_expired() returns void language sql security invoker set search_path='' as $$select private.refresh_tokens()$$;
create function public.apply_venue(p_data jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.apply_venue(p_data)$$;
create function public.save_listing(p_data jsonb,p_id uuid default null) returns jsonb language sql security invoker set search_path='' as $$select private.save_listing(p_data,p_id)$$;
create function public.close_listing(p_listing uuid) returns void language sql security invoker set search_path='' as $$select private.close_listing(p_listing)$$;
create function public.review_venue(p_venue uuid,p_approve boolean,p_note text) returns void language sql security invoker set search_path='' as $$select private.review_venue(p_venue,p_approve,p_note)$$;
create function public.venue_document(p_venue uuid) returns text language sql security invoker set search_path='' as $$select private.venue_document(p_venue)$$;
create function public.submit_feedback(p_reservation uuid,p_rating integer,p_comment text) returns void language sql security invoker set search_path='' as $$select private.submit_feedback(p_reservation,p_rating,p_comment)$$;
create function public.report_listing(p_listing uuid,p_reason text) returns void language sql security invoker set search_path='' as $$select private.report_listing(p_listing,p_reason)$$;
create function public.resolve_report(p_report uuid,p_note text) returns void language sql security invoker set search_path='' as $$select private.resolve_report(p_report,p_note)$$;

revoke all on all functions in schema private from public,anon,authenticated;
grant execute on function private.actor(),private.is_admin(),private.owns_venue(uuid) to authenticated;
grant execute on function private.is_admin(),private.owns_venue(uuid) to anon;
grant execute on function private.reserve(uuid),private.cancel(uuid),private.serve(uuid,text),private.refresh_tokens(),private.apply_venue(jsonb),private.save_listing(jsonb,uuid),private.close_listing(uuid),private.review_venue(uuid,boolean,text),private.venue_document(uuid),private.submit_feedback(uuid,integer,text),private.report_listing(uuid,text),private.resolve_report(uuid,text) to authenticated;
revoke all on function public.reserve_meal(uuid),public.cancel_reservation(uuid),public.serve_meal(uuid,text),public.refresh_expired(),public.apply_venue(jsonb),public.save_listing(jsonb,uuid),public.close_listing(uuid),public.review_venue(uuid,boolean,text),public.venue_document(uuid),public.submit_feedback(uuid,integer,text),public.report_listing(uuid,text),public.resolve_report(uuid,text) from public,anon;
grant execute on function public.reserve_meal(uuid),public.cancel_reservation(uuid),public.serve_meal(uuid,text),public.refresh_expired(),public.apply_venue(jsonb),public.save_listing(jsonb,uuid),public.close_listing(uuid),public.review_venue(uuid,boolean,text),public.venue_document(uuid),public.submit_feedback(uuid,integer,text),public.report_listing(uuid,text),public.resolve_report(uuid,text) to authenticated;

-- Supabase-specific services are optional in the isolated PostgreSQL test harness.
do $$begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  alter publication supabase_realtime add table public.listings,public.reservations,public.venues;
 end if;
 if to_regclass('storage.buckets') is not null then
  insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('venue-documents','venue-documents',false,5242880,array['image/jpeg','image/png','application/pdf']) on conflict(id) do nothing;
  execute 'create policy documents_insert on storage.objects for insert to authenticated with check(bucket_id=''venue-documents'' and (storage.foldername(name))[1]=(select auth.uid())::text)';
  execute 'create policy documents_read on storage.objects for select to authenticated using(bucket_id=''venue-documents'' and ((storage.foldername(name))[1]=(select auth.uid())::text or (select private.is_admin())))';
 end if;
end $$;
