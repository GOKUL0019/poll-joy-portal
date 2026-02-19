
ALTER TABLE public.authorized_emails
ADD COLUMN gender text NOT NULL DEFAULT 'male',
ADD COLUMN hostel text NULL,
ADD COLUMN is_visible boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
ADD COLUMN gender text NULL,
ADD COLUMN hostel text NULL,
ADD COLUMN is_visible boolean NOT NULL DEFAULT false;
