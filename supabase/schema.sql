create table if not exists categories (
  id serial primary key,
  type text not null,
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists books (
  id serial primary key,
  title text not null,
  author text default '',
  language text not null,
  subcategory text not null,
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists issuances (
  id serial primary key,
  book_id integer not null references books(id) on delete cascade,
  student_name text not null,
  class_name text not null,
  roll_no text not null,
  issue_date date not null,
  due_date date not null,
  returned_at timestamptz,
  created_at timestamptz not null default now()
);

insert into categories (type, name)
values
  ('language', 'English'),
  ('language', 'Urdu'),
  ('subcategory', 'Story'),
  ('subcategory', 'Self-help'),
  ('subcategory', 'Islamic'),
  ('subcategory', 'Educational'),
  ('subcategory', 'Nature'),
  ('subcategory', 'Health')
on conflict (name) do nothing;