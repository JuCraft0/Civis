import axios from 'axios';

const API_URL = '/api';

const api = axios.create({
    baseURL: API_URL
});

api.interceptors.request.use((config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            // Token expired or invalid
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export const reevaluateAllProfiles = () => api.post('/people/reevaluate-all-profiles');
export const getMaintenanceProgress = () => api.get('/people/maintenance-progress');

export const getPeople = async () => {
    const response = await api.get('/people');
    return response.data;
};

export const getPerson = async (id) => {
    const response = await api.get(`/people/${id}`);
    return response.data;
};

export const createPerson = async (personData) => {
    const response = await api.post('/people', personData);
    return response.data;
};

export const updatePerson = async (id, personData) => {
    const response = await api.put(`/people/${id}`, personData);
    return response.data;
};

export const deletePerson = async (id) => {
    const response = await api.delete(`/people/${id}`);
    return response.data;
};

export const uploadPhoto = async (id, file, index = 0) => {
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('index', index);
    const response = await api.post(`/people/${id}/photo`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
};

export const deletePhoto = async (id, index) => {
    const response = await api.delete(`/people/${id}/photo/${index}`);
    return response.data;
};

export const syncImmichPerson = async (id) => {
    const response = await api.post(`/people/${id}/sync-immich`);
    return response.data;
};

export const getImmichFaces = async (id) => {
    const response = await api.get(`/people/${id}/immich-faces`);
    return response.data;
};

export const getImmichPeople = async () => {
    const response = await api.get('/people/immich/people');
    return response.data;
};

export const searchByFace = async (file) => {
    const formData = new FormData();
    formData.append('photo', file);
    const response = await api.post('/people/search-by-face', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
};

export const analyzeFace = async (file) => {
    const formData = new FormData();
    formData.append('photo', file);
    const response = await api.post('/people/analyze', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
};

export const reindexFaces = async () => {
    const response = await api.post('/people/reindex');
    return response.data;
};

export const submitFeedback = async (id, embedding, isCorrect) => {
    const response = await api.post(`/people/${id}/feedback`, { embedding, isCorrect });
    return response.data;
};

export const syncAllImmichPeople = async () => {
    const response = await api.post('/people/sync-all-immich');
    return response.data;
};

export const deleteAllImmichFaces = async () => {
    const response = await api.post('/people/delete-all-immich-faces');
    return response.data;
};

export const deleteAllPeoplePhotos = async () => {
    const response = await api.post('/people/delete-all-photos');
    return response.data;
};

export const setPrimaryPhoto = async (personId, data) => {
    const response = await api.post(`/people/${personId}/set-primary-photo`, data);
    return response.data;
};

export const resetProfilePhoto = async (id) => {
    const response = await api.post(`/people/${id}/reset-profile-photo`);
    return response.data;
};

// Admin Functions
export const createUser = async (userData) => {
    const response = await api.post('/users', userData);
    return response.data;
};

export const getUsers = async () => {
    const response = await api.get('/users');
    return response.data;
};

export const updateUser = async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
};

export const deleteUser = async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
};

// Group Functions
export const getGroups = async () => {
    const response = await api.get('/groups');
    return response.data;
};

export const createGroup = async (groupData) => {
    const response = await api.post('/groups', groupData);
    return response.data;
};

export const updateGroup = async (id, groupData) => {
    const response = await api.put(`/groups/${id}`, groupData);
    return response.data;
};

export const deleteGroup = async (id) => {
    const response = await api.delete(`/groups/${id}`);
    return response.data;
};
