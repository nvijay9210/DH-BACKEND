const materialService = require("../Service/MaterialService");

exports.materialList = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await materialService.materialList(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.materialUsed = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await materialService.materialUsed(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.editMaterialUsed = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await materialService.EditMaterialUsed(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.measurementDetails = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await materialService.measurementDetails(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.updateMaterial = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await materialService.updateMaterial(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.fetchMaterialUpdate = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await materialService.fetchMaterialUpdate(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.fetchMaterialUsed = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await materialService.fetchMaterialUsed(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.fetchMaterial = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await materialService.fetchMaterial(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.materialDelete = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await materialService.materialDelete(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};