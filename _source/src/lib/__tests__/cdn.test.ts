import { describe, it, expect } from 'vitest';
import { toCdnUrl, normalizeSchoolWithCdn, normalizeGalleryPhotoWithCdn, CDN_DOMAIN } from '../cdn';

describe('CDN URL Normalization (toCdnUrl)', () => {
  it('returns empty string for null, undefined or empty input', () => {
    expect(toCdnUrl(null)).toBe('');
    expect(toCdnUrl(undefined)).toBe('');
    expect(toCdnUrl('')).toBe('');
    expect(toCdnUrl('   ')).toBe('');
  });

  it('preserves URLs that already use the official Cloudflare CDN', () => {
    const existingCdn = `${CDN_DOMAIN}/SupertourLow/schools-gallery/123/web/photo.jpg`;
    expect(toCdnUrl(existingCdn)).toBe(existingCdn);
  });

  it('transforms Backblaze B2 Virtual-Host style URLs to Cloudflare CDN', () => {
    const b2Virtual = 'https://SupertourLow.s3.us-west-004.backblazeb2.com/schools-gallery/123/web/photo.jpg';
    const expected = `${CDN_DOMAIN}/SupertourLow/schools-gallery/123/web/photo.jpg`;
    expect(toCdnUrl(b2Virtual)).toBe(expected);
  });

  it('transforms Backblaze B2 Path style URLs to Cloudflare CDN', () => {
    const b2Path = 'https://s3.us-west-004.backblazeb2.com/SupertourLow/schools-gallery/123/hd/photo.jpg';
    const expected = `${CDN_DOMAIN}/SupertourLow/schools-gallery/123/hd/photo.jpg`;
    expect(toCdnUrl(b2Path)).toBe(expected);
  });

  it('transforms Backblaze B2 Native download URLs to Cloudflare CDN', () => {
    const b2Native = 'https://f004.backblazeb2.com/file/SupertourLow/schools-gallery/123/group.jpg';
    const expected = `${CDN_DOMAIN}/SupertourLow/schools-gallery/123/group.jpg`;
    expect(toCdnUrl(b2Native)).toBe(expected);
  });

  it('preserves external and third-party URLs untouched', () => {
    const external = 'https://images.unsplash.com/photo-test?w=800';
    expect(toCdnUrl(external)).toBe(external);
  });
});

describe('Entity CDN Normalization', () => {
  it('normalizes all photo and video properties on a School object', () => {
    const school = {
      id: 'school-1',
      name: 'Colegio San Martin',
      group_photo_web: 'https://SupertourLow.s3.us-west-004.backblazeb2.com/group-web.jpg',
      group_photo_hd: 'https://SupertourLow.s3.us-west-004.backblazeb2.com/group-hd.jpg',
      multimedia_url: 'https://SupertourLow.s3.us-west-004.backblazeb2.com/archive.zip',
      videos: [
        { title: 'Video 1', url: 'https://SupertourLow.s3.us-west-004.backblazeb2.com/vid1.mp4' }
      ]
    };

    const normalized = normalizeSchoolWithCdn(school);
    expect(normalized.group_photo_web).toBe(`${CDN_DOMAIN}/SupertourLow/group-web.jpg`);
    expect(normalized.group_photo_hd).toBe(`${CDN_DOMAIN}/SupertourLow/group-hd.jpg`);
    expect(normalized.multimedia_url).toBe(`${CDN_DOMAIN}/SupertourLow/archive.zip`);
    expect(normalized.videos?.[0].url).toBe(`${CDN_DOMAIN}/SupertourLow/vid1.mp4`);
  });

  it('normalizes web and hd URLs on a GalleryPhoto object', () => {
    const photo = {
      id: 'photo-1',
      school_id: 'school-1',
      url_web: 'https://SupertourLow.s3.us-west-004.backblazeb2.com/p1_web.jpg',
      url_hd: 'https://SupertourLow.s3.us-west-004.backblazeb2.com/p1_hd.jpg'
    };

    const normalized = normalizeGalleryPhotoWithCdn(photo);
    expect(normalized.url_web).toBe(`${CDN_DOMAIN}/SupertourLow/p1_web.jpg`);
    expect(normalized.url_hd).toBe(`${CDN_DOMAIN}/SupertourLow/p1_hd.jpg`);
  });
});
