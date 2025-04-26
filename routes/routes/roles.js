// routes/roles.js
const express = require("express");
const router = express.Router();
const Role = require("../../models/role");

// New route to fetch all roles
router.get("/fetch-roles", async (req, res) => {
    try {
      const roles = await Role.find();
      res.status(200).json(roles);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  });

// PUT /api/roles/update-permissions
router.put("/update-permissions", async (req, res) => {
  const { role, permissions } = req.body;

  try {
    const updatedRole = await Role.findOneAndUpdate(
      { title: role },
      { permissions },
      { new: true }
    );

    if (!updatedRole) {
      return res.status(404).json({ message: "Role not found" });
    }

    res.json({ message: "Permissions updated", role: updatedRole });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/roles/create
router.post("/create", async (req, res) => {
  const { title, description, permissions } = req.body;

  try {
    // Check if role already exists
    const existingRole = await Role.findOne({ title });
    if (existingRole) {
      return res.status(400).json({ msg: "Role already exists" });
    }

    // Create the new role
    const newRole = new Role({
      title,
      description,
      permissions,
    });

    // Save the new role to the database
    await newRole.save();

    res.status(201).json({ msg: "Role created successfully", role: newRole });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});


module.exports = router;
