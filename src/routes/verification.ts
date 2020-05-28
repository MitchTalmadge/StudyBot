import { Router } from "express";

const router = Router();

router.get("/verify", (req, res) => {
  console.log(req.query["code"]);

  res.status(200).send("Hello");
});

export default router;