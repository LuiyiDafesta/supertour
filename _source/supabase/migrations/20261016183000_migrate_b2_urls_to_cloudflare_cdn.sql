-- Migración para actualizar URLs directas de Backblaze B2 al CDN Cloudflare
-- (media.supertourchannel.com.ar/SupertourLow)
-- Esto activa la caché de Cloudflare Edge (nodo Ezeiza) y asegura Egress $0 mediante la Bandwidth Alliance.

-- 1. Actualizar fotos grupales en la tabla 'schools'
UPDATE public.schools
SET 
  group_photo_web = REPLACE(group_photo_web, 'https://SupertourLow.s3.us-west-004.backblazeb2.com', 'https://media.supertourchannel.com.ar/SupertourLow'),
  group_photo_hd = REPLACE(group_photo_hd, 'https://SupertourLow.s3.us-west-004.backblazeb2.com', 'https://media.supertourchannel.com.ar/SupertourLow'),
  multimedia_url = REPLACE(multimedia_url, 'https://SupertourLow.s3.us-west-004.backblazeb2.com', 'https://media.supertourchannel.com.ar/SupertourLow')
WHERE 
  group_photo_web LIKE '%backblazeb2.com%' 
  OR group_photo_hd LIKE '%backblazeb2.com%' 
  OR multimedia_url LIKE '%backblazeb2.com%';

-- 2. Actualizar sub-colegios en JSONB 'school_items' si existen URLs directas de B2
UPDATE public.schools
SET school_items = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', elem->>'id',
      'name', elem->>'name',
      'group_photo_web', REPLACE(COALESCE(elem->>'group_photo_web', ''), 'https://SupertourLow.s3.us-west-004.backblazeb2.com', 'https://media.supertourchannel.com.ar/SupertourLow'),
      'group_photo_hd', REPLACE(COALESCE(elem->>'group_photo_hd', ''), 'https://SupertourLow.s3.us-west-004.backblazeb2.com', 'https://media.supertourchannel.com.ar/SupertourLow'),
      'multimedia_url', REPLACE(COALESCE(elem->>'multimedia_url', ''), 'https://SupertourLow.s3.us-west-004.backblazeb2.com', 'https://media.supertourchannel.com.ar/SupertourLow')
    )
  )
  FROM jsonb_array_elements(school_items) AS elem
)
WHERE school_items IS NOT NULL AND jsonb_typeof(school_items) = 'array';

-- 3. Actualizar fotos en la tabla 'gallery_photos'
UPDATE public.gallery_photos
SET 
  url_web = REPLACE(url_web, 'https://SupertourLow.s3.us-west-004.backblazeb2.com', 'https://media.supertourchannel.com.ar/SupertourLow'),
  url_hd = REPLACE(url_hd, 'https://SupertourLow.s3.us-west-004.backblazeb2.com', 'https://media.supertourchannel.com.ar/SupertourLow')
WHERE 
  url_web LIKE '%backblazeb2.com%' 
  OR url_hd LIKE '%backblazeb2.com%';
