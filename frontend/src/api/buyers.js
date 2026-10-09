import apiClient from './apiClient.js';

/**
 * Fetch paginated buyers for the authenticated user.
 * @param {object} [params]
 * @param {number} [params.page=1]
 * @param {number} [params.limit=10]
 * @param {string} [params.search='']
 * @returns {Promise<{ status: string, data: { buyers: Array, pagination: { page: number, limit: number, totalRecords: number, totalPages: number } } }>}
 */
export async function getBuyers({ page = 1, limit = 10, search = '' } = {}) {
  const params = { page, limit };
  if (search && search.trim()) {
    params.search = search.trim();
  }
  const response = await apiClient.get('/buyers', { params });
  return response.data;
}

/**
 * Upload a buyer spreadsheet (.csv, .xls, .xlsx)
 * @param {File} file
 * @returns {Promise<{ status: string, message: string, data: { totalRows: number, insertedRows: number, failedRows: number } }>}
 */
export async function uploadBuyers(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post('/buyers/upload', formData, {
    headers: {
      'Content-Type': undefined, // Let browser generate multipart/form-data with boundary
    },
  });
  return response.data;
}

export default {
  getBuyers,
  uploadBuyers,
};
