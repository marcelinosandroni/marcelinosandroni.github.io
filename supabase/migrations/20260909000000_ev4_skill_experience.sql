-- EV4: Anos de Experiência por Habilidade (Cálculo Automático)
-- Migration para enriquecer experiências profissionais com dados estruturados

-- Tabela para armazenar experiências profissionais enriquecidas
create table public.work_experiences (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  role text not null,
  start_date date not null,
  end_date date,
  location text,
  summary text,
  highlights jsonb not null default '[]'::jsonb,
  technologies jsonb not null default '[]'::jsonb,
  team_size integer,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índice para consultas por período
create index work_experiences_period_idx
  on public.work_experiences (start_date desc, end_date desc);

-- Índice para busca por tecnologia
create index work_experiences_technologies_idx
  on public.work_experiences using gin (technologies);

-- Tabela para armazenar cálculo de experiência por skill
create table public.skill_experience_cache (
  id uuid primary key default gen_random_uuid(),
  skill text not null unique,
  total_months integer not null default 0,
  years_of_experience integer not null default 0,
  months_of_experience integer not null default 0,
  experience_details jsonb not null default '[]'::jsonb,
  last_calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índice para ordenação por experiência
create index skill_experience_cache_years_idx
  on public.skill_experience_cache (years_of_experience desc, months_of_experience desc);

-- Função para calcular duração em meses
create or replace function calculate_months_between(start_d date, end_d date)
returns integer as $$
begin
  if end_d is null then
    return extract(year from age(now(), start_d)) * 12 + extract(month from age(now(), start_d));
  else
    return extract(year from age(end_d, start_d)) * 12 + extract(month from age(end_d, start_d));
  end if;
end;
$$ language plpgsql immutable;

-- Função para atualizar cache de skill experience
create or replace function update_skill_experience_cache()
returns trigger as $$
declare
  tech text;
  exp_months integer;
  merged_intervals jsonb;
begin
  -- Recalcular todas as skills quando houver mudança nas experiências
  DELETE FROM public.skill_experience_cache;
  
  INSERT INTO public.skill_experience_cache (skill, total_months, years_of_experience, months_of_experience, experience_details, last_calculated_at)
  SELECT 
    tech,
    SUM(COALESCE(calculate_months_between(start_date, end_date), 0)),
    0, -- Será atualizado abaixo
    0, -- Será atualizado abaixo
    jsonb_agg(
      jsonb_build_object(
        'company', company,
        'role', role,
        'start_date', start_date,
        'end_date', end_date,
        'duration_months', calculate_months_between(start_date, end_date)
      )
    ),
    now()
  FROM (
    SELECT DISTINCT ON (tech, start_date)
      tech,
      company,
      role,
      start_date,
      end_date
    FROM public.work_experiences,
    LATERAL jsonb_array_elements_text(technologies) AS tech
    ORDER BY tech, start_date, end_date DESC
  ) subq
  GROUP BY tech
  ON CONFLICT (skill) DO UPDATE SET
    total_months = EXCLUDED.total_months,
    experience_details = EXCLUDED.experience_details,
    last_calculated_at = now(),
    updated_at = now();
  
  -- Atualizar anos e meses
  UPDATE public.skill_experience_cache
  SET 
    years_of_experience = total_months / 12,
    months_of_experience = total_months % 12,
    updated_at = now();
  
  RETURN NULL;
end;
$$ language plpgsql;

-- Trigger para atualizar cache automaticamente
create trigger work_experiences_change
after insert or update or delete or truncate
on public.work_experiences
for each statement
execute function update_skill_experience_cache();

-- Habilitar RLS
alter table public.work_experiences enable row level security;
alter table public.skill_experience_cache enable row level security;

-- Políticas de acesso público (leitura)
create policy "work experiences are publicly readable"
  on public.work_experiences
  for select
  to anon, authenticated
  using (true);

create policy "skill experience cache is publicly readable"
  on public.skill_experience_cache
  for select
  to anon, authenticated
  using (true);

-- Comentários
comment on table public.work_experiences is 'Experiências profissionais enriquecidas com tecnologias utilizadas';
comment on table public.skill_experience_cache is 'Cache calculado automaticamente com anos de experiência por skill';
comment on column public.work_experiences.technologies is 'Array de tecnologias/skills utilizadas nesta experiência';
comment on column public.skill_experience_cache.experience_details is 'Detalhes de cada experiência que contribuiu para esta skill';
