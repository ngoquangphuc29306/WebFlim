import { describe, expect, it } from 'vitest';
import type { VSMovDetailResponse, VSMovItem } from '@/types/movie';
import {
  formatImageUrl,
  normalizeMovie,
  normalizeMovieDetail,
  normalizeEpisodeServers,
  sortEpisodeItems,
} from '@/lib/api/normalizers';

const baseItem: VSMovItem = {
  _id: 'movie-1',
  name: '  Tên phim  ',
  origin_name: ' Original title ',
  slug: 'ten-phim',
  poster_url: 'poster.jpg',
  thumb_url: 'https://cdn.example/thumb.jpg',
  year: 2024,
  category: [{ name: 'Hành động', slug: 'hanh-dong' }],
  country: [{ name: 'Hàn Quốc', slug: 'han-quoc' }],
};

describe('VSMov normalizers', () => {
  it('normalizes absolute, relative, and missing image URLs', () => {
    expect(formatImageUrl('https://cdn.example/poster.jpg')).toBe('https://cdn.example/poster.jpg');
    expect(formatImageUrl('/storage/poster.jpg')).toBe('https://vsmov.com/storage/poster.jpg');
    expect(formatImageUrl()).toBe('https://picsum.photos/seed/vsmov-placeholder/400/600');
  });

  it('normalizes a movie card with optional fields and taxonomy', () => {
    const movie = normalizeMovie(baseItem);

    expect(movie).toMatchObject({
      id: 'movie-1',
      slug: 'ten-phim',
      title: 'Tên phim',
      originalTitle: 'Original title',
      posterUrl: 'https://cdn.example/thumb.jpg',
      thumbUrl: 'https://vsmov.com/poster.jpg',
      quality: 'HD',
      language: 'Vietsub',
    });
    expect(movie.categories[0]).toMatchObject({ name: 'Hành động', slug: 'hanh-dong' });
    expect(movie.countries[0]).toMatchObject({ name: 'Hàn Quốc', slug: 'han-quoc' });
  });

  it('normalizes missing detail data to null and missing episodes to an empty list', () => {
    expect(normalizeMovieDetail({ status: false })).toBeNull();
    expect(normalizeEpisodeServers()).toEqual([]);
    expect(normalizeEpisodeServers([])).toEqual([]);
  });

  it('cleans detail metadata and sorts server episodes without mutating input', () => {
    const response: VSMovDetailResponse = {
      status: true,
      movie: {
        ...baseItem,
        content: '<p>Hello&nbsp; world</p>',
        actor: [' Actor '],
        director: [' Director '],
        keywords: [' keyword '],
        chieurap: true,
      },
      episodes: [
        {
          server_name: ' Server\n 1 ',
          server_data: [
            { name: 'Tập 10', slug: 'tap-10', link_embed: 'https://embed/10' },
            { name: 'Tập 2', slug: 'tap-2', link_embed: 'https://embed/2' },
          ],
        },
      ],
    };

    const normalized = normalizeMovieDetail(response);

    expect(normalized).not.toBeNull();
    expect(normalized).toMatchObject({
      synopsis: 'Hello world',
      actors: ['Actor'],
      directors: ['Director'],
      keywords: ['keyword'],
      isCinemaRelease: true,
    });
    expect(normalized?.episodes).toEqual([
      {
        serverName: 'Server 1',
        items: [
          { name: 'Tập 2', slug: 'tap-2', embedUrl: 'https://embed/2' },
          { name: 'Tập 10', slug: 'tap-10', embedUrl: 'https://embed/10' },
        ],
      },
    ]);
  });

  it('returns a sorted copy for episode items', () => {
    const items = [
      { name: 'Tập 3', slug: 'tap-3' },
      { name: 'Tập 1', slug: 'tap-1' },
    ];

    expect(sortEpisodeItems(items).map((item) => item.slug)).toEqual(['tap-1', 'tap-3']);
    expect(items.map((item) => item.slug)).toEqual(['tap-3', 'tap-1']);
  });
});
