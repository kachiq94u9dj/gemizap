-- GemiZap Database Schema

-- プロフィール（ユーザー設定）
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  height_cm numeric not null default 165,
  current_weight_kg numeric not null default 55,
  activity_level text not null default 'moderate',
  goal text not null default 'cut',
  target_calories numeric,
  target_protein_g numeric,
  target_fat_g numeric,
  target_carbs_g numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 食事記録
create table meals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  meal_date date not null default current_date,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  name text not null,
  calories numeric not null default 0,
  protein_g numeric not null default 0,
  fat_g numeric not null default 0,
  carbs_g numeric not null default 0,
  photo_url text,
  notes text,
  created_at timestamptz default now()
);

-- 体重記録
create table weights (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  recorded_date date not null default current_date,
  weight_kg numeric not null,
  created_at timestamptz default now(),
  unique (user_id, recorded_date)
);

-- ワークアウト記録
create table workouts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  workout_date date not null default current_date,
  name text not null,
  notes text,
  created_at timestamptz default now()
);

-- セット記録
create table workout_sets (
  id uuid default gen_random_uuid() primary key,
  workout_id uuid references workouts on delete cascade not null,
  exercise_name text not null,
  set_number integer not null,
  reps integer,
  weight_kg numeric,
  created_at timestamptz default now()
);

-- ワークアウトテンプレート
create table workout_templates (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);

-- テンプレートの種目
create table template_exercises (
  id uuid default gen_random_uuid() primary key,
  template_id uuid references workout_templates on delete cascade not null,
  exercise_name text not null,
  default_sets integer not null default 3,
  default_reps integer not null default 10,
  default_weight_kg numeric,
  sort_order integer not null default 0
);

-- RLS (Row Level Security) 有効化
alter table profiles enable row level security;
alter table meals enable row level security;
alter table weights enable row level security;
alter table workouts enable row level security;
alter table workout_sets enable row level security;
alter table workout_templates enable row level security;
alter table template_exercises enable row level security;

-- RLS ポリシー
create policy "Users can manage their own profile" on profiles for all using (auth.uid() = id);
create policy "Users can manage their own meals" on meals for all using (auth.uid() = user_id);
create policy "Users can manage their own weights" on weights for all using (auth.uid() = user_id);
create policy "Users can manage their own workouts" on workouts for all using (auth.uid() = user_id);
create policy "Users can manage workout sets via workouts" on workout_sets for all using (
  exists (select 1 from workouts where workouts.id = workout_sets.workout_id and workouts.user_id = auth.uid())
);
create policy "Users can manage their own templates" on workout_templates for all using (auth.uid() = user_id);
create policy "Users can manage template exercises" on template_exercises for all using (
  exists (select 1 from workout_templates where workout_templates.id = template_exercises.template_id and workout_templates.user_id = auth.uid())
);

-- プロフィール自動作成
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
