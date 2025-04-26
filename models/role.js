// models/Role.js
const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema({
  read: Boolean,
  write: Boolean,
  delete: Boolean,
});

const roleSchema = new mongoose.Schema({
  title: String,
  description: String,
  permissions: {
    userManagement: permissionSchema,
    productAuthority: permissionSchema,
    systemConfig: permissionSchema,
    fileManagement: permissionSchema,
    reports: permissionSchema,
  },
});

module.exports = mongoose.model("roles", roleSchema);
