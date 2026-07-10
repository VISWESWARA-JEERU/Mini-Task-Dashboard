import API from "./api";

export const getMyTasks = async () => {
  const response = await API.get(`/my-tasks`);
  return response.data;
};

export const createSubtask = async (data) => {
  const response = await API.get(`/subtasks`, data);
  return response.data;
};

export const updateSubtask = async (subtaskId, data) => {
  const response = await API.patch(`/subtasks/${subtaskId}`, data);
  return response.data;
};

export const addStatusUpdate = async (subtaskId, data) => {
  const response = await API.post(`/subtasks/${subtaskId}/status-updates`,data);
  return response.data;
};

export const getStatusHistory = async (subtaskId) => {
  const response = await API.get(`/subtasks/${subtaskId}/status-history`);
  return response.data;
};