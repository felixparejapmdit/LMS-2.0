import axios from 'axios';
import API_BASE from '../config/apiConfig';

const API_URL = `${API_BASE}/letters`;

const escapeRegExp = (value = "") =>
    String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findLatestLegacyReferenceCode = (rows, { prefix, shortYear }) => {
    const exactPattern = new RegExp(`^${escapeRegExp(prefix)}${shortYear}-(\\d+)$`, 'i');
    const genericPattern = new RegExp(`^([A-Z0-9]+)${shortYear}-(\\d+)$`, 'i');

    let exactMatch = null;
    let fallbackMatch = null;

    for (const row of rows) {
        const candidates = [row?.atg_id, row?.lms_id, row?.entry_id, row?.id];
        for (const candidateRaw of candidates) {
            const candidate = (candidateRaw ?? '').toString().trim();
            if (!candidate) continue;

            const exact = candidate.match(exactPattern);
            if (exact) {
                const parsed = parseInt(exact[1], 10);
                if (Number.isNaN(parsed)) continue;
                if (!exactMatch || parsed > exactMatch.sequence) {
                    exactMatch = { prefix, sequence: parsed };
                }
                continue;
            }

            const generic = candidate.match(genericPattern);
            if (!generic) continue;

            const parsed = parseInt(generic[2], 10);
            if (Number.isNaN(parsed)) continue;
            const detectedPrefix = generic[1].toUpperCase();
            if (!fallbackMatch || parsed > fallbackMatch.sequence) {
                fallbackMatch = { prefix: detectedPrefix, sequence: parsed };
            }
        }
    }

    const winner = exactMatch || fallbackMatch;
    if (!winner) return null;

    return `${winner.prefix}${shortYear}-${(winner.sequence + 1).toString().padStart(5, '0')}`;
};

class LetterService {
    async getAll(params = {}) {
        try {
            const options = {
                params: (params && typeof params === 'object') ? params : {}
            };
            const response = await axios.get(API_URL, options);
            return response.data;
        } catch (error) {
            console.error('Error in LetterService.getAll:', error.message);
            throw error;
        }
    }

    async getByLmsId(lms_id, params = {}) {
        const response = await axios.get(`${API_URL}/lms-id/${lms_id}`, { params });
        return response.data;
    }

    async getById(id, params = {}) {
        const response = await axios.get(`${API_URL}/${id}`, { params });
        return response.data;
    }

    async trackPublicByLmsId(lms_id) {
        const ref = (lms_id || "").toString().trim();
        const response = await axios.get(`${API_URL}/track`, {
            params: { lms_id: ref }
        });
        return response.data;
    }

    getPublicPdfUrlByLmsId(lms_id) {
        const ref = (lms_id || "").toString().trim();
        if (!ref) return "";
        return `${API_URL}/track/pdf?lms_id=${encodeURIComponent(ref)}`;
    }

    async create(data) {
        const response = await axios.post(API_URL, data);
        return response.data;
    }

    async update(id, data) {
        const response = await axios.put(`${API_URL}/${id}`, data);
        return response.data;
    }

    async delete(id) {
        const response = await axios.delete(`${API_URL}/${id}`);
        return response.data;
    }

    async restore(id) {
        const response = await axios.post(`${API_URL}/${id}/restore`);
        return response.data;
    }

    async deletePermanent(id) {
        const response = await axios.delete(`${API_URL}/${id}/permanent`);
        return response.data;
    }

    async bulkDeletePermanent(ids = []) {
        const response = await axios.post(`${API_URL}/bulk-permanent-delete`, { ids });
        return response.data;
    }

    async getPreviewIds(dept_id = null) {
        try {
            const params = new URLSearchParams();
            if (dept_id) params.set('dept_id', dept_id);
            const response = await axios.get(`${API_URL}/preview/ids?${params.toString()}`);
            return response.data;
        } catch (error) {
            console.error('Error in LetterService.getPreviewIds:', error);
            throw error;
        }
    }

    async getLegacyData(page = 1, limit = 10, search = '') {
        // Direct PHP endpoint as remote MySQL is restricted
        const response = await axios.get(`http://172.18.162.84/api/letters_detailed.php?page=${page}&limit=${limit}&search=${search}`);
        return response.data;
    }

    async getLegacyPreviewReferenceCode() {
        const cleanedPrefix = 'ATG';
        const shortYear = new Date().getFullYear().toString().slice(-2);
        const response = await this.getLegacyData(1, 1, '');
        const rows = Array.isArray(response)
            ? response
            : Array.isArray(response?.data)
                ? response.data
                : Array.isArray(response?.letters)
                    ? response.letters
                    : [];

        return findLatestLegacyReferenceCode(rows, {
            prefix: cleanedPrefix,
            shortYear,
        });
    }
}

export default new LetterService();
