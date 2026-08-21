BEGIN;

ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS marketing_label varchar(120),
  ADD COLUMN IF NOT EXISTS short_description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS public_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS subscription_plans_public_idx
  ON public.subscription_plans (public_visible, is_active, featured, sort_order);

COMMIT;

-- لا يتم حذف أي كروسات أو محاضرات. اختيار المحتوى يظل عبر subscription_plan_scopes.
-- scope_type = course يطابق monthly_courses أو courses، وscope_type = lecture يطابق lectures.
