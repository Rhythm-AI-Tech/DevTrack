
const express = require("express");
const {
  getProblems,
  createProblem,
  updateProblem,
  markAsRevised,
  deleteProblem,
} = require("../controllers/problemController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.route("/")
  .get(getProblems)
  .post(createProblem);

router.post("/:id/revisions", markAsRevised);

router.route("/:id")
  .patch(updateProblem)
  .delete(deleteProblem);

module.exports = router;
