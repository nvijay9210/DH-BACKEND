const masterService = require("../Service/MasterService");

exports.labourList = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await masterService.labourList(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.materialList = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await masterService.materialList(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.contractorList = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await masterService.contractorList(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.supplierList = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await masterService.supplierList(details);

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
    const data = await masterService.fetchMaterial(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.fetchLabour = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await masterService.fetchLabour(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.fetchContractor = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await masterService.fetchContractor(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.fetchSupplier = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await masterService.fetchSupplier(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.labourTypeDelete = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await masterService.labourTypeDelete(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};