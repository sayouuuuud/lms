-- T05: قيد سلامة محتوى order_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'order_items_has_content_ref'
  ) THEN
    ALTER TABLE order_items
      ADD CONSTRAINT order_items_has_content_ref
      CHECK (
        lecture_id IS NOT NULL
        OR monthly_course_id IS NOT NULL
        OR term_id IS NOT NULL
      )
      NOT VALID;
  END IF;
END $$;
