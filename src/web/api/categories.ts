import { Router } from "express";
import { getAllCategories, getCategoriesByType } from "../../db/categories.js";

const router = Router();

router.get("/", (req, res) => {
  const { type } = req.query;

  if (type) {
    if (!["expense", "earning"].includes(type as string)) {
      res.status(400).json({ error: "type must be 'expense' or 'earning'" });
      return;
    }
    res.json(getCategoriesByType(type as "expense" | "earning"));
    return;
  }

  res.json(getAllCategories());
});

export default router;
