const express = require("express");
const router  = express.Router();
const { authenticate: protect } = require("../middlewares/protect");
const {
  getSubgroup, createSubgroup, updateSubgroup, archiveSubgroup,
  getMembers, addMember, removeMember,
} = require("../controllers/subgroup.controller");

router.use(protect);

router.get("/:subgroupId",                       getSubgroup);
router.post("/",                                  createSubgroup);
router.patch("/:subgroupId",                      updateSubgroup);
router.delete("/:subgroupId",                     archiveSubgroup);
router.get("/:subgroupId/members",                getMembers);
router.post("/:subgroupId/members",               addMember);
router.delete("/:subgroupId/members/:userId",     removeMember);

module.exports = router;