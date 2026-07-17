-- ============================================================
--  שפרה ופועה — סכמת מסד נתונים
--  להרצה ב-Supabase: SQL Editor > New query > הדבקה > Run
-- ============================================================

-- ---------- טבלאות ----------

create table if not exists users (
  id text primary key,
  auth_id uuid references auth.users(id) on delete set null,
  name text not null,
  phone text,
  role text not null check (role in ('admin', 'manager', 'volunteer')),
  volunteer_id text,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists mothers (
  id text primary key,
  mother_name text not null,
  last_name text,
  child_name text,
  phone text,
  address text,
  entry_code text,
  neighborhood text,
  birth_date date,
  source text,
  notes text,
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists volunteers (
  id text primary key,
  name text not null,
  phone text,
  address text,
  birthday date,
  role_type text,
  availability text,
  created_at timestamptz default now()
);

create table if not exists contacts (
  id text primary key,
  name text not null,
  phone text,
  address text,
  neighborhood text,
  gifts_in_stock int default 0,
  created_at timestamptz default now()
);

create table if not exists inventory (
  id text primary key,
  name text not null,
  qty int default 0,
  min_qty int default 0,
  created_at timestamptz default now()
);

create table if not exists meals (
  id text primary key,
  mother_id text references mothers(id) on delete cascade,
  date date not null,
  cook_id text references volunteers(id) on delete set null,
  driver_id text references volunteers(id) on delete set null,
  delivery_time text,
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists kits (
  id text primary key,
  mother_id text references mothers(id) on delete cascade,
  offered_at date,
  accepted boolean,
  delivered_at date,
  created_at timestamptz default now()
);

create table if not exists "birthGifts" (
  id text primary key,
  mother_id text references mothers(id) on delete cascade,
  letter_ordered boolean default false,
  accessories boolean default false,
  delivered_at date,
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists "yearGifts" (
  id text primary key,
  mother_id text references mothers(id) on delete cascade,
  contact_id text references contacts(id) on delete set null,
  due_date date,
  collected_at date,
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists events (
  id text primary key,
  date date not null,
  location text,
  chairs int,
  refreshments int,
  speakers text,
  invitees jsonb default '[]',
  attendance jsonb default '[]',
  created_at timestamptz default now()
);

create table if not exists timeline (
  id text primary key,
  mother_id text references mothers(id) on delete cascade,
  date date,
  type text,
  text text,
  created_at timestamptz default now()
);

create table if not exists notes (
  id text primary key,
  from_user_id text references users(id) on delete cascade,
  text text not null,
  date date,
  read boolean default false,
  created_at timestamptz default now()
);

create table if not exists orders (
  id text primary key,
  volunteer_id text,
  items jsonb default '[]',
  date date,
  created_at timestamptz default now()
);

-- ---------- אינדקסים ----------
create index if not exists idx_meals_date on meals(date);
create index if not exists idx_meals_mother on meals(mother_id);
create index if not exists idx_meals_cook on meals(cook_id);
create index if not exists idx_meals_driver on meals(driver_id);
create index if not exists idx_timeline_mother on timeline(mother_id);
create index if not exists idx_mothers_nbhd on mothers(neighborhood);
create index if not exists idx_mothers_status on mothers(status);

-- ============================================================
--  הרשאות (Row Level Security)
-- ============================================================

-- מחזיר את התפקיד של המשתמשת המחוברת
create or replace function my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from users where auth_id = auth.uid() limit 1;
$$;

-- מחזיר את מזהה כרטיס המתנדבת המקושר למשתמשת המחוברת
create or replace function my_volunteer_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select volunteer_id from users where auth_id = auth.uid() limit 1;
$$;

create or replace function is_staff()
returns boolean
language sql
stable
as $$
  select my_role() in ('admin', 'manager');
$$;

-- הפעלת RLS על כל הטבלאות
alter table users enable row level security;
alter table mothers enable row level security;
alter table volunteers enable row level security;
alter table contacts enable row level security;
alter table inventory enable row level security;
alter table meals enable row level security;
alter table kits enable row level security;
alter table "birthGifts" enable row level security;
alter table "yearGifts" enable row level security;
alter table events enable row level security;
alter table timeline enable row level security;
alter table notes enable row level security;
alter table orders enable row level security;

-- ------------------------------------------------------------
--  הרשאות גישה ל-Data API.
--  בלי אלה PostgREST מחזיר "permission denied" על כל בקשה,
--  גם כשה-RLS מוגדר כהלכה. מפורש עדיף מהסתמכות על הגדרת
--  "Automatically expose new tables" בממשק.
--  זה לא פותח את הנתונים — כל שורה עדיין עוברת דרך ה-RLS.
-- ------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;

-- ------------------------------------------------------------
--  ל-create policy אין "if not exists", ולכן הרצה חוזרת של
--  הקובץ הייתה נכשלת. מוחקים כל מדיניות לפני יצירתה מחדש —
--  כך אפשר להריץ את הקובץ שוב ושוב בבטחה.
-- ------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on %I.%I',
                   r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- ---------- מנהלות: גישה מלאה ----------
-- (מנהלת משנית זהה למנהלת ראשית פרט לניהול משתמשות, שמוגבל בהמשך)
do $$
declare t text;
begin
  foreach t in array array['mothers','volunteers','contacts','meals','kits',
                           'birthGifts','yearGifts','events','timeline','orders']
  loop
    execute format(
      'create policy staff_all on %I for all to authenticated using (is_staff()) with check (is_staff())', t
    );
  end loop;
end $$;

-- ---------- מלאי ----------
-- מנהלות: הכל. מתנדבות: קריאה בלבד (למסך ההזמנה) + עדכון כמות דרך הזמנה
create policy inventory_staff on inventory for all to authenticated
  using (is_staff()) with check (is_staff());

create policy inventory_read on inventory for select to authenticated
  using (true);

create policy inventory_order_update on inventory for update to authenticated
  using (my_role() = 'volunteer') with check (my_role() = 'volunteer');

-- ---------- מתנדבות: רואות רק את השיבוצים שלהן ----------
create policy meals_own on meals for select to authenticated
  using (cook_id = my_volunteer_id() or driver_id = my_volunteer_id());

-- מתנדבת רשאית לסמן "בוצע" על השיבוץ שלה בלבד
create policy meals_own_update on meals for update to authenticated
  using (cook_id = my_volunteer_id() or driver_id = my_volunteer_id())
  with check (cook_id = my_volunteer_id() or driver_id = my_volunteer_id());

-- כדי לראות למי היא מביאה — פרטי היולדת של השיבוץ שלה בלבד
create policy mothers_own_assignment on mothers for select to authenticated
  using (
    exists (
      select 1 from meals m
      where m.mother_id = mothers.id
        and (m.cook_id = my_volunteer_id() or m.driver_id = my_volunteer_id())
    )
  );

-- ---------- הזמנות ציוד ----------
create policy orders_own_insert on orders for insert to authenticated
  with check (volunteer_id = my_volunteer_id());

create policy orders_own_read on orders for select to authenticated
  using (volunteer_id = my_volunteer_id() or is_staff());

-- ---------- משתמשות ----------
-- כל אחת רואה את עצמה; רק מנהלת ראשית מנהלת את הרשימה
create policy users_self on users for select to authenticated
  using (auth_id = auth.uid() or is_staff());

create policy users_admin_all on users for all to authenticated
  using (my_role() = 'admin') with check (my_role() = 'admin');

-- ---------- הערות למנהלת הראשית ----------
create policy notes_staff on notes for all to authenticated
  using (is_staff()) with check (is_staff());

-- ============================================================
--  משתמשת ראשונה
--  ------------------------------------------------------------
--  1. Authentication > Users > Add user — יוצרים משתמשת עם אימייל וסיסמה
--  2. מעתיקים את ה-UUID שנוצר ומדביקים כאן במקום PASTE_UUID_HERE
--  3. מריצים את השורה
-- ============================================================
-- insert into users (id, auth_id, name, role)
-- values ('u-admin', 'PASTE_UUID_HERE', 'שם המנהלת', 'admin');
