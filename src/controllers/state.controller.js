const State = require('../models/State.model');
const { successResponse, errorResponse } = require('../utils/response.util');

exports.getProjectStates = async (req, res, next) => {
  try {
    const states = await State.find({ type: 'project', isActive: true });
    return successResponse(res, 200, 'Project states retrieved successfully', states);
  } catch (error) {
    next(error);
  }
};

exports.getTaskStates = async (req, res, next) => {
  try {
    const states = await State.find({ type: 'task', isActive: true });
    return successResponse(res, 200, 'Task states retrieved successfully', states);
  } catch (error) {
    next(error);
  }
};

exports.createState = async (req, res, next) => {
  try {
    const state = await State.create(req.body);
    return successResponse(res, 201, 'State created successfully', state);
  } catch (error) {
    next(error);
  }
};

exports.updateState = async (req, res, next) => {
  try {
    const { id } = req.params;
    const state = await State.findByIdAndUpdate(id, req.body, { new: true });
    if (!state) {
      return errorResponse(res, 404, 'State not found');
    }
    return successResponse(res, 200, 'State updated successfully', state);
  } catch (error) {
    next(error);
  }
};

exports.deleteState = async (req, res, next) => {
  try {
    const { id } = req.params;
    const state = await State.findByIdAndDelete(id);
    if (!state) {
      return errorResponse(res, 404, 'State not found');
    }
    return successResponse(res, 200, 'State deleted successfully');
  } catch (error) {
    next(error);
  }
};