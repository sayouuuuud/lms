export const isReleasedFilter = {
  is_published: true,
  OR: [
    { release_date: null },
    { release_date: { lte: new Date() } },
  ],
}
