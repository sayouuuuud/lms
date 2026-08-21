BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS code varchar(80),
  ADD COLUMN IF NOT EXISTS billing_period varchar(16) NOT NULL DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS scope_mode varchar(32) NOT NULL DEFAULT 'all_released',
  ADD COLUMN IF NOT EXISTS allow_manual_assignment boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS duration_days integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS stage_id uuid,
  ADD COLUMN IF NOT EXISTS branch_id uuid;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscription_plans' AND column_name = 'name'
  ) THEN
    EXECUTE $sql$
      UPDATE public.subscription_plans
      SET title = COALESCE(NULLIF(title, ''), NULLIF(name, ''), 'خطة اشتراك')
      WHERE title IS NULL OR title = ''
    $sql$;
  ELSE
    UPDATE public.subscription_plans
    SET title = 'خطة اشتراك'
    WHERE title IS NULL OR title = '';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscription_plans' AND column_name = 'billing_interval'
  ) THEN
    EXECUTE $sql$
      UPDATE public.subscription_plans
      SET billing_period = CASE LOWER(COALESCE(billing_interval, ''))
        WHEN 'monthly' THEN 'month'
        WHEN 'month' THEN 'month'
        WHEN 'yearly' THEN 'year'
        WHEN 'annual' THEN 'year'
        WHEN 'year' THEN 'year'
        WHEN 'term' THEN 'term'
        ELSE COALESCE(NULLIF(LOWER(billing_interval), ''), 'custom')
      END
      WHERE billing_period IS NULL OR billing_period = 'custom'
    $sql$;
  END IF;
END $$;

ALTER TABLE public.subscription_plans
  ALTER COLUMN code DROP NOT NULL,
  ALTER COLUMN title SET DEFAULT 'خطة اشتراك',
  ALTER COLUMN title SET NOT NULL;

UPDATE public.subscription_plans
SET description = ''
WHERE description IS NULL;

ALTER TABLE public.subscription_plans
  ALTER COLUMN description SET DEFAULT '',
  ALTER COLUMN description SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS subscription_plans_code_unique
  ON public.subscription_plans (code)
  WHERE code IS NOT NULL;

CREATE INDEX IF NOT EXISTS subscription_plans_scope_active_idx
  ON public.subscription_plans (scope_mode, is_active);

CREATE TABLE IF NOT EXISTS public.student_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz NOT NULL,
  status varchar(24) NOT NULL DEFAULT 'active',
  source varchar(16) NOT NULL DEFAULT 'legacy',
  payment_status varchar(16) NOT NULL DEFAULT 'waived',
  payment_reference text,
  grace_until timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  suspended_at timestamptz,
  suspend_reason text,
  assigned_by uuid,
  updated_by uuid,
  last_payment_at timestamptz,
  next_billing_at timestamptz,
  plan_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_subscriptions
  ADD COLUMN IF NOT EXISTS source varchar(16) NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS payment_status varchar(16) NOT NULL DEFAULT 'waived',
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS grace_until timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspend_reason text,
  ADD COLUMN IF NOT EXISTS assigned_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS last_payment_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_billing_at timestamptz,
  ADD COLUMN IF NOT EXISTS plan_snapshot jsonb;

DO $$
BEGIN
  IF to_regclass('public.subscriptions') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO public.student_subscriptions (
        id, student_id, plan_id, start_date, end_date, status, source,
        payment_status, payment_reference, cancelled_at, created_at, updated_at
      )
      SELECT
        s.id,
        st.id,
        s.plan_id,
        COALESCE(s.current_period_start, s.started_at, s.created_at),
        COALESCE(s.current_period_end, s.started_at, s.created_at + interval '30 days'),
        CASE s.status
          WHEN 'active' THEN 'active'
          WHEN 'expired' THEN 'expired'
          WHEN 'canceled' THEN 'cancelled'
          WHEN 'paused' THEN 'suspended'
          WHEN 'past_due' THEN 'grace'
          ELSE 'suspended'
        END,
        'import',
        'waived',
        s.provider_subscription_id,
        s.canceled_at,
        s.created_at,
        s.updated_at
      FROM public.subscriptions s
      JOIN public.students st ON st.user_id = s.user_id
      WHERE NOT EXISTS (
        SELECT 1 FROM public.student_subscriptions existing WHERE existing.id = s.id
      )
    $sql$;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS student_subscriptions_student_end_idx
  ON public.student_subscriptions (student_id, end_date);

CREATE INDEX IF NOT EXISTS student_subscriptions_status_end_idx
  ON public.student_subscriptions (status, end_date);

CREATE TABLE IF NOT EXISTS public.subscription_plan_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  scope_type varchar(32) NOT NULL,
  scope_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscription_plan_scopes_type_check CHECK (scope_type IN ('all_released', 'branch', 'stage', 'term', 'course', 'lecture'))
);

CREATE UNIQUE INDEX IF NOT EXISTS subscription_plan_scopes_unique_target_idx
  ON public.subscription_plan_scopes (plan_id, scope_type, scope_id)
  WHERE scope_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS subscription_plan_scopes_all_released_idx
  ON public.subscription_plan_scopes (plan_id, scope_type)
  WHERE scope_type = 'all_released';

CREATE INDEX IF NOT EXISTS subscription_plan_scopes_lookup_idx
  ON public.subscription_plan_scopes (scope_type, scope_id);

DO $$
BEGIN
  IF to_regclass('public.subscription_events') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'subscription_events' AND column_name = 'reason'
     ) THEN
    ALTER TABLE public.subscription_events RENAME TO subscription_events_legacy;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.subscription_events (
  id uuid CONSTRAINT subscription_events_governance_pkey PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.student_subscriptions(id) ON DELETE CASCADE,
  event_type varchar(40) NOT NULL,
  actor_profile_id uuid,
  from_status varchar(24),
  to_status varchar(24),
  reason text,
  payment_reference text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscription_events_subscription_created_idx
  ON public.subscription_events (subscription_id, created_at DESC);

CREATE INDEX IF NOT EXISTS subscription_events_type_created_idx
  ON public.subscription_events (event_type, created_at DESC);

INSERT INTO public.subscription_plan_scopes (plan_id, scope_type, scope_id)
SELECT id, 'branch', branch_id
FROM public.subscription_plans
WHERE branch_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.subscription_plan_scopes (plan_id, scope_type, scope_id)
SELECT id, 'stage', stage_id
FROM public.subscription_plans
WHERE stage_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.subscription_plan_scopes (plan_id, scope_type, scope_id)
SELECT id, 'all_released', NULL
FROM public.subscription_plans
WHERE branch_id IS NULL AND stage_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.subscription_plan_scopes s
    WHERE s.plan_id = subscription_plans.id
  )
ON CONFLICT DO NOTHING;

UPDATE public.subscription_plans p
SET scope_mode = CASE
  WHEN EXISTS (SELECT 1 FROM public.subscription_plan_scopes s WHERE s.plan_id = p.id AND s.scope_type <> 'all_released') THEN 'selected'
  ELSE 'all_released'
END;

UPDATE public.student_subscriptions ss
SET status = CASE ss.status
  WHEN 'canceled' THEN 'cancelled'
  WHEN 'past_due' THEN 'grace'
  WHEN 'paused' THEN 'suspended'
  WHEN 'pending' THEN 'suspended'
  ELSE ss.status
END
WHERE ss.status NOT IN ('active', 'grace', 'expired', 'cancelled', 'suspended');

UPDATE public.student_subscriptions ss
SET plan_snapshot = jsonb_build_object(
  'id', p.id::text,
  'title', p.title,
  'price', p.price::text,
  'duration_days', p.duration_days,
  'billing_period', p.billing_period,
  'scope_mode', p.scope_mode
)
FROM public.subscription_plans p
WHERE ss.plan_id = p.id AND ss.plan_snapshot IS NULL;

INSERT INTO public.subscription_events (subscription_id, event_type, to_status, metadata)
SELECT ss.id, 'legacy_imported', ss.status, jsonb_build_object('source', 'pre-governance-migration')
FROM public.student_subscriptions ss
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscription_events e WHERE e.subscription_id = ss.id
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscription_plans_billing_period_check') THEN
    ALTER TABLE public.subscription_plans
      ADD CONSTRAINT subscription_plans_billing_period_check
      CHECK (billing_period IN ('month', 'term', 'year', 'custom'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscription_plans_scope_mode_check') THEN
    ALTER TABLE public.subscription_plans
      ADD CONSTRAINT subscription_plans_scope_mode_check
      CHECK (scope_mode IN ('all_released', 'selected'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_subscriptions_status_check') THEN
    ALTER TABLE public.student_subscriptions
      ADD CONSTRAINT student_subscriptions_status_check
      CHECK (status IN ('active', 'grace', 'expired', 'cancelled', 'suspended'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_subscriptions_source_check') THEN
    ALTER TABLE public.student_subscriptions
      ADD CONSTRAINT student_subscriptions_source_check
      CHECK (source IN ('manual', 'order', 'import', 'system', 'legacy'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_subscriptions_payment_status_check') THEN
    ALTER TABLE public.student_subscriptions
      ADD CONSTRAINT student_subscriptions_payment_status_check
      CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'refunded', 'waived'));
  END IF;
END $$;

COMMIT;
