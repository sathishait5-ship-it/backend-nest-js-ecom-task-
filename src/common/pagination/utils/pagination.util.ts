export const getPagination = (page: number = 1, limit: number = 10) => {
  const currentPage = Math.max(page, 1);

  const currentLimit = Math.max(limit, 1);

  const skip = (currentPage - 1) * currentLimit;

  return {
    page: currentPage,
    limit: currentLimit,
    skip,
  };
};
