import Joi from "joi";

export const createProjectSchema = Joi.object({
  Project_name: Joi.string().min(3).max(100).required(),

  Project_type: Joi.string().required(),

  Project_cost: Joi.number().positive().required(),

  Margin: Joi.number().min(0).optional(),

  Project_Estimation_Cost: Joi.number().positive().required(),

  Project_start_date: Joi.date().required(),

  Estimated_end_date: Joi.date().greater(Joi.ref("Project_start_date")),

  Site_location: Joi.string().required(),

  Contractor: Joi.string().required(),

  Site_supervisor: Joi.string().required(),

  Username: Joi.string().required()
});


export const updateProjectSchema = createProjectSchema.keys({
  Project_id: Joi.number().required()
});
