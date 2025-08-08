const Category = require('../models/Category.model');
const { successResponse, errorResponse } = require('../utils/response.util');

exports.getAllCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().populate('createdBy', 'firstName lastName');
    return successResponse(res, 200, 'Categories retrieved successfully', categories);
  } catch (error) {
    next(error);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const category = await Category.create({
      name,
      description,
      createdBy: req.user._id
    });
    return successResponse(res, 201, 'Category created successfully', category);
  } catch (error) {
    next(error);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await Category.findByIdAndUpdate(id, req.body, { new: true });
    if (!category) {
      return errorResponse(res, 404, 'Category not found');
    }
    return successResponse(res, 200, 'Category updated successfully', category);
  } catch (error) {
    next(error);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      return errorResponse(res, 404, 'Category not found');
    }
    return successResponse(res, 200, 'Category deleted successfully');
  } catch (error) {
    next(error);
  }
};