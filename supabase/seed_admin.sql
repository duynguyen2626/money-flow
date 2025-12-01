-- Enable pgcrypto if not already enabled
create extension if not exists pgcrypto;

-- Insert into auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- Fixed UUID for admin
  'authenticated',
  'authenticated',
  'admin@example.com',
  crypt('adminpassword', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Admin User"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- Insert into public.profiles
INSERT INTO public.profiles (
  id,
  name,
  email,
  created_at
) VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Admin User',
  'admin@example.com',
  now()
) ON CONFLICT (id) DO NOTHING;