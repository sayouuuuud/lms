BEGIN;

CREATE TABLE IF NOT EXISTS public.subscription_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(24) NOT NULL,
  student_id uuid NOT NULL,
  student_name varchar(200) NOT NULL DEFAULT '',
  student_email varchar(200) NOT NULL DEFAULT '',
  student_phone varchar(40) NOT NULL DEFAULT '',
  plan_id uuid NOT NULL,
  plan_title varchar(200) NOT NULL DEFAULT '',
  plan_snapshot jsonb NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'pending',
  receipt_url text,
  payment_method varchar(64),
  reference varchar(120),
  student_note text,
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscription_requests_code_key UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_subscription_requests_student_status
  ON public.subscription_requests(student_id, status);
CREATE INDEX IF NOT EXISTS idx_subscription_requests_status_created
  ON public.subscription_requests(status, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscription_requests_status_check'
  ) THEN
    ALTER TABLE public.subscription_requests
      ADD CONSTRAINT subscription_requests_status_check
      CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'processing'));
  END IF;
END $$;

COMMIT;
