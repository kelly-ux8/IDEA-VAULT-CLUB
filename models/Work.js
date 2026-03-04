const mongoose = require("mongoose");

const workSchema = new mongoose.Schema({
  title: { type: String, unique: true },
  description: String,
  authorEmail: String,
  license: String,
  ipStatus: String,
  filePath: String,
  fileHash: String,
  timestamp: Date,
  blockchainProof: String,
  isPublic: Boolean
});

module.exports = mongoose.model("Work", workSchema);
