import ky from 'ky';

export const apiClient = ky.create({
  credentials: 'same-origin',
  timeout: 15_000,
  retry: {
    limit: 1,
    methods: ['get'],
    statusCodes: [408, 429, 500, 502, 503, 504],
  },
});
